const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const themeName = process.argv[2];

if (!themeName) {
  console.error('❌ يرجى تحديد اسم الثيم: npm run factory:preview <theme-name>');
  process.exit(1);
}

const themePath = path.join(__dirname, '../themes', themeName);

if (!fs.existsSync(themePath)) {
  console.error(`❌ الثيم [${themeName}] غير موجود في مجلد themes/`);
  process.exit(1);
}

console.log(`🚀 جاري تشغيل معاينة الثيم: [${themeName.toUpperCase()}]...`);

// تشغيل salla theme preview داخل مجلد الثيم
const preview = spawn('salla', ['theme', 'preview'], {
  cwd: themePath,
  shell: true,
  stdio: 'inherit' // لإظهار مخرجات سلة مباشرة للمستخدم
});

preview.on('error', (err) => {
  console.error('❌ فشل تشغيل المعاينة. تأكد من تثبيت Salla CLI وتسجيل الدخول.');
  console.error(err);
});
