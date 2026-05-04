# دليل قدرات مصنع الثيمات

هذا الملف يحدد كيف تتحول أي فكرة عرض أو ميزة تجارية إلى قدرة رسمية داخل `salla-theme-factory`.

الهدف ليس جمع أفكار جميلة في ملف، بل منع الفجوة الخطيرة بين "نريد هذه الميزة" و"الثيم المنتج يلتزم فعلا بسياسات سلة ويمكن اختباره وتسليمه". أي فكرة لا تدخل عبر هذا المسار تبقى إلهاما أو بحثا، ولا يسمح لها بالوصول إلى ثيم قابل للتسليم.

## القاعدة المركزية

لا نطور الميزات داخل الثيمات مباشرة.

أي ميزة جديدة يجب أن تصبح قدرة في المصنع أولا، ثم يطلبها الثيم من `specs/<theme>.specs.json`، ثم تثبتها البوابات قبل الإنتاج.

```text
مصدر موثق أو طلب عميل
        ↓
قرار سياسة وتصنيف قدرة
        ↓
innovation / registry / generator / fixture / gate
        ↓
specs/<theme>.specs.json
        ↓
capabilities/<type>/<id>.capability.json
        ↓
manufacture / certify
        ↓
deliverables/<theme>/theme
```

## نقطة البداية العملية

اقرأ `docs/START_HERE.md` قبل إنشاء أو تعديل أي ثيم. هذا الملف يشرح خط الإنتاج اليومي من طلب العميل إلى مجلد التسليم.

الوثائق التشغيلية المكملة:

- `docs/FACTORY_WORKFLOW.md`: مراحل المصنع وأوامر الإنتاج والتسليم.
- `docs/CAPABILITIES.md`: أين تعرف القدرة وأين تنفذ وأي بوابة تثبتها.
- `docs/SALLA_COMPLIANCE.md`: مصادر سلة والبوابات التي تثبت الامتثال.

القاعدة التنفيذية الآن: أي قيمة `required: true` في `experiences`, `page_experiences`, `verticals`, أو `integrations` يجب أن تملك ملفا مطابقا في `capabilities/` وأن تمر عبر:

```bash
node factory.js capabilities gate <theme-name>
```

هذه البوابة أصبحت جزءا من `build` و`certify`، لذلك catalog القدرات ليس مرجعا ساكنا، بل شرط إنتاج.

قبل إنشاء مجلد تسليم نهائي يجب أن تمر مراجعة سلة الحقيقية أو waiver موثق:

```bash
node factory.js salla-review gate <theme-name>
```

هذه البوابة مرتبطة بـ `deliver` لا بـ `certify`: الاعتماد المحلي يثبت جاهزية المصنع، أما التسليم فيحتاج دليلا من بيئة سلة أو قرار مخاطرة صريح.

## ما الذي يعتبر مصدرا مقبولا؟

لا يكفي أن توجد الميزة في متجر أو ثيم آخر. المصدر المقبول يجب أن يثبت واحدا من الآتي:

- وثائق سلة الرسمية أو ذاكرة الوثائق المحلية في `core/docs-intelligence/`.
- ثيم Raed الرسمي أو عقوده المستخرجة في `core/docs-intelligence/generated/`.
- طلب عميل واضح، بشرط أن يخضع لقرار سياسة قبل التنفيذ.
- Benchmark موثق داخل `docs/benchmarks/` مع وصف سلوكي لا ينسخ التصميم أو الكود.
- تجربة داخلية مسجلة في `innovations/` حتى لو لم تعتمد بعد.

أي مصدر خارجي لثيم تجاري أو متجر منافس يستخدم للإلهام السلوكي فقط. يمنع نسخ الكود أو التصميم الحرفي أو الأصول أو النصوص.

## المصطلحات

| المصطلح | المعنى | أين يعيش؟ |
| --- | --- | --- |
| فكرة | وصف أولي لتجربة أو مكون | طلب عميل، Benchmark، ملاحظة بحثية |
| دليل | رابط أو لقطة أو مستند يثبت وجود الحاجة أو السماح | `docs/`, `core/docs-intelligence/` |
| قرار سياسة | حكم محلي: مسموح، مشروط، مرفوض، غير معروف | وثيقة الميزة أو Registry |
| قدرة مصنع | ميزة قابلة لإعادة الاستخدام والتوليد | `core/*-registry.js`, `innovations/` |
| طلب ثيم | إدراج القدرة في عقد ثيم محدد | `specs/<theme>.specs.json` |
| دليل اعتماد | تقرير يثبت أن القدرة فحصت | `reports/`, `quality/visual-checklists/` |

## حالات الميزة

| الحالة | المعنى | تدخل `certify`؟ | تدخل التسليم؟ |
| --- | --- | --- | --- |
| `research` | فكرة أو جرد لم يكتمل مصدره | لا | لا |
| `proposed` | مسجلة في `innovations/` فقط | لا | لا |
| `experimental` | قابلة للتجربة محليا | لا | لا |
| `implemented` | لديها Registry/Generator/Gate | نعم | نعم إذا نجحت البوابات |
| `certified` | لديها مصادر، fixture، فحص بصري ومتصفح | نعم | نعم |
| `rejected` | تتعارض مع سياسة أو مخاطرة غير مقبولة | لا | لا |

`certify`, `build`, و`deliver` لا تستخدم `--allow-experimental`. لذلك التجارب المخبرية لا يمكن أن تتسرب إلى مجلد التسليم.

## تصنيف أي فكرة جديدة

قبل كتابة كود، صنف الفكرة في واحد من هذه المسارات:

| النوع | متى يستخدم؟ | ملفات المصنع |
| --- | --- | --- |
| Home Experience | تجربة عرض في الصفحة الرئيسية، مثل lookbook أو product flip | `core/experience-registry.js`, `core/experience-factory.js`, `core/experience-gate.js` |
| Page Experience | تجربة مرتبطة بصفحة محددة، مثل فلتر حروف في صفحة البراندات | `core/page-experience-registry.js`, `core/page-experience-factory.js`, `core/page-experience-gate.js` |
| Integration | إضافة أو خدمة خارجية، مثل بحث بالصورة أو واتساب مخصص | `core/integration-registry.js`, `core/integration-factory.js` |
| Vertical Fixture | بيانات ومتجر محلي يحاكي قطاعا تجاريا | `core/vertical-registry.js`, `core/vertical-factory.js`, fixtures runtime |
| Official Component Usage | استخدام مكون Twilight رسمي موثق | `core/docs-intelligence/generated/allowed-components.json` |
| Policy Exception | استثناء محدود ومفسر | `core/policies/exception-registry.json` |
| Style Variant | تغيير هوية أو layout دون سلوك جديد | `specs/<theme>.specs.json`, `core/apply-specs.js` |

إذا لم تعرف أين تضع الفكرة، فهي ليست جاهزة للتنفيذ.

## مصفوفة قرار السياسة

كل قدرة جديدة يجب أن تحصل على قرار محلي قبل التنفيذ:

| القرار | متى يستخدم؟ | أثره |
| --- | --- | --- |
| `allowed` | مدعومة بوثائق سلة أو نمط Raed أو لا تتعارض معهما | يمكن تنفيذها كقدرة مصنع |
| `allowed_with_conditions` | مسموحة بشرط: لا شبكة خارجية، لا تغيير checkout، لا تخزين بيانات | يجب تسجيل الشروط في Registry |
| `needs_exception` | تحتاج API أو DOM sink أو سلوك حساس | لا تمر إلا باستثناء مسجل |
| `unknown` | لا يوجد مصدر كاف | تبقى research/proposed |
| `rejected` | تخالف سياسة أو تضع المتجر أو المشتري في خطر | يمنع تنفيذها |

أمثلة عامة:

- قلب كرت المنتج لإظهار تفاصيل إضافية: غالبا مسموح إذا كان JS محليا، يحافظ على رابط المنتج وزر السلة، لا يخفي السعر أو الحالة، ولا يستخدم شبكة خارجية. يجب أن يدخل كـ Home/Page Experience أو component preset ويمر عبر browser/RTL/visual.
- بحث بواسطة صورة: Integration. لا يسمح بإضافته كزر شكلي فقط. يجب معرفة هل الإضافة موجودة في متجر العميل، كيف تعرض واجهتها، هل تحتاج SDK أو endpoint خارجي، وما fallback عند غيابها.
- قائمة براندات بحروف عائمة: Page Experience. يجب أن تستخدم بيانات صفحة البراندات وروابطها الأصلية، ولا تكسر التنقل أو RTL.
- تعديل checkout أو الدفع أو إجبار مسار شراء بديل: مرفوض أو يحتاج تكامل رسمي واضح، لأن أثره مباشر على الثقة والدفع وامتثال المنصة.

## نموذج بطاقة الميزة

كل ميزة جديدة يجب أن تملك بطاقة بهذا الشكل في وثيقة أو Registry قبل التنفيذ:

```json
{
  "id": "brands-alphabet-filter",
  "type": "page-experience",
  "status": "implemented",
  "source": {
    "kind": "client-request",
    "links": [],
    "notes": "فلتر حروف أفقي لصفحة البراندات"
  },
  "policy": {
    "decision": "allowed_with_conditions",
    "conditions": [
      "يستخدم بيانات الصفحة المحلية فقط",
      "لا يغير روابط البراندات الأصلية",
      "يدعم RTL وmobile"
    ]
  },
  "merchant_fields": [
    { "key": "floating", "type": "toggle", "default": true },
    { "key": "letters", "type": "select", "default": "ar-en" }
  ],
  "factory_output": {
    "registry": "core/page-experience-registry.js",
    "generator": "core/page-experience-factory.js",
    "spec_key": "page_experiences.brands_alphabet_filter"
  },
  "required_gates": [
    "specs gate",
    "page-experience gate",
    "page coverage",
    "link smoke",
    "browser smoke",
    "rtl gate",
    "visual checklist"
  ]
}
```

## ما الذي يطلبه الثيم؟

الثيم لا يطلب ملفات ولا قوالب مباشرة. الثيم يطلب قدرات عبر `specs/<theme>.specs.json`.

المواضع الأساسية:

```json
{
  "experiences": {
    "product_flip": {
      "required": true
    }
  },
  "page_experiences": {
    "brands_alphabet_filter": {
      "required": true
    }
  },
  "integrations": {
    "visual_search": {
      "required": true,
      "provider": "client-addon"
    }
  },
  "verticals": [
    "fragrance"
  ],
  "innovation": {
    "experiments": [
      "scent-quiz"
    ]
  }
}
```

لا يسمح للمطور بإضافة مكون إلى `twilight.json` أو `src/views/components/home` يدويا ثم محاولة تمريره. `display gate` يجب أن يرى أن المكون رسمي أو مطلوب من specs أو قادم من قدرة مصنع مسجلة.

## الحقول التجارية المسموحة للمكونات

عند تصميم إعدادات الميزة، استخدم حقولا يمكن فحصها وإعادة توليدها:

| نوع الحقل | الاستخدام |
| --- | --- |
| `text` | عناوين قصيرة، أزرار، تسميات |
| `rich_text` | وصف قابل للتنسيق بشرط عدم إدخال script |
| `url` | رابط داخلي أو خارجي موثق |
| `image` | صورة أو بانر |
| `video` | فيديو إذا كان مسموحا ويدعم fallback |
| `color` | لون محدد ضمن هوية الثيم |
| `select` | اختيار نمط عرض من قائمة محدودة |
| `toggle` | تشغيل أو تعطيل |
| `number/range` | سرعة، مدة، عدد عناصر |
| `repeater` | عناصر متكررة بحدود واضحة |

لا تضف حقلا عاما يسمح للتاجر بإدخال HTML/JS حر إلا إذا كان ذلك منصوصا عليه ومحميا بسياسة واضحة.

## كتالوج الأفكار الأولي

هذا الجدول ليس موافقة إنتاجية. هو قائمة إلهام يجب تحويل كل بند فيها إلى بطاقة ميزة ومصدر وقرار سياسة قبل التنفيذ.

| الفكرة | النوع المحتمل | قرار ابتدائي | ملاحظات |
| --- | --- | --- | --- |
| Product Reels | Home Experience أو Page Experience | `unknown` | يحتاج مصدر وسلوك شراء واضح وfallback للفيديو |
| Before/After Slider | Home Experience | `allowed_with_conditions` | JS محلي، لا شبكة، قابلية لمس وRTL |
| Influencer Videos | Home Experience | `unknown` | يجب ضبط المصدر والتحميل والخصوصية |
| Store Stories | Home Experience | `unknown` | تحتاج حدود أداء وmobile |
| Video Banner | Home Experience | `allowed_with_conditions` | يجب وجود صورة fallback وعدم إخفاء CTA |
| Animated Background | Style/Experience | `allowed_with_conditions` | ممنوع أن يؤثر على الأداء أو القراءة |
| Countdown | Home Experience | `allowed_with_conditions` | لا يضلل المشتري، يدعم انتهاء العرض |
| Coupon Strip | Home Experience | `allowed_with_conditions` | لا يغير منطق الخصم، يعرض فقط |
| Deal of the Day | Home Experience | `allowed_with_conditions` | يعتمد على منتجات حقيقية وحالات نفاد |
| Announcement Bar | Home Experience أو Layout | `allowed` | بشرط عدم حجب عناصر المنصة |
| Dynamic Categories | Home Experience | `allowed` | يستخدم روابط التصنيفات الأصلية |
| Product Tabs | Home Experience | `allowed_with_conditions` | لا يطلب بيانات خارجية غير موثقة |
| Product Slider | Official/Template Component | `allowed` | يفضل مكونات Twilight أو نمط Raed |
| Pinned Products | Home Experience | `allowed_with_conditions` | يحتاج مصدر منتجات وempty state |
| Mega Menu | Layout/Page Experience | `unknown` | حساس لأنه يغير التنقل؛ يحتاج fixture وروابط |
| Smart WhatsApp | Integration | `unknown` | يحتاج سياسة روابط خارجية وخصوصية |
| Trust Badges | Home Experience | `allowed` | لا يدعي ضمانات غير موجودة |
| Branch Maps | Integration/Page Experience | `needs_exception` | قد يتطلب `salla-map` أو طرف خارجي |
| Store Statistics | Home Experience | `allowed_with_conditions` | لا تعرض أرقاما مضللة |

## تحويل فكرة إلى قدرة مصنع

1. سجل الفكرة ومصدرها.
2. صنفها: home/page/integration/vertical/style.
3. أنشئ skeleton رسمي:

```bash
node factory.js capabilities new <id> --type=<home-experience|page-experience|integration|vertical>
```

4. اكتب قرار السياسة وشروطه.
5. أنشئ أو حدّث `innovations/<id>.innovation.json` إذا كانت قدرة جديدة.
6. أضف fulfillment واضحا: experience أو page_experience أو integration أو vertical.
7. أضف Registry يصف القدرة وملفاتها المتوقعة.
8. أضف Generator يثبت القدرة في الثيم من specs.
9. أضف fixture أو بيانات preview تغطي الحالة.
10. أضف Gate أو وسع Gate موجودا حتى يفشل عند غياب القدرة.
11. اربطها في `specs/<theme>.specs.json`.
12. شغل `node factory.js manufacture <theme>` أو `node factory.js certify <theme>`.
13. راجع screenshots واملأ `quality/visual-checklists/<theme>.json`.

## بوابات الاعتماد المطلوبة

أي قدرة إنتاجية يجب أن تثبت نفسها عبر البوابات المناسبة:

| القدرة | بوابات إلزامية |
| --- | --- |
| Home Experience | `specs gate`, `innovation gate`, `experience gate`, `display gate`, `policy`, `browser`, `rtl`, `visual` |
| Page Experience | `specs gate`, `page-experience gate`, `page-contract gate`, `coverage`, `links`, `browser`, `rtl`, `visual` |
| Integration | `integration gate`, `policy`, `browser`, `visual`, وأي fixture خاص |
| Vertical Fixture | `fixtures gate`, `vertical theme-gate`, `coverage`, `browser`, `visual` |
| Official Component | `docs gate`, `policy`, `twilight smoke`, `browser` |
| Exception | `exceptions gate`, ثم البوابة الأصلية التي احتاجت الاستثناء |

أمر الاعتماد الكامل:

```bash
node factory.js certify <theme> --relaxed-docs
```

للتسليم:

```bash
node factory.js deliver <theme>
```

المخرج الوحيد الجاهز للتسليم هو:

```text
deliverables/<theme>/theme
```

## دور المراجعة البصرية

الاختبارات الآلية لا تعرف كل شيء عن جودة البيع أو تميز الثيم. لذلك لا يكتمل الاعتماد دون:

```text
quality/visual-checklists/<theme>.json
```

هذه القائمة ليست مجاملة. يجب أن تثبت:

- أن الثيم مختلف بصريا عن Raed.
- أن تجارب البيع ظاهرة ومفهومة.
- أن كروت المنتج قابلة للفعل: صورة، سعر، حالة، زر.
- أن السلة والصفحات الحساسة راجعت بصريا.
- أن mobile وRTL لا يكسران التجربة.
- أن التقارير `browser`, `rtl`, `twilight`, و`coverage` راجعت.

إذا تغيرت بصمة الثيم بعد المراجعة، تفشل بوابة `visual checklist`.

## قواعد التنفيذ الآمن

- استخدم Twig وTwilight ومصادر بيانات سلة الأصلية قدر الإمكان.
- اجعل JS تحسينيا لا شرطا لفهم الصفحة الأساسية.
- لا تستخدم `innerHTML` أو `insertAdjacentHTML` إلا باستثناء موثق ومحدود.
- لا تضف طلبات شبكة خارجية دون Integration مسجل.
- لا تخزن بيانات عميل أو مشتري داخل الثيم.
- لا تغير تدفق الدفع أو السلة بطرق غير موثقة.
- لا تخف السعر أو حالة المنتج أو زر الشراء الأساسي.
- لا تكسر روابط سلة الأصلية للمنتج، التصنيف، البراند، الطلب، أو الحساب.
- لا تجعل الميزة تعمل على desktop وتنهار على mobile.
- لا تعتمد على صور أو نصوص fixture كأنها أصول عميل حقيقية.

## أمثلة تطبيقية

### عميل يطلب البحث بواسطة الصورة

التصنيف: `integration`.

قبل التنفيذ يجب معرفة:

- هل الإضافة موجودة فعلا في متجره؟
- هل توفر وسم HTML أو SDK أو رابط صفحة؟
- ماذا يحدث إذا كانت الإضافة غير مفعلة؟
- هل يوجد مصدر من سلة أو مزود الإضافة؟

إذا لم يوجد تكامل واضح، يبقى الطلب `unknown` ولا يدخل الثيم كزر وهمي.

### عميل يطلب فلتر حروف للبراندات

التصنيف: `page-experience`.

المسار الصحيح:

```bash
node factory.js page-experience <theme> brands-alphabet-filter
node factory.js page-experience gate <theme>
node factory.js certify <theme> --relaxed-docs
```

يجب أن يطلبه specs:

```json
"page_experiences": {
  "brands_alphabet_filter": {
    "required": true,
    "page": "brands.index",
    "floating": true,
    "letters": "ar-en"
  }
}
```

### عميل يطلب قلب كرت المنتج

التصنيف: غالبا `home experience` أو `component preset`.

الشروط:

- لا يخفي السعر أو CTA.
- لا يمنع فتح صفحة المنتج.
- يدعم keyboard/touch بقدر الإمكان.
- يعمل دون شبكة خارجية.
- يملك fixture فيه منتجات متعددة وحالات نفاد/خصم.
- يظهر في visual checklist ضمن عينات المنتج والقوائم.

## Definition of Done

الميزة لا تعتبر جاهزة حتى تحقق كل البنود التالية:

- لها مصدر أو طلب موثق.
- لها قرار سياسة واضح.
- لها حالة `implemented` أو `certified`.
- لها fulfillment داخل المصنع.
- يمكن طلبها من `specs`.
- ينتجها المصنع دون تعديل يدوي داخل الثيم.
- لها بيانات preview أو fixture مناسب.
- تفشل بوابة عند غيابها أو عند تركيبها خطأ.
- تمر عبر `certify`.
- تظهر في `visual checklist` إذا كان لها أثر بصري.
- تدخل `deliverables` فقط بعد اعتماد حديث مطابق لبصمة الثيم.

## أوامر مرجعية

```bash
node factory.js intake <theme>
node factory.js manufacture <theme>
node factory.js innovation list
node factory.js innovation show <id>
node factory.js innovation propose <id> --type=experience --title-ar="..." --title-en="..."
node factory.js innovation promote <id> --status=experimental
node factory.js innovation promote <id> --status=implemented
node factory.js experience <theme> <experience-id>
node factory.js page-experience <theme> <page-experience-id>
node factory.js integration gate <theme>
node factory.js fixtures gate
node factory.js vertical theme-gate <theme>
node factory.js visual template <theme>
node factory.js visual gate <theme>
node factory.js certify <theme> --relaxed-docs
node factory.js deliver <theme>
```

## علاقة هذا الملف ببقية المشروع

هذا الملف لا يستبدل الوثائق التالية، بل يربطها:

- `docs/FACTORY_WORKFLOW.md`: خط الإنتاج الإلزامي.
- `docs/INNOVATION_PIPELINE.md`: حالات الابتكار والترقية.
- `docs/PAGE_EXPERIENCES.md`: تجارب الصفحات.
- `docs/SALLA_DOCS_INTELLIGENCE.md`: ذاكرة وثائق سلة.
- `docs/SALLA_POLICY_SOURCES.md`: مصادر السياسة.
- `docs/FRAGRANCE_VERTICAL.md`: مثال vertical تجاري.
- `docs/benchmarks/junaid-perfumes.md`: مثال benchmark واقعي.
- `FACTORY_ASSESSMENT.md`: نقاط الضعف وما أغلق منها.

إذا تعارض هذا الملف مع بوابة آلية، فالقرار للبوابة حتى تعدل الوثيقة أو تعدل البوابة بمصدر واضح.

## الخلاصة

الإبداع مسموح ومطلوب، لكن طريقه ليس تعديل ثيم بعينه. طريقه أن يصبح قدرة مصنع قابلة للتوليد، موثقة المصدر، واضحة السياسة، قابلة للاختبار، وقابلة لإعادة الاستخدام في أي ثيم.

بهذا فقط يصبح المصنع قادرا على إنتاج ثيمات جديدة ومميزة دون أن يفقد الانضباط المطلوب لقبولها على منصة سلة.
