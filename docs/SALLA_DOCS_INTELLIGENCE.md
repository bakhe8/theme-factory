# ذاكرة وثائق سلة في المصنع

هذه الطبقة تجعل المصنع يقرأ وثائق سلة الرسمية من `llms.txt`، ثم يحولها إلى ذاكرة محلية قابلة للفحص: مكونات معروفة، عقود صفحات، وقواعد سماح/منع مرتبطة بمصدر رسمي.

## الأوامر

```bash
node factory.js docs sync
node factory.js docs sync --seeds-only
node factory.js docs sync --max=180
node factory.js docs compile
node factory.js docs status
node factory.js docs check zen-theme
node factory.js docs gate zen-theme
node factory.js docs gate zen-theme --strict
node factory.js component zen-theme feature component-youtube --dry-run
node factory.js component zen-theme custom promo-strip --preset=banner --dry-run
node factory.js component zen-theme custom flip-showcase --preset=product-flip --dry-run
node factory.js component zen-theme custom editorial-lookbook --preset=lookbook --dry-run
node factory.js experience list
node factory.js experience show product-flip
node factory.js experience show lookbook
node factory.js experience zen-theme product-flip flip-showcase --dry-run
node factory.js experience zen-theme lookbook editorial-lookbook --dry-run
node factory.js experience gate zen-theme
node factory.js experience gate zen-theme product-flip flip-showcase
```

## ماذا ينتج؟

- `core/docs-intelligence/generated/manifest.json`: قائمة الوثائق التي تمت مزامنتها وهاش كل وثيقة.
- `core/docs-intelligence/generated/rules.generated.json`: قواعد مستخرجة من وثائق سلة مع رابط المصدر.
- `core/docs-intelligence/generated/allowed-components.json`: مكونات `salla-*` التي وجدها المصنع في الوثائق.
- `core/docs-intelligence/generated/official-template-components.json`: مكونات `salla-*` الموجودة في قوالب `SallaApp/theme-raed` الرسمية التي تشير لها وثائق الصفحات.
- `core/docs-intelligence/generated/raed-theme-contract.json`: عقد README الرسمي لثيم Raed: دوره كثيم أساس، أوامر المعاينة، بنية المجلدات، Theme Features، وTheme Components.
- `core/docs-intelligence/generated/page-contracts.json`: متغيرات ومكونات الصفحات الموثقة.
- `core/docs-intelligence/generated/template-components.json`: مكونات Twig الموثقة مثل `comments.twig` مع مسارها ومتغيراتها وأفعال Salla المستخدمة.
- `core/docs-intelligence/generated/component-catalog.json`: فهرس مكونات Twilight المصنفة إلى Home/Header/Footer/Product/Comments مع المسارات وروابط الوثائق.
- `core/docs-intelligence/generated/components-customization-contract.json`: عقد تخصيص JS Web Components عبر `tailwind.config.js` وCSS Variables وCSS/SCSS.
- `core/docs-intelligence/generated/web-components-usage-contract.json`: عقد استخدام Twilight Web Components: Twilight Themes، Bundler/ES modules، CDN، Tailwind Config، CSS Variables، والأحداث.
- `core/docs-intelligence/generated/twilight-json-contract.json`: عقد `twilight.json` الرسمي: مكان الملف، أقسامه، أمثلة `features`، طريقة قراءة `settings`، ونمط `components.path`.
- `core/docs-intelligence/generated/twig-contracts.json`: دوال وفلاتر Twilight الخاصة بـ Twig.
- `core/docs-intelligence/generated/drift-report.md`: تقرير يوضح ما تغير بين آخر مزامنتين.

القواعد لا تخزن بتكرار أعمى. كل قاعدة تحمل `evidenceFingerprint` مبنياً على `id` و`scope` و`enforcement` ونص الدليل المنظف. إذا ظهرت نفس القاعدة في أكثر من وثيقة، تبقى قاعدة واحدة وتجمع المصادر في `sources`.

عند فشل جلب وثيقة غير حرجة مؤقتاً من سلة وكان لدى المصنع نسخة ناجحة مخبأة سابقاً، يستخدم المصنع النسخة المخبأة ويعلّم السجل بـ `cached` بدلاً من إسقاط العقد أو توليد drift زائف. هذا يجعل الذاكرة مستقرة من دون إخفاء سبب الفشل الأصلي.

وثائق مكونات Twig الجماعية، مثل Product Options، لا تحفظ كعقد واحد. يقسمها المصنع إلى ملفات فعلية مثل `src/views/components/product/options/color.twig` و`src/views/components/product/options/textarea.twig` حتى ترتبط المتغيرات بكل مكون في موضعه الصحيح.

عقد صفحة Home يستخرج من وثيقة سلة مسار الصفحة `src/views/pages/index.twig` واستدعاء `{% component home %}` وقوائم Theme Features وTheme Components. أمثلة المسارات داخل صفحة Home، مثل `home.custom-slider`، تحفظ كمثال داخل عقد الصفحة ولا تعامل كمكون Twig كامل ما لم تكن الوثيقة نفسها وثيقة مكون.

عقد `twilight.json` مأخوذ من وثيقة سلة الخاصة به. يثبت أن الملف في جذر الثيم، وأن `features` تحتوي مكونات جاهزة بأسماء تبدأ بـ `component-`، وأن `components.path` مثل `home.custom-slider` يشير إلى ملف Twig داخل `src/views/components/home/custom-slider.twig`.

طبقة `component` تحول هذا العقد إلى تصنيع فعلي:

- `node factory.js component <theme> feature <feature-id>` يضيف Feature فقط إذا ظهرت ضمن عقد `Theme Features` في وثائق سلة أو ضمن سياسة المصنع المستخرجة منه.
- `node factory.js component <theme> custom <slug>` ينشئ Theme Component داخل `home.*`، يضيف تعريفه إلى `twilight.json`، وينشئ ملف Twig في المسار الذي تنص عليه وثيقة `twilight.json`.
- `--dry-run` يبني نسخة مؤقتة من الثيم ويفحصها من دون كتابة التغيير على الثيم الحقيقي.
- أي Custom Component جديد يمر عبر فحص الحقول، منع HTML المدخل من التاجر، منع `|raw`، منع `eval/document.write`، وبوابة وثائق سلة الصارمة قبل اعتماد التغيير.
- `--preset=product-flip` مثال صريح على أن Raed ليس سقفاً للتجربة: ينشئ Theme Component مبتكر يعرض منتجات مختارة ببطاقات قابلة للقلب عبر JS/CSS محليين، ثم يفحص أن التجربة لا تستخدم HTML من التاجر، ولا طلبات شبكة لكل منتج، ولا تتجاوز عقد عرض المنتج والإضافة للسلة.

المصنع يتعامل مع "Feature" حسب تعريف سلة: مكون Twilight جاهز يضاف في `features`. أما المكون الجديد الذي يكتبه المطور فهو `Custom Component` داخل `components` وليس Feature عشوائية.

Raed يستخدم كـ starting point ومعيار معايرة، وليس كقائمة حصرية تمنع الأفكار الجديدة. القيود المحلية تمنع كسر عقود سلة، لكنها لا تمنع بناء طريقة عرض جديدة إذا كانت مبنية فوق Twig وCSS وJS آمن ومكونات سلة الموثقة.

طبقة `experience` تضيف فوق `component` سجلاً لتجارب البيع. كل تجربة تحمل نية تجارية، preset تقني، ملفات متوقعة، ومجموعة فحوصات خاصة بها. مثال `product-flip` يفحص بعد التصنيع:

- تسجيل `home.<slug>` داخل `twilight.json`.
- وجود حقول المنتجات ومصدرها `products`.
- وجود Twig يعرض الصورة، الاسم، السعر، رابط المنتج، و`salla-add-product-button`.
- ربط ملف JS في `home.js` وملف SCSS في `app.scss`.
- منع طلبات الشبكة المباشرة والتوليد الديناميكي الخطر داخل JS التجربة.
- وجود اعتبارات تفاعل مثل `aria-expanded` و`aria-hidden` و`prefers-reduced-motion`.

تجربة `lookbook` جاهزة أيضاً: تنشئ لوحة تسوق بصرية تعتمد على صورة رئيسية ومنتجات مختارة، وتفحص أن كل منتج ما زال يعرض رابط المنتج والسعر وزر الإضافة للسلة من غير طلبات شبكة أو حقن HTML من التاجر.

عقد Components Overview يحفظ تصنيف مكونات Twilight الرسمي. هذا يمنع الخلط بين مكون Home، ومكون Header/Footer العام، ومكونات Product Options، ويجعل كل مجموعة مرتبطة بمسارها ووثائقها.

عقد Components Customization يثبت أن تخصيص واجهات JS Web Components مسموح عبر Tailwind وCSS Variables وCSS classes وملفات `.scss`، مع الحفاظ على عدم hard-code البيانات واتساق واجهة الثيم.

عقد Twilight Web Components Usage يثبت أن ثيمات Twilight لا تحتاج تضمين Web Components داخل `bundle` أو HTML لأن محرك Twilight يحقن أحدث نسخة تلقائياً. وفي المقابل يحفظ فرع Bundler/ES modules كمسار مسموح للتطبيقات خارج runtime الثيم، ويحوّل Tailwind Config إلى فحص عملي على `content` و`safe-list-css.txt` و`@salla.sa/twilight-tailwind-theme`.

مصادر قوالب Raed الرسمية ليست بديلا عن صفحة مكون مستقلة. يستخدمها المصنع كدليل أضعف لكنه عملي عندما تشير وثائق سلة إلى القالب الرسمي نفسه. لذلك يظهر مصدر المكون كـ `official-template` داخل `sources`. تسحب المزامنة README و`twilight.json` وكل ملفات `src/views/**/*.twig` و`src/assets/js/**/*.js` من `SallaApp/theme-raed` حتى يبقى المصنع معايراً على الثيم الأساسي الذي توفره سلة.

عقد Raed Theme يحفظ ما يقوله README الرسمي: Raed هو starting point لتطوير ثيمات سلة، ويثبت أنه يثبت افتراضات Theme Features وTheme Components المشحونة افتراضياً مع الثيم.

## طريقة الاعتماد

1. شغل `node factory.js docs sync --max=180` لتحديث الذاكرة من المصدر الرسمي.
2. شغل `node factory.js docs check <theme>` لمعرفة أي مكون مستخدم في الثيم ولم يظهر في الوثائق المحلية.
3. شغل `node factory.js docs gate <theme>` للتأكد أن الذاكرة حديثة وأن الوثائق الحرجة موجودة.
4. شغل `node factory.js policy <theme>` حتى تستخدم بوابة السياسة أحدث مصادر القواعد المولدة.

## كيف لا تبقى الذاكرة ملفات خاملة؟

بوابة `docs gate` أصبحت جزءاً من التصنيع الفعلي:

- `node factory.js intake <theme>` ينشئ عقد المواصفات قبل وجود مجلد الثيم.
- `node factory.js manufacture <theme>` يفحص صلاحية ذاكرة الوثائق قبل إنشاء الثيم من القالب المعتمد.
- `node factory.js create <theme>` أصبح أمراً داخلياً للتصحيح، ويتطلب وجود specs مسبقاً.
- `node factory.js component <theme> feature|custom ...` يرفض التصنيع إذا كانت ذاكرة الوثائق قديمة أو إذا كان الثيم الحالي لا يجتاز `strict-docs` والسياسة الأساسية.
- `node factory.js experience <theme> <experience-id> ...` يشغل تصنيع المكون ثم `Experience Gate` الخاص بالتجربة، ويرجع الملفات إذا فشل الفحص.
- `node factory.js experience gate <theme>` يمسح الثيم ويشغل بوابات كل التجارب المثبتة التي يعرفها المصنع.
- `node factory.js build <theme>` يوقف البناء إذا كانت ذاكرة سلة غير موجودة أو قديمة أو ناقصة في الوثائق الحرجة.
- `node factory.js certify <theme>` يبدأ بمرحلة `Salla docs intelligence gate` قبل السياسة والبناء والتدقيق.
- `node factory.js certify <theme>` يعمل بوثائق strict افتراضياً، ويمكن استخدام `--relaxed-docs` فقط للتصحيح المحلي.
- مكونات القالب الرسمي تدخل في `strict-docs` فقط إذا نجحت مزامنة مصادر `SallaApp/theme-raed` المثبتة في `OFFICIAL_THEME_SOURCES` والمكتشفة من `OFFICIAL_THEME_REPOS`.

حد حداثة الذاكرة الافتراضي هو 14 يوم، ويمكن تغييره عبر:

```bash
set FACTORY_DOCS_MAX_AGE_DAYS=7
```

## الجذور الحرجة

هذه الصفحات لا نعتمد فيها على ترتيب الاكتشاف من `llms.txt`. تبقى مثبتة في `SEED_DOCS` وتظهر في `docs status` ضمن `Critical docs`:

- Main Requirements: https://docs.salla.dev/421886m0
- Metadata Review: https://docs.salla.dev/421889m0
- Pre-Launch Review: https://docs.salla.dev/421890m0
- Home Page: https://docs.salla.dev/422558m0
- Loyalty Program Page: https://docs.salla.dev/422576m0
- Setup Themes: https://docs.salla.dev/421879m0
- Twilight.json: https://docs.salla.dev/421921m0
- Twilight flavoured twig: https://docs.salla.dev/421929m0
- Components Overview: https://docs.salla.dev/422580m0
- Components Customization: https://docs.salla.dev/422690m0
- Twilight Web Components Usage: https://docs.salla.dev/422689m0
- Twilight Getting Started / Theme Raed context: https://docs.salla.dev/845904f0
- Twilight Change Log: https://docs.salla.dev/888746f0

أي رابط من شكل `doc-422558?nav=...#section` يتم تطبيعه إلى الصفحة الأساسية مع الاحتفاظ بالقسم كمرجع عند الحاجة.

## معنى التحذيرات

تحذير `UnknownComponentDoc` لا يعني أن المكون ممنوع فوراً. معناه أن المصنع لم يجد له مصدراً رسمياً ضمن الذاكرة الحالية، لذلك لا نرفعه إلى سياسة سماح محلية حتى نجد وثيقة سلة تنص عليه أو نضيف مصدره إلى seeds.

## المصادر الرسمية

- https://docs.salla.dev/llms.txt
- https://docs.salla.dev/421888m0
- https://docs.salla.dev/422688m0
- https://docs.salla.dev/422692m0
- https://docs.salla.dev/422718m0
- https://docs.salla.dev/422742m0
- https://docs.salla.dev/422603m0
- https://docs.salla.dev/422605m0
- https://docs.salla.dev/422721m0
- https://docs.salla.dev/422576m0
- https://docs.salla.dev/421879m0
- https://docs.salla.dev/421921m0
- https://docs.salla.dev/421929m0
- https://docs.salla.dev/422580m0
- https://docs.salla.dev/422690m0
- https://docs.salla.dev/422689m0
- https://docs.salla.dev/845904f0
- https://docs.salla.dev/421890m0
- https://docs.salla.dev/422558m0
- https://docs.salla.dev/888746f0
- https://github.com/SallaApp/theme-raed
