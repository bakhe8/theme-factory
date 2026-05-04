const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, '../themes');
const themes = fs.readdirSync(themesDir).filter(f => fs.statSync(path.join(themesDir, f)).isDirectory());

const RULES = {
  js: [
    { pattern: 'eval(', level: 'CRITICAL', msg: 'استخدام دالة محظورة أمنياً' },
    { pattern: 'document.write(', level: 'CRITICAL', msg: 'استخدام دالة تؤثر على الأداء والأمان' },
    { pattern: 'innerHTML =', level: 'WARNING', msg: 'يفضل استخدام innerText أو Web Components لمنع XSS' }
  ],
  twig: [
    { pattern: '|raw', level: 'WARNING', msg: 'استخدام فلتر غير آمن، تأكد من أن البيانات معقمة' },
    { pattern: 'setTimeout(', level: 'WARNING', msg: 'تجنب استخدام الموقتات داخل القوالب' }
  ]
};

console.log('\n💎 [ Salla Theme Factory - Advanced Audit ] 💎');
console.log('--------------------------------------------------');

themes.forEach(theme => {
  let issuesCount = 0;
  let criticalCount = 0;
  
  console.log(`\n📂 التحقيق في الثيم: [ ${theme.toUpperCase()} ]`);
  const themePath = path.join(themesDir, theme);
  
  const allFiles = getAllFiles(path.join(themePath, 'src'));

  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const ext = path.extname(file).substring(1);
    
    if (RULES[ext]) {
      RULES[ext].forEach(rule => {
        lines.forEach((line, index) => {
          if (line.includes(rule.pattern)) {
            issuesCount++;
            if (rule.level === 'CRITICAL') criticalCount++;
            
            console.log(`   [${rule.level}] في ملف: ${path.relative(themePath, file)} (السطر ${index + 1})`);
            console.log(`   🔍 الكود: ${line.trim()}`);
            console.log(`   📝 التوجيه: ${rule.msg}\n`);
          }
        });
      });
    }
  });

  // حساب درجة الثقة (Trust Score)
  const score = Math.max(0, 100 - (criticalCount * 20) - (issuesCount * 5));
  console.log(`📊 درجة الثقة في الثيم: ${score}%`);
  if (score < 50) console.log('⚠️  تنبيه: هذا الثيم يحتاج لتعديلات جذرية قبل النشر.');
  console.log('==================================================');
});

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}
