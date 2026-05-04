const fs = require('fs');
const path = require('path');
const { createMockContext, createClientState } = require('./runtime/mock-data');
const { renderThemePage } = require('./runtime/twig-renderer');
const {
  isPreviewInternalUrl,
  normalizePreviewFile,
  pageScenarios,
  fixtureScenarios,
  validateRequestedFixture,
} = require('./page-registry');

const themesDir = path.join(__dirname, '../themes');
const themeName = process.argv[2] || 'zen-theme';
const args = process.argv.slice(3);
const fixtureArg = args.find((arg) => arg.startsWith('--fixture='));
const pageArg = args.find((arg) => arg.startsWith('--page='));
const allPages = args.includes('--all-pages');
const allFixtures = args.includes('--all-fixtures');
const fixture = fixtureArg ? fixtureArg.split('=').slice(1).join('=').trim() : (args.find((arg) => !arg.startsWith('--')) || process.env.FACTORY_FIXTURE || 'fashion-rich');
const requestedPage = pageArg ? pageArg.split('=').slice(1).join('=').trim() : 'home';
const themePath = path.join(themesDir, themeName);

if (!fs.existsSync(themePath)) {
  console.error(`❌ الثيم [${themeName}] غير موجود في مجلد themes/.`);
  process.exit(1);
}

if (!validateRequestedFixture(fixture, allFixtures, themePath)) {
  console.error(`❌ Fixture غير معروف: ${fixture}`);
  console.error('استخدم: node factory.js fixtures list');
  process.exit(1);
}

if (!allPages && !pageScenarios(createMockContext(themeName, themePath, { fixture }), { requestedPage }).length) {
  console.error(`❌ Page scenario غير معروف: ${requestedPage}`);
  const known = pageScenarios(createMockContext(themeName, themePath, { fixture }), { allPages: true }).map((page) => page.id);
  console.error(`استخدم واحداً من: ${known.join(', ')}`);
  process.exit(1);
}

const buildRoot = path.join(__dirname, '../build');
const buildDir = path.join(buildRoot, themeName);
const runtimeSource = path.join(__dirname, 'runtime', 'salla-client-runtime.js');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRuntime(targetDir) {
  const runtimeDir = path.join(targetDir, 'runtime');
  ensureDir(runtimeDir);
  fs.copyFileSync(runtimeSource, path.join(runtimeDir, 'salla-client-runtime.js'));
}

function writeRootIndex(target = `${themeName}/index.html`) {
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

function splitUrl(url) {
  const value = String(url || '');
  const hashIndex = value.indexOf('#');
  const queryIndex = value.indexOf('?');
  const indexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  const suffixIndex = indexes.length ? Math.min(...indexes) : value.length;
  return {
    pathPart: value.slice(0, suffixIndex),
    suffix: value.slice(suffixIndex),
  };
}

function relativeInternalUrl(url, pageFile) {
  if (!isPreviewInternalUrl(url)) return url;
  const { pathPart, suffix } = splitUrl(url);
  const target = normalizePreviewFile(pathPart, pathPart);
  const pageDir = path.posix.dirname(pageFile.replace(/\\/g, '/'));
  const fromDir = pageDir === '.' ? '' : pageDir;
  const relative = path.posix.relative(fromDir, target).replace(/\\/g, '/') || path.posix.basename(target);
  return `${relative}${suffix}`;
}

function isUrlKey(key) {
  return /(^url$|_url$|Url$|href$)/.test(String(key));
}

function relinkContextUrls(value, pageFile, key = '') {
  if (typeof value === 'string') {
    return isUrlKey(key) ? relativeInternalUrl(value, pageFile) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => relinkContextUrls(item, pageFile));
  }
  if (value && typeof value === 'object') {
    const copy = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      copy[childKey] = relinkContextUrls(childValue, pageFile, childKey);
    }
    return copy;
  }
  return value;
}

function publicUrlForPage(fixtureBuildDir, pageFile) {
  const targetDir = path.dirname(path.join(fixtureBuildDir, pageFile));
  const publicPath = path.join(__dirname, '..', 'themes', themeName, 'public');
  return path.relative(targetDir, publicPath).replace(/\\/g, '/') || '.';
}

function pageContext(baseContext, page) {
  baseContext.page = {
    ...baseContext.page,
    id: page.pageId || null,
    slug: page.slug,
    title: page.title,
  };
  if (typeof page.apply === 'function') {
    page.apply(baseContext);
  }
  return relinkContextUrls(baseContext, page.file);
}

function renderPreview() {
  fs.rmSync(buildDir, { recursive: true, force: true });
  ensureDir(buildDir);
  const rendered = [];

  for (const fixtureId of fixtureScenarios({ allFixtures, fixture, themePath })) {
    const fixtureBuildDir = allFixtures ? path.join(buildDir, fixtureId) : buildDir;
    ensureDir(fixtureBuildDir);
    copyRuntime(fixtureBuildDir);
    const seedContext = createMockContext(themeName, themePath, { fixture: fixtureId });

    for (const page of pageScenarios(seedContext, { allPages, requestedPage })) {
      const context = pageContext(createMockContext(themeName, themePath, { fixture: fixtureId }), page);
      const pagePublicUrl = publicUrlForPage(fixtureBuildDir, page.file);
      const clientState = {
        ...createClientState(context),
        publicUrl: pagePublicUrl,
      };

      const html = renderThemePage({
        themePath,
        pageView: page.view,
        context,
        publicUrl: pagePublicUrl,
        clientState,
        pageFile: page.file,
      });

      const target = path.join(fixtureBuildDir, page.file);
      ensureDir(path.dirname(target));
      fs.writeFileSync(target, html);
      rendered.push(path.relative(buildRoot, target).replace(/\\/g, '/'));
    }
  }

  writeRootIndex(rendered[0] || `${themeName}/index.html`);

  console.log(`✅ تم إنتاج معاينة runtime محلية: ${rendered.length} صفحة`);
  for (const file of rendered) console.log(`   - build/${file}`);
}

try {
  console.log(`🏭 Salla Local Runtime Preview | ${themeName}`);
  renderPreview();
} catch (error) {
  console.error('❌ فشل إنتاج المعاينة المحلية.');
  console.error(error.message);
  process.exit(1);
}
