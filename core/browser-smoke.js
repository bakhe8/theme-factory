const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const themeName = process.argv[2] || 'zen-theme';
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build', themeName);
const reportsDir = path.join(rootDir, 'reports', 'browser-smoke', themeName);

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
      // Keep trying the next common browser command.
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    // Chrome may keep Crashpad files locked briefly on Windows. The smoke result
    // should not fail because best-effort cleanup raced the browser shutdown.
  }
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
      // Navigation briefly destroys the execution context; retry until stable.
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
    // Closing the target is best-effort; the browser process is still killed at the end.
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

async function checkPage(port, serverPort, file) {
  const relative = path.relative(rootDir, file).replace(/\\/g, '/');
  const url = `http://127.0.0.1:${serverPort}/${relative}`;
  const target = await createTarget(port, 'about:blank');
  const findings = [];

  const page = await connectCdp(target.webSocketDebuggerUrl, (message) => {
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails || {};
      const exception = details.exception || {};
      const text = exception.description || exception.value || details.text || 'unknown';
      findings.push(`Runtime exception: ${text}`);
    }
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(message.params.type)) {
      const text = (message.params.args || []).map((arg) => arg.value || arg.description || '').join(' ');
      findings.push(`Console ${message.params.type}: ${text}`.trim());
    }
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
      const entry = message.params.entry;
      if (!entry.url || !entry.url.endsWith('/favicon.ico')) {
        findings.push(`Log error: ${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
      }
    }
  });

  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Page.enable');
  await page.send('Page.navigate', { url });
  const ready = await waitForPageReady(page, url);
  if (!ready) findings.push('الصفحة لم تصل للعنوان المطلوب قبل القياس');
  await wait(700);

  const body = await page.send('Runtime.evaluate', {
    expression: 'document.body && document.body.innerText ? document.body.innerText.trim().length : 0',
    returnByValue: true,
  });
  if (!body.result || Number(body.result.value || 0) < 20) {
    findings.push('الصفحة لا تحتوي محتوى نصي كافياً بعد التحميل');
  }

  const screenshot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.mkdirSync(reportsDir, { recursive: true });
  const screenshotName = relative.replace(/[\\/.:]/g, '-').replace(/^build-/, '');
  fs.writeFileSync(path.join(reportsDir, `${screenshotName}.png`), Buffer.from(screenshot.data, 'base64'));

  page.close();
  await closeTarget(port, target.id);
  return { relative, findings };
}

async function main() {
  const chrome = findChrome();
  if (!chrome) throw new Error('لم يتم العثور على Chrome/Edge. عيّن CHROME_PATH لتفعيل فحص المتصفح.');

  const htmlFiles = collectHtmlFiles(buildDir);
  if (!htmlFiles.length) throw new Error(`لا توجد معاينات HTML في build/${themeName}. شغل preview أولاً.`);

  const server = await startServer();
  const serverPort = server.address().port;
  const debugPort = 9300 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `salla-browser-smoke-${themeName}-`));

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

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`, 20000);
    const results = [];
    for (const file of htmlFiles) {
      results.push(await checkPage(debugPort, serverPort, file));
    }

    const failed = results.filter((item) => item.findings.length);
    console.log(`\n🧭 Browser Smoke | ${themeName}`);
    console.log('-----------------------------');
    for (const result of results) {
      console.log(`${result.findings.length ? '❌' : '✅'} ${result.relative}`);
      for (const finding of result.findings) console.log(`   - ${finding}`);
    }

    if (failed.length) {
      process.exitCode = 1;
      console.log('\n❌ Browser smoke failed.');
    } else {
      console.log(`\n✅ Browser smoke passed. Screenshots: ${path.relative(process.cwd(), reportsDir)}`);
    }
  } finally {
    killBrowserProcess(chromeProcess);
    server.close();
    removeTempDir(userDataDir);
  }
}

main().catch((error) => {
  console.error('❌ فشل فحص المتصفح.');
  console.error(error.message);
  process.exit(1);
});
