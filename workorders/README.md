# Workorders

هذا المجلد يحفظ مدخلات طلبات الثيم قبل التصنيع.

ابدأ طلباً جديداً عبر:

```bash
node factory.js intake <theme-name> --name-ar="..." --name-en="..."
```

لا تنشئ ثيماً جديداً بنسخ `themes/raed` يدوياً. خط المصنع يقرأ `workorders/` و`specs/` ثم ينشئ الثيم داخل `themes/`.
