const fs = require('fs');
const path = require('path');
const { findException } = require('./exception-registry');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');
const contractsPath = path.join(__dirname, 'docs-intelligence', 'generated', 'page-contracts.json');
const reportsDir = path.join(rootDir, 'reports');

const PAGE_TEMPLATE_MAP = {
  cart: 'src/views/pages/cart.twig',
  home: 'src/views/pages/index.twig',
  landing: 'src/views/pages/landing-page.twig',
  loyalty: 'src/views/pages/loyalty.twig',
  notifications: 'src/views/pages/customer/notifications.twig',
  orders: 'src/views/pages/customer/orders/single.twig',
  wishlist: 'src/views/pages/customer/wishlist.twig',
};

const OFFICIAL_EQUIVALENTS = {
  notifications: {
    components: {
      'salla-infinite-scroll': ['<salla-notifications'],
    },
    variables: {
      notifications: ['<salla-notifications', 'customer:notifications'],
    },
  },
  wishlist: {
    components: {
      'salla-add-product-button': ['source="wishlist"', "source='wishlist'"],
      'salla-button': ['source="wishlist"', "source='wishlist'"],
    },
    variables: {
      products: ['source="wishlist"', "source='wishlist'"],
    },
  },
  cart: {
    components: {
      'salla-loyalty': ['<salla-loyalty-panel'],
    },
  },
};

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function rel(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/');
}

function stripTwigComments(content) {
  return content.replace(/\{#[\s\S]*?#\}/g, '');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsComponent(content, component) {
  return new RegExp(`<\\s*${escapeRegex(component)}(?:\\s|>|/)`, 'i').test(content);
}

function containsVariable(activeContent, variable) {
  const root = String(variable).split('.')[0];
  const exact = escapeRegex(variable).replace(/\\\./g, '\\s*\\.\\s*');
  const rootPattern = escapeRegex(root);

  return new RegExp(`\\b${exact}\\b`).test(activeContent)
    || new RegExp(`\\{[{%][\\s\\S]{0,120}\\b${rootPattern}\\b`).test(activeContent);
}

function hasEquivalent(content, page, kind, key) {
  const equivalents = OFFICIAL_EQUIVALENTS[page]?.[kind]?.[key] || [];
  return equivalents.some((marker) => content.includes(marker));
}

function issue(result, file, detail) {
  result.issues.push({ file, detail });
}

function warning(result, file, detail) {
  result.warnings.push({ file, detail });
}

function exception(result, file, detail, matchedException) {
  result.exceptions.push({
    file,
    detail,
    exceptionId: matchedException.id,
    decision: matchedException.decision,
    reviewDue: matchedException.review_due === true,
  });
}

function loadPageContracts() {
  const contracts = readJson(contractsPath, []);
  return Array.isArray(contracts) ? contracts : [];
}

function validatePageContract(themeName, contract, options = {}) {
  const themePath = path.join(themesDir, themeName);
  const templateRel = PAGE_TEMPLATE_MAP[contract.page];
  const result = {
    page: contract.page,
    source: contract.source || null,
    template: templateRel || null,
    variables: contract.variables || [],
    components: contract.components || [],
    issues: [],
    warnings: [],
    exceptions: [],
  };

  if (!templateRel) {
    issue(result, 'page-contracts', `لا يوجد mapping محلي لعقد صفحة سلة: ${contract.page}`);
    return result;
  }

  const templatePath = path.join(themePath, templateRel);
  if (!fs.existsSync(templatePath)) {
    issue(result, rel(templatePath), `قالب الصفحة الموثقة غير موجود: ${templateRel}`);
    return result;
  }

  const content = readText(templatePath);
  const activeContent = stripTwigComments(content);

  if (contract.hooksDocumented && !/\{%\s*hook\s+['"][^'"]+['"]\s*%}/.test(activeContent)) {
    issue(result, rel(templatePath), `وثائق سلة تذكر hooks لهذه الصفحة، لكن القالب لا يحتوي أي hook`);
  }

  for (const variable of contract.variables || []) {
    const root = String(variable).split('.')[0];
    if (!containsVariable(activeContent, variable) && !hasEquivalent(activeContent, contract.page, 'variables', root)) {
      warning(result, rel(templatePath), `متغير موثق في سلة لا يظهر في منطق الصفحة: ${variable}`);
    }
  }

  for (const component of contract.components || []) {
    if (containsComponent(activeContent, component) || hasEquivalent(activeContent, contract.page, 'components', component)) continue;
    const detail = `Web Component مذكور في عقد صفحة سلة ولا يظهر في القالب: ${component}`;
    const matchedException = findException({
      category: 'page-contract.web-component-missing',
      gate: 'page-contract-gate',
      theme: themeName,
      page: contract.page,
      component,
      file: rel(templatePath),
    });
    if (matchedException) {
      exception(result, rel(templatePath), `${detail} (مقبول عبر Exception Registry: ${matchedException.id})`, matchedException);
      continue;
    }
    if (options.strictComponents) issue(result, rel(templatePath), detail);
    else warning(result, rel(templatePath), detail);
  }

  return result;
}

function validateThemePageContracts(themeName, options = {}) {
  const result = {
    schema: 'salla-theme-factory/page-contract-gate@1',
    theme: themeName,
    contracts_source: rel(contractsPath),
    checked_at: new Date().toISOString(),
    strict_components: options.strictComponents === true,
    checked: [],
    issues: [],
    warnings: [],
    exceptions: [],
  };

  const themePath = path.join(themesDir, themeName);
  if (!themeName || !fs.existsSync(themePath)) {
    issue(result, `themes/${themeName || 'unknown'}`, `الثيم غير موجود`);
    return result;
  }

  const contracts = loadPageContracts();
  if (!contracts.length) {
    issue(result, rel(contractsPath), `عقود الصفحات غير مولدة. شغل: node factory.js docs sync`);
    return result;
  }

  for (const contract of contracts) {
    const pageResult = validatePageContract(themeName, contract, options);
    result.checked.push(pageResult);
    for (const item of pageResult.issues) issue(result, item.file, `[${contract.page}] ${item.detail}`);
    for (const item of pageResult.warnings) warning(result, item.file, `[${contract.page}] ${item.detail}`);
    for (const item of pageResult.exceptions) {
      result.exceptions.push({
        ...item,
        detail: `[${contract.page}] ${item.detail}`,
      });
    }
  }

  return result;
}

function writeReport(result) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonPath = path.join(reportsDir, `page-contract-${result.theme}.json`);
  const mdPath = path.join(reportsDir, `page-contract-${result.theme}.md`);

  const lines = [
    '# تقرير عقود صفحات سلة',
    '',
    `- **الثيم:** ${result.theme}`,
    `- **التاريخ:** ${new Date(result.checked_at).toLocaleString('ar-SA')}`,
    `- **مصدر العقود:** ${result.contracts_source}`,
    `- **عدد العقود:** ${result.checked.length}`,
    `- **المشاكل:** ${result.issues.length}`,
    `- **التحذيرات:** ${result.warnings.length}`,
    `- **الاستثناءات المقبولة:** ${result.exceptions.length}`,
    '',
    '## الصفحات',
    '',
    ...result.checked.map((page) => `- **${page.page}:** ${page.template || '-'} - issues=${page.issues.length}, warnings=${page.warnings.length}`),
    '',
    '## المشاكل',
    '',
    ...(result.issues.length ? result.issues.map((item) => `- ${item.file}: ${item.detail}`) : ['- لا توجد']),
    '',
    '## التحذيرات',
    '',
    ...(result.warnings.length ? result.warnings.map((item) => `- ${item.file}: ${item.detail}`) : ['- لا توجد']),
    '',
    '## الاستثناءات المقبولة',
    '',
    ...(result.exceptions.length ? result.exceptions.map((item) => `- ${item.file}: ${item.detail}`) : ['- لا توجد']),
    '',
  ];

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);

  return { jsonPath, mdPath };
}

function printGate(themeName, options = {}) {
  const result = validateThemePageContracts(themeName, options);
  const report = writeReport(result);

  console.log(`\n📄 Page Contract Gate | ${themeName}`);
  console.log('----------------------------------------');
  console.log(`Contracts: ${result.checked.length}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Exceptions: ${result.exceptions.length}`);

  for (const item of result.issues) console.log(`❌ ${item.file}: ${item.detail}`);
  for (const item of result.warnings) console.log(`⚠️ ${item.file}: ${item.detail}`);
  for (const item of result.exceptions) console.log(`🧾 ${item.file}: ${item.detail}`);

  console.log(`\nReport: ${rel(report.mdPath)}`);
  console.log(result.issues.length ? '❌ Page contract gate failed.' : '✅ Page contract gate passed.');

  return result;
}

function printList() {
  const contracts = loadPageContracts();
  console.log('\n📄 Salla Page Contracts');
  console.log('----------------------------------------');
  for (const contract of contracts) {
    console.log(`- ${contract.page}: variables=${(contract.variables || []).length}, components=${(contract.components || []).length}, hooks=${contract.hooksDocumented ? 'yes' : 'no'}`);
  }
}

function printShow(page) {
  const contract = loadPageContracts().find((item) => item.page === page);
  if (!contract) {
    console.error(`❌ Page contract not found: ${page}`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(contract, null, 2));
}

function main() {
  const command = process.argv[2] || 'gate';
  const args = process.argv.slice(3);
  const strictComponents = args.includes('--strict-components');
  const filtered = args.filter((arg) => !arg.startsWith('--'));

  switch (command) {
    case 'list':
      printList();
      break;

    case 'show':
      printShow(filtered[0]);
      break;

    case 'gate': {
      const themeName = filtered[0];
      if (!themeName) {
        console.error('❌ Usage: node factory.js page-contract gate <theme> [--strict-components]');
        process.exit(1);
      }
      const result = printGate(themeName, { strictComponents });
      if (result.issues.length) process.exitCode = 1;
      break;
    }

    default:
      console.log('Available page-contract commands:');
      console.log('  node factory.js page-contract list');
      console.log('  node factory.js page-contract show <page>');
      console.log('  node factory.js page-contract gate <theme> [--strict-components]');
      process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadPageContracts,
  validatePageContract,
  validateThemePageContracts,
};
