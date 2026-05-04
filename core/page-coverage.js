const fs = require('fs');
const path = require('path');
const {
  expectedPreviewFiles,
  validateThemePageCoverage,
} = require('./page-registry');

const themeName = process.argv[2] || 'zen-theme';
const rootDir = path.join(__dirname, '..');
const themePath = path.join(rootDir, 'themes', themeName);
const buildDir = path.join(rootDir, 'build', themeName);
const reportsDir = path.join(rootDir, 'reports');
const reportPath = path.join(reportsDir, `page-coverage-${themeName}.json`);

function existsPreview(relativeFile) {
  return fs.existsSync(path.join(rootDir, 'build', relativeFile));
}

function scan() {
  if (!fs.existsSync(themePath)) {
    throw new Error(`الثيم غير موجود: themes/${themeName}`);
  }

  const templateCoverage = validateThemePageCoverage(themePath);
  const expectedFiles = expectedPreviewFiles(themeName, themePath);
  const missingPreviewFiles = fs.existsSync(buildDir)
    ? expectedFiles.filter((file) => !existsPreview(file))
    : expectedFiles;

  return {
    theme: themeName,
    templateCoverage,
    expectedPreviewFiles: expectedFiles,
    missingPreviewFiles,
  };
}

try {
  const result = scan();
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);

  const issues = [
    ...result.templateCoverage.missingScenarios.map((view) => `لا يوجد سيناريو محلي للقالب: ${view}`),
    ...result.templateCoverage.missingTemplates.map((view) => `لا يوجد قالب صفحة في الثيم للسيناريو الإلزامي: ${view}`),
    ...result.missingPreviewFiles.map((file) => `لم يتم توليد ملف المعاينة: build/${file}`),
  ];

  console.log(`\n🧾 Page Coverage | ${themeName}`);
  console.log('-----------------------------');
  console.log(`Theme page templates: ${result.templateCoverage.themeViews.length}`);
  console.log(`Covered page views: ${result.templateCoverage.scenarioViews.length}`);
  console.log(`Expected preview files: ${result.expectedPreviewFiles.length}`);
  console.log(`Missing preview files: ${result.missingPreviewFiles.length}`);

  for (const issue of issues.slice(0, 60)) {
    console.log(`❌ ${issue}`);
  }

  if (issues.length > 60) {
    console.log(`... و ${issues.length - 60} مشاكل تغطية إضافية`);
  }

  console.log(`📄 التقرير: ${path.relative(process.cwd(), reportPath)}`);

  if (issues.length) {
    console.log('\n❌ Page coverage failed.');
    process.exit(1);
  }

  console.log('\n✅ Page coverage passed.');
} catch (error) {
  console.error('❌ فشل فحص تغطية الصفحات.');
  console.error(error.message);
  process.exit(1);
}
