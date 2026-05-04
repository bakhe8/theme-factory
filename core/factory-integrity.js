const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { formatRuleReference, validateTheme } = require('./policies/salla-theme-policy');

const themeName = process.argv[2];
if (!themeName) {
  console.error('❌ يرجى تحديد اسم الثيم: node core/factory-integrity.js <theme-name>');
  process.exit(1);
}

const themePath = path.join(__dirname, '../themes', themeName);
const reportPath = path.join(__dirname, '../reports', `audit-${themeName}.md`);

if (!fs.existsSync(themePath)) {
  console.error(`❌ الثيم [${themeName}] غير موجود في مجلد themes/.`);
  process.exit(1);
}

if (!fs.existsSync(path.dirname(reportPath))) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
}

console.log(`🛡️ جاري فحص نزاهة وإصدار تقرير القبول للثيم: [${themeName.toUpperCase()}]...`);

const issues = [];
const warnings = [];
let totalFiles = 0;

function addIssue(file, type, detail) {
  issues.push({ file, type, detail });
}

function addWarning(file, type, detail) {
  warnings.push({ file, type, detail });
}

function formatFinding(finding) {
  const source = formatRuleReference(finding);
  return `- **[${finding.type}]** في الملف \`${finding.file}\`: ${finding.detail}${source ? `\n  - المصدر: ${source}` : ''}`;
}

function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.git'].includes(entry)) getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function scanSourceFiles() {
  for (const file of getAllFiles(path.join(themePath, 'src'))) {
    totalFiles++;
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(themePath, file);

    if (content.includes('factory-mock') || content.includes('window.salla =')) {
      addIssue(relativePath, 'Leakage', 'تم العثور على كود محاكاة داخل ملفات الثيم المصدرية');
    }

    if (file.endsWith('.js')) {
      const jsRules = [
        { pattern: /\beval\s*\(/, detail: 'استخدام eval محظور أمنياً' },
        { pattern: /\bnew\s+Function\s*\(/, detail: 'استخدام new Function محظور أمنياً' },
        { pattern: /\bdocument\.write\s*\(/, detail: 'استخدام document.write محظور' },
        { pattern: /\.textContent\s*=\s*([`'"])\s*</, detail: 'كتابة HTML عبر textContent تكسر عرض المكوّن' },
      ];

      for (const rule of jsRules) {
        if (rule.pattern.test(content)) addIssue(relativePath, 'Security', rule.detail);
      }
    }

    if (file.endsWith('.twig') && content.includes('|raw')) {
      addIssue(relativePath, 'Security', 'استخدام فلتر |raw يتطلب تبريراً وتعقيماً واضحاً');
    }
  }
}

function scanProductionLeaks() {
  for (const file of getAllFiles(path.join(themePath, 'public'))) {
    totalFiles++;
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(themePath, file);

    if (content.includes('factory-mock') || content.includes('window.salla =')) {
      addIssue(relativePath, 'Leakage', 'تم العثور على كود محاكاة داخل ملفات الإنتاج');
    }
  }
}

function scanPackageMetadata() {
  const packagePath = path.join(themePath, 'package.json');
  if (!fs.existsSync(packagePath)) {
    addIssue('package.json', 'Build', 'ملف package.json مفقود');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const expectedNames = new Set([themeName, `theme-${themeName}`]);
  if (!expectedNames.has(manifest.name)) {
    addIssue('package.json', 'Metadata', `اسم الحزمة [${manifest.name}] لا يطابق اسم الثيم [${themeName}]`);
  }

  if (!manifest.scripts?.production) {
    addIssue('package.json', 'Build', 'سكريبت production مفقود');
  }

  const lockPath = path.join(themePath, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockPath)) {
    addIssue('pnpm-lock.yaml', 'Build', 'ملف pnpm-lock.yaml مفقود، ولا يمكن ضمان بناء قابل للإعادة');
    return;
  }

  try {
    execFileSync('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], {
      cwd: themePath,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
  } catch (error) {
    addIssue('pnpm-lock.yaml', 'Build', 'ملف القفل غير متطابق مع package.json أو لا يثبت في وضع CI');
  }
}

function scanPolicyCompliance() {
  const result = validateTheme(themePath, themeName);
  for (const issue of result.issues) {
    issues.push({ ...issue, type: `Policy:${issue.type}` });
  }

  for (const warning of result.warnings) {
    warnings.push({ ...warning, type: `Policy:${warning.type}` });
  }
}

scanSourceFiles();
scanProductionLeaks();
scanPackageMetadata();
scanPolicyCompliance();

const timestamp = new Date().toLocaleString('ar-SA');
const leakageCount = issues.filter((issue) => issue.type === 'Leakage').length;
const securityCount = issues.filter((issue) => issue.type === 'Security').length;
const buildCount = issues.filter((issue) => issue.type === 'Build').length;
const policyCount = issues.filter((issue) => issue.type.startsWith('Policy:')).length;
const status = issues.length === 0 ? '✅ مقبول (ACCEPTED)' : '❌ مرفوض (REJECTED)';
const score = Math.max(0, 100 - leakageCount * 25 - securityCount * 15 - buildCount * 15 - policyCount * 10 - (issues.length - leakageCount - securityCount - buildCount - policyCount) * 10);

const report = `# 📝 تقرير قبول ثيم سلة (Salla Theme Acceptance Report)

## 🛠️ معلومات الفحص
- **اسم الثيم:** ${themeName}
- **تاريخ الفحص:** ${timestamp}
- **الحالة النهائية:** ${status}
- **درجة الامتثال:** ${score}%
- **عدد الملفات المفحوصة:** ${totalFiles}

---

## 🛡️ ملخص ميثاق النزاهة

### 1. الفصل التام (Strict Separation)
- **الحالة:** ${leakageCount === 0 ? '✅ نقي' : '⚠️ متداخل'}
- **الوصف:** خلو ملفات الثيم من أي أدوات محاكاة أو اختبار خارجية.

### 2. التدقيق الأمني (Security Audit)
- **فحص JS:** ${securityCount === 0 ? '✅ آمن' : '🚨 ملاحظات مكتشفة'}
- **فحص Twig Filters:** ${issues.some((issue) => issue.file.endsWith('.twig')) ? '🚨 فلاتر تحتاج مراجعة' : '✅ مطابق'}

### 3. قابلية البناء (Build Reproducibility)
- **الحالة:** ${buildCount === 0 ? '✅ قابلة للإعادة' : '🚨 مشكلة في الاعتماديات أو السكربتات'}

### 4. سياسة سلة الداخلية (Salla Policy Pack)
- **الحالة:** ${policyCount === 0 ? '✅ مطابق' : '🚨 مخالفات في البنية أو metadata'}
- **التحذيرات:** ${warnings.length}

---

## 🔍 تفاصيل الملاحظات
${issues.length === 0 ? '*لا توجد ملاحظات، الثيم مطابق للمواصفات القياسية الحالية.*' : issues.map(formatFinding).join('\n')}

## ⚠️ التحذيرات غير الحاجبة
${warnings.length === 0 ? '*لا توجد تحذيرات.*' : warnings.map(formatFinding).join('\n')}

---

## 📜 التوصية النهائية
${issues.length === 0
  ? 'الثيم جاهز للمرحلة التالية من البناء والمعاينة. يظل التحقق النهائي عبر Salla CLI مطلوباً.'
  : 'يجب معالجة الملاحظات المذكورة أعلاه قبل إعادة الفحص والاعتماد.'}

---
*صادر عن: Salla Theme Factory Integrity Engine v9.1*
`;

fs.writeFileSync(reportPath, report);

console.log(`✨ تم إصدار تقرير القبول: ${path.relative(process.cwd(), reportPath)}`);
if (issues.length > 0) {
  console.error(`🚨 تم العثور على ${issues.length} مشكلات. راجع التقرير للتفاصيل.`);
  process.exit(1);
}

console.log(`✅ الثيم [${themeName}] معتمد بنسبة 100%.`);
