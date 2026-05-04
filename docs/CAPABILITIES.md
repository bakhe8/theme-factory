# Capabilities

هذا الملف هو خريطة قدرات المصنع: أين تعرف الميزة، أين تنفذ، وأي بوابات تثبت أنها صالحة للإنتاج.

## ما هي القدرة؟

القدرة هي Feature أو Component أو Integration أو Vertical يمكن للمصنع إعادة استخدامها عبر الثيمات.

ليست القدرة:

- كودا مضافا مباشرة داخل ثيم.
- فكرة في محادثة أو ملف ملاحظات فقط.
- مكونا في `twilight.json` بلا registry.
- استثناء سياسة غير مربوط بمصدر.

## المسار الإجباري

```text
idea/source
  -> capability file
  -> registry
  -> generator
  -> gate
  -> specs request
  -> certify
```

## أماكن الملفات

| النوع | Capability | Registry | Generator | Gate | Specs section |
| --- | --- | --- | --- | --- | --- |
| Home Experience | `capabilities/home/` | `core/experience-registry.js` | `core/experience-factory.js` | `core/experience-gate.js` | `experiences` |
| Page Experience | `capabilities/page/` | `core/page-experience-registry.js` | `core/page-experience-factory.js` | `core/page-experience-gate.js` | `page_experiences` |
| Integration | `capabilities/integrations/` | `core/integration-registry.js` | `core/integration-factory.js` | `core/integration-factory.js` | `integrations` |
| Vertical | `capabilities/verticals/` | `core/vertical-registry.js` | `core/vertical-factory.js` | `core/vertical-factory.js` | `verticals` |

## الحالات

| الحالة | المعنى | إنتاج؟ |
| --- | --- | --- |
| `research` | فكرة تحت الدراسة | لا |
| `proposed` | سجل أولي أو innovation | لا |
| `experimental` | تجربة محلية | لا |
| `planned` | مخطط وغير منفذ | لا |
| `implemented` | لديها registry/generator/gate | نعم |
| `certified` | اجتازت اعتمادا محليا مثبتا | نعم |
| `requires-contract` | تكامل يحتاج عقد عميل أو إضافة خارجية | لا إذا كان `required: true` |
| `rejected` | مرفوضة | لا |

أي قدرة مطلوبة في `specs` مع `required: true` يجب أن تكون `implemented` أو `certified`.

## إضافة قدرة جديدة

ابدأ بسكيلتون رسمي:

```bash
node factory.js capabilities new scent-quiz --type=home-experience
```

ثم:

1. املأ المصدر في `source`.
2. اكتب قرار السياسة في `policy`.
3. سجل القدرة في registry المناسب.
4. أضف generator أو وسع generator موجود.
5. أضف gate أو وسع gate موجود.
6. أضف fixtures أو preview data إذا احتاجت.
7. اطلبها من `specs/<theme>.specs.json`.
8. شغل:

```bash
node factory.js capabilities gate <theme>
node factory.js certify <theme> --relaxed-docs
```

## قواعد مهمة

### Home Experience

استخدمها عندما تكون التجربة في الصفحة الرئيسية أو مكون عرض قابل لإعادة الاستخدام.

أمثلة موجودة:

- `product-flip`
- `lookbook`
- `fragrance-discovery`
- `scent-quiz`
- `zen-products-grid`

يجب أن تحافظ على:

- رابط المنتج.
- السعر.
- الصورة.
- زر الإضافة للسلة.
- حالات نفاد المخزون.
- RTL وmobile.

`scent-quiz` مثال مهم: هو ليس نسخة من Raed، بل تجربة عطرية مبتكرة تعمل محليا فوق بيانات المنتجات. لذلك يقبلها المصنع فقط لأنها مسجلة كقدرة، ولها preset في `component-factory`, وتعتمد على markers يفحصها `experience gate`, وتحافظ على التجارة الأساسية: السعر، الرابط، الصورة، وزر السلة.

### Page Experience

استخدمها عندما تكون الميزة مرتبطة بصفحة محددة.

مثال موجود:

- `brands-alphabet-filter`

يجب أن تحافظ على عقد الصفحة وروابطها الأصلية.

### Integration

استخدمها عندما تعتمد الميزة على إضافة أو خدمة خارج الثيم.

مثال موجود:

- `image-search-addon`

لا يجوز تحويل التكامل إلى زر شكلي. إذا كان `required: true` يجب وجود:

- `source_url`
- `handled_by`
- `placement`
- fallback واضح

### Vertical

استخدمها عندما نحتاج متجر محلي يحاكي قطاعا كاملا.

مثال موجود:

- `luxury-fragrance`

يجب أن يغطي:

- منتجات كافية.
- تصنيفات.
- مراجعات.
- صفحات منتج.
- سيناريوهات empty/edge/checkout.

## البوابات

| البوابة | ماذا تثبت |
| --- | --- |
| `capabilities gate` | كل specs required لها قدرة إنتاجية |
| `experience gate` | التجربة مثبتة وملفاتها صحيحة |
| `page-experience gate` | تجربة الصفحة مثبتة دون كسر عقد الصفحة |
| `integration gate` | التكامل لا يخترع API أو خدمة غير موثقة |
| `vertical gate` | بيانات القطاع وتجربته موجودة |
| `display gate` | المكونات الرسمية أو factory-registered فقط |
| `visual gate` | المراجعة البصرية مرتبطة ببصمة الثيم |

## متى تصبح القدرة جاهزة؟

القدرة جاهزة للإنتاج عندما:

- ملفها موجود في `capabilities/`.
- `policy.decision` ليس `unknown` أو `rejected`.
- status هو `implemented` أو `certified`.
- registry يعرفها.
- generator يستطيع تثبيتها.
- gate يفشل عند غيابها أو كسرها.
- `certify` يمر على ثيم يستخدمها.

## ما الذي لا نفعله؟

- لا نضيف ملفات مباشرة داخل `themes/<theme>` كحل دائم.
- لا نضيف `required: true` لقدرة `requires-contract`.
- لا نحول طلب العميل إلى UI فقط بدون مصدر بيانات أو تكامل حقيقي.
- لا نسمح بقدرة جديدة لأن "سلة لم تمنعها صراحة"؛ يجب وجود مصدر أو قرار سياسة وشروط.
