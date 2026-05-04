const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const themeName = process.argv[2] || 'zen-theme';
const args = process.argv.slice(3);
const allPages = args.includes('--all-pages');
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build', themeName);
const reportsDir = path.join(rootDir, 'reports');
const reportJsonPath = path.join(reportsDir, `rtl-${themeName}.json`);
const reportMdPath = path.join(reportsDir, `rtl-${themeName}.md`);

const SAMPLE_FILES = [
  'index.html',
  'products.html',
  'product.html',
  'cart.html',
  'customer/orders/9001.html',
  'offers/summer.html',
  'thank-you.html',
];

const VIEWPORTS = [
  { id: 'desktop', width: 1366, height: 900 },
  { id: 'mobile', width: 390, height: 844 },
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean);

  const fileCandidate = candidates.find((file) => fs.existsSync(file));
  if (fileCandidate) return fileCandidate;

  for (const command of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'msedge']) {
    try {
      return execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).split(/\r?\n/).find(Boolean);
    } catch (error) {
      // Try the next common executable name.
    }
  }

  return null;
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  }[ext] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const target = path.normalize(path.join(rootDir, decodeURIComponent(url.pathname)));

    if (!target.startsWith(rootDir)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const file = fs.existsSync(target) && fs.statSync(target).isDirectory()
      ? path.join(target, 'index.html')
      : target;

    if (!fs.existsSync(file)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'Content-Type': contentType(file) });
    fs.createReadStream(file).pipe(response);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      await wait(150);
    }
  }
  throw new Error(`Chrome DevTools لم يستجب: ${url}`);
}

function urlsMatch(actual, expected) {
  if (actual === expected) return true;
  try {
    if (decodeURI(actual) === expected) return true;
  } catch (error) {
    // Invalid escape sequences should simply fall through to the next check.
  }
  try {
    return actual === encodeURI(expected);
  } catch (error) {
    return false;
  }
}

async function createTarget(port, url) {
  const endpoint = `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`;
  let response = await fetch(endpoint, { method: 'PUT' });
  if (!response.ok) response = await fetch(endpoint);
  if (!response.ok) throw new Error(`فشل إنشاء تبويب Chrome: ${response.status}`);
  return response.json();
}

async function waitForPageReady(page, expectedUrl, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const state = await page.send('Runtime.evaluate', {
        expression: '({ href: location.href, readyState: document.readyState })',
        returnByValue: true,
      });
      const value = state.result?.value || {};
      if (urlsMatch(value.href, expectedUrl) && ['interactive', 'complete'].includes(value.readyState)) {
        return true;
      }
    } catch (error) {
      // The execution context can disappear while Chrome swaps documents.
    }
    await wait(100);
  }
  return false;
}

async function closeTarget(port, targetId) {
  if (!targetId) return;
  try {
    await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`);
  } catch (error) {
    // Best effort; the browser process is killed at the end.
  }
}

function connectCdp(wsUrl, events) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
      return;
    }
    events(message);
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          id += 1;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((resolveCommand, rejectCommand) => {
            pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener('error', () => reject(new Error('تعذر الاتصال بـ Chrome DevTools')));
  });
}

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

function fixtureDirs() {
  if (!fs.existsSync(buildDir)) return [];
  return fs.readdirSync(buildDir)
    .map((entry) => path.join(buildDir, entry))
    .filter((file) => fs.statSync(file).isDirectory());
}

function selectedFiles() {
  if (allPages) return collectHtmlFiles(buildDir);

  const files = [];
  for (const fixtureDir of fixtureDirs()) {
    for (const sample of SAMPLE_FILES) {
      const file = path.join(fixtureDir, sample);
      if (fs.existsSync(file)) files.push(file);
    }
  }
  return [...new Set(files)].sort();
}

function killBrowserProcess(browserProcess) {
  if (!browserProcess || browserProcess.killed) return;

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill.exe', ['/PID', String(browserProcess.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
      return;
    } catch (error) {
      // Fall through to the normal kill path.
    }
  }

  browserProcess.kill();
}

function removeTempDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
  } catch (error) {
    // Best-effort cleanup.
  }
}

async function checkPage(port, serverPort, file, viewport) {
  const relative = path.relative(rootDir, file).replace(/\\/g, '/');
  const url = `http://127.0.0.1:${serverPort}/${relative}`;
  const target = await createTarget(port, 'about:blank');
  const findings = [];

  const page = await connectCdp(target.webSocketDebuggerUrl, (message) => {
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails || {};
      const exception = details.exception || {};
      findings.push(`Runtime exception: ${exception.description || exception.value || details.text || 'unknown'}`);
    }
  });

  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.id === 'mobile',
  });
  await page.send('Page.navigate', { url });
  const ready = await waitForPageReady(page, url);
  if (!ready) findings.push('الصفحة لم تصل للعنوان المطلوب قبل القياس');
  await wait(500);

  const evaluation = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const doc = document.documentElement;
      const body = document.body;
      const docStyle = getComputedStyle(doc);
      const bodyStyle = body ? getComputedStyle(body) : null;
      return {
        htmlDir: doc.getAttribute('dir') || '',
        htmlDirection: docStyle.direction,
        bodyDirection: bodyStyle ? bodyStyle.direction : '',
        clientWidth: doc.clientWidth,
        scrollWidth: Math.max(doc.scrollWidth, body ? body.scrollWidth : 0),
        title: document.title || '',
        textLength: body && body.innerText ? body.innerText.trim().length : 0
      };
    })()`,
    returnByValue: true,
  });

  const value = evaluation.result?.value || {};
  if (value.htmlDir && String(value.htmlDir).toLowerCase() !== 'rtl') {
    findings.push(`html dir يجب أن يكون rtl وليس ${value.htmlDir}`);
  }
  if (value.htmlDirection !== 'rtl') {
    findings.push(`اتجاه html المحسوب ليس rtl: ${value.htmlDirection || '-'}`);
  }
  if (value.bodyDirection && value.bodyDirection !== 'rtl') {
    findings.push(`اتجاه body المحسوب ليس rtl: ${value.bodyDirection}`);
  }
  if (Number(value.scrollWidth || 0) - Number(value.clientWidth || 0) > 4) {
    findings.push(`overflow أفقي: scrollWidth=${value.scrollWidth}, clientWidth=${value.clientWidth}`);
  }
  if (Number(value.textLength || 0) < 20) {
    findings.push('الصفحة لا تحتوي محتوى نصي كافياً بعد التحميل');
  }

  page.close();
  await closeTarget(port, target.id);

  return {
    file: relative,
    viewport: viewport.id,
    metrics: value,
    findings,
  };
}

function writeReport(result) {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(result, null, 2)}\n`);

  const lines = [
    '# تقرير RTL المحلي',
    '',
    `- **الثيم:** ${result.theme}`,
    `- **التاريخ:** ${new Date(result.checked_at).toLocaleString('ar-SA')}`,
    `- **الصفحات المفحوصة:** ${result.pages_checked}`,
    `- **الفحوصات:** ${result.results.length}`,
    `- **المشاكل:** ${result.issues.length}`,
    '',
    '## المشاكل',
    '',
    ...(result.issues.length ? result.issues.map((item) => `- ${item.file} [${item.viewport}]: ${item.detail}`) : ['- لا توجد']),
    '',
  ];

  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`);
}

async function main() {
  const chrome = findChrome();
  if (!chrome) throw new Error('لم يتم العثور على Chrome/Edge. عيّن CHROME_PATH لتفعيل فحص RTL.');

  const files = selectedFiles();
  if (!files.length) throw new Error(`لا توجد صفحات HTML لفحص RTL في build/${themeName}. شغل preview أولاً.`);

  const server = await startServer();
  const serverPort = server.address().port;
  const debugPort = 9800 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `salla-rtl-gate-${themeName}-`));
  const chromeProcess = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${debugPort}`,
    'about:blank',
  ], { stdio: 'ignore' });

  const result = {
    schema: 'salla-theme-factory/rtl-gate@1',
    theme: themeName,
    checked_at: new Date().toISOString(),
    mode: allPages ? 'all-pages' : 'sampled-pages',
    pages_checked: files.length,
    viewports: VIEWPORTS.map((viewport) => viewport.id),
    results: [],
    issues: [],
  };

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`, 20000);
    for (const file of files) {
      for (const viewport of VIEWPORTS) {
        const pageResult = await checkPage(debugPort, serverPort, file, viewport);
        result.results.push(pageResult);
        for (const detail of pageResult.findings) {
          result.issues.push({ file: pageResult.file, viewport: pageResult.viewport, detail });
        }
      }
    }
  } finally {
    killBrowserProcess(chromeProcess);
    server.close();
    removeTempDir(userDataDir);
  }

  writeReport(result);

  console.log(`\n↔️ RTL Gate | ${themeName}`);
  console.log('----------------------------------------');
  console.log(`Mode: ${result.mode}`);
  console.log(`Pages: ${result.pages_checked}`);
  console.log(`Checks: ${result.results.length}`);
  console.log(`Issues: ${result.issues.length}`);
  for (const issue of result.issues) console.log(`❌ ${issue.file} [${issue.viewport}]: ${issue.detail}`);
  console.log(`Report: ${path.relative(process.cwd(), reportMdPath)}`);

  if (result.issues.length) {
    console.log('\n❌ RTL gate failed.');
    process.exit(1);
  }

  console.log('\n✅ RTL gate passed.');
}

main().catch((error) => {
  console.error('❌ فشل فحص RTL.');
  console.error(error.message);
  process.exit(1);
});
