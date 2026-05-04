const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadThemeSpecs, requiredSpecEntries } = require('./specs-loader');
const { normalizeExperienceId } = require('./experience-registry');
const { normalizePageExperienceId } = require('./page-experience-registry');
const { rootDir, workspacePath } = require('./factory-config');

const themeName = process.argv[2];
const args = process.argv.slice(3);
const skipDeliver = args.includes('--skip-deliver');
const themesDir = workspacePath('themes');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function runNode(label, script, scriptArgs, options = {}) {
  console.log(`\n== ${label} ==`);
  execFileSync(process.execPath, [script, ...scriptArgs], {
    cwd: rootDir,
    stdio: 'inherit',
    timeout: options.timeout || 15 * 60 * 1000,
  });
}

function requiredExperiences(specs) {
  return requiredSpecEntries(specs, 'experiences', normalizeExperienceId).map((item) => ({
    id: item.id,
    slug: item.config?.slug || item.id,
  }));
}

function requiredPageExperiences(specs) {
  return requiredSpecEntries(specs, 'page_experiences', normalizePageExperienceId).map((item) => item.id);
}

if (!themeName) {
  fail('الاستخدام: node factory.js manufacture <theme-name> [--skip-deliver]');
}

const specs = loadThemeSpecs(themeName);
if (!specs.exists || !specs.valid) {
  fail(`يجب أن تبدأ بمدخلات صحيحة: node factory.js intake ${themeName}`);
}

const themePath = path.join(themesDir, themeName);

console.log(`🏭 بدء تصنيع الثيم عبر خط المصنع: ${themeName}`);
console.log(`📋 specs: ${path.relative(rootDir, specs.path)}`);

runNode('Salla docs preflight', path.join(__dirname, 'intelligence-check.js'), ['gate', '--strict']);

if (!fs.existsSync(themePath)) {
  runNode('Create theme from approved source', path.join(__dirname, 'create-theme.js'), [themeName]);
} else {
  console.log('\n== Create theme from approved source ==');
  console.log('الثيم موجود مسبقاً، سيتم استخدامه بعد فحص workflow gate.');
  runNode('Factory workflow gate', path.join(__dirname, 'workflow-gate.js'), ['gate', themeName]);
}

runNode('Apply specs', path.join(__dirname, 'apply-specs.js'), [themeName]);
runNode('Specs contract gate', path.join(__dirname, 'specs-gate.js'), ['gate', themeName]);

for (const experience of requiredExperiences(specs.specs)) {
  runNode(`Install required experience: ${experience.id}`, path.join(__dirname, 'experience-factory.js'), [
    themeName,
    experience.id,
    experience.slug,
    '--force',
  ]);
}

for (const pageExperience of requiredPageExperiences(specs.specs)) {
  runNode(`Install required page experience: ${pageExperience}`, path.join(__dirname, 'page-experience-factory.js'), [
    themeName,
    pageExperience,
    '--force',
  ]);
}

runNode('Innovation fulfillment gate', path.join(__dirname, 'innovation-factory.js'), ['gate', themeName]);

runNode('Local certification', path.join(__dirname, 'certify-theme.js'), [themeName], {
  timeout: 30 * 60 * 1000,
});

if (!skipDeliver) {
  runNode('Create deliverable folder', path.join(__dirname, 'deliver-theme.js'), [themeName, '--skip-certify']);
}

console.log(`\n✅ اكتمل تصنيع الثيم عبر المصنع: ${themeName}`);
