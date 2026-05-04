const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  isValidThemeName,
  sanitizeThemeName,
  validateTheme,
} = require('./policies/salla-theme-policy');
const { validateDocsGate } = require('./docs-intelligence/guard');
const { getApprovedThemeSource, loadFactoryConfig, workspacePath } = require('./factory-config');

const rawThemeName = process.argv[2];
const args = process.argv.slice(3);
const themeName = sanitizeThemeName(rawThemeName);
const rootDir = path.join(__dirname, '..');
const config = loadFactoryConfig();
const themesDir = workspacePath('themes');
const specsDir = workspacePath('specs');
const templateName = sanitizeThemeName(process.env.FACTORY_TEMPLATE_THEME || 'raed');
const approvedSource = getApprovedThemeSource(templateName);
const templatePath = approvedSource?.absolutePath || path.join(themesDir, templateName);
const themePath = path.join(themesDir, themeName);
const specsPath = path.join(specsDir, `${themeName}.specs.json`);

const IGNORED_ENTRIES = new Set([
  '.git',
  '.salla-cache',
  '.turbo',
  '.cache',
  'node_modules',
  'build',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
]);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function titleize(theme) {
  return theme
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function copyRecursive(source, destination) {
  const stat = fs.lstatSync(source);

  if (stat.isSymbolicLink()) {
    return;
  }

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      if (IGNORED_ENTRIES.has(entry)) continue;
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function rewritePackage() {
  const packagePath = path.join(themePath, 'package.json');
  const manifest = readJson(packagePath);

  manifest.name = `theme-${themeName}`;
  manifest.version = manifest.version || '1.0.0';
  manifest.repository = {
    type: 'git',
    url: `git+https://github.com/SallaApp/theme-${themeName}.git`,
  };
  manifest.author = manifest.author || 'Salla Theme Factory';

  writeJson(packagePath, manifest);
  return manifest;
}

function rewriteTwilight(manifest) {
  const twilightPath = path.join(themePath, 'twilight.json');
  const twilight = readJson(twilightPath);
  const title = titleize(themeName);

  twilight.name = {
    ar: `ثيم ${title}`,
    en: title,
  };
  twilight.identifier = themeName;
  twilight.version = manifest.version || twilight.version || '1.0.0';
  twilight.author = twilight.author || manifest.author || 'Salla Theme Factory';
  twilight.repository = `https://github.com/SallaApp/theme-${themeName}`;
  twilight.author_email = twilight.author_email || 'support@salla.sa';
  twilight.features = Array.isArray(twilight.features) ? twilight.features : [];
  twilight.settings = Array.isArray(twilight.settings) ? twilight.settings : [];
  twilight.components = Array.isArray(twilight.components) ? twilight.components : [];

  writeJson(twilightPath, twilight);
}

function refreshLockfile() {
  execFileSync('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], {
    cwd: themePath,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function writeFactoryManifest() {
  writeJson(path.join(themePath, '.factory', 'manifest.json'), {
    schema: 'salla-theme-factory/theme-manifest@1',
    theme: themeName,
    role: 'generated-theme',
    created_by: 'salla-theme-factory',
    factory_version: config.factory_version || '10.0.0',
    source_template: approvedSource.id,
    source_path: approvedSource.path,
    source_url: approvedSource.source_url,
    specs_path: path.relative(rootDir, specsPath).replace(/\\/g, '/'),
    created_at: new Date().toISOString(),
  });
}

if (!rawThemeName) {
  fail('يرجى تحديد اسم الثيم: node factory.js create my-new-theme');
}

if (!isValidThemeName(themeName)) {
  fail('اسم الثيم يجب أن يكون kebab-case ويبدأ بحرف إنجليزي، مثال: my-new-theme');
}

if (rawThemeName !== themeName) {
  console.log(`ℹ️ تم تطبيع الاسم إلى: ${themeName}`);
}

if (!fs.existsSync(templatePath)) {
  fail(`قالب المصنع غير موجود: themes/${templateName}`);
}

if (!approvedSource) {
  fail(`القالب ${templateName} غير معتمد في factory.config.json. لا تستخدم قوالب غير مسجلة كمصدر تصنيع.`);
}

if (!fs.existsSync(specsPath) && !args.includes('--allow-missing-specs')) {
  fail(`ملف المواصفات إلزامي قبل إنشاء الثيم: specs/${themeName}.specs.json\nابدأ بـ: node factory.js intake ${themeName}`);
}

if (fs.existsSync(themePath)) {
  fail(`الثيم "${themeName}" موجود بالفعل.`);
}

const docsPreflight = validateDocsGate();
for (const warning of docsPreflight.warnings) {
  console.log(`⚠️ [DocsGate] ${warning}`);
}
if (docsPreflight.issues.length > 0) {
  for (const issue of docsPreflight.issues) {
    console.error(`❌ [DocsGate] ${issue}`);
  }
  fail('ذاكرة وثائق سلة غير صالحة للتصنيع. شغل: node factory.js docs sync --max=180');
}

console.log(`🚀 جاري إنشاء ثيم جديد مطابق لسياسة المصنع: ${themeName}`);
console.log(`📦 القالب المعتمد: themes/${templateName}`);

try {
  copyRecursive(templatePath, themePath);
  writeFactoryManifest();
  const manifest = rewritePackage();
  rewriteTwilight(manifest);

  console.log('🔒 تحديث ملف القفل عبر pnpm...');
  refreshLockfile();

  const { issues, warnings } = validateTheme(themePath, themeName);
  for (const warning of warnings) {
    console.log(`⚠️ [${warning.type}] ${warning.file}: ${warning.detail}`);
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`❌ [${issue.type}] ${issue.file}: ${issue.detail}`);
    }
    fail('تم إنشاء الملفات، لكن الثيم لم يجتز سياسة المصنع. عالج الملاحظات ثم شغّل: node factory.js policy');
  }

  const docsGate = validateDocsGate(themeName);
  for (const warning of docsGate.warnings) {
    console.log(`⚠️ [DocsGate] ${warning}`);
  }
  if (docsGate.issues.length > 0) {
    for (const issue of docsGate.issues) {
      console.error(`❌ [DocsGate] ${issue}`);
    }
    fail('تم إنشاء الملفات، لكن ذاكرة وثائق سلة غير صالحة للتصنيع. شغل: node factory.js docs sync --max=180');
  }

  console.log(`✅ تم إنشاء الثيم بنجاح في: themes/${themeName}`);
  console.log(`💡 الخطوة التالية: node factory.js apply-specs ${themeName}`);
} catch (error) {
  console.error('❌ حدث خطأ أثناء إنشاء الثيم:', error.message);
  process.exit(1);
}
