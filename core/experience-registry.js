const path = require('path');

const EXPERIENCES = {
  'product-flip': {
    id: 'product-flip',
    status: 'implemented',
    title: {
      ar: 'بطاقات منتجات قابلة للقلب',
      en: 'Product Flip Cards',
    },
    defaultSlug: 'flip-showcase',
    defaultTitles: {
      ar: 'منتجات تفاعلية',
      en: 'Interactive Products',
    },
    componentPreset: 'product-flip',
    componentPathPrefix: 'home',
    intent: 'عرض منتجات مختارة بطريقة تفاعلية مع الحفاظ على السعر، الصورة، رابط المنتج، وزر الإضافة للسلة.',
    docsSources: [
      {
        title: 'Twilight.json',
        url: 'https://docs.salla.dev/421921m0',
        section: 'Theme components',
      },
      {
        title: 'Home Page',
        url: 'https://docs.salla.dev/422558m0',
        section: 'Theme Components / Home Page',
      },
      {
        title: 'Product Card',
        url: 'https://docs.salla.dev/422718m0',
        section: 'Custom Salla Product Card Component',
      },
      {
        title: 'Components Customization',
        url: 'https://docs.salla.dev/422690m0',
        section: 'CSS classes / SCSS / Tailwind customization',
      },
    ],
    gate: {
      requiredFields: [
        { id: 'products', type: 'items', source: 'products' },
        { id: 'show_details_button', type: 'boolean' },
      ],
      twigMarkers: [
        'data-product-flip-experience',
        'data-product-flip-card',
        'custom-salla-product-card',
        'salla-add-product-button',
        'product.price|money',
        'product.url',
        'product.image',
      ],
      jsMarkers: [
        'data-product-flip-toggle',
        'aria-expanded',
        'aria-hidden',
        'Escape',
        'addEventListener',
      ],
      cssMarkers: [
        '.s-block--product-flip',
        '.product-flip-card',
        'prefers-reduced-motion',
      ],
      maxAddedSourceBytes: 48 * 1024,
    },
  },
  lookbook: {
    id: 'lookbook',
    status: 'implemented',
    title: { ar: 'لوك بوك قابل للتسوق', en: 'Shoppable Lookbook' },
    defaultSlug: 'editorial-lookbook',
    defaultTitles: {
      ar: 'إطلالة قابلة للتسوق',
      en: 'Shoppable Lookbook',
    },
    componentPreset: 'lookbook',
    componentPathPrefix: 'home',
    intent: 'تحويل الصور أو المجموعات إلى تجربة استكشاف مرتبطة بالمنتجات.',
    docsSources: [
      {
        title: 'Twilight.json',
        url: 'https://docs.salla.dev/421921m0',
        section: 'Theme components',
      },
      {
        title: 'Home Page',
        url: 'https://docs.salla.dev/422558m0',
        section: 'Theme Components / Home Page',
      },
      {
        title: 'Product Card',
        url: 'https://docs.salla.dev/422718m0',
        section: 'Custom Salla Product Card Component',
      },
      {
        title: 'Components Customization',
        url: 'https://docs.salla.dev/422690m0',
        section: 'CSS classes / SCSS / Tailwind customization',
      },
    ],
    gate: {
      requiredFields: [
        { id: 'image', type: 'string' },
        { id: 'products', type: 'items', source: 'products' },
      ],
      twigMarkers: [
        'data-lookbook-experience',
        'data-lookbook-product',
        'component.image',
        'salla-add-product-button',
        'product.price|money',
        'product.url',
        'product.image',
      ],
      jsMarkers: [
        'data-lookbook-product',
        'aria-current',
        'addEventListener',
      ],
      cssMarkers: [
        '.s-block--lookbook',
        '.lookbook',
        'prefers-reduced-motion',
      ],
      maxAddedSourceBytes: 48 * 1024,
    },
  },
  'fragrance-discovery': {
    id: 'fragrance-discovery',
    status: 'implemented',
    title: { ar: 'اكتشاف العطر المناسب', en: 'Fragrance Discovery' },
    defaultSlug: 'fragrance-discovery',
    defaultTitles: {
      ar: 'اكتشف عطرك',
      en: 'Find Your Scent',
    },
    componentPreset: 'fragrance-discovery',
    componentPathPrefix: 'home',
    intent: 'تجربة بيع عطرية تجمع مستشار اختيار الرائحة، هرم النوتات، اقتراحات الإهداء والتجربة، وجدول مقارنة سريع بدون طلبات شبكة خارجية.',
    docsSources: [
      {
        title: 'Twilight.json',
        url: 'https://docs.salla.dev/421921m0',
        section: 'Theme components',
      },
      {
        title: 'Home Page',
        url: 'https://docs.salla.dev/422558m0',
        section: 'Theme Components / Home Page',
      },
      {
        title: 'Product Card',
        url: 'https://docs.salla.dev/422718m0',
        section: 'Custom Salla Product Card Component / product listing contract',
      },
      {
        title: 'Components Customization',
        url: 'https://docs.salla.dev/422690m0',
        section: 'CSS classes / SCSS / Tailwind customization',
      },
    ],
    gate: {
      requiredFields: [
        { id: 'products', type: 'items', source: 'products' },
        { id: 'guide_items', type: 'collection' },
      ],
      twigMarkers: [
        'data-fragrance-discovery',
        'data-fragrance-finder',
        'data-fragrance-filter',
        'data-fragrance-product',
        'data-fragrance-note-pyramid',
        'data-fragrance-gift-selector',
        'data-fragrance-comparison',
        'salla-add-product-button',
        'product.fragrance_notes',
        'product.scent_family',
        'product.audience',
        'product.volume',
        'product.url',
        'product.price|money',
      ],
      jsMarkers: [
        'data-fragrance-discovery',
        'data-fragrance-filter',
        'aria-pressed',
        'hidden',
        'Escape',
        'addEventListener',
      ],
      cssMarkers: [
        '.s-block--fragrance-discovery',
        '.fragrance-discovery',
        '.fragrance-note-pyramid',
        'prefers-reduced-motion',
      ],
      maxAddedSourceBytes: 72 * 1024,
    },
  },
  'zen-products-grid': {
    id: 'zen-products-grid',
    status: 'implemented',
    title: { ar: 'شبكة منتجات تحريرية', en: 'Editorial Products Grid' },
    defaultSlug: 'zen-products',
    defaultTitles: {
      ar: 'منتجات مختارة',
      en: 'Selected Products',
    },
    componentPreset: 'products-grid',
    componentPathPrefix: 'home',
    intent: 'عرض منتجات مختارة في شبكة بصرية خفيفة مع إبقاء الصورة والسعر والرابط وزر الإضافة للسلة ضمن عقد سلة.',
    docsSources: [
      {
        title: 'Twilight.json',
        url: 'https://docs.salla.dev/421921m0',
        section: 'Theme components',
      },
      {
        title: 'Home Page',
        url: 'https://docs.salla.dev/422558m0',
        section: 'Theme Components / Home Page',
      },
      {
        title: 'Product Card',
        url: 'https://docs.salla.dev/422718m0',
        section: 'Product data and add-to-cart contract',
      },
      {
        title: 'Components Customization',
        url: 'https://docs.salla.dev/422690m0',
        section: 'SCSS and Tailwind customization',
      },
    ],
    gate: {
      requiredFields: [
        { id: 'products', type: 'items', source: 'products' },
        { id: 'show_hover_actions', type: 'boolean' },
      ],
      twigMarkers: [
        'data-products-grid-experience',
        'data-products-grid-card',
        'salla-add-product-button',
        'product.price|money',
        'product.url',
        'product.image',
      ],
      jsMarkers: [
        'data-products-grid-card',
        'aria-current',
        'addEventListener',
      ],
      cssMarkers: [
        '.s-block--products-grid',
        '.products-grid-card',
        'prefers-reduced-motion',
      ],
      maxAddedSourceBytes: 48 * 1024,
    },
  },
  'bundle-highlight': {
    id: 'bundle-highlight',
    status: 'planned',
    title: { ar: 'إبراز باقات المنتجات', en: 'Bundle Highlight' },
    intent: 'عرض أكثر من منتج كسيناريو شراء واحد بدون إنشاء منطق خصومات خارج المنصة.',
  },
  'story-slider': {
    id: 'story-slider',
    status: 'planned',
    title: { ar: 'سلايدر قصصي', en: 'Story Slider' },
    intent: 'تقديم أقسام أو منتجات كسرد سريع يشبه القصص مع روابط شراء واضحة.',
  },
  'urgency-strip': {
    id: 'urgency-strip',
    status: 'planned',
    title: { ar: 'شريط تحفيز الشراء', en: 'Urgency Strip' },
    intent: 'عرض رسائل تحفيزية أو عد تنازلي مصدره بيانات موثوقة دون ضغط مضلل.',
  },
  'category-showcase': {
    id: 'category-showcase',
    status: 'planned',
    title: { ar: 'عرض تصنيفات متقدم', en: 'Category Showcase' },
    intent: 'إظهار التصنيفات كبوابات تسوق غنية بصرياً ومرتبطة بروابط سلة.',
  },
};

function normalizeExperienceId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function getExperience(id) {
  return EXPERIENCES[normalizeExperienceId(id)] || null;
}

function listExperiences() {
  return Object.values(EXPERIENCES);
}

function isImplemented(experience) {
  return experience?.status === 'implemented' && Boolean(experience.componentPreset);
}

function defaultSlugFor(experience, value) {
  return slugify(value || experience?.defaultSlug || experience?.id);
}

function componentPathFor(experience, slug) {
  return `${experience.componentPathPrefix || 'home'}.${slug}`;
}

function pathsForExperience(themePath, experience, slug) {
  const componentPath = componentPathFor(experience, slug);
  return {
    twilight: path.join(themePath, 'twilight.json'),
    componentTwig: path.join(themePath, 'src', 'views', 'components', `${componentPath.replace(/\./g, path.sep)}.twig`),
    experienceJs: path.join(themePath, 'src', 'assets', 'js', 'components', `${slug}.js`),
    experienceScss: path.join(themePath, 'src', 'assets', 'styles', '04-components', `${slug}.scss`),
    homeJs: path.join(themePath, 'src', 'assets', 'js', 'home.js'),
    appScss: path.join(themePath, 'src', 'assets', 'styles', 'app.scss'),
  };
}

module.exports = {
  componentPathFor,
  defaultSlugFor,
  getExperience,
  isImplemented,
  listExperiences,
  normalizeExperienceId,
  pathsForExperience,
  slugify,
};
