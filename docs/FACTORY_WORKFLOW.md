# Factory Workflow

هذا المستند يحدد خط إنتاج الثيم داخل المصنع. لا يبدأ المطور من نسخ `themes/raed` ولا من تعديل مجلد ثيم موجود. البداية المقبولة هي طلب عمل واضح، ثم عقد مواصفات، ثم قدرات مصنع، ثم اعتماد وتسليم.

## الخريطة

```text
workorders/<theme>/intake.json       طلب العمل والمدخلات الأولية
specs/<theme>.specs.json             عقد الثيم المركزي
capabilities/<type>/<id>.json         تعريف قدرات المصنع القابلة للإنتاج
innovations/<id>.innovation.json     سجل الأفكار الجديدة قبل دخولها الإنتاج
themes/<theme>/                      مصدر الثيم المولد بواسطة المصنع فقط
build/<theme>/                       معاينات runtime المحلية
quality/visual-checklists/           مراجعة بصرية مرتبطة ببصمة الثيم
quality/salla-reviews/               دليل مراجعة سلة أو waiver قبل التسليم
reports/                             تقارير الاعتماد والفحص
deliverables/<theme>/theme/          مجلد الثيم الجاهز للتسليم
deliverables/<theme>/reports/        أدلة الاعتماد المرفقة
```

## المسار الإلزامي

```text
client request
  -> intake
  -> specs
  -> capabilities
  -> generators
  -> local certification
  -> Salla review evidence
  -> deliverable folder
```

الإنتاج الطبيعي:

```bash
node factory.js intake <theme>
node factory.js manufacture <theme> --skip-deliver
node factory.js certify <theme> --relaxed-docs
node factory.js salla-review template <theme>
node factory.js salla-review gate <theme>
node factory.js deliver <theme> --skip-certify
```

`certify` يثبت الجاهزية المحلية. `deliver` يثبت أن الحزمة قابلة للتسليم ومربوطة بمراجعة سلة أو waiver.

## مراحل التصنيع

`manufacture` ينفذ خط الإنتاج:

1. يفحص ذاكرة وثائق سلة.
2. يتأكد أن `specs/<theme>.specs.json` موجود وصالح.
3. ينشئ الثيم من مصدر معتمد داخل `factory.config.json`.
4. يكتب توقيع المصنع داخل `themes/<theme>/.factory/manifest.json`.
5. يطبق المواصفات على `twilight.json` وملفات الهوية.
6. يثبت التجارب المطلوبة في `specs.experiences`.
7. يثبت تجارب الصفحات المطلوبة في `specs.page_experiences`.
8. يفحص `innovation gate` بعد التثبيت.
9. يرفض أي مكون عرض غير مسجل في المصنع أو غير مطلوب في specs.
10. يشغل `certify`.
11. يجهز مجلد التسليم إذا لم يستخدم `--skip-deliver`.

## البوابات الرئيسية

| المرحلة | الأمر | المخرج | الفشل يعني |
| --- | --- | --- | --- |
| Workflow | `node factory.js workflow gate <theme>` | توقيع مصنع صالح | الثيم منسوخ أو ليس مخرج مصنع |
| Specs | `node factory.js specs gate <theme>` | عقد مواصفات صالح | الطلب غير قابل للإنتاج |
| Capabilities | `node factory.js capabilities gate <theme>` | تقرير catalog | specs تطلب قدرة غير مسجلة أو غير إنتاجية |
| Innovation | `node factory.js innovation gate <theme>` | fulfillment مثبت | ابتكار مسجل بلا تنفيذ فعلي |
| Display | `node factory.js display gate <theme>` | مكونات عرض مسموحة | مكون يدوي أو غير موثق |
| Page Contract | `node factory.js page-contract gate <theme>` | عقود صفحات سليمة | صفحة لا تطابق عقد سلة/Raed |
| Visual | `node factory.js visual gate <theme>` | checklist حديث | مراجعة بصرية مفقودة أو قديمة |
| Salla Review | `node factory.js salla-review gate <theme>` | دليل Partner Portal أو waiver | لا يوجد دليل مراجعة حقيقي قبل التسليم |

## أوامر مفردة عند الحاجة

```bash
node factory.js workflow gate <theme>
node factory.js display gate <theme>
node factory.js specs gate <theme>
node factory.js capabilities gate <theme>
node factory.js innovation gate <theme>
node factory.js create <theme>
node factory.js apply-specs <theme>
node factory.js certify <theme>
node factory.js deliver <theme>
```

استخدم الأوامر المفردة للتصحيح. الإنتاج الطبيعي يمر عبر `manufacture` ثم `certify` ثم `deliver`.

## منع النسخ اليدوي

أي ثيم مولد يجب أن يحتوي:

```text
themes/<theme>/.factory/manifest.json
```

هذا الملف يثبت:

- أن الثيم أنشئ بواسطة `salla-theme-factory`.
- مصدر القالب المعتمد، مثل `raed`.
- مسار عقد المواصفات.
- دور الثيم: `generated-theme` أو `source-template`.

`certify`, `build`, و`deliver` تشغل `workflow gate --deliverable` للثيمات التجارية. إذا نسخ مطور مجلد Raed يدويا وبدأ يعدل عليه فلن يملك توقيع المصنع، وبالتالي يفشل المسار.

قوالب المصدر مثل `raed` لا تعتمد إلا عبر:

```bash
node factory.js certify raed --template-calibration
```

وهذا ينتج تقرير معايرة، لا تقرير تسليم.

## منع ميزات العرض اليدوية

أي ميزة عرض جديدة يجب أن تصبح قدرة داخل المصنع:

- `capabilities/<type>/<id>.capability.json` لتعريف المصدر والسياسة والجودة.
- `innovations/<id>.innovation.json` لتسجيل الفكرة وحالتها قبل الإنتاج عند الحاجة.
- `core/experience-registry.js` لتجارب الصفحة الرئيسية.
- `core/page-experience-registry.js` لتجارب الصفحات.
- `core/integration-registry.js` للتكاملات الخارجية.
- `core/vertical-registry.js` للقطاعات والـ fixtures.
- `specs/<theme>.specs.json` لطلب القدرة في ثيم محدد.

تشغل البوابات:

```bash
node factory.js capabilities gate <theme>
node factory.js innovation gate <theme>
node factory.js display gate <theme>
```

وتفشل إذا طلب الثيم قدرة غير إنتاجية، أو إذا كان الابتكار لا يملك fulfillment قابل للفحص، أو إذا وجدت مكونا داخل `twilight.components` أو `src/views/components/home` ليس من قالب سلة المعتمد ولا تجربة مصنع مطلوبة في specs.

## مسار الابتكار

لا نرفض الفكرة لأنها غير موجودة في Raed. نرفض إدخالها إلى الإنتاج قبل أن تصبح قدرة مصنع قابلة للفحص.

```bash
node factory.js capabilities new <id> --type=<type>
node factory.js innovation propose <id> --type=experience --title-ar="..." --title-en="..."
node factory.js innovation promote <id> --status=experimental
node factory.js innovation promote <id> --status=implemented
node factory.js innovation gate <theme>
```

`certify`, `build`, و`deliver` لا تستخدم `--allow-experimental`. لذلك التجارب المخبرية لا تصل إلى مجلد التسليم.

## مصادر القوالب المعتمدة

المصادر المعتمدة لا تؤخذ من ذاكرة المطور. هي مسجلة في:

```text
factory.config.json
```

حالياً المصدر المعتمد هو:

```text
themes/raed
```

Raed مصدر تصنيع ومعايرة، وليس مجلد عمل مباشر لإنتاج ثيم تجاري.

## تعديل ثيم موجود

إذا كان التعديل style أو setting موجودا في specs:

```bash
node factory.js apply-specs <theme>
node factory.js certify <theme> --relaxed-docs
```

إذا كان التعديل ميزة عرض جديدة:

```bash
node factory.js capabilities new <id> --type=<type>
node factory.js innovation propose <id>
```

ثم تنفذها في المصنع نفسه، لا في الثيم مباشرة.

## إصلاح فشل

1. اقرأ أول مرحلة فاشلة في `certify`.
2. افتح التقرير المطابق في `reports/`.
3. شغل البوابة منفردة بعد الإصلاح.
4. أعد `certify`.

أمثلة:

```bash
node factory.js policy <theme>
node factory.js capabilities gate <theme>
node factory.js page-contract gate <theme>
node factory.js visual gate <theme>
```

لا تضف bypass. إذا الفشل لحالة مشروعة، وسع registry أو gate أو exception registry.

## التسليم

بعد نجاح الاعتماد المحلي:

```bash
node factory.js salla-review template <theme>
node factory.js salla-review gate <theme>
node factory.js deliver <theme> --skip-certify
```

المخرج:

```text
deliverables/<theme>/
├── delivery-manifest.json
├── theme/
└── reports/
```

مجلد `theme/` هو المجلد الجاهز للتسليم. مجلد `reports/` يحفظ أدلة أن الثيم مر عبر بوابات المصنع.

قبل النسخ، `deliver` يتحقق من:

- `reports/certify-<theme>.json`.
- بصمة الثيم الحالية مقابل بصمة آخر اعتماد.
- `quality/salla-reviews/<theme>.json`.
- أن مراجعة سلة أو waiver يطابق بصمة الثيم الحالية.

إذا تغير أي ملف داخل مخرج الثيم بعد الاعتماد، يرفض التسليم ويطلب تشغيل `certify` من جديد.

## متى تستخدم كل أمر

| الهدف | الأمر |
| --- | --- |
| لا تعرف من أين تبدأ | `node factory.js guide` |
| ثيم جديد | `node factory.js guide new-theme` |
| قدرة جديدة | `node factory.js guide add-capability` |
| اعتماد محلي | `node factory.js guide certify` |
| تسليم نهائي | `node factory.js guide deliver` |
| تحديث وثائق سلة | `node factory.js guide docs` |
