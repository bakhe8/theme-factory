const fs = require('fs');
const path = require('path');

const themeName = process.argv[2];
const customSpecsPath = process.argv[3];

if (!themeName) {
    console.error('❌ الاستخدام: node core/apply-specs.js <theme-name> [specs-file.json]');
    process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const defaultSpecsPath = path.join(rootDir, 'specs', `${themeName}.specs.json`);
const specsFilePath = customSpecsPath ? path.resolve(customSpecsPath) : defaultSpecsPath;

if (!fs.existsSync(specsFilePath)) {
    console.error(`❌ ملف المواصفات غير موجود: ${specsFilePath}`);
    console.error(`   انسخ specs/template.specs.json إلى specs/${themeName}.specs.json وعدّله`);
    process.exit(1);
}

const themePath = path.join(rootDir, 'themes', themeName);
if (!fs.existsSync(themePath)) {
    console.error(`❌ الثيم غير موجود: ${themePath}`);
    console.error(`   شغّل أولاً: node factory.js create ${themeName}`);
    process.exit(1);
}

const twilightPath = path.join(themePath, 'twilight.json');
const packageJsonPath = path.join(themePath, 'package.json');
const globalScssPath = path.join(themePath, 'src', 'assets', 'styles', '01-settings', 'global.scss');

if (!fs.existsSync(twilightPath)) {
    console.error('❌ twilight.json غير موجود في الثيم');
    process.exit(1);
}

// الميزات المسموح بها فقط حسب سياسة المصنع (ALLOWED_FEATURES في salla-theme-policy.js)
const POLICY_ALLOWED_FEATURES = new Set([
    'mega-menu', 'fonts', 'color', 'breadcrumb', 'unite-cards-height',
    'menu-images', 'filters', 'component-featured-products', 'component-fixed-banner',
    'component-fixed-products', 'component-products-slider', 'component-photos-slider',
    'component-parallax-background', 'component-random-testimonials', 'component-testimonials',
    'component-square-photos', 'component-store-features', 'component-youtube',
]);

const specs = JSON.parse(fs.readFileSync(specsFilePath, 'utf8'));
const twilight = JSON.parse(fs.readFileSync(twilightPath, 'utf8'));

const changes = [];
const warnings = [];

// --- الإعدادات الجاهزة (presets) ---
const PRESETS = {
    luxury:     { primary: '#D4AF37', accent: '#1C1C1C', background: '#faf8f3', text: '#1a1a1a', font: 'Amiri' },
    bold:       { primary: '#FF3E3E', accent: '#000000', background: '#ffffff', text: '#1a1a1a', font: 'Cairo' },
    minimalist: { primary: '#1A1A1A', accent: '#7C83FD', background: '#f9f9f9', text: '#333333', font: 'Almarai' },
    fashion:    { primary: '#111111', accent: '#E6BEAE', background: '#fdfdfd', text: '#231f1e', font: 'Outfit' },
};

// --- استخرج القيم النهائية للألوان والخط ---
let finalColors, finalFont;

const preset = specs.visual_identity?.preset;
if (preset && preset !== 'custom' && PRESETS[preset]) {
    finalColors = { ...PRESETS[preset] };
    finalFont = PRESETS[preset].font;
    changes.push(`preset: ${preset}`);
} else {
    finalColors = {
        primary:    specs.visual_identity?.colors?.primary    || '#111111',
        accent:     specs.visual_identity?.colors?.accent     || '#E6BEAE',
        background: specs.visual_identity?.colors?.background || '#fdfdfd',
        text:       specs.visual_identity?.colors?.text       || '#231f1e',
    };
    finalFont = specs.visual_identity?.font || 'Outfit';
}

// --- 1. بيانات الثيم ---
const brand = specs.brand || {};

// تحذير: identifier في specs لا يُستخدم لأن السياسة تشترط مطابقته لاسم مجلد الثيم
if (brand.identifier && brand.identifier !== themeName) {
    warnings.push(`brand.identifier في specs [${brand.identifier}] يختلف عن اسم الثيم [${themeName}]`);
    warnings.push(`  ← سياسة سلة تشترط: twilight.identifier === اسم المجلد. سيُستخدم [${themeName}] تلقائياً`);
}

// identifier يجب أن يساوي themeName دائماً (سياسة إلزامية)
twilight.identifier = themeName;
changes.push(`identifier: ${themeName} (مُثبَّت من اسم المجلد)`);

// repository يُبنى من themeName لا من brand.identifier (سياسة: يجب أن يحتوي اسم الثيم)
twilight.repository = `https://github.com/SallaApp/theme-${themeName}`;
changes.push(`repository: theme-${themeName}`);

if (brand.name_ar || brand.name_en) {
    twilight.name = {
        ar: brand.name_ar || twilight.name?.ar || 'ثيم جديد',
        en: brand.name_en || twilight.name?.en || 'New Theme',
    };
    changes.push(`name: ${twilight.name.ar} / ${twilight.name.en}`);
}

if (brand.author) {
    twilight.author = brand.author;
    changes.push(`author: ${brand.author}`);
}

if (brand.author_email) {
    twilight.author_email = brand.author_email;
    changes.push(`author_email: ${brand.author_email}`);
}

// version: يُحدَّث في twilight.json وpackage.json معاً (سياسة: يجب أن يتطابقا)
if (brand.version) {
    twilight.version = brand.version;
    changes.push(`version: ${brand.version}`);

    if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (pkg.version !== brand.version) {
            pkg.version = brand.version;
            fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
            changes.push(`package.json version: ${brand.version} (مزامنة مع twilight.json)`);
        }
    }
}

// --- 2. الإعدادات ---
function buildSettingsMap(specs, colors, font) {
    const s = specs.settings || {};
    return {
        primary_color:            colors.primary,
        accent_color:             colors.accent,
        bg_color:                 colors.background,
        font_family:              font,
        header_is_sticky:         s.header?.sticky,
        topnav_is_dark:           s.header?.dark_topbar,
        important_links:          s.header?.important_links,
        enable_more_menu:         s.header?.more_menu,
        is_more_button_enabled:   s.homepage?.show_all_button,
        vertical_fixed_products:  s.homepage?.vertical_fixed_products,
        imageZoom:                s.product?.image_zoom,
        sticky_add_to_cart:       s.product?.sticky_add_to_cart,
        enable_add_product_toast: s.product?.add_product_toast,
        show_tags:                s.product?.show_tags,
        footer_is_dark:           s.footer?.dark,
    };
}

const settingsMap = buildSettingsMap(specs, finalColors, finalFont);

if (Array.isArray(twilight.settings)) {
    twilight.settings.forEach(setting => {
        if (setting.id && settingsMap[setting.id] !== undefined) {
            setting.value = settingsMap[setting.id];
            if (typeof setting.selected !== 'undefined') {
                setting.selected = settingsMap[setting.id];
            }
            changes.push(`setting[${setting.id}]: ${settingsMap[setting.id]}`);
        }
    });
}

// --- 3. الميزات ---
// فقط الميزات الموجودة في ALLOWED_FEATURES (حسب salla-theme-policy.js)
const featureMap = {
    mega_menu:                     'mega-menu',
    fonts:                         'fonts',
    color:                         'color',
    breadcrumb:                    'breadcrumb',
    filters:                       'filters',
    unite_cards_height:            'unite-cards-height',
    menu_images:                   'menu-images',
    component_featured_products:   'component-featured-products',
    component_fixed_banner:        'component-fixed-banner',
    component_fixed_products:      'component-fixed-products',
    component_products_slider:     'component-products-slider',
    component_photos_slider:       'component-photos-slider',
    component_parallax_background: 'component-parallax-background',
    component_random_testimonials: 'component-random-testimonials',
    component_testimonials:        'component-testimonials',
    component_square_photos:       'component-square-photos',
    component_store_features:      'component-store-features',
    component_youtube:             'component-youtube',
};

const featuresSpec = specs.features || {};
const currentFeatures = new Set(twilight.features || []);
let featuresChanged = false;

Object.entries(featureMap).forEach(([specKey, sallaKey]) => {
    if (featuresSpec[specKey] === undefined) return;

    if (featuresSpec[specKey] === true && !currentFeatures.has(sallaKey)) {
        currentFeatures.add(sallaKey);
        changes.push(`feature[+]: ${sallaKey}`);
        featuresChanged = true;
    } else if (featuresSpec[specKey] === false && currentFeatures.has(sallaKey)) {
        currentFeatures.delete(sallaKey);
        changes.push(`feature[-]: ${sallaKey}`);
        featuresChanged = true;
    }
});

// تحقق من أن كل ميزة مسموح بها قبل الحفظ
for (const feature of currentFeatures) {
    if (!POLICY_ALLOWED_FEATURES.has(feature)) {
        warnings.push(`feature [${feature}] غير موجودة في ALLOWED_FEATURES — ستُطلق تحذيراً عند certify`);
    }
}

if (featuresChanged) {
    twilight.features = Array.from(currentFeatures);
}

// --- حفظ twilight.json ---
fs.writeFileSync(twilightPath, JSON.stringify(twilight, null, 4));

// --- 4. global.scss ---
if (fs.existsSync(globalScssPath)) {
    let scss = fs.readFileSync(globalScssPath, 'utf8');

    scss = replaceScssVar(scss, '--color-primary', finalColors.primary);
    scss = replaceScssVar(scss, '--main-text-color', finalColors.text);
    scss = replaceScssVar(scss, '--font-main', `"${finalFont}"`);

    fs.writeFileSync(globalScssPath, scss);
    changes.push('global.scss: ألوان وخط');
}

function replaceScssVar(scss, varName, value) {
    return scss.replace(
        new RegExp(`(${varName}:\\s*)([^;]+)(;)`, 'g'),
        `$1${value}$3`
    );
}

// --- تقرير ---
console.log(`\n✅ تم تطبيق المواصفات على الثيم [${themeName}]`);
console.log(`   ملف المواصفات: ${specsFilePath}\n`);

if (warnings.length > 0) {
    console.log('⚠️  تحذيرات:');
    warnings.forEach(w => console.log(`   ⚠ ${w}`));
    console.log('');
}

console.log('📋 التغييرات المُطبَّقة:');
changes.forEach(c => console.log(`   • ${c}`));
console.log('\n🔜 الخطوة التالية:');
console.log(`   node factory.js certify ${themeName}`);
