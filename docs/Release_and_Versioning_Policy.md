# سياسة الإصدارات (Versioning & Release Policy)

لضمان القدرة على العودة لأي نسخة سابقة وتوثيق التغييرات لكل ثيم، نتبع القواعد التالية:

---

## 🔢 1. نظام الترقيم (Semantic Versioning)
نستخدم التنسيق `X.Y.Z` في ملف `twilight.json`:
*   **X (Major):** تغييرات جذرية في الهوية البصرية أو إعادة بناء شاملة.
*   **Y (Minor):** إضافة مكونات جديدة أو ميزات كبيرة.
*   **Z (Patch):** إصلاح أخطاء (Bugs) أو تحسينات بسيطة في التصميم.

---

## 🚩 2. استخدام Git Tags
عند الانتهاء من إصدار مستقر (Stable Release)، نقوم بتوثيقه في Git:
```bash
git add .
git commit -m "feat: add new hero section to raed theme"
git tag -a v1.1.0 -m "Release version 1.1.0"
```

---

## 📝 3. سجل التغييرات (Changelog)
يجب تحديث ملف `CHANGELOG.md` داخل مجلد كل ثيم قبل كل إصدار جديد، موضحاً:
*   ما الذي تم إضافته (Added).
*   ما الذي تم إصلاحه (Fixed).
*   ما الذي تم تغييره (Changed).

---

## 🚀 4. أتمتة البناء (Build Automation)
قبل رفع أي إصدار للمنصة، يجب تشغيل أمر الإنتاج لضمان ضغط الملفات:
```bash
npm run raed:build
```
ثم تشغيل الفحص النهائي:
```bash
npm run raed:review
```
