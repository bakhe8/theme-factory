# دليل النموذج: Salla Theme Factory

أنت تعمل داخل مصنع ثيمات سلة محلي. دورك ليس كتابة ثيم جميل فقط، بل إنتاج ثيم أو تجربة بيع تمر عبر ذاكرة وثائق سلة، سياسة المصنع، وتجارب البيع المسجلة.

القاعدة العليا: لا تعتمد على التخمين إذا كان المصنع يملك بوابة فحص. شغل البوابة المناسبة، واقرأ سبب الرفض، ثم أصلح.

---

## حقيقة المشروع

هذا المصنع ينتج ثيمات لمنصة سلة باستخدام:

- Twig لواجهات الصفحات والمكونات.
- SCSS لتخصيص المظهر.
- JS للتفاعل المحلي الآمن.
- `twilight.json` لتعريف بيانات الثيم و`features` و`components`.
- `workorders/<theme>/intake.json` كبداية طلب العمل ومدخلات العميل.
- `specs/<theme>.specs.json` كعقد مركزي يحدد هوية الثيم، الـ verticals المطلوبة، تجارب البيع، تجارب الصفحات، والتكاملات.
- `themes/<theme>/.factory/manifest.json` كتوقيع يثبت أن الثيم أنشأه المصنع، وليس نسخة يدوية من Raed.
- ذاكرة وثائق سلة المحلية في `core/docs-intelligence/generated/`.
- سياسة المصنع في `core/policies/salla-theme-policy.js`.
- سجل تجارب البيع في `core/experience-registry.js`.
- سجل تجارب الصفحات في `core/page-experience-registry.js`.
- سجل التكاملات الخارجية في `core/integration-registry.js`.
- سجل الابتكار في `innovations/` وبوابته في `core/innovation-factory.js`.
- بوابة حوكمة ميزات العرض في `core/display-feature-gate.js`.
- Runtime fixtures في `core/runtime/fixtures.js` لاختبار الثيم ببيانات غنية، حالات قاسية، ومتجر فارغ.
- Store verticals في `core/vertical-registry.js` لاختبار جاهزية المصنع لأنواع متاجر مرجعية مثل العطور الفاخرة.

المسار العام:

```bash
node factory.js docs status
node factory.js intake <theme> --name-ar="..." --name-en="..."
node factory.js manufacture <theme>
node factory.js deliver <theme>
```

الأوامر المفردة مثل `create`, `apply-specs`, `experience`, `page-experience`, و`certify` تستخدم للتصحيح أو التطوير الداخلي، لا كمسار إنتاج عادي.

---

## مصادر القرار

استخدم هذا الترتيب عند الحكم على أي تعديل:

1. عقد مواصفات الثيم:
   `workorders/<theme>/intake.json`
   `specs/<theme>.specs.json`
   `node factory.js workflow gate <theme>`
   `node factory.js apply-specs <theme>`
   `node factory.js specs gate <theme>`
   `node factory.js innovation gate <theme>`
   `node factory.js display gate <theme>`
   `node factory.js experience gate <theme>`
   `node factory.js page-experience gate <theme>`
   `node factory.js integration gate <theme>`
   `node factory.js vertical theme-gate <theme>`

2. وثائق سلة المزامنة محلياً:
   `node factory.js docs status`
   `node factory.js docs gate <theme> --strict`

3. سياسة المصنع:
   `node factory.js policy <theme>`

4. سجل تجارب البيع:
   `node factory.js experience list`
   `node factory.js experience show <experience-id>`
   `node factory.js experience gate <theme>`

5. سجل تجارب الصفحات والتكاملات:
   `node factory.js page-experience list`
   `node factory.js page-experience show brands-alphabet-filter`
   `node factory.js page-experience gate <theme>`
   `node factory.js integration list`
   `node factory.js integration show image-search-addon`
   `node factory.js integration gate <theme>`

6. Runtime fixtures:
   `node factory.js fixtures list`
   `node factory.js fixtures gate`
   `node factory.js vertical gate`
   `node factory.js vertical theme-gate <theme>`
   `node factory.js preview <theme> --all-pages --all-fixtures`
   `node factory.js coverage <theme>`
   `node factory.js links <theme>`
   `node factory.js browser <theme>`

7. سجل الابتكار:
   `node factory.js innovation list`
   `node factory.js innovation show <innovation-id>`
   `node factory.js innovation gate <theme>`

8. ثيم Raed:
   Raed هو starting point ومعيار معايرة، وليس سقفاً للإبداع. لا ترفض فكرة فقط لأنها غير موجودة في Raed إذا كانت تمر عبر السياسات والبوابات.

---

## عقد المواصفات

`specs/<theme>.specs.json` هو المصدر المركزي لما يجب أن يلتزم به الثيم. لا يكفي أن تكون تجربة مثبتة بالصدفة، ولا يكفي أن تكون ملفات المواصفات محفوظة دون أثر. بوابات `certify` تقارن الثيم بما هو مطلوب في المواصفات.

الأقسام التنفيذية المهمة:

- `verticals`: أنواع المتاجر المرجعية المطلوبة. إذا كان `required=true` فـ `vertical theme-gate <theme>` يفحص هذا الـ vertical فقط، ويثبت أن الثيم جاهز له.
- `experiences`: تجارب البيع المطلوبة كـ Custom Components. إذا كان `required=true` فـ `experience gate <theme>` يفشل عند غيابها أو كسرها.
- `page_experiences`: تجارب صفحات محددة مثل `brands.index`. إذا كان `required=true` فـ `page-experience gate <theme>` يفشل عند غيابها.
- `integrations`: تكاملات خارجية مثل البحث بالصورة. إذا كان `required=true` فـ `integration gate <theme>` يطلب مصدر أو عقد واضح ولا يسمح باختراع API داخل الثيم.
- `innovation`: تجارب أو أفكار قيد التطوير. إذا ذكرت في `experiments` فلا تدخل `certify` إلا إذا كانت `implemented` أو `certified` داخل `innovations/` ولها `factory_plan.fulfillment` يثبت المخرج الفعلي المطلوب من المصنع.

هذا يعني أن كل ثيم يستطيع اختيار مواصفاته بمعزل عن الثيمات الأخرى. ثيم عطور يمكن أن يطلب `luxury_fragrance` و`fragrance_discovery`، وثيم أزياء لا يطلبهما إلا إذا نصت مواصفاته على ذلك.

`certify` يشغل `specs gate`، لذلك لا يعتمد المصنع ثيماً بلا ملف مواصفات صالح.

## خط الإنتاج

لا يبدأ المطور من `themes/raed` ولا من نسخ أي مجلد ثيم. البداية المقبولة:

```bash
node factory.js intake <theme> --name-ar="..." --name-en="..."
node factory.js manufacture <theme>
```

مراحل `manufacture`:

- إنشاء `workorders/<theme>/intake.json` وقراءة `specs/<theme>.specs.json`.
- إنشاء الثيم من مصدر معتمد في `factory.config.json`.
- كتابة توقيع المصنع في `themes/<theme>/.factory/manifest.json`.
- تطبيق المواصفات.
- تثبيت التجارب المطلوبة من `specs.experiences`.
- تثبيت تجارب الصفحات المطلوبة من `specs.page_experiences`.
- فحص `innovation gate` بعد التثبيت للتأكد أن كل ابتكار مطلوب له fulfillment فعلي داخل specs والثيم.
- تشغيل الاعتماد الكامل.
- إنتاج `deliverables/<theme>/theme` كمجلد جاهز للتسليم.

إذا كان الثيم لا يملك `.factory/manifest.json` صالحاً، يفشل `workflow gate`. هذا يمنع مسار "انسخ Raed وعدل عليه".

## قاعدة ميزات العرض

أي خاصية أو ميزة عرض نحتاج ظهورها في أي ثيم يجب تطويرها في المصنع نفسه أولاً، وليس داخل مجلد الثيم مباشرة.

المسارات الصحيحة:

- فكرة جديدة: سجلها أولاً في `innovations/<id>.innovation.json` عبر `node factory.js innovation propose`.
- Feature رسمية: أضفها عبر `component feature` وتخضع لقائمة Salla المسموحة.
- Experience في الصفحة الرئيسية: أضفها إلى `core/experience-registry.js` ومولد `component-factory.js` ثم اطلبها في `specs.experiences`.
- Page Experience: أضفها إلى `core/page-experience-registry.js` ومولدها ثم اطلبها في `specs.page_experiences`.
- Integration خارجي: أضفه إلى `core/integration-registry.js` ولا تخترع API داخل الثيم.

`display gate` يرفض أي مكون عرض داخل `twilight.components` أو `src/views/components/home` إذا لم يكن من قالب سلة المعتمد أو تجربة مصنع مطلوبة في specs.

## مسار الابتكار

الإبداع يبدأ من المصنع ولا يبدأ من تعديل الثيم مباشرة:

```bash
node factory.js innovation propose <innovation-id> --type=experience --title-ar="..." --title-en="..."
node factory.js innovation promote <innovation-id> --status=experimental
node factory.js innovation promote <innovation-id> --status=implemented
node factory.js innovation gate <theme>
```

الحالات:

- `proposed`: فكرة موثقة فقط.
- `experimental`: مسموحة في المختبر مع `--allow-experimental`، لكنها لا تمر في `certify`.
- `implemented`: أصبحت Registry + Generator + Gate ويمكن طلبها في specs.
- `certified`: اجتازت السياسة والمتصفح وربط المصادر.
- `rejected`: ممنوعة.

إذا فشل `display gate` بسبب مكون جديد، لا تصلحه بإسكات البوابة. حوّله إلى Innovation، ثم Registry/Generator/Gate، ثم اربطه عبر `factory_plan.fulfillment` واطلبه من specs.

---

## الفرق المهم بين Feature و Experience

### `twilight.features`

هذه ميزات Twilight الرسمية الجاهزة. لا تخترع أسماء جديدة داخل `features[]`.

لإضافة Feature، استخدم:

```bash
node factory.js component <theme> feature <feature-id> --dry-run
node factory.js component <theme> feature <feature-id>
```

إذا رفض المصنع Feature مثل `component-flip-card` فهذا صحيح: ليست Feature رسمية موثقة.

### Custom Component

أي مكون جديد يكتبه المطور يجب أن يكون داخل `twilight.components`، ومساره غالباً `home.<slug>`، وملفه:

```text
src/views/components/home/<slug>.twig
```

أنشئه عبر المصنع:

```bash
node factory.js component <theme> custom <slug> --preset=basic --dry-run
node factory.js component <theme> custom <slug> --preset=banner --dry-run
node factory.js component <theme> custom <slug> --preset=links --dry-run
node factory.js component <theme> custom <slug> --preset=product-flip --dry-run
node factory.js component <theme> custom <slug> --preset=lookbook --dry-run
```

لا تنشئ Custom Component يدوياً إلا إذا كنت ستضيفه أيضاً إلى Registry أو تفحصه بنفس البوابات.

### Experience

Experience هي تجربة بيع مبتكرة فوق Custom Component. هذه هي الطبقة التي تجعل الثيم قابل للبيع ولا يبقى نسخة من Raed.

الأوامر:

```bash
node factory.js experience list
node factory.js experience show product-flip
node factory.js experience show lookbook
node factory.js experience show fragrance-discovery
node factory.js experience <theme> product-flip flip-showcase --dry-run
node factory.js experience <theme> lookbook editorial-lookbook --dry-run
node factory.js experience <theme> fragrance-discovery --dry-run
node factory.js experience gate <theme>
```

التجارب الجاهزة حالياً:

- `product-flip`: بطاقات منتجات قابلة للقلب مع زر سلة وسعر وصورة ورابط.
- `lookbook`: لوحة تسوق بصرية تربط صورة رئيسية بمنتجات مختارة.
- `fragrance-discovery`: تجربة عطور تجمع مستشار الرائحة، هرم النوتات، اقتراحات الإهداء/جرب وقرر، ومقارنة المنتجات.

### Page Experience

Page Experience هي تجربة مرتبطة بصفحة محددة مثل `brands.index` أو `products.index`. لا تضفها إلى `twilight.features` ولا تعاملها كـ `home.*`.

الأوامر:

```bash
node factory.js page-experience list
node factory.js page-experience show brands-alphabet-filter
node factory.js page-experience <theme> brands-alphabet-filter --dry-run
node factory.js page-experience <theme> brands-alphabet-filter
node factory.js page-experience gate <theme>
```

التجارب الجاهزة:

- `brands-alphabet-filter`: أزرار حروف أفقية عائمة فوق صفحة الماركات مع الحفاظ على روابط البراندات وعدم استخدام طلبات شبكة.

### Integration

Integration هي مطلب خارجي من إضافة أو خدمة مفعلة على متجر التاجر. مثال: البحث بالصورة.

الأوامر:

```bash
node factory.js integration list
node factory.js integration show image-search-addon
node factory.js integration gate <theme>
```

إذا طلب التاجر البحث بالصورة، لا يخترع المصنع API. يجب أن يثبت `specs/<theme>.specs.json` مصدر التكامل:

```json
"integrations": {
  "image_search": {
    "required": true,
    "implementation": "external-addon",
    "handled_by": "salla-addon-or-provider-name",
    "placement": "header-search",
    "source_url": "https://example.com/official-addon-contract"
  }
}
```

بدون `source_url` واضح ومصدر مسؤول، يفشل `integration gate` عند جعل التكامل `required=true`.

التجارب المخططة:

- `bundle-highlight`
- `story-slider`
- `urgency-strip`
- `category-showcase`

---

## سير عمل إنشاء ثيم

### 1. أنشئ طلب العمل والمواصفات

```bash
node factory.js intake <theme-name> --name-ar="اسم الثيم" --name-en="Theme Name"
```

عدّل `specs/<theme-name>.specs.json` فقط عند الحاجة. لا تنسخ Raed ولا تنشئ مجلد الثيم يدوياً.

### 2. شغل خط التصنيع الكامل

```bash
node factory.js manufacture <theme-name>
```

هذا الأمر ينشئ الثيم، يطبق المواصفات، يثبت التجارب المطلوبة، يشغل الاعتماد، ثم يجهز مجلد التسليم.

### 3. افحص التسليم

```bash
node factory.js workflow gate <theme-name>
node factory.js certify <theme-name>
node factory.js deliver <theme-name>
```

مجلد التسليم يكون في:

```text
deliverables/<theme-name>/theme
```

### أوامر تصحيح داخلية

استخدمها فقط إذا فشل `manufacture` وتحتاج إصلاح مرحلة محددة:

```bash
node factory.js create <theme-name>
node factory.js apply-specs <theme-name>
node factory.js specs gate <theme-name>
node factory.js innovation gate <theme-name>
node factory.js workflow gate <theme-name>
```

لإضافة تجربة يدوياً أثناء التصحيح، ابدأ دائماً بـ `--dry-run`:

```bash
node factory.js experience <theme-name> lookbook editorial-lookbook --dry-run
node factory.js experience <theme-name> product-flip flip-showcase --dry-run
node factory.js experience <theme-name> fragrance-discovery --dry-run
node factory.js page-experience <theme-name> brands-alphabet-filter --dry-run
```

ثم نفذ بدون `--dry-run` فقط إذا نجح الفحص.

### بوابات التصحيح

```bash
node factory.js docs gate <theme-name> --strict
node factory.js workflow gate <theme-name>
node factory.js specs gate <theme-name>
node factory.js innovation gate <theme-name>
node factory.js display gate <theme-name>
node factory.js policy <theme-name>
node factory.js experience gate <theme-name>
node factory.js page-experience gate <theme-name>
node factory.js integration gate <theme-name>
node factory.js fixtures gate
node factory.js vertical theme-gate <theme-name>
node factory.js preview <theme-name> --all-pages --all-fixtures
node factory.js coverage <theme-name>
node factory.js links <theme-name>
node factory.js browser <theme-name>
```

### 6. اعتمد

```bash
لا تخبر المستخدم أن العمل ناجح قبل أن يمر `manufacture` أو `certify` وينتج مجلد التسليم عند طلب الإنتاج.

---

## ما تفحصه البوابات

### Docs Gate

يتأكد أن ذاكرة وثائق سلة موجودة وحديثة، وأن الوثائق الحرجة موجودة، وأن المكونات المستخدمة مثبتة في الذاكرة.

```bash
node factory.js docs gate <theme> --strict
```

### Specs Contract Gate

يفحص أن الثيم لديه ملف `specs/<theme>.specs.json` صالح، وأن أقسام العقد الأساسية موجودة: `brand`, `visual_identity`, `features`, `verticals`, `experiences`, `page_experiences`, `integrations`, و`innovation`.

```bash
node factory.js specs gate <theme>
```

### Innovation Gate

يفحص سجل `innovations/` وما يطلبه الثيم داخل `specs.innovation.experiments`. في الاعتماد والإنتاج لا يسمح إلا بحالات `implemented` أو `certified`، ثم يتأكد أن الـ fulfillment المطلوب موجود في specs وأن بوابته الفعلية نجحت.

```bash
node factory.js innovation gate <theme>
```

### Factory Workflow Gate

يفحص أن الثيم أنشأه المصنع ويحمل `themes/<theme>/.factory/manifest.json`. إذا كان الملف مفقوداً فهذا غالباً يعني أن مطوراً نسخ Raed أو ثيماً آخر يدوياً، ويجب رفضه.

```bash
node factory.js workflow gate <theme>
node factory.js workflow gate <theme> --deliverable
```

### Factory Display Feature Gate

يفحص أن كل مكون عرض داخل `twilight.components` إما من قالب سلة المعتمد أو Experience مسجلة في المصنع ومطلوبة في `specs.experiences`. كما يرفض ملفات JS الخاصة بتجارب عرض غير مطلوبة في specs.

```bash
node factory.js display gate <theme>
```

### Policy Gate

يفحص:

- بنية الثيم والملفات المطلوبة.
- `package.json` و`twilight.json`.
- تطابق `identifier` مع اسم مجلد الثيم.
- تطابق `version` بين `package.json` و`twilight.json`.
- صحة `features[]`.
- صحة `components.path` وربطه بملف Twig.
- تكرار `component.key` أو `component.path`.
- منع حقول HTML من التاجر.
- منع `|raw`.
- منع `eval`, `new Function`, `document.write`.
- مراقبة `innerHTML`, `outerHTML`, و`insertAdjacentHTML` ولا يسمح بها إلا مع تعقيم أو قيمة موثوقة.
- منع طلبات الشبكة الخطرة في كروت المنتجات.
- Hooks الأساسية في `master.twig`.
- إعدادات Tailwind الخاصة بمكونات Twilight.
- حجم `public/` وحد 1MB.

```bash
node factory.js policy <theme>
```

### Experience Gate

يفحص التجارب المطلوبة في `specs.experiences` والتجارب المثبتة التي يعرفها Registry:

- مطابقة ما هو مطلوب في `specs.experiences`.
- تسجيل التجربة في `twilight.json`.
- وجود Twig وJS وSCSS.
- ربط JS في `home.js`.
- ربط SCSS في `app.scss`.
- وجود السعر والصورة ورابط المنتج وزر السلة.
- في تجارب العطور: وجود `fragrance_notes`, `scent_family`, `audience`, و`volume` داخل العرض.
- منع طلبات الشبكة المباشرة داخل JS التجربة.
- منع `eval`, `document.write`, وحقن HTML المباشر داخل JS التجربة.
- وجود إشارات تفاعل مثل `aria-expanded`, `aria-hidden`, أو `aria-current`.
- احترام `prefers-reduced-motion`.

```bash
node factory.js experience gate <theme>
```

### Page Experience Gate

يفحص التجارب المرتبطة بصفحات محددة:

- وجود marker التجربة داخل قالب الصفحة.
- وجود JS وSCSS المطلوبين.
- عدم استخدام طلبات شبكة أو `innerHTML`.
- الحفاظ على روابط الصفحة الأساسية مثل `brand.url`.
- مطابقة ما هو مطلوب في `specs.page_experiences`.

```bash
node factory.js page-experience gate <theme>
```

### Integration Gate

يفحص متطلبات الإضافات الخارجية في `specs.integrations`. لا يعتمد ميزة خارجية مطلوبة إلا مع مصدر أو عقد واضح.

```bash
node factory.js integration gate <theme>
```

### Fixtures Gate

يفحص بيانات التشغيل التي يعتمد عليها الـ runtime المحلي:

- وجود المنتجات والمستخدمين والمراجعات والتصنيفات والمتجر.
- صلاحية الصور والأسعار والعملات.
- وجود حالات بيع متنوعة: منتج عادي، تخفيض، نفاد مخزون، حجز، رقمي، تبرع، باقة، وطلب مسبق.
- وجود حالات قاسية تكشف مشاكل التصميم: نص طويل، صورة مفقودة، سعر مرتفع، متجر فارغ، سلة فارغة، ومراجعات قليلة أو معدومة.

```bash
node factory.js fixtures list
node factory.js fixtures show fashion-rich
node factory.js fixtures gate
```

الـ fixtures المعتمدة حالياً:

- `fashion-rich`: بيانات غنية تشبه متجر أزياء نشطاً.
- `edge-cases`: حالات صعبة لكشف مشاكل النصوص والصور والحالات غير المثالية.
- `fragrance-luxury`: متجر عطور فاخر مستلهم من بنية متجر جنيد، يغطي العطور والزيوت والبخور والمسك والمجموعات والعينات.
- `empty-store`: متجر فارغ لاختبار empty states وعدم انهيار الواجهة.

أي تجربة بيع جديدة يجب معاينتها على الأقل عبر `fashion-rich` و`edge-cases`. إذا كانت التجربة تظهر في الصفحة الرئيسية أو تعتمد على قوائم منتجات، افحصها أيضاً عبر `empty-store`.

### Store Vertical Gate

يفحص أن المصنع لا ينجح فقط مع fixtures عامة، بل مع نوع متجر مرجعي محدد. عند تشغيله بدون vertical id، يقرأ `specs.verticals` ويفحص فقط ما هو مطلوب للثيم. يمكن تمرير vertical id صراحة للفحص اليدوي. حالياً يوجد:

```bash
node factory.js vertical list
node factory.js vertical show luxury-fragrance
node factory.js vertical gate luxury-fragrance
node factory.js vertical theme-gate <theme>
node factory.js vertical theme-gate <theme> luxury-fragrance
```

`luxury-fragrance` يستخدم متجر جنيد للعطور كمعيار بنيوي: تصنيفات عطرية كثيرة، أقسام الصفحة الرئيسية المتكررة، منتجات عطور وزيوت وبخور ومجموعات وعينات، وحقول عطرية مثل `scent_family`, `fragrance_notes`, `volume`, و`audience`.

هذا الـ vertical يطلب أيضاً تثبيت Experience `fragrance-discovery` داخل الثيم. إذا كانت مواصفات الثيم تطلب `luxury_fragrance` وفشل `theme-gate`، فالثيم غير جاهز لمتاجر العطور حتى لو نجح مع fixtures عامة.

### Page Coverage Gate

يفحص أن كل قالب صفحة فعلي داخل:

```text
src/views/pages/**/*.twig
```

له سيناريو معاينة محلي، وأن كل ملف HTML متوقع تم توليده داخل `build/<theme>/...` بعد تشغيل:

```bash
node factory.js preview <theme> --all-pages --all-fixtures
node factory.js coverage <theme>
```

هذه البوابة تمنع وجود صفحة يمكن أن تظهر في متجر سلة الحقيقي بدون بديل محلي نستطيع فحص الثيم عليه بصرياً.

التقرير يكتب في:

```text
reports/page-coverage-<theme>.json
```

### Link Smoke Gate

يفحص كل روابط `href` الداخلية في ملفات المعاينة الناتجة، ويفشل إذا كان الرابط يشير إلى ملف أو مسار داخلي غير مولد. يتجاهل الروابط الخارجية وروابط الهاتف والبريد والـ anchors مثل `#mobile-menu`.

```bash
node factory.js preview <theme> --all-pages --all-fixtures
node factory.js coverage <theme>
node factory.js links <theme>
```

التقرير يكتب في:

```text
reports/link-smoke-<theme>.json
```

### Browser Smoke Gate

يفتح المعاينات الناتجة في Chrome/Edge headless ويفشل عند:

- أخطاء JavaScript runtime.
- رسائل `console.error` أو `console.assert`.
- موارد 404 غير متوقعة.
- صفحات فارغة أو بلا محتوى نصي كاف.

كما يلتقط screenshots في:

```text
reports/browser-smoke/<theme>/
```

```bash
node factory.js preview <theme> --all-pages --all-fixtures
node factory.js coverage <theme>
node factory.js browser <theme>
```

---

## قواعد لا تخالفها

| ممنوع | السبب |
|---|---|
| اختراع اسم جديد داخل `twilight.features` | Features رسمية فقط |
| إضافة Custom Component بدون `twilight.components` | لن يظهر في محرر سلة |
| مسار component خارج نمط `home.<slug>` دون مصدر واضح | عقود سلة الحالية تربط Theme Components بصفحة Home |
| `|raw` في Twig | خطر XSS |
| `eval()` أو `new Function()` | خطر أمني |
| `document.write()` | خطر أمني |
| `innerHTML =` داخل JS التجارب | خطر حقن HTML |
| حقل `html`, `richtext`, `wysiwyg`, `code`, `custom-html` للتاجر | يسمح بحقن HTML |
| طلب شبكة لكل منتج عند العرض | خطر أداء ومخالفة سياسة المصنع |
| نسخ `themes/raed` يدوياً لإنتاج ثيم | يتجاوز `intake/specs/workflow gate` ويصنع ثيم بلا توقيع |
| تعديل ثيم لا يملك `.factory/manifest.json` | يعني أن الثيم خارج خط المصنع |
| إضافة مكون عرض داخل الثيم مباشرة دون Registry/Specs | يجعل الميزة غير قابلة للتكرار أو الفحص |
| إدخال Innovation بحالة `proposed` أو `experimental` إلى `certify` | يخلط المختبر بالتسليم |
| تعديل `public/` يدوياً | مخرجات بناء |
| حذف hooks من `master.twig` | مطلوبة كامتدادات |
| كسر زر السلة أو السعر أو صورة المنتج في تجربة بيع | تجربة غير صالحة تجارياً |
| اعتماد تجربة دون تجربتها على fixtures متعددة | قد تنجح ببيانات مثالية وتفشل في متجر حقيقي |

---

## هيكل الملفات المهم

```text
themes/<name>/
├── twilight.json
├── package.json
├── webpack.config.js
├── tailwind.config.js
├── src/
│   ├── views/
│   │   ├── layouts/master.twig
│   │   ├── pages/index.twig
│   │   └── components/
│   │       ├── header/header.twig
│   │       ├── footer/footer.twig
│   │       └── home/
│   ├── assets/
│   │   ├── js/
│   │   │   ├── home.js
│   │   │   └── components/
│   │   └── styles/
│   │       ├── 01-settings/global.scss
│   │       ├── 04-components/
│   │       └── app.scss
│   └── locales/
│       ├── ar.json
│       └── en.json
└── public/
```

عند إضافة Experience، يجب أن ترى غالباً:

```text
src/views/components/home/<slug>.twig
src/assets/js/components/<slug>.js
src/assets/styles/04-components/<slug>.scss
```

مع import في:

```text
src/assets/js/home.js
src/assets/styles/app.scss
```

---

## أوامر مرجعية

```bash
node factory.js docs status
node factory.js docs sync --max=180
node factory.js docs gate <theme> --strict
node factory.js intake <theme>
node factory.js manufacture <theme>
node factory.js workflow gate <theme>
node factory.js deliver <theme>
node factory.js specs gate <theme>
node factory.js innovation gate <theme>
node factory.js display gate <theme>

node factory.js create <theme>
node factory.js apply-specs <theme>

node factory.js component <theme> feature component-youtube --dry-run
node factory.js component <theme> custom promo-strip --preset=banner --dry-run

node factory.js experience list
node factory.js experience show product-flip
node factory.js experience show lookbook
node factory.js experience show fragrance-discovery
node factory.js experience <theme> product-flip flip-showcase --dry-run
node factory.js experience <theme> lookbook editorial-lookbook --dry-run
node factory.js experience <theme> fragrance-discovery --dry-run
node factory.js experience gate <theme>

node factory.js page-experience list
node factory.js page-experience show brands-alphabet-filter
node factory.js page-experience <theme> brands-alphabet-filter --dry-run
node factory.js page-experience gate <theme>

node factory.js integration list
node factory.js integration show image-search-addon
node factory.js integration gate <theme>

node factory.js innovation list
node factory.js innovation show zen-products-grid
node factory.js innovation gate <theme>

node factory.js fixtures list
node factory.js fixtures show fashion-rich
node factory.js fixtures gate
node factory.js vertical gate
node factory.js vertical theme-gate <theme>

node factory.js policy <theme>
node factory.js audit <theme>
node factory.js preview <theme> --all-pages --all-fixtures
node factory.js coverage <theme>
node factory.js links <theme>
node factory.js browser <theme>
node factory.js build <theme>
node factory.js certify <theme>
```

إذا عدلت ملفات المصنع نفسه، شغل فحص syntax للملفات التي لمستها:

```bash
node -c factory.js
node -c core/factory-config.js
node -c core/intake-factory.js
node -c core/manufacture-theme.js
node -c core/deliver-theme.js
node -c core/workflow-gate.js
node -c core/display-feature-gate.js
node -c core/specs-loader.js
node -c core/specs-gate.js
node -c core/innovation-factory.js
node -c core/component-factory.js
node -c core/experience-registry.js
node -c core/experience-gate.js
node -c core/experience-factory.js
node -c core/page-experience-registry.js
node -c core/page-experience-gate.js
node -c core/page-experience-factory.js
node -c core/integration-registry.js
node -c core/integration-factory.js
node -c core/fixtures-check.js
node -c core/vertical-registry.js
node -c core/vertical-factory.js
node -c core/page-registry.js
node -c core/page-coverage.js
node -c core/runtime/fixtures.js
node -c core/runtime/mock-data.js
node -c core/runtime/salla-client-runtime.js
node -c core/runtime/twig-renderer.js
node -c core/link-smoke.js
node -c core/browser-smoke.js
node -c core/policies/salla-theme-policy.js
```

---

## طريقة العمل مع طلبات المستخدم

### إذا طلب ثيم جديد

1. شغل `node factory.js intake <theme> --name-ar="..." --name-en="..."`.
2. عدّل `specs/<theme>.specs.json` ليطلب التجارب والـ verticals والتكاملات المطلوبة.
3. شغل `node factory.js manufacture <theme>`.
4. لا تعدل `themes/raed` ولا تنسخه يدوياً.
5. سلّم من `deliverables/<theme>/theme` فقط بعد نجاح التصنيع.

### إذا طلب مكون جديد

لا تسأل هل هو موجود في Raed. اسأل: هل هو Feature رسمية أم Custom Component؟

- إن كان Feature جاهزة، استخدم `component feature`.
- إن كان تجربة عرض، استخدم `experience` أو أضفها إلى Registry.
- إن كان تجربة صفحة محددة، استخدم `page-experience` أو أضفها إلى Registry.
- إن كان تكاملاً خارجياً مثل البحث بالصورة، استخدم `integration` ولا تخترع API داخل الثيم.
- إن كان Custom Component بسيط، استخدم `component custom`.
- إن كان ابتكاراً جديداً لا يملك Registry/Gate، ابدأ بـ `innovation propose` ولا تدخله في ثيم إنتاجي.

### إذا طلب فكرة تفاعلية مثل قلب كرت المنتج

هذا مسموح كمبدأ إذا مر عبر السياسات. استخدم:

```bash
node factory.js experience <theme> product-flip flip-showcase --dry-run
```

ولا تضفه إلى `twilight.features`.

### إذا طلب تجربة بصرية مثل Lookbook

استخدم:

```bash
node factory.js experience <theme> lookbook editorial-lookbook --dry-run
```

### إذا طلب متجر عطور فاخر

اجعل `specs/<theme>.specs.json` يطلب:

```json
{
  "verticals": {
    "luxury_fragrance": {
      "required": true,
      "fixture": "fragrance-luxury"
    }
  },
  "experiences": {
    "fragrance_discovery": {
      "required": true,
      "slug": "fragrance-discovery"
    }
  }
}
```

استخدم:

```bash
node factory.js experience <theme> fragrance-discovery --dry-run
node factory.js experience <theme> fragrance-discovery
node factory.js vertical theme-gate <theme>
node factory.js preview <theme> --fixture=fragrance-luxury --all-pages
```

---

## مبدأ الإبداع المنضبط

السياسات هي سور أمان وليست سقفاً للإبداع.

لا تنتج ثيمات لا تتجاوز Raed في القيمة. ابن تجارب عرض جديدة، لكن اجعلها:

- مبنية على Twig/SCSS/JS محلي آمن.
- مربوطة بـ `twilight.components`.
- محافظة على السعر والصورة وزر السلة وروابط المنتج.
- بلا HTML من التاجر.
- بلا طلبات شبكة لكل منتج.
- قابلة للفحص عبر `experience gate`.
- قابلة للعمل مع بيانات runtime متنوعة، لا مع عينة مثالية واحدة.

إذا لم تستطع بوابة المصنع إثبات سلامة التجربة، لا تعتبرها جاهزة.
