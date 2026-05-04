# 🛡️ طبقة الثقة في مصنع ثيمات سلة

هدف هذه الطبقة أن يصبح إنشاء الثيم عملية محكومة، لا مجرد نسخ ملفات. كل ثيم جديد يجب أن يمر عبر وثائق سلة، سياسة ثابتة، بيانات Runtime متنوعة، سجل التجارب، بناء قابل للإعادة، تدقيق نزاهة، ثم معاينة Runtime محلية.

## البوابات

1. **Factory Workflow Gate**
   - يتحقق أن الثيم يحمل توقيع المصنع داخل `themes/<theme>/.factory/manifest.json`.
   - يرفض الثيمات المنسوخة يدوياً من Raed أو من أي مجلد آخر لأنها لا تملك سلسلة تصنيع موثقة.
   - يعمل داخل `build`, `certify`, و`deliver`.

2. **Specs Contract Gate**
   - يتحقق أن `specs/<theme>.specs.json` موجود وصالح ويحتوي أقسام العقد الأساسية.
   - يجعل المواصفات مدخلاً إلزامياً لا ملفاً اختيارياً.

3. **Innovation Gate**
   - يتحقق من `innovations/` كسجل رسمي للأفكار الجديدة.
   - يمنع دخول `proposed` و`experimental` إلى `certify`, `build`, و`deliver`.
   - يسمح للمصنع بتطوير أفكار جديدة دون خلط المختبر بمجلد التسليم.

4. **Factory Display Feature Gate**
   - يتحقق أن أي مكون عرض داخل `twilight.components` مصدره قالب سلة المعتمد أو Experience مسجلة في المصنع ومطلوبة في specs.
   - يرفض ملفات وتجارب العرض التي يضيفها المطور مباشرة داخل الثيم.

5. **Policy Gate**
   - يتحقق من اسم الثيم، الملفات المطلوبة، `package.json`، `twilight.json`، ملفات اللغات، ووجود hooks الأساسية في `master.twig`.
   - القواعد المرتبطة بوثائق سلة موثقة في [مصادر سياسات سلة](SALLA_POLICY_SOURCES.md).
   - عند وجود ذاكرة مولدة من `node factory.js docs sync` يفضل المصنع مصادر القواعد المولدة من الوثائق الرسمية على المصادر الثابتة.

6. **Runtime Fixtures Gate**
   - يفحص بيانات التشغيل المحلية: متجر غني، حالات قاسية، ومتجر فارغ.
   - يضمن أن المكونات لا تعمل فقط مع بيانات مثالية، بل تتحمل النصوص الطويلة والصور المفقودة والحالات الفارغة.
   - تعمل بوابة `fixtures gate` داخل `build` و`certify`.

7. **Experience Registry Gate**
   - يتحقق من التجارب المسجلة في `twilight.components` وملفات Twig/JS/SCSS المرتبطة بها.
   - يمنع تجربة بيع لا تحفظ السعر والصورة والرابط وزر السلة أو تستخدم JS غير آمن.

8. **Frozen Install**
   - يشغل `pnpm install --frozen-lockfile --ignore-scripts` لضمان أن القفل مطابق ولا يعتمد على بيئة المطور.

9. **Production Build**
   - يشغل سكربت `production` داخل الثيم.

10. **Integrity Audit**
   - يفحص تسريبات runtime/mock، واستخدامات JS الخطرة، وفلتر Twig `|raw`، ثم يكتب تقرير `reports/audit-<theme>.md`.

11. **Local Runtime Preview**
   - يبني معاينة HTML من قوالب Twig الفعلية ويحقن Runtime محلي يحاكي عقد سلة الأساسية.
   - يمكن تشغيله مع `--fixture=fashion-rich` أو `--fixture=edge-cases` أو `--fixture=empty-store`.

12. **Salla CLI Review**
   - مرحلة اختيارية عبر `--salla` لأنها تحتاج تسجيل دخول وسياق منصة سلة.

13. **Docs Intelligence**
   - يزامن `https://docs.salla.dev/llms.txt`، يجمع صفحات Twilight وWeb Components، ثم يولد قواعد ومكونات وعقود صفحات محلية.
   - أي مكون مستخدم في الثيم ولم يظهر في الذاكرة يبقى تحذيراً لا سماحاً صريحاً حتى نجد له مصدراً رسمياً.
   - تعمل بوابة `docs gate` داخل `create` و`build` و`certify` حتى لا تبقى الذاكرة ملفات محفوظة دون أثر في التصنيع.

## الأوامر

```bash
node factory.js intake my-new-theme --name-ar="ثيم جديد" --name-en="New Theme"
node factory.js manufacture my-new-theme
node factory.js workflow gate my-new-theme
node factory.js specs gate my-new-theme
node factory.js innovation gate my-new-theme
node factory.js display gate my-new-theme
node factory.js policy my-new-theme
node factory.js certify my-new-theme
node factory.js certify my-new-theme --salla
node factory.js deliver my-new-theme
node factory.js docs sync --max=180
node factory.js docs check my-new-theme
node factory.js docs gate my-new-theme
node factory.js fixtures list
node factory.js fixtures gate
node factory.js preview my-new-theme --fixture=edge-cases
node factory.js experience gate my-new-theme
node factory.js innovation list
```

## لماذا هذا يجعل المصنع أوثق؟

- الثيمات الجديدة تبدأ من `intake/specs` ثم ينشئها المصنع من قالب معتمد ويوقعها تلقائياً.
- أي ثيم لا يملك `.factory/manifest.json` يفشل قبل مرحلة التسليم.
- أي ميزة عرض غير مسجلة في المصنع ومطلوبة في specs تفشل قبل سياسة سلة والبناء.
- أي فكرة إبداعية تبقى مسموحة في `innovations/`، لكنها لا تدخل التسليم قبل أن تصبح `implemented` أو `certified`.
- أي نقص في بنية سلة يفشل مبكراً قبل الوصول للبناء.
- lockfile أصبح شرطاً لا توصية.
- تقرير الاعتماد يوضح المرحلة التي فشلت بدلاً من ترك الخطأ مبعثراً في مخرجات الطرفية.
- ذاكرة وثائق سلة تجعل السياسة قابلة للتحديث عند تغير الوثائق بدلاً من تجميد فهم المصنع في الكود.
- Runtime fixtures تجعل الاختبار مرتبطاً ببيانات فعلية متنوعة، لا بعينة واحدة محفوظة.
- سجل التجارب يجعل الإبداع قابلاً للفحص بدلاً من تركه لتقدير يدوي.
- المعاينة المحلية لا تدعي أنها سلة 100%، لكنها تحدد عقد runtime التي نحاكيها وتترك الاعتماد النهائي لمنصة سلة عند الحاجة.
