const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateDocsGate } = require('./docs-intelligence/guard');
const {
  formatRuleReference,
  getAllowedFeatures,
  validateTheme,
} = require('./policies/salla-theme-policy');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');

const HELP = `
Usage:
  node factory.js component <theme> feature <feature-id> [--dry-run]
  node factory.js component <theme> custom <slug> [--preset=basic|banner|links|products-grid|product-flip|lookbook|fragrance-discovery|scent-quiz] [--title-ar=...] [--title-en=...] [--icon=...] [--dry-run]

Examples:
  node factory.js component zen-theme feature component-youtube
  node factory.js component zen-theme custom promo-strip --preset=banner --title-ar="شريط عرض" --title-en="Promo Strip"
  node factory.js component zen-theme custom zen-products --preset=products-grid --title-ar="منتجات مختارة"
  node factory.js component zen-theme custom flip-showcase --preset=product-flip --title-ar="منتجات تفاعلية"
  node factory.js component zen-theme custom editorial-look --preset=lookbook --title-ar="إطلالة مختارة"
  node factory.js component zen-theme custom fragrance-discovery --preset=fragrance-discovery --title-ar="اكتشف عطرك"
  node factory.js component zen-theme custom scent-quiz --preset=scent-quiz --title-ar="اختبار الرائحة"
`;

const SOURCES = {
  features: {
    title: 'Twilight.json',
    url: 'https://docs.salla.dev/421921m0',
    section: 'Theme Features',
  },
  components: {
    title: 'Twilight.json',
    url: 'https://docs.salla.dev/421921m0',
    section: 'Theme components',
  },
  home: {
    title: 'Home Page',
    url: 'https://docs.salla.dev/422558m0',
    section: 'Theme Components / Home Page',
  },
};

const PRESETS = new Set(['basic', 'banner', 'links', 'products-grid', 'product-flip', 'lookbook', 'fragrance-discovery', 'scent-quiz']);

function parseOptions(args) {
  const options = {
    dryRun: false,
    force: false,
    preset: 'basic',
    icon: 'sicon-layout-grid-rearrange',
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--preset=')) {
      options.preset = valueAfterEquals(arg);
    } else if (arg.startsWith('--path=')) {
      options.componentPath = valueAfterEquals(arg);
    } else if (arg.startsWith('--title-ar=')) {
      options.titleAr = valueAfterEquals(arg);
    } else if (arg.startsWith('--title-en=')) {
      options.titleEn = valueAfterEquals(arg);
    } else if (arg.startsWith('--icon=')) {
      options.icon = valueAfterEquals(arg);
    }
  }

  return options;
}

function valueAfterEquals(value) {
  return String(value).slice(String(value).indexOf('=') + 1).trim();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 4)}\n`);
}

function createRollback(files, enabled) {
  if (!enabled) return { commit() {}, restore() {} };

  let committed = false;
  const snapshots = files.map((file) => ({
    file,
    exists: fs.existsSync(file),
    content: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null,
  }));

  return {
    commit() {
      committed = true;
    },
    restore() {
      if (committed) return;
      for (const snapshot of snapshots) {
        if (snapshot.exists) {
          ensureDir(path.dirname(snapshot.file));
          fs.writeFileSync(snapshot.file, snapshot.content);
        } else if (fs.existsSync(snapshot.file)) {
          fs.rmSync(snapshot.file, { force: true });
        }
      }
    },
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function themePath(themeName) {
  return path.join(themesDir, themeName);
}

function relativeThemePath(themeRoot, file) {
  return path.relative(themeRoot, file).replace(/\\/g, '/');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^component-/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function isValidComponentPath(value) {
  return /^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/.test(String(value || ''))
    && !String(value).includes('..')
    && !/[\\/]/.test(String(value));
}

function componentFileFromPath(themeRoot, componentPath) {
  return path.join(themeRoot, 'src', 'views', 'components', `${componentPath.replace(/\./g, path.sep)}.twig`);
}

function printSource(source) {
  console.log(`   ↳ ${source.title} - ${source.section} (${source.url})`);
}

function printFindings(label, findings) {
  if (!findings.length) return;
  console.log(`\n${label}`);
  for (const finding of findings) {
    console.log(`- [${finding.type}] ${finding.file}: ${finding.detail}`);
    const source = formatRuleReference(finding);
    if (source) console.log(`  ↳ ${source}`);
  }
}

function normalizeFeature(rawFeature) {
  const allowed = getAllowedFeatures();
  const raw = String(rawFeature || '').trim();
  if (allowed.has(raw)) return raw;

  const slug = slugify(raw);
  const componentFeature = `component-${slug}`;
  if (allowed.has(componentFeature)) return componentFeature;

  return raw.startsWith('component-') || raw === 'filters' ? raw : componentFeature;
}

function assertThemeReady(themeName, targetThemePath, options = {}) {
  if (!fs.existsSync(targetThemePath)) {
    throw new Error(`Theme not found: ${themeName}`);
  }

  const policy = validateTheme(targetThemePath, themeName);
  if (policy.issues.length) {
    printFindings('❌ الثيم لا يجتاز السياسة الحالية قبل التصنيع:', policy.issues);
    throw new Error('أصلح مشاكل السياسة الحالية قبل إضافة مكون جديد.');
  }

  if (!options.skipDocsGate) {
    const docsGate = validateDocsGate(themeName, { strict: true });
    if (docsGate.issues.length) {
      console.log('\n❌ بوابة وثائق سلة لا تسمح بالتصنيع الآن:');
      for (const issue of docsGate.issues) console.log(`- ${issue}`);
      throw new Error('حدث ذاكرة الوثائق أو أصلح تحذيرات strict-docs قبل التصنيع.');
    }
  }

  return policy;
}

function copyThemeForDryRun(sourceThemePath, themeName) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'salla-component-factory-'));
  const tempThemePath = path.join(tempRoot, themeName);
  const skippedDirs = new Set(['.git', 'node_modules', '.salla-cache', 'build']);

  fs.cpSync(sourceThemePath, tempThemePath, {
    recursive: true,
    filter(source) {
      const relative = path.relative(sourceThemePath, source);
      if (!relative) return true;
      return !skippedDirs.has(relative.split(path.sep)[0]);
    },
  });

  return { tempRoot, tempThemePath };
}

function stageTheme(themeName, options) {
  const sourceThemePath = themePath(themeName);
  if (!options.dryRun) {
    assertThemeReady(themeName, sourceThemePath);
    return {
      actualThemePath: sourceThemePath,
      targetThemePath: sourceThemePath,
      cleanup() {},
    };
  }

  assertThemeReady(themeName, sourceThemePath);
  const { tempRoot, tempThemePath } = copyThemeForDryRun(sourceThemePath, themeName);
  return {
    actualThemePath: sourceThemePath,
    targetThemePath: tempThemePath,
    cleanup() {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    },
  };
}

function validateAfterChange(themeName, targetThemePath, options) {
  const policy = validateTheme(targetThemePath, themeName);
  if (policy.issues.length) {
    printFindings('❌ فشل فحص السياسة بعد التصنيع:', policy.issues);
    throw new Error('تم رفض التغيير لأنه لا يطابق سياسة المصنع.');
  }

  if (!options.dryRun) {
    const docsGate = validateDocsGate(themeName, { strict: true });
    if (docsGate.issues.length) {
      console.log('\n❌ فشل strict docs gate بعد التصنيع:');
      for (const issue of docsGate.issues) console.log(`- ${issue}`);
      throw new Error('تم رفض التغيير لأنه لا يطابق ذاكرة وثائق سلة.');
    }
  }

  return policy;
}

function addFeature(themeName, rawFeature, options) {
  if (!rawFeature) throw new Error('Missing feature id.');

  const feature = normalizeFeature(rawFeature);
  const allowed = getAllowedFeatures();
  if (!allowed.has(feature)) {
    console.log(`\n❌ Feature غير مثبتة في وثائق سلة: ${feature}`);
    console.log('المسموح حالياً من عقد Theme Features:');
    for (const item of [...allowed].sort()) console.log(`- ${item}`);
    printSource(SOURCES.features);
    throw new Error('لا يمكن إضافة Feature غير موثقة كمسموحة.');
  }

  const stage = stageTheme(themeName, options);
  try {
    const twilightFile = path.join(stage.targetThemePath, 'twilight.json');
    const rollback = createRollback([twilightFile], !options.dryRun);
    const twilight = readJson(twilightFile);
    twilight.features = Array.isArray(twilight.features) ? twilight.features : [];

    const existed = twilight.features.includes(feature);
    if (!existed) twilight.features.push(feature);

    try {
      writeJson(twilightFile, twilight);

      const policy = validateAfterChange(themeName, stage.targetThemePath, options);
      rollback.commit();

      console.log(`\n✅ ${options.dryRun ? 'Dry run passed' : 'تمت إضافة Feature'}: ${feature}`);
      if (existed) console.log('   الحالة: موجودة مسبقاً، لم يحتج المصنع لتغييرها.');
      printSource(SOURCES.features);
      console.log(`   Policy issues: ${policy.issues.length}`);
      console.log(`   Policy warnings: ${policy.warnings.length}`);
      printFindings('⚠️ تحذيرات السياسة المتبقية:', policy.warnings);
    } catch (error) {
      rollback.restore();
      throw error;
    }
  } finally {
    stage.cleanup();
  }
}

function label(value, fallback) {
  return value || fallback;
}

function baseFields() {
  return [
    {
      id: 'title',
      type: 'string',
      icon: 'sicon-format-text-alt',
      label: 'العنوان',
      placeholder: 'اكتب عنوان القسم',
      format: 'text',
      required: false,
      multilanguage: true,
    },
    {
      id: 'subtitle',
      type: 'string',
      icon: 'sicon-typography',
      label: 'الوصف',
      placeholder: 'اكتب وصفاً مختصراً',
      format: 'textarea',
      required: false,
      multilanguage: true,
      maxLength: 255,
    },
  ];
}

function presetFields(preset) {
  if (preset === 'basic') return baseFields();

  if (preset === 'banner') {
    return [
      ...baseFields(),
      {
        id: 'image',
        type: 'string',
        icon: 'sicon-image',
        label: 'الصورة',
        format: 'image',
        required: false,
      },
      {
        id: 'url',
        type: 'string',
        icon: 'sicon-link',
        label: 'الرابط',
        format: 'url',
        required: false,
      },
      {
        id: 'button_label',
        type: 'string',
        icon: 'sicon-format-text-alt',
        label: 'نص الزر',
        format: 'text',
        required: false,
        multilanguage: true,
      },
    ];
  }

  if (preset === 'links') {
    return [
      {
        id: 'title',
        type: 'string',
        icon: 'sicon-format-text-alt',
        label: 'العنوان',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'links',
        type: 'collection',
        format: 'collection',
        label: 'الروابط',
        item_label: 'رابط',
        required: false,
        minLength: 1,
        maxLength: 8,
        fields: [
          {
            id: 'links.icon',
            type: 'string',
            icon: 'sicon-format-text-alt',
            label: 'الأيقونة',
            format: 'icon',
            required: false,
            value: 'sicon-store2',
          },
          {
            id: 'links.title',
            type: 'string',
            icon: 'sicon-format-text-alt',
            label: 'العنوان',
            format: 'text',
            required: true,
            multilanguage: true,
          },
          {
            id: 'links.url',
            type: 'string',
            icon: 'sicon-link',
            label: 'الرابط',
            format: 'url',
            required: false,
          },
        ],
      },
    ];
  }

  if (preset === 'products-grid') {
    return [
      {
        id: 'title',
        type: 'string',
        icon: 'sicon-format-text-alt',
        label: 'العنوان',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'subtitle',
        type: 'string',
        icon: 'sicon-typography',
        label: 'الوصف',
        placeholder: 'وصف مختصر يظهر أعلى المنتجات',
        format: 'textarea',
        required: false,
        multilanguage: true,
        maxLength: 220,
      },
      {
        id: 'products',
        type: 'items',
        source: 'products',
        label: 'اختر المنتجات',
        required: true,
        multichoice: true,
        maxLength: 12,
      },
      {
        id: 'show_hover_actions',
        type: 'boolean',
        icon: 'sicon-toggle-off',
        label: 'إظهار زر السلة عند تمرير المؤشر',
        format: 'switch',
        required: false,
        value: true,
        selected: true,
      },
    ];
  }

  if (preset === 'product-flip') {
    return [
    {
      id: 'title',
      type: 'string',
      icon: 'sicon-format-text-alt',
      label: 'العنوان',
      format: 'text',
      required: false,
      multilanguage: true,
    },
    {
      id: 'subtitle',
      type: 'string',
      icon: 'sicon-typography',
      label: 'الوصف',
      placeholder: 'وصف مختصر يظهر أعلى المنتجات',
      format: 'textarea',
      required: false,
      multilanguage: true,
      maxLength: 255,
    },
    {
      id: 'products',
      type: 'items',
      source: 'products',
      label: 'اختر المنتجات',
      required: true,
      multichoice: true,
      maxLength: 8,
    },
    {
      id: 'show_details_button',
      type: 'boolean',
      icon: 'sicon-toggle-off',
      label: 'عرض زر التفاصيل داخل البطاقة',
      format: 'switch',
      required: false,
      value: true,
      selected: true,
    },
    ];
  }

  if (preset === 'lookbook') {
    return [
      {
        id: 'title',
        type: 'string',
        icon: 'sicon-format-text-alt',
        label: 'العنوان',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'subtitle',
        type: 'string',
        icon: 'sicon-typography',
        label: 'الوصف',
        placeholder: 'اكتب قصة قصيرة تربط الصورة بالمنتجات',
        format: 'textarea',
        required: false,
        multilanguage: true,
        maxLength: 280,
      },
      {
        id: 'image',
        type: 'string',
        icon: 'sicon-image',
        label: 'صورة اللوحة',
        format: 'image',
        required: true,
      },
      {
        id: 'image_alt',
        type: 'string',
        icon: 'sicon-format-text-alt',
        label: 'وصف الصورة',
        format: 'text',
        required: false,
        multilanguage: true,
        maxLength: 120,
      },
      {
        id: 'products',
        type: 'items',
        source: 'products',
        label: 'اختر المنتجات المرتبطة بالصورة',
        required: true,
        multichoice: true,
        maxLength: 6,
      },
      {
        id: 'button_label',
        type: 'string',
        icon: 'sicon-format-text-alt',
        label: 'نص زر التفاصيل',
        format: 'text',
        required: false,
        multilanguage: true,
      },
    ];
  }

  if (preset === 'fragrance-discovery') {
    return [
      {
        id: 'title',
        type: 'string',
        icon: 'sicon-format-text-alt',
        label: 'العنوان',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'subtitle',
        type: 'string',
        icon: 'sicon-typography',
        label: 'الوصف',
        placeholder: 'وصف مختصر يوجه المتسوق لاختيار الرائحة المناسبة',
        format: 'textarea',
        required: false,
        multilanguage: true,
        maxLength: 280,
      },
      {
        id: 'products',
        type: 'items',
        source: 'products',
        label: 'منتجات تجربة العطور',
        required: true,
        multichoice: true,
        maxLength: 8,
      },
      {
        id: 'guide_title',
        type: 'string',
        icon: 'sicon-star2',
        label: 'عنوان مستشار الرائحة',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'gift_title',
        type: 'string',
        icon: 'sicon-gift',
        label: 'عنوان الإهداء والتجربة',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'compare_title',
        type: 'string',
        icon: 'sicon-list',
        label: 'عنوان المقارنة',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'guide_items',
        type: 'collection',
        format: 'collection',
        label: 'بطاقات مستشار الرائحة',
        item_label: 'اقتراح',
        required: false,
        minLength: 1,
        maxLength: 4,
        fields: [
          {
            id: 'guide_items.icon',
            type: 'string',
            icon: 'sicon-format-text-alt',
            label: 'الأيقونة',
            format: 'icon',
            required: false,
            value: 'sicon-star2',
          },
          {
            id: 'guide_items.title',
            type: 'string',
            icon: 'sicon-format-text-alt',
            label: 'العنوان',
            format: 'text',
            required: true,
            multilanguage: true,
          },
          {
            id: 'guide_items.note',
            type: 'string',
            icon: 'sicon-typography',
            label: 'الوصف',
            format: 'textarea',
            required: false,
            multilanguage: true,
            maxLength: 180,
          },
          {
            id: 'guide_items.filter',
            type: 'string',
            icon: 'sicon-search',
            label: 'كلمة المطابقة',
            format: 'text',
            required: false,
          },
        ],
      },
    ];
  }

  if (preset === 'scent-quiz') {
    return [
      {
        id: 'title',
        type: 'string',
        icon: 'sicon-format-text-alt',
        label: 'العنوان',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'subtitle',
        type: 'string',
        icon: 'sicon-typography',
        label: 'الوصف',
        placeholder: 'وصف مختصر يدعو المتسوق لاكتشاف العطر الأقرب له',
        format: 'textarea',
        required: false,
        multilanguage: true,
        maxLength: 240,
      },
      {
        id: 'products',
        type: 'items',
        source: 'products',
        label: 'منتجات اختبار الرائحة',
        required: true,
        multichoice: true,
        maxLength: 8,
      },
      {
        id: 'quiz_title',
        type: 'string',
        icon: 'sicon-star2',
        label: 'عنوان الاختبار',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'result_title',
        type: 'string',
        icon: 'sicon-check',
        label: 'عنوان النتيجة',
        format: 'text',
        required: false,
        multilanguage: true,
      },
      {
        id: 'quiz_questions',
        type: 'collection',
        format: 'collection',
        label: 'اختيارات الرائحة',
        item_label: 'اختيار',
        required: false,
        minLength: 2,
        maxLength: 6,
        fields: [
          {
            id: 'quiz_questions.icon',
            type: 'string',
            icon: 'sicon-format-text-alt',
            label: 'الأيقونة',
            format: 'icon',
            required: false,
            value: 'sicon-star2',
          },
          {
            id: 'quiz_questions.title',
            type: 'string',
            icon: 'sicon-format-text-alt',
            label: 'العنوان',
            format: 'text',
            required: true,
            multilanguage: true,
          },
          {
            id: 'quiz_questions.note',
            type: 'string',
            icon: 'sicon-typography',
            label: 'الوصف',
            format: 'textarea',
            required: false,
            multilanguage: true,
            maxLength: 140,
          },
          {
            id: 'quiz_questions.value',
            type: 'string',
            icon: 'sicon-search',
            label: 'كلمة المطابقة',
            format: 'text',
            required: true,
          },
        ],
      },
    ];
  }

  return baseFields();
}

function buildComponentConfig(slug, componentPath, options) {
  return {
    key: slug,
    title: {
      en: label(options.titleEn, titleFromSlug(slug)),
      ar: label(options.titleAr, titleFromSlug(slug)),
    },
    icon: options.icon || 'sicon-layout-grid-rearrange',
    path: componentPath,
    fields: presetFields(options.preset),
  };
}

function titleFromSlug(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderBasicTemplate(slug) {
  return `{#
| Variable           | Type    | Description                                                                  |
|--------------------|---------|------------------------------------------------------------------------------|
| component          | object  | Contains merchant settings for fields from twilight.json component section   |
| component.title    | ?string | Section title                                                                |
| component.subtitle | ?string | Section description                                                          |
| position           | int     | Sorting number start from zero                                               |
#}
<section class="s-block s-block--${slug} py-8" id="${slug}-{{ position }}">
    <div class="container">
        {% if component.title %}
            <div class="s-block__title">
                <div class="right-side">
                    <h2>{{ component.title }}</h2>
                    {% if component.subtitle %}
                        <p>{{ component.subtitle }}</p>
                    {% endif %}
                </div>
            </div>
        {% elseif component.subtitle %}
            <p class="text-sm text-gray-500">{{ component.subtitle }}</p>
        {% endif %}
    </div>
</section>
`;
}

function renderBannerTemplate(slug) {
  return `{#
| Variable               | Type    | Description                                                                  |
|------------------------|---------|------------------------------------------------------------------------------|
| component              | object  | Contains merchant settings for fields from twilight.json component section   |
| component.title        | ?string | Banner title                                                                 |
| component.subtitle     | ?string | Banner description                                                           |
| component.image        | ?string | Banner image                                                                 |
| component.url          | ?string | Optional target URL                                                          |
| component.button_label | ?string | Optional call-to-action label                                                |
| position               | int     | Sorting number start from zero                                               |
#}
<section class="s-block s-block--${slug} py-8" id="${slug}-{{ position }}">
    <div class="container">
        <div class="grid gap-6 md:grid-cols-2 md:items-center">
            {% if component.image %}
                <div class="overflow-hidden rounded-md bg-gray-100">
                    <img
                        src="{{ component.image }}"
                        alt="{{ (component.title ? component.title : '${slug}') | e('html_attr') }}"
                        class="h-full w-full object-cover"
                        width="720"
                        height="420"
                    >
                </div>
            {% endif %}

            <div>
                {% if component.title %}
                    <h2 class="mb-3 text-2xl font-bold">{{ component.title }}</h2>
                {% endif %}
                {% if component.subtitle %}
                    <p class="mb-5 text-gray-600">{{ component.subtitle }}</p>
                {% endif %}
                {% if component.url and component.button_label %}
                    <a href="{{ component.url }}" class="s-button-element s-button-btn s-button-primary">
                        {{ component.button_label }}
                    </a>
                {% endif %}
            </div>
        </div>
    </div>
</section>
`;
}

function renderLinksTemplate(slug) {
  return `{#
| Variable                | Type     | Description                                                                  |
|-------------------------|----------|------------------------------------------------------------------------------|
| component               | object   | Contains merchant settings for fields from twilight.json component section   |
| component.title         | ?string  | Section title                                                                |
| component.links         | object[] | Links configured by the merchant                                             |
| component.links[].icon  | ?string  | Link icon                                                                    |
| component.links[].title | string   | Link title                                                                   |
| component.links[].url   | ?string  | Link URL                                                                     |
| position                | int      | Sorting number start from zero                                               |
#}
<section class="s-block s-block--${slug} py-8" id="${slug}-{{ position }}">
    <div class="container">
        {% if component.title %}
            <div class="s-block__title">
                <div class="right-side">
                    <h2>{{ component.title }}</h2>
                </div>
            </div>
        {% endif %}

        {% if component.links|length %}
            <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
                {% for link in component.links %}
                    {% if link.title %}
                        <a href="{{ link.url ? link.url : '#' }}" class="rounded-md border border-gray-200 p-4 transition hover:border-primary hover:text-primary">
                            {% if link.icon %}
                                <i class="{{ link.icon }} mb-3 inline-block text-xl"></i>
                            {% endif %}
                            <span class="block font-semibold">{{ link.title }}</span>
                        </a>
                    {% endif %}
                {% endfor %}
            </div>
        {% endif %}
    </div>
</section>
`;
}

function renderProductsGridTemplate(slug) {
  return `{#
| Variable                     | Type      | Description                                                                  |
|------------------------------|-----------|------------------------------------------------------------------------------|
| component                    | object    | Contains merchant settings for fields from twilight.json component section   |
| title                        | ?string   | Fallback section title                                                       |
| subtitle                     | ?string   | Fallback section subtitle                                                    |
| products                     | Product[] | Fallback selected products                                                   |
| component.products           | Product[] | Selected products                                                            |
| component.show_hover_actions | bool      | Shows add-to-cart action over product image                                  |
| position                     | int       | Sorting number start from zero                                               |
#}
{% set block_title = component is defined and component.title is defined ? component.title : title|default(null) %}
{% set block_subtitle = component is defined and component.subtitle is defined ? component.subtitle : subtitle|default(null) %}
{% set selected_products = component is defined and component.products is defined ? component.products : products|default([]) %}
{% set show_hover_actions = component is defined and component.show_hover_actions is defined ? component.show_hover_actions : true %}
{% set component_id = '${slug}-' ~ position %}

<section class="s-block s-block--${slug} s-block--products-grid container py-8" id="{{ component_id }}" data-products-grid-experience>
    {% if block_title or block_subtitle %}
        <div class="s-block__title">
            <div class="right-side">
                {% if block_title %}
                    <h2>{{ block_title }}</h2>
                {% endif %}
                {% if block_subtitle %}
                    <p>{{ block_subtitle }}</p>
                {% endif %}
            </div>
        </div>
    {% endif %}

    {% if selected_products|length %}
        <div class="products-grid">
            {% for product in selected_products %}
                <article class="products-grid-card" data-products-grid-card tabindex="0" aria-current="false">
                    <a href="{{ product.url }}" class="products-grid-card__media" aria-label="{{ product.name|e('html_attr') }}">
                        <img src="{{ product.image.url|default(product.thumbnail) }}" alt="{{ product.image.alt|default(product.name)|e('html_attr') }}" loading="lazy">
                    </a>

                    {% if show_hover_actions %}
                        <div class="products-grid-card__actions">
                            <salla-add-product-button
                                width="wide"
                                product-id="{{ product.id }}"
                                product-status="{{ product.status }}"
                                product-type="{{ product.type }}">
                                <span>{{ trans('pages.cart.add_to_cart') }}</span>
                            </salla-add-product-button>
                        </div>
                    {% endif %}

                    <div class="products-grid-card__content">
                        <h3><a href="{{ product.url }}">{{ product.name }}</a></h3>
                        <div class="products-grid-card__price">
                            {% if product.is_on_sale %}
                                <span class="line-through opacity-60">{{ product.regular_price|money }}</span>
                            {% endif %}
                            <strong>{{ product.price|money }}</strong>
                        </div>
                    </div>
                </article>
            {% endfor %}
        </div>
    {% else %}
        <div class="py-10 text-center text-gray-400">
            {{ trans('common.no_products') }}
        </div>
    {% endif %}
</section>
`;
}

function renderProductFlipTemplate(slug) {
  return `{#
| Variable                      | Type      | Description                                                                  |
|-------------------------------|-----------|------------------------------------------------------------------------------|
| component                     | object    | Contains merchant settings for fields from twilight.json component section   |
| title                         | ?string   | Fallback section title                                                       |
| subtitle                      | ?string   | Fallback section subtitle                                                    |
| products                      | Product[] | Fallback selected products                                                   |
| component.products            | Product[] | Selected products                                                            |
| component.show_details_button | bool      | Shows a details link on the card back                                        |
| position                      | int       | Sorting number start from zero                                               |
#}
{% set block_title = component is defined and component.title is defined ? component.title : title|default(null) %}
{% set block_subtitle = component is defined and component.subtitle is defined ? component.subtitle : subtitle|default(null) %}
{% set selected_products = component is defined and component.products is defined ? component.products : products|default([]) %}
{% set show_details_button = component is defined and component.show_details_button is defined ? component.show_details_button : true %}
{% set component_id = '${slug}-' ~ position %}

<section class="s-block s-block--${slug} s-block--product-flip container py-8" id="{{ component_id }}" data-product-flip-experience>
    {% if block_title or block_subtitle %}
        <div class="s-block__title">
            <div class="right-side">
                {% if block_title %}
                    <h2>{{ block_title }}</h2>
                {% endif %}
                {% if block_subtitle %}
                    <p>{{ block_subtitle }}</p>
                {% endif %}
            </div>
        </div>
    {% endif %}

    {% if selected_products|length %}
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {% for product in selected_products %}
                <article class="product-flip-card" data-product-flip-card>
                    <div class="product-flip-card__inner">
                        <div class="product-flip-card__face product-flip-card__front">
                            <custom-salla-product-card product="{{ product }}"></custom-salla-product-card>
                            <button type="button" class="product-flip-card__toggle" data-product-flip-toggle aria-expanded="false">
                                <span>{{ trans('common.show_more')|default('More') }}</span>
                                <i class="sicon-arrow-left"></i>
                            </button>
                        </div>

                        <div class="product-flip-card__face product-flip-card__back" aria-hidden="true">
                            <button type="button" class="product-flip-card__close" data-product-flip-toggle aria-label="{{ trans('common.close')|default('Close') }}">
                                <i class="sicon-cancel"></i>
                            </button>

                            <a href="{{ product.url }}" class="product-flip-card__media" aria-label="{{ product.name|e('html_attr') }}">
                                <img src="{{ product.image.url|default(product.thumbnail) }}" alt="{{ product.image.alt|default(product.name)|e('html_attr') }}" loading="lazy">
                            </a>

                            <div class="product-flip-card__content">
                                <h3><a href="{{ product.url }}">{{ product.name }}</a></h3>
                                {% if product.subtitle %}
                                    <p>{{ product.subtitle }}</p>
                                {% endif %}

                                <div class="product-flip-card__price">
                                    {% if product.is_on_sale %}
                                        <span class="line-through opacity-60">{{ product.regular_price|money }}</span>
                                    {% endif %}
                                    <strong>{{ product.price|money }}</strong>
                                </div>

                                <salla-add-product-button
                                    fill="outline"
                                    width="wide"
                                    product-id="{{ product.id }}"
                                    product-status="{{ product.status }}"
                                    product-type="{{ product.type }}">
                                    <i class="sicon-shopping-bag"></i>
                                    <span>{{ trans('pages.cart.add_to_cart') }}</span>
                                </salla-add-product-button>

                                {% if show_details_button %}
                                    <a href="{{ product.url }}" class="product-flip-card__details">
                                        {{ trans('blocks.home.display_all')|default('View details') }}
                                    </a>
                                {% endif %}
                            </div>
                        </div>
                    </div>
                </article>
            {% endfor %}
        </div>
    {% else %}
        <div class="py-10 text-center text-gray-400">
            {{ trans('common.no_products') }}
        </div>
    {% endif %}
</section>
`;
}

function renderLookbookTemplate(slug) {
  return `{#
| Variable               | Type      | Description                                                                  |
|------------------------|-----------|------------------------------------------------------------------------------|
| component              | object    | Contains merchant settings for fields from twilight.json component section   |
| component.title        | ?string   | Section title                                                                |
| component.subtitle     | ?string   | Section description                                                          |
| component.image        | string    | Main lookbook image                                                          |
| component.image_alt    | ?string   | Main image alternative text                                                  |
| component.products     | Product[] | Selected shoppable products                                                  |
| component.button_label | ?string   | Product details link label                                                   |
| position               | int       | Sorting number start from zero                                               |
#}
{% set selected_products = component.products|default([]) %}
{% set image_alt = component.image_alt ? component.image_alt : (component.title ? component.title : '${slug}') %}
{% set details_label = component.button_label ? component.button_label : trans('blocks.home.display_all')|default('View details') %}
{% set component_id = '${slug}-' ~ position %}

<section class="s-block s-block--${slug} s-block--lookbook container py-8" id="{{ component_id }}" data-lookbook-experience>
    <div class="lookbook">
        <div class="lookbook__media">
            {% if component.image %}
                <img src="{{ component.image }}" alt="{{ image_alt|e('html_attr') }}" loading="lazy">
            {% endif %}
        </div>

        <div class="lookbook__panel">
            {% if component.title or component.subtitle %}
                <div class="s-block__title">
                    <div class="right-side">
                        {% if component.title %}
                            <h2>{{ component.title }}</h2>
                        {% endif %}
                        {% if component.subtitle %}
                            <p>{{ component.subtitle }}</p>
                        {% endif %}
                    </div>
                </div>
            {% endif %}

            {% if selected_products|length %}
                <div class="lookbook__products" data-lookbook-products>
                    {% for product in selected_products %}
                        <article class="lookbook-product" data-lookbook-product aria-current="{{ loop.first ? 'true' : 'false' }}">
                            <a href="{{ product.url }}" class="lookbook-product__image" aria-label="{{ product.name|e('html_attr') }}">
                                <img src="{{ product.image.url|default(product.thumbnail) }}" alt="{{ product.image.alt|default(product.name)|e('html_attr') }}" loading="lazy">
                            </a>

                            <div class="lookbook-product__content">
                                <h3><a href="{{ product.url }}">{{ product.name }}</a></h3>

                                <div class="lookbook-product__price">
                                    {% if product.is_on_sale %}
                                        <span class="line-through opacity-60">{{ product.regular_price|money }}</span>
                                    {% endif %}
                                    <strong>{{ product.price|money }}</strong>
                                </div>

                                <div class="lookbook-product__actions">
                                    <salla-add-product-button
                                        fill="outline"
                                        width="wide"
                                        product-id="{{ product.id }}"
                                        product-status="{{ product.status }}"
                                        product-type="{{ product.type }}">
                                        <i class="sicon-shopping-bag"></i>
                                        <span>{{ trans('pages.cart.add_to_cart') }}</span>
                                    </salla-add-product-button>

                                    <a href="{{ product.url }}" class="lookbook-product__details">
                                        {{ details_label }}
                                    </a>
                                </div>
                            </div>
                        </article>
                    {% endfor %}
                </div>
            {% else %}
                <div class="py-8 text-center text-gray-400">
                    {{ trans('common.no_products') }}
                </div>
            {% endif %}
        </div>
    </div>
</section>
`;
}

function renderFragranceDiscoveryTemplate(slug) {
  return `{#
| Variable                 | Type      | Description                                                                  |
|--------------------------|-----------|------------------------------------------------------------------------------|
| component                | object    | Contains merchant settings for fields from twilight.json component section   |
| component.title          | ?string   | Section title                                                                |
| component.subtitle       | ?string   | Section description                                                          |
| component.products       | Product[] | Fragrance products selected by the merchant                                  |
| component.guide_title    | ?string   | Scent finder title                                                           |
| component.gift_title     | ?string   | Gift/sample selector title                                                   |
| component.compare_title  | ?string   | Comparison title                                                             |
| component.guide_items    | array     | Optional scent finder cards                                                  |
| position                 | int       | Sorting number start from zero                                               |
#}
{% set selected_products = component.products is defined and component.products|length ? component.products : products|default([]) %}
{% set guide_items = component.guide_items is defined and component.guide_items|length ? component.guide_items : [] %}
{% set guide_title = component.guide_title ? component.guide_title : 'اختر حسب الرائحة' %}
{% set gift_title = component.gift_title ? component.gift_title : 'للهدايا أو التجربة' %}
{% set compare_title = component.compare_title ? component.compare_title : 'قارن قبل الشراء' %}
{% set component_id = '${slug}-' ~ position %}

<section class="s-block s-block--${slug} s-block--fragrance-discovery container py-8" id="{{ component_id }}" data-fragrance-discovery>
    {% if component.title or component.subtitle %}
        <div class="s-block__title">
            <div class="right-side">
                {% if component.title %}
                    <h2>{{ component.title }}</h2>
                {% endif %}
                {% if component.subtitle %}
                    <p>{{ component.subtitle }}</p>
                {% endif %}
            </div>
        </div>
    {% endif %}

    <div class="fragrance-discovery">
        <aside class="fragrance-discovery__finder" data-fragrance-finder>
            <h3>{{ guide_title }}</h3>

            <div class="fragrance-discovery__filters" role="group" aria-label="{{ guide_title|e('html_attr') }}">
                <button type="button" data-fragrance-filter="all" aria-pressed="true">
                    <i class="sicon-stars"></i>
                    <span>الكل</span>
                </button>

                {% if guide_items|length %}
                    {% for guide in guide_items %}
                        <button type="button" data-fragrance-filter="{{ guide.filter|default(guide.title)|e('html_attr') }}" aria-pressed="false">
                            {% if guide.icon %}
                                <i class="{{ guide.icon }}"></i>
                            {% endif %}
                            <span>{{ guide.title }}</span>
                        </button>
                    {% endfor %}
                {% else %}
                    <button type="button" data-fragrance-filter="عود" aria-pressed="false"><i class="sicon-star2"></i><span>عود</span></button>
                    <button type="button" data-fragrance-filter="مسك" aria-pressed="false"><i class="sicon-heart"></i><span>مسك</span></button>
                    <button type="button" data-fragrance-filter="بخور" aria-pressed="false"><i class="sicon-fire"></i><span>بخور</span></button>
                    <button type="button" data-fragrance-filter="للجنسين" aria-pressed="false"><i class="sicon-users"></i><span>هدايا</span></button>
                {% endif %}
            </div>

            {% if guide_items|length %}
                <div class="fragrance-discovery__guide">
                    {% for guide in guide_items %}
                        <button type="button" class="fragrance-guide-card" data-fragrance-filter="{{ guide.filter|default(guide.title)|e('html_attr') }}" aria-pressed="false">
                            {% if guide.icon %}
                                <i class="{{ guide.icon }}"></i>
                            {% endif %}
                            <strong>{{ guide.title }}</strong>
                            {% if guide.note %}
                                <span>{{ guide.note }}</span>
                            {% endif %}
                        </button>
                    {% endfor %}
                </div>
            {% endif %}
        </aside>

        <div class="fragrance-discovery__products">
            {% if selected_products|length %}
                <div class="fragrance-product-grid" data-fragrance-products>
                    {% for product in selected_products %}
                        {% set notes = product.fragrance_notes|default([]) %}
                        {% set notes_text = notes|join(' ') %}
                        <article
                            class="fragrance-product"
                            data-fragrance-product
                            data-fragrance-audience="{{ product.audience|default('')|e('html_attr') }}"
                            data-fragrance-family="{{ product.scent_family|default('')|e('html_attr') }}"
                            data-fragrance-notes="{{ notes_text|e('html_attr') }}"
                            data-fragrance-key="{{ (product.name|default('') ~ ' ' ~ product.category.name|default('') ~ ' ' ~ product.type|default(''))|e('html_attr') }}">
                            <a href="{{ product.url }}" class="fragrance-product__media" aria-label="{{ product.name|e('html_attr') }}">
                                <img src="{{ product.image.url|default(product.thumbnail) }}" alt="{{ product.image.alt|default(product.name)|e('html_attr') }}" loading="lazy">
                            </a>

                            <div class="fragrance-product__content">
                                <div class="fragrance-product__meta">
                                    {% if product.audience %}
                                        <span>{{ product.audience }}</span>
                                    {% endif %}
                                    {% if product.volume %}
                                        <span>{{ product.volume }}</span>
                                    {% endif %}
                                </div>

                                <h3><a href="{{ product.url }}">{{ product.name }}</a></h3>

                                {% if product.scent_family %}
                                    <p class="fragrance-product__family">{{ product.scent_family }}</p>
                                {% endif %}

                                <ol class="fragrance-note-pyramid" data-fragrance-note-pyramid>
                                    <li>
                                        <span>الافتتاحية</span>
                                        <strong>{{ notes[0]|default(product.scent_family|default('-')) }}</strong>
                                    </li>
                                    <li>
                                        <span>القلب</span>
                                        <strong>{{ notes[1]|default(product.audience|default('-')) }}</strong>
                                    </li>
                                    <li>
                                        <span>القاعدة</span>
                                        <strong>{{ notes[2]|default(product.concentration|default('-')) }}</strong>
                                    </li>
                                </ol>

                                <div class="fragrance-product__price">
                                    {% if product.is_on_sale %}
                                        <span class="line-through opacity-60">{{ product.regular_price|money }}</span>
                                    {% endif %}
                                    <strong>{{ product.price|money }}</strong>
                                </div>

                                <div class="fragrance-product__actions">
                                    <salla-add-product-button
                                        fill="outline"
                                        width="wide"
                                        product-id="{{ product.id }}"
                                        product-status="{{ product.status }}"
                                        product-type="{{ product.type }}">
                                        <i class="sicon-shopping-bag"></i>
                                        <span>{{ trans('pages.cart.add_to_cart') }}</span>
                                    </salla-add-product-button>

                                    <a href="{{ product.url }}" class="fragrance-product__details">
                                        {{ trans('blocks.home.display_all')|default('View details') }}
                                    </a>
                                </div>
                            </div>
                        </article>
                    {% endfor %}
                </div>

                <p class="fragrance-discovery__empty" data-fragrance-empty hidden>
                    {{ trans('common.no_products') }}
                </p>
            {% else %}
                <div class="py-10 text-center text-gray-400">
                    {{ trans('common.no_products') }}
                </div>
            {% endif %}
        </div>
    </div>

    {% if selected_products|length %}
        <div class="fragrance-discovery__commerce">
            <div class="fragrance-gift-selector" data-fragrance-gift-selector>
                <h3>{{ gift_title }}</h3>
                <div>
                    <button type="button" data-fragrance-filter="للجنسين" aria-pressed="false">
                        <i class="sicon-gift"></i>
                        <span>هدية آمنة</span>
                    </button>
                    <button type="button" data-fragrance-filter="عينات" aria-pressed="false">
                        <i class="sicon-star2"></i>
                        <span>جرب وقرر</span>
                    </button>
                    <button type="button" data-fragrance-filter="بخور" aria-pressed="false">
                        <i class="sicon-fire"></i>
                        <span>للمجالس</span>
                    </button>
                </div>
            </div>

            <div class="fragrance-comparison" data-fragrance-comparison>
                <h3>{{ compare_title }}</h3>
                <div class="fragrance-comparison__table" role="table" aria-label="{{ compare_title|e('html_attr') }}">
                    <div role="row">
                        <span role="columnheader">العطر</span>
                        <span role="columnheader">العائلة</span>
                        <span role="columnheader">النوتات</span>
                        <span role="columnheader">الحجم</span>
                    </div>
                    {% for product in selected_products %}
                        <a href="{{ product.url }}" role="row" data-fragrance-compare-row>
                            <span role="cell">{{ product.name }}</span>
                            <span role="cell">{{ product.scent_family|default('-') }}</span>
                            <span role="cell">{{ product.fragrance_notes|default([])|join('، ') }}</span>
                            <span role="cell">{{ product.volume|default('-') }}</span>
                        </a>
                    {% endfor %}
                </div>
            </div>
        </div>
    {% endif %}
</section>
`;
}

function renderScentQuizTemplate(slug) {
  return `{#
| Variable                 | Type      | Description                                                       |
|--------------------------|-----------|-------------------------------------------------------------------|
| component                | object    | Contains merchant settings for fields from twilight.json          |
| component.title          | ?string   | Section title                                                     |
| component.subtitle       | ?string   | Section description                                               |
| component.products       | Product[] | Selected products for quiz recommendations                        |
| component.quiz_title     | ?string   | Quiz options title                                                |
| component.result_title   | ?string   | Result panel title                                                |
| component.quiz_questions | array     | Optional local matching choices                                   |
| position                 | int       | Sorting number start from zero                                    |
#}
{% set selected_products = component.products is defined and component.products|length ? component.products : products|default([]) %}
{% set quiz_questions = component.quiz_questions is defined and component.quiz_questions|length ? component.quiz_questions : [] %}
{% set quiz_title = component.quiz_title ? component.quiz_title : 'ما الرائحة الأقرب لك؟' %}
{% set result_title = component.result_title ? component.result_title : 'اقتراحات مناسبة لك' %}
{% set component_id = '${slug}-' ~ position %}

<section class="s-block s-block--${slug} s-block--scent-quiz container py-8" id="{{ component_id }}" data-scent-quiz>
    <div class="scent-quiz">
        <div class="scent-quiz__intro">
            {% if component.title %}
                <h2>{{ component.title }}</h2>
            {% endif %}
            {% if component.subtitle %}
                <p>{{ component.subtitle }}</p>
            {% endif %}
        </div>

        <div class="scent-quiz__panel" data-scent-quiz-panel>
            <div class="scent-quiz__question">
                <h3>{{ quiz_title }}</h3>
                <div class="scent-quiz__options" role="group" aria-label="{{ quiz_title|e('html_attr') }}">
                    <button type="button" data-scent-quiz-option data-scent-match="all" aria-pressed="true" data-scent-title="الكل" data-scent-note="اعرض كل الترشيحات">
                        <i class="sicon-stars"></i>
                        <span>الكل</span>
                    </button>

                    {% if quiz_questions|length %}
                        {% for question in quiz_questions %}
                            <button
                                type="button"
                                data-scent-quiz-option
                                data-scent-match="{{ question.value|default(question.title)|e('html_attr') }}"
                                data-scent-title="{{ question.title|e('html_attr') }}"
                                data-scent-note="{{ question.note|default('')|e('html_attr') }}"
                                aria-pressed="false">
                                {% if question.icon %}
                                    <i class="{{ question.icon }}"></i>
                                {% endif %}
                                <span>{{ question.title }}</span>
                                {% if question.note %}
                                    <small>{{ question.note }}</small>
                                {% endif %}
                            </button>
                        {% endfor %}
                    {% else %}
                        <button type="button" data-scent-quiz-option data-scent-match="عود" data-scent-title="دفء العود" data-scent-note="روائح عميقة للمساء والمناسبات" aria-pressed="false"><i class="sicon-star2"></i><span>دفء العود</span><small>للمساء</small></button>
                        <button type="button" data-scent-quiz-option data-scent-match="مسك" data-scent-title="نعومة المسك" data-scent-note="اختيار هادئ ونظيف للاستخدام اليومي" aria-pressed="false"><i class="sicon-heart"></i><span>نعومة المسك</span><small>يومي</small></button>
                        <button type="button" data-scent-quiz-option data-scent-match="حمضيات" data-scent-title="انتعاش الحمضيات" data-scent-note="افتتاحية مشرقة وخفيفة" aria-pressed="false"><i class="sicon-sun"></i><span>انتعاش</span><small>صباحي</small></button>
                        <button type="button" data-scent-quiz-option data-scent-match="للجنسين" data-scent-title="هدية آمنة" data-scent-note="اختيارات مرنة تناسب أكثر من ذوق" aria-pressed="false"><i class="sicon-gift"></i><span>هدية آمنة</span><small>مرنة</small></button>
                    {% endif %}
                </div>
            </div>

            <div class="scent-quiz__result" data-scent-quiz-result>
                <span>{{ result_title }}</span>
                <strong data-scent-quiz-result-title>الكل</strong>
                <p data-scent-quiz-result-note>اعرض كل الترشيحات</p>
            </div>
        </div>

        <div class="scent-quiz__products">
            {% if selected_products|length %}
                <div class="scent-quiz__grid" data-scent-quiz-products>
                    {% for product in selected_products %}
                        {% set notes = product.fragrance_notes|default([]) %}
                        {% set notes_text = notes|join(' ') %}
                        <article
                            class="scent-quiz-product"
                            data-scent-quiz-product
                            data-scent-quiz-key="{{ (product.name|default('') ~ ' ' ~ product.scent_family|default('') ~ ' ' ~ product.audience|default('') ~ ' ' ~ notes_text ~ ' ' ~ product.category.name|default(''))|e('html_attr') }}">
                            <a href="{{ product.url }}" class="scent-quiz-product__media" aria-label="{{ product.name|e('html_attr') }}">
                                <img src="{{ product.image.url|default(product.thumbnail) }}" alt="{{ product.image.alt|default(product.name)|e('html_attr') }}" loading="lazy">
                            </a>

                            <div class="scent-quiz-product__content">
                                <div class="scent-quiz-product__meta">
                                    {% if product.scent_family %}
                                        <span>{{ product.scent_family }}</span>
                                    {% endif %}
                                    {% if product.audience %}
                                        <span>{{ product.audience }}</span>
                                    {% endif %}
                                </div>

                                <h3><a href="{{ product.url }}">{{ product.name }}</a></h3>

                                {% if notes|length %}
                                    <p class="scent-quiz-product__notes">{{ notes|slice(0, 3)|join('، ') }}</p>
                                {% endif %}

                                <div class="scent-quiz-product__price">
                                    {% if product.is_on_sale %}
                                        <span class="line-through opacity-60">{{ product.regular_price|money }}</span>
                                    {% endif %}
                                    <strong>{{ product.price|money }}</strong>
                                </div>

                                <div class="scent-quiz-product__actions">
                                    <salla-add-product-button
                                        fill="outline"
                                        width="wide"
                                        product-id="{{ product.id }}"
                                        product-status="{{ product.status }}"
                                        product-type="{{ product.type }}">
                                        <i class="sicon-shopping-bag"></i>
                                        <span>{{ trans('pages.cart.add_to_cart') }}</span>
                                    </salla-add-product-button>
                                    <a href="{{ product.url }}">{{ trans('blocks.home.display_all')|default('View details') }}</a>
                                </div>
                            </div>
                        </article>
                    {% endfor %}
                </div>

                <p class="scent-quiz__empty" data-scent-quiz-empty hidden>
                    {{ trans('common.no_products') }}
                </p>
            {% else %}
                <div class="py-10 text-center text-gray-400">
                    {{ trans('common.no_products') }}
                </div>
            {% endif %}
        </div>
    </div>
</section>
`;
}

function renderTemplate(slug, preset) {
  if (preset === 'banner') return renderBannerTemplate(slug);
  if (preset === 'links') return renderLinksTemplate(slug);
  if (preset === 'products-grid') return renderProductsGridTemplate(slug);
  if (preset === 'product-flip') return renderProductFlipTemplate(slug);
  if (preset === 'lookbook') return renderLookbookTemplate(slug);
  if (preset === 'fragrance-discovery') return renderFragranceDiscoveryTemplate(slug);
  if (preset === 'scent-quiz') return renderScentQuizTemplate(slug);
  return renderBasicTemplate(slug);
}

function renderProductsGridScript() {
  return `function setProductsGridCardState(card, active) {
  card.setAttribute('aria-current', active ? 'true' : 'false');
}

function initProductsGridExperience(root = document) {
  root.querySelectorAll('[data-products-grid-card]').forEach((card) => {
    if (card.dataset.productsGridReady === 'true') return;
    card.dataset.productsGridReady = 'true';

    card.addEventListener('mouseenter', () => setProductsGridCardState(card, true));
    card.addEventListener('mouseleave', () => setProductsGridCardState(card, false));
    card.addEventListener('focusin', () => setProductsGridCardState(card, true));
    card.addEventListener('focusout', () => setProductsGridCardState(card, false));
  });
}

document.addEventListener('theme::ready', () => initProductsGridExperience());
if (document.readyState !== 'loading') initProductsGridExperience();
`;
}

function renderProductFlipScript() {
  return `function setProductFlipState(card, active) {
  const toggleButtons = card.querySelectorAll('[data-product-flip-toggle]');
  const back = card.querySelector('.product-flip-card__back');

  card.classList.toggle('is-flipped', active);
  toggleButtons.forEach((button) => button.setAttribute('aria-expanded', active ? 'true' : 'false'));
  if (back) back.setAttribute('aria-hidden', active ? 'false' : 'true');
}

function initProductFlipExperience(root = document) {
  root.querySelectorAll('[data-product-flip-card]').forEach((card) => {
    if (card.dataset.productFlipReady === 'true') return;
    card.dataset.productFlipReady = 'true';

    card.querySelectorAll('[data-product-flip-toggle]').forEach((button) => {
      button.addEventListener('click', () => setProductFlipState(card, !card.classList.contains('is-flipped')));
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setProductFlipState(card, false);
    });
  });
}

document.addEventListener('theme::ready', () => initProductFlipExperience());
if (document.readyState !== 'loading') initProductFlipExperience();
`;
}

function renderProductsGridStyles() {
  return `.s-block--products-grid {
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .products-grid-card {
    position: relative;
    display: flex;
    min-height: 100%;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(17, 24, 39, 0.08);
    border-radius: 0.5rem;
    background: #fff;
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;

    &[aria-current='true'],
    &:hover,
    &:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 18px 38px rgba(17, 24, 39, 0.08);
      transform: translateY(-2px);
    }

    &__media {
      display: block;
      aspect-ratio: 4 / 5;
      overflow: hidden;
      background: #f3f4f6;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 260ms ease;
      }
    }

    &:hover &__media img,
    &:focus-within &__media img {
      transform: scale(1.04);
    }

    &__actions {
      position: absolute;
      right: 0.75rem;
      bottom: 5.25rem;
      left: 0.75rem;
      opacity: 0;
      transform: translateY(0.6rem);
      transition: opacity 180ms ease, transform 180ms ease;
    }

    &:hover &__actions,
    &:focus-within &__actions {
      opacity: 1;
      transform: translateY(0);
    }

    &__content {
      display: grid;
      gap: 0.55rem;
      padding: 0.9rem;
      text-align: center;

      h3 {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.95rem;
        font-weight: 800;
      }
    }

    &__price {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.45rem;
      color: var(--color-primary);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .s-block--products-grid .products-grid-card,
  .s-block--products-grid .products-grid-card__media img,
  .s-block--products-grid .products-grid-card__actions {
    transition: none;
    transform: none;
  }
}
`;
}

function renderProductFlipStyles() {
  return `.s-block--product-flip {
  .product-flip-card {
    min-height: 460px;
    perspective: 1400px;

    &__inner {
      position: relative;
      min-height: 100%;
      transform-style: preserve-3d;
      transition: transform 280ms ease;
    }

    &.is-flipped &__inner {
      transform: rotateY(180deg);
    }

    &__face {
      min-height: 460px;
      backface-visibility: hidden;
    }

    &__front {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    &__back {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 0.5rem;
      background: #fff;
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.08);
      transform: rotateY(180deg);
    }

    &__media {
      display: block;
      height: 180px;
      background: #f5f5f5;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &__content {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;

      h3 {
        font-weight: 700;
        line-height: 1.35;
      }

      p {
        display: -webkit-box;
        overflow: hidden;
        color: rgba(0, 0, 0, 0.62);
        font-size: 0.875rem;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
    }

    &__price {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    &__toggle,
    &__close,
    &__details {
      transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
    }

    &__toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 40px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 0.375rem;
      font-weight: 700;

      &:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
    }

    &__close {
      position: absolute;
      top: 0.75rem;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: #111;
    }

    &__details {
      margin-top: auto;
      color: var(--color-primary);
      font-weight: 700;
    }
  }

  [dir='rtl'] & .product-flip-card__close {
    left: 0.75rem;
  }

  [dir='ltr'] & .product-flip-card__close {
    right: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .s-block--product-flip .product-flip-card__inner {
    transition: none;
  }
}
`;
}

function renderLookbookScript() {
  return `function setLookbookActiveProduct(product) {
  const products = product.closest('[data-lookbook-products]');
  if (!products) return;

  products.querySelectorAll('[data-lookbook-product]').forEach((item) => {
    item.setAttribute('aria-current', item === product ? 'true' : 'false');
  });
}

function initLookbookExperience(root = document) {
  root.querySelectorAll('[data-lookbook-product]').forEach((product) => {
    if (product.dataset.lookbookReady === 'true') return;
    product.dataset.lookbookReady = 'true';

    product.addEventListener('mouseenter', () => setLookbookActiveProduct(product));
    product.addEventListener('focusin', () => setLookbookActiveProduct(product));
  });
}

document.addEventListener('theme::ready', () => initLookbookExperience());
if (document.readyState !== 'loading') initLookbookExperience();
`;
}

function renderLookbookStyles() {
  return `.s-block--lookbook {
  .lookbook {
    display: grid;
    gap: 1.25rem;

    @media (min-width: 1024px) {
      grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
      align-items: stretch;
    }

    &__media {
      min-height: 340px;
      overflow: hidden;
      border-radius: 0.5rem;
      background: #f5f5f5;

      img {
        width: 100%;
        height: 100%;
        min-height: 340px;
        object-fit: cover;
      }
    }

    &__panel {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1rem;
    }

    &__products {
      display: grid;
      gap: 0.75rem;
    }
  }

  .lookbook-product {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 0.875rem;
    padding: 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.5rem;
    background: #fff;
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;

    &[aria-current='true'],
    &:hover,
    &:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }

    &__image {
      display: block;
      overflow: hidden;
      border-radius: 0.375rem;
      background: #f5f5f5;

      img {
        width: 100%;
        height: 100%;
        min-height: 112px;
        object-fit: cover;
      }
    }

    &__content {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 0.5rem;

      h3 {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 700;
      }
    }

    &__price {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    &__actions {
      display: grid;
      gap: 0.5rem;
    }

    &__details {
      color: var(--color-primary);
      font-size: 0.875rem;
      font-weight: 700;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .s-block--lookbook .lookbook-product {
    transition: none;
    transform: none;
  }
}
`;
}

function renderFragranceDiscoveryScript() {
  return `function fragranceText(product) {
  return [
    product.dataset.fragranceAudience,
    product.dataset.fragranceFamily,
    product.dataset.fragranceNotes,
    product.dataset.fragranceKey,
  ].filter(Boolean).join(' ').toLowerCase();
}

function productMatchesFragranceFilter(product, filter) {
  const normalized = String(filter || 'all').trim().toLowerCase();
  if (!normalized || normalized === 'all') return true;
  return fragranceText(product).includes(normalized);
}

function setFragranceFilter(discovery, filter, sourceButton = null) {
  let visible = 0;

  discovery.querySelectorAll('[data-fragrance-filter]').forEach((button) => {
    const active = button === sourceButton || (sourceButton == null && button.dataset.fragranceFilter === filter);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  discovery.querySelectorAll('[data-fragrance-product]').forEach((product) => {
    const matched = productMatchesFragranceFilter(product, filter);
    product.hidden = !matched;
    if (matched) visible += 1;
  });

  const empty = discovery.querySelector('[data-fragrance-empty]');
  if (empty) empty.hidden = visible !== 0;
}

function initFragranceDiscovery(root = document) {
  root.querySelectorAll('[data-fragrance-discovery]').forEach((discovery) => {
    if (discovery.dataset.fragranceDiscoveryReady === 'true') return;
    discovery.dataset.fragranceDiscoveryReady = 'true';

    discovery.querySelectorAll('[data-fragrance-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        setFragranceFilter(discovery, button.dataset.fragranceFilter, button);
      });
    });

    discovery.querySelectorAll('[data-fragrance-compare-row]').forEach((row) => {
      row.addEventListener('mouseenter', () => row.setAttribute('aria-current', 'true'));
      row.addEventListener('mouseleave', () => row.setAttribute('aria-current', 'false'));
      row.addEventListener('focus', () => row.setAttribute('aria-current', 'true'));
      row.addEventListener('blur', () => row.setAttribute('aria-current', 'false'));
    });

    discovery.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setFragranceFilter(discovery, 'all');
    });
  });
}

document.addEventListener('theme::ready', () => initFragranceDiscovery());
if (document.readyState !== 'loading') initFragranceDiscovery();
`;
}

function renderFragranceDiscoveryStyles() {
  return `.s-block--fragrance-discovery {
  .fragrance-discovery {
    display: grid;
    gap: 1rem;

    @media (min-width: 1024px) {
      grid-template-columns: minmax(260px, 0.34fr) minmax(0, 1fr);
      align-items: start;
    }

    &__finder,
    &__commerce {
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 0.5rem;
      background: #fff;
    }

    &__finder {
      position: sticky;
      top: 1rem;
      display: grid;
      gap: 1rem;
      padding: 1rem;

      h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 800;
      }
    }

    &__filters {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        min-height: 42px;
        padding: 0.55rem 0.65rem;
        border: 1px solid rgba(17, 24, 39, 0.1);
        border-radius: 0.375rem;
        background: #fafafa;
        color: #111827;
        font-size: 0.875rem;
        font-weight: 700;
        transition: border-color 180ms ease, color 180ms ease, background 180ms ease;

        &[aria-pressed='true'],
        &:hover,
        &:focus-visible {
          border-color: var(--color-primary);
          background: rgba(17, 24, 39, 0.04);
          color: var(--color-primary);
        }
      }
    }

    &__guide {
      display: grid;
      gap: 0.5rem;
    }

    &__empty {
      margin: 1rem 0 0;
      padding: 1rem;
      border: 1px dashed rgba(17, 24, 39, 0.16);
      border-radius: 0.5rem;
      color: rgba(17, 24, 39, 0.62);
      text-align: center;
    }

    &__commerce {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
      padding: 1rem;

      @media (min-width: 1024px) {
        grid-template-columns: minmax(240px, 0.34fr) minmax(0, 1fr);
      }
    }
  }

  .fragrance-guide-card {
    display: grid;
    gap: 0.25rem;
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(17, 24, 39, 0.08);
    border-radius: 0.5rem;
    background: #ffffff;
    text-align: start;
    transition: border-color 180ms ease, box-shadow 180ms ease;

    i {
      color: var(--color-primary);
    }

    strong {
      font-size: 0.9rem;
    }

    span {
      color: rgba(17, 24, 39, 0.62);
      font-size: 0.8rem;
      line-height: 1.6;
    }

    &[aria-pressed='true'],
    &:hover,
    &:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 12px 30px rgba(17, 24, 39, 0.08);
    }
  }

  .fragrance-product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .fragrance-product {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(17, 24, 39, 0.08);
    border-radius: 0.5rem;
    background: #fff;
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;

    &:hover,
    &:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 18px 38px rgba(17, 24, 39, 0.08);
      transform: translateY(-2px);
    }

    &__media {
      display: block;
      aspect-ratio: 1 / 1;
      background: #f3f4f6;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &__content {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.7rem;
      padding: 0.9rem;

      h3 {
        margin: 0;
        font-size: 0.98rem;
        font-weight: 800;
        line-height: 1.55;
      }
    }

    &__meta,
    &__price {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    &__meta span {
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: #f8fafc;
      color: rgba(17, 24, 39, 0.68);
      font-size: 0.75rem;
      font-weight: 700;
    }

    &__family {
      color: rgba(17, 24, 39, 0.66);
      font-size: 0.86rem;
      line-height: 1.6;
    }

    &__actions {
      display: grid;
      gap: 0.55rem;
      margin-top: auto;
    }

    &__details {
      color: var(--color-primary);
      font-size: 0.86rem;
      font-weight: 800;
    }
  }

  .fragrance-note-pyramid {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr);
      align-items: center;
      gap: 0.5rem;
      min-height: 32px;
      padding: 0.35rem 0.5rem;
      border-radius: 0.375rem;
      background: #f9fafb;
    }

    span {
      color: rgba(17, 24, 39, 0.54);
      font-size: 0.74rem;
      font-weight: 700;
    }

    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.82rem;
    }
  }

  .fragrance-gift-selector {
    display: grid;
    align-content: start;
    gap: 0.75rem;

    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
    }

    div {
      display: grid;
      gap: 0.5rem;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.5rem;
      min-height: 42px;
      padding: 0.55rem 0.75rem;
      border: 1px solid rgba(17, 24, 39, 0.1);
      border-radius: 0.375rem;
      background: #fff;
      font-weight: 800;

      &[aria-pressed='true'],
      &:hover,
      &:focus-visible {
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
    }
  }

  .fragrance-comparison {
    min-width: 0;

    h3 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      font-weight: 800;
    }

    &__table {
      display: grid;
      overflow-x: auto;
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 0.5rem;
    }

    [role='row'] {
      display: grid;
      grid-template-columns: minmax(160px, 1.4fr) minmax(120px, 0.8fr) minmax(220px, 1.4fr) minmax(90px, 0.6fr);
      min-width: 620px;
    }

    [role='columnheader'],
    [role='cell'] {
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid rgba(17, 24, 39, 0.06);
      color: #111827;
      font-size: 0.82rem;
      line-height: 1.6;
    }

    [role='columnheader'] {
      background: #f9fafb;
      font-weight: 900;
    }

    a[role='row'] {
      transition: background 180ms ease;

      &[aria-current='true'],
      &:hover,
      &:focus-visible {
        background: rgba(17, 24, 39, 0.035);
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .s-block--fragrance-discovery .fragrance-product,
  .s-block--fragrance-discovery .fragrance-guide-card,
  .s-block--fragrance-discovery .fragrance-comparison a[role='row'] {
    transition: none;
    transform: none;
  }
}
`;
}

function renderScentQuizScript() {
  return `function scentQuizText(product) {
  return String(product.dataset.scentQuizKey || '').toLowerCase();
}

function scentQuizMatches(product, value) {
  const normalized = String(value || 'all').trim().toLowerCase();
  if (!normalized || normalized === 'all') return true;
  return scentQuizText(product).includes(normalized);
}

function setScentQuizResult(quiz, button) {
  const value = button.dataset.scentMatch || 'all';
  let visible = 0;

  quiz.querySelectorAll('[data-scent-quiz-option]').forEach((option) => {
    option.setAttribute('aria-pressed', option === button ? 'true' : 'false');
  });

  quiz.querySelectorAll('[data-scent-quiz-product]').forEach((product) => {
    const matched = scentQuizMatches(product, value);
    product.hidden = !matched;
    if (matched) visible += 1;
  });

  const resultTitle = quiz.querySelector('[data-scent-quiz-result-title]');
  const resultNote = quiz.querySelector('[data-scent-quiz-result-note]');
  const result = quiz.querySelector('[data-scent-quiz-result]');
  const empty = quiz.querySelector('[data-scent-quiz-empty]');

  if (resultTitle) resultTitle.textContent = button.dataset.scentTitle || button.textContent.trim();
  if (resultNote) resultNote.textContent = button.dataset.scentNote || '';
  if (result) result.hidden = false;
  if (empty) empty.hidden = visible !== 0;
}

function resetScentQuiz(quiz) {
  const first = quiz.querySelector('[data-scent-quiz-option]');
  if (first) setScentQuizResult(quiz, first);
}

function initScentQuiz(root = document) {
  root.querySelectorAll('[data-scent-quiz]').forEach((quiz) => {
    if (quiz.dataset.scentQuizReady === 'true') return;
    quiz.dataset.scentQuizReady = 'true';

    quiz.querySelectorAll('[data-scent-quiz-option]').forEach((button) => {
      button.addEventListener('click', () => setScentQuizResult(quiz, button));
    });

    quiz.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') resetScentQuiz(quiz);
    });
  });
}

document.addEventListener('theme::ready', () => initScentQuiz());
if (document.readyState !== 'loading') initScentQuiz();
`;
}

function renderScentQuizStyles() {
  return `.s-block--scent-quiz {
  .scent-quiz {
    display: grid;
    gap: 1rem;

    &__intro {
      max-width: 760px;

      h2 {
        margin: 0;
        font-size: 1.45rem;
        font-weight: 900;
        line-height: 1.45;
      }

      p {
        margin: 0.35rem 0 0;
        color: rgba(17, 24, 39, 0.66);
        line-height: 1.8;
      }
    }

    &__panel {
      display: grid;
      gap: 1rem;
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 0.5rem;
      background: #fff;
      padding: 1rem;

      @media (min-width: 900px) {
        grid-template-columns: minmax(0, 1fr) minmax(240px, 0.34fr);
        align-items: stretch;
      }
    }

    &__question h3 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      font-weight: 900;
    }

    &__options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.65rem;

      button {
        display: grid;
        min-height: 92px;
        align-content: center;
        gap: 0.25rem;
        padding: 0.75rem;
        border: 1px solid rgba(17, 24, 39, 0.1);
        border-radius: 0.5rem;
        background: #fafafa;
        color: #111827;
        text-align: start;
        transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;

        i {
          color: var(--color-primary);
        }

        span {
          font-weight: 900;
        }

        small {
          color: rgba(17, 24, 39, 0.58);
          line-height: 1.5;
        }

        &[aria-pressed='true'],
        &:hover,
        &:focus-visible {
          border-color: var(--color-primary);
          box-shadow: 0 14px 30px rgba(17, 24, 39, 0.08);
          transform: translateY(-1px);
        }
      }
    }

    &__result {
      display: grid;
      align-content: center;
      gap: 0.35rem;
      border-radius: 0.5rem;
      background: #111827;
      color: #fff;
      padding: 1rem;

      span {
        color: rgba(255, 255, 255, 0.68);
        font-size: 0.78rem;
        font-weight: 800;
      }

      strong {
        font-size: 1.1rem;
        line-height: 1.5;
      }

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.76);
        line-height: 1.7;
      }
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    &__empty {
      margin: 0;
      padding: 1rem;
      border: 1px dashed rgba(17, 24, 39, 0.16);
      border-radius: 0.5rem;
      color: rgba(17, 24, 39, 0.62);
      text-align: center;
    }
  }

  .scent-quiz-product {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(17, 24, 39, 0.08);
    border-radius: 0.5rem;
    background: #fff;
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;

    &:hover,
    &:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 18px 38px rgba(17, 24, 39, 0.08);
      transform: translateY(-2px);
    }

    &__media {
      display: block;
      aspect-ratio: 1 / 1;
      background: #f3f4f6;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &__content {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.65rem;
      padding: 0.9rem;

      h3 {
        margin: 0;
        font-size: 0.98rem;
        font-weight: 900;
        line-height: 1.55;
      }
    }

    &__meta,
    &__price {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
    }

    &__meta span {
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: #f8fafc;
      color: rgba(17, 24, 39, 0.68);
      font-size: 0.75rem;
      font-weight: 800;
    }

    &__notes {
      margin: 0;
      color: rgba(17, 24, 39, 0.62);
      font-size: 0.84rem;
      line-height: 1.7;
    }

    &__actions {
      display: grid;
      gap: 0.5rem;
      margin-top: auto;

      a {
        color: var(--color-primary);
        font-size: 0.86rem;
        font-weight: 900;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .s-block--scent-quiz .scent-quiz__options button,
  .s-block--scent-quiz .scent-quiz-product {
    transition: none;
    transform: none;
  }
}
`;
}

function assetPlanForPreset(themeRoot, slug, preset) {
  if (!['products-grid', 'product-flip', 'lookbook', 'fragrance-discovery', 'scent-quiz'].includes(preset)) return [];

  const renderers = {
    'products-grid': {
      script: renderProductsGridScript,
      styles: renderProductsGridStyles,
    },
    'product-flip': {
      script: renderProductFlipScript,
      styles: renderProductFlipStyles,
    },
    lookbook: {
      script: renderLookbookScript,
      styles: renderLookbookStyles,
    },
    'fragrance-discovery': {
      script: renderFragranceDiscoveryScript,
      styles: renderFragranceDiscoveryStyles,
    },
    'scent-quiz': {
      script: renderScentQuizScript,
      styles: renderScentQuizStyles,
    },
  };

  return [
    {
      type: 'file',
      path: path.join(themeRoot, 'src', 'assets', 'js', 'components', `${slug}.js`),
      content: renderers[preset].script(),
    },
    {
      type: 'file',
      path: path.join(themeRoot, 'src', 'assets', 'styles', '04-components', `${slug}.scss`),
      content: renderers[preset].styles(),
    },
    {
      type: 'prepend-line',
      path: path.join(themeRoot, 'src', 'assets', 'js', 'home.js'),
      line: `import "./components/${slug}";`,
    },
    {
      type: 'append-line',
      path: path.join(themeRoot, 'src', 'assets', 'styles', 'app.scss'),
      line: `@import './04-components/${slug}';`,
    },
  ];
}

function applyAssetPlan(plan, options) {
  for (const item of plan) {
    if (item.type === 'file') {
      if (fs.existsSync(item.path) && !options.force) {
        throw new Error(`ملف تجربة العرض موجود مسبقاً: ${item.path}. استخدم --force للاستبدال.`);
      }
      ensureDir(path.dirname(item.path));
      fs.writeFileSync(item.path, item.content);
      continue;
    }

    const content = fs.readFileSync(item.path, 'utf8');
    if (content.includes(item.line)) continue;
    const next = item.type === 'prepend-line'
      ? `${item.line}\n${content}`
      : `${content.replace(/\s*$/, '\n')}${item.line}\n`;
    fs.writeFileSync(item.path, next);
  }
}

function replaceOrAppendComponent(components, candidate, force) {
  const index = components.findIndex((component) => component.path === candidate.path || component.key === candidate.key);
  if (index === -1) {
    components.push(candidate);
    return 'added';
  }

  if (!force) {
    throw new Error(`يوجد Component بنفس key أو path: ${candidate.key} / ${candidate.path}. استخدم --force إذا كنت تريد استبداله.`);
  }

  components[index] = candidate;
  return 'replaced';
}

function addCustomComponent(themeName, rawSlug, options) {
  const slug = slugify(rawSlug);
  if (!slug || slug.length < 3) throw new Error('اسم Custom Component يجب أن يكون slug واضحاً مثل promo-strip.');
  if (!PRESETS.has(options.preset)) throw new Error(`Preset غير معروف: ${options.preset}. استخدم basic أو banner أو links أو products-grid أو product-flip أو lookbook أو fragrance-discovery أو scent-quiz.`);

  const componentPath = options.componentPath || `home.${slug}`;
  if (!isValidComponentPath(componentPath)) {
    throw new Error(`مسار component غير صالح: ${componentPath}. المثال الصحيح: home.${slug}`);
  }

  if (!componentPath.startsWith('home.')) {
    printSource(SOURCES.home);
    throw new Error('سياسة المصنع تنشئ Custom Components داخل home.* فقط لأن عقد سلة يربطها بصفحة Home.');
  }

  const stage = stageTheme(themeName, options);
  const componentFile = componentFileFromPath(stage.targetThemePath, componentPath);
  const candidate = buildComponentConfig(slug, componentPath, options);
  const template = renderTemplate(slug, options.preset);
  const assetPlan = assetPlanForPreset(stage.targetThemePath, slug, options.preset);

  try {
    const twilightFile = path.join(stage.targetThemePath, 'twilight.json');
    const rollback = createRollback([twilightFile, componentFile, ...assetPlan.map((item) => item.path)], !options.dryRun);

    if (fs.existsSync(componentFile) && !options.force) {
      throw new Error(`ملف Twig موجود مسبقاً: ${relativeThemePath(stage.targetThemePath, componentFile)}. استخدم --force للاستبدال.`);
    }

    const twilight = readJson(twilightFile);
    twilight.components = Array.isArray(twilight.components) ? twilight.components : [];
    const action = replaceOrAppendComponent(twilight.components, candidate, options.force);

    try {
      ensureDir(path.dirname(componentFile));
      fs.writeFileSync(componentFile, template);
      applyAssetPlan(assetPlan, options);
      writeJson(twilightFile, twilight);

      const policy = validateAfterChange(themeName, stage.targetThemePath, options);
      rollback.commit();

      console.log(`\n✅ ${options.dryRun ? 'Dry run passed' : action === 'replaced' ? 'تم استبدال Custom Component' : 'تم إنشاء Custom Component'}: ${componentPath}`);
      console.log(`   Twig: ${relativeThemePath(stage.targetThemePath, componentFile)}`);
      console.log(`   Preset: ${options.preset}`);
      for (const item of assetPlan.filter((entry) => entry.type === 'file')) {
        console.log(`   Asset: ${relativeThemePath(stage.targetThemePath, item.path)}`);
      }
      printSource(SOURCES.components);
      printSource(SOURCES.home);
      console.log(`   Policy issues: ${policy.issues.length}`);
      console.log(`   Policy warnings: ${policy.warnings.length}`);
      printFindings('⚠️ تحذيرات السياسة المتبقية:', policy.warnings);
    } catch (error) {
      rollback.restore();
      throw error;
    }
  } finally {
    stage.cleanup();
  }
}

function main() {
  const [themeName, kind, name, ...rest] = process.argv.slice(2);
  const options = parseOptions(rest);

  if (!themeName || !kind || !name || ['-h', '--help', 'help'].includes(themeName)) {
    console.log(HELP.trim());
    process.exitCode = themeName ? 1 : 0;
    return;
  }

  console.log('🧩 Salla Component Factory');
  console.log('--------------------------');
  if (options.dryRun) console.log('Mode: dry-run (no changes will be written to the theme)');

  if (kind === 'feature') {
    addFeature(themeName, name, options);
  } else if (kind === 'custom') {
    addCustomComponent(themeName, name, options);
  } else {
    throw new Error(`Unknown component factory kind: ${kind}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`\n❌ Component factory failed: ${error.message}`);
  process.exit(1);
}
