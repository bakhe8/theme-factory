const HELP = `
Usage:
  node factory.js guide
  node factory.js guide <goal>

Goals:
  new-theme
  add-capability
  certify
  deliver
  fix-failure
  docs
`;

const guides = {
  'new-theme': {
    title: 'إنشاء ثيم جديد',
    commands: [
      'node factory.js intake <theme-name>',
      'node factory.js manufacture <theme-name> --skip-deliver',
      'node factory.js visual gate <theme-name>',
      'node factory.js certify <theme-name> --relaxed-docs',
      'node factory.js salla-review template <theme-name>',
      'node factory.js deliver <theme-name>',
    ],
    notes: [
      'لا تبدأ من نسخ themes/raed يدويا.',
      'أي ميزة مطلوبة يجب أن تدخل specs ثم capabilities.',
    ],
  },
  'add-capability': {
    title: 'إضافة قدرة مصنع جديدة',
    commands: [
      'node factory.js capabilities new <id> --type=<home-experience|page-experience|integration|vertical>',
      'node factory.js innovation propose <id>',
      'حدّث registry/generator/gate المناسب داخل core/',
      'أضف القدرة إلى specs/<theme>.specs.json',
      'node factory.js capabilities gate <theme-name>',
      'node factory.js certify <theme-name> --relaxed-docs',
    ],
    notes: [
      'لا تنفذ الميزة مباشرة داخل themes/<theme>.',
      'status=implemented أو certified فقط يسمح بدخول الإنتاج.',
    ],
  },
  certify: {
    title: 'اعتماد ثيم محليا',
    commands: [
      'node factory.js specs gate <theme-name>',
      'node factory.js capabilities gate <theme-name>',
      'node factory.js preview <theme-name> --all-pages --all-fixtures',
      'node factory.js coverage <theme-name>',
      'node factory.js browser <theme-name>',
      'node factory.js rtl <theme-name>',
      'node factory.js visual gate <theme-name>',
      'node factory.js certify <theme-name> --relaxed-docs',
    ],
    notes: [
      'certify يثبت الجاهزية المحلية، وليس مراجعة سلة النهائية.',
    ],
  },
  deliver: {
    title: 'تجهيز مجلد التسليم',
    commands: [
      'node factory.js certify <theme-name> --relaxed-docs',
      'node factory.js salla-review template <theme-name>',
      'املأ quality/salla-reviews/<theme-name>.json بعد Partner Portal أو waiver موثق',
      'node factory.js salla-review gate <theme-name>',
      'node factory.js deliver <theme-name> --skip-certify',
    ],
    notes: [
      'deliver يفشل إذا تغيرت بصمة الثيم بعد certify.',
      'deliver يفشل الآن بدون Salla review gate أو waiver صالح.',
    ],
  },
  'fix-failure': {
    title: 'إصلاح فشل Gate',
    commands: [
      'اقرأ أول gate فاشل في مخرجات certify.',
      'افتح التقرير المطابق في reports/',
      'شغل gate نفسه منفردا بعد الإصلاح.',
      'node factory.js certify <theme-name> --relaxed-docs',
    ],
    notes: [
      'لا تفتح bypass. إذا كان الفشل لحالة مشروعة، وسّع المصنع أو exception registry.',
    ],
  },
  docs: {
    title: 'تحديث ذاكرة وثائق سلة',
    commands: [
      'node factory.js docs sync --max=180',
      'node factory.js docs urls',
      'node factory.js docs status',
      'node factory.js docs gate <theme-name> --strict',
    ],
    notes: [
      'docs sync يجلب الوثائق ويعيد توليد القواعد.',
      'docs urls يراقب روابط سلة وRaed التي يعتمد عليها المصنع.',
    ],
  },
};

function printGuide(goal = '') {
  const normalized = String(goal || '').trim().toLowerCase();

  if (!normalized) {
    console.log('\n🧭 Factory Guide');
    console.log('----------------');
    console.log('اختر هدفا واضحا ثم شغل الأمر المناسب:');
    for (const [id, guide] of Object.entries(guides)) {
      console.log(`- ${id}: ${guide.title}`);
    }
    console.log('\nمثال: node factory.js guide add-capability');
    return;
  }

  const guide = guides[normalized];
  if (!guide) {
    console.log(HELP.trim());
    process.exitCode = 1;
    return;
  }

  console.log(`\n🧭 ${guide.title}`);
  console.log('----------------');
  console.log('الأوامر:');
  for (const command of guide.commands) console.log(`- ${command}`);

  if (guide.notes.length) {
    console.log('\nملاحظات:');
    for (const note of guide.notes) console.log(`- ${note}`);
  }
}

function main() {
  const [goal] = process.argv.slice(2);
  if (['help', '-h', '--help'].includes(goal)) {
    console.log(HELP.trim());
    return;
  }
  printGuide(goal);
}

if (require.main === module) main();

module.exports = {
  printGuide,
};
