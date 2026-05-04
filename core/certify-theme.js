const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { isValidThemeName } = require('./policies/salla-theme-policy');

const themeName = process.argv[2];
const runSallaReview = process.argv.includes('--salla');
const strictDocs = process.argv.includes('--strict-docs');
const rootDir = path.join(__dirname, '..');
const themePath = path.join(rootDir, 'themes', themeName || '');
const reportsDir = path.join(rootDir, 'reports');
const reportPath = path.join(reportsDir, `certify-${themeName || 'unknown'}.md`);

const records = [];

function record(stage, status, detail) {
  records.push({
    stage,
    status,
    detail,
    time: new Date().toISOString(),
  });
}

function writeReport(finalStatus) {
  fs.mkdirSync(reportsDir, { recursive: true });

  const lines = [
    '# تقرير اعتماد المصنع',
    '',
    `- **الثيم:** ${themeName || 'unknown'}`,
    `- **التاريخ:** ${new Date().toLocaleString('ar-SA')}`,
    `- **الحالة:** ${finalStatus}`,
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
}

function failEarly(message) {
  record('Preflight', '❌', message);
  writeReport('❌ مرفوض');
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

const stages = [
  ['Salla docs intelligence gate', process.execPath, docsGateArgs],
  ['Policy gate', process.execPath, [path.join(__dirname, 'policy-check.js'), themeName]],
  ['Runtime fixtures gate', process.execPath, [path.join(__dirname, 'fixtures-check.js'), 'gate']],
  ['Experience registry gate', process.execPath, [path.join(__dirname, 'experience-factory.js'), 'gate', themeName]],
  ['Frozen dependency install', 'pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: themePath }],
  ['Production build', 'pnpm', ['run', 'production'], { cwd: themePath }],
  ['Integrity audit', process.execPath, [path.join(__dirname, 'factory-integrity.js'), themeName]],
  ['Local runtime preview', process.execPath, [path.join(__dirname, 'factory-preview.js'), themeName]],
];

let passed = true;
for (const [stage, command, args, options] of stages) {
  if (!runStage(stage, command, args, options)) {
    passed = false;
    break;
  }
}

if (passed && runSallaReview) {
  passed = runStage('Salla CLI review', 'salla', ['theme', 'review'], {
    cwd: themePath,
    timeout: 15 * 60 * 1000,
  });
} else if (passed) {
  record('Salla CLI review', '⏭️', 'تم تخطيها محلياً. شغّل الأمر مع --salla عند توفر تسجيل دخول Salla CLI.');
}

const finalStatus = passed ? '✅ مقبول محلياً' : '❌ مرفوض';
writeReport(finalStatus);

console.log(`\n📄 تقرير الاعتماد: ${path.relative(process.cwd(), reportPath)}`);

if (!passed) {
  process.exit(1);
}

console.log(`✅ الثيم [${themeName}] اجتاز اعتماد المصنع المحلي.`);
