# Factory Workflow

هذا المستند يحدد خط إنتاج الثيم داخل المصنع. لا يبدأ المطور من نسخ `themes/raed` ولا من تعديل مجلد ثيم موجود. البداية الوحيدة المقبولة هي مدخلات تصنيع واضحة، ثم يقوم المصنع بإنشاء الثيم وتطبيق المواصفات وفحصه وتسليمه.

## الخريطة

```text
workorders/<theme>/intake.json      طلب العمل والمدخلات الأولية
specs/<theme>.specs.json            عقد الثيم المركزي
innovations/<id>.innovation.json    سجل الأفكار الجديدة قبل دخولها الإنتاج
themes/<theme>/                     مصدر الثيم المولد بواسطة المصنع فقط
build/<theme>/                      معاينات runtime المحلية
reports/                            تقارير الاعتماد والفحص
deliverables/<theme>/theme/         مجلد الثيم الجاهز للتسليم
deliverables/<theme>/reports/       أدلة الاعتماد المرفقة
```

## المسار الإلزامي

```bash
node factory.js intake <theme> --name-ar="..." --name-en="..."
node factory.js manufacture <theme>
```

`manufacture` ينفذ خط الإنتاج:

1. يفحص ذاكرة وثائق سلة.
2. يتأكد أن `specs/<theme>.specs.json` موجود وصالح.
3. ينشئ الثيم من مصدر معتمد داخل `factory.config.json`.
4. يكتب توقيع المصنع داخل `themes/<theme>/.factory/manifest.json`.
5. يطبق المواصفات على `twilight.json` وملفات الهوية.
6. يثبت التجارب المطلوبة في `specs.experiences`.
7. يثبت تجارب الصفحات المطلوبة في `specs.page_experiences`.
8. يفحص `innovation gate` بعد التثبيت للتأكد أن كل ابتكار مطلوب أصبح مخرجا فعليا داخل الثيم، وليس اسما محفوظا في specs فقط.
9. يرفض أي مكون عرض غير مسجل في المصنع أو غير مطلوب في specs.
10. يشغل `certify`.
11. يجهز `deliverables/<theme>/theme`.

## أوامر مفردة عند الحاجة

```bash
node factory.js workflow gate <theme>
node factory.js display gate <theme>
node factory.js specs gate <theme>
node factory.js innovation gate <theme>
node factory.js create <theme>
node factory.js apply-specs <theme>
node factory.js certify <theme>
node factory.js deliver <theme>
```

استخدم الأوامر المفردة للتصحيح فقط. الإنتاج الطبيعي يجب أن يمر عبر `manufacture`.

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

`certify`, `build`, و`deliver` تشغل `workflow gate --deliverable` للثيمات التجارية. إذا نسخ مطور مجلد Raed يدوياً وبدأ يعدل عليه فلن يملك توقيع المصنع، وبالتالي يفشل المسار. قوالب المصدر مثل `raed` لا تعتمد إلا عبر:

```bash
node factory.js certify raed --template-calibration
```

وهذا ينتج تقرير معايرة، لا تقرير تسليم.

## منع ميزات العرض اليدوية

أي ميزة عرض جديدة يجب أن تصبح قدرة داخل المصنع:

- `innovations/<id>.innovation.json` لتسجيل الفكرة وحالتها قبل التطوير.
- `core/experience-registry.js` لتجارب الصفحة الرئيسية.
- `core/page-experience-registry.js` لتجارب الصفحات.
- `core/integration-registry.js` للتكاملات الخارجية.
- `specs/<theme>.specs.json` لطلب الميزة في ثيم محدد.

تشغل البوابة:

```bash
node factory.js innovation gate <theme>
node factory.js display gate <theme>
```

وتفشل إذا طلب الثيم ابتكاراً غير مرقى، أو إذا كان الابتكار لا يملك `factory_plan.fulfillment` قابل للفحص، أو إذا وجدت مكوناً داخل `twilight.components` أو `src/views/components/home` ليس من قالب سلة المعتمد ولا تجربة مصنع مطلوبة في specs.

## مسار الابتكار

لا نرفض الفكرة لأنها غير موجودة في Raed. نرفض فقط إدخالها إلى الإنتاج قبل أن تصبح قدرة مصنع قابلة للفحص.

```bash
node factory.js innovation propose <id> --type=experience --title-ar="..." --title-en="..."
node factory.js innovation promote <id> --status=experimental
node factory.js innovation promote <id> --status=implemented
node factory.js innovation gate <theme>
```

`certify`, `build`, و`deliver` لا تستخدم `--allow-experimental`. لذلك التجارب المخبرية لا تصل إلى مجلد التسليم. كذلك لا يكفي أن يكون الابتكار `implemented` أو `certified`: يجب أن يثبت `innovation gate` أن specs طلبت الـ fulfillment المناسب وأن بوابة تلك القدرة نجحت فعلياً.

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

## التسليم

بعد نجاح التصنيع أو الاعتماد:

```bash
node factory.js deliver <theme>
```

المخرج يكون:

```text
deliverables/<theme>/
├── delivery-manifest.json
├── theme/
└── reports/
```

مجلد `theme/` هو المجلد الجاهز للتسليم. مجلد `reports/` يحفظ أدلة أن الثيم مر عبر بوابات المصنع.

قبل النسخ، `deliver` يتحقق من `reports/certify-<theme>.json` ويقارن بصمة الثيم الحالية ببصمة آخر اعتماد. إذا تغير أي ملف داخل مخرج الثيم بعد الاعتماد، يرفض التسليم ويطلب تشغيل `certify` من جديد.

مجلد التسليم يستبعد ملفات المصنع والتطوير مثل `.factory`, `.github`, `.gitignore`, `node_modules`, `build`, و`.salla-cache`. لذلك لا تعتمد على وجودها داخل الحزمة المرسلة لسلة.
