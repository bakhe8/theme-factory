const fs = require('fs');
const path = require('path');
const Twig = require('twig');
const { normalizeMoney } = require('./mock-data');

let registered = false;

function registerTwigRuntime() {
  if (registered) return;
  registered = true;

  Twig.extendFilter('asset', (value) => {
    if (!value) return '';
    if (/^https?:\/\//.test(String(value))) return value;
    return `${global.__sallaRuntimePublicUrl}/${String(value).replace(/^\/+/, '')}`;
  });

  Twig.extendFilter('cdn', (value) => {
    if (!value) return '';
    if (/^https?:\/\//.test(String(value))) return value;
    return `${global.__sallaRuntimePublicUrl}/${String(value).replace(/^\/+/, '')}`;
  });

  Twig.extendFilter('money', (value) => normalizeMoney(value));
  Twig.extendFilter('json_encode', (value) => JSON.stringify(value ?? null));

  Twig.extendFunction('trans', (key, params = {}) => {
    const dict = global.__sallaRuntimeTranslations || {};
    let value = dict[key] || key;
    for (const [name, replacement] of Object.entries(params || {})) {
      value = value.replace(`{${name}}`, replacement);
    }
    return value;
  });

  Twig.extendFunction('link', (value = '') => {
    if (!value || value === '/') return 'index.html';
    return String(value).replace(/^\//, '');
  });

  Twig.extendFunction('is_page', (slug) => {
    const page = global.__sallaRuntimePage || {};
    return page.slug === slug;
  });
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
  const extendsMatch = pageTemplate.match(/{%\s*extends\s+["']([^"']+)["']\s*%}/);
  if (!extendsMatch) return pageTemplate;

  const layout = readFile(viewPath(themePath, extendsMatch[1].replace(/\.twig$/, '')));
  const blocks = extractBlocks(pageTemplate);

  return layout.replace(
    /{%\s*block\s+([A-Za-z0-9_]+)\s*%}([\s\S]*?){%\s*endblock\s*%}/g,
    (_, name, fallback) => blocks[name] ?? fallback,
  );
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
  return template.replace(/{%\s*component\s+([^%]+?)\s*%}/g, (_, rawName) => {
    const token = rawName.trim().replace(/^['"]|['"]$/g, '');
    if (token === 'home') return renderHome(themePath, context);
    return renderComponent(themePath, token, context);
  });
}

function preprocessTemplate(themePath, template, context) {
  let output = stripHooks(template, context);
  output = resolveComponents(themePath, output, context);
  return output;
}

function injectRuntime(html, clientState) {
  const state = JSON.stringify(clientState).replace(/</g, '\\u003c');
  const runtime = [
    '<script>',
    `window.__SALLA_MOCK__ = ${state};`,
    '</script>',
    '<script src="runtime/salla-client-runtime.js"></script>',
  ].join('');

  if (html.includes('</head>')) {
    return html.replace('</head>', `${runtime}\n</head>`);
  }

  return `${runtime}\n${html}`;
}

function renderThemePage({ themePath, pageView, context, publicUrl, clientState }) {
  global.__sallaRuntimePublicUrl = publicUrl;
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
