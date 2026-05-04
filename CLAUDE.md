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
- ذاكرة وثائق سلة المحلية في `core/docs-intelligence/generated/`.
- سياسة المصنع في `core/policies/salla-theme-policy.js`.
- سجل تجارب البيع في `core/experience-registry.js`.
- Runtime fixtures في `core/runtime/fixtures.js` لاختبار الثيم ببيانات غنية، حالات قاسية، ومتجر فارغ.

المسار العام:

```bash
node factory.js docs status
node factory.js create <theme>
node factory.js apply-specs <theme>
node factory.js experience <theme> <experience-id> [slug] --dry-run
node factory.js experience <theme> <experience-id> [slug]
node factory.js fixtures gate
node factory.js preview <theme> --fixture=fashion-rich
node factory.js preview <theme> --fixture=edge-cases
node factory.js preview <theme> --fixture=empty-store
node factory.js certify <theme> --strict-docs
```

---

## مصادر القرار

استخدم هذا الترتيب عند الحكم على أي تعديل:

1. وثائق سلة المزامنة محلياً:
   `node factory.js docs status`
   `node factory.js docs gate <theme> --strict`

2. سياسة المصنع:
   `node factory.js policy <theme>`

3. سجل تجارب البيع:
   `node factory.js experience list`
   `node factory.js experience show <experience-id>`
   `node factory.js experience gate <theme>`

4. Runtime fixtures:
   `node factory.js fixtures list`
   `node factory.js fixtures gate`
   `node factory.js preview <theme> --fixture=fashion-rich`
   `node factory.js preview <theme> --fixture=edge-cases`
   `node factory.js preview <theme> --fixture=empty-store`

5. ثيم Raed:
   Raed هو starting point ومعيار معايرة، وليس سقفاً للإبداع. لا ترفض فكرة فقط لأنها غير موجودة في Raed إذا كانت تمر عبر السياسات والبوابات.

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
node factory.js experience <theme> product-flip flip-showcase --dry-run
node factory.js experience <theme> lookbook editorial-lookbook --dry-run
node factory.js experience gate <theme>
```

التجارب الجاهزة حالياً:

- `product-flip`: بطاقات منتجات قابلة للقلب مع زر سلة وسعر وصورة ورابط.
- `lookbook`: لوحة تسوق بصرية تربط صورة رئيسية بمنتجات مختارة.

التجارب المخططة:

- `bundle-highlight`
- `story-slider`
- `urgency-strip`
- `category-showcase`

---

## سير عمل إنشاء ثيم

### 1. تأكد من ذاكرة سلة

```bash
node factory.js docs status
```

إذا كانت الذاكرة قديمة أو ناقصة:

```bash
node factory.js docs sync --max=180
```

### 2. أنشئ الثيم

```bash
node factory.js create <theme-name>
```

### 3. طبق المواصفات

```bash
node factory.js apply-specs <theme-name>
```

### 4. أضف تجربة بيع إن كانت مطلوبة

ابدأ دائماً بـ `--dry-run`:

```bash
node factory.js experience <theme-name> lookbook editorial-lookbook --dry-run
node factory.js experience <theme-name> product-flip flip-showcase --dry-run
```

ثم نفذ بدون `--dry-run` فقط إذا نجح الفحص.

### 5. افحص

```bash
node factory.js docs gate <theme-name> --strict
node factory.js policy <theme-name>
node factory.js experience gate <theme-name>
node factory.js fixtures gate
node factory.js preview <theme-name> --fixture=fashion-rich
node factory.js preview <theme-name> --fixture=edge-cases
node factory.js preview <theme-name> --fixture=empty-store
```

### 6. اعتمد

```bash
node factory.js certify <theme-name> --strict-docs
```

لا تخبر المستخدم أن العمل ناجح قبل أن تمر البوابات المطلوبة.

---

## ما تفحصه البوابات

### Docs Gate

يتأكد أن ذاكرة وثائق سلة موجودة وحديثة، وأن الوثائق الحرجة موجودة، وأن المكونات المستخدمة مثبتة في الذاكرة.

```bash
node factory.js docs gate <theme> --strict
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
- منع طلبات الشبكة الخطرة في كروت المنتجات.
- Hooks الأساسية في `master.twig`.
- إعدادات Tailwind الخاصة بمكونات Twilight.
- حجم `public/` وحد 1MB.

```bash
node factory.js policy <theme>
```

### Experience Gate

يفحص التجارب المثبتة التي يعرفها Registry:

- تسجيل التجربة في `twilight.json`.
- وجود Twig وJS وSCSS.
- ربط JS في `home.js`.
- ربط SCSS في `app.scss`.
- وجود السعر والصورة ورابط المنتج وزر السلة.
- منع طلبات الشبكة المباشرة داخل JS التجربة.
- منع `eval`, `document.write`, و`innerHTML =` داخل JS التجربة.
- وجود إشارات تفاعل مثل `aria-expanded`, `aria-hidden`, أو `aria-current`.
- احترام `prefers-reduced-motion`.

```bash
node factory.js experience gate <theme>
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
- `empty-store`: متجر فارغ لاختبار empty states وعدم انهيار الواجهة.

أي تجربة بيع جديدة يجب معاينتها على الأقل عبر `fashion-rich` و`edge-cases`. إذا كانت التجربة تظهر في الصفحة الرئيسية أو تعتمد على قوائم منتجات، افحصها أيضاً عبر `empty-store`.

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

node factory.js create <theme>
node factory.js apply-specs <theme>

node factory.js component <theme> feature component-youtube --dry-run
node factory.js component <theme> custom promo-strip --preset=banner --dry-run

node factory.js experience list
node factory.js experience show product-flip
node factory.js experience show lookbook
node factory.js experience <theme> product-flip flip-showcase --dry-run
node factory.js experience <theme> lookbook editorial-lookbook --dry-run
node factory.js experience gate <theme>

node factory.js fixtures list
node factory.js fixtures show fashion-rich
node factory.js fixtures gate

node factory.js policy <theme>
node factory.js audit <theme>
node factory.js preview <theme> --fixture=fashion-rich
node factory.js preview <theme> --fixture=edge-cases
node factory.js preview <theme> --fixture=empty-store
node factory.js build <theme>
node factory.js certify <theme> --strict-docs
```

إذا عدلت ملفات المصنع نفسه، شغل فحص syntax للملفات التي لمستها:

```bash
node -c factory.js
node -c core/component-factory.js
node -c core/experience-registry.js
node -c core/experience-gate.js
node -c core/experience-factory.js
node -c core/fixtures-check.js
node -c core/runtime/fixtures.js
node -c core/runtime/mock-data.js
node -c core/runtime/salla-client-runtime.js
node -c core/policies/salla-theme-policy.js
```

---

## طريقة العمل مع طلبات المستخدم

### إذا طلب ثيم جديد

1. اقرأ أو أنشئ `specs/<theme>.specs.json`.
2. شغل `docs status`.
3. شغل `create`.
4. شغل `apply-specs`.
5. أضف تجارب بيع مناسبة عبر `experience ... --dry-run`.
6. نفذ التجارب بعد نجاح dry-run.
7. شغل preview عبر `fashion-rich`, `edge-cases`, و`empty-store`.
8. شغل `certify --strict-docs`.

### إذا طلب مكون جديد

لا تسأل هل هو موجود في Raed. اسأل: هل هو Feature رسمية أم Custom Component؟

- إن كان Feature جاهزة، استخدم `component feature`.
- إن كان تجربة عرض، استخدم `experience` أو أضفها إلى Registry.
- إن كان Custom Component بسيط، استخدم `component custom`.

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
