# ⚙️ المرجع التقني للمصنع (Technical Reference)

يوضح هذا الدليل كيفية التفاعل مع "محرك المصنع" (Factory Engine v10.0) وإدارة المهام البرمجية.

---

## 🚀 واجهة الأوامر الموحدة (Unified CLI)
يتم تنفيذ جميع العمليات عبر الملف الرئيسي `factory.js`.

### 1. طلب تصنيع جديد (Intake)
ينشئ طلب العمل وملف المواصفات. هذه هي البداية المسموحة لإنتاج ثيم جديد.
```bash
node factory.js intake <theme_name> --name-ar="اسم الثيم" --name-en="Theme Name"
```

### 2. خط التصنيع الكامل (Manufacture)
ينشئ الثيم من مصدر معتمد، يطبق المواصفات، يثبت التجارب المطلوبة، يعتمد الثيم، ثم ينتج مجلد التسليم.
```bash
node factory.js manufacture <theme_name>
```

### 3. بوابة سير العمل (Workflow Gate)
تتحقق أن الثيم يحمل توقيع المصنع داخل `.factory/manifest.json` ولم ينشأ بنسخ يدوي.
```bash
node factory.js workflow gate <theme_name>
node factory.js workflow gate <theme_name> --deliverable
```

### 4. بوابة ميزات العرض (Display Feature Gate)
تتحقق أن مكونات العرض داخل الثيم مصدرها قالب سلة المعتمد أو تجربة مسجلة في المصنع ومطلوبة في specs.
```bash
node factory.js display gate <theme_name>
```

### 5. مسار الابتكار (Innovation Pipeline)
يسجل الأفكار الجديدة ويرقيها قبل أن تصبح قدرات مصنع قابلة للاستخدام في ثيمات الإنتاج.
```bash
node factory.js innovation list
node factory.js innovation show <innovation_id>
node factory.js innovation propose <innovation_id> --type=experience --title-ar="..." --title-en="..."
node factory.js innovation promote <innovation_id> --status=experimental
node factory.js innovation gate <theme_name>
```

### 6. إنشاء ثيم من مصدر معتمد (Create)
أمر داخلي للتصحيح. يتطلب وجود `specs/<theme>.specs.json` مسبقاً.
```bash
node factory.js create <theme_name>
```

### 7. فحص السياسة (Policy Gate)
يتحقق من بنية الثيم المطلوبة، metadata، ملفات اللغات، مكونات `twilight.json`، و hooks الأساسية في layout.
```bash
node factory.js policy <theme_name>
```

### 8. الاعتماد المحلي (Certification)
ينفذ المسار الكامل: وثائق سلة -> سياسة -> Runtime fixtures -> سجل التجارب -> تثبيت frozen -> بناء إنتاج -> تدقيق نزاهة -> معاينة Runtime محلية.
```bash
node factory.js certify <theme_name>
node factory.js certify <theme_name> --relaxed-docs
```

لإضافة مراجعة خارجية اختيارية عند توفر مسار Salla CLI:
```bash
node factory.js certify <theme_name> --salla
```

### 9. التسليم (Deliver)
ينتج مجلد التسليم بعد الاعتماد.
```bash
node factory.js deliver <theme_name>
```

### 10. البناء الشامل (Full Build)
يقوم بتنفيذ (فحص المصنع -> وثائق سلة -> السياسة -> Runtime fixtures -> سجل التجارب -> بناء الإنتاج -> التدقيق -> المعاينة) في خطوة واحدة.
```bash
node factory.js build <theme_name>
```

### 11. التطهير الأمني (Security Fix)
يقوم بمسح الثيمات ورصد الأنماط الخطرة دون إعادة كتابة مدمرة.
```bash
node factory.js fix
```

### 12. فحص النزاهة (Integrity Audit)
يقوم بفحص الثيم وإصدار تقرير القبول في مجلد `reports/`.
```bash
node factory.js audit <theme_name>
```

### 13. إنتاج المعاينة (Preview Generation)
توليد معاينة محلية مبنية من قوالب الثيم الفعلية مع تحميل Runtime محلي يحاكي عقد سلة الأساسي.
```bash
node factory.js preview <theme_name>
node factory.js preview <theme_name> --fixture=fashion-rich
node factory.js preview <theme_name> --fixture=edge-cases
node factory.js preview <theme_name> --fixture=empty-store
```

### 14. بيانات التشغيل المحلية (Runtime Fixtures)
يعرض ويفحص سيناريوهات البيانات التي يستخدمها محاكي Runtime المحلي.
```bash
node factory.js fixtures list
node factory.js fixtures show fashion-rich
node factory.js fixtures gate
```

### 15. سجل تجارب البيع (Experience Registry)
يعرض أو يثبت أو يفحص تجارب البيع المسموحة محلياً.
```bash
node factory.js experience list
node factory.js experience show product-flip
node factory.js experience gate <theme_name>
```

---

## 📂 هيكلية الملفات (File Structure)
- `factory.js`: المحرك الرئيسي.
- `factory.config.json`: مصادر القوالب المعتمدة ومسارات مناطق العمل.
- `workorders/`: طلبات العمل ومدخلات التصنيع.
- `specs/`: عقود الثيمات.
- `innovations/`: سجل الأفكار والحالات قبل دخولها خط الإنتاج.
- `core/`: منطق المصنع الداخلي.
- `core/policies/`: سياسة المصنع ومخططات metadata.
- `core/runtime/fixtures.js`: بيانات تشغيل محلية متعددة السيناريوهات.
- `core/experience-registry.js`: سجل تجارب البيع القابلة للفحص.
- `themes/`: المجلد المخصص للثيمات.
- `build/`: مخرجات المعاينة.
- `reports/`: تقارير القبول.
- `deliverables/`: مجلدات التسليم الجاهزة.

---

[🏠 العودة للملف الرئيسي](../README.md) | [🛡️ براهين النزاهة](INTEGRITY_PROOFS.md)
