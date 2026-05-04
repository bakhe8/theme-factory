const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { isValidThemeName } = require('./policies/salla-theme-policy');
const { createThemeFingerprint } = require('./theme-fingerprint');

const themeName = process.argv[2];
const args = process.argv.slice(3);
const requireSallaReview = args.includes('--salla') || args.includes('--require-salla') || process.env.FACTORY_REQUIRE_SALLA === '1';
const strictDocs = !args.includes('--relaxed-docs');
const templateCalibration = args.includes('--template-calibration');
const rootDir = path.join(__dirname, '..');
const themePath = path.join(rootDir, 'themes', themeName || '');
const reportsDir = path.join(rootDir, 'reports');
const reportPath = path.join(reportsDir, `certify-${themeName || 'unknown'}.md`);
const reportJsonPath = path.join(reportsDir, `certify-${themeName || 'unknown'}.json`);

const records = [];

function record(stage, status, detail) {
  records.push({
    stage,
    status,
    detail,
    time: new Date().toISOString(),
  });
}

function currentFingerprint() {
  if (!themeName || !fs.existsSync(themePath)) return null;
  return createThemeFingerprint(themePath);
}

function writeReport(finalStatus, meta = {}) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const completedAt = new Date().toISOString();
  const fingerprint = meta.themeFingerprint === undefined ? currentFingerprint() : meta.themeFingerprint;

  const lines = [
    '# تقرير اعتماد المصنع',
    '',
    `- **الثيم:** ${themeName || 'unknown'}`,
    `- **التاريخ:** ${new Date().toLocaleString('ar-SA')}`,
    `- **الحالة:** ${finalStatus}`,
    `- **اعتماد محلي:** ${meta.localCertified ? 'نعم' : 'لا'}`,
    `- **قابل للتسليم:** ${meta.deliverableRequired ? 'نعم' : 'لا - قالب معايرة/مصدر'}`,
    `- **مراجعة Salla CLI:** ${meta.sallaReviewed ? 'تمت' : 'لم تتم'}`,
    fingerprint ? `- **بصمة الثيم:** ${fingerprint.algorithm}:${fingerprint.hash}` : '- **بصمة الثيم:** غير متاحة',
    '',
    '## المراحل',
    '',
    ...records.map((item) => `- **${item.status} ${item.stage}:** ${item.detail}`),
    '',
    '## القرار',
    '',
    finalStatus.includes('مقبول')
      ? 'الثيم اجتاز بوابات المصنع المحلية. الاعتماد النهائي على منصة سلة يبقى عبر Salla CLI وحساب المطور عند الحاجة.'
      : 'الثيم لم يجتز الاعتماد. أصلح المرحلة الفاشلة ثم أعد تشغيل الأمر.',
    '',
  ];

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
  fs.writeFileSync(reportJsonPath, `${JSON.stringify({
    schema: 'salla-theme-factory/certification@1',
    theme: themeName || 'unknown',
    completed_at: completedAt,
    final_status: finalStatus,
    local_certified: meta.localCertified === true,
    deliverable_required: meta.deliverableRequired === true,
    template_calibration: meta.templateCalibration === true,
    salla_review_required: requireSallaReview,
    salla_reviewed: meta.sallaReviewed === true,
    theme_fingerprint: fingerprint,
    records,
  }, null, 2)}\n`);
}

function failEarly(message) {
  record('Preflight', '❌', message);
  writeReport('❌ مرفوض', {
    localCertified: false,
    deliverableRequired: !templateCalibration,
    templateCalibration,
    sallaReviewed: false,
    themeFingerprint: null,
  });
  console.error(`❌ ${message}`);
  console.error(`📄 التقرير: ${path.relative(process.cwd(), reportPath)}`);
  process.exit(1);
}

function runStage(stage, command, args, options = {}) {
  console.log(`\n== ${stage} ==`);
  try {
    execFileSync(command, args, {
      cwd: options.cwd || rootDir,
      stdio: 'inherit',
      shell: options.shell ?? (process.platform === 'win32' && command !== process.execPath),
      timeout: options.timeout || 10 * 60 * 1000,
    });
    record(stage, '✅', 'نجحت المرحلة');
    return true;
  } catch (error) {
    const reason = error.signal === 'SIGTERM'
      ? 'توقفت المرحلة بسبب انتهاء المهلة'
      : (error.message || 'فشلت المرحلة');
    record(stage, '❌', reason);
    return false;
  }
}

if (!themeName) {
  failEarly('يرجى تحديد اسم الثيم: node factory.js certify <theme-name>');
}

if (!isValidThemeName(themeName)) {
  failEarly('اسم الثيم غير صالح. استخدم kebab-case مثل: zen-theme');
}

if (!fs.existsSync(themePath)) {
  failEarly(`الثيم غير موجود: themes/${themeName}`);
}

console.log(`🏁 بدء اعتماد الثيم محلياً: ${themeName}`);

const docsGateArgs = [path.join(__dirname, 'intelligence-check.js'), 'gate', themeName];
if (strictDocs) docsGateArgs.push('--strict');

const workflowGateArgs = [path.join(__dirname, 'workflow-gate.js'), 'gate', themeName];
if (!templateCalibration) workflowGateArgs.push('--deliverable');

const stages = [
  ['Exception registry gate', process.execPath, [path.join(__dirname, 'exception-registry.js'), 'gate']],
  ['Salla docs intelligence gate', process.execPath, docsGateArgs],
  ['Factory workflow gate', process.execPath, workflowGateArgs],
  ['Specs contract gate', process.execPath, [path.join(__dirname, 'specs-gate.js'), 'gate', themeName]],
  ['Innovation gate', process.execPath, [path.join(__dirname, 'innovation-factory.js'), 'gate', themeName]],
  ['Factory display feature gate', process.execPath, [path.join(__dirname, 'display-feature-gate.js'), 'gate', themeName]],
  ['Policy gate', process.execPath, [path.join(__dirname, 'policy-check.js'), themeName]],
  ['Runtime fixtures gate', process.execPath, [path.join(__dirname, 'fixtures-check.js'), 'gate']],
  ['Store vertical gate', process.execPath, [path.join(__dirname, 'vertical-factory.js'), 'theme-gate', themeName]],
  ['Experience registry gate', process.execPath, [path.join(__dirname, 'experience-factory.js'), 'gate', themeName]],
  ['Page experience registry gate', process.execPath, [path.join(__dirname, 'page-experience-factory.js'), 'gate', themeName]],
  ['Salla page contract gate', process.execPath, [path.join(__dirname, 'page-contract-gate.js'), 'gate', themeName]],
  ['Integration gate', process.execPath, [path.join(__dirname, 'integration-factory.js'), 'gate', themeName]],
  ['Frozen dependency install', 'pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: themePath }],
  ['Production build', 'pnpm', ['run', 'production'], { cwd: themePath }],
  ['Integrity audit', process.execPath, [path.join(__dirname, 'factory-integrity.js'), themeName]],
  ['Local runtime preview', process.execPath, [path.join(__dirname, 'factory-preview.js'), themeName, '--all-pages', '--all-fixtures']],
  ['Page coverage gate', process.execPath, [path.join(__dirname, 'page-coverage.js'), themeName]],
  ['Link smoke gate', process.execPath, [path.join(__dirname, 'link-smoke.js'), themeName]],
  ['Browser smoke gate', process.execPath, [path.join(__dirname, 'browser-smoke.js'), themeName]],
];

let localPassed = true;
for (const [stage, command, args, options] of stages) {
  if (!runStage(stage, command, args, options)) {
    localPassed = false;
    break;
  }
}

let sallaReviewed = false;
let passed = localPassed;
if (localPassed && requireSallaReview) {
  passed = runStage('Salla CLI review', 'salla', ['theme', 'review'], {
    cwd: themePath,
    timeout: 15 * 60 * 1000,
  });
  sallaReviewed = passed;
} else if (localPassed) {
  record('Salla CLI review', '⏭️', 'تم تخطيها محلياً. استخدم --require-salla أو FACTORY_REQUIRE_SALLA=1 للاعتماد القابل للنشر.');
}

const finalStatus = passed
  ? (templateCalibration ? '✅ مقبول كقالب معايرة محلياً' : '✅ مقبول محلياً')
  : '❌ مرفوض';
writeReport(finalStatus, {
  localCertified: localPassed,
  deliverableRequired: !templateCalibration,
  templateCalibration,
  sallaReviewed,
});

console.log(`\n📄 تقرير الاعتماد: ${path.relative(process.cwd(), reportPath)}`);

if (!passed) {
  process.exit(1);
}

console.log(templateCalibration
  ? `✅ القالب [${themeName}] اجتاز معايرة المصنع المحلية، وليس مخرجاً قابلاً للتسليم.`
  : `✅ الثيم [${themeName}] اجتاز اعتماد المصنع المحلي.`);
