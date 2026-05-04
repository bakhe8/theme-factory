const fs = require('fs');
const path = require('path');
const Twig = require('twig');
const { normalizeMoney } = require('./mock-data');

let registered = false;
const transparentPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function dataCss(css) {
  return `data:text/css;charset=utf-8,${encodeURIComponent(css)}`;
}

function runtimeAssetUrl(value) {
  if (!value) return '';
  const clean = String(value).replace(/^\/+/, '');
  if (/^https?:\/\//.test(clean) || /^data:/.test(clean)) return clean;

  const themePath = global.__sallaRuntimeThemePath;
  if (themePath && fs.existsSync(path.join(themePath, 'public', clean))) {
    return `${global.__sallaRuntimePublicUrl}/${clean}`;
  }

  if (clean === 'fonts/default.css') {
    return dataCss(':root{--font-main:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}body{font-family:var(--font-main);}');
  }

  if (clean === 'fonts/sallaicons.css') {
    return dataCss('[class^="sicon-"],[class*=" sicon-"]{font-family:Arial,sans-serif;font-style:normal;line-height:1;}[class^="sicon-"]::before,[class*=" sicon-"]::before{content:"";}');
  }

  if (clean === 'images/tax.png') {
    return transparentPng;
  }

  return `${global.__sallaRuntimePublicUrl}/${clean}`;
}

function registerTwigRuntime() {
  if (registered) return;
  registered = true;

  Twig.extendFilter('asset', (value) => {
    return runtimeAssetUrl(value);
  });

  Twig.extendFilter('cdn', (value) => {
    return runtimeAssetUrl(value);
  });

  Twig.extendFilter('money', (value) => normalizeMoney(value));
  Twig.extendFilter('json_encode', (value) => JSON.stringify(value ?? null));
  Twig.extendFilter('is_placeholder', (value) => !value || String(value).includes('placeholder'));
  Twig.extendFilter('number', (value) => new Intl.NumberFormat('ar-SA').format(Number(value) || 0));

  Twig.extendFunction('trans', (key, params = {}) => {
    const dict = global.__sallaRuntimeTranslations || {};
    let value = dict[key] || key;
    for (const [name, replacement] of Object.entries(params || {})) {
      value = value.replace(`{${name}}`, replacement);
    }
    return value;
  });

  Twig.extendFunction('link', (value = '') => {
    const raw = String(value || '/');
    if (/^(https?:|mailto:|tel:|sms:|whatsapp:|data:|javascript:)/i.test(raw)) return raw;
    let target = (!raw || raw === '/') ? 'index.html' : raw.replace(/^\/+/, '');
    if (!path.extname(target) && !target.endsWith('/')) target = `${target}/index.html`;
    if (target.endsWith('/')) target = `${target}index.html`;

    const pageFile = (global.__sallaRuntimePageFile || 'index.html').replace(/\\/g, '/');
    const pageDir = path.posix.dirname(pageFile);
    const fromDir = pageDir === '.' ? '' : pageDir;
    return path.posix.relative(fromDir, target).replace(/\\/g, '/') || path.posix.basename(target);
  });

  Twig.extendFunction('is_page', (slug) => {
    const page = global.__sallaRuntimePage || {};
    return page.slug === slug;
  });

  Twig.extendFunction('pluralize', (key, count) => `${count} ${key}`);
}

function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

function viewPath(themePath, view) {
  return path.join(themePath, 'src', 'views', `${String(view).replace(/\./g, '/')}.twig`);
}

function componentPath(themePath, name) {
  return viewPath(themePath, `components/${String(name).replace(/\./g, '/')}`);
}

function extractBlocks(template) {
  const blocks = {};
  const pattern = /{%\s*block\s+([A-Za-z0-9_]+)\s*%}([\s\S]*?){%\s*endblock\s*%}/g;
  let match;

  while ((match = pattern.exec(template))) {
    blocks[match[1]] = match[2];
  }

  return blocks;
}

function removeExtends(template) {
  return template.replace(/{%\s*extends\s+["'][^"']+["']\s*%}/, '');
}

function resolveExtends(themePath, pageTemplate) {
  let current = pageTemplate;

  for (let depth = 0; depth < 5; depth += 1) {
    const extendsMatch = current.match(/{%\s*extends\s+["']([^"']+)["']\s*%}/);
    if (!extendsMatch) return current;

    let layout = readFile(viewPath(themePath, extendsMatch[1].replace(/\.twig$/, '')));
    const blocks = extractBlocks(current);
    layout = applyBlocks(layout, blocks);
    current = layout;
  }

  return current;
}

function applyBlocks(template, blocks) {
  let output = template;
  let previous = '';

  while (output !== previous) {
    previous = output;
    output = output.replace(
      /{%\s*block\s+([A-Za-z0-9_]+)\s*%}((?:(?!{%\s*block\s+).)*?){%\s*endblock\s*%}/gs,
      (_, name, fallback) => blocks[name] ?? fallback,
    );
  }

  return output;
}

function stripHooks(template, context) {
  return template.replace(/{%\s*hook\s+([^%]+?)\s*%}/g, (_, rawName) => {
    const name = rawName.trim().replace(/^['"]|['"]$/g, '');
    if (name === 'copyright') return context.runtime.copyright;
    return '';
  });
}

function renderTwigString(template, context) {
  global.__sallaRuntimeTranslations = context.runtime.translations;
  global.__sallaRuntimePage = context.page;
  return Twig.twig({ data: template }).render(context);
}

function valueAtPath(source, expression) {
  const key = String(expression || '').trim();
  if (!key) return undefined;
  return key.split('.').reduce((current, part) => (current == null ? undefined : current[part]), source);
}

function parseIncludeContext(context, expression) {
  const local = {};
  const body = String(expression || '').replace(/^\{|\}$/g, '');
  const pairs = body.split(',').map((item) => item.trim()).filter(Boolean);
  for (const pair of pairs) {
    const match = pair.match(/^([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_.]+)$/);
    if (!match) continue;
    local[match[1]] = valueAtPath(context, match[2]) || {};
  }
  return local;
}

function mergeContext(base, extra) {
  return {
    ...base,
    ...extra,
    runtime: base.runtime,
    store: base.store,
    theme: base.theme,
    cart: base.cart,
    language: base.language,
    user: base.user,
    page: base.page,
  };
}

function renderComponent(themePath, name, context, localContext = {}) {
  const file = componentPath(themePath, name);
  if (!fs.existsSync(file)) {
    return `<!-- missing-component:${name} -->`;
  }

  const template = preprocessTemplate(themePath, readFile(file), mergeContext(context, localContext));
  return renderTwigString(template, mergeContext(context, localContext));
}

function renderHome(themePath, context) {
  return context.runtime.homeSections
    .map((section) => renderComponent(themePath, section.path, context, section.context))
    .join('\n');
}

function resolveComponents(themePath, template, context) {
  return template.replace(/{%\s*component\s+(?:(['"])([^'"]+)\1|([A-Za-z0-9_.-]+))(?:\s+with\s*(\{[^%]+?\}))?\s*%}/g, (_, quote, quotedName, bareName, componentContext) => {
    const token = String(quotedName || bareName || '').trim();
    const local = componentContext ? parseIncludeContext(context, componentContext) : {};
    if (token === 'home') return renderHome(themePath, context);
    return renderComponent(themePath, token, context, local);
  });
}

function resolveIncludes(themePath, template, context) {
  return template.replace(/{%\s*include\s+["']([^"']+)["'](?:\s+with\s+(\{[^%]+?\}))?\s*%}/g, (_, view, includeContext) => {
    const file = viewPath(themePath, String(view).replace(/\.twig$/, ''));
    if (!fs.existsSync(file)) return `<!-- missing-include:${view} -->`;
    const local = includeContext ? parseIncludeContext(context, includeContext) : {};
    const merged = mergeContext(context, local);
    const nested = preprocessTemplate(themePath, readFile(file), merged);
    return renderTwigString(nested, merged);
  });
}

function preprocessTemplate(themePath, template, context) {
  let output = stripHooks(template, context);
  output = output.replace(
    /{{\s*landing\.products\|map\(\(product\)\s*=>\s*product\.id\)\|join\((['"]),\1\)\s*}}/g,
    () => (context.landing?.products || []).map((product) => product.id).join(','),
  );
  output = resolveComponents(themePath, output, context);
  output = resolveIncludes(themePath, output, context);
  return output;
}

function injectRuntime(html, clientState) {
  const state = JSON.stringify(clientState).replace(/</g, '\\u003c');
  const pageFile = (global.__sallaRuntimePageFile || 'index.html').replace(/\\/g, '/');
  const pageDir = path.posix.dirname(pageFile);
  const fromDir = pageDir === '.' ? '' : pageDir;
  const runtimeScript = path.posix.relative(fromDir, 'runtime/salla-client-runtime.js').replace(/\\/g, '/') || 'runtime/salla-client-runtime.js';
  const runtime = [
    '<script>',
    `window.__SALLA_MOCK__ = ${state};`,
    '</script>',
    `<script src="${runtimeScript}"></script>`,
  ].join('');

  if (html.includes('</head>')) {
    return html.replace('</head>', `${runtime}\n</head>`);
  }

  return `${runtime}\n${html}`;
}

function renderThemePage({ themePath, pageView, context, publicUrl, clientState, pageFile: runtimePageFile }) {
  global.__sallaRuntimeThemePath = themePath;
  global.__sallaRuntimePublicUrl = publicUrl;
  global.__sallaRuntimePageFile = runtimePageFile || 'index.html';
  registerTwigRuntime();

  const pageFile = viewPath(themePath, pageView);
  if (!fs.existsSync(pageFile)) {
    throw new Error(`Missing page view: ${pageView}`);
  }

  const pageTemplate = readFile(pageFile);
  const composed = resolveExtends(themePath, pageTemplate);
  const preprocessed = preprocessTemplate(themePath, composed, context);
  const html = renderTwigString(preprocessed, context);

  return injectRuntime(html, clientState);
}

module.exports = {
  renderThemePage,
};
