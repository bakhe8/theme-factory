# Specs

كل ثيم قابل للإنتاج يجب أن يملك ملف:

```text
specs/<theme>.specs.json
```

هذا الملف هو عقد التصنيع: الهوية، الميزات الرسمية، تجارب البيع، تجارب الصفحات، التكاملات، الابتكارات المطلوبة، والـ verticals المطلوبة.

أنشئه عبر:

```bash
node factory.js intake <theme-name>
```

ثم نفذ:

```bash
node factory.js manufacture <theme-name>
```

أي عنصر داخل `innovation.experiments` يجب أن يكون مسجلا في `innovations/`، ولا يدخل الإنتاج إلا إذا كان `implemented` أو `certified`.
