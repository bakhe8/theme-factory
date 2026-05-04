const fs = require('fs');
const path = require('path');
const { getFixture, hasFixture, listFixtures, validateFixture } = require('./runtime/fixtures');
const { detectInstalledExperiences } = require('./experience-gate');
const { getExperience, isImplemented } = require('./experience-registry');
const { loadThemeSpecs, requiredSpecEntries } = require('./specs-loader');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');

const VERTICALS = {
  'luxury-fragrance': {
    id: 'luxury-fragrance',
    title: 'Luxury Fragrance Store',
    benchmark: {
      name: 'Junaid Perfumes Saudi Arabia',
      url: 'https://sa.junaidperfumes.com/',
      observedAt: '2026-05-04',
    },
    fixture: 'fragrance-luxury',
    requiredSignals: [
      'سلايدر عروض رئيسي متعدد الشرائح',
      'تصنيفات روائح واضحة: رجالي، نسائي، للجنسين، بخور، مسك، زيوت، مجموعات، جرب وقرر',
      'أقسام منتجات متكررة لاكتشاف الرائحة وليس مجرد شبكة منتجات واحدة',
      'منتجات بخصائص عطرية: عائلة الرائحة، النوتات، الحجم، الجمهور',
      'منتجات عطور عادية وزيوت وبخور ومباخر ومجموعات وعينات',
      'تجربة بيع عطرية تساعد على اختيار الرائحة، شرح النوتات، الإهداء، والمقارنة',
      'رسائل ثقة: شحن مجاني، دفع آمن، تغليف فاخر',
      'صفحات منتجات فردية كثيرة وصفحات تصنيفات قابلة للفحص بصريا',
    ],
    requiredExperiences: ['fragrance-discovery'],
    minimums: {
      products: 12,
      categories: 8,
      reviews: 4,
      homeSections: 4,
    },
  },
};

function normalizeVerticalId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function listVerticals() {
  return Object.values(VERTICALS).map((vertical) => ({
    id: vertical.id,
    title: vertical.title,
    fixture: vertical.fixture,
    benchmark: vertical.benchmark.url,
  }));
}

function getVertical(id = 'luxury-fragrance') {
  return VERTICALS[normalizeVerticalId(id)] || null;
}

function requiredVerticalsFromSpecs(themeName) {
  const loaded = loadThemeSpecs(themeName);
  const issues = [];

  if (!loaded.valid) {
    issues.push(`ملف المواصفات غير صالح: ${path.relative(rootDir, loaded.path)} - ${loaded.error}`);
  }

  const required = requiredSpecEntries(loaded.specs, 'verticals', normalizeVerticalId).map((item) => ({
    verticalId: item.id,
    key: item.key,
    fixture: item.config?.fixture || '',
    config: item.config,
  }));

  return {
    specsPath: loaded.path,
    specsExists: loaded.exists,
    required,
    issues,
  };
}

function validateVertical(id = 'luxury-fragrance') {
  const normalizedId = normalizeVerticalId(id);
  const vertical = getVertical(normalizedId);
  const issues = [];
  const warnings = [];

  if (!vertical) {
    return { vertical: null, fixture: null, issues: [`Vertical غير معروف: ${normalizedId || id}`], warnings };
  }

  if (!hasFixture(vertical.fixture)) {
    issues.push(`Fixture مفقود للـ vertical: ${vertical.fixture}`);
    return { vertical, fixture: null, issues, warnings };
  }

  const fixture = getFixture(vertical.fixture);
  const fixtureValidation = validateFixture(fixture);
  issues.push(...fixtureValidation.issues);
  warnings.push(...fixtureValidation.warnings);

  const minimums = vertical.minimums || {};
  const homeSections = fixture.home?.productSections || [];

  if ((fixture.products || []).length < minimums.products) {
    issues.push(`${vertical.id}: عدد المنتجات أقل من معيار المتجر المرجعي`);
  }

  if ((fixture.categories || []).length < minimums.categories) {
    issues.push(`${vertical.id}: عدد التصنيفات أقل من معيار المتجر المرجعي`);
  }

  if ((fixture.reviews || []).length < minimums.reviews) {
    issues.push(`${vertical.id}: عدد المراجعات أقل من معيار المتجر المرجعي`);
  }

  if (homeSections.length < minimums.homeSections) {
    issues.push(`${vertical.id}: أقسام الصفحة الرئيسية أقل من معيار المتجر المرجعي`);
  }

  for (const experienceId of vertical.requiredExperiences || []) {
    const experience = getExperience(experienceId);
    if (!experience) {
      issues.push(`${vertical.id}: تجربة مطلوبة غير مسجلة في Experience Registry: ${experienceId}`);
    } else if (!isImplemented(experience)) {
      issues.push(`${vertical.id}: تجربة مطلوبة غير منفذة: ${experienceId}`);
    }
  }

  const fixtureIds = listFixtures().map((item) => item.id);
  if (!fixtureIds.includes(vertical.fixture)) {
    issues.push(`${vertical.id}: fixture غير ظاهر في قائمة fixtures`);
  }

  return { vertical, fixture, issues, warnings };
}

function validateThemeVertical(themeName, id = 'luxury-fragrance', options = {}) {
  const base = validateVertical(id);
  const issues = [...base.issues];
  const warnings = [...base.warnings];
  const vertical = base.vertical;
  const themePath = path.join(themesDir, themeName || '');

  if (!themeName || !fs.existsSync(themePath)) {
    issues.push(`الثيم غير موجود لفحص vertical: ${themeName || '-'}`);
    return { ...base, theme: themeName, issues, warnings, installedExperiences: [] };
  }

  if (options.fixture && vertical && options.fixture !== vertical.fixture) {
    issues.push(`${themeName}: المواصفات تطلب fixture=${options.fixture} لكن معيار ${vertical.id} يستخدم ${vertical.fixture}`);
  }

  const installedExperiences = detectInstalledExperiences(themeName);
  const installedIds = new Set(installedExperiences.map((item) => item.experienceId));

  for (const experienceId of vertical?.requiredExperiences || []) {
    if (!installedIds.has(experienceId)) {
      issues.push(`${themeName}: تجربة ${experienceId} مطلوبة لمعيار ${vertical.id} لكنها غير مثبتة في الثيم`);
    }
  }

  return { ...base, theme: themeName, issues, warnings, installedExperiences };
}

module.exports = {
  getVertical,
  listVerticals,
  normalizeVerticalId,
  requiredVerticalsFromSpecs,
  validateVertical,
  validateThemeVertical,
};
