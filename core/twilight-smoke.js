const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const themeName = process.argv[2] || 'zen-theme';
const args = process.argv.slice(3);
const allPages = args.includes('--all-pages');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const offsetArg = args.find((arg) => arg.startsWith('--offset='));
const pageLimit = limitArg ? Number(limitArg.split('=')[1]) : null;
const pageOffset = offsetArg ? Number(offsetArg.split('=')[1]) : 0;
const rootDir = path.join(__dirname, '..');
const themeDir = path.join(rootDir, 'themes', themeName);
const buildDir = path.join(rootDir, 'build', themeName);
const twilightPackageDir = path.join(themeDir, 'node_modules', '@salla.sa', 'twilight-components');
const twilightLoader = path.join(twilightPackageDir, 'loader', 'index.js');
const twilightEsmLoader = path.join(twilightPackageDir, 'dist', 'esm', 'loader.js');
const reportsDir = path.join(rootDir, 'reports');
const reportJsonPath = path.join(reportsDir, `twilight-smoke-${themeName}.json`);
const reportMdPath = path.join(reportsDir, `twilight-smoke-${themeName}.md`);

const SAMPLE_FILES = [
  'index.html',
  'product.html',
  'cart.html',
  'customer/orders/9001.html',
  'offers/summer.html',
  'thank-you.html',
];

const CORE_COMPONENTS = [
  'salla-button',
  'salla-add-product-button',
  'salla-cart-summary',
  'salla-modal',
  'salla-products-list',
  'salla-products-slider',
  'salla-slider',
  'salla-quantity-input',
  'salla-conditional-fields',
  'salla-map',
];

const ALLOWED_THEME_DEFINED_TAGS = new Set([
  'salla-add-product-toast',
]);

const ALLOWED_PLATFORM_OPTIONAL_TAGS = new Set([
  'salla-mini-checkout-widget',
]);

const SOFT_CONSOLE_ERROR_PATTERNS = [
  /Source value cannot be empty/i,
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
    '.mjs': 'application/javascript; charset=utf-8',
    '.cjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
  }[ext] || 'application/octet-stream';
}

function isInside(file, dir) {
  const relative = path.relative(dir, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safeJoin(baseDir, requestPath) {
  const relative = decodeURIComponent(requestPath).replace(/^\/+/, '');
  const target = path.resolve(baseDir, relative);
  return isInside(target, baseDir) ? target : null;
}

function readOfficialComponents() {
  if (!fs.existsSync(twilightEsmLoader)) return [];
  const source = fs.readFileSync(twilightEsmLoader, 'utf8');
  return [...new Set(source.match(/salla-[a-z0-9-]+/g) || [])].sort();
}

function injectTwilightSmoke(html) {
  if (html.includes('data-factory-twilight-smoke')) return html;

  const snippet = [
    '<script data-factory-twilight-smoke>',
    'window.__SALLA_TWILIGHT_EXTERNAL__ = true;',
    'window.__SALLA_TWILIGHT_IMPORT_OK__ = false;',
    'window.__SALLA_TWILIGHT_READY__ = false;',
    'window.__SALLA_TWILIGHT_LOAD_ERROR__ = null;',
    '</script>',
    '<script type="module" data-factory-twilight-smoke>',
    '(async () => {',
    '  try {',
    '    const mergeFactoryConfig = () => {',
    '      const mock = window.__SALLA_MOCK__ || {};',
    '      const absoluteUrl = (value, fallback) => {',
    '        if (typeof value === "string" && /^https?:\\/\\//i.test(value)) return value;',
    '        return fallback;',
    '      };',
    '      const origin = window.location.origin;',
    '      const settings = {',
    '        ...((mock.store && mock.store.settings) || {}),',
    '        payments: ((mock.store && mock.store.settings && mock.store.settings.payments) || ["mada", "visa", "mastercard", "apple_pay", "cod"]),',
    '        made_in_ksa: Boolean(mock.store && mock.store.settings && mock.store.settings.made_in_ksa),',
    '        certificate: ((mock.store && mock.store.settings && mock.store.settings.certificate) || { id: "" }),',
    '        commercial_number: ((mock.store && mock.store.settings && mock.store.settings.commercial_number) || "1010123456"),',
    '      };',
    '      const store = {',
    '        ...(mock.store || {}),',
    '        settings,',
    '        apps: (mock.store && mock.store.apps) || { apple: "https://apps.apple.com/", google: "https://play.google.com/" },',
    '        url: absoluteUrl(mock.store && mock.store.url, origin),',
    '        api: absoluteUrl(mock.store && mock.store.api, `${origin}/api/v1/`),',
    '      };',
    '      const theme = {',
    '        ...(mock.theme || {}),',
    '        name: (mock.theme && mock.theme.name) || "theme",',
    '        assets: `${origin}/themes/${(mock.theme && mock.theme.name) || "theme"}/public/:path`,',
    '      };',
    '      const page = mock.page || { slug: "index", id: "local-preview" };',
    '      if (window.Salla && window.Salla.config && typeof window.Salla.config.merge === "function") {',
    '        window.Salla.config.merge({',
    '          store,',
    '          theme,',
    '          page,',
    '          user: mock.user || { type: "guest" },',
    '          cart: mock.cart || { id: "local-cart", count: 0 },',
    '          language: mock.language || { code: "ar", dir: "rtl" },',
    '          currencies: { SAR: { code: "SAR", name: "ريال سعودي", symbol: "ر.س", amount: 1, country_code: "sa" } },',
    '        });',
    '      }',
    '    };',
    '    const NativeURL = window.URL;',
    '    function FactorySafeURL(value, base) {',
    '      if (arguments.length === 0 || value === undefined || value === null || value === "") {',
    '        return new NativeURL(window.location.href);',
    '      }',
    '      return arguments.length > 1 ? new NativeURL(value, base) : new NativeURL(value);',
    '    }',
    '    FactorySafeURL.prototype = NativeURL.prototype;',
    '    FactorySafeURL.createObjectURL = NativeURL.createObjectURL ? NativeURL.createObjectURL.bind(NativeURL) : undefined;',
    '    FactorySafeURL.revokeObjectURL = NativeURL.revokeObjectURL ? NativeURL.revokeObjectURL.bind(NativeURL) : undefined;',
    '    window.URL = FactorySafeURL;',
    "    const module = await import('/__twilight__/loader/index.js');",
    '    window.__SALLA_TWILIGHT_IMPORT_OK__ = true;',
    '    await module.defineCustomElements(window);',
    '    mergeFactoryConfig();',
    '    window.__SALLA_TWILIGHT_READY__ = true;',
    "    window.dispatchEvent(new CustomEvent('factory::twilight-ready'));",
    '  } catch (error) {',
    '    window.__SALLA_TWILIGHT_LOAD_ERROR__ = error && (error.stack || error.message || String(error));',
    '  }',
    '})();',
    '</script>',
  ].join('\n');

  const runtimeTag = /<script\s+src=(["'])runtime\/salla-client-runtime\.js\1><\/script>/i;
  if (runtimeTag.test(html)) {
    return html.replace(runtimeTag, `${snippet}\n$&`);
  }

  return html.replace(/<\/head>/i, `${snippet}\n</head>`);
}

function serveFile(file, response, options = {}) {
  if (!fs.existsSync(file)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const target = fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
  if (!fs.existsSync(target)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': contentType(target) });
  if (options.injectHtml && path.extname(target).toLowerCase() === '.html') {
    response.end(injectTwilightSmoke(fs.readFileSync(target, 'utf8')));
    return;
  }

  fs.createReadStream(target).pipe(response);
}

function sendJson(response, data) {
  response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(`${JSON.stringify(data)}\n`);
}

function serveMockApi(url, response) {
  const pathName = url.pathname.replace(/^\/api\/v1\/?/, '');
  const defaultMenus = [
    { id: 1, title: 'الرئيسية', url: 'index.html', target: '_self', attrs: '', link_attrs: '', children: [] },
    { id: 2, title: 'المنتجات', url: 'products.html', target: '_self', attrs: '', link_attrs: '', children: [] },
    { id: 3, title: 'اتصل بنا', url: '#', target: '_self', attrs: '', link_attrs: '', children: [] },
  ];
  const defaultProduct = {
    id: 1,
    name: 'منتج محلي لاختبار Twilight',
    subtitle: 'بيانات smoke من المصنع',
    url: 'product.html',
    price: { amount: 99, currency: 'SAR' },
    sale_price: { amount: 99, currency: 'SAR' },
    regular_price: { amount: 120, currency: 'SAR' },
    is_on_sale: false,
    status: 'sale',
    type: 'product',
    quantity: 12,
    add_to_cart_label: 'أضف للسلة',
    image: {
      url: `${url.origin}/themes/${themeName}/public/images/placeholder.png`,
      alt: 'منتج محلي لاختبار Twilight',
    },
    thumbnail: `${url.origin}/themes/${themeName}/public/images/placeholder.png`,
    rating: { stars: 5, count: 1 },
  };
  const listPayload = {
    data: [],
    pagination: {
      count: 0,
      total: 0,
      perPage: 12,
      currentPage: 1,
      totalPages: 1,
    },
  };

  if (pathName.includes('menus')) {
    sendJson(response, { data: defaultMenus });
    return;
  }

  if (/products?\/\d+/i.test(pathName)) {
    sendJson(response, {
      data: {
        ...defaultProduct,
        id: Number(pathName.match(/\d+/)?.[0] || 1),
        options: [],
      },
    });
    return;
  }

  if (/products?|search|latest|featured|selected|categories/i.test(pathName)) {
    sendJson(response, {
      data: [defaultProduct],
      pagination: listPayload.pagination,
    });
    return;
  }

  if (pathName.startsWith('cart/latest') || pathName.includes('/cart/latest')) {
    sendJson(response, {
      data: {
        cart: {
          id: 'local-cart',
          count: 0,
          items_count: 0,
          items: [],
          total: 0,
          sub_total: 0,
          total_discount: 0,
          tax_amount: 0,
          real_shipping_cost: 0,
        },
      },
    });
    return;
  }

  sendJson(response, listPayload);
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');

    if (url.pathname.startsWith('/api/v1/')) {
      serveMockApi(url, response);
      return;
    }

    if (url.pathname.startsWith('/__twilight__/')) {
      const file = safeJoin(twilightPackageDir, url.pathname.replace(/^\/__twilight__\//, ''));
      if (!file) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      serveFile(file, response);
      return;
    }

    const file = safeJoin(rootDir, url.pathname);
    if (!file) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    serveFile(file, response, { injectHtml: isInside(file, buildDir) });
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

function fixtureDirs() {
  if (!fs.existsSync(buildDir)) return [];
  return fs.readdirSync(buildDir)
    .map((entry) => path.join(buildDir, entry))
    .filter((file) => fs.statSync(file).isDirectory());
}

function selectedFiles() {
  const sliceFiles = (files) => {
    const offset = Number.isFinite(pageOffset) && pageOffset > 0 ? pageOffset : 0;
    const limited = Number.isFinite(pageLimit) && pageLimit > 0
      ? files.slice(offset, offset + pageLimit)
      : files.slice(offset);
    return limited;
  };

  if (allPages) {
    const files = collectHtmlFiles(buildDir).sort();
    return sliceFiles(files);
  }

  const files = [];
  for (const fixtureDir of fixtureDirs()) {
    for (const sample of SAMPLE_FILES) {
      const file = path.join(fixtureDir, sample);
      if (fs.existsSync(file)) files.push(file);
    }
  }
  const selected = [...new Set(files)].sort();
  return sliceFiles(selected);
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
    // Best-effort cleanup.
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

async function createTarget(port, url) {
  const endpoint = `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`;
  let response = await fetch(endpoint, { method: 'PUT' });
  if (!response.ok) response = await fetch(endpoint);
  if (!response.ok) throw new Error(`فشل إنشاء تبويب Chrome: ${response.status}`);
  return response.json();
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

async function waitForTwilight(page) {
  const coreJson = JSON.stringify(CORE_COMPONENTS);
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const state = await page.send('Runtime.evaluate', {
      expression: `({
        ready: window.__SALLA_TWILIGHT_READY__ === true,
        importOk: window.__SALLA_TWILIGHT_IMPORT_OK__ === true,
        loadError: window.__SALLA_TWILIGHT_LOAD_ERROR__ || null,
        coreMissing: ${coreJson}.filter((name) => !customElements.get(name))
      })`,
      returnByValue: true,
    });
    const value = state.result?.value || {};
    value.definitionsReady = value.importOk && Array.isArray(value.coreMissing) && value.coreMissing.length === 0;
    if (value.loadError || value.definitionsReady) return value;
    await wait(150);
  }

  return { ready: false, importOk: false, definitionsReady: false, coreMissing: CORE_COMPONENTS, loadError: 'انتهت مهلة تحميل Twilight components' };
}

async function checkPage(port, serverPort, file, officialComponents) {
  const relative = path.relative(rootDir, file).replace(/\\/g, '/');
  const url = `http://127.0.0.1:${serverPort}/${relative}`;
  const target = await createTarget(port, url);
  const findings = [];
  const warnings = [];
  let loaded = false;

  const page = await connectCdp(target.webSocketDebuggerUrl, (message) => {
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails || {};
      const exception = details.exception || {};
      findings.push(`Runtime exception: ${exception.description || exception.value || details.text || 'unknown'}`);
    }
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(message.params.type)) {
      const text = (message.params.args || []).map((arg) => arg.value || arg.description || '').join(' ');
      if (text && !text.includes('favicon.ico')) {
        const detail = `Console ${message.params.type}: ${text}`.trim();
        if (SOFT_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text))) warnings.push(detail);
        else findings.push(detail);
      }
    }
    if (message.method === 'Page.loadEventFired') loaded = true;
  });

  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('Page.navigate', { url });

  const start = Date.now();
  while (!loaded && Date.now() - start < 12000) await wait(100);

  const twilightState = await waitForTwilight(page);
  if (twilightState.loadError) findings.push(`Twilight load error: ${twilightState.loadError}`);
  if (!twilightState.definitionsReady) findings.push('تعريفات Twilight الرسمية الأساسية لم تكتمل');
  if (!twilightState.importOk) findings.push('تعذر استيراد loader الخاص بـ Twilight components');

  await wait(500);

  const officialJson = JSON.stringify(officialComponents);
  const coreJson = JSON.stringify(CORE_COMPONENTS);
  const allowedThemeJson = JSON.stringify([...ALLOWED_THEME_DEFINED_TAGS]);
  const optionalJson = JSON.stringify([...ALLOWED_PLATFORM_OPTIONAL_TAGS]);
  const evaluation = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const official = new Set(${officialJson});
      const core = ${coreJson};
      const allowedTheme = new Set(${allowedThemeJson});
      const optional = new Set(${optionalJson});
      const tags = [...new Set([...document.querySelectorAll('*')]
        .map((element) => element.localName)
        .filter((name) => name && name.startsWith('salla-')))].sort();
      const undefinedTags = tags.filter((name) => !customElements.get(name));
      return {
        externalMode: window.__SALLA_TWILIGHT_EXTERNAL__ === true,
        importOk: window.__SALLA_TWILIGHT_IMPORT_OK__ === true,
        ready: window.__SALLA_TWILIGHT_READY__ === true,
        loadError: window.__SALLA_TWILIGHT_LOAD_ERROR__ || null,
        storeUrl: window.Salla && window.Salla.config && window.Salla.config.get ? window.Salla.config.get('store.url') : null,
        themeName: window.Salla && window.Salla.config && window.Salla.config.get ? window.Salla.config.get('theme.name') : null,
        textLength: document.body && document.body.innerText ? document.body.innerText.trim().length : 0,
        sallaTags: tags,
        officialTagsPresent: tags.filter((name) => official.has(name)),
        officialUndefined: undefinedTags.filter((name) => official.has(name)),
        customUndefined: undefinedTags.filter((name) => !official.has(name) && !allowedTheme.has(name) && !optional.has(name)),
        optionalUndefined: undefinedTags.filter((name) => optional.has(name)),
        coreMissing: core.filter((name) => official.has(name) && !customElements.get(name)),
        themeDefinedMissing: [...allowedTheme].filter((name) => tags.includes(name) && !customElements.get(name)),
      };
    })()`,
    returnByValue: true,
  });

  const value = evaluation.result?.value || {};
  if (!value.externalMode) findings.push('الرنتايم المحلي لم يدخل وضع Twilight الخارجي');
  if (!value.storeUrl || !/^https?:\/\//i.test(String(value.storeUrl))) findings.push(`Salla.config store.url غير صالح: ${value.storeUrl || '-'}`);
  if (!value.themeName) findings.push('Salla.config theme.name غير متاح بعد تحميل Twilight');
  if (Number(value.textLength || 0) < 20) findings.push('الصفحة لا تحتوي محتوى نصي كافياً بعد التحميل');
  for (const component of value.coreMissing || []) findings.push(`Official Twilight component غير معرّف: ${component}`);
  for (const component of value.officialUndefined || []) findings.push(`مكوّن Salla رسمي ظاهر لكنه غير معرّف: ${component}`);
  for (const component of value.themeDefinedMissing || []) warnings.push(`مكوّن ثيم مخصص لم يعرّف نفسه: ${component}`);
  for (const component of value.customUndefined || []) warnings.push(`وسم salla-* غير موجود في حزمة Twilight الرسمية: ${component}`);
  for (const component of value.optionalUndefined || []) warnings.push(`وسم منصة اختياري لا توفره حزمة Twilight المحلية: ${component}`);

  page.close();
  await closeTarget(port, target.id);

  return {
    file: relative,
    twilight: twilightState,
    metrics: value,
    findings,
    warnings,
  };
}

function writeReport(result) {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(result, null, 2)}\n`);

  const lines = [
    '# تقرير Twilight Smoke المحلي',
    '',
    `- **الثيم:** ${result.theme}`,
    `- **التاريخ:** ${new Date(result.checked_at).toLocaleString('ar-SA')}`,
    `- **الحزمة:** ${result.twilight_package.version || 'غير معروف'}`,
    `- **الوضع:** ${result.mode}`,
    `- **الصفحات المفحوصة:** ${result.pages_checked}`,
    `- **المكوّنات الرسمية المقروءة:** ${result.official_components_count}`,
    `- **المشاكل:** ${result.issues.length}`,
    `- **التحذيرات:** ${result.warnings.length}`,
    '',
    '## المشاكل',
    '',
    ...(result.issues.length ? result.issues.map((item) => `- ${item.file}: ${item.detail}`) : ['- لا توجد']),
    '',
    '## التحذيرات',
    '',
    ...(result.warnings.length ? result.warnings.map((item) => `- ${item.file}: ${item.detail}`) : ['- لا توجد']),
    '',
  ];

  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`);
}

function readPackageMeta() {
  const packageJson = path.join(twilightPackageDir, 'package.json');
  if (!fs.existsSync(packageJson)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    return { name: data.name, version: data.version };
  } catch (error) {
    return {};
  }
}

async function main() {
  if (!fs.existsSync(themeDir)) throw new Error(`الثيم غير موجود: themes/${themeName}`);
  if (!fs.existsSync(twilightLoader) || !fs.existsSync(twilightEsmLoader)) {
    throw new Error(`حزمة @salla.sa/twilight-components غير مثبتة في themes/${themeName}. شغل pnpm install داخل الثيم.`);
  }

  const chrome = findChrome();
  if (!chrome) throw new Error('لم يتم العثور على Chrome/Edge. عيّن CHROME_PATH لتفعيل فحص Twilight.');

  const files = selectedFiles();
  if (!files.length) throw new Error(`لا توجد صفحات HTML لفحص Twilight في build/${themeName}. شغل preview أولاً.`);

  const officialComponents = readOfficialComponents();
  if (!officialComponents.length) throw new Error('تعذر استخراج قائمة مكوّنات Twilight الرسمية من loader.js.');

  const server = await startServer();
  const serverPort = server.address().port;
  const debugPort = 10100 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `salla-twilight-smoke-${themeName}-`));
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
    schema: 'salla-theme-factory/twilight-smoke@1',
    theme: themeName,
    checked_at: new Date().toISOString(),
    mode: allPages ? 'all-pages' : 'sampled-pages',
    pages_checked: files.length,
    official_components_count: officialComponents.length,
    twilight_package: readPackageMeta(),
    results: [],
    issues: [],
    warnings: [],
  };

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    for (const file of files) {
      console.log(`Checking Twilight: ${path.relative(rootDir, file).replace(/\\/g, '/')}`);
      const pageResult = await checkPage(debugPort, serverPort, file, officialComponents);
      result.results.push(pageResult);
      for (const detail of pageResult.findings) result.issues.push({ file: pageResult.file, detail });
      for (const detail of pageResult.warnings) result.warnings.push({ file: pageResult.file, detail });
    }
  } finally {
    killBrowserProcess(chromeProcess);
    server.close();
    removeTempDir(userDataDir);
  }

  writeReport(result);

  console.log(`\n🌗 Twilight Smoke | ${themeName}`);
  console.log('----------------------------------------');
  console.log(`Mode: ${result.mode}`);
  console.log(`Pages: ${result.pages_checked}`);
  console.log(`Official components: ${result.official_components_count}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  for (const issue of result.issues) console.log(`❌ ${issue.file}: ${issue.detail}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning.file}: ${warning.detail}`);
  console.log(`Report: ${path.relative(process.cwd(), reportMdPath)}`);

  if (result.issues.length) {
    console.log('\n❌ Twilight smoke failed.');
    process.exit(1);
  }

  console.log('\n✅ Twilight smoke passed.');
}

main().catch((error) => {
  console.error('❌ فشل فحص Twilight smoke.');
  console.error(error.message);
  process.exit(1);
});
