const fs = require('fs');
const path = require('path');
const { createMockContext, createClientState } = require('./runtime/mock-data');
const { hasFixture } = require('./runtime/fixtures');
const { renderThemePage } = require('./runtime/twig-renderer');

const themesDir = path.join(__dirname, '../themes');
const themeName = process.argv[2] || 'zen-theme';
const args = process.argv.slice(3);
const fixtureArg = args.find((arg) => arg.startsWith('--fixture='));
const fixture = fixtureArg ? fixtureArg.split('=').slice(1).join('=').trim() : (args[0] || process.env.FACTORY_FIXTURE || 'fashion-rich');
const themePath = path.join(themesDir, themeName);

if (!fs.existsSync(themePath)) {
  console.error(`❌ الثيم [${themeName}] غير موجود في مجلد themes/.`);
  process.exit(1);
}

if (!hasFixture(fixture)) {
  console.error(`❌ Fixture غير معروف: ${fixture}`);
  console.error('استخدم: node factory.js fixtures list');
  process.exit(1);
}

const buildRoot = path.join(__dirname, '../build');
const buildDir = path.join(buildRoot, themeName);
const runtimeDir = path.join(buildDir, 'runtime');
const runtimeSource = path.join(__dirname, 'runtime', 'salla-client-runtime.js');
const publicUrl = `../../themes/${themeName}/public`;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRuntime() {
  ensureDir(runtimeDir);
  fs.copyFileSync(runtimeSource, path.join(runtimeDir, 'salla-client-runtime.js'));
}

function writeRootIndex() {
  const target = `${themeName}/index.html`;
  const html = [
    '<!DOCTYPE html>',
    '<html lang="ar" dir="rtl">',
    '<head>',
    '  <meta charset="UTF-8">',
    `  <meta http-equiv="refresh" content="0; url=${target}">`,
    `  <title>${themeName} preview</title>`,
    '</head>',
    `<body><a href="${target}">Open ${themeName} preview</a></body>`,
    '</html>',
  ].join('\n');

  fs.writeFileSync(path.join(buildRoot, 'index.html'), html);
}

function renderPreview() {
  ensureDir(buildDir);
  copyRuntime();

  const context = createMockContext(themeName, themePath, { fixture });
  context.page = {
    slug: 'index',
    title: 'الرئيسية',
  };

  const clientState = {
    ...createClientState(context),
    publicUrl,
  };

  const html = renderThemePage({
    themePath,
    pageView: 'pages/index',
    context,
    publicUrl,
    clientState,
  });

  fs.writeFileSync(path.join(buildDir, 'index.html'), html);
  writeRootIndex();

  console.log(`✅ تم إنتاج معاينة runtime محلية: build/${themeName}/index.html`);
  console.log(`🧪 Fixture: ${context.runtime.fixtureId}`);
}

try {
  console.log(`🏭 Salla Local Runtime Preview | ${themeName}`);
  renderPreview();
} catch (error) {
  console.error('❌ فشل إنتاج المعاينة المحلية.');
  console.error(error.message);
  process.exit(1);
}
