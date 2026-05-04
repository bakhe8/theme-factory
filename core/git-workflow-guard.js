const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const allowSourceTemplate = process.argv.includes('--allow-source-template') || process.env.FACTORY_ALLOW_SOURCE_TEMPLATE === '1';
const allowArtifacts = process.argv.includes('--allow-artifacts') || process.env.FACTORY_ALLOW_ARTIFACTS === '1';

function git(args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return null;
  }
}

function stagedEntries() {
  let output = '';
  try {
    output = git(['diff', '--cached', '--name-status']);
  } catch (error) {
    console.error('❌ لا يمكن قراءة staged changes من Git.');
    process.exit(1);
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      return {
        status: parts[0],
        file: (parts[parts.length - 1] || '').replace(/\\/g, '/'),
      };
    });
}

function rel(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/');
}

function issue(issues, file, detail) {
  issues.push({ file, detail });
}

function validateThemeChange(themeName, themeFiles, issues, warnings) {
  const themePath = path.join(rootDir, 'themes', themeName);
  const manifestPath = path.join(themePath, '.factory', 'manifest.json');
  const manifest = readJson(manifestPath);

  if (!manifest) {
    issue(issues, `themes/${themeName}`, 'تعديل ثيم بدون .factory/manifest.json صالح. أنشئ الثيم عبر المصنع أولاً.');
    return;
  }

  if (manifest.created_by !== 'salla-theme-factory') {
    issue(issues, rel(manifestPath), 'manifest لا يثبت أن الثيم خرج من المصنع.');
  }

  if (manifest.theme !== themeName) {
    issue(issues, rel(manifestPath), `manifest.theme لا يطابق اسم المجلد: ${manifest.theme || '-'} != ${themeName}`);
  }

  if (manifest.role === 'source-template') {
    if (!allowSourceTemplate) {
      issue(
        issues,
        `themes/${themeName}`,
        'هذا قالب مصدر لا مخرج تسليم. تعديل Raed يحتاج FACTORY_ALLOW_SOURCE_TEMPLATE=1 ثم certify --template-calibration.'
      );
    }
    return;
  }

  if (manifest.role !== 'generated-theme') {
    issue(issues, rel(manifestPath), `manifest.role غير صالح للثيم المنتج: ${manifest.role || '-'}`);
  }

  const specsRel = manifest.specs_path || `specs/${themeName}.specs.json`;
  const specsPath = path.join(rootDir, specsRel);
  if (!fs.existsSync(specsPath)) {
    issue(issues, specsRel, 'لا يوجد specs contract للثيم. أي تعديل منتج يجب أن يبدأ من specs.');
  }

  const directThemeSourceChanges = themeFiles.filter((file) => /\/src\//.test(file) || /\/twilight\.json$/.test(file));
  if (directThemeSourceChanges.length && !fs.existsSync(specsPath)) {
    issue(issues, `themes/${themeName}`, 'تعديل source/twilight بلا specs صالح يعني أن خط الإنتاج يمكن تجاوزه.');
  }

  const stagedFactoryManifest = themeFiles.some((file) => file.endsWith('/.factory/manifest.json'));
  if (stagedFactoryManifest) {
    warnings.push({
      file: rel(manifestPath),
      detail: 'manifest ضمن التغييرات. تأكد أن هذا تحديث factory رسمي لا تعديل يدوي.',
    });
  }
}

function validateStagedChanges() {
  const entries = stagedEntries();
  const issues = [];
  const warnings = [];

  if (!entries.length) {
    return { entries, issues, warnings };
  }

  if (!allowArtifacts) {
    for (const entry of entries) {
      if (/^(build|reports|deliverables)\//.test(entry.file)) {
        issue(issues, entry.file, 'لا تضف مخرجات build/reports/deliverables إلى Git إلا بتصريح FACTORY_ALLOW_ARTIFACTS=1.');
      }
    }
  }

  const byTheme = new Map();
  for (const entry of entries) {
    const match = entry.file.match(/^themes\/([^/]+)\//);
    if (!match) continue;
    const themeName = match[1];
    if (!byTheme.has(themeName)) byTheme.set(themeName, []);
    byTheme.get(themeName).push(entry.file);
  }

  for (const [themeName, files] of byTheme.entries()) {
    validateThemeChange(themeName, files, issues, warnings);
  }

  return { entries, issues, warnings };
}

function printResult(result) {
  console.log('\n🧭 Factory Git Workflow Guard');
  console.log('----------------------------------------');
  console.log(`Staged files: ${result.entries.length}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  for (const item of result.issues) console.log(`❌ ${item.file}: ${item.detail}`);
  for (const item of result.warnings) console.log(`⚠️ ${item.file}: ${item.detail}`);

  console.log(result.issues.length ? '\n❌ Git workflow guard failed.' : '\n✅ Git workflow guard passed.');
}

function main() {
  const result = validateStagedChanges();
  printResult(result);
  if (result.issues.length) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateStagedChanges,
};
