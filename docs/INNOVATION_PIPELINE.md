# Innovation Pipeline

السياسات لا يجب أن تخنق الإبداع. لذلك أي فكرة عرض جديدة تمر كقدرة في المصنع قبل أن تصبح جزءا من ثيم قابل للتسليم.

## المسار

```text
innovations/<id>.innovation.json
        ↓
proposed → experimental → implemented → certified
        ↓
specs/<theme>.specs.json
        ↓
innovation fulfillment gate
        ↓
display / policy / browser gates
```

## القاعدة العملية

- `proposed`: فكرة مسجلة فقط، لا تدخل `certify`.
- `experimental`: يمكن تجربتها محليا مع `node factory.js innovation gate <theme> --allow-experimental`، لكنها لا تدخل التسليم.
- `implemented`: أصبحت Registry + Generator + Gate ويمكن طلبها في specs.
- `certified`: لديها مصادر/قرار سياسة، fixture، وفحص متصفح.
- `rejected`: ممنوعة.

## أين يطلبها الثيم؟

داخل `specs/<theme>.specs.json`:

```json
"innovation": {
  "experiments": [
    "scent-quiz"
  ]
}
```

بوابة الاعتماد تقبل فقط `implemented` و`certified`. لذلك يمكن للمطور أن يبتكر بحرية في `innovations/`، لكنه لا يستطيع تمرير الفكرة إلى مجلد تسليم قبل أن تصبح قدرة مصنع قابلة للفحص.

كل ابتكار إنتاجي يجب أن يربط فكرته بمخرج مصنع حقيقي داخل `factory_plan.fulfillment`، مثل:

```json
"factory_plan": {
  "fulfillment": {
    "type": "experience",
    "id": "zen-products-grid",
    "slug": "zen-products",
    "spec_key": "zen_products_grid"
  }
}
```

عندها لا تكتفي البوابة بحالة الابتكار؛ بل تتحقق أن `specs.experiences` أو `specs.page_experiences` أو `specs.integrations` أو `specs.verticals` طلبت هذه القدرة، ثم تشغل بوابتها الفعلية.

## الأوامر

```bash
node factory.js innovation list
node factory.js innovation show <id>
node factory.js innovation propose <id> --type=experience --title-ar="..." --title-en="..."
node factory.js innovation promote <id> --status=experimental
node factory.js innovation gate <theme>
```

للمختبر فقط:

```bash
node factory.js innovation gate <theme> --allow-experimental
```

لا يستخدم هذا الخيار داخل `certify`, `build`, أو `deliver`.

## مثال Zen

`zen-products-grid` بدأ كـ `proposed` لأنه كان موجودا في ثيم Zen كمكون عرض غير مسجل في المصنع، ثم تمت ترقيته إلى `implemented` بعد إضافة Registry + Generator + Gate. هذا يعني:

- الفكرة لم تعد تعديلا يدويا داخل الثيم.
- أي ثيم يستطيع طلبها من `specs.innovation.experiments`، وسيضيف `intake` الـ fulfillment المناسب إلى specs عند معرفة الخطة.
