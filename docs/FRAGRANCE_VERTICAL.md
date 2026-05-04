# Luxury Fragrance Vertical

هذه البيئة مخصصة لتوليد وفحص ثيمات متاجر العطور الفاخرة: عطور شرقية وغربية، دهن عود، زيوت عطرية، بخور، مباخر، مسك، مجموعات، وعينات.

## الأوامر

```bash
node factory.js vertical list
node factory.js vertical show luxury-fragrance
node factory.js vertical gate luxury-fragrance
node factory.js vertical theme-gate <theme>
node factory.js vertical theme-gate <theme> luxury-fragrance
node factory.js fixtures show fragrance-luxury
node factory.js preview zen-theme --fixture=fragrance-luxury --all-pages
```

## ما يجب أن يعرفه المصنع

- المتجر العطري يحتاج تصنيفات أكثر من متجر أزياء عادي.
- الصفحة الرئيسية يجب أن تعرض أقساماً متكررة لاكتشاف الرائحة: الأكثر مبيعاً، المسك، البخور، والإطلاقات الجديدة.
- المنتج العطري يحتاج حقولاً معنوية مثل `scent_family`, `fragrance_notes`, `volume`, و`audience`.
- يجب اختبار منتجات: عطر بخاخ، دهن عود، مسك، بخور، مبخرة، مجموعة، عينة، منتج نافد، منتج مخفض، ومنتج طلب مسبق.
- يجب أن تطلب مواصفات الثيم `luxury_fragrance` و`fragrance_discovery` إذا كان سيعتمد لهذا الـ vertical: مستشار رائحة، هرم نوتات، إهداء/جرب وقرر، ومقارنة.
- تجربة المتجر يجب أن تبقى قابلة للفحص عبر صفحات المنتجات والتصنيفات والمقالات والطلبات، لا عبر الصفحة الرئيسية فقط.

## معيار الرفض

إذا لم يستطع المصنع توليد ومعاينة ثيم يعرض fixture `fragrance-luxury` ويجتاز `vertical theme-gate` المطلوب في specs بدون أخطاء coverage أو links أو browser، فالمصنع غير جاهز لهذا النوع من المتاجر.

## ربطه بالمواصفات

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

## تجربة العطور المطلوبة

```bash
node factory.js experience show fragrance-discovery
node factory.js experience <theme> fragrance-discovery --dry-run
node factory.js experience <theme> fragrance-discovery
```

هذه التجربة لا تضيف Feature رسمية جديدة إلى `twilight.features`. هي Custom Component موثق داخل `twilight.components` ويستخدم بيانات المنتج المتاحة مثل `fragrance_notes`, `scent_family`, `audience`, و`volume`، مع JS محلي بلا طلبات شبكة لكل منتج.
