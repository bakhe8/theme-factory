const fs = require('fs');
const path = require('path');
const { validateTheme } = require('./policies/salla-theme-policy');
const {
  componentPathFor,
  defaultSlugFor,
  getExperience,
  isImplemented,
  listExperiences,
  pathsForExperience,
} = require('./experience-registry');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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

function findField(fields, id) {
  for (const field of fields || []) {
    if (field.id === id) return field;
    const nested = findField(field.fields, id);
    if (nested) return nested;
  }
  return null;
}

function assertContains(result, content, marker, file, detail) {
  if (!content.includes(marker)) issue(result, file, detail || `العلامة المطلوبة غير موجودة: ${marker}`);
}

function validateForbiddenJs(result, jsContent, file) {
  const forbidden = [
    { label: 'طلب شبكة مباشر داخل تجربة العرض', pattern: /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bsalla\.api\.request\s*\(/ },
    { label: 'تنفيذ كود ديناميكي خطر', pattern: /\beval\s*\(|\bnew\s+Function\s*\(|\bdocument\.write\s*\(/ },
    { label: 'حقن HTML مباشر', pattern: /\.innerHTML\s*=/ },
  ];

  for (const check of forbidden) {
    if (check.pattern.test(jsContent)) issue(result, file, check.label);
  }
}

function validateRegisteredExperience(themeName, themePath, experience, slug, result) {
  const paths = pathsForExperience(themePath, experience, slug);
  const componentPath = componentPathFor(experience, slug);
  const files = [
    ['twilight.json', paths.twilight],
    [`${componentPath}.twig`, paths.componentTwig],
    [`${slug}.js`, paths.experienceJs],
    [`${slug}.scss`, paths.experienceScss],
    ['home.js', paths.homeJs],
    ['app.scss', paths.appScss],
  ];

  for (const [label, file] of files) {
    if (!fs.existsSync(file)) issue(result, label, `ملف مطلوب لتجربة ${experience.id} غير موجود: ${rel(themePath, file)}`);
  }

  const twilight = readJson(paths.twilight);
  const component = (twilight?.components || []).find((item) => item.path === componentPath);
  if (!component) {
    issue(result, 'twilight.json', `تجربة ${experience.id} غير مسجلة في components.path كـ ${componentPath}`);
  } else {
    for (const required of experience.gate.requiredFields) {
      const field = findField(component.fields, required.id);
      if (!field) {
        issue(result, 'twilight.json', `حقل التجربة مفقود: ${required.id}`);
        continue;
      }
      if (required.type && field.type !== required.type) {
        issue(result, 'twilight.json', `نوع الحقل ${required.id} يجب أن يكون ${required.type}`);
      }
      if (required.source && field.source !== required.source) {
        issue(result, 'twilight.json', `مصدر الحقل ${required.id} يجب أن يكون ${required.source}`);
      }
    }
  }

  const twig = readText(paths.componentTwig);
  const js = readText(paths.experienceJs);
  const scss = readText(paths.experienceScss);
  const homeJs = readText(paths.homeJs);
  const appScss = readText(paths.appScss);

  if (twig) {
    for (const marker of experience.gate.twigMarkers) {
      assertContains(result, twig, marker, rel(themePath, paths.componentTwig), `Twig لا يثبت جزءاً مطلوباً من تجربة البيع: ${marker}`);
    }
  }

  if (js) {
    for (const marker of experience.gate.jsMarkers) {
      assertContains(result, js, marker, rel(themePath, paths.experienceJs), `JS لا يثبت سلوك التفاعل المطلوب: ${marker}`);
    }
    validateForbiddenJs(result, js, rel(themePath, paths.experienceJs));
  }

  if (scss) {
    for (const marker of experience.gate.cssMarkers) {
      assertContains(result, scss, marker, rel(themePath, paths.experienceScss), `SCSS لا يثبت نمط التجربة المطلوب: ${marker}`);
    }
  }

  if (homeJs) assertContains(result, homeJs, `./components/${slug}`, rel(themePath, paths.homeJs), 'ملف JS للتجربة غير مربوط في home.js');
  if (appScss) assertContains(result, appScss, `./04-components/${slug}`, rel(themePath, paths.appScss), 'ملف SCSS للتجربة غير مربوط في app.scss');

  const addedBytes = [paths.componentTwig, paths.experienceJs, paths.experienceScss]
    .filter((file) => fs.existsSync(file))
    .reduce((sum, file) => sum + fs.statSync(file).size, 0);
  result.addedSourceBytes = addedBytes;

  if (addedBytes > experience.gate.maxAddedSourceBytes) {
    warning(result, experience.id, `حجم ملفات التجربة ${addedBytes} bytes أعلى من الحد المفضل ${experience.gate.maxAddedSourceBytes} bytes`);
  }

  const policy = validateTheme(themePath, themeName);
  for (const finding of policy.issues) {
    issue(result, finding.file, `[Policy:${finding.type}] ${finding.detail}`);
  }
  for (const finding of policy.warnings) {
    warning(result, finding.file, `[Policy:${finding.type}] ${finding.detail}`);
  }
}

function validateExperience(themeName, experienceId, slugValue) {
  const experience = getExperience(experienceId);
  const result = {
    theme: themeName,
    experience: experienceId,
    slug: slugValue,
    addedSourceBytes: 0,
    issues: [],
    warnings: [],
  };

  if (!experience) {
    issue(result, 'experience', `تجربة غير معروفة في Experience Registry: ${experienceId}`);
    return result;
  }

  result.experience = experience.id;
  result.slug = defaultSlugFor(experience, slugValue);

  if (!isImplemented(experience)) {
    issue(result, experience.id, `التجربة مسجلة لكنها غير منفذة بعد: ${experience.status}`);
    return result;
  }

  const themePath = path.join(themesDir, themeName);
  if (!fs.existsSync(themePath)) {
    issue(result, themeName, `الثيم غير موجود: ${themeName}`);
    return result;
  }

  validateRegisteredExperience(themeName, themePath, experience, result.slug, result);

  return result;
}

function detectInstalledExperiences(themeName) {
  const themePath = path.join(themesDir, themeName);
  const detected = [];
  if (!fs.existsSync(themePath)) return detected;

  for (const experience of listExperiences().filter(isImplemented)) {
    const homeComponentsDir = path.join(themePath, 'src', 'views', 'components', 'home');
    if (!fs.existsSync(homeComponentsDir)) continue;
    const detectionMarker = experience.gate?.detectionMarker || experience.gate?.twigMarkers?.[0];
    if (!detectionMarker) continue;

    for (const entry of fs.readdirSync(homeComponentsDir)) {
      if (!entry.endsWith('.twig')) continue;
      const file = path.join(homeComponentsDir, entry);
      const content = readText(file);
      if (content.includes(detectionMarker)) {
        detected.push({
          experienceId: experience.id,
          slug: path.basename(entry, '.twig'),
        });
      }
    }
  }

  return detected;
}

function validateThemeExperiences(themeName) {
  const result = {
    theme: themeName,
    detected: [],
    results: [],
    issues: [],
    warnings: [],
  };

  const themePath = path.join(themesDir, themeName);
  if (!fs.existsSync(themePath)) {
    issue(result, themeName, `الثيم غير موجود: ${themeName}`);
    return result;
  }

  result.detected = detectInstalledExperiences(themeName);

  for (const item of result.detected) {
    const child = validateExperience(themeName, item.experienceId, item.slug);
    result.results.push(child);

    for (const childIssue of child.issues) {
      issue(result, childIssue.file, `[${child.experience}:${child.slug}] ${childIssue.detail}`);
    }

    for (const childWarning of child.warnings) {
      warning(result, childWarning.file, `[${child.experience}:${child.slug}] ${childWarning.detail}`);
    }
  }

  return result;
}

function printExperienceGate(themeName, experienceId, slugValue) {
  const result = validateExperience(themeName, experienceId, slugValue);

  console.log(`\n🧪 Experience Gate | ${result.theme || themeName} / ${result.experience}`);
  console.log('----------------------------------------');
  console.log(`Slug: ${result.slug || slugValue || '-'}`);
  console.log(`Added source bytes: ${result.addedSourceBytes}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const item of result.issues) {
    console.log(`❌ ${item.file}: ${item.detail}`);
  }

  for (const item of result.warnings) {
    console.log(`⚠️ ${item.file}: ${item.detail}`);
  }

  if (result.issues.length) {
    console.log('\n❌ Experience gate failed.');
  } else {
    console.log('\n✅ Experience gate passed.');
  }

  return result;
}

function printThemeExperienceGate(themeName) {
  const result = validateThemeExperiences(themeName);

  console.log(`\n🧪 Experience Registry Gate | ${themeName}`);
  console.log('----------------------------------------');
  console.log(`Detected experiences: ${result.detected.length}`);
  for (const item of result.detected) {
    console.log(`- ${item.experienceId}: ${item.slug}`);
  }
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const item of result.issues) {
    console.log(`❌ ${item.file}: ${item.detail}`);
  }

  for (const item of result.warnings) {
    console.log(`⚠️ ${item.file}: ${item.detail}`);
  }

  if (result.issues.length) {
    console.log('\n❌ Experience registry gate failed.');
  } else {
    console.log('\n✅ Experience registry gate passed.');
  }

  return result;
}

module.exports = {
  detectInstalledExperiences,
  printExperienceGate,
  printThemeExperienceGate,
  validateExperience,
  validateThemeExperiences,
};
