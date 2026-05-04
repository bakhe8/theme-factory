# ابدأ من هنا

هذا المشروع ليس مجلدا لتعديل ثيم Raed يدويا. هو مصنع ثيمات.

أي ثيم قابل للتسليم يجب أن يمر بهذا الخط:

```text
طلب العميل
  -> intake/workorder
  -> specs/<theme>.specs.json
  -> capabilities catalog
  -> factory generators
  -> gates/certify
  -> deliverables/<theme>/theme
```

## القاعدة الذهبية

لا تضف Feature أو Custom Component داخل `themes/<theme>` مباشرة.

إذا احتجنا ميزة عرض جديدة، نطور المصنع نفسه:

- عرف القدرة في `capabilities/`.
- سجلها في registry المناسب داخل `core/`.
- أضف أو حدث generator لها.
- أضف gate يثبت أنها تلتزم بعقد سلة.
- اطلبها من `specs/<theme>.specs.json`.
- شغل `certify` قبل التسليم.

## أين تبدأ؟

1. أنشئ أو حدث عقد الثيم:

```bash
node factory.js intake <theme-name>
```

2. راجع القدرات المتاحة:

```bash
node factory.js capabilities list
node factory.js experience list
node factory.js page-experience list
node factory.js integration list
node factory.js vertical list
```

3. اطلب القدرات في `specs/<theme>.specs.json`.

مثال:

```json
{
  "experiences": {
    "fragrance_discovery": {
      "required": true,
      "slug": "fragrance-discovery"
    }
  },
  "page_experiences": {
    "brands_alphabet_filter": {
      "required": true,
      "page": "brands.index"
    }
  }
}
```

4. طبق المواصفات وشغل خط الإنتاج:

```bash
node factory.js manufacture <theme-name>
node factory.js certify <theme-name> --relaxed-docs
```

5. أنشئ ملف مراجعة سلة بعد اختبار الثيم في البيئة الحقيقية أو بعد waiver موثق:

```bash
node factory.js salla-review template <theme-name>
node factory.js salla-review gate <theme-name>
```

6. صدر مجلد التسليم:

```bash
node factory.js deliver <theme-name>
```

مجلد التسليم النهائي يكون في:

```text
deliverables/<theme-name>/theme
```

## إضافة قدرة جديدة

إذا طلب العميل شيئا غير موجود، مثل بحث بالصورة أو فلتر ماركات جديد:

1. لا تنفذه في الثيم مباشرة.
2. صنفه:
   - `home-experience`
   - `page-experience`
   - `integration`
   - `vertical`
3. أضف ملفا في `capabilities/<type>/<id>.capability.json`.
4. اربطه بمصدر وسياسة:
   - وثائق سلة
   - Raed الرسمي
   - طلب عميل موثق
   - benchmark سلوكي
5. نفذه داخل `core/` كقدرة مصنع.
6. اجعل `node factory.js capabilities gate <theme>` يمر.

## أوامر الفحص الأساسية

```bash
node factory.js specs gate <theme-name>
node factory.js capabilities gate <theme-name>
node factory.js docs urls
node factory.js policy <theme-name>
node factory.js preview <theme-name> --all-pages --all-fixtures
node factory.js coverage <theme-name>
node factory.js browser <theme-name>
node factory.js rtl <theme-name>
node factory.js visual gate <theme-name>
node factory.js salla-review gate <theme-name>
node factory.js certify <theme-name> --relaxed-docs
```

## ملفات مهمة

- `THEME_FACTORY_GUIDELINES.md`: فلسفة المصنع وقواعد قبول القدرات.
- `capabilities/`: catalog القدرات القابلة للاستخدام.
- `specs/`: عقود الثيمات.
- `core/*-registry.js`: تعريفات المصنع.
- `core/*-factory.js`: أدوات الإنشاء والتطبيق.
- `quality/visual-checklists/`: الاعتماد البصري الإجباري.
- `quality/salla-reviews/`: دليل مراجعة سلة أو waiver قبل التسليم.
- `reports/`: نتائج الفحص والاعتماد.

## خريطة الأوامر

إذا لم تعرف الأمر المناسب، استخدم:

```bash
node factory.js guide
node factory.js guide add-capability
node factory.js guide deliver
```

إذا تعارضت رغبة إبداعية مع المصنع، فالنتيجة الصحيحة ليست كسر المصنع. النتيجة الصحيحة هي ترقية المصنع ليستوعب الإبداع بطريقة قابلة للفحص والتسليم.
