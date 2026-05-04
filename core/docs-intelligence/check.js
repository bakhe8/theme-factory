const fs = require('fs');
const path = require('path');
const { generatedDir, rootDir } = require('./salla-docs-config');
const { readJson } = require('./utils');

function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.git'].includes(entry)) getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function loadGenerated() {
  const components = readJson(path.join(generatedDir, 'allowed-components.json'), []);
  const officialTemplateComponents = readJson(path.join(generatedDir, 'official-template-components.json'), []);
  const raedThemeContract = readJson(path.join(generatedDir, 'raed-theme-contract.json'), null);
  const rules = readJson(path.join(generatedDir, 'rules.generated.json'), []);
  const pageContracts = readJson(path.join(generatedDir, 'page-contracts.json'), []);
  const templateComponents = readJson(path.join(generatedDir, 'template-components.json'), []);
  const componentCatalog = readJson(path.join(generatedDir, 'component-catalog.json'), null);
  const componentsCustomizationContract = readJson(path.join(generatedDir, 'components-customization-contract.json'), null);
  const webComponentsUsageContract = readJson(path.join(generatedDir, 'web-components-usage-contract.json'), null);
  const twilightJsonContract = readJson(path.join(generatedDir, 'twilight-json-contract.json'), null);
  const manifest = readJson(path.join(generatedDir, 'manifest.json'), null);

  return {
    components,
    officialTemplateComponents,
    raedThemeContract,
    rules,
    pageContracts,
    templateComponents,
    componentCatalog,
    componentsCustomizationContract,
    webComponentsUsageContract,
    twilightJsonContract,
    manifest,
  };
}

function extractSallaTags(content) {
  const tags = new Set();
  const patterns = [
    /<\s*(salla-[a-z0-9-]+)/gi,
    /`(salla-[a-z0-9-]+)`/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) tags.add(match[1]);
  }

  return [...tags];
}

function checkTheme(themeName) {
  const themePath = path.join(rootDir, 'themes', themeName);
  if (!fs.existsSync(themePath)) {
    throw new Error(`Theme not found: ${themeName}`);
  }

  const generated = loadGenerated();
  if (!generated.manifest) {
    throw new Error('Docs intelligence manifest missing. Run: node factory.js docs sync');
  }

  const knownComponents = new Set(generated.components.map((item) => item.component));
  const files = getAllFiles(path.join(themePath, 'src')).filter((file) => /\.(twig|js)$/i.test(file));
  const usedComponents = new Map();
  const warnings = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const tag of extractSallaTags(content)) {
      if (!usedComponents.has(tag)) usedComponents.set(tag, []);
      usedComponents.get(tag).push(path.relative(themePath, file));
    }
  }

  for (const [component, locations] of usedComponents) {
    if (!knownComponents.has(component)) {
      warnings.push({
        type: 'UnknownComponentDoc',
        component,
        detail: `${component} مستخدم في الثيم لكن لم يظهر في ذاكرة الوثائق المجمعة. قد يكون موثقاً خارج العينة أو يحتاج إضافة مصدر.`,
        locations: [...new Set(locations)].slice(0, 5),
      });
    }
  }

  const allowRules = generated.rules.filter((rule) => rule.type === 'allow');
  const denyRules = generated.rules.filter((rule) => rule.type === 'deny');

  return {
    theme: themeName,
    syncedAt: generated.manifest.syncedAt,
    knownComponents: knownComponents.size,
    usedComponents: usedComponents.size,
    allowRules: allowRules.length,
    denyRules: denyRules.length,
    officialTemplateComponents: generated.officialTemplateComponents.length,
    raedThemeContract: Boolean(generated.raedThemeContract),
    pageContracts: generated.pageContracts.length,
    templateComponents: generated.templateComponents.length,
    componentCatalog: Boolean(generated.componentCatalog),
    componentsCustomizationContract: Boolean(generated.componentsCustomizationContract),
    webComponentsUsageContract: Boolean(generated.webComponentsUsageContract),
    twilightJsonContract: Boolean(generated.twilightJsonContract),
    warnings,
  };
}

function printCheck(themeName) {
  const result = checkTheme(themeName);

  console.log(`\n🧠 Salla Docs Intelligence Check | ${themeName}`);
  console.log('-----------------------------------------');
  console.log(`Docs synced at: ${result.syncedAt}`);
  console.log(`Known components: ${result.knownComponents}`);
  console.log(`Used components: ${result.usedComponents}`);
  console.log(`Official template components: ${result.officialTemplateComponents}`);
  console.log(`Raed theme contract: ${result.raedThemeContract ? 'yes' : 'no'}`);
  console.log(`Generated allow rules: ${result.allowRules}`);
  console.log(`Generated deny rules: ${result.denyRules}`);
  console.log(`Page contracts: ${result.pageContracts}`);
  console.log(`Template components: ${result.templateComponents}`);
  console.log(`Component catalog: ${result.componentCatalog ? 'yes' : 'no'}`);
  console.log(`Components customization contract: ${result.componentsCustomizationContract ? 'yes' : 'no'}`);
  console.log(`Web components usage contract: ${result.webComponentsUsageContract ? 'yes' : 'no'}`);
  console.log(`Twilight json contract: ${result.twilightJsonContract ? 'yes' : 'no'}`);

  if (result.warnings.length) {
    console.log(`\n⚠️ Warnings: ${result.warnings.length}`);
    for (const warning of result.warnings) {
      console.log(`- [${warning.type}] ${warning.detail}`);
      for (const location of warning.locations) {
        console.log(`  ↳ ${location}`);
      }
    }
  } else {
    console.log('\n✅ كل مكونات سلة المستخدمة موجودة في ذاكرة الوثائق الحالية.');
  }

  return result;
}

module.exports = {
  checkTheme,
  printCheck,
};
