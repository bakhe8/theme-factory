const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { rootDir, workspacePath } = require('./factory-config');
const { createThemeFingerprint } = require('./theme-fingerprint');
const { validateWorkflow } = require('./workflow-gate');

const themeName = process.argv[2];
const args = process.argv.slice(3);
const skipCertify = args.includes('--skip-certify');
const themesDir = workspacePath('themes');
const reportsDir = workspacePath('reports');
const deliverablesDir = workspacePath('deliverables');

const EXCLUDED_THEME_ENTRIES = new Set([
  '.git',
  '.github',
  '.factory',
  '.salla-cache',
  '.turbo',
  '.cache',
  'node_modules',
  'build',
]);

const EXCLUDED_THEME_FILES = new Set([
  '.gitignore',
]);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function copyRecursive(source, destination) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) return;

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      if (EXCLUDED_THEME_ENTRIES.has(entry)) continue;
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  if (EXCLUDED_THEME_FILES.has(path.basename(source))) return;

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyIfExists(source, destination) {
  if (!fs.existsSync(source)) return false;
  const stat = fs.lstatSync(source);
  if (stat.isDirectory()) {
    fs.cpSync(source, destination, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return true;
}

function runCertify() {
  execFileSync(process.execPath, [path.join(__dirname, 'certify-theme.js'), themeName], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

function loadCertification() {
  const reportJson = path.join(reportsDir, `certify-${themeName}.json`);
  if (!fs.existsSync(reportJson)) {
    fail(`لا يوجد تقرير اعتماد منظم وحديث: ${path.relative(rootDir, reportJson)}. شغل certify أو احذف --skip-certify.`);
  }

  try {
    return { path: reportJson, data: readJson(reportJson) };
  } catch (error) {
    fail(`تقرير الاعتماد المنظم غير صالح: ${path.relative(rootDir, reportJson)} - ${error.message}`);
  }
}

function assertFreshCertification(themePath) {
  const current = createThemeFingerprint(themePath);
  const certification = loadCertification();
  const data = certification.data;

  if (data.schema !== 'salla-theme-factory/certification@1') {
    fail(`تقرير الاعتماد لا يحمل schema معروفاً: ${path.relative(rootDir, certification.path)}`);
  }
  if (data.theme !== themeName) {
    fail(`تقرير الاعتماد يخص ثيماً آخر: ${data.theme || '-'}`);
  }
  if (data.local_certified !== true || !String(data.final_status || '').includes('مقبول')) {
    fail('لا يمكن التسليم لأن آخر تقرير اعتماد محلي ليس مقبولاً.');
  }
  if (data.deliverable_required !== true || data.template_calibration === true) {
    fail('لا يمكن التسليم بتقرير خاص بقالب معايرة أو source-template.');
  }
  if (!data.theme_fingerprint?.hash) {
    fail('تقرير الاعتماد لا يحتوي بصمة ثيم؛ أعد تشغيل certify.');
  }
  if (data.theme_fingerprint.hash !== current.hash) {
    fail([
      'تقرير الاعتماد قديم ولا يطابق الثيم الحالي.',
      `بصمة التقرير: ${data.theme_fingerprint.hash}`,
      `بصمة الثيم الآن: ${current.hash}`,
      'أعد تشغيل: node factory.js certify ' + themeName,
    ].join('\n'));
  }

  return {
    certification: data,
    certificationPath: certification.path,
    currentFingerprint: current,
  };
}

if (!themeName) {
  fail('الاستخدام: node factory.js deliver <theme-name> [--skip-certify]');
}

const themePath = path.join(themesDir, themeName);
if (!fs.existsSync(themePath)) {
  fail(`الثيم غير موجود: themes/${themeName}`);
}

const workflow = validateWorkflow(themeName, { requireDeliverable: true });
if (workflow.issues.length) {
  for (const issue of workflow.issues) console.error(`❌ ${issue}`);
  fail('لا يمكن إنشاء التسليم لأن الثيم لا يجتاز Factory Workflow Gate.');
}

if (!skipCertify) {
  runCertify();
}

const certificationState = assertFreshCertification(themePath);

const deliveryRoot = path.join(deliverablesDir, themeName);
const themeDeliveryPath = path.join(deliveryRoot, 'theme');
const reportsDeliveryPath = path.join(deliveryRoot, 'reports');

fs.rmSync(deliveryRoot, { recursive: true, force: true });
copyRecursive(themePath, themeDeliveryPath);

const reportFiles = [
  `certify-${themeName}.md`,
  `certify-${themeName}.json`,
  `audit-${themeName}.md`,
  `page-contract-${themeName}.md`,
  `page-contract-${themeName}.json`,
  `page-coverage-${themeName}.json`,
  `link-smoke-${themeName}.json`,
];

const copiedReports = [];
for (const report of reportFiles) {
  if (copyIfExists(path.join(reportsDir, report), path.join(reportsDeliveryPath, report))) {
    copiedReports.push(report);
  }
}

if (copyIfExists(path.join(reportsDir, 'browser-smoke', themeName), path.join(reportsDeliveryPath, 'browser-smoke', themeName))) {
  copiedReports.push(`browser-smoke/${themeName}`);
}

const manifest = {
  schema: 'salla-theme-factory/delivery@1',
  theme: themeName,
  created_at: new Date().toISOString(),
  source_theme: path.relative(rootDir, themePath).replace(/\\/g, '/'),
  deliverable_theme_path: path.relative(rootDir, themeDeliveryPath).replace(/\\/g, '/'),
  reports: copiedReports,
  certified: true,
  local_certified: true,
  salla_reviewed: certificationState.certification.salla_reviewed === true,
  certification: {
    report: path.relative(rootDir, certificationState.certificationPath).replace(/\\/g, '/'),
    completed_at: certificationState.certification.completed_at,
    final_status: certificationState.certification.final_status,
    theme_fingerprint: certificationState.currentFingerprint,
  },
};

fs.mkdirSync(deliveryRoot, { recursive: true });
fs.writeFileSync(path.join(deliveryRoot, 'delivery-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\n✅ تم تجهيز مجلد التسليم للثيم: ${themeName}`);
console.log(`📦 ${path.relative(process.cwd(), deliveryRoot)}`);
console.log(`📁 الثيم الجاهز: ${path.relative(process.cwd(), themeDeliveryPath)}`);
console.log(`📄 manifest: ${path.relative(process.cwd(), path.join(deliveryRoot, 'delivery-manifest.json'))}`);
