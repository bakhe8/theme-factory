const path = require('path');
const { checkTheme } = require('./check');
const { generatedDir } = require('./salla-docs-config');
const { readJson } = require('./utils');

const DEFAULT_MAX_AGE_DAYS = 14;

function ageInDays(value) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return Infinity;
  return (Date.now() - time) / (24 * 60 * 60 * 1000);
}

function optionNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function validateDocsGate(themeName, options = {}) {
  const strict = Boolean(options.strict || process.env.FACTORY_STRICT_DOCS === '1');
  const maxAgeDays = optionNumber(
    options.maxAgeDays || process.env.FACTORY_DOCS_MAX_AGE_DAYS,
    DEFAULT_MAX_AGE_DAYS,
  );

  const manifest = readJson(path.join(generatedDir, 'manifest.json'), null);
  const rules = readJson(path.join(generatedDir, 'rules.generated.json'), []);
  const components = readJson(path.join(generatedDir, 'allowed-components.json'), []);
  const officialTemplateComponents = readJson(path.join(generatedDir, 'official-template-components.json'), []);
  const raedThemeContract = readJson(path.join(generatedDir, 'raed-theme-contract.json'), null);
  const pageContracts = readJson(path.join(generatedDir, 'page-contracts.json'), []);
  const templateComponents = readJson(path.join(generatedDir, 'template-components.json'), []);
  const componentCatalog = readJson(path.join(generatedDir, 'component-catalog.json'), null);
  const componentsCustomizationContract = readJson(path.join(generatedDir, 'components-customization-contract.json'), null);
  const webComponentsUsageContract = readJson(path.join(generatedDir, 'web-components-usage-contract.json'), null);
  const twilightJsonContract = readJson(path.join(generatedDir, 'twilight-json-contract.json'), null);
  const twigContracts = readJson(path.join(generatedDir, 'twig-contracts.json'), {});

  const issues = [];
  const warnings = [];
  let themeCheck = null;

  if (!manifest) {
    issues.push('ذاكرة وثائق سلة غير موجودة. شغل: node factory.js docs sync --max=180');
    return { issues, warnings, manifest, rules, components, officialTemplateComponents, raedThemeContract, pageContracts, templateComponents, componentCatalog, componentsCustomizationContract, webComponentsUsageContract, twilightJsonContract, twigContracts, themeCheck, strict, maxAgeDays };
  }

  const docs = manifest.docs || [];
  const failedDocs = docs.filter((doc) => doc.status !== 'ok');
  const officialSources = manifest.officialSources || [];
  const failedOfficialSources = officialSources.filter((item) => item.status !== 'ok');
  const criticalDocs = docs.filter((doc) => Array.isArray(doc.tags) && doc.tags.includes('critical'));
  const failedCriticalDocs = criticalDocs.filter((doc) => doc.status !== 'ok');
  const syncedAge = ageInDays(manifest.syncedAt);

  if (failedDocs.length) {
    warnings.push(`هناك ${failedDocs.length} وثيقة لم تتم مزامنتها بنجاح.`);
  }

  if (failedOfficialSources.length) {
    warnings.push(`هناك ${failedOfficialSources.length} مصدر من قوالب SallaApp/theme-raed لم تتم مزامنته بنجاح.`);
  }

  if (!criticalDocs.length) {
    issues.push('لا توجد وثائق حرجة معرفة في الذاكرة. تأكد من SEED_DOCS.');
  }

  if (failedCriticalDocs.length) {
    for (const doc of failedCriticalDocs) {
      issues.push(`فشل جلب وثيقة حرجة: ${doc.title} (${doc.url})`);
    }
  }

  if (syncedAge > maxAgeDays) {
    issues.push(`ذاكرة وثائق سلة قديمة (${Math.floor(syncedAge)} يوم). شغل: node factory.js docs sync --max=180`);
  }

  if (!Array.isArray(rules) || rules.length === 0) {
    issues.push('لم يتم توليد قواعد من وثائق سلة. شغل: node factory.js docs compile');
  }

  if (!Array.isArray(components) || components.length === 0) {
    issues.push('لم يتم توليد قائمة مكونات سلة. شغل: node factory.js docs compile');
  }

  const raedReadmeSource = officialSources.find((item) => (item.tags || []).includes('readme'));
  if (raedReadmeSource && !raedThemeContract) {
    issues.push('README الرسمي لثيم Raed موجود، لكن لم يتم توليد عقد raed-theme-contract منه.');
  }

  if (!Array.isArray(pageContracts) || pageContracts.length === 0) {
    warnings.push('لم يتم توليد عقود صفحات من وثائق سلة.');
  }

  const templateComponentDocs = docs.filter((doc) => Array.isArray(doc.tags) && doc.tags.includes('template-component'));
  if (templateComponentDocs.length && (!Array.isArray(templateComponents) || templateComponents.length === 0)) {
    issues.push('توجد وثائق لمكونات Twig، لكن لم يتم توليد عقود template-components منها.');
  }

  const twilightJsonDoc = docs.find((doc) => doc.id === 'twilight-json');
  if (twilightJsonDoc && !twilightJsonContract) {
    issues.push('وثيقة twilight.json موجودة، لكن لم يتم توليد عقد twilight-json-contract منها.');
  }

  const componentCatalogDoc = docs.find((doc) => doc.id === 'theme-components-overview');
  if (componentCatalogDoc && !componentCatalog) {
    issues.push('وثيقة Components Overview موجودة، لكن لم يتم توليد عقد component-catalog منها.');
  }

  const componentsCustomizationDoc = docs.find((doc) => doc.id === 'web-components-customization');
  if (componentsCustomizationDoc && !componentsCustomizationContract) {
    issues.push('وثيقة Components Customization موجودة، لكن لم يتم توليد عقد components-customization-contract منها.');
  }

  const webComponentsUsageDoc = docs.find((doc) => doc.id === 'twilight-web-components-usage');
  if (webComponentsUsageDoc && !webComponentsUsageContract) {
    issues.push('وثيقة Twilight Web Components Usage موجودة، لكن لم يتم توليد عقد web-components-usage-contract منها.');
  }

  const twilightTwigDoc = docs.find((doc) => doc.id === 'twilight-flavoured-twig');
  if (twilightTwigDoc && (!(twigContracts.helpers || []).length || !(twigContracts.filters || []).length)) {
    issues.push('وثيقة Twilight flavoured twig موجودة، لكن لم يتم توليد عقد helpers/filters منها.');
  }

  if (themeName && issues.length === 0) {
    themeCheck = checkTheme(themeName);
    if (themeCheck.warnings.length) {
      const message = `الثيم يستخدم ${themeCheck.warnings.length} مكون/نمط غير مثبت في ذاكرة وثائق سلة.`;
      if (strict) issues.push(message);
      else warnings.push(`${message} استخدم --strict لجعلها مانعة.`);
    }
  }

  return { issues, warnings, manifest, rules, components, officialTemplateComponents, raedThemeContract, pageContracts, templateComponents, componentCatalog, componentsCustomizationContract, webComponentsUsageContract, twilightJsonContract, twigContracts, themeCheck, strict, maxAgeDays };
}

function printDocsGate(themeName, options = {}) {
  const result = validateDocsGate(themeName, options);
  const docs = result.manifest?.docs || [];
  const criticalDocs = docs.filter((doc) => Array.isArray(doc.tags) && doc.tags.includes('critical'));
  const criticalOk = criticalDocs.filter((doc) => doc.status === 'ok').length;

  console.log(`\n🧠 Salla Docs Gate${themeName ? ` | ${themeName}` : ''}`);
  console.log('-----------------------------------------');

  if (result.manifest) {
    console.log(`Docs synced at: ${result.manifest.syncedAt}`);
    console.log(`Docs freshness limit: ${result.maxAgeDays} days`);
    console.log(`Critical docs: ${criticalOk}/${criticalDocs.length}`);
    console.log(`Generated rules: ${result.rules.length}`);
    console.log(`Known components: ${result.components.length}`);
    console.log(`Official template sources: ${(result.manifest.officialSources || []).filter((item) => item.status === 'ok').length}/${(result.manifest.officialSources || []).length}`);
    console.log(`Official template components: ${result.officialTemplateComponents.length}`);
    console.log(`Raed theme contract: ${result.raedThemeContract ? 'yes' : 'no'}`);
    console.log(`Page contracts: ${result.pageContracts.length}`);
    console.log(`Template components: ${result.templateComponents.length}`);
    console.log(`Component catalog: ${result.componentCatalog ? `${result.componentCatalog.categories?.length || 0} categories` : 'no'}`);
    console.log(`Components customization contract: ${result.componentsCustomizationContract ? 'yes' : 'no'}`);
    console.log(`Web components usage contract: ${result.webComponentsUsageContract ? 'yes' : 'no'}`);
    console.log(`Twilight json contract: ${result.twilightJsonContract ? 'yes' : 'no'}`);
    console.log(`Twig helpers/filters: ${(result.twigContracts.helpers || []).length}/${(result.twigContracts.filters || []).length}`);
  }

  if (result.themeCheck) {
    console.log(`Theme used components: ${result.themeCheck.usedComponents}`);
    console.log(`Theme coverage warnings: ${result.themeCheck.warnings.length}`);
  }

  for (const warning of result.warnings) {
    console.log(`⚠️ ${warning}`);
  }

  for (const issue of result.issues) {
    console.log(`❌ ${issue}`);
  }

  if (result.issues.length) {
    console.log('\n❌ Docs gate failed.');
    return result;
  }

  console.log('\n✅ Docs gate passed.');
  return result;
}

module.exports = {
  printDocsGate,
  validateDocsGate,
};
