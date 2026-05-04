const fs = require('fs');
const path = require('path');
const { generatedDir, rootDir } = require('./salla-docs-config');
const {
  cleanText,
  ensureDir,
  extractCodeTokens,
  htmlToText,
  readJson,
  sectionText,
  writeJson,
} = require('./utils');

const manifestPath = path.join(generatedDir, 'manifest.json');
const NON_COMPONENT_SALLA_TERMS = new Set([
  'salla-cli',
  'salla-dev',
  'salla-developers',
  'salla-partners-portal',
  'salla-platform',
  'salla-store',
  'salla-stores',
]);

function source(doc, section = '') {
  return {
    title: doc.title,
    url: doc.url,
    section,
    syncedAt: doc.syncedAt,
  };
}

function officialTemplateSource(item, section = '') {
  return {
    title: item.title,
    url: item.docsUrl || item.url,
    section,
    officialTemplateUrl: item.url,
    sourceType: 'official-template',
    syncedAt: item.syncedAt,
  };
}

function contains(text, pattern) {
  return pattern.test(text);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function canonicalUrl(url) {
  return String(url || '').replace(/\.md$/i, '');
}

function normalizeForFingerprint(value) {
  return cleanText(String(value || '')
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff-]+/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function evidenceFingerprint(rule) {
  const cssVariables = unique(rule.allowedCssVariables || []).sort().join(',');
  return [
    rule.id,
    rule.type,
    rule.scope,
    rule.enforcement,
    normalizeForFingerprint(rule.evidence),
    cssVariables,
  ].join('|');
}

function sameSource(left, right) {
  return canonicalUrl(left?.url) === canonicalUrl(right?.url)
    && String(left?.section || '') === String(right?.section || '');
}

function mergeSources(existingSources, nextSources) {
  const merged = [...existingSources];
  for (const sourceItem of nextSources) {
    if (!merged.some((item) => sameSource(item, sourceItem))) {
      merged.push(sourceItem);
    }
  }
  return merged;
}

function tagNames(raw) {
  const tags = new Set();
  const patterns = [
    /<\s*(salla-[a-z0-9-]+)/gi,
    /&lt;\s*(salla-[a-z0-9-]+)/gi,
    /`(salla-[a-z0-9-]+)`/gi,
    /\b(salla-[a-z0-9-]+)\b/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(raw))) {
      const tag = String(match[1] || '').toLowerCase();
      if (NON_COMPONENT_SALLA_TERMS.has(tag)) continue;
      tags.add(tag);
    }
  }

  return [...tags];
}

function primaryComponent(doc, raw = '') {
  const id = String(doc.id || '').toLowerCase();
  const title = String(doc.title || '').toLowerCase();
  const tags = tagNames(raw);

  if (id.includes('add-product') || title.includes('add product')) return 'salla-add-product-button';
  if (id.includes('product-card') || title.includes('product card')) return 'salla-product-card';
  if (id.includes('verify') || title.includes('verify')) return 'salla-verify';
  if (tags.length === 1 && /salla|web component|storefront/i.test(title)) return tags[0];
  return null;
}

function tableCodeColumn(section, columnIndex) {
  const values = [];

  for (const line of section.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    if (/^\|\s*-+/.test(line)) continue;

    const cells = line.split('|').map((cell) => cell.trim());
    const cell = cells[columnIndex] || '';
    const matches = [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    values.push(...matches);
  }

  return unique(values);
}

function tableLinkedItems(section, columnIndex) {
  const items = [];

  for (const line of section.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    if (/^\|\s*-+/.test(line)) continue;

    const cells = line.split('|').map((cell) => cell.trim());
    const cell = cells[columnIndex] || '';
    const match = cell.match(/\[([^\]]+)\]\(/);
    if (!match) continue;

    items.push({
      name: cleanText(match[1]),
      description: cleanText(cells[columnIndex + 1] || ''),
    });
  }

  const seen = new Set();
  return items.filter((item) => {
    if (!item.name || seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

function compileComponentDoc(doc, raw, text) {
  const primary = primaryComponent(doc, raw);
  const tags = primary ? [primary] : tagNames(raw);
  const looksLikeComponentDoc = Boolean(primary)
    || (/Web Components?|Salla Storefront/i.test(`${doc.title}\n${text.slice(0, 600)}`) && tags.length > 0);

  const propertiesSection = sectionText(raw, '## Properties', ['## Events', '## Methods', '## Slots', 'Fast Checkout Feature', 'Modified']);
  const eventsSection = sectionText(raw, '## Events', ['## Methods', '## Slots', 'Fast Checkout Feature', 'Modified']);
  const methodsSection = sectionText(raw, '## Methods', ['## Slots', 'Modified']);
  const slotsSection = sectionText(raw, '## Slots', ['Modified']);

  const properties = looksLikeComponentDoc ? tableCodeColumn(propertiesSection, 2) : [];
  const events = looksLikeComponentDoc ? tableCodeColumn(eventsSection, 1) : [];
  const methods = looksLikeComponentDoc ? tableCodeColumn(methodsSection, 1) : [];
  const slots = looksLikeComponentDoc ? tableCodeColumn(slotsSection, 1) : [];
  const cssVariables = primary === 'salla-mini-checkout-widget'
    ? unique(raw.match(/--salla-[a-z0-9-]+/g) || [])
    : [];

  return tags.map((tag) => ({
    component: tag,
    properties: unique(properties),
    events: unique(events),
    methods: unique(methods),
    slots: unique(slots),
    sallaActions: extractSallaActions(raw),
    cssVariables: unique(cssVariables),
    source: source(doc, 'Usage / Properties / Events / Methods / Slots'),
  }));
}

function compileTwigDoc(doc, raw) {
  const identity = `${doc.id || ''} ${doc.title || ''}`.toLowerCase();
  if (!identity.includes('flavoured twig')) return null;

  const helpersSection = sectionText(raw, '## Helpers', ['## Filters', 'Modified']);
  const filtersSection = sectionText(raw, '## Filters', ['Modified']);

  return {
    helpers: tableLinkedItems(helpersSection, 1),
    filters: tableLinkedItems(filtersSection, 1),
    source: source(doc, 'Helpers / Filters'),
  };
}

function compileTwilightJsonDoc(doc, raw) {
  const identity = `${doc.id || ''} ${doc.title || ''}`.toLowerCase();
  const isTwilightJson = identity.includes('twilight.json') || (Array.isArray(doc.tags) && doc.tags.includes('twilight-json'));
  if (!isTwilightJson) return null;

  const authorSection = markdownSection(raw, 'Author settings');
  const settingsSection = markdownSection(raw, 'Theme settings');
  const featuresSection = markdownSection(raw, 'Theme Features');
  const componentsSection = markdownSection(raw, 'Theme components');

  return {
    file: 'twilight.json',
    rootPlacement: /placed in the root directory/i.test(raw),
    sections: ['author', 'settings', 'features', 'components'],
    author: {
      keys: unique([...authorSection.matchAll(/`([a-z_]+)`/gi)].map((match) => match[1])),
    },
    settings: {
      requiredShape: unique([...settingsSection.matchAll(/`(type|label|id|format)`/gi)].map((match) => match[1])),
      retrieval: unique([...settingsSection.matchAll(/theme\.settings\.get\(["']([^"']+)["']\)/gi)].map((match) => `theme.settings.get("${match[1]}")`)),
      evidence: cleanText(settingsSection).slice(0, 500),
    },
    features: {
      prefix: contains(featuresSection, /prefix\s+`component-`/i) ? 'component-' : '',
      examples: extractQuotedValues(featuresSection).filter((item) => item === 'filters' || item.startsWith('component-')),
      bestPractice: contains(featuresSection, /best practice[\s\S]*Theme features/i),
      evidence: cleanText(featuresSection).slice(0, 500),
    },
    components: {
      schemaSection: 'components',
      pathMapsTo: 'src/views/components/{path.replace(".", "/")}.twig',
      example: {
        name: firstJsonStringValue(componentsSection, 'name'),
        path: firstJsonStringValue(componentsSection, 'path'),
        fields: extractJsonFieldSummaries(componentsSection),
      },
      evidence: cleanText(componentsSection).slice(0, 500),
    },
    source: source(doc, 'Author settings / Theme settings / Theme Features / Theme components'),
  };
}

function compileComponentCatalogDoc(doc, raw) {
  const identity = `${doc.id || ''} ${doc.title || ''}`.toLowerCase();
  const isComponentCatalog = Array.isArray(doc.tags) && doc.tags.includes('component-catalog');
  if (!isComponentCatalog && !(identity.includes('overview') && /Home Components[\s\S]*Products Components[\s\S]*Comments component/i.test(raw))) {
    return null;
  }

  const overviewSection = markdownSection(raw, 'Components');
  const homeSection = markdownSection(raw, 'Home Components');
  const headerSection = markdownSection(raw, 'Header Components');
  const footerSection = markdownSection(raw, 'Footer Components');
  const productsSection = markdownSection(raw, 'Products Components');
  const essentialsSection = markdownSection(raw, 'Essentials');
  const optionsSection = markdownSection(raw, 'Options');
  const commentsSection = markdownSection(raw, 'Comments component');

  return {
    root: 'src/views/components/',
    characteristics: {
      reusable: contains(raw, /independent and reusable bits of code/i),
      strictTyping: contains(raw, /properties with strict typing/i),
      defaultValues: contains(raw, /default values/i),
      requiredOnlyWhenMarked: contains(raw, /only required if you mark it required/i),
      customComponentsAllowed: contains(raw, /flexibility of developing and including his own components/i),
    },
    categories: [
      componentCatalogCategory('home', 'Home Components', homeSection, 'src/views/components/home/'),
      componentCatalogCategory('header', 'Header Components', headerSection, 'src/views/components/header/'),
      componentCatalogCategory('footer', 'Footer Components', footerSection, 'src/views/components/footer/'),
      {
        ...componentCatalogCategory('product', 'Product Components', sectionBeforeChildHeading(productsSection), 'src/views/components/product/'),
        groups: [
          componentCatalogCategory('product-essentials', 'Essentials', essentialsSection, 'src/views/components/product/'),
          componentCatalogCategory('product-options', 'Options', optionsSection, 'src/views/components/product/options/'),
        ],
      },
      componentCatalogCategory('comments', 'Comments Component', commentsSection, 'src/views/components/comments.twig'),
    ],
    overview: cleanText(overviewSection).slice(0, 700),
    source: source(doc, 'Overview / Components catalog'),
  };
}

function compileComponentsCustomizationDoc(doc, raw) {
  const identity = `${doc.id || ''} ${doc.title || ''}`.toLowerCase();
  const isCustomizationDoc = Array.isArray(doc.tags) && doc.tags.includes('web-components-customization');
  if (!isCustomizationDoc && !(identity.includes('components customization') && /tailwind\.config\.js[\s\S]*CSS Variables/i.test(raw))) {
    return null;
  }

  const howItWorks = markdownSection(raw, 'How it works');
  const customCss = markdownSection(raw, 'Custom CSS framework');
  const cssClasses = componentCssClassExamples(customCss);

  return {
    subject: 'js-web-components-ui-customization',
    allowedTargets: [
      'colors',
      'fonts',
      'layouts',
      'sizes',
      'look-and-feel',
    ],
    mechanisms: {
      tailwindConfig: {
        file: 'tailwind.config.js',
        editable: contains(howItWorks, /tailwind\.config\.js`?\s+can be modified/i),
        keys: unique([...howItWorks.matchAll(/\b(screens|colors|fontFamily|extend|spacing|borderRadius)\s*:/g)].map((match) => match[1])),
      },
      cssVariables: {
        allowed: contains(customCss, /use the same\s+\[?CSS Variables/i),
        sourceHint: 'https://docs.salla.dev/421945m0',
      },
      selfDevelopedCss: {
        allowed: contains(customCss, /flexibility to use self-developed CSS styles/i),
        awayFromTailwindUtilities: contains(customCss, /away from the\s+\[?Tailwind CSS Styles/i),
      },
      componentCssClasses: {
        allowed: contains(customCss, /each component has its own CSS class/i),
        examples: cssClasses,
      },
      scssFiles: {
        allowed: contains(customCss, /\.scss`?\s+file/i),
      },
    },
    safeguards: {
      preventHardCodedData: contains(raw, /prevent data from being hard-coded/i),
      outputCssCompliesWithTailwindConfig: contains(howItWorks, /output CSS styles comply with/i),
      uiConsistency: contains(raw, /better user interface consistency/i),
    },
    evidence: {
      howItWorks: cleanText(howItWorks).slice(0, 700),
      customCss: cleanText(customCss).slice(0, 700),
    },
    source: source(doc, 'How it works / Custom CSS framework'),
  };
}

function compileWebComponentsUsageDoc(doc, raw) {
  const identity = `${doc.id || ''} ${doc.title || ''}`.toLowerCase();
  const isUsageDoc = Array.isArray(doc.tags) && doc.tags.includes('web-components-usage');
  const looksLikeUsageDoc = identity.includes('usage')
    && /Twilight Themes[\s\S]*Bundler\/ES modules[\s\S]*Tailwind Config/i.test(raw);
  if (!isUsageDoc && !looksLikeUsageDoc) return null;

  const twilightThemes = markdownSection(raw, 'Twilight Themes');
  const bundler = markdownSection(raw, 'Bundler/ES modules');
  const tailwind = markdownSection(raw, 'Tailwind Config');
  const cssVariables = markdownSection(raw, 'CSS Variables');
  const events = markdownSection(raw, 'Events');
  const cdnUrl = (raw.match(/https:\/\/unpkg\.com\/@salla\.sa\/twilight-components@latest\/[^"'\s<>]+/i) || [])[0] || '';

  return {
    subject: 'twilight-web-components-usage',
    runtimeModes: {
      twilightThemes: {
        autoInjected: contains(twilightThemes, /automatically inject/i),
        bundleOrHtmlIncludeRequired: contains(twilightThemes, /no need to include them in your bundle or HTML/i) ? false : null,
        evidence: cleanText(twilightThemes).slice(0, 500),
      },
      bundlerEsModules: {
        allowedOutsideTwilightThemeRuntime: true,
        requires: [
          ...(contains(bundler, /Node\.js/i) ? ['Node.js'] : []),
          ...(contains(bundler, /Tailwind CSS/i) ? ['Tailwind CSS'] : []),
        ],
        package: '@salla.sa/twilight-components',
        installCommands: unique([...raw.matchAll(/(?:npm install|yarn add)\s+@salla\.sa\/twilight-components(?:\s+--save)?/gi)].map((match) => match[0])),
        importPath: contains(raw, /@salla\.sa\/twilight-components\/loader/i) ? '@salla.sa/twilight-components/loader' : '',
        registrationFunctions: unique([
          ...(contains(raw, /\bapplyPolyfills\b/) ? ['applyPolyfills'] : []),
          ...(contains(raw, /\bdefineCustomElements\b/) ? ['defineCustomElements'] : []),
        ]),
        registersOn: contains(raw, /TwilightWebComponents\(window\)/i) ? 'window' : '',
        evidence: cleanText(bundler).slice(0, 700),
      },
      cdn: {
        allowedOutsideTwilightThemeRuntime: true,
        scriptType: contains(raw, /type=["']module["']/i) ? 'module' : '',
        src: cdnUrl,
      },
    },
    tailwindConfig: {
      file: 'tailwind.config.js',
      foundation: contains(tailwind, /Tailwind CSS/i) ? 'Tailwind CSS' : '',
      plugin: contains(tailwind, /@salla\.sa\/twilight-tailwind-theme/i) ? '@salla.sa/twilight-tailwind-theme' : '',
      requiresTemplatePaths: contains(tailwind, /configure the\s+`?content`?\s+option/i),
      emptyCssRisk: contains(tailwind, /otherwise your CSS will be empty/i),
      safeListPath: contains(tailwind, /safe-list-css\.txt/i) ? 'node_modules/@salla.sa/twilight-tailwind-theme/safe-list-css.txt' : '',
      documentedContentPaths: unique([...tailwind.matchAll(/["']([^"']*(?:views\/\*\*\/\*\.twig|safe-list-css\.txt)[^"']*)["']/gi)].map((match) => match[1])),
      starterThemeIncludesTailwindConfig: contains(tailwind, /tailwind\.config\.js`?\s+is already bundled with the[\s\S]*Twilight starter theme/i),
      evidence: cleanText(tailwind).slice(0, 700),
    },
    markupExamples: tagNames(raw),
    cssVariables: unique(cssVariables.match(/--[a-z0-9-]+/gi) || []),
    events: {
      recommendsDomEvents: contains(events, /recommend using DOM events/i),
      customEventsDocumentedPerComponent: contains(events, /custom events[\s\S]*documented on their own documentation page/i),
      examples: unique([...events.matchAll(/addEventListener\(["']([^"']+)["']/gi)].map((match) => match[1])),
      whenDefined: unique([...events.matchAll(/whenDefined\(["']([^"']+)["']/gi)].map((match) => match[1])),
      evidence: cleanText(events).slice(0, 700),
    },
    source: source(doc, 'Usage / Installation / Tailwind Config / CSS Variables / Events'),
  };
}

function componentCssClassExamples(section) {
  const base = [...String(section || '').matchAll(/\.([a-z][a-z0-9-]+)\s*\{/gi)].map((match) => match[1]);
  const firstBase = base[0] || '';
  const nested = firstBase
    ? [...String(section || '').matchAll(/&-([a-z0-9-]+)\s*\{/gi)].map((match) => `${firstBase}-${match[1]}`)
    : [];

  return unique([...base, ...nested].map((item) => `.${item}`));
}

function markdownTableLinkedItems(section) {
  const items = [];

  for (const line of String(section || '').split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    if (/^\|\s*-+/.test(line)) continue;

    const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
    const linked = (cells[0] || '').match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (!linked) continue;

    items.push({
      name: cleanText(linked[1]),
      url: linked[2],
      description: cleanText(cells[1] || ''),
    });
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = item.name.toLowerCase();
    if (!item.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sectionBeforeChildHeading(section) {
  const lines = String(section || '').split(/\r?\n/);
  const firstChild = lines.findIndex((line, index) => index > 0 && /^#{4,6}\s+/.test(line));
  return firstChild > 0 ? lines.slice(0, firstChild).join('\n') : section;
}

function componentCatalogCategory(id, title, section, fallbackLocation) {
  return {
    id,
    title,
    location: sectionLocation(section, fallbackLocation),
    items: bulletListItems(section),
    docLinks: sectionLinks(section),
  };
}

function sectionLocation(section, fallback) {
  const match = String(section || '').match(/`(src\/views\/components\/[^`]+)`/i);
  return match ? match[1] : fallback;
}

function bulletListItems(section) {
  const items = [];

  for (const line of stripHtmlComments(section).split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+(.+)$/);
    if (!match) continue;
    const value = match[1].trim();
    const linked = value.match(/\[([^\]]+)\]\(([^)]+)\)/);
    items.push({
      name: cleanText(linked ? linked[1] : value),
      ...(linked ? { url: linked[2] } : {}),
    });
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = item.name.toLowerCase();
    if (!item.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sectionLinks(section) {
  const links = [];

  for (const match of stripHtmlComments(section).matchAll(/\[([^\]]+)\]\((https:\/\/docs\.salla\.dev\/[^)]+)\)/g)) {
    links.push({
      title: cleanText(match[1]),
      url: match[2],
    });
  }

  const seen = new Set();
  return links.filter((item) => {
    const key = item.url.split('#')[0].split('?')[0].replace(/\.md$/i, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stripHtmlComments(value) {
  return String(value || '').replace(/<!--[\s\S]*?-->/g, '');
}

function extractQuotedValues(text) {
  return unique([...String(text || '').matchAll(/"([^"]+)"/g)].map((match) => match[1]));
}

function firstJsonStringValue(text, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, 'i');
  const match = pattern.exec(text || '');
  return match ? match[1] : '';
}

function extractJsonFieldSummaries(text) {
  const values = [];
  const content = String(text || '');
  const ids = [...content.matchAll(/"id"\s*:\s*"([^"]+)"/g)];

  ids.forEach((match, index) => {
    const next = ids[index + 1];
    const end = next ? next.index : Math.min(content.length, match.index + 500);
    const fragment = content.slice(match.index, end);
    values.push({
      id: match[1],
      type: firstJsonStringValue(fragment, 'type'),
      format: firstJsonStringValue(fragment, 'format'),
    });
  });

  const seen = new Set();
  return values.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function usageExcerpt(raw, text) {
  return cleanText(
    markdownSection(raw, 'Usage')
    || sectionText(text, 'Usage', ['Modified']),
  ).slice(0, 700);
}

function extractTemplatePaths(raw) {
  const paths = new Set();

  for (const match of raw.matchAll(/src\/views\/components\/[a-z0-9/_-]+\.twig/gi)) {
    paths.add(match[0]);
  }

  if (/components[\s\S]{0,800}product[\s\S]{0,800}options/i.test(raw)) {
    for (const match of raw.matchAll(/[├└]\s*──\s*([a-z0-9_-]+\.twig)/gi)) {
      paths.add(`src/views/components/product/options/${match[1]}`);
    }
  }

  if (paths.size) return [...paths];

  const hasComponentTree = /src[\s\S]{0,400}views[\s\S]{0,400}components/i.test(raw);
  const twigFile = raw.match(/([a-z0-9_-]+\.twig)/i);
  if (hasComponentTree && twigFile) return [`src/views/components/${twigFile[1]}`];

  return [];
}

function extractSallaActions(raw) {
  const actions = new Set();
  const patterns = [
    /salla\.[a-z0-9_.]+\(\s*['"]([^'"]+)['"]/gi,
    /salla\.form\.onSubmit\(\s*['"]([^'"]+)['"]/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(raw))) actions.add(match[1]);
  }

  return [...actions].sort();
}

function extractTwigVariablePaths(raw) {
  const locals = new Set();
  const values = new Set();
  const reserved = new Set([
    '_self',
    'and',
    'asset',
    'cdn',
    'else',
    'elseif',
    'endfor',
    'endif',
    'false',
    'for',
    'if',
    'in',
    'include',
    'is',
    'is_placeholder',
    'json_encode',
    'length',
    'not',
    'null',
    'number',
    'or',
    'pluralize',
    'raw',
    'set',
    'time_ago',
    'trans',
    'true',
    'with',
  ]);

  for (const match of raw.matchAll(/\{%\s*set\s+([a-z_][a-z0-9_]*)/gi)) locals.add(match[1]);
  for (const match of raw.matchAll(/\{%\s*for\s+([a-z_][a-z0-9_]*)\s+in\s+/gi)) locals.add(match[1]);

  const twigBlocks = raw.match(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g) || [];
  for (const block of twigBlocks) {
    const withoutStrings = block.replace(/(['"])(?:\\.|(?!\1)[\s\S])*\1/g, ' ');
    for (const match of withoutStrings.matchAll(/\b([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)\b/gi)) {
      const value = match[1];
      const root = value.split('.')[0];
      if (reserved.has(value) || reserved.has(root)) continue;
      if (locals.has(root) && !['comment'].includes(root)) continue;
      values.add(value);
    }
  }

  return [...values].sort((a, b) => a.localeCompare(b));
}

function templateTitleFromPath(templatePath) {
  return path.basename(templatePath || '', '.twig')
    .replace(/-/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function markdownSection(raw, heading) {
  const lines = String(raw || '').split(/\r?\n/);
  const wanted = normalizeHeading(heading);
  let start = -1;
  let level = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const current = parseMarkdownHeading(lines[index]);
    if (!current || current.title !== wanted) continue;
    start = index;
    level = current.level;
    break;
  }

  if (start === -1) return '';

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const current = parseMarkdownHeading(lines[index]);
    if (current && current.level <= level) {
      end = index;
      break;
    }
  }

  return cleanText(lines.slice(start, end).join('\n'));
}

function parseMarkdownHeading(line) {
  const match = String(line || '').match(/^(#{1,6})\s+(.+?)\s*#?\s*$/);
  if (!match) return null;
  return {
    level: match[1].length,
    title: normalizeHeading(match[2]),
  };
}

function normalizeHeading(value) {
  return cleanText(String(value || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#+\s*$/g, ''))
    .toLowerCase();
}

function templateRawForPath(raw, templatePath, hasMultiplePaths) {
  if (!hasMultiplePaths) return raw;
  return markdownSection(raw, templateTitleFromPath(templatePath)) || raw;
}

function compileTemplateComponentDoc(doc, text, raw) {
  const templatePaths = extractTemplatePaths(raw);
  const isTemplateComponent = Array.isArray(doc.tags) && doc.tags.includes('template-component');
  const isPageDoc = Array.isArray(doc.tags) && doc.tags.includes('page');
  const isConfigDoc = Array.isArray(doc.tags) && doc.tags.includes('config');
  const isCatalogDoc = Array.isArray(doc.tags) && doc.tags.includes('component-catalog');
  const isCustomizationDoc = Array.isArray(doc.tags) && doc.tags.includes('web-components-customization');
  if ((isPageDoc || isConfigDoc || isCatalogDoc || isCustomizationDoc) && !isTemplateComponent) return [];
  if (!isTemplateComponent && !templatePaths.length) return [];

  const paths = templatePaths.length ? templatePaths : [`src/views/components/${stableComponentName(doc)}.twig`];
  return paths.map((templatePath) => {
    const scopedRaw = templateRawForPath(raw, templatePath, paths.length > 1);
    const scopedText = htmlToText(scopedRaw);
    const fileName = path.basename(templatePath);
    const section = paths.length > 1
      ? `Location / ${templateTitleFromPath(templatePath)} / Variables / Usage`
      : 'Location / Variables / Usage';

    return {
      name: fileName.replace(/\.twig$/i, ''),
      path: templatePath,
      variables: extractTwigVariablePaths(scopedRaw),
      components: tagNames(scopedRaw),
      sallaActions: extractSallaActions(scopedRaw),
      usage: usageExcerpt(scopedRaw, scopedText),
      source: source(doc, section),
    };
  });
}

function stableComponentName(doc) {
  return String(doc.id || doc.title || 'component')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compilePageDoc(doc, text, raw) {
  if (!Array.isArray(doc.tags) || !doc.tags.includes('page')) return null;

  const identity = `${doc.id || ''} ${doc.title || ''}`.toLowerCase();
  let page = null;
  if (identity.includes('wishlist')) page = 'wishlist';
  else if (identity.includes('notifications')) page = 'notifications';
  else if (identity.includes('home')) page = 'home';
  else if (identity.includes('cart')) page = 'cart';
  else if (identity.includes('loyalty')) page = 'loyalty';
  else if (identity.includes('single order') || identity.includes('order details') || identity.includes('orders list') || identity.includes(' orders')) page = 'orders';
  else if (identity.includes('landing')) page = 'landing';
  else if (identity.includes('product')) page = 'product';

  if (!page) return null;

  const variables = [];
  const receivePatterns = [
    /receives?\s+(?:an\s+array\s+of\s+)?`([^`]+)`/gi,
    /receives?\s+(?:the\s+)?\[`?([a-z_]+)`?\]\([^)]+\)\s+object/gi,
    /receives?\s+(?:the\s+)?([a-z_]+)\s+object/gi,
    /variable\s+`([^`]+)`/gi,
    /`([a-z_]+)`\s+object/gi,
  ];

  for (const pattern of receivePatterns) {
    let match;
    while ((match = pattern.exec(raw))) variables.push(match[1]);
  }

  const contract = {
    page,
    variables: unique(variables),
    components: tagNames(raw),
    hooksDocumented: /hooks?/i.test(text),
    usage: usageExcerpt(raw, text),
    source: source(doc, 'Usage / Variables / JS Web Components / Hooks'),
  };

  if (page === 'home') {
    Object.assign(contract, compileHomePageDetails(raw));
  }

  return contract;
}

function compileHomePageDetails(raw) {
  const componentsSection = markdownSection(raw, 'Components');
  const themeComponentsSection = markdownSection(raw, 'Theme Features and Theme Components');
  const componentCalls = [];

  for (const match of raw.matchAll(/\{%\s*component\s+([a-z0-9_.-]+)\s*%\}/gi)) {
    componentCalls.push(match[1]);
  }

  return {
    route: '/',
    template: 'src/views/pages/index.twig',
    twigComponents: unique(componentCalls),
    themeFeatures: tableLinkedItems(componentsSection, 1),
    themeComponents: tableLinkedItems(themeComponentsSection, 1),
    customComponentExample: {
      schemaFile: 'twilight.json',
      schemaSection: 'components',
      exampleName: 'custom-slider',
      examplePath: 'src/views/components/home/custom-slider.twig',
    },
    featurePrefix: contains(raw, /prefix\s+`component-`/i) ? 'component-' : '',
    allowsStaticContent: contains(raw, /Static Content[\s\S]*developer has the option of building their own static content/i),
    prefersThemeFeatures: contains(raw, /advised to utalize the previous methods|advised to use the Theme Features/i),
  };
}

function compileRules(docs) {
  const rules = [];

  for (const doc of docs) {
    const raw = fs.readFileSync(path.join(rootDir, doc.rawPath), 'utf8');
    const text = htmlToText(raw);
    const lower = text.toLowerCase();

    if (contains(text, /Theme size should not exceed\s+`?1mb`?/i)) {
      rules.push({
        id: 'SALLA_THEME_SIZE_PUBLIC_1MB',
        type: 'deny',
        scope: 'theme.public',
        enforcement: 'error',
        source: source(doc, 'Technical Review 1.1'),
        evidence: 'Theme size should not exceed 1mb.',
      });
    }

    if (contains(text, /localization and not static string/i)) {
      rules.push({
        id: 'SALLA_LOCALIZATION_REQUIRED',
        type: 'deny',
        scope: 'theme.locales',
        enforcement: 'error',
        source: source(doc, 'Technical Review 1.2'),
        evidence: 'Theme should use localization and not static string.',
      });
    }

    if (contains(text, /every product has request/i)) {
      rules.push({
        id: 'SALLA_NO_PER_PRODUCT_REQUESTS',
        type: 'deny',
        scope: 'product-card.network',
        enforcement: 'error',
        source: source(doc, 'Technical Review 1.5'),
        evidence: 'Too much requests, for example every product has request, should be prevented.',
      });
    }

    if (contains(text, /Search for any usage for\s+\|raw/i)) {
      rules.push({
        id: 'SALLA_NO_RAW_TWIG',
        type: 'deny',
        scope: 'twig',
        enforcement: 'error',
        source: source(doc, 'Technical Review 2.4 Security'),
        evidence: 'Search for any usage for |raw.',
      });
    }

    if (contains(text, /custom html either as component or settings/i) || contains(text, /No custom HTML or elements that may compromise security/i)) {
      rules.push({
        id: 'SALLA_NO_MERCHANT_CUSTOM_HTML',
        type: 'deny',
        scope: 'twilight.settings',
        enforcement: 'error',
        source: source(doc, lower.includes('bundle') ? 'Bundle Technical Review' : 'Technical Review 2.4 Security'),
        evidence: 'No custom HTML or elements that may compromise security are allowed.',
      });
    }

    if (contains(text, /not allowed to be customized/i) && raw.includes('salla-mini-checkout-widget')) {
      const cssVariables = unique(raw.match(/--salla-fast-checkout-[a-z-]+/g) || []);
      rules.push({
        id: 'SALLA_FAST_CHECKOUT_CSS_ONLY',
        type: 'deny',
        scope: 'salla-mini-checkout-widget',
        enforcement: 'error',
        allowedCssVariables: cssVariables,
        source: source(doc, 'Add Product - Fast Checkout Feature'),
        evidence: 'This component is not allowed to be customized by the developer and can only be called to the Theme.',
      });
    }

    if (contains(text, /custom-salla-product-card/i)) {
      rules.push({
        id: 'SALLA_CUSTOM_PRODUCT_CARD_ALLOWED',
        type: 'allow',
        scope: 'custom-salla-product-card',
        enforcement: 'allow',
        source: source(doc, 'Product Card - Custom Salla Product Card Component'),
        evidence: 'The developer can fully customize cards within Product Lists by utilizing custom-salla-product-card.',
      });
    }

    if (contains(text, /These varibles can be used within any of the Theme's pages/i)) {
      rules.push({
        id: 'SALLA_GLOBAL_VARIABLES_READ_ALLOWED',
        type: 'allow',
        scope: 'theme.global-variables',
        enforcement: 'allow',
        source: source(doc, 'Global Variables'),
        evidence: "These variables can be used within any of the Theme's pages.",
      });
    }

    if (contains(text, /user interface can be customized[\s\S]*colors, fonts, layouts, and sizes/i)) {
      rules.push({
        id: 'SALLA_WEB_COMPONENTS_UI_CUSTOMIZATION_ALLOWED',
        type: 'allow',
        scope: 'web-components.ui',
        enforcement: 'allow',
        source: source(doc, 'Components Customization'),
        evidence: 'The user interface can be customized by changing colors, fonts, layouts, and sizes.',
      });
    }

    if (contains(text, /tailwind\.config\.js`?\s+can be modified/i)) {
      rules.push({
        id: 'SALLA_TAILWIND_CONFIG_CUSTOMIZATION_ALLOWED',
        type: 'allow',
        scope: 'tailwind.config.js',
        enforcement: 'allow',
        source: source(doc, 'Components Customization - How it works'),
        evidence: "The file tailwind.config.js can be modified to change colors, font, and more.",
      });
    }

    if (contains(text, /use self-developed CSS styles/i) && contains(text, /each component has its own CSS class/i)) {
      rules.push({
        id: 'SALLA_COMPONENT_CSS_CLASS_CUSTOMIZATION_ALLOWED',
        type: 'allow',
        scope: 'web-components.css',
        enforcement: 'allow',
        source: source(doc, 'Components Customization - Custom CSS framework'),
        evidence: 'Twilight Web Components use CSS Variables and component CSS classes, allowing self-developed CSS styles.',
      });
    }

    if (contains(text, /no need to include them in your bundle or HTML/i) && contains(text, /automatically inject the latest version/i)) {
      rules.push({
        id: 'SALLA_TWILIGHT_THEMES_AUTO_INJECT_WEB_COMPONENTS',
        type: 'allow',
        scope: 'twilight.web-components.runtime',
        enforcement: 'allow',
        source: source(doc, 'Usage - Twilight Themes'),
        evidence: 'Within Twilight themes, there is no need to include Twilight web components in the bundle or HTML because the engine injects them.',
      });
    }

    if (contains(text, /npm install\s+@salla\.sa\/twilight-components/i) && contains(text, /@salla\.sa\/twilight-components\/loader/i)) {
      rules.push({
        id: 'SALLA_WEB_COMPONENTS_BUNDLER_ES_MODULES_ALLOWED',
        type: 'allow',
        scope: 'web-components.bundler',
        enforcement: 'allow',
        source: source(doc, 'Usage - Bundler/ES modules'),
        evidence: 'Bundler/ES modules usage can install @salla.sa/twilight-components and import the loader.',
      });
    }

    if (contains(text, /safe-list-css\.txt/i) && contains(text, /otherwise your CSS will be empty/i)) {
      rules.push({
        id: 'SALLA_TAILWIND_CONTENT_REQUIRED_FOR_WEB_COMPONENTS',
        type: 'deny',
        scope: 'tailwind.content',
        enforcement: 'error',
        source: source(doc, 'Usage - Tailwind Config'),
        evidence: 'Tailwind JIT requires template paths and the Twilight safe list in tailwind.config.js, otherwise CSS can be empty.',
      });
    }
  }

  return mergeRules(rules);
}

function mergeRules(rules) {
  const byFingerprint = new Map();

  for (const rule of rules) {
    const fingerprint = evidenceFingerprint(rule);
    const sources = rule.sources || [rule.source].filter(Boolean);
    const current = byFingerprint.get(fingerprint);

    if (!current) {
      byFingerprint.set(fingerprint, {
        ...rule,
        evidenceFingerprint: fingerprint,
        source: sources[0],
        sources,
      });
      continue;
    }

    current.sources = mergeSources(current.sources, sources);
    current.source = current.sources[0];
    current.allowedCssVariables = unique([
      ...(current.allowedCssVariables || []),
      ...(rule.allowedCssVariables || []),
    ]).sort();
  }

  return [...byFingerprint.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)) || String(a.scope).localeCompare(String(b.scope)));
}

function compileOfficialTemplateComponents(manifest) {
  const components = [];

  for (const item of manifest.officialSources || []) {
    if (item.status !== 'ok' || !item.rawPath) continue;
    const rawPath = path.join(rootDir, item.rawPath);
    if (!fs.existsSync(rawPath)) continue;

    const raw = fs.readFileSync(rawPath, 'utf8');
    for (const component of tagNames(raw)) {
      components.push({
        component,
        properties: [],
        events: [],
        methods: [],
        slots: [],
        sallaActions: extractSallaActions(raw),
        cssVariables: [],
        source: officialTemplateSource(
          { ...item, syncedAt: manifest.syncedAt },
          `Official Theme Raed template: ${path.basename(item.rawPath)}`,
        ),
      });
    }
  }

  return components;
}

function compileRaedThemeContract(manifest) {
  const readme = (manifest.officialSources || []).find((item) => item.status === 'ok' && (item.tags || []).includes('readme'));
  if (!readme?.rawPath) return null;

  const rawPath = path.join(rootDir, readme.rawPath);
  if (!fs.existsSync(rawPath)) return null;

  const raw = fs.readFileSync(rawPath, 'utf8');
  const usage = markdownSection(raw, 'Usage');
  const features = markdownSection(raw, 'Theme Features');
  const components = markdownSection(raw, 'Theme Components');

  return {
    subject: 'theme-raed-official-baseline',
    repository: 'https://github.com/SallaApp/theme-raed',
    role: {
      startingPoint: contains(raw, /starting point for developing Themes for Salla Stores/i),
      installedByDefault: contains(raw, /installed as the default theme/i),
      shippedWithTwilight: contains(raw, /shipped as the default theme along with the\s+\[?Twilight Themes/i),
      customUiComponents: contains(raw, /reusable custom UI components/i),
      hooksAndEvents: contains(raw, /JS events and hooks/i),
    },
    usage: {
      directoryStructure: {
        viewsComponentsHome: contains(usage, /src\/views\/components\/home/i) || contains(raw, /components[\s\S]*home/i),
        layoutsMaster: contains(usage, /master\.twig/i),
        pages: unique([...raw.matchAll(/\|\s+([a-z0-9-]+\.twig)/gi)].map((match) => match[1])),
      },
      previewCommands: unique([...raw.matchAll(/\bsalla theme (?:preview|p)\b/g)].map((match) => match[0])),
    },
    mainFeatures: {
      preDefinedThemeFeatures: markdownTableLinkedItems(features),
      customThemeComponents: markdownTableLinkedItems(components),
    },
    evidence: {
      overview: cleanText(markdownSection(raw, 'Overview')).slice(0, 600),
      usage: cleanText(usage).slice(0, 700),
      mainFeatures: cleanText(markdownSection(raw, 'Main Features')).slice(0, 900),
    },
    source: officialTemplateSource(
      { ...readme, syncedAt: manifest.syncedAt },
      'README / Usage / Main Features',
    ),
  };
}

function compileDocs() {
  ensureDir(generatedDir);
  const manifest = readJson(manifestPath);
  if (!manifest) {
    throw new Error('Docs manifest not found. Run: node factory.js docs sync');
  }

  const docs = (manifest.docs || []).filter((doc) => doc.status === 'ok' && doc.rawPath);
  const allowedComponents = [];
  const pageContracts = [];
  const templateComponents = [];
  const componentCatalogs = [];
  const componentsCustomizationContracts = [];
  const webComponentsUsageContracts = [];
  const twilightJsonContracts = [];
  const twigContracts = [];
  const officialTemplateComponents = compileOfficialTemplateComponents(manifest);
  const raedThemeContract = compileRaedThemeContract(manifest);

  for (const doc of docs) {
    const rawPath = path.join(rootDir, doc.rawPath);
    if (!fs.existsSync(rawPath)) continue;
    const raw = fs.readFileSync(rawPath, 'utf8');
    const text = htmlToText(raw);
    const compiledComponents = compileComponentDoc(doc, raw, text);
    allowedComponents.push(...compiledComponents);

    const page = compilePageDoc(doc, text, raw);
    if (page) pageContracts.push(page);

    const compiledTemplateComponents = compileTemplateComponentDoc(doc, text, raw);
    if (compiledTemplateComponents.length) templateComponents.push(...compiledTemplateComponents);

    const componentCatalog = compileComponentCatalogDoc(doc, raw);
    if (componentCatalog) componentCatalogs.push(componentCatalog);

    const componentsCustomization = compileComponentsCustomizationDoc(doc, raw);
    if (componentsCustomization) componentsCustomizationContracts.push(componentsCustomization);

    const webComponentsUsage = compileWebComponentsUsageDoc(doc, raw);
    if (webComponentsUsage) webComponentsUsageContracts.push(webComponentsUsage);

    const twilightJsonContract = compileTwilightJsonDoc(doc, raw);
    if (twilightJsonContract) twilightJsonContracts.push(twilightJsonContract);

    const twigContract = compileTwigDoc(doc, raw);
    if (twigContract) twigContracts.push(twigContract);
  }

  const rules = compileRules(docs);
  for (const rule of rules) {
    if (!/^salla-[a-z0-9-]+$/.test(rule.scope || '')) continue;
    allowedComponents.push({
      component: rule.scope,
      properties: [],
      events: [],
      methods: [],
      slots: [],
      cssVariables: [],
      source: rule.source,
    });
  }
  const mergedComponents = mergeComponents(allowedComponents);
  const mergedTemplateComponents = mergeTemplateComponents(templateComponents);
  const mergedOfficialTemplateComponents = mergeComponents(officialTemplateComponents);
  const mergedAllowedComponents = mergeComponents([...allowedComponents, ...officialTemplateComponents]);

  const docsIndex = {
    generatedAt: new Date().toISOString(),
    syncedAt: manifest.syncedAt,
    docs: docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      tags: doc.tags,
      sha256: doc.sha256,
    })),
  };

  writeJson(path.join(generatedDir, 'docs-index.json'), docsIndex);
  writeJson(path.join(generatedDir, 'allowed-components.json'), mergedAllowedComponents);
  writeJson(path.join(generatedDir, 'official-template-components.json'), mergedOfficialTemplateComponents);
  writeJson(path.join(generatedDir, 'raed-theme-contract.json'), raedThemeContract);
  writeJson(path.join(generatedDir, 'page-contracts.json'), pageContracts);
  writeJson(path.join(generatedDir, 'template-components.json'), mergedTemplateComponents);
  writeJson(path.join(generatedDir, 'component-catalog.json'), mergeComponentCatalogs(componentCatalogs));
  writeJson(path.join(generatedDir, 'components-customization-contract.json'), mergeComponentsCustomizationContracts(componentsCustomizationContracts));
  writeJson(path.join(generatedDir, 'web-components-usage-contract.json'), mergeWebComponentsUsageContracts(webComponentsUsageContracts));
  writeJson(path.join(generatedDir, 'twilight-json-contract.json'), mergeTwilightJsonContracts(twilightJsonContracts));
  writeJson(path.join(generatedDir, 'twig-contracts.json'), mergeTwigContracts(twigContracts));
  writeJson(path.join(generatedDir, 'rules.generated.json'), rules);
  writeDriftReport(manifest);

  console.log('✅ Compiled Salla docs intelligence');
  console.log(`   Components: ${mergedAllowedComponents.length}`);
  console.log(`   Official template components: ${mergedOfficialTemplateComponents.length}`);
  console.log(`   Raed theme contract: ${raedThemeContract ? 'yes' : 'no'}`);
  console.log(`   Page contracts: ${pageContracts.length}`);
  console.log(`   Template components: ${mergedTemplateComponents.length}`);
  console.log(`   Component catalogs: ${componentCatalogs.length}`);
  console.log(`   Components customization contracts: ${componentsCustomizationContracts.length}`);
  console.log(`   Web components usage contracts: ${webComponentsUsageContracts.length}`);
  console.log(`   Twilight json contracts: ${twilightJsonContracts.length}`);
  console.log(`   Twig contracts: ${twigContracts.length}`);
  console.log(`   Rules: ${rules.length}`);

  return {
    components: mergedAllowedComponents,
    pageContracts,
    rules,
    templateComponents: mergedTemplateComponents,
    componentCatalog: mergeComponentCatalogs(componentCatalogs),
    officialTemplateComponents: mergedOfficialTemplateComponents,
    raedThemeContract,
    componentsCustomizationContract: mergeComponentsCustomizationContracts(componentsCustomizationContracts),
    webComponentsUsageContract: mergeWebComponentsUsageContracts(webComponentsUsageContracts),
    twilightJsonContract: mergeTwilightJsonContracts(twilightJsonContracts),
    twigContracts,
  };
}

function mergeComponentsCustomizationContracts(contracts) {
  const valid = contracts.filter(Boolean);
  if (!valid.length) return null;

  const merged = {
    subject: 'js-web-components-ui-customization',
    allowedTargets: [],
    mechanisms: {
      tailwindConfig: { file: 'tailwind.config.js', editable: false, keys: [] },
      cssVariables: { allowed: false, sourceHint: 'https://docs.salla.dev/421945m0' },
      selfDevelopedCss: { allowed: false, awayFromTailwindUtilities: false },
      componentCssClasses: { allowed: false, examples: [] },
      scssFiles: { allowed: false },
    },
    safeguards: {
      preventHardCodedData: false,
      outputCssCompliesWithTailwindConfig: false,
      uiConsistency: false,
    },
    evidence: { howItWorks: '', customCss: '' },
    sources: [],
  };

  for (const contract of valid) {
    merged.allowedTargets = unique([...merged.allowedTargets, ...(contract.allowedTargets || [])]);
    merged.mechanisms.tailwindConfig.editable ||= Boolean(contract.mechanisms?.tailwindConfig?.editable);
    merged.mechanisms.tailwindConfig.keys = unique([
      ...merged.mechanisms.tailwindConfig.keys,
      ...(contract.mechanisms?.tailwindConfig?.keys || []),
    ]);
    merged.mechanisms.cssVariables.allowed ||= Boolean(contract.mechanisms?.cssVariables?.allowed);
    merged.mechanisms.selfDevelopedCss.allowed ||= Boolean(contract.mechanisms?.selfDevelopedCss?.allowed);
    merged.mechanisms.selfDevelopedCss.awayFromTailwindUtilities ||= Boolean(contract.mechanisms?.selfDevelopedCss?.awayFromTailwindUtilities);
    merged.mechanisms.componentCssClasses.allowed ||= Boolean(contract.mechanisms?.componentCssClasses?.allowed);
    merged.mechanisms.componentCssClasses.examples = unique([
      ...merged.mechanisms.componentCssClasses.examples,
      ...(contract.mechanisms?.componentCssClasses?.examples || []),
    ]);
    merged.mechanisms.scssFiles.allowed ||= Boolean(contract.mechanisms?.scssFiles?.allowed);
    for (const key of Object.keys(merged.safeguards)) {
      merged.safeguards[key] ||= Boolean(contract.safeguards?.[key]);
    }
    merged.evidence.howItWorks ||= contract.evidence?.howItWorks || '';
    merged.evidence.customCss ||= contract.evidence?.customCss || '';
    if (contract.source && !merged.sources.some((item) => sameSource(item, contract.source))) merged.sources.push(contract.source);
  }

  return merged;
}

function mergeWebComponentsUsageContracts(contracts) {
  const valid = contracts.filter(Boolean);
  if (!valid.length) return null;

  const merged = {
    subject: 'twilight-web-components-usage',
    runtimeModes: {
      twilightThemes: { autoInjected: false, bundleOrHtmlIncludeRequired: null, evidence: '' },
      bundlerEsModules: {
        allowedOutsideTwilightThemeRuntime: false,
        requires: [],
        package: '@salla.sa/twilight-components',
        installCommands: [],
        importPath: '',
        registrationFunctions: [],
        registersOn: '',
        evidence: '',
      },
      cdn: { allowedOutsideTwilightThemeRuntime: false, scriptType: '', src: '' },
    },
    tailwindConfig: {
      file: 'tailwind.config.js',
      foundation: '',
      plugin: '',
      requiresTemplatePaths: false,
      emptyCssRisk: false,
      safeListPath: '',
      documentedContentPaths: [],
      starterThemeIncludesTailwindConfig: false,
      evidence: '',
    },
    markupExamples: [],
    cssVariables: [],
    events: {
      recommendsDomEvents: false,
      customEventsDocumentedPerComponent: false,
      examples: [],
      whenDefined: [],
      evidence: '',
    },
    sources: [],
  };

  for (const contract of valid) {
    merged.runtimeModes.twilightThemes.autoInjected ||= Boolean(contract.runtimeModes?.twilightThemes?.autoInjected);
    if (contract.runtimeModes?.twilightThemes?.bundleOrHtmlIncludeRequired === false) {
      merged.runtimeModes.twilightThemes.bundleOrHtmlIncludeRequired = false;
    }
    merged.runtimeModes.twilightThemes.evidence ||= contract.runtimeModes?.twilightThemes?.evidence || '';

    merged.runtimeModes.bundlerEsModules.allowedOutsideTwilightThemeRuntime ||= Boolean(contract.runtimeModes?.bundlerEsModules?.allowedOutsideTwilightThemeRuntime);
    merged.runtimeModes.bundlerEsModules.requires = unique([
      ...merged.runtimeModes.bundlerEsModules.requires,
      ...(contract.runtimeModes?.bundlerEsModules?.requires || []),
    ]);
    merged.runtimeModes.bundlerEsModules.installCommands = unique([
      ...merged.runtimeModes.bundlerEsModules.installCommands,
      ...(contract.runtimeModes?.bundlerEsModules?.installCommands || []),
    ]);
    merged.runtimeModes.bundlerEsModules.importPath ||= contract.runtimeModes?.bundlerEsModules?.importPath || '';
    merged.runtimeModes.bundlerEsModules.registrationFunctions = unique([
      ...merged.runtimeModes.bundlerEsModules.registrationFunctions,
      ...(contract.runtimeModes?.bundlerEsModules?.registrationFunctions || []),
    ]);
    merged.runtimeModes.bundlerEsModules.registersOn ||= contract.runtimeModes?.bundlerEsModules?.registersOn || '';
    merged.runtimeModes.bundlerEsModules.evidence ||= contract.runtimeModes?.bundlerEsModules?.evidence || '';

    merged.runtimeModes.cdn.allowedOutsideTwilightThemeRuntime ||= Boolean(contract.runtimeModes?.cdn?.allowedOutsideTwilightThemeRuntime);
    merged.runtimeModes.cdn.scriptType ||= contract.runtimeModes?.cdn?.scriptType || '';
    merged.runtimeModes.cdn.src ||= contract.runtimeModes?.cdn?.src || '';

    merged.tailwindConfig.foundation ||= contract.tailwindConfig?.foundation || '';
    merged.tailwindConfig.plugin ||= contract.tailwindConfig?.plugin || '';
    merged.tailwindConfig.requiresTemplatePaths ||= Boolean(contract.tailwindConfig?.requiresTemplatePaths);
    merged.tailwindConfig.emptyCssRisk ||= Boolean(contract.tailwindConfig?.emptyCssRisk);
    merged.tailwindConfig.safeListPath ||= contract.tailwindConfig?.safeListPath || '';
    merged.tailwindConfig.documentedContentPaths = unique([
      ...merged.tailwindConfig.documentedContentPaths,
      ...(contract.tailwindConfig?.documentedContentPaths || []),
    ]);
    merged.tailwindConfig.starterThemeIncludesTailwindConfig ||= Boolean(contract.tailwindConfig?.starterThemeIncludesTailwindConfig);
    merged.tailwindConfig.evidence ||= contract.tailwindConfig?.evidence || '';

    merged.markupExamples = unique([...merged.markupExamples, ...(contract.markupExamples || [])]).sort();
    merged.cssVariables = unique([...merged.cssVariables, ...(contract.cssVariables || [])]).sort();
    merged.events.recommendsDomEvents ||= Boolean(contract.events?.recommendsDomEvents);
    merged.events.customEventsDocumentedPerComponent ||= Boolean(contract.events?.customEventsDocumentedPerComponent);
    merged.events.examples = unique([...merged.events.examples, ...(contract.events?.examples || [])]).sort();
    merged.events.whenDefined = unique([...merged.events.whenDefined, ...(contract.events?.whenDefined || [])]).sort();
    merged.events.evidence ||= contract.events?.evidence || '';

    if (contract.source && !merged.sources.some((item) => sameSource(item, contract.source))) merged.sources.push(contract.source);
  }

  return merged;
}

function mergeComponentCatalogs(catalogs) {
  const valid = catalogs.filter(Boolean);
  if (!valid.length) return null;

  const merged = {
    root: 'src/views/components/',
    characteristics: {
      reusable: false,
      strictTyping: false,
      defaultValues: false,
      requiredOnlyWhenMarked: false,
      customComponentsAllowed: false,
    },
    categories: [],
    overview: '',
    sources: [],
  };

  const byCategory = new Map();
  for (const catalog of valid) {
    for (const [key, value] of Object.entries(catalog.characteristics || {})) {
      merged.characteristics[key] = Boolean(merged.characteristics[key] || value);
    }
    merged.overview ||= catalog.overview || '';
    if (catalog.source && !merged.sources.some((item) => sameSource(item, catalog.source))) merged.sources.push(catalog.source);

    for (const category of catalog.categories || []) {
      const current = byCategory.get(category.id) || {
        id: category.id,
        title: category.title,
        location: category.location,
        items: [],
        docLinks: [],
        groups: [],
      };

      current.items = mergeCatalogItems(current.items, category.items);
      current.docLinks = mergeCatalogLinks(current.docLinks, category.docLinks);
      current.groups = mergeCatalogGroups(current.groups, category.groups || []);
      byCategory.set(category.id, current);
    }
  }

  merged.categories = [...byCategory.values()];
  return merged;
}

function mergeCatalogGroups(currentGroups, nextGroups) {
  const byId = new Map(currentGroups.map((group) => [group.id, group]));
  for (const group of nextGroups || []) {
    const current = byId.get(group.id) || {
      id: group.id,
      title: group.title,
      location: group.location,
      items: [],
      docLinks: [],
    };
    current.items = mergeCatalogItems(current.items, group.items);
    current.docLinks = mergeCatalogLinks(current.docLinks, group.docLinks);
    byId.set(group.id, current);
  }
  return [...byId.values()];
}

function mergeCatalogItems(current, next) {
  const byName = new Map(current.map((item) => [item.name.toLowerCase(), item]));
  for (const item of next || []) {
    const key = item.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, item);
  }
  return [...byName.values()];
}

function mergeCatalogLinks(current, next) {
  const byUrl = new Map(current.map((item) => [canonicalUrl(item.url), item]));
  for (const item of next || []) {
    const key = canonicalUrl(item.url);
    if (!byUrl.has(key)) byUrl.set(key, item);
  }
  return [...byUrl.values()];
}

function mergeTwilightJsonContracts(contracts) {
  const valid = contracts.filter(Boolean);
  if (!valid.length) return null;

  const merged = {
    file: 'twilight.json',
    rootPlacement: valid.some((contract) => contract.rootPlacement),
    sections: [],
    author: { keys: [] },
    settings: { requiredShape: [], retrieval: [], evidence: '' },
    features: { prefix: '', examples: [], bestPractice: false, evidence: '' },
    components: { schemaSection: 'components', pathMapsTo: 'src/views/components/{path.replace(".", "/")}.twig', example: {}, evidence: '' },
    sources: [],
  };

  for (const contract of valid) {
    merged.sections = unique([...merged.sections, ...(contract.sections || [])]);
    merged.author.keys = unique([...merged.author.keys, ...(contract.author?.keys || [])]);
    merged.settings.requiredShape = unique([...merged.settings.requiredShape, ...(contract.settings?.requiredShape || [])]);
    merged.settings.retrieval = unique([...merged.settings.retrieval, ...(contract.settings?.retrieval || [])]);
    merged.settings.evidence ||= contract.settings?.evidence || '';
    merged.features.prefix ||= contract.features?.prefix || '';
    merged.features.examples = unique([...merged.features.examples, ...(contract.features?.examples || [])]);
    merged.features.bestPractice = merged.features.bestPractice || Boolean(contract.features?.bestPractice);
    merged.features.evidence ||= contract.features?.evidence || '';
    merged.components.example = Object.keys(merged.components.example || {}).length ? merged.components.example : contract.components?.example || {};
    merged.components.evidence ||= contract.components?.evidence || '';
    if (contract.source && !merged.sources.some((item) => sameSource(item, contract.source))) merged.sources.push(contract.source);
  }

  merged.features.examples = merged.features.examples.sort();
  return merged;
}

function mergeTemplateComponents(contracts) {
  const byKey = new Map();

  for (const contract of contracts) {
    const key = contract.path || contract.name;
    if (!key) continue;

    const current = byKey.get(key) || {
      name: contract.name,
      path: contract.path,
      variables: [],
      components: [],
      sallaActions: [],
      sources: [],
      usage: contract.usage,
    };

    current.variables = unique([...current.variables, ...(contract.variables || [])]);
    current.components = unique([...current.components, ...(contract.components || [])]);
    current.sallaActions = unique([...current.sallaActions, ...(contract.sallaActions || [])]);
    if (!current.sources.some((item) => sameSource(item, contract.source))) current.sources.push(contract.source);
    byKey.set(key, current);
  }

  return [...byKey.values()].sort((a, b) => String(a.path || a.name).localeCompare(String(b.path || b.name)));
}

function mergeTwigContracts(contracts) {
  const merged = {
    helpers: [],
    filters: [],
    sources: [],
  };

  for (const contract of contracts) {
    merged.helpers = mergeNamedItems(merged.helpers, contract.helpers);
    merged.filters = mergeNamedItems(merged.filters, contract.filters);
    if (!merged.sources.some((item) => sameSource(item, contract.source))) {
      merged.sources.push(contract.source);
    }
  }

  return merged;
}

function mergeNamedItems(current, next) {
  const byName = new Map(current.map((item) => [item.name, item]));
  for (const item of next || []) {
    if (!byName.has(item.name)) byName.set(item.name, item);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function mergeComponents(components) {
  const byName = new Map();

  for (const component of components) {
    if (!component.component) continue;
    const current = byName.get(component.component) || {
      component: component.component,
      properties: [],
      events: [],
      methods: [],
      slots: [],
      sallaActions: [],
      cssVariables: [],
      sources: [],
    };

    current.properties = unique([...current.properties, ...component.properties]);
    current.events = unique([...current.events, ...component.events]);
    current.methods = unique([...current.methods, ...component.methods]);
    current.slots = unique([...current.slots, ...component.slots]);
    current.sallaActions = unique([...current.sallaActions, ...(component.sallaActions || [])]);
    current.cssVariables = unique([...current.cssVariables, ...component.cssVariables]);
    if (!current.sources.some((item) => canonicalUrl(item.url) === canonicalUrl(component.source.url) && item.section === component.source.section)) {
      current.sources.push(component.source);
    }
    byName.set(component.component, current);
  }

  return [...byName.values()].sort((a, b) => a.component.localeCompare(b.component));
}

function writeDriftReport(manifest) {
  const drift = manifest.drift || { added: [], changed: [], removed: [] };
  const lines = [
    '# Salla Docs Drift Report',
    '',
    `- Synced at: ${manifest.syncedAt}`,
    `- Added: ${drift.added.length}`,
    `- Changed: ${drift.changed.length}`,
    `- Removed: ${drift.removed.length}`,
    '',
    '## Changed',
    '',
    ...(drift.changed.length ? drift.changed.map((item) => `- ${item.title}: ${item.url}`) : ['- None']),
    '',
    '## Added',
    '',
    ...(drift.added.length ? drift.added.map((item) => `- ${item.title}: ${item.url}`) : ['- None']),
    '',
    '## Removed',
    '',
    ...(drift.removed.length ? drift.removed.map((item) => `- ${item.title}: ${item.url}`) : ['- None']),
    '',
  ];

  fs.writeFileSync(path.join(generatedDir, 'drift-report.md'), `${lines.join('\n')}\n`);
}

module.exports = {
  compileDocs,
};
