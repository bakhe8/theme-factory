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
- `core/factory-preview.js`: يولد معاينة لكل ثيم داخل `build/<theme>/index.html` ويمكن تبديل fixture أثناء التشغيل.

## Runtime fixtures

الـ runtime المحلي لا يعتمد الآن على منتجات وصور ومراجعات ثابتة فقط، بل يملك سيناريوهات بيانات واضحة:

| Fixture | الهدف |
|---|---|
| `fashion-rich` | متجر غني بمنتجات متعددة، صور، مستخدمين، مراجعات، تصنيفات، علامات تجارية، سلة، وطلبات. |
| `edge-cases` | حالات تكشف أخطاء التصميم: نص طويل، صورة مفقودة، منتج نافد، سعر مرتفع، وتقييم قليل. |
| `empty-store` | متجر فارغ لاختبار empty states وعدم انهيار المكونات عندما لا توجد منتجات أو مراجعات. |

الأوامر:

```bash
node factory.js fixtures list
node factory.js fixtures show fashion-rich
node factory.js fixtures gate
```

المعاينة ببيانات محددة:

```bash
node factory.js preview zen-theme --fixture=fashion-rich
node factory.js preview zen-theme --fixture=edge-cases
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

## حدود المطابقة الحالية

- لا يحاكي الدفع، تسجيل الدخول الحقيقي، checkout، أو صلاحيات العملاء بدقة كاملة.
- مكونات `salla-*` الحالية جزئية وليست مطابقة بصريا أو سلوكيا بالكامل.
- الـ fixtures تغطي بيانات المتجر الأساسية وتجارب الصفحة الرئيسية، لكنها لا تمثل كل صفحات سلة حتى الآن.
- لا توجد بعد اختبارات browser contract تقارن السلوك بسيناريوهات متعددة.
- لا تزال ملفات الثيم المبنية نفسها تعاني من مشكلة `textContent` الناتجة عن التطهير الآلي.

## التحديات القادمة

1. بناء registry كامل لمكونات `salla-*` الأكثر استخداما.
2. إضافة سيناريوهات صفحات: product, cart, blog, customer, thank-you.
3. إضافة Playwright لفحص عدم وجود أخطاء console والتقاط screenshots لكل fixture.
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
