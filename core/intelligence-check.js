const fs = require('fs');
const path = require('path');
const { compileDocs } = require('./docs-intelligence/compile');
const { printCheck } = require('./docs-intelligence/check');
const { printDocsGate } = require('./docs-intelligence/guard');
const { syncDocs } = require('./docs-intelligence/sync');
const { generatedDir, rootDir } = require('./docs-intelligence/salla-docs-config');
const { readJson } = require('./docs-intelligence/utils');

const command = process.argv[2] || 'status';
const args = process.argv.slice(3);

function themes() {
  const themesDir = path.join(rootDir, 'themes');
  if (!fs.existsSync(themesDir)) return [];
  return fs.readdirSync(themesDir)
    .filter((theme) => fs.statSync(path.join(themesDir, theme)).isDirectory());
}

function printStatus() {
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

  console.log('\n🧠 Salla Docs Intelligence Status');
  console.log('-----------------------------------------');

  if (!manifest) {
    console.log('No local docs memory yet.');
    console.log('Run: node factory.js docs sync');
    return;
  }

  const criticalDocs = (manifest.docs || []).filter((doc) => Array.isArray(doc.tags) && doc.tags.includes('critical'));
  const criticalOk = criticalDocs.filter((doc) => doc.status === 'ok').length;

  console.log(`Synced at: ${manifest.syncedAt}`);
  console.log(`Docs: ${(manifest.docs || []).filter((doc) => doc.status === 'ok').length}/${(manifest.docs || []).length}`);
  console.log(`Critical docs: ${criticalOk}/${criticalDocs.length}`);
  console.log(`Generated rules: ${rules.length}`);
  console.log(`Known components: ${components.length}`);
  console.log(`Official template components: ${officialTemplateComponents.length}`);
  console.log(`Raed theme contract: ${raedThemeContract ? 'yes' : 'no'}`);
  console.log(`Page contracts: ${pageContracts.length}`);
  console.log(`Template components: ${templateComponents.length}`);
  console.log(`Component catalog: ${componentCatalog ? `${componentCatalog.categories?.length || 0} categories` : 'no'}`);
  console.log(`Components customization contract: ${componentsCustomizationContract ? 'yes' : 'no'}`);
  console.log(`Web components usage contract: ${webComponentsUsageContract ? 'yes' : 'no'}`);
  console.log(`Twilight json contract: ${twilightJsonContract ? 'yes' : 'no'}`);
  console.log(`Twig helpers/filters: ${(twigContracts.helpers || []).length}/${(twigContracts.filters || []).length}`);
  console.log(`Drift added/changed/removed: ${manifest.drift?.added?.length || 0}/${manifest.drift?.changed?.length || 0}/${manifest.drift?.removed?.length || 0}`);
}

async function main() {
  switch (command) {
    case 'sync':
      await syncDocs(args);
      compileDocs();
      break;

    case 'compile':
      compileDocs();
      break;

    case 'check': {
      const themeName = args[0];
      if (themeName) {
        printCheck(themeName);
      } else {
        for (const theme of themes()) printCheck(theme);
      }
      break;
    }

    case 'gate': {
      const filtered = args.filter((arg) => !arg.startsWith('--'));
      const themeName = filtered[0];
      const maxAgeArg = args.find((arg) => arg.startsWith('--max-age-days='));
      const result = printDocsGate(themeName, {
        strict: args.includes('--strict'),
        maxAgeDays: maxAgeArg ? maxAgeArg.split('=')[1] : undefined,
      });
      if (result.issues.length) process.exitCode = 1;
      break;
    }

    case 'status':
      printStatus();
      break;

    default:
      console.log('Available docs intelligence commands:');
      console.log('  node factory.js docs sync [--seeds-only] [--max=120] - Fetch Salla docs and compile local policy memory');
      console.log('  node factory.js docs compile                         - Recompile generated JSON from cached docs');
      console.log('  node factory.js docs check [theme]                   - Check theme usage against local docs memory');
      console.log('  node factory.js docs gate [theme] [--strict]         - Enforce docs memory freshness and critical coverage');
      console.log('  node factory.js docs status                          - Show local docs memory status');
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`❌ Docs intelligence failed: ${error.message}`);
  process.exit(1);
});
