const fs = require('fs');
const path = require('path');
const { formatRuleReference, validateTheme } = require('./policies/salla-theme-policy');

const themeName = process.argv[2];
const themesDir = path.join(__dirname, '../themes');
const themes = themeName
  ? [themeName]
  : fs.readdirSync(themesDir).filter((name) => fs.statSync(path.join(themesDir, name)).isDirectory());

let failed = false;

console.log('📏 Salla Theme Factory Policy Check');
console.log('-----------------------------------');

for (const theme of themes) {
  const themePath = path.join(themesDir, theme);
  const { issues, warnings, exceptions = [] } = validateTheme(themePath, theme);

  console.log(`\n📂 ${theme}`);
  console.log(`   ✅ Issues: ${issues.length === 0 ? 0 : issues.length}`);
  console.log(`   ⚠️ Warnings: ${warnings.length}`);
  console.log(`   🧾 Exceptions: ${exceptions.length}`);

  for (const issue of issues) {
    console.log(`   ❌ [${issue.type}] ${issue.file}: ${issue.detail}`);
    const source = formatRuleReference(issue);
    if (source) console.log(`      ↳ ${source}`);
  }

  for (const warning of warnings) {
    console.log(`   ⚠️ [${warning.type}] ${warning.file}: ${warning.detail}`);
    const source = formatRuleReference(warning);
    if (source) console.log(`      ↳ ${source}`);
  }

  for (const exception of exceptions) {
    console.log(`   🧾 [${exception.type}] ${exception.file}: ${exception.detail}`);
    if (exception.reviewDue) console.log('      ↳ مراجعة الاستثناء مستحقة');
  }

  if (issues.length > 0) failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('\n✅ جميع الثيمات اجتازت سياسة المصنع الأساسية.');
