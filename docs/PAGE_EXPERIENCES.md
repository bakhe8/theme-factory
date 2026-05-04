# Page Experiences

Page Experiences هي طبقة تصنيع لتجارب مرتبطة بصفحات محددة، وليست `twilight.features` ولا `home.*` Custom Components.

## الأوامر

```bash
node factory.js page-experience list
node factory.js page-experience show brands-alphabet-filter
node factory.js page-experience <theme> brands-alphabet-filter --dry-run
node factory.js page-experience <theme> brands-alphabet-filter
node factory.js page-experience gate <theme>
```

## التجربة الحالية

### `brands-alphabet-filter`

تحسن صفحة `brands.index` عبر قائمة حروف أفقية عائمة فوق الصفحة. التجربة:

- تستخدم بيانات `brands` المجمعة حسب الحرف من صفحة الماركات.
- تحافظ على روابط البراندات الأصلية `brand.url`.
- تستخدم JS محلياً للقفز إلى القسم المطلوب.
- لا تستخدم طلبات شبكة ولا `innerHTML`.
- تمر عبر `page-experience gate`.

## ربطها بالمواصفات

```json
{
  "page_experiences": {
    "brands_alphabet_filter": {
      "required": true,
      "page": "brands.index",
      "floating": true,
      "letters": "ar-en"
    }
  }
}
```

إذا كانت `required=true` ولم تكن التجربة مثبتة في الثيم، يفشل `page-experience gate` ويفشل `certify`.
