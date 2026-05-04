const fs = require('fs');
const path = require('path');

const MIB = 1024 * 1024;

const DOC_RULES = {
  SALLA_THEME_SIZE_PUBLIC_1MB: {
    title: 'Public theme size must not exceed 1MB',
    url: 'https://docs.salla.dev/421888m0',
    section: 'Technical Review 1.1',
    enforcement: 'error',
  },
  SALLA_LOCALIZATION_REQUIRED: {
    title: 'Theme should use localization and not static string',
    url: 'https://docs.salla.dev/421888m0',
    section: 'Technical Review 1.2',
    enforcement: 'error',
  },
  SALLA_NO_PER_PRODUCT_REQUESTS: {
    title: 'Too many network requests, for example every product has request, should be prevented',
    url: 'https://docs.salla.dev/421888m0',
    section: 'Technical Review 1.5',
    enforcement: 'error',
  },
  SALLA_NO_RAW_TWIG: {
    title: 'Search for any usage for |raw',
    url: 'https://docs.salla.dev/421888m0',
    section: 'Technical Review 2.4 Security',
    enforcement: 'error',
  },
  SALLA_NO_MERCHANT_CUSTOM_HTML: {
    title: 'No setting or component should allow the merchant to add custom HTML',
    url: 'https://docs.salla.dev/421888m0',
    section: 'Technical Review 2.4 Security',
    enforcement: 'error',
  },
  SALLA_INNERHTML_REQUIRES_SANITIZATION: {
    title: 'Any JavaScript HTML injection sink must be sanitized or limited to trusted Salla-rendered values',
    url: 'https://docs.salla.dev/421888m0',
    section: 'Technical Review 2.4 Security',
    enforcement: 'warning',
  },
  SALLA_FAST_CHECKOUT_CSS_ONLY: {
    title: 'Fast checkout widget can only be customized through the allowed CSS variables',
    url: 'https://docs.salla.dev/422692m0',
    section: 'Add Product - Fast Checkout Feature',
    enforcement: 'error',
  },
  SALLA_CUSTOM_PRODUCT_CARD_ALLOWED: {
    title: 'custom-salla-product-card is an allowed customization point for product lists',
    url: 'https://docs.salla.dev/422718m0',
    section: 'Product Card - Custom Salla Product Card Component',
    enforcement: 'allow',
  },
  SALLA_PRODUCT_LISTING_CONTRACT: {
    title: 'Product listing output should include product title, price, images, and add-to-cart behavior',
    url: 'https://docs.salla.dev/421887m0',
    section: 'UX/UI Review 4.1 Product Page',
    enforcement: 'warning',
  },
  SALLA_BUNDLE_NO_GLOBALS: {
    title: 'Component bundles do not support global components such as Header or Footer',
    url: 'https://docs.salla.dev/1945741m0',
    section: 'Bundle Publish Requirements - UI / UX Review',
    enforcement: 'error',
  },
  SALLA_HOOKS_REQUIRED: {
    title: 'Twilight defines head and body hooks as extension points',
    url: 'https://docs.salla.dev/422552m0',
    section: 'Themes Hooks',
    enforcement: 'warning',
  },
  SALLA_TWILIGHT_THEMES_AUTO_INJECT_WEB_COMPONENTS: {
    title: 'Twilight theme engine injects Twilight web components into theme pages',
    url: 'https://docs.salla.dev/422689m0',
    section: 'Usage - Twilight Themes',
    enforcement: 'allow',
  },
  SALLA_WEB_COMPONENTS_BUNDLER_ES_MODULES_ALLOWED: {
    title: 'Bundler/ES modules can import Twilight web components outside the Twilight theme runtime',
    url: 'https://docs.salla.dev/422689m0',
    section: 'Usage - Bundler/ES modules',
    enforcement: 'allow',
  },
  SALLA_TAILWIND_CONTENT_REQUIRED_FOR_WEB_COMPONENTS: {
    title: 'Tailwind content paths and Twilight safe list are required for Twilight web components styles',
    url: 'https://docs.salla.dev/422689m0',
    section: 'Usage - Tailwind Config',
    enforcement: 'error',
  },
  SALLA_TWILIGHT_FEATURES_CONTRACT: {
    title: 'twilight.json features list predefined Twilight components',
    url: 'https://docs.salla.dev/421921m0',
    section: 'Theme Features',
    enforcement: 'warning',
  },
  SALLA_TWILIGHT_COMPONENTS_CONTRACT: {
    title: 'twilight.json components map to Twig files under src/views/components',
    url: 'https://docs.salla.dev/421921m0',
    section: 'Theme components',
    enforcement: 'error',
  },
};

const ALLOWED_FEATURES = new Set([
  'mega-menu',
  'fonts',
  'color',
  'breadcrumb',
  'unite-cards-height',
  'menu-images',
  'filters',
  'component-featured-products',
  'component-fixed-banner',
  'component-fixed-products',
  'component-products-slider',
  'component-photos-slider',
  'component-parallax-background',
  'component-random-testimonials',
  'component-testimonials',
  'component-square-photos',
  'component-store-features',
  'component-youtube',
]);

const REQUIRED_FILES = [
  'package.json',
  'pnpm-lock.yaml',
  'twilight.json',
  'webpack.config.js',
  'postcss.config.js',
  'tailwind.config.js',
  'src/views/layouts/master.twig',
  'src/views/pages/index.twig',
  'src/views/components/header/header.twig',
  'src/views/components/footer/footer.twig',
  'src/locales/ar.json',
  'src/locales/en.json',
];

const REQUIRED_PACKAGE_SCRIPTS = [
  'production',
  'development',
  'watch',
];

const REQUIRED_TWIG_HOOKS = [
  'head:start',
  'head:end',
  'body:start',
  'body:end',
];

const MERCHANT_HTML_TYPES = new Set([
  'html',
  'richtext',
  'rich-text',
  'wysiwyg',
  'code',
  'custom-html',
]);

const ALLOWED_FAST_CHECKOUT_VARS = new Set([
  '--salla-fast-checkout-button-height',
  '--salla-fast-checkout-button-width',
  '--salla-fast-checkout-button-border-radius',
]);

let generatedRulesCache = null;
let twilightContractCache = null;
let webComponentsUsageContractCache = null;

function isValidThemeName(themeName) {
  return /^[a-z][a-z0-9-]{2,63}$/.test(themeName);
}

function sourceFor(ruleId) {
  const generated = getGeneratedRulesById().get(ruleId);
  const rule = generated || DOC_RULES[ruleId];
  if (!rule) return null;
  if (rule.source) {
    return {
      ...rule.source,
      ...(Array.isArray(rule.sources) ? { sources: rule.sources } : {}),
    };
  }
  return {
    title: rule.title,
    url: rule.url,
    section: rule.section,
  };
}

function getGeneratedRulesById() {
  if (generatedRulesCache) return generatedRulesCache;

  generatedRulesCache = new Map();
  const generatedPath = path.join(__dirname, '..', 'docs-intelligence', 'generated', 'rules.generated.json');
  if (!fs.existsSync(generatedPath)) return generatedRulesCache;

  try {
    const rules = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
    for (const rule of rules) {
      if (rule.id && (rule.source || Array.isArray(rule.sources)) && !generatedRulesCache.has(rule.id)) {
        generatedRulesCache.set(rule.id, rule);
      }
    }
  } catch (error) {
    generatedRulesCache = new Map();
  }

  return generatedRulesCache;
}

function getGeneratedTwilightContract() {
  if (twilightContractCache !== null) return twilightContractCache;

  twilightContractCache = null;
  const contractPath = path.join(__dirname, '..', 'docs-intelligence', 'generated', 'twilight-json-contract.json');
  if (!fs.existsSync(contractPath)) return twilightContractCache;

  try {
    twilightContractCache = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } catch (error) {
    twilightContractCache = null;
  }

  return twilightContractCache;
}

function getGeneratedWebComponentsUsageContract() {
  if (webComponentsUsageContractCache !== null) return webComponentsUsageContractCache;

  webComponentsUsageContractCache = null;
  const contractPath = path.join(__dirname, '..', 'docs-intelligence', 'generated', 'web-components-usage-contract.json');
  if (!fs.existsSync(contractPath)) return webComponentsUsageContractCache;

  try {
    webComponentsUsageContractCache = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } catch (error) {
    webComponentsUsageContractCache = null;
  }

  return webComponentsUsageContractCache;
}

function allowedFeatures() {
  const contract = getGeneratedTwilightContract();
  return new Set([
    ...ALLOWED_FEATURES,
    ...((contract?.features?.examples || []).filter(Boolean)),
  ]);
}

function getAllowedFeatures() {
  return allowedFeatures();
}

function readJson(file, issues, type = 'Structure', ruleId = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    issues.push(withRule({ file: path.basename(file), type, detail: `ملف JSON غير صالح: ${error.message}` }, ruleId));
    return null;
  }
}

function withRule(finding, ruleId) {
  return {
    ...finding,
    ...(ruleId ? { ruleId, source: sourceFor(ruleId) } : {}),
  };
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function addIssue(issues, file, type, detail, ruleId = null) {
  issues.push(withRule({ file, type, detail }, ruleId));
}

function addWarning(warnings, file, type, detail, ruleId = null) {
  warnings.push(withRule({ file, type, detail }, ruleId));
}

function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.git', '.salla-cache'].includes(entry)) getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function formatBytes(bytes) {
  return `${(bytes / MIB).toFixed(2)} MiB`;
}

function validatePackage(themePath, themeName, issues) {
  const file = path.join(themePath, 'package.json');
  const manifest = readJson(file, issues, 'Package');
  if (!manifest) return;

  const expectedNames = new Set([themeName, `theme-${themeName}`]);
  if (!expectedNames.has(manifest.name)) {
    addIssue(issues, 'package.json', 'Package', `اسم الحزمة [${manifest.name}] لا يطابق اسم الثيم [${themeName}]`);
  }

  for (const script of REQUIRED_PACKAGE_SCRIPTS) {
    if (!manifest.scripts?.[script]) {
      addIssue(issues, 'package.json', 'Package', `سكريبت ${script} مفقود`);
    }
  }

  if (manifest.scripts?.preinstall && !String(manifest.scripts.preinstall).includes('only-allow pnpm')) {
    addIssue(issues, 'package.json', 'Package', 'preinstall يجب أن يثبت استخدام pnpm أو يزال بقرار واضح');
  }
}

function validateTwilight(themePath, themeName, issues, warnings) {
  const file = path.join(themePath, 'twilight.json');
  const twilight = readJson(file, issues, 'Twilight');
  if (!twilight) return;
  const packagePath = path.join(themePath, 'package.json');
  const manifest = fs.existsSync(packagePath) ? readJson(packagePath, issues, 'Package') : null;

  if (!twilight.name || typeof twilight.name !== 'object') {
    addIssue(issues, 'twilight.json', 'Twilight', 'حقل name يجب أن يحتوي أسماء ar/en');
  } else {
    if (!twilight.name.ar) addIssue(issues, 'twilight.json', 'Twilight', 'name.ar مفقود');
    if (!twilight.name.en) addIssue(issues, 'twilight.json', 'Twilight', 'name.en مفقود');
  }

  if (twilight.identifier !== themeName) {
    addIssue(issues, 'twilight.json', 'Twilight', `identifier يجب أن يساوي اسم الثيم [${themeName}]`);
  }

  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(twilight.version || ''))) {
    addIssue(issues, 'twilight.json', 'Twilight', 'version يجب أن يكون SemVer مثل 1.0.0');
  }

  if (manifest?.version && twilight.version && manifest.version !== twilight.version) {
    addIssue(issues, 'twilight.json', 'Twilight', `version يجب أن يطابق package.json (${manifest.version})`);
  }

  if (!twilight.repository || typeof twilight.repository !== 'string') {
    addIssue(issues, 'twilight.json', 'Twilight', 'repository مفقود');
  } else if (!twilight.repository.includes(themeName)) {
    addWarning(warnings, 'twilight.json', 'Twilight', `repository لا يحتوي اسم الثيم: ${themeName}`);
  }

  if (!twilight.author_email || typeof twilight.author_email !== 'string' || !twilight.author_email.includes('@')) {
    addIssue(issues, 'twilight.json', 'Twilight', 'author_email مفقود أو غير صالح');
  }

  if (!Array.isArray(twilight.features)) {
    addIssue(issues, 'twilight.json', 'Twilight', 'features يجب أن تكون مصفوفة');
  } else {
    const allowed = allowedFeatures();
    for (const feature of twilight.features) {
      if (!allowed.has(feature)) {
        addWarning(warnings, 'twilight.json', 'Twilight', `feature غير معروف في سياسة المصنع: ${feature}`, 'SALLA_TWILIGHT_FEATURES_CONTRACT');
      }
    }
  }

  validateSettings(twilight.settings || [], issues);
  validateComponents(themePath, twilight.components || [], issues, warnings);
}

function validateSettings(settings, issues) {
  if (!Array.isArray(settings)) {
    addIssue(issues, 'twilight.json', 'Twilight', 'settings يجب أن تكون مصفوفة');
    return;
  }

  const ids = new Set();
  for (const setting of settings) {
    if (!setting.id) {
      addIssue(issues, 'twilight.json', 'Twilight', 'كل setting يجب أن يحتوي id');
      continue;
    }

    if (ids.has(setting.id)) {
      addIssue(issues, 'twilight.json', 'Twilight', `setting id مكرر: ${setting.id}`);
    }
    ids.add(setting.id);

    if (setting.type !== 'static' && !setting.type) {
      addIssue(issues, 'twilight.json', 'Twilight', `setting ${setting.id} لا يحتوي type`);
    }

    if (setting.type !== 'static' && !setting.label && !setting.labelHTML) {
      addIssue(issues, 'twilight.json', 'Twilight', `setting ${setting.id} لا يحتوي label أو labelHTML`);
    }

    validateNoMerchantHtmlField(setting, `setting ${setting.id}`, issues);
  }
}

function validateComponents(themePath, components, issues, warnings = []) {
  if (!Array.isArray(components)) {
    addIssue(issues, 'twilight.json', 'Twilight', 'components يجب أن تكون مصفوفة');
    return;
  }

  const seenKeys = new Set();
  const seenPaths = new Set();

  for (const component of components) {
    if (!component.path) {
      addIssue(issues, 'twilight.json', 'Component', 'كل component يجب أن يحتوي path', 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
      continue;
    }

    const componentPath = String(component.path);
    if (!/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/.test(componentPath) || componentPath.includes('..') || /[\\/]/.test(componentPath)) {
      addIssue(issues, 'twilight.json', 'Component', `path غير صالح داخل components: ${componentPath}`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
      continue;
    }

    if (!componentPath.startsWith('home.')) {
      addWarning(warnings, 'twilight.json', 'Component', `component في twilight.json خارج home.*: ${componentPath}. وثائق سلة تصف Theme Components كعناصر لصفحة Home.`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
    }

    if (seenPaths.has(componentPath)) {
      addIssue(issues, 'twilight.json', 'Component', `component path مكرر: ${componentPath}`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
    }
    seenPaths.add(componentPath);

    if (component.key) {
      if (seenKeys.has(component.key)) {
        addIssue(issues, 'twilight.json', 'Component', `component key مكرر: ${component.key}`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
      }
      seenKeys.add(component.key);
    } else {
      addWarning(warnings, 'twilight.json', 'Component', `component ${componentPath} لا يحتوي key واضح`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
    }

    if (!component.title?.ar || !component.title?.en) {
      addWarning(warnings, 'twilight.json', 'Component', `component ${componentPath} لا يحتوي title.ar/title.en`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
    }

    if (!component.icon) {
      addWarning(warnings, 'twilight.json', 'Component', `component ${componentPath} لا يحتوي icon`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
    }

    const componentFile = path.join(themePath, 'src', 'views', 'components', `${String(component.path).replace(/\./g, path.sep)}.twig`);
    if (!fs.existsSync(componentFile)) {
      addIssue(issues, 'twilight.json', 'Component', `مسار component لا يطابق ملف Twig: ${component.path}`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
    }

    if (component.fields && !Array.isArray(component.fields)) {
      addIssue(issues, 'twilight.json', 'Component', `fields في ${component.path} يجب أن تكون مصفوفة`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
    }

    if (Array.isArray(component.fields)) {
      validateComponentFields(component.path, component.fields, issues);
    }
  }
}

function validateComponentFields(componentPath, fields, issues, seen = new Set()) {
  for (const field of fields) {
    if (!field.id) {
      addIssue(issues, 'twilight.json', 'Component', `حقل داخل ${componentPath} بدون id`);
      continue;
    }

    const key = `${componentPath}:${field.id}`;
    if (seen.has(key)) {
      addIssue(issues, 'twilight.json', 'Component', `field id مكرر داخل ${componentPath}: ${field.id}`);
    }
    seen.add(key);

    if (!field.type) {
      addIssue(issues, 'twilight.json', 'Component', `field ${field.id} داخل ${componentPath} بدون type`, 'SALLA_TWILIGHT_COMPONENTS_CONTRACT');
    }

    validateNoMerchantHtmlField(field, `field ${field.id} داخل ${componentPath}`, issues);

    if (Array.isArray(field.fields)) {
      validateComponentFields(componentPath, field.fields, issues, seen);
    }
  }
}

function validateNoMerchantHtmlField(field, context, issues) {
  const type = String(field.type || '').toLowerCase();
  const format = String(field.format || '').toLowerCase();
  const isStatic = type === 'static';

  if (!isStatic && (MERCHANT_HTML_TYPES.has(type) || MERCHANT_HTML_TYPES.has(format))) {
    addIssue(
      issues,
      'twilight.json',
      'Security',
      `${context} يسمح بإدخال HTML من التاجر عبر type/format [${field.type || field.format}]`,
      'SALLA_NO_MERCHANT_CUSTOM_HTML',
    );
  }

  if (isStatic && typeof field.value === 'string' && /<script\b/i.test(field.value)) {
    addIssue(
      issues,
      'twilight.json',
      'Security',
      `${context} يحتوي script داخل قيمة static`,
      'SALLA_NO_MERCHANT_CUSTOM_HTML',
    );
  }
}

function validateLocales(themePath, issues, warnings) {
  const ar = readJson(path.join(themePath, 'src', 'locales', 'ar.json'), issues, 'Locale', 'SALLA_LOCALIZATION_REQUIRED');
  const en = readJson(path.join(themePath, 'src', 'locales', 'en.json'), issues, 'Locale', 'SALLA_LOCALIZATION_REQUIRED');
  if (!ar || !en) return;

  const arKeys = flattenKeys(ar);
  const enKeys = flattenKeys(en);

  for (const key of arKeys) {
    if (!enKeys.has(key)) addWarning(warnings, 'src/locales/en.json', 'Locale', `مفتاح مفقود مقابل العربية: ${key}`, 'SALLA_LOCALIZATION_REQUIRED');
  }

  for (const key of enKeys) {
    if (!arKeys.has(key)) addWarning(warnings, 'src/locales/ar.json', 'Locale', `مفتاح مفقود مقابل الإنجليزية: ${key}`, 'SALLA_LOCALIZATION_REQUIRED');
  }
}

function flattenKeys(value, prefix = '', keys = new Set()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenKeys(child, prefix ? `${prefix}.${key}` : key, keys);
    }
  } else if (prefix) {
    keys.add(prefix);
  }

  return keys;
}

function validateLayout(themePath, issues, warnings) {
  const masterPath = path.join(themePath, 'src', 'views', 'layouts', 'master.twig');
  if (!fs.existsSync(masterPath)) return;

  const content = fs.readFileSync(masterPath, 'utf8');
  for (const hook of REQUIRED_TWIG_HOOKS) {
    if (!content.includes(`hook '${hook}'`) && !content.includes(`hook "${hook}"`)) {
      addWarning(warnings, 'src/views/layouts/master.twig', 'Layout', `hook موصى به غير موجود: ${hook}`, 'SALLA_HOOKS_REQUIRED');
    }
  }

  if (!content.includes('{% block content %}') && !content.includes('{% block content')) {
    addIssue(issues, 'src/views/layouts/master.twig', 'Layout', 'master layout يجب أن يحتوي block content');
  }
}

function validateWebComponentsUsage(themePath, issues, warnings) {
  const contract = getGeneratedWebComponentsUsageContract();
  if (!contract) return;

  validateTwilightTailwindConfig(themePath, contract, issues);
  validateTwilightComponentsRuntime(themePath, contract, issues, warnings);
}

function validateTwilightTailwindConfig(themePath, contract, issues) {
  const tailwindPath = path.join(themePath, 'tailwind.config.js');
  if (!fs.existsSync(tailwindPath)) return;

  const content = fs.readFileSync(tailwindPath, 'utf8');
  const plugin = contract.tailwindConfig?.plugin || '@salla.sa/twilight-tailwind-theme';
  const safeListPath = contract.tailwindConfig?.safeListPath || 'node_modules/@salla.sa/twilight-tailwind-theme/safe-list-css.txt';

  if (plugin && !content.includes(plugin)) {
    addIssue(
      issues,
      'tailwind.config.js',
      'Tailwind',
      `مكون Tailwind الرسمي مفقود: ${plugin}`,
      'SALLA_TAILWIND_CONTENT_REQUIRED_FOR_WEB_COMPONENTS',
    );
  }

  if (contract.tailwindConfig?.requiresTemplatePaths && !/["'][^"']*(?:src\/)?views\/\*\*\/\*\.twig["']/.test(content)) {
    addIssue(
      issues,
      'tailwind.config.js',
      'Tailwind',
      'content يجب أن يحتوي مسارات قوالب Twig حتى لا ينتج Tailwind CSS فارغ',
      'SALLA_TAILWIND_CONTENT_REQUIRED_FOR_WEB_COMPONENTS',
    );
  }

  if (safeListPath && !content.includes(safeListPath) && !content.includes('safe-list-css.txt')) {
    addIssue(
      issues,
      'tailwind.config.js',
      'Tailwind',
      `قائمة Twilight الآمنة مفقودة من content: ${safeListPath}`,
      'SALLA_TAILWIND_CONTENT_REQUIRED_FOR_WEB_COMPONENTS',
    );
  }
}

function validateTwilightComponentsRuntime(themePath, contract, issues, warnings) {
  const twigFiles = getAllFiles(path.join(themePath, 'src', 'views')).filter((file) => /\.twig$/i.test(file));
  const sourceJsFiles = getAllFiles(path.join(themePath, 'src', 'assets', 'js')).filter((file) => /\.js$/i.test(file));
  const helperRelativePath = path.normalize(path.join('src', 'assets', 'js', 'twilight.js'));
  const loaderImport = contract.runtimeModes?.bundlerEsModules?.importPath || '@salla.sa/twilight-components/loader';

  for (const file of twigFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/unpkg\.com\/@salla\.sa\/twilight-components/i.test(content)) {
      addIssue(
        issues,
        path.relative(themePath, file),
        'TwilightRuntime',
        'ثيمات Twilight لا تحتاج إضافة Twilight Web Components عبر HTML/CDN؛ محرك سلة يحقنها تلقائياً',
        'SALLA_TWILIGHT_THEMES_AUTO_INJECT_WEB_COMPONENTS',
      );
    }
  }

  const helperImportsLoader = sourceJsFiles.some((file) => {
    const relativePath = path.normalize(path.relative(themePath, file));
    const content = fs.readFileSync(file, 'utf8');
    const importsLoader = loaderImport && content.includes(loaderImport);
    if (importsLoader && relativePath !== helperRelativePath) {
      addIssue(
        issues,
        path.relative(themePath, file),
        'TwilightRuntime',
        'استيراد Twilight Web Components loader داخل كود الثيم سيضيفه للـbundle؛ استخدم حقن محرك Twilight بدلاً من ذلك',
        'SALLA_TWILIGHT_THEMES_AUTO_INJECT_WEB_COMPONENTS',
      );
    }

    return importsLoader && relativePath === helperRelativePath;
  });

  const webpackPath = path.join(themePath, 'webpack.config.js');
  if (!helperImportsLoader || !fs.existsSync(webpackPath)) return;

  const webpack = fs.readFileSync(webpackPath, 'utf8');
  const entryBlock = (webpack.match(/entry\s*:\s*\{[\s\S]*?\n\s*\},\s*\n\s*output\s*:/) || [''])[0];
  const excludesHelper = /exclude\s*:\s*\[[\s\S]*asset\(['"]js\/twilight\.js['"]\)[\s\S]*\]/.test(webpack)
    || /exclude\s*:\s*\[[\s\S]*twilight\.js[\s\S]*\]/.test(webpack);
  const entryIncludesHelper = /asset\(['"]js\/twilight\.js['"]\)/.test(entryBlock);

  if (entryIncludesHelper) {
    addIssue(
      issues,
      'webpack.config.js',
      'TwilightRuntime',
      'twilight.js موجود ضمن entry وسيتم تجميع Web Components داخل bundle الثيم',
      'SALLA_TWILIGHT_THEMES_AUTO_INJECT_WEB_COMPONENTS',
    );
  }

  if (!excludesHelper) {
    addIssue(
      issues,
      'webpack.config.js',
      'TwilightRuntime',
      'src/assets/js/twilight.js يستورد loader لأغراض IDE ويجب استثناؤه من webpack حسب نمط Twilight starter',
      'SALLA_TWILIGHT_THEMES_AUTO_INJECT_WEB_COMPONENTS',
    );
  }
}

function validateDocumentedSourceRules(themePath, issues, warnings) {
  const srcPath = path.join(themePath, 'src');
  const sourceFiles = getAllFiles(srcPath);

  for (const file of sourceFiles) {
    const relativePath = path.relative(themePath, file);
    const content = fs.readFileSync(file, 'utf8');

    if (file.endsWith('.twig') && content.includes('|raw')) {
      addIssue(issues, relativePath, 'Security', 'استخدام |raw محظور بسياسة المصنع لأنه يحتاج مراجعة أمنية صريحة', 'SALLA_NO_RAW_TWIG');
    }

    if (file.endsWith('.js')) {
      if (/\beval\s*\(|\bnew\s+Function\s*\(|\bdocument\.write\s*\(/.test(content)) {
        addIssue(issues, relativePath, 'Security', 'استخدام eval/new Function/document.write يخالف مراجعة الأمان في الثيم', 'SALLA_NO_MERCHANT_CUSTOM_HTML');
      }

      validateHtmlInjectionUsage(relativePath, content, issues, warnings);

      const basename = path.basename(file).toLowerCase();
      const hasNetworkRequest = /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bsalla\.api\.request\s*\(/.test(content);
      if (hasNetworkRequest && basename.includes('product-card')) {
        addIssue(issues, relativePath, 'Performance', 'كرت المنتج لا يجب أن يطلق طلب شبكة لكل منتج', 'SALLA_NO_PER_PRODUCT_REQUESTS');
      } else if (hasNetworkRequest && /products?|home/.test(basename)) {
        addWarning(warnings, relativePath, 'Performance', 'راجع أن طلبات الشبكة هنا ليست لكل منتج عند العرض', 'SALLA_NO_PER_PRODUCT_REQUESTS');
      }
    }
  }

  validateFastCheckoutCss(themePath, issues);
  validateProductCardContract(themePath, warnings);
}

function validateHtmlInjectionUsage(relativePath, content, issues, warnings) {
  const sinks = [
    {
      name: 'innerHTML',
      pattern: /\.innerHTML\s*=/,
      trusted: [
        /\bsalla\.money\s*\(/,
        /\bsalla\.helpers\./,
        /<salla-loading\b/,
        /\.innerHTML\.replace\s*\(/,
        /\boriginalContent\b/,
        /\bcurrentCount\b/,
        /=\s*["'`]\s*["'`]\s*;?$/,
      ],
    },
    {
      name: 'outerHTML',
      pattern: /\.outerHTML\s*=/,
      trusted: [
        /=\s*["'`]\s*</,
        /<salla-loading\b/,
      ],
    },
    {
      name: 'insertAdjacentHTML',
      pattern: /\.insertAdjacentHTML\s*\(/,
      trusted: [
        /\(\s*["'`](beforeend|afterbegin|beforebegin|afterend)["'`]\s*,\s*["'`]/,
      ],
    },
  ];

  if (!sinks.some((sink) => sink.pattern.test(content))) return;

  const hasLocalSanitizer = /\bescapeHTML\s*\(|\bescapeHtml\s*\(|\bsanitizeHTML\s*\(|\bDOMPurify\b/.test(content);
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const sink = sinks.find((item) => item.pattern.test(line));
    if (!sink) return;

    const trimmed = line.trim();
    const trustedValue = sink.trusted.some((pattern) => pattern.test(trimmed));

    if (hasLocalSanitizer || trustedValue) {
      addWarning(
        warnings,
        `${relativePath}:${index + 1}`,
        'Security',
        `استخدام ${sink.name} موجود لكنه محاط بمؤشر تعقيم/قيمة موثوقة. أبقه تحت مراجعة المصنع عند أي تعديل.`,
        'SALLA_INNERHTML_REQUIRES_SANITIZATION',
      );
      return;
    }

    addIssue(
      issues,
      `${relativePath}:${index + 1}`,
      'Security',
      `استخدام ${sink.name} بدون تعقيم واضح أو قيمة موثوقة. استخدم textContent أو escapeHTML/DOMPurify حسب السياق.`,
      'SALLA_INNERHTML_REQUIRES_SANITIZATION',
    );
  });
}

function validatePublicThemeSize(themePath, warnings, issues) {
  const publicPath = path.join(themePath, 'public');
  if (!fs.existsSync(publicPath)) {
    addWarning(warnings, 'public', 'Performance', 'مجلد public غير موجود؛ سيتم التحقق من حجم الثيم بعد البناء', 'SALLA_THEME_SIZE_PUBLIC_1MB');
    return;
  }

  const bytes = getAllFiles(publicPath).reduce((sum, file) => sum + fs.statSync(file).size, 0);
  if (bytes > MIB) {
    addIssue(issues, 'public', 'Performance', `حجم مخرجات الثيم ${formatBytes(bytes)} ويتجاوز حد 1MB للثيم العام`, 'SALLA_THEME_SIZE_PUBLIC_1MB');
  } else if (bytes > MIB * 0.98) {
    addWarning(warnings, 'public', 'Performance', `حجم مخرجات الثيم ${formatBytes(bytes)} قريب من حد 1MB`, 'SALLA_THEME_SIZE_PUBLIC_1MB');
  }
}

function validateFastCheckoutCss(themePath, issues) {
  const stylesPath = path.join(themePath, 'src', 'assets', 'styles');
  const styleFiles = getAllFiles(stylesPath).filter((file) => /\.(s?css|pcss)$/i.test(file));

  for (const file of styleFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('salla-mini-checkout-widget')) continue;

    const violations = findMiniCheckoutCssViolations(content);
    for (const violation of violations) {
      addIssue(
        issues,
        `${path.relative(themePath, file)}:${violation.line}`,
        'SallaComponent',
        `تخصيص مباشر غير مسموح لـ salla-mini-checkout-widget: ${violation.text}`,
        'SALLA_FAST_CHECKOUT_CSS_ONLY',
      );
    }
  }
}

function findMiniCheckoutCssViolations(content) {
  const lines = content.split(/\r?\n/);
  const violations = [];
  let inRestrictedBlock = false;
  let depth = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;

    if (!inRestrictedBlock && trimmed.includes('salla-mini-checkout-widget')) {
      inRestrictedBlock = true;
      depth = opens - closes;
      return;
    }

    if (!inRestrictedBlock) return;

    const allowedVariable = trimmed.startsWith('--') && ALLOWED_FAST_CHECKOUT_VARS.has(trimmed.split(':')[0]);
    const allowedSyntax = !trimmed
      || trimmed === '}'
      || trimmed === '{'
      || trimmed.startsWith('//')
      || trimmed.startsWith('/*')
      || trimmed.startsWith('*')
      || trimmed.startsWith('@media')
      || allowedVariable;

    if (!allowedSyntax) {
      violations.push({ line: index + 1, text: trimmed });
    }

    depth += opens - closes;
    if (depth <= 0 && closes > 0) {
      inRestrictedBlock = false;
      depth = 0;
    }
  });

  return violations;
}

function validateProductCardContract(themePath, warnings) {
  const productCardFiles = getAllFiles(path.join(themePath, 'src', 'assets', 'js'))
    .filter((file) => path.basename(file).toLowerCase().includes('product-card'));

  for (const file of productCardFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('custom-salla-product-card')) continue;

    const checks = [
      { label: 'عنوان المنتج', pattern: /product\??\.(name|title)|productName/ },
      { label: 'سعر المنتج', pattern: /price|getProductPrice|sale_price|regular_price/ },
      { label: 'صورة المنتج', pattern: /image|thumbnail|<img/i },
      { label: 'زر الإضافة للسلة', pattern: /salla-add-product-button/ },
    ];

    for (const check of checks) {
      if (!check.pattern.test(content)) {
        addWarning(
          warnings,
          path.relative(themePath, file),
          'ProductCard',
          `custom-salla-product-card لا يثبت وجود ${check.label}. راجع عقد عرض المنتجات قبل النشر.`,
          'SALLA_PRODUCT_LISTING_CONTRACT',
        );
      }
    }
  }
}

function validateTheme(themePath, themeName) {
  const issues = [];
  const warnings = [];

  if (!isValidThemeName(themeName)) {
    addIssue(issues, themeName, 'Naming', 'اسم الثيم يجب أن يكون kebab-case ويبدأ بحرف إنجليزي');
  }

  if (!fs.existsSync(themePath)) {
    addIssue(issues, themeName, 'Structure', 'مجلد الثيم غير موجود');
    return { issues, warnings };
  }

  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(themePath, file))) {
      addIssue(issues, file, 'Structure', 'ملف مطلوب مفقود');
    }
  }

  validatePackage(themePath, themeName, issues);
  validateTwilight(themePath, themeName, issues, warnings);
  validateLocales(themePath, issues, warnings);
  validateLayout(themePath, issues, warnings);
  validateWebComponentsUsage(themePath, issues, warnings);
  validateDocumentedSourceRules(themePath, issues, warnings);
  validatePublicThemeSize(themePath, warnings, issues);

  return { issues, warnings };
}

function sanitizeThemeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function formatRuleReference(finding) {
  if (!finding.ruleId || !finding.source) return '';
  const sourceCount = Array.isArray(finding.source.sources) ? finding.source.sources.length : 1;
  const suffix = sourceCount > 1 ? ` +${sourceCount - 1} مصدر` : '';
  return `${finding.ruleId} - ${finding.source.section} (${finding.source.url})${suffix}`;
}

module.exports = {
  ALLOWED_FEATURES,
  DOC_RULES,
  REQUIRED_FILES,
  REQUIRED_PACKAGE_SCRIPTS,
  formatRuleReference,
  getAllowedFeatures,
  isValidThemeName,
  sanitizeThemeName,
  validateTheme,
};
