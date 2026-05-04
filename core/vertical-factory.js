const fs = require('fs');
const path = require('path');
const {
  getVertical,
  listVerticals,
  normalizeVerticalId,
  requiredVerticalsFromSpecs,
  validateThemeVertical,
  validateVertical,
} = require('./vertical-registry');

const command = process.argv[2] || 'list';
const verticalId = process.argv[3] || 'luxury-fragrance';
const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');

function printList() {
  console.log('\n🧭 Store Verticals');
  console.log('-------------------');
  for (const vertical of listVerticals()) {
    console.log(`- ${vertical.id}: ${vertical.title}`);
    console.log(`  fixture=${vertical.fixture}`);
    console.log(`  benchmark=${vertical.benchmark}`);
  }
}

function printShow(id) {
  const vertical = getVertical(id);
  if (!vertical) {
    console.error(`❌ Vertical غير معروف: ${id}`);
    process.exitCode = 1;
    return;
  }

  const validation = validateVertical(id);
  console.log(`\n🧭 Vertical | ${vertical.id}`);
  console.log('-------------------');
  console.log(`Title: ${vertical.title}`);
  console.log(`Fixture: ${vertical.fixture}`);
  console.log(`Benchmark: ${vertical.benchmark.name}`);
  console.log(`Source: ${vertical.benchmark.url}`);
  console.log(`Observed: ${vertical.benchmark.observedAt}`);
  console.log('\nRequired signals:');
  for (const signal of vertical.requiredSignals) console.log(`- ${signal}`);
  console.log(`\nIssues: ${validation.issues.length}`);
  console.log(`Warnings: ${validation.warnings.length}`);
  for (const issue of validation.issues) console.log(`❌ ${issue}`);
  for (const warning of validation.warnings) console.log(`⚠️ ${warning}`);
}

function printGate(id) {
  const selected = id ? [id] : listVerticals().map((vertical) => vertical.id);
  let failed = false;

  console.log(`\n🧭 Vertical Gate${id ? ` | ${id}` : ''}`);
  console.log('-------------------');

  for (const currentId of selected) {
    const validation = validateVertical(currentId);
    const vertical = validation.vertical || { id: currentId };
    console.log(`\n${vertical.id}`);
    console.log(`  Issues: ${validation.issues.length}`);
    console.log(`  Warnings: ${validation.warnings.length}`);
    for (const issue of validation.issues) console.log(`  ❌ ${issue}`);
    for (const warning of validation.warnings) console.log(`  ⚠️ ${warning}`);
    if (validation.issues.length) failed = true;
  }

  if (failed) {
    console.log('\n❌ Vertical gate failed.');
    process.exitCode = 1;
    return;
  }

  console.log('\n✅ Vertical gate passed.');
}

function printThemeGate(themeName, id) {
  const requiredSpecs = id ? null : requiredVerticalsFromSpecs(themeName);
  const selected = id
    ? [{ verticalId: normalizeVerticalId(id), fixture: '', key: id, config: {} }]
    : requiredSpecs.required;
  let failed = false;

  console.log(`\n🧭 Vertical Theme Gate | ${themeName || '-'}`);
  console.log('-------------------');
  if (requiredSpecs?.specsPath) {
    console.log(`Specs: ${path.relative(rootDir, requiredSpecs.specsPath)}${requiredSpecs.specsExists ? '' : ' (not found)'}`);
  }
  console.log(`${id ? 'Selected verticals' : 'Required by specs'}: ${selected.length ? selected.map((item) => item.verticalId).join(', ') : '-'}`);

  const themePath = path.join(themesDir, themeName || '');
  if (!themeName || !fs.existsSync(themePath)) {
    console.log(`❌ الثيم غير موجود لفحص vertical: ${themeName || '-'}`);
    process.exitCode = 1;
    return;
  }

  for (const specIssue of requiredSpecs?.issues || []) {
    console.log(`❌ ${specIssue}`);
    failed = true;
  }

  if (!selected.length && !failed) {
    console.log('\nلا توجد verticals مطلوبة في specs لهذا الثيم.');
  }

  for (const item of selected) {
    const currentId = item.verticalId;
    const validation = validateThemeVertical(themeName, currentId, {
      fixture: item.fixture,
    });
    const vertical = validation.vertical || { id: currentId };
    console.log(`\n${vertical.id}`);
    console.log(`  Required experiences: ${(vertical.requiredExperiences || []).join(', ') || '-'}`);
    console.log(`  Installed experiences: ${validation.installedExperiences.map((item) => item.experienceId).join(', ') || '-'}`);
    console.log(`  Issues: ${validation.issues.length}`);
    console.log(`  Warnings: ${validation.warnings.length}`);
    for (const issue of validation.issues) console.log(`  ❌ ${issue}`);
    for (const warning of validation.warnings) console.log(`  ⚠️ ${warning}`);
    if (validation.issues.length) failed = true;
  }

  if (failed) {
    console.log('\n❌ Vertical theme gate failed.');
    process.exitCode = 1;
    return;
  }

  console.log('\n✅ Vertical theme gate passed.');
}

switch (command) {
  case 'list':
    printList();
    break;

  case 'show':
    printShow(verticalId);
    break;

  case 'gate':
    printGate(process.argv[3]);
    break;

  case 'theme-gate':
    printThemeGate(process.argv[3], process.argv[4]);
    break;

  default:
    console.log('Available vertical commands:');
    console.log('  node factory.js vertical list');
    console.log('  node factory.js vertical show <vertical-id>');
    console.log('  node factory.js vertical gate [vertical-id]');
    console.log('  node factory.js vertical theme-gate <theme> [vertical-id]');
    process.exitCode = 1;
}
