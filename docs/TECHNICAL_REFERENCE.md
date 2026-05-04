# ⚙️ المرجع التقني للمصنع (Technical Reference)

يوضح هذا الدليل كيفية التفاعل مع "محرك المصنع" (Factory Engine v9.2) وإدارة المهام البرمجية.

---

## 🚀 واجهة الأوامر الموحدة (Unified CLI)
يتم تنفيذ جميع العمليات عبر الملف الرئيسي `factory.js`.

### 1. إنشاء ثيم جديد (Create)
ينشئ ثيماً جديداً من القالب المعتمد، يعيد كتابة `package.json` و `twilight.json`، ثم يحدث ملف القفل ويمرر الثيم على سياسة المصنع.
```bash
node factory.js create <theme_name>
```

### 2. فحص السياسة (Policy Gate)
يتحقق من بنية الثيم المطلوبة، metadata، ملفات اللغات، مكونات `twilight.json`، و hooks الأساسية في layout.
```bash
node factory.js policy <theme_name>
```

### 3. الاعتماد المحلي (Certification)
ينفذ المسار الكامل: وثائق سلة -> سياسة -> Runtime fixtures -> سجل التجارب -> تثبيت frozen -> بناء إنتاج -> تدقيق نزاهة -> معاينة Runtime محلية.
```bash
node factory.js certify <theme_name>
node factory.js certify <theme_name> --strict-docs
```

لإضافة مراجعة Salla CLI عند توفر تسجيل الدخول:
```bash
node factory.js certify <theme_name> --salla
```

### 4. البناء الشامل (Full Build)
يقوم بتنفيذ (فحص المصنع -> وثائق سلة -> السياسة -> Runtime fixtures -> سجل التجارب -> بناء الإنتاج -> التدقيق -> المعاينة) في خطوة واحدة.
```bash
node factory.js build <theme_name>
```

### 5. التطهير الأمني (Security Fix)
يقوم بمسح الثيمات ورصد الأنماط الخطرة دون إعادة كتابة مدمرة.
```bash
node factory.js fix
```

### 6. فحص النزاهة (Integrity Audit)
يقوم بفحص الثيم وإصدار تقرير القبول في مجلد `reports/`.
```bash
node factory.js audit <theme_name>
```

### 7. إنتاج المعاينة (Preview Generation)
توليد معاينة محلية مبنية من قوالب الثيم الفعلية مع تحميل Runtime محلي يحاكي عقد سلة الأساسي.
```bash
node factory.js preview <theme_name>
node factory.js preview <theme_name> --fixture=fashion-rich
node factory.js preview <theme_name> --fixture=edge-cases
node factory.js preview <theme_name> --fixture=empty-store
```

### 8. بيانات التشغيل المحلية (Runtime Fixtures)
يعرض ويفحص سيناريوهات البيانات التي يستخدمها محاكي Runtime المحلي.
```bash
node factory.js fixtures list
node factory.js fixtures show fashion-rich
node factory.js fixtures gate
```

### 9. سجل تجارب البيع (Experience Registry)
يعرض أو يثبت أو يفحص تجارب البيع المسموحة محلياً.
```bash
node factory.js experience list
node factory.js experience show product-flip
node factory.js experience gate <theme_name>
```

---

## 📂 هيكلية الملفات (File Structure)
- `factory.js`: المحرك الرئيسي.
- `core/`: منطق المصنع الداخلي.
- `core/policies/`: سياسة المصنع ومخططات metadata.
- `core/runtime/fixtures.js`: بيانات تشغيل محلية متعددة السيناريوهات.
- `core/experience-registry.js`: سجل تجارب البيع القابلة للفحص.
- `themes/`: المجلد المخصص للثيمات.
- `build/`: مخرجات المعاينة.
- `reports/`: تقارير القبول.

---

[🏠 العودة للملف الرئيسي](../README.md) | [🛡️ براهين النزاهة](INTEGRITY_PROOFS.md)
