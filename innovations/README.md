# Innovation Registry

هذا المجلد ليس مكانا لحفظ أفكار جانبية. هو بوابة المصنع الرسمية لأي إبداع جديد قبل أن يدخل إلى ثيم قابل للتسليم.

## الحالات

- `proposed`: فكرة موثقة، لم تصبح قدرة داخل المصنع.
- `experimental`: تجربة مخبرية يمكن تشغيلها محليا مع `--allow-experimental`، لكنها ممنوعة في `certify` و`deliver`.
- `implemented`: أصبحت مسجلة ولها مولد وبوابة وتستطيع دخول ثيمات الإنتاج.
- `certified`: اجتازت السياسة، المتصفح، وربط المصادر/القرارات.
- `rejected`: مرفوضة ولا يسمح بطلبها في أي specs.

## القاعدة

أي ميزة عرض جديدة يجب أن تبدأ هنا، ثم تنتقل إلى ملفات المصنع المناسبة مثل:

- `core/experience-registry.js`
- `core/page-experience-registry.js`
- `core/integration-registry.js`
- `core/component-factory.js`
- بوابة فحص مناسبة داخل `core/`

لا يطلبها الثيم إلا من:

```json
"innovation": {
  "experiments": ["innovation-id"]
}
```

وتفشل بوابة الإنتاج إذا لم تكن الحالة `implemented` أو `certified`.

## الأوامر

```bash
node factory.js innovation list
node factory.js innovation show <id>
node factory.js innovation propose <id> --type=experience --title-ar="..." --title-en="..."
node factory.js innovation promote <id> --status=experimental
node factory.js innovation gate <theme>
```
