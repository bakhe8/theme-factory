# 🏭 مصنع ثيمات سلة (Salla Theme Factory)
## المحرك الموحد لهندسة وتطوير الثيمات الاحترافية (v9.2)

مرحباً بك في المصنع! هذا النظام مصمم لضمان إنتاج ثيمات سلة بجودة عالمية، أمان فائق، ونزاهة تقنية كاملة.

---

## 🗺️ خارطة الطريق للتوثيق (Documentation Map)

للبدء في استكشاف النظام، يرجى مراجعة الوثائق التالية:

1.  **[📜 دستور المصنع](docs/MANIFESTO.md):** فهم الرؤية، المنهجية، وشروط الأمان والنزاهة.
2.  **[⚙️ المرجع التقني](docs/TECHNICAL_REFERENCE.md):** دليل استخدام واجهة الأوامر (CLI) وشرح هيكلية المشروع.
3.  **[🛡️ سجل براهين النزاهة](docs/INTEGRITY_PROOFS.md):** أدلة حية تثبت قدرة المصنع على رصد وإصلاح الثغرات والتسريبات.
4.  **[🧩 محاكي Runtime سلة المحلي](docs/SALLA_LOCAL_RUNTIME.md):** الهدف المعماري الجديد لتشغيل الثيمات محلياً بعقد قريب من سلة.
5.  **[✅ طبقة الثقة والاعتماد](docs/SALLA_FACTORY_TRUST.md):** بوابات السياسة والبناء والتدقيق التي تمنع إنتاج ثيم غير مطابق.
6.  **[📚 مصادر سياسات سلة](docs/SALLA_POLICY_SOURCES.md):** كل قاعدة محلية مرتبطة بمصدر رسمي من وثائق سلة.
7.  **[🧠 ذاكرة وثائق سلة](docs/SALLA_DOCS_INTELLIGENCE.md):** مزامنة `llms.txt` وتجميع المكونات والقواعد وعقود الصفحات محلياً.

---

## ⚡ التشغيل السريع (Quick Start)

لإنتاج ثيم جاهز للإنتاج بضغطة واحدة:
```bash
node factory.js build zen-theme
```

لإنشاء ثيم جديد من القالب المعتمد ثم اعتماده محلياً:
```bash
node factory.js create my-new-theme
node factory.js certify my-new-theme
```

لفحص سياسة سلة فقط دون بناء:
```bash
node factory.js policy zen-theme
```

لتحديث ذاكرة وثائق سلة وفحص الثيم ضدها:
```bash
node factory.js docs sync --max=180
node factory.js docs check zen-theme
```

لفحص بيانات التشغيل المحلية ومعاينة الثيم على سيناريوهات مختلفة:
```bash
node factory.js fixtures gate
node factory.js preview zen-theme --fixture=fashion-rich
node factory.js preview zen-theme --fixture=edge-cases
node factory.js preview zen-theme --fixture=empty-store
```

لإصلاح المشكلات الأمنية فقط:
```bash
node factory.js fix
```

---

## 📂 الوصول السريع للمجلدات
- [📁 الثيمات](themes/)
- [📁 التقارير](reports/)
- [📁 المعاينة](build/)

---
*هذا النظام قائم على التوثيق الرسمي لمنصة سلة (Documentation Driven).*
