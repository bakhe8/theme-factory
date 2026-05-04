# Integrations

Integrations هي طبقة ضبط للتعامل مع إضافات أو خدمات مفعلة في متجر التاجر، مثل البحث بالصورة.

القاعدة الأساسية: لا يخترع المصنع API داخل الثيم. إذا كانت الميزة من إضافة، يجب أن تدخل كمطلب تكامل مع مصدر أو عقد واضح.

## الأوامر

```bash
node factory.js integration list
node factory.js integration show image-search-addon
node factory.js integration gate <theme>
```

## البحث بالصورة

المعرف:

```text
image-search-addon
```

المصنع يقبله كمطلب خارجي فقط إذا توفرت الحقول التالية في المواصفات:

```json
{
  "integrations": {
    "image_search": {
      "required": true,
      "implementation": "external-addon",
      "handled_by": "salla-addon-or-provider-name",
      "placement": "header-search",
      "source_url": "https://example.com/official-addon-contract"
    }
  }
}
```

## ما يرفضه المصنع

- رفع الصور إلى API غير موثق من داخل الثيم.
- طلب شبكة لكل منتج لمحاكاة البحث بالصورة.
- إضافة سكربت خارجي بلا مصدر رسمي أو عقد من التاجر/الإضافة.

إذا لم تتوفر هذه الأدلة، تبقى الميزة معلقة ولا تدخل مسار الاعتماد.
