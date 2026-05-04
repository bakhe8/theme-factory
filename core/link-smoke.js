const fs = require('fs');
const path = require('path');

const themeName = process.argv[2] || 'zen-theme';
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build', themeName);
const reportsDir = path.join(rootDir, 'reports');
const reportPath = path.join(reportsDir, `link-smoke-${themeName}.json`);

function collectHtmlFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) collectHtmlFiles(fullPath, files);
    else if (entry.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

function isIgnoredHref(href) {
  if (!href) return true;
  const clean = href.trim();
  return !clean
    || clean === '#'
    || clean === '#/'
    || clean.startsWith('#')
    || /^(https?:|mailto:|tel:|sms:|whatsapp:|data:|javascript:)/i.test(clean);
}

function targetForHref(sourceFile, href) {
  const clean = href
    .split('#')[0]
    .split('?')[0]
    .replace(/\\/g, '/')
    .trim();

  if (!clean) return sourceFile;

  const resolved = path.resolve(path.dirname(sourceFile), decodeURIComponent(clean));
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return path.join(resolved, 'index.html');
  }
  return resolved;
}

function relative(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/');
}

function scanLinks() {
  const htmlFiles = collectHtmlFiles(buildDir);
  if (!htmlFiles.length) {
    throw new Error(`لا توجد ملفات HTML داخل build/${themeName}. شغل preview أولاً.`);
  }

  const checked = [];
  const missing = [];
  const ignored = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const matches = html.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi);

    for (const match of matches) {
      const href = String(match[2] || '').trim();
      if (isIgnoredHref(href)) {
        ignored.push({ file: relative(file), href });
        continue;
      }

      const target = targetForHref(file, href);
      const item = {
        file: relative(file),
        href,
        target: relative(target),
      };
      checked.push(item);

      if (!fs.existsSync(target)) {
        missing.push(item);
      }
    }
  }

  return { theme: themeName, htmlFiles: htmlFiles.map(relative), checked, ignored, missing };
}

function uniqueLinks(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.href}=>${item.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

try {
  const result = scanLinks();
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);

  const missingUnique = uniqueLinks(result.missing);

  console.log(`\n🔗 Link Smoke | ${themeName}`);
  console.log('-----------------------------');
  console.log(`HTML files: ${result.htmlFiles.length}`);
  console.log(`Checked internal links: ${result.checked.length}`);
  console.log(`Ignored external/anchor links: ${result.ignored.length}`);
  console.log(`Missing links: ${result.missing.length}`);

  for (const item of missingUnique.slice(0, 40)) {
    console.log(`❌ ${item.file}: ${item.href} -> ${item.target}`);
  }

  if (missingUnique.length > 40) {
    console.log(`... و ${missingUnique.length - 40} روابط مكسورة إضافية`);
  }

  console.log(`📄 التقرير: ${path.relative(process.cwd(), reportPath)}`);

  if (result.missing.length) {
    console.log('\n❌ Link smoke failed.');
    process.exit(1);
  }

  console.log('\n✅ Link smoke passed.');
} catch (error) {
  console.error('❌ فشل فحص الروابط.');
  console.error(error.message);
  process.exit(1);
}
