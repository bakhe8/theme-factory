const fs = require('fs');
const path = require('path');
const { validateTheme } = require('./policies/salla-theme-policy');
const {
  getPageExperience,
  isImplemented,
  listPageExperiences,
  normalizePageExperienceId,
  pathsForPageExperience,
} = require('./page-experience-registry');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function rel(themePath, file) {
  return path.relative(themePath, file).replace(/\\/g, '/');
}

function issue(result, file, detail) {
  result.issues.push({ file, detail });
}

function warning(result, file, detail) {
  result.warnings.push({ file, detail });
}

function assertContains(result, content, marker, file, detail) {
  if (!content.includes(marker)) issue(result, file, detail || `العلامة المطلوبة غير موجودة: ${marker}`);
}

function validateForbiddenJs(result, jsContent, file) {
  const forbidden = [
    { label: 'طلب شبكة مباشر داخل تجربة الصفحة', pattern: /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bsalla\.api\.request\s*\(/ },
    { label: 'تنفيذ كود ديناميكي خطر', pattern: /\beval\s*\(|\bnew\s+Function\s*\(|\bdocument\.write\s*\(/ },
    { label: 'حقن HTML مباشر', pattern: /\.innerHTML\s*=|\.outerHTML\s*=|\.insertAdjacentHTML\s*\(/ },
  ];

  for (const check of forbidden) {
    if (check.pattern.test(jsContent)) issue(result, file, check.label);
  }
}

function detectInstalledPageExperiences(themeName) {
  const themePath = path.join(themesDir, themeName);
  const detected = [];
  if (!fs.existsSync(themePath)) return detected;

  for (const experience of listPageExperiences().filter(isImplemented)) {
    const paths = pathsForPageExperience(themePath, experience);
    const detectionMarker = experience.gate?.twigMarkers?.[0];
    if (!detectionMarker || !fs.existsSync(paths.pageTwig)) continue;
    if (readText(paths.pageTwig).includes(detectionMarker)) {
      detected.push({ pageExperienceId: experience.id, pageView: experience.pageView });
    }
  }

  return detected;
}

function requiredPageExperiencesFromSpecs(themeName) {
  const specs = readJson(path.join(rootDir, 'specs', `${themeName}.specs.json`), {});
  const required = [];

  for (const [key, config] of Object.entries(specs.page_experiences || {})) {
    if (!config || config.required !== true) continue;
    required.push(normalizePageExperienceId(config.id || key));
  }

  return required;
}

function validatePageExperience(themeName, pageExperienceId) {
  const experience = getPageExperience(pageExperienceId);
  const result = {
    theme: themeName,
    pageExperience: pageExperienceId,
    pageView: experience?.pageView || '',
    addedSourceBytes: 0,
    issues: [],
    warnings: [],
  };

  if (!experience) {
    issue(result, 'page-experience', `تجربة صفحة غير معروفة: ${pageExperienceId}`);
    return result;
  }

  result.pageExperience = experience.id;

  if (!isImplemented(experience)) {
    issue(result, experience.id, `تجربة الصفحة مسجلة لكنها غير منفذة بعد: ${experience.status}`);
    return result;
  }

  const themePath = path.join(themesDir, themeName);
  if (!fs.existsSync(themePath)) {
    issue(result, themeName, `الثيم غير موجود: ${themeName}`);
    return result;
  }

  const paths = pathsForPageExperience(themePath, experience);
  const files = [
    ['page twig', paths.pageTwig],
    ['page js', paths.pageJs],
    ['page scss', paths.pageScss],
  ];

  for (const [label, file] of files) {
    if (!fs.existsSync(file)) issue(result, label, `ملف مطلوب لتجربة ${experience.id} غير موجود: ${rel(themePath, file)}`);
  }

  const twig = readText(paths.pageTwig);
  const js = readText(paths.pageJs);
  const scss = readText(paths.pageScss);

  if (twig) {
    for (const marker of experience.gate.twigMarkers) {
      assertContains(result, twig, marker, rel(themePath, paths.pageTwig), `Twig لا يثبت جزءاً مطلوباً من تجربة الصفحة: ${marker}`);
    }
  }

  if (js) {
    for (const marker of experience.gate.jsMarkers) {
      assertContains(result, js, marker, rel(themePath, paths.pageJs), `JS لا يثبت سلوك تجربة الصفحة المطلوب: ${marker}`);
    }
    validateForbiddenJs(result, js, rel(themePath, paths.pageJs));
  }

  if (scss) {
    for (const marker of experience.gate.cssMarkers) {
      assertContains(result, scss, marker, rel(themePath, paths.pageScss), `SCSS لا يثبت نمط تجربة الصفحة المطلوب: ${marker}`);
    }
  }

  result.addedSourceBytes = Object.values(paths)
    .filter((file) => fs.existsSync(file))
    .reduce((sum, file) => sum + fs.statSync(file).size, 0);

  if (result.addedSourceBytes > experience.gate.maxAddedSourceBytes) {
    warning(result, experience.id, `حجم ملفات تجربة الصفحة ${result.addedSourceBytes} bytes أعلى من الحد المفضل ${experience.gate.maxAddedSourceBytes} bytes`);
  }

  const policy = validateTheme(themePath, themeName);
  for (const finding of policy.issues) {
    issue(result, finding.file, `[Policy:${finding.type}] ${finding.detail}`);
  }
  for (const finding of policy.warnings) {
    warning(result, finding.file, `[Policy:${finding.type}] ${finding.detail}`);
  }

  return result;
}

function validateThemePageExperiences(themeName) {
  const result = {
    theme: themeName,
    detected: [],
    required: requiredPageExperiencesFromSpecs(themeName),
    results: [],
    issues: [],
    warnings: [],
  };

  const themePath = path.join(themesDir, themeName);
  if (!fs.existsSync(themePath)) {
    issue(result, themeName, `الثيم غير موجود: ${themeName}`);
    return result;
  }

  result.detected = detectInstalledPageExperiences(themeName);
  const detectedIds = new Set(result.detected.map((item) => item.pageExperienceId));

  for (const id of result.required) {
    if (!getPageExperience(id)) {
      issue(result, 'specs', `page_experiences يطلب تجربة غير معروفة: ${id}`);
    } else if (!detectedIds.has(id)) {
      issue(result, 'specs', `page_experiences يطلب ${id} لكنها غير مثبتة في الثيم`);
    }
  }

  const idsToValidate = new Set([...detectedIds, ...result.required]);
  const seenIssues = new Set();
  const seenWarnings = new Set();

  for (const id of idsToValidate) {
    const child = validatePageExperience(themeName, id);
    result.results.push(child);

    for (const childIssue of child.issues) {
      const key = `${childIssue.file}:${childIssue.detail}`;
      if (seenIssues.has(key)) continue;
      seenIssues.add(key);
      issue(result, childIssue.file, `[${child.pageExperience}] ${childIssue.detail}`);
    }

    for (const childWarning of child.warnings) {
      const key = `${childWarning.file}:${childWarning.detail}`;
      if (seenWarnings.has(key)) continue;
      seenWarnings.add(key);
      warning(result, childWarning.file, `[${child.pageExperience}] ${childWarning.detail}`);
    }
  }

  return result;
}

function printPageExperienceGate(themeName, pageExperienceId) {
  const result = validatePageExperience(themeName, pageExperienceId);

  console.log(`\n🧪 Page Experience Gate | ${result.theme || themeName} / ${result.pageExperience}`);
  console.log('----------------------------------------');
  console.log(`Page view: ${result.pageView || '-'}`);
  console.log(`Added source bytes: ${result.addedSourceBytes}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const item of result.issues) console.log(`❌ ${item.file}: ${item.detail}`);
  for (const item of result.warnings) console.log(`⚠️ ${item.file}: ${item.detail}`);

  console.log(result.issues.length ? '\n❌ Page experience gate failed.' : '\n✅ Page experience gate passed.');
  return result;
}

function printThemePageExperienceGate(themeName) {
  const result = validateThemePageExperiences(themeName);

  console.log(`\n🧪 Page Experience Registry Gate | ${themeName}`);
  console.log('----------------------------------------');
  console.log(`Detected page experiences: ${result.detected.length}`);
  for (const item of result.detected) console.log(`- ${item.pageExperienceId}: ${item.pageView}`);
  console.log(`Required by specs: ${result.required.length ? result.required.join(', ') : '-'}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const item of result.issues) console.log(`❌ ${item.file}: ${item.detail}`);
  for (const item of result.warnings) console.log(`⚠️ ${item.file}: ${item.detail}`);

  console.log(result.issues.length ? '\n❌ Page experience registry gate failed.' : '\n✅ Page experience registry gate passed.');
  return result;
}

module.exports = {
  detectInstalledPageExperiences,
  printPageExperienceGate,
  printThemePageExperienceGate,
  validatePageExperience,
  validateThemePageExperiences,
};
