const fs = require('fs');
const path = require('path');
const { getIntegration, listIntegrations, normalizeIntegrationId } = require('./integration-registry');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');

const HELP = `
Usage:
  node factory.js integration list
  node factory.js integration show <integration-id>
  node factory.js integration gate <theme> [--specs=path]

Examples:
  node factory.js integration list
  node factory.js integration show image-search-addon
  node factory.js integration gate luxury-fragrance
`;

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function specsPathFor(themeName, args = []) {
  const explicit = args.find((arg) => arg.startsWith('--specs='));
  if (explicit) return path.resolve(explicit.slice('--specs='.length));
  return path.join(rootDir, 'specs', `${themeName}.specs.json`);
}

function isHttpUrl(value) {
  return /^https?:\/\/[^\s]+$/i.test(String(value || ''));
}

function activeIntegrationSpecs(specs) {
  const items = [];
  for (const [key, config] of Object.entries(specs.integrations || {})) {
    if (!config || config.required !== true) continue;
    const id = normalizeIntegrationId(config.id || key);
    items.push({ id, key, config });
  }
  return items;
}

function validateIntegrationSpec(themeName, item, result) {
  const integration = getIntegration(item.id);
  if (!integration) {
    result.issues.push(`تكامل غير معروف في المواصفات: ${item.key}`);
    return;
  }

  const config = item.config || {};
  for (const field of integration.requiredEvidenceFields || []) {
    if (!config[field]) {
      result.issues.push(`${integration.id}: الحقل ${field} مطلوب لإثبات التكامل`);
    }
  }

  if (config.source_url && !isHttpUrl(config.source_url)) {
    result.issues.push(`${integration.id}: source_url يجب أن يكون رابطاً واضحاً لمصدر رسمي أو عقد الإضافة`);
  }

  if (config.placement && !(integration.allowedPlacements || []).includes(config.placement)) {
    result.issues.push(`${integration.id}: placement غير معروف: ${config.placement}. المسموح: ${(integration.allowedPlacements || []).join(', ')}`);
  }

  if (config.implementation && !['external-addon', 'theme-placeholder'].includes(config.implementation)) {
    result.issues.push(`${integration.id}: implementation يجب أن يكون external-addon أو theme-placeholder`);
  }

  if ((config.implementation || 'external-addon') === 'theme-placeholder') {
    const themePath = path.join(themesDir, themeName);
    const header = path.join(themePath, 'src', 'views', 'components', 'header', 'header.twig');
    const productIndex = path.join(themePath, 'src', 'views', 'pages', 'product', 'index.twig');
    const content = [header, productIndex]
      .filter((file) => fs.existsSync(file))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');

    if (!content.includes('data-integration="image-search-addon"')) {
      result.issues.push(`${integration.id}: implementation=theme-placeholder يتطلب marker داخل الثيم: data-integration="image-search-addon"`);
    }
  }

  result.active.push({
    id: integration.id,
    placement: config.placement || '-',
    handled_by: config.handled_by || '-',
    source_url: config.source_url || '-',
  });
}

function validateThemeIntegrations(themeName, args = []) {
  const result = {
    theme: themeName,
    specsPath: specsPathFor(themeName, args),
    active: [],
    issues: [],
    warnings: [],
  };

  const themePath = path.join(themesDir, themeName || '');
  if (!themeName || !fs.existsSync(themePath)) {
    result.issues.push(`الثيم غير موجود: ${themeName || '-'}`);
    return result;
  }

  const specs = readJson(result.specsPath, {});
  if (!specs) {
    result.issues.push(`ملف المواصفات غير صالح: ${result.specsPath}`);
    return result;
  }

  const active = activeIntegrationSpecs(specs);
  for (const item of active) validateIntegrationSpec(themeName, item, result);

  return result;
}

function printList() {
  console.log('\n🧭 Integration Registry');
  console.log('-----------------------');
  for (const integration of listIntegrations()) {
    console.log(`- ${integration.id} [${integration.status}] ${integration.title?.ar || integration.title?.en || ''}`);
    console.log(`  ${integration.intent}`);
  }
}

function printShow(id) {
  const integration = getIntegration(id);
  if (!integration) {
    console.error(`❌ Integration غير معروف: ${id}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n🔌 ${integration.id}`);
  console.log('----------------------');
  console.log(`Status: ${integration.status}`);
  console.log(`Type: ${integration.type}`);
  console.log(`Title: ${integration.title?.ar || '-'} / ${integration.title?.en || '-'}`);
  console.log(`Intent: ${integration.intent}`);
  console.log(`Allowed placements: ${(integration.allowedPlacements || []).join(', ') || '-'}`);
  console.log(`Required evidence: ${(integration.requiredEvidenceFields || []).join(', ') || '-'}`);

  if (integration.forbiddenThemeBehavior?.length) {
    console.log('\nForbidden theme behavior:');
    for (const item of integration.forbiddenThemeBehavior) console.log(`- ${item}`);
  }
}

function printGate(themeName, args = []) {
  const result = validateThemeIntegrations(themeName, args);

  console.log(`\n🔌 Integration Gate | ${themeName}`);
  console.log('-----------------------');
  console.log(`Specs: ${path.relative(rootDir, result.specsPath)}`);
  console.log(`Active integrations: ${result.active.length}`);
  for (const item of result.active) {
    console.log(`- ${item.id}: placement=${item.placement}, handled_by=${item.handled_by}`);
    console.log(`  source=${item.source_url}`);
  }
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);

  if (result.issues.length) {
    console.log('\n❌ Integration gate failed.');
    process.exitCode = 1;
    return result;
  }

  console.log('\n✅ Integration gate passed.');
  return result;
}

function main() {
  const [command = 'list', first, ...rest] = process.argv.slice(2);

  if (['help', '-h', '--help'].includes(command)) {
    console.log(HELP.trim());
    return;
  }

  if (command === 'list') {
    printList();
    return;
  }

  if (command === 'show') {
    printShow(first);
    return;
  }

  if (command === 'gate') {
    if (!first) throw new Error('Usage: node factory.js integration gate <theme> [--specs=path]');
    printGate(first, rest);
    return;
  }

  console.log(HELP.trim());
  process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\n❌ Integration factory failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  validateThemeIntegrations,
};
