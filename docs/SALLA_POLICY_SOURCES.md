# سياسات المصنع المبنية على وثائق سلة

هذه الوثيقة تفصل القواعد التي يعتمدها `node factory.js policy`. القاعدة تصبح مانعة فقط عندما يوجد نص واضح في وثائق سلة ويمكن فحصها محلياً بدون تخمين كبير. القواعد التي تحتاج مشاهدة فعلية في المتصفح تبقى تحذيرية أو توثيقية.

يمكن تحديث مصادر القواعد عبر:

```bash
node factory.js docs sync --max=180
```

بعد المزامنة، يقرأ `policy` ملف `core/docs-intelligence/generated/rules.generated.json` ويفضل المصدر المولد من الوثائق الرسمية إذا كان متاحاً.

## مصفوفة القواعد

| Rule ID | الحكم المحلي | المصدر الرسمي | ماذا نفحص محلياً؟ |
| --- | --- | --- | --- |
| `SALLA_THEME_SIZE_PUBLIC_1MB` | مانع إذا تجاوزت مخرجات `public` حد 1MiB، وتحذير عند الاقتراب | Technical Review 1.1، و Main Requirements 3.8 | مجموع ملفات `public` بعد البناء |
| `SALLA_LOCALIZATION_REQUIRED` | مانع عند غياب ملفات اللغة، وتحذير عند اختلاف المفاتيح | Technical Review 1.2 | وجود `src/locales/ar.json` و `src/locales/en.json` وتطابق المفاتيح |
| `SALLA_NO_PER_PRODUCT_REQUESTS` | مانع إذا أطلق كرت المنتج طلب شبكة | Technical Review 1.5 | `fetch`/`XMLHttpRequest`/`axios`/`salla.api.request` داخل ملفات product card |
| `SALLA_NO_RAW_TWIG` | مانع | Technical Review 2.4 | وجود `|raw` داخل ملفات Twig |
| `SALLA_NO_MERCHANT_CUSTOM_HTML` | مانع | Technical Review 2.4 و Bundle Technical Review | حقول `twilight.json` التي تسمح للتاجر بإدخال HTML/Code، أو `script` داخل static field |
| `SALLA_FAST_CHECKOUT_CSS_ONLY` | مانع | Add Product - Fast Checkout Feature | منع تخصيص `salla-mini-checkout-widget` إلا عبر المتغيرات الثلاثة المسموحة |
| `SALLA_PRODUCT_LISTING_CONTRACT` | تحذير | UX/UI Review 4.1 | فحص تقريبي أن `custom-salla-product-card` يعرض العنوان، السعر، الصورة، وزر السلة |
| `SALLA_CUSTOM_PRODUCT_CARD_ALLOWED` | سماح موثق | Product Card - Custom Salla Product Card Component | لا يفشل وجود `custom-salla-product-card` بحد ذاته |
| `SALLA_HOOKS_REQUIRED` | تحذير | Themes Hooks | وجود hooks الأساسية في `master.twig` |

## ماذا يعني هذا عملياً؟

### هل Flip Product Card مسموح؟

نعم، كفكرة UI هو مسموح إذا بني داخل `custom-salla-product-card` أو فوق كرت المنتج الموجود، لأن وثائق سلة تنص على أن المطور يستطيع تخصيص كروت المنتجات عبر `custom-salla-product-card`.

لكن يصبح ممنوعاً أو مرفوضاً محلياً إذا فعل واحداً من التالي:

- يطلق request لكل منتج عند عرض الكرت.
- يخفي العنوان أو السعر أو الصورة أو زر السلة بشكل يكسر عقد صفحة المنتج.
- يحقن HTML حر من إعدادات التاجر أو وصف المنتج.
- يعدل مكون الدفع السريع أو checkout بدلاً من استدعاء مكونات سلة.

## المصادر

- Technical Theme Review: https://docs.salla.dev/421888m0
- Theme Publish Main Requirements: https://docs.salla.dev/421886m0
- UX/UI Review: https://docs.salla.dev/421887m0
- Product Card: https://docs.salla.dev/422718m0
- Add Product / Fast Checkout: https://docs.salla.dev/422692m0
- Bundle Publish Requirements: https://docs.salla.dev/1945741m0
- Themes Hooks: https://docs.salla.dev/422552m0
- Salla docs llms index: https://docs.salla.dev/llms.txt
