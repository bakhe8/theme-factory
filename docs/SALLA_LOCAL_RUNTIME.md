# Salla Local Runtime Emulator

## الهدف

هدف هذا المسار هو بناء Runtime محلي يحاكي عقد منصة سلة الذي تعتمد عليه الثيمات أثناء التطوير، بحيث يمكن تشغيل الثيمات وفحصها محليا قبل المرور على `salla theme preview` أو مراجعة المنصة.

هذا runtime ليس بديلا رسميا عن سلة، لكنه طبقة توافق محلية تقلل الفجوة بين ملفات الثيم الخام وبيئة سلة الفعلية.

## نطاق المطابقة

الطبقة المحلية تستهدف محاكاة العناصر التالية:

- متغيرات Twig العامة مثل `store`, `theme`, `cart`, `user`, `language`, و`page`.
- دوال وفلاتر Twig الشائعة مثل `trans`, `link`, `asset`, `cdn`, `money`, `json_encode`, و`is_page`.
- وسوم سلة المخصصة مثل `{% component %}` و`{% hook %}`.
- كائن المتصفح `window.salla`.
- واجهات `salla.config`, `salla.lang`, `salla.cart`, `salla.wishlist`, `salla.event`, `salla.url`, و`salla.helpers`.
- Web Components شائعة مثل `salla-button`, `salla-search`, `salla-cart-summary`, `salla-menu`, `salla-slider`, و`salla-products-list`.

## ما تم تأسيسه

- `core/runtime/fixtures.js`: مكتبة بيانات تشغيل قابلة للتبديل، تشمل متجر غني، حالات قاسية، ومتجر فارغ.
- `core/runtime/mock-data.js`: يبني سياق Twig والمتصفح من fixture مختار بدلاً من عينة ثابتة واحدة.
- `core/runtime/twig-renderer.js`: Renderer أولي لقوالب Twig الفعلية مع دعم `extends`, `block`, `component`, و`hook`.
- `core/runtime/salla-client-runtime.js`: SDK وWeb Components محلية تعمل داخل المتصفح، مع دعم أولي لقوائم المنتجات والسلايدر والمراجعات والتقييم.
- `core/fixtures-check.js`: بوابة فحص للـ fixtures حتى لا تصبح بيانات التشغيل ملفات محفوظة بلا أثر.
- `core/page-registry.js`: سجل الصفحات الإلزامية التي يجب أن يكون لها بديل محلي قابل للمعاينة.
- `core/page-coverage.js`: بوابة تمنع وجود قالب صفحة في الثيم بلا سيناريو معاينة وملف HTML مولد.
- `core/factory-preview.js`: يولد معاينة لكل ثيم داخل `build/<theme>/...` ويمكن تبديل fixture أثناء التشغيل.

## Runtime fixtures

الـ runtime المحلي لا يعتمد الآن على منتجات وصور ومراجعات ثابتة فقط، بل يملك سيناريوهات بيانات واضحة:

| Fixture | الهدف |
|---|---|
| `fashion-rich` | متجر غني بمنتجات متعددة، صور، مستخدمين، مراجعات، تصنيفات، علامات تجارية، سلة، وطلبات. |
| `edge-cases` | حالات تكشف أخطاء التصميم: نص طويل، صورة مفقودة، منتج نافد، سعر مرتفع، وتقييم قليل. |
| `fragrance-luxury` | متجر عطور فاخر مستلهم من بنية متجر جنيد: عطور، عود، مسك، بخور، مجموعات، عينات، وتصنيفات كثيرة. |
| `empty-store` | متجر فارغ لاختبار empty states وعدم انهيار المكونات عندما لا توجد منتجات أو مراجعات. |

الأوامر:

```bash
node factory.js fixtures list
node factory.js fixtures show fashion-rich
node factory.js fixtures show fragrance-luxury
node factory.js fixtures gate
node factory.js vertical gate luxury-fragrance
node factory.js vertical theme-gate zen-theme
node factory.js vertical theme-gate zen-theme luxury-fragrance
```

`fragrance-luxury` لا يكتفي بمنتجات عطرية. يحتوي أيضاً بيانات كافية لتجارب اكتشاف الرائحة مثل `fragrance-discovery` و`scent-quiz`: مستشار رائحة، هرم نوتات، عائلات عطرية، جمهور مستهدف، اقتراحات إهداء/جرب وقرر، ومقارنة منتجات.

المعاينة ببيانات محددة:

```bash
node factory.js preview zen-theme --fixture=fashion-rich
node factory.js preview zen-theme --fixture=edge-cases
node factory.js preview zen-theme --fixture=fragrance-luxury --all-pages
node factory.js preview zen-theme --fixture=empty-store
```

يمكن أيضاً اختيار fixture عبر متغير البيئة:

```bash
$env:FACTORY_FIXTURE='edge-cases'
node factory.js preview zen-theme
```

## قاعدة الاعتماد

لا يكفي أن ينجح الثيم مع بيانات جميلة ومثالية. أي مكون أو تجربة بيع جديدة يجب أن تثبت على الأقل:

- أنها تعرض المنتج العادي ومنتج التخفيض ومنتج نفاد المخزون بدون كسر الواجهة.
- أنها تتحمل النصوص الطويلة والصور الناقصة.
- أنها تظهر حالة فارغة مقبولة عند عدم وجود منتجات أو مراجعات.
- أنها لا تعتمد على طلبات شبكة خارجية أو HTML من التاجر كي تعمل.
- أنها تحافظ على الصورة والسعر ورابط المنتج وزر السلة في تجارب البيع.

بوابة `fixtures gate` تعمل داخل `build` و`certify`، لذلك لا تكون البيانات مجرد ملفات محفوظة؛ هي جزء من مسار الاعتماد.

## تغطية صفحات المتجر

الهدف الآن أن لا توجد صفحة يمكن أن تظهر في متجر سلة الحقيقي دون بديل محلي في المصنع. عند تشغيل:

```bash
node factory.js preview <theme> --all-pages --all-fixtures
node factory.js coverage <theme>
```

يتحقق المصنع من:

- وجود سيناريو محلي لكل قالب داخل `src/views/pages/**/*.twig` باستثناء partials.
- توليد ملفات HTML فعلية لكل صفحة أساسية: الرئيسية، قوائم المنتجات، صفحة المنتج، البحث، السلة، المدونة، المقال، البراندات، صفحات العميل، الطلبات، المحفظة، التنبيهات، الولاء، صفحة الهبوط، الصفحات الثابتة، الشهادات، وصفحة الشكر.
- توليد صفحات ديناميكية من البيانات: كل منتج، كل تصنيف، كل مقال، كل براند، وكل طلب متاح في fixture.
- إدخال fixture `fragrance-luxury` ضمن `--all-fixtures` حتى لا يقاس المصنع على متاجر أزياء فقط.
- ربط `fragrance-luxury` بمكونات اكتشاف العطور مثل `home.fragrance-discovery` و`home.scent-quiz` عندما تكون مثبتة في الثيم، حتى تظهر تجربة العطور فعلياً في المعاينة.
- فشل الاعتماد إذا أضيف قالب صفحة جديد ولم يضف له المصنع سيناريو معاينة.

التقرير:

```text
reports/page-coverage-<theme>.json
```

## حدود المطابقة الحالية

- لا يحاكي الدفع، تسجيل الدخول الحقيقي، checkout، أو صلاحيات العملاء بدقة كاملة.
- مكونات `salla-*` الحالية جزئية وليست مطابقة بصريا أو سلوكيا بالكامل.
- لا توجد بعد اختبارات browser contract تقارن السلوك بسيناريوهات متعددة.
- يعالج runtime حالات المتجر الفارغ دون تمرير `source-value=[]` إلى مكونات منتجات Twilight. آخر فحص `luxury-fragrance` مر بـ `Twilight smoke` دون تحذيرات.

## التحديات القادمة

1. بناء registry كامل لمكونات `salla-*` الأكثر استخداما.
2. توسيع سيناريوهات الصفحات الديناميكية بعد التغطية الحالية: product, cart, blog, customer, thank-you.
3. تحويل فحوصات browser الحالية إلى عقود سلوك أعمق لكل fixture، وليس مجرد smoke.
4. منع أي تسرب لملفات runtime إلى `themes/*/src` أو `themes/*/public`.
5. استبدال الفحص القائم على الكلمات المفتاحية بفحوصات سياقية لا تكسر الثيم.
6. توسيع fixtures لتشمل طرق دفع، شحن، كوبونات، اختلافات منتجات، وبيانات عميل أكثر تفصيلا.

## أمر التشغيل

```bash
node factory.js preview zen-theme --fixture=fashion-rich
node factory.js preview raed --fixture=edge-cases
```

الخرج:

```text
build/<theme>/index.html
```
