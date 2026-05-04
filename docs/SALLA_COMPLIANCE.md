# Salla Compliance

هذا الملف يشرح كيف يثبت المصنع التزام الثيم بتعليمات سلة محليا، وما الذي يبقى بحاجة إلى مراجعة سلة الحقيقية.

## الحقيقة المهمة

المصنع لا يستبدل مراجعة سلة.

المصنع يقلل المخاطر قبل الإرسال عبر:

- وثائق سلة الرسمية.
- ثيم Raed الرسمي.
- بوابات محلية قابلة للتكرار.
- visual checklist.
- Salla review evidence قبل التسليم.

## مصادر الحقيقة

| المصدر | أين يظهر محليا |
| --- | --- |
| `docs.salla.dev/llms.txt` | `core/docs-intelligence/cache/` |
| وثائق سلة الحرجة | `core/docs-intelligence/salla-docs-config.js` |
| مخرجات القواعد | `core/docs-intelligence/generated/` |
| Theme Raed الرسمي | official sources داخل docs intelligence |
| عقود الصفحات | `core/docs-intelligence/generated/page-contracts.json` |
| المكونات المعروفة | `core/docs-intelligence/generated/allowed-components.json` |

## أوامر الوثائق

```bash
node factory.js docs sync --max=180
node factory.js docs urls
node factory.js docs status
node factory.js docs gate <theme> --strict
```

`docs urls` يراقب روابط سلة وRaed التي يعتمد عليها المصنع. أي رابط حرج مكسور يجب إصلاحه قبل الاعتماد.

## بوابات الامتثال

| البوابة | المخاطر التي تغطيها |
| --- | --- |
| `docs gate` | ذاكرة وثائق قديمة أو مصادر حرجة مفقودة |
| `policy gate` | بنية الثيم، ملفات أساسية، DOM sinks، قيود أمنية |
| `exception registry gate` | أي استثناء يجب أن يكون موثقا ومراجعا |
| `specs gate` | الثيم له عقد مواصفات واضح |
| `capabilities gate` | specs لا تطلب قدرات غير مسجلة |
| `display gate` | منع مكونات عرض غير رسمية أو غير مصنعية |
| `page-contract gate` | صفحات الثيم تطابق عقود سلة/Raed |
| `twilight smoke` | Web Components تعمل في معاينة قريبة من Twilight |
| `rtl gate` | عدم وجود overflow في RTL |
| `visual gate` | جودة الواجهة وتجربة المتسوق تمت مراجعتها |
| `salla-review gate` | لا تسليم بدون دليل من بيئة سلة أو waiver |

## الأمن وDOM

السياسة ترصد DOM sinks الحساسة مثل:

- `innerHTML`
- `outerHTML`
- `insertAdjacentHTML`
- `document.write`
- `eval`

الاستخدام الجديد غير المسجل يفشل. الاستخدامات الموروثة من Raed أو حالات موثقة يجب أن تمر عبر:

```text
core/policies/exception-registry.json
```

القاعدة: لا نسجل الاستثناء إذا كان يمكن إصلاحه بـ DOM API آمن.

## عقود الصفحات

`page-contract gate` يثبت أن صفحات الثيم لا تفقد المتغيرات أو hooks أو Web Components المهمة مقارنة بوثائق سلة وثيم Raed.

أي تحذير متكرر لا يتحول إلى تجاهل عام. إما:

- يصلح في الثيم.
- أو يسجل في Exception Registry بسبب واضح ومصدر.

## قدرات العرض

سلة لا تمنع الإبداع في العرض لمجرد أنه غير موجود في Raed، لكن المصنع لا يسمح بميزة جديدة إلا إذا:

- لا تكسر عقود سلة.
- لا تغير checkout أو الدفع.
- لا تستخدم API غير موثق.
- لا تخفي السعر أو رابط المنتج أو زر السلة.
- لا تستخدم بيانات مضللة.
- تمر عبر capability catalog.

مثال:

قلب كرت المنتج مسموح محليا إذا كان:

- JS محلي.
- يحافظ على الرابط والسعر وزر السلة.
- يدعم keyboard وRTL.
- لا يستخدم شبكة خارجية.
- مسجل كـ capability ويمر browser/visual.

## مراجعة سلة الحقيقية

قبل التسليم:

```bash
node factory.js salla-review template <theme>
node factory.js salla-review gate <theme>
```

الملف:

```text
quality/salla-reviews/<theme>.json
```

يجب أن يحتوي إما:

- `status: "passed"` مع reviewed_at/reviewed_by/environment/evidence.
- أو `status: "waived"` مع approved_by/reason/risk_accepted/expires_at.

`deliver` يفشل بدون هذا الملف أو إذا لم يطابق بصمة الثيم الحالية.

## ما لا يغطيه المصنع بالكامل

هذه النقاط تحتاج مراجعة بشرية أو Partner Portal:

- قبول سلة النهائي.
- ملاحظات reviewer البصرية.
- سلوك المتجر الحقيقي مع إضافات التاجر.
- حسابات الدفع والشحن الحقيقية.
- أي API أو Integration خاص بالعميل.

## تعريف الجاهزية

الثيم جاهز محليا عندما:

```bash
node factory.js certify <theme> --relaxed-docs
```

ينجح.

الثيم جاهز للتسليم عندما:

```bash
node factory.js salla-review gate <theme>
node factory.js deliver <theme> --skip-certify
```

ينجحان.
