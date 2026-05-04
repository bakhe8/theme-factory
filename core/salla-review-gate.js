const fs = require('fs');
const path = require('path');
const { createThemeFingerprint } = require('./theme-fingerprint');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');
const qualityDir = path.join(rootDir, 'quality', 'salla-reviews');
const reportsDir = path.join(rootDir, 'reports');
const schema = 'salla-theme-factory/salla-review@1';

const HELP = `
Usage:
  node factory.js salla-review list
  node factory.js salla-review show <theme>
  node factory.js salla-review template <theme> [--waiver] [--dry-run]
  node factory.js salla-review gate <theme>

Examples:
  node factory.js salla-review template luxury-fragrance
  node factory.js salla-review gate luxury-fragrance
`;

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function rel(filePath) {
  return toPosix(path.relative(rootDir, filePath));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function reviewPath(themeName) {
  return path.join(qualityDir, `${themeName}.json`);
}

function certificationPath(themeName) {
  return path.join(reportsDir, `certify-${themeName}.json`);
}

function reviewReportPath(themeName) {
  return path.join(reportsDir, `salla-review-${themeName}.md`);
}

function reviewReportJsonPath(themeName) {
  return path.join(reportsDir, `salla-review-${themeName}.json`);
}

function isExpired(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) && time < Date.now();
}

function currentThemeFingerprint(themeName) {
  const themePath = path.join(themesDir, themeName || '');
  if (!themeName || !fs.existsSync(themePath)) return null;
  return createThemeFingerprint(themePath);
}

function loadCertification(themeName) {
  const file = certificationPath(themeName);
  const data = readJson(file, null);
  return { file, data };
}

function expectedTemplate(themeName, options = {}) {
  const fingerprint = currentThemeFingerprint(themeName);
  const certification = loadCertification(themeName);
  const status = options.waiver ? 'waived' : 'pending';

  return {
    schema,
    theme: themeName,
    status,
    created_at: new Date().toISOString(),
    theme_fingerprint: fingerprint,
    local_certification_report: rel(certification.file),
    salla_review: {
      environment: 'partner-portal',
      reviewed_at: '',
      reviewed_by: '',
      store_url: '',
      result: status === 'waived' ? 'waived' : 'pending',
      notes: '',
    },
    evidence: [
      {
        type: 'screenshot-or-report',
        path_or_url: '',
        notes: '',
      },
    ],
    waiver: options.waiver
      ? {
          approved_by: '',
          reason: '',
          expires_at: '',
          risk_accepted: false,
        }
      : null,
  };
}

function validateSallaReview(themeName) {
  const issues = [];
  const warnings = [];
  const themePath = path.join(themesDir, themeName || '');
  const file = reviewPath(themeName);
  const fingerprint = currentThemeFingerprint(themeName);
  const certification = loadCertification(themeName);
  const review = readJson(file, null);

  if (!themeName || !fs.existsSync(themePath)) {
    issues.push(`الثيم غير موجود: ${themeName || '-'}`);
    return { theme: themeName, file, review, certification, fingerprint, issues, warnings };
  }

  if (!certification.data) {
    issues.push(`لا يوجد تقرير اعتماد محلي: ${rel(certification.file)}`);
  } else {
    if (certification.data.schema !== 'salla-theme-factory/certification@1') {
      issues.push(`تقرير الاعتماد المحلي غير معروف schema: ${rel(certification.file)}`);
    }
    if (certification.data.theme !== themeName) {
      issues.push(`تقرير الاعتماد المحلي يخص ثيما آخر: ${certification.data.theme || '-'}`);
    }
    if (certification.data.local_certified !== true || !String(certification.data.final_status || '').includes('مقبول')) {
      issues.push('آخر تقرير اعتماد محلي ليس مقبولا.');
    }
    if (fingerprint?.hash && certification.data.theme_fingerprint?.hash && certification.data.theme_fingerprint.hash !== fingerprint.hash) {
      issues.push('تقرير الاعتماد المحلي لا يطابق بصمة الثيم الحالية.');
    }
  }

  if (!review) {
    issues.push(`ملف مراجعة سلة مفقود: ${rel(file)}. أنشئ قالبا: node factory.js salla-review template ${themeName}`);
    return { theme: themeName, file, review, certification, fingerprint, issues, warnings };
  }

  if (review.schema !== schema) {
    issues.push(`schema غير صحيح في ${rel(file)}. المتوقع ${schema}`);
  }

  if (review.theme !== themeName) {
    issues.push(`ملف مراجعة سلة يخص ثيما آخر: ${review.theme || '-'}`);
  }

  if (!['passed', 'waived'].includes(review.status)) {
    issues.push(`status يجب أن يكون passed أو waived قبل التسليم. الحالي: ${review.status || '-'}`);
  }

  if (fingerprint?.hash && review.theme_fingerprint?.hash !== fingerprint.hash) {
    issues.push('ملف مراجعة سلة لا يطابق بصمة الثيم الحالية. أعد المراجعة أو حدث waiver بعد certify جديد.');
  }

  if (review.status === 'passed') {
    const sallaReview = review.salla_review || {};
    if (!sallaReview.reviewed_at) issues.push('salla_review.reviewed_at مطلوب عند status=passed');
    if (!sallaReview.reviewed_by) issues.push('salla_review.reviewed_by مطلوب عند status=passed');
    if (!sallaReview.environment) issues.push('salla_review.environment مطلوب عند status=passed');
    if ((sallaReview.result || '').toLowerCase() !== 'passed') issues.push('salla_review.result يجب أن يكون passed');
    if (!Array.isArray(review.evidence) || !review.evidence.some((item) => item.path_or_url)) {
      warnings.push('يفضل إرفاق evidence: لقطة أو رابط تقرير أو ملاحظة من Partner Portal.');
    }
  }

  if (review.status === 'waived') {
    const waiver = review.waiver || {};
    if (!waiver.approved_by) issues.push('waiver.approved_by مطلوب عند status=waived');
    if (!waiver.reason) issues.push('waiver.reason مطلوب عند status=waived');
    if (waiver.risk_accepted !== true) issues.push('waiver.risk_accepted يجب أن يكون true عند status=waived');
    if (!waiver.expires_at) {
      warnings.push('waiver.expires_at غير محدد؛ يفضل وضع تاريخ انتهاء للاستثناء.');
    } else if (isExpired(waiver.expires_at)) {
      issues.push(`waiver منتهي الصلاحية: ${waiver.expires_at}`);
    }
  }

  return { theme: themeName, file, review, certification, fingerprint, issues, warnings };
}

function writeReport(result) {
  ensureDir(reportsDir);

  const reportPath = reviewReportPath(result.theme);
  const reportJsonPath = reviewReportJsonPath(result.theme);
  const status = result.issues.length ? 'failed' : 'passed';
  const lines = [
    '# Salla Review Gate',
    '',
    `- **Status:** ${status}`,
    `- **Theme:** ${result.theme || '-'}`,
    `- **Review file:** ${rel(result.file)}`,
    `- **Review status:** ${result.review?.status || '-'}`,
    `- **Issues:** ${result.issues.length}`,
    `- **Warnings:** ${result.warnings.length}`,
    result.fingerprint ? `- **Fingerprint:** ${result.fingerprint.algorithm}:${result.fingerprint.hash}` : '- **Fingerprint:** -',
    '',
  ];

  if (result.issues.length) {
    lines.push('## Issues', '');
    for (const issue of result.issues) lines.push(`- ${issue}`);
    lines.push('');
  }

  if (result.warnings.length) {
    lines.push('## Warnings', '');
    for (const warning of result.warnings) lines.push(`- ${warning}`);
    lines.push('');
  }

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
  writeJson(reportJsonPath, {
    schema: 'salla-theme-factory/salla-review-gate@1',
    theme: result.theme,
    status,
    review_file: rel(result.file),
    review_status: result.review?.status || null,
    fingerprint: result.fingerprint,
    issues: result.issues,
    warnings: result.warnings,
  });

  return { reportPath, reportJsonPath };
}

function listReviews() {
  console.log('\n🧾 Salla Review Files');
  console.log('----------------------');
  if (!fs.existsSync(qualityDir)) {
    console.log('No review files yet.');
    return;
  }

  const files = fs.readdirSync(qualityDir)
    .filter((entry) => entry.endsWith('.json'))
    .sort();

  if (!files.length) {
    console.log('No review files yet.');
    return;
  }

  for (const fileName of files) {
    const file = path.join(qualityDir, fileName);
    const data = readJson(file, {});
    console.log(`- ${data.theme || path.basename(fileName, '.json')} [${data.status || '-'}] ${rel(file)}`);
  }
}

function showReview(themeName) {
  const file = reviewPath(themeName);
  const data = readJson(file, null);
  if (!data) {
    console.error(`❌ ملف مراجعة سلة غير موجود: ${rel(file)}`);
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

function createTemplate(themeName, options = {}) {
  const file = reviewPath(themeName);
  const data = expectedTemplate(themeName, options);

  if (!data.theme_fingerprint) {
    console.error(`❌ الثيم غير موجود أو لا يمكن إنشاء بصمته: ${themeName || '-'}`);
    process.exitCode = 1;
    return;
  }

  if (fs.existsSync(file) && !options.force) {
    console.error(`❌ الملف موجود مسبقا: ${rel(file)}. استخدم --force للاستبدال.`);
    process.exitCode = 1;
    return;
  }

  if (options.dryRun) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  writeJson(file, data);
  console.log(`✅ تم إنشاء قالب مراجعة سلة: ${rel(file)}`);
}

function printGate(themeName) {
  const result = validateSallaReview(themeName);
  const reports = writeReport(result);

  console.log(`\n🧾 Salla Review Gate | ${themeName}`);
  console.log('----------------------');
  console.log(`Review file: ${rel(result.file)}`);
  console.log(`Review status: ${result.review?.status || '-'}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  for (const issue of result.issues) console.log(`❌ ${issue}`);
  for (const warning of result.warnings) console.log(`⚠️ ${warning}`);
  console.log(`Report: ${rel(reports.reportPath)}`);

  if (result.issues.length) {
    console.log('\n❌ Salla review gate failed.');
    process.exitCode = 1;
    return result;
  }

  console.log('\n✅ Salla review gate passed.');
  return result;
}

function parseOptions(args) {
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    waiver: args.includes('--waiver'),
  };
}

function main() {
  const [command = 'list', first, ...rest] = process.argv.slice(2);
  const options = parseOptions(rest);

  if (['help', '-h', '--help'].includes(command)) {
    console.log(HELP.trim());
    return;
  }

  if (command === 'list') {
    listReviews();
    return;
  }

  if (command === 'show') {
    if (!first) throw new Error('Usage: node factory.js salla-review show <theme>');
    showReview(first);
    return;
  }

  if (command === 'template') {
    if (!first) throw new Error('Usage: node factory.js salla-review template <theme> [--waiver] [--dry-run]');
    createTemplate(first, options);
    return;
  }

  if (command === 'gate') {
    if (!first) throw new Error('Usage: node factory.js salla-review gate <theme>');
    printGate(first);
    return;
  }

  console.log(HELP.trim());
  process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\n❌ Salla review gate failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  validateSallaReview,
};
