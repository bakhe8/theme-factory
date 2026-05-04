const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, '../themes');
const themes = fs.existsSync(themesDir)
  ? fs.readdirSync(themesDir).filter((theme) => fs.statSync(path.join(themesDir, theme)).isDirectory())
  : [];

console.log('🛠️ تشغيل فحص الإصلاح غير التدميري (Factory Safe Fix)...');

let notes = 0;

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

for (const theme of themes) {
  const themePath = path.join(themesDir, theme);
  console.log(`🧹 فحص الثيم بدون تعديل عشوائي: [${theme.toUpperCase()}]`);

  for (const file of getAllFiles(path.join(themePath, 'src'))) {
    const relative = path.relative(themePath, file);
    const content = fs.readFileSync(file, 'utf8');

    if (/\.textContent\s*=\s*([`'"])\s*</.test(content)) {
      notes++;
      console.log(`   ⚠️ يحتاج مراجعة rendering: ${relative}`);
    }

    if (file.endsWith('.twig') && content.includes('|raw')) {
      notes++;
      console.log(`   ⚠️ يحتوي |raw ويتطلب تحقق يدوي: ${relative}`);
    }
  }
}

if (notes === 0) {
  console.log('✅ لا توجد إصلاحات آلية مطلوبة.');
} else {
  console.log(`ℹ️ تم رصد ${notes} ملاحظات. لم يتم تعديل الملفات آلياً لتجنب كسر الثيم.`);
}
