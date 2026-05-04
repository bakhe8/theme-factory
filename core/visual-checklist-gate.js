const fs = require('fs');
const path = require('path');
const { rootDir, workspacePath } = require('./factory-config');
const { createThemeFingerprint } = require('./theme-fingerprint');

const args = process.argv.slice(2);
const command = ['gate', 'template', 'show'].includes(args[0]) ? args[0] : 'gate';
const themeName = command === 'gate' && args[0] !== 'gate' && args[0] !== 'show' && args[0] !== 'template'
  ? args[0]
  : args[1];
const rest = command === 'gate' && args[0] !== 'gate' ? args.slice(1) : args.slice(2);

const themesDir = workspacePath('themes');
const reportsDir = workspacePath('reports');
const checklistDir = path.join(rootDir, 'quality', 'visual-checklists');
const reportJsonPath = path.join(reportsDir, `visual-checklist-${themeName || 'unknown'}.json`);
const reportMdPath = path.join(reportsDir, `visual-checklist-${themeName || 'unknown'}.md`);

const REQUIRED_DECISIONS = [
  ['distinct_from_raed', 'الثيم مختلف بصرياً عن Raed وليس مجرد تعديل ألوان'],
  ['selling_experiences_visible', 'تجارب البيع المطلوبة ظاهرة ومفهومة'],
  ['product_cards_actionable', 'بطاقات المنتج تعرض صورة وسعر وحالة وزر إجراء واضح'],
  ['cart_checkout_flow_reviewed', 'السلة وتدفق الشراء تمت مراجعتهما بصرياً'],
  ['rtl_layout_reviewed', 'RTL تمت مراجعته بصرياً'],
  ['mobile_layout_reviewed', 'mobile تمت مراجعته بصرياً'],
  ['empty_state_reviewed', 'حالات المتجر الفارغ تمت مراجعتها'],
  ['text_fits_without_overlap', 'النصوص لا تتداخل ولا تخرج من الحاويات'],
  ['twilight_components_reviewed', 'مكوّنات Twilight الرسمية تمت مراجعتها عبر التقرير'],
  ['screenshots_reviewed', 'صور browser smoke تمت مراجعتها'],
];

const REQUIRED_REPORTS = [
  { id: 'page-coverage', file: (theme) => `page-coverage-${theme}.json` },
  { id: 'link-smoke', file: (theme) => `link-smoke-${theme}.json` },
  { id: 'rtl', file: (theme) => `rtl-${theme}.json` },
  { id: 'twilight-smoke', file: (theme) => `twilight-smoke-${theme}.json` },
  { id: 'browser-smoke', directory: (theme) => path.join('browser-smoke', theme) },
];

const REQUIRED_PAGE_COVERAGE = [
  { id: 'home', pattern: /\/index\.html$/ },
  { id: 'listing', pattern: /\/(products\.html|categories\/.+\.html)$/ },
  { id: 'product', pattern: /\/(product\.html|products\/.+\.html)$/ },
  { id: 'cart', pattern: /\/cart\.html$/ },
  { id: 'customer-order', pattern: /\/customer\/orders(\/.+)?\.html$/ },
  { id: 'offer-or-landing', pattern: /\/offers\/summer\.html$/ },
  { id: 'empty-store', pattern: /\/empty-store\// },
];

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function checklistPath(theme, options = {}) {
  const explicit = options.checklist || rest.find((arg) => arg.startsWith('--checklist='))?.split('=')[1];
  return explicit ? path.resolve(rootDir, explicit) : path.join(checklistDir, `${theme}.json`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function relative(file) {
  return toPosix(path.relative(rootDir, file));
}

function defaultChecklist(theme) {
  const themePath = path.join(themesDir, theme || '');
  const fingerprint = fs.existsSync(themePath) ? createThemeFingerprint(themePath) : null;
  return {
    schema: 'salla-theme-factory/visual-checklist@1',
    theme,
    reviewed_at: new Date().toISOString(),
    reviewer: 'ضع اسم المراجع هنا',
    theme_fingerprint: fingerprint ? {
      algorithm: fingerprint.algorithm,
      hash: fingerprint.hash,
    } : null,
    reviewed_reports: REQUIRED_REPORTS.map((item) => item.id),
    required_decisions: Object.fromEntries(REQUIRED_DECISIONS.map(([id]) => [id, false])),
    sampled_pages: [
      { path: `build/${theme}/fragrance-luxury/index.html`, viewport: 'desktop', checked: false, notes: '' },
      { path: `build/${theme}/fragrance-luxury/index.html`, viewport: 'mobile', checked: false, notes: '' },
      { path: `build/${theme}/fragrance-luxury/product.html`, viewport: 'desktop', checked: false, notes: '' },
      { path: `build/${theme}/fragrance-luxury/products.html`, viewport: 'desktop', checked: false, notes: '' },
      { path: `build/${theme}/fragrance-luxury/cart.html`, viewport: 'desktop', checked: false, notes: '' },
      { path: `build/${theme}/checkout-flow/cart.html`, viewport: 'mobile', checked: false, notes: '' },
      { path: `build/${theme}/checkout-flow/customer/orders/9001.html`, viewport: 'desktop', checked: false, notes: '' },
      { path: `build/${theme}/fragrance-luxury/offers/summer.html`, viewport: 'desktop', checked: false, notes: '' },
      { path: `build/${theme}/empty-store/index.html`, viewport: 'desktop', checked: false, notes: '' },
    ],
    blocking_issues: [],
    followups: [],
    notes: '',
  };
}

function validateChecklist(theme, options = {}) {
  const themePath = path.join(themesDir, theme || '');
  const file = checklistPath(theme, options);
  const result = {
    schema: 'salla-theme-factory/visual-checklist-report@1',
    theme,
    checked_at: new Date().toISOString(),
    checklist_path: relative(file),
    current_fingerprint: null,
    issues: [],
    warnings: [],
    checklist: null,
  };

  if (!theme || !fs.existsSync(themePath)) {
    result.issues.push(`الثيم غير موجود: themes/${theme || '-'}`);
    return result;
  }

  const fingerprint = createThemeFingerprint(themePath);
  result.current_fingerprint = {
    algorithm: fingerprint.algorithm,
    hash: fingerprint.hash,
    files: fingerprint.files,
    bytes: fingerprint.bytes,
  };

  if (!fs.existsSync(file)) {
    result.issues.push(`ملف المراجعة البصرية مفقود: ${relative(file)}. أنشئه عبر: node factory.js visual template ${theme}`);
    return result;
  }

  let checklist;
  try {
    checklist = readJson(file);
    result.checklist = checklist;
  } catch (error) {
    result.issues.push(`ملف المراجعة البصرية غير صالح JSON: ${relative(file)} - ${error.message}`);
    return result;
  }

  if (checklist.schema !== 'salla-theme-factory/visual-checklist@1') {
    result.issues.push(`schema غير معروف في ${relative(file)}`);
  }
  if (checklist.theme !== theme) {
    result.issues.push(`ملف المراجعة يخص ثيماً آخر: ${checklist.theme || '-'}`);
  }
  if (!checklist.reviewer || checklist.reviewer === 'ضع اسم المراجع هنا') {
    result.issues.push('reviewer مطلوب في ملف المراجعة البصرية');
  }
  if (!checklist.reviewed_at || Number.isNaN(Date.parse(checklist.reviewed_at))) {
    result.issues.push('reviewed_at مطلوب ويجب أن يكون ISO date صالحاً');
  }

  if (checklist.theme_fingerprint?.hash !== fingerprint.hash) {
    result.issues.push([
      'بصمة الثيم في visual checklist لا تطابق الثيم الحالي.',
      `checklist: ${checklist.theme_fingerprint?.hash || '-'}`,
      `current: ${fingerprint.hash}`,
      'راجع المعاينات ثم حدّث theme_fingerprint.hash.',
    ].join(' '));
  }

  const decisions = checklist.required_decisions || {};
  for (const [id, label] of REQUIRED_DECISIONS) {
    if (decisions[id] !== true) result.issues.push(`قرار بصري غير مكتمل: ${id} - ${label}`);
  }

  const reviewedReports = new Set(checklist.reviewed_reports || []);
  for (const report of REQUIRED_REPORTS) {
    if (!reviewedReports.has(report.id)) {
      result.issues.push(`reviewed_reports يجب أن يتضمن: ${report.id}`);
    }

    const reportPath = report.file
      ? path.join(reportsDir, report.file(theme))
      : path.join(reportsDir, report.directory(theme));
    if (!fs.existsSync(reportPath)) {
      result.issues.push(`تقرير مطلوب للمراجعة غير موجود: ${relative(reportPath)}`);
    }
  }

  const pages = Array.isArray(checklist.sampled_pages) ? checklist.sampled_pages : [];
  if (pages.length < 8) {
    result.issues.push('sampled_pages يجب أن تحتوي 8 عينات على الأقل');
  }

  const checkedPages = pages.filter((page) => page && page.checked === true);
  if (checkedPages.length !== pages.length) {
    result.issues.push('كل sampled_pages يجب أن تكون checked=true');
  }

  const viewports = new Set(pages.map((page) => page.viewport).filter(Boolean));
  if (!viewports.has('desktop')) result.issues.push('sampled_pages يجب أن تتضمن viewport=desktop');
  if (!viewports.has('mobile')) result.issues.push('sampled_pages يجب أن تتضمن viewport=mobile');

  const normalizedPages = pages.map((page) => toPosix(page.path));
  for (const required of REQUIRED_PAGE_COVERAGE) {
    if (!normalizedPages.some((pagePath) => required.pattern.test(pagePath))) {
      result.issues.push(`sampled_pages لا تغطي صفحة إلزامية: ${required.id}`);
    }
  }

  for (const page of pages) {
    if (!page?.path) {
      result.issues.push('كل عينة في sampled_pages يجب أن تحتوي path');
      continue;
    }
    const absolute = path.resolve(rootDir, page.path);
    if (!absolute.startsWith(rootDir) || !fs.existsSync(absolute)) {
      result.issues.push(`صفحة معاينة غير موجودة في sampled_pages: ${page.path}`);
    }
  }

  if (Array.isArray(checklist.blocking_issues) && checklist.blocking_issues.length) {
    result.issues.push(`توجد blocking_issues مفتوحة: ${checklist.blocking_issues.join('; ')}`);
  }

  if (!checklist.notes || String(checklist.notes).trim().length < 20) {
    result.warnings.push('notes قصيرة؛ يفضّل توثيق ملاحظات المراجعة البصرية باختصار مفيد');
  }

  return result;
}

function writeReport(result) {
  fs.mkdirSync(reportsDir, { recursive: true });
  writeJson(reportJsonPath, result);

  const lines = [
    '# تقرير المراجعة البصرية',
    '',
    `- **الثيم:** ${result.theme || '-'}`,
    `- **التاريخ:** ${new Date(result.checked_at).toLocaleString('ar-SA')}`,
    `- **الملف:** ${result.checklist_path}`,
    `- **المشاكل:** ${result.issues.length}`,
    `- **التحذيرات:** ${result.warnings.length}`,
    '',
    '## المشاكل',
    '',
    ...(result.issues.length ? result.issues.map((issue) => `- ${issue}`) : ['- لا توجد']),
    '',
    '## التحذيرات',
    '',
    ...(result.warnings.length ? result.warnings.map((warning) => `- ${warning}`) : ['- لا توجد']),
    '',
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`);
}

function printResult(result) {
  console.log(`\n👁️ Visual Checklist Gate | ${result.theme || '-'}`);
  console.log('----------------------------------------');
  console.log(`Checklist: ${result.checklist_path}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);
  console.log(`Report: ${path.relative(process.cwd(), reportMdPath)}`);
}

function runTemplate(theme) {
  if (!theme) {
    console.error('Usage: node factory.js visual template <theme>');
    process.exit(1);
  }
  const file = checklistPath(theme);
  if (fs.existsSync(file) && !rest.includes('--force')) {
    console.error(`❌ الملف موجود مسبقاً: ${relative(file)}. استخدم --force للاستبدال.`);
    process.exit(1);
  }
  writeJson(file, defaultChecklist(theme));
  console.log(`✅ تم إنشاء قالب المراجعة البصرية: ${relative(file)}`);
}

function runGate(theme) {
  const result = validateChecklist(theme);
  writeReport(result);
  printResult(result);
  if (result.issues.length) {
    console.log('\n❌ Visual checklist gate failed.');
    process.exit(1);
  }
  console.log('\n✅ Visual checklist gate passed.');
}

function runShow(theme) {
  const file = checklistPath(theme);
  if (!fs.existsSync(file)) {
    console.error(`❌ لا يوجد ملف مراجعة: ${relative(file)}`);
    process.exit(1);
  }
  console.log(fs.readFileSync(file, 'utf8'));
}

if (command === 'template') runTemplate(themeName);
else if (command === 'show') runShow(themeName);
else runGate(themeName);

module.exports = {
  REQUIRED_DECISIONS,
  validateChecklist,
};
