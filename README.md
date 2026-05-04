# 🏭 مصنع ثيمات سلة (Salla Theme Factory)
## المحرك الموحد لهندسة وتطوير الثيمات الاحترافية (v10.0)

مرحباً بك في المصنع! هذا النظام مصمم لضمان إنتاج ثيمات سلة بجودة عالمية، أمان فائق، ونزاهة تقنية كاملة.

---

## 🗺️ خارطة الطريق للتوثيق (Documentation Map)

للبدء في استكشاف النظام، يرجى مراجعة الوثائق التالية:

1.  **[📜 دستور المصنع](docs/MANIFESTO.md):** فهم الرؤية، المنهجية، وشروط الأمان والنزاهة.
2.  **[⚙️ المرجع التقني](docs/TECHNICAL_REFERENCE.md):** دليل استخدام واجهة الأوامر (CLI) وشرح هيكلية المشروع.
3.  **[🏭 خط إنتاج المصنع](docs/FACTORY_WORKFLOW.md):** البداية الصحيحة من intake/specs حتى مجلد التسليم.
4.  **[🛡️ سجل براهين النزاهة](docs/INTEGRITY_PROOFS.md):** أدلة حية تثبت قدرة المصنع على رصد وإصلاح الثغرات والتسريبات.
5.  **[🧩 محاكي Runtime سلة المحلي](docs/SALLA_LOCAL_RUNTIME.md):** الهدف المعماري الجديد لتشغيل الثيمات محلياً بعقد قريب من سلة.
6.  **[✅ طبقة الثقة والاعتماد](docs/SALLA_FACTORY_TRUST.md):** بوابات السياسة والبناء والتدقيق التي تمنع إنتاج ثيم غير مطابق.
7.  **[💡 مسار الابتكار](docs/INNOVATION_PIPELINE.md):** كيف تتحول الأفكار الجديدة إلى قدرات مصنع دون كبح الإبداع أو كسر سياسات سلة.
8.  **[📚 مصادر سياسات سلة](docs/SALLA_POLICY_SOURCES.md):** كل قاعدة محلية مرتبطة بمصدر رسمي من وثائق سلة.
9.  **[🧠 ذاكرة وثائق سلة](docs/SALLA_DOCS_INTELLIGENCE.md):** مزامنة `llms.txt` وتجميع المكونات والقواعد وعقود الصفحات محلياً.

---

## ⚡ التشغيل السريع (Quick Start)

لإنتاج ثيم جديد بالطريقة الصحيحة:
```bash
node factory.js intake my-new-theme --name-ar="ثيم جديد" --name-en="New Theme"
node factory.js manufacture my-new-theme
```

لا تبدأ بنسخ `themes/raed` يدوياً. المصنع نفسه يبدأ دائماً من `themes/raed` كقاعدة سلة الرسمية، ثم يطبق المواصفات والقدرات المسجلة، ويسجل توقيعه في:

```text
themes/<theme>/.factory/manifest.json
```

لإنتاج مجلد تسليم لثيم معتمد:
```bash
node factory.js deliver my-new-theme
```

لتسجيل فكرة عرض جديدة قبل تحويلها إلى قدرة مصنع:
```bash
node factory.js innovation propose scent-quiz --type=experience --title-ar="اختبار الرائحة" --title-en="Scent Quiz"
node factory.js innovation gate my-new-theme
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
- [📁 المواصفات](specs/)
- [📁 طلبات العمل](workorders/)
- [📁 الابتكارات](innovations/)
- [📁 التقارير](reports/)
- [📁 المعاينة](build/)
- [📁 التسليم](deliverables/)

---
*هذا النظام قائم على التوثيق الرسمي لمنصة سلة (Documentation Driven).*
