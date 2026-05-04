const fs = require('fs');
const path = require('path');
const { sanitizeThemeName, isValidThemeName } = require('./policies/salla-theme-policy');
const { workspacePath } = require('./factory-config');
const {
  applyInnovationFulfillmentToSpecs,
  loadInnovations,
  normalizeInnovationId,
} = require('./innovation-factory');

const rawThemeName = process.argv[2];
const themeName = sanitizeThemeName(rawThemeName);
const args = process.argv.slice(3);
const specsDir = workspacePath('specs');
const workordersDir = workspacePath('workorders');
const templateSpecsPath = path.join(specsDir, 'template.specs.json');
const specsPath = path.join(specsDir, `${themeName}.specs.json`);
const workorderDir = path.join(workordersDir, themeName || 'unknown');
const workorderPath = path.join(workorderDir, 'intake.json');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function valueAfterEquals(value) {
  return String(value).slice(String(value).indexOf('=') + 1).trim();
}

function parseList(prefix) {
  return args
    .filter((arg) => arg.startsWith(prefix))
    .flatMap((arg) => valueAfterEquals(arg).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function option(name, fallback = '') {
  const item = args.find((arg) => arg.startsWith(`--${name}=`));
  return item ? valueAfterEquals(item) : fallback;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function titleize(theme) {
  return theme
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

if (!rawThemeName) {
  fail('الاستخدام: node factory.js intake <theme-name> [--name-ar=...] [--name-en=...] [--vertical=...] [--experience=...] [--page-experience=...] [--innovation=...] [--force]');
}

if (!isValidThemeName(themeName)) {
  fail('اسم الثيم يجب أن يكون kebab-case ويبدأ بحرف إنجليزي، مثال: luxury-fragrance');
}

if (rawThemeName !== themeName) {
  console.log(`ℹ️ تم تطبيع الاسم إلى: ${themeName}`);
}

if (!fs.existsSync(templateSpecsPath)) {
  fail(`قالب المواصفات غير موجود: ${templateSpecsPath}`);
}

const force = args.includes('--force');
if (fs.existsSync(specsPath) && !force) {
  fail(`ملف المواصفات موجود بالفعل: ${path.relative(process.cwd(), specsPath)}. استخدم --force للاستبدال.`);
}

const specs = JSON.parse(fs.readFileSync(templateSpecsPath, 'utf8'));
const nameEn = option('name-en', titleize(themeName));
const nameAr = option('name-ar', `ثيم ${nameEn}`);

specs.brand = {
  ...(specs.brand || {}),
  name_ar: nameAr,
  name_en: nameEn,
  identifier: themeName,
  version: option('version', specs.brand?.version || '1.0.0'),
  author: option('author', specs.brand?.author || 'Salla Theme Factory'),
  author_email: option('author-email', specs.brand?.author_email || 'support@salla.sa'),
};

const preset = option('preset', specs.visual_identity?.preset || 'custom');
specs.visual_identity = {
  ...(specs.visual_identity || {}),
  preset,
};

for (const vertical of parseList('--vertical=')) {
  const key = normalizeKey(vertical);
  specs.verticals = specs.verticals || {};
  specs.verticals[key] = {
    ...(specs.verticals[key] || {}),
    required: true,
  };

  if (key === 'luxury_fragrance') {
    specs.verticals[key].fixture = 'fragrance-luxury';
    specs.experiences = specs.experiences || {};
    specs.experiences.fragrance_discovery = {
      ...(specs.experiences.fragrance_discovery || {}),
      required: true,
      slug: 'fragrance-discovery',
    };
  }
}

for (const experience of parseList('--experience=')) {
  const key = normalizeKey(experience);
  specs.experiences = specs.experiences || {};
  specs.experiences[key] = {
    ...(specs.experiences[key] || {}),
    required: true,
    slug: (specs.experiences[key] || {}).slug || String(experience).replace(/_/g, '-'),
  };
}

for (const pageExperience of parseList('--page-experience=')) {
  const key = normalizeKey(pageExperience);
  specs.page_experiences = specs.page_experiences || {};
  specs.page_experiences[key] = {
    ...(specs.page_experiences[key] || {}),
    required: true,
  };
}

const requestedInnovations = parseList('--innovation=')
  .map((innovation) => normalizeInnovationId(innovation))
  .filter(Boolean);
const appliedInnovationFulfillment = [];
if (requestedInnovations.length) {
  const registry = loadInnovations();
  if (registry.issues.length) {
    for (const issue of registry.issues) console.error(`❌ ${issue}`);
    fail('سجل الابتكار غير صالح؛ لا يمكن إنشاء مدخلات تصنيع تعتمد عليه.');
  }

  specs.innovation = specs.innovation || {};
  const existing = Array.isArray(specs.innovation.experiments) ? specs.innovation.experiments : [];
  specs.innovation.experiments = [...new Set([...existing, ...requestedInnovations])];

  for (const innovationId of requestedInnovations) {
    const validation = registry.byId.get(innovationId);
    if (!validation) {
      fail(`ابتكار غير معروف: ${innovationId}. أنشئه أولاً عبر node factory.js innovation propose ${innovationId}`);
    }

    appliedInnovationFulfillment.push(...applyInnovationFulfillmentToSpecs(specs, validation.record));
  }
}

writeJson(specsPath, specs);
writeJson(workorderPath, {
  schema: 'salla-theme-factory/workorder@1',
  theme: themeName,
  created_at: new Date().toISOString(),
  status: 'intake-created',
  inputs: {
    specs: path.relative(process.cwd(), specsPath).replace(/\\/g, '/'),
    requested_verticals: parseList('--vertical='),
    requested_experiences: parseList('--experience='),
    requested_page_experiences: parseList('--page-experience='),
    requested_innovations: requestedInnovations,
    applied_innovation_fulfillment: appliedInnovationFulfillment,
  },
  next_steps: [
    `node factory.js manufacture ${themeName}`,
    `node factory.js deliver ${themeName}`,
  ],
});

console.log(`\n✅ تم إنشاء مدخلات التصنيع للثيم: ${themeName}`);
console.log(`📋 specs: ${path.relative(process.cwd(), specsPath)}`);
console.log(`🧾 workorder: ${path.relative(process.cwd(), workorderPath)}`);
console.log('\nالخطوة التالية:');
console.log(`node factory.js manufacture ${themeName}`);
