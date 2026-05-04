const fs = require('fs');
const path = require('path');
const { createMockContext } = require('./runtime/mock-data');
const { hasFixture } = require('./runtime/fixtures');

const DEFAULT_FIXTURES = ['fashion-rich', 'edge-cases', 'fragrance-luxury', 'empty-store'];
const IGNORED_PAGE_VIEW_PATTERNS = [
  /^pages\/partials\//,
];

const STATIC_PAGE_SCENARIOS = [
  { id: 'home', file: 'index.html', view: 'pages/index', slug: 'index', title: 'الرئيسية', docs: 'https://docs.salla.dev/422558m0' },
  { id: 'products', file: 'products.html', view: 'pages/product/index', slug: 'products.index', title: 'كل المنتجات', docs: 'https://docs.salla.dev/422559m0', apply: applyProductsIndex },
  { id: 'product', file: 'product.html', view: 'pages/product/single', slug: 'product.single', title: 'صفحة المنتج', docs: 'https://docs.salla.dev/849311f0' },
  { id: 'search', file: 'search.html', view: 'pages/product/index', slug: 'products.search', title: 'نتائج البحث', docs: 'https://docs.salla.dev/422559m0', apply: applySearch },
  { id: 'cart', file: 'cart.html', view: 'pages/cart', slug: 'cart', title: 'السلة', docs: 'https://docs.salla.dev/422575m0' },
  { id: 'blog', file: 'blog.html', view: 'pages/blog/index', slug: 'blog.index', title: 'المدونة', docs: 'https://docs.salla.dev/422567m0', apply: applyBlogIndex },
  { id: 'blog-single', file: 'blog-single.html', view: 'pages/blog/single', slug: 'blog.single', title: 'مقال', docs: 'https://docs.salla.dev/422568m0' },
  { id: 'brands', file: 'brands/index.html', view: 'pages/brands/index', slug: 'brands.index', title: 'الماركات', docs: 'https://docs.salla.dev/422570m0', apply: applyBrandsIndex },
  { id: 'wishlist', file: 'customer/wishlist.html', view: 'pages/customer/wishlist', slug: 'customer.wishlist', title: 'المفضلة', docs: 'https://docs.salla.dev/422565m0', apply: applyWishlist },
  { id: 'notifications', file: 'customer/notifications.html', view: 'pages/customer/notifications', slug: 'customer.notifications', title: 'التنبيهات', docs: 'https://docs.salla.dev/422566m0' },
  { id: 'profile', file: 'customer/profile.html', view: 'pages/customer/profile', slug: 'customer.profile', title: 'الملف الشخصي', docs: 'https://docs.salla.dev/422562m0' },
  { id: 'wallet', file: 'customer/wallet.html', view: 'pages/customer/wallet', slug: 'customer.wallet', title: 'المحفظة', docs: 'https://github.com/SallaApp/theme-raed/blob/master/src/views/pages/customer/wallet.twig' },
  { id: 'orders', file: 'customer/orders.html', view: 'pages/customer/orders/index', slug: 'customer.orders.index', title: 'طلباتي', docs: 'https://docs.salla.dev/422563m0' },
  { id: 'order-single', file: 'customer/orders/9001.html', view: 'pages/customer/orders/single', slug: 'customer.orders.single', title: 'تفاصيل الطلب', docs: 'https://docs.salla.dev/422564m0', apply: applyPrimaryOrder },
  { id: 'loyalty', file: 'loyalty.html', view: 'pages/loyalty', slug: 'loyalty', title: 'برنامج الولاء', docs: 'https://docs.salla.dev/422576m0' },
  { id: 'landing', file: 'offers/summer.html', view: 'pages/landing-page', slug: 'landing', title: 'عرض خاص', docs: 'https://docs.salla.dev/422579m0', apply: applyLanding },
  { id: 'landing-expired', file: 'offers/expired.html', view: 'pages/landing-page', slug: 'landing.expired', title: 'عرض منتهي', docs: 'https://docs.salla.dev/422579m0', apply: applyExpiredLanding },
  { id: 'page-single', file: 'pages/about.html', view: 'pages/page-single', slug: 'page.single', title: 'من نحن', docs: 'https://github.com/SallaApp/theme-raed/blob/master/src/views/pages/page-single.twig', apply: applyContentPage },
  { id: 'terms', file: 'pages/terms.html', view: 'pages/page-single', slug: 'page.terms', title: 'الشروط والأحكام', docs: 'https://github.com/SallaApp/theme-raed/blob/master/src/views/pages/page-single.twig', apply: applyTermsPage },
  { id: 'fragrance-consultant', file: 'pages/fragrance-consultant.html', view: 'pages/page-single', slug: 'page.fragrance-consultant', title: 'استشر خبير العطور', docs: 'https://github.com/SallaApp/theme-raed/blob/master/src/views/pages/page-single.twig', apply: applyFragranceConsultantPage },
  { id: 'testimonials', file: 'testimonials.html', view: 'pages/testimonials', slug: 'testimonials', title: 'آراء العملاء', docs: 'https://docs.salla.dev/422584m0' },
  { id: 'thank-you', file: 'thank-you.html', view: 'pages/thank-you', slug: 'thank-you', title: 'شكراً لك', docs: 'https://docs.salla.dev/422577m0', apply: applyPrimaryOrder },
];

function slugify(value, fallback = 'item') {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || fallback;
}

function normalizePreviewFile(url, fallback) {
  const clean = String(url || fallback || '')
    .split('#')[0]
    .split('?')[0]
    .replace(/^\/+/, '')
    .trim();
  if (!clean) return fallback;
  if (path.extname(clean)) return clean;
  return `${clean.replace(/\/+$/, '')}/index.html`;
}

function isPreviewInternalUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('#') || url === '#/' || url === '#') return false;
  return !/^(https?:|mailto:|tel:|sms:|whatsapp:|data:|javascript:)/i.test(url);
}

function groupBrands(brands = []) {
  return brands.reduce((groups, brand) => {
    const key = String(brand.name || '#').trim().charAt(0).toUpperCase() || '#';
    groups[key] = groups[key] || [];
    groups[key].push(brand);
    return groups;
  }, {});
}

function applyProductsIndex(context) {
  context.filters = true;
  context.category = null;
  context.sort_options = sortOptions();
}

function applySearch(context) {
  context.filters = false;
  context.search_query = 'فستان';
  context.sort_options = sortOptions('topRated');
  context.products = (context.products || []).filter((product) => String(product.name || '').includes('فستان') || product.rating?.stars >= 4);
}

function applyBlogIndex(context) {
  context.categories = (context.blog_categories || context.categories || []).map((category, index) => ({
    ...category,
    is_current: index === 0,
  }));
}

function applyBrandsIndex(context) {
  context.brands = groupBrands(context.brands || []);
}

function applyWishlist(context) {
  const wishlistIds = context.user?.wishlist || [];
  context.products = wishlistIds.length
    ? (context.products || []).filter((product) => wishlistIds.includes(product.id))
    : (context.products || []).slice(0, 3);
}

function applyPrimaryOrder(context) {
  context.order = (context.orders || [])[0] || context.order;
}

function applyLanding(context) {
  context.landing = {
    ...context.landing,
    is_expired: false,
    products: (context.products || []).slice(0, 4),
  };
}

function applyExpiredLanding(context) {
  context.landing = {
    ...context.landing,
    is_expired: true,
    products: (context.products || []).slice(0, 2),
  };
}

function applyContentPage(context) {
  context.page = {
    ...context.page,
    id: 7001,
    title: 'من نحن',
    slug: 'page.single',
    content: '<p>صفحة محتوى محلية لاختبار الصفحات الثابتة داخل الثيم.</p><p>تغطي العناوين والنصوص وروابط التعليقات.</p>',
    url: 'pages/about.html',
  };
}

function applyTermsPage(context) {
  context.page = {
    ...context.page,
    id: 7002,
    title: 'الشروط والأحكام',
    slug: 'page.terms',
    content: '<p>سياسات البيع والاستبدال والشحن مكتوبة كنص تجريبي طويل نسبياً لاختبار المسافات وسطر القراءة.</p>',
    url: 'pages/terms.html',
  };
}

function applyFragranceConsultantPage(context) {
  context.page = {
    ...context.page,
    id: 7003,
    title: 'استشر خبير العطور',
    slug: 'page.fragrance-consultant',
    content: '<p>صفحة محلية لاختبار تجربة طلب استشارة عطرية: المناسبة، الجمهور، عائلة الرائحة، والميزانية.</p><p>تستخدمها بيئة العطور للتأكد من أن روابط الاستشارة والتوجيه لا تبقى بلا صفحة معاينة.</p>',
    url: 'pages/fragrance-consultant.html',
  };
}

function sortOptions(selected = 'ourSuggest') {
  return [
    { id: 'ourSuggest', name: 'اقتراحاتنا', is_selected: selected === 'ourSuggest' },
    { id: 'bestSell', name: 'الأكثر مبيعاً', is_selected: selected === 'bestSell' },
    { id: 'topRated', name: 'الأعلى تقييماً', is_selected: selected === 'topRated' },
    { id: 'priceFromLowToTop', name: 'الأقل سعراً', is_selected: selected === 'priceFromLowToTop' },
    { id: 'priceFromTopToLow', name: 'الأعلى سعراً', is_selected: selected === 'priceFromTopToLow' },
  ];
}

function dynamicPageScenarios(seedContext) {
  const scenarios = [];

  for (const product of seedContext.products || []) {
    if (!isPreviewInternalUrl(product.url)) continue;
    scenarios.push({
      id: `product-${product.id || slugify(product.name)}`,
      file: normalizePreviewFile(product.url, 'product.html'),
      view: 'pages/product/single',
      slug: 'product.single',
      title: product.name || 'منتج',
      pageId: product.id,
      apply(context) {
        const match = (context.products || []).find((item) => String(item.id) === String(product.id));
        context.product = match || product;
        context.related = (context.products || []).filter((item) => String(item.id) !== String(product.id)).slice(0, 8);
      },
    });
  }

  for (const category of seedContext.categories || []) {
    if (!isPreviewInternalUrl(category.url)) continue;
    scenarios.push({
      id: `category-${category.id || slugify(category.name)}`,
      file: normalizePreviewFile(category.url, `categories/${slugify(category.name, category.id || 'category')}.html`),
      view: 'pages/product/index',
      slug: 'cat.show',
      title: category.name || 'تصنيف',
      pageId: category.id,
      apply(context) {
        context.category = {
          image: '',
          sub_categories: [],
          ...category,
        };
        context.filters = true;
        context.sort_options = sortOptions();
        context.page.title = category.name || context.page.title;
      },
    });
  }

  for (const article of seedContext.articles || []) {
    if (!isPreviewInternalUrl(article.url)) continue;
    scenarios.push({
      id: `blog-article-${article.id || article.key}`,
      file: normalizePreviewFile(article.url, 'blog-single.html'),
      view: 'pages/blog/single',
      slug: 'blog.single',
      title: article.title || 'مقال',
      pageId: article.id,
      apply(context) {
        const match = (context.articles || []).find((item) => String(item.id) === String(article.id)) || article;
        context.article = match;
        context.related = (context.articles || []).filter((item) => item.url !== match.url).slice(0, 4);
      },
    });
  }

  const brandsByUrl = new Map();
  for (const brand of seedContext.brands || []) {
    if (brand?.url && !brandsByUrl.has(brand.url)) brandsByUrl.set(brand.url, brand);
  }
  for (const product of seedContext.products || []) {
    const brand = product.brand;
    if (brand?.url && !brandsByUrl.has(brand.url)) brandsByUrl.set(brand.url, brand);
  }
  if (seedContext.product?.brand?.url && !brandsByUrl.has(seedContext.product.brand.url)) {
    brandsByUrl.set(seedContext.product.brand.url, seedContext.product.brand);
  }

  for (const brand of brandsByUrl.values()) {
    if (!isPreviewInternalUrl(brand.url)) continue;
    scenarios.push({
      id: `brand-${brand.id || slugify(brand.name)}`,
      file: normalizePreviewFile(brand.url, 'brands/index.html'),
      view: 'pages/brands/single',
      slug: 'brands.single',
      title: brand.name || 'ماركة',
      pageId: brand.id,
      apply(context) {
        context.brand = {
          banner: '',
          description: `صفحة معاينة محلية لماركة ${brand.name || ''}`.trim(),
          ...brand,
        };
        context.products = (context.products || []).filter((product, index) => product.brand?.url === brand.url || index < 8);
      },
    });
  }

  for (const order of seedContext.orders || []) {
    if (!isPreviewInternalUrl(order.url)) continue;
    scenarios.push({
      id: `order-${order.id}`,
      file: normalizePreviewFile(order.url, `customer/orders/${order.id}.html`),
      view: 'pages/customer/orders/single',
      slug: 'customer.orders.single',
      title: `طلب #${order.reference_id || order.id}`,
      pageId: order.id,
      apply(context) {
        context.order = (context.orders || []).find((item) => String(item.id) === String(order.id)) || order;
      },
    });
  }

  return scenarios;
}

function dedupeScenarios(scenarios) {
  const seen = new Set();
  return scenarios.filter((page) => {
    const key = page.file;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pageScenarios(seedContext, options = {}) {
  const { allPages = false, requestedPage = 'home' } = options;
  if (!allPages) return STATIC_PAGE_SCENARIOS.filter((page) => page.id === requestedPage);
  return dedupeScenarios([...STATIC_PAGE_SCENARIOS, ...dynamicPageScenarios(seedContext)]);
}

function fixtureScenarios(options = {}) {
  const { allFixtures = false, fixture = 'fashion-rich', themePath = null } = options;
  if (allFixtures) {
    const { listFixtures } = require('./runtime/fixtures');
    const themeIds = themePath
      ? listFixtures(themePath).map((f) => f.id).filter((id) => !DEFAULT_FIXTURES.includes(id))
      : [];
    return [...DEFAULT_FIXTURES, ...themeIds];
  }
  return [fixture];
}

function validateRequestedFixture(fixture, allFixtures = false, themePath = null) {
  return allFixtures || hasFixture(fixture, themePath);
}

function viewPathForTemplate(themePath, file) {
  const relative = path.relative(path.join(themePath, 'src', 'views'), file).replace(/\\/g, '/');
  return relative.replace(/\.twig$/, '');
}

function collectPageViews(themePath) {
  const pagesDir = path.join(themePath, 'src', 'views', 'pages');
  const views = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) walk(fullPath);
      else if (entry.endsWith('.twig')) {
        const view = viewPathForTemplate(themePath, fullPath);
        if (!IGNORED_PAGE_VIEW_PATTERNS.some((pattern) => pattern.test(view))) views.push(view);
      }
    }
  }

  walk(pagesDir);
  return views.sort();
}

function scenarioViewsForTheme(themePath, options = {}) {
  const fixtureIds = fixtureScenarios({ allFixtures: true, themePath });
  const views = new Set();
  for (const fixtureId of fixtureIds) {
    const seedContext = createMockContext(path.basename(themePath), themePath, { fixture: fixtureId });
    for (const scenario of pageScenarios(seedContext, { allPages: true, requestedPage: options.requestedPage || 'home' })) {
      views.add(scenario.view);
    }
  }
  return [...views].sort();
}

function validateThemePageCoverage(themePath) {
  const themeViews = collectPageViews(themePath);
  const scenarioViews = scenarioViewsForTheme(themePath);
  const missingScenarios = themeViews.filter((view) => !scenarioViews.includes(view));
  const missingTemplates = scenarioViews.filter((view) => !themeViews.includes(view));

  return {
    themeViews,
    scenarioViews,
    missingScenarios,
    missingTemplates,
  };
}

function expectedPreviewFiles(themeName, themePath, options = {}) {
  const files = [];
  const fixtures = fixtureScenarios({ allFixtures: true, themePath });
  for (const fixtureId of fixtures) {
    const seedContext = createMockContext(themeName, themePath, { fixture: fixtureId });
    for (const scenario of pageScenarios(seedContext, { allPages: true })) {
      files.push(path.join(themeName, fixtureId, scenario.file).replace(/\\/g, '/'));
    }
  }
  return [...new Set(files)].sort();
}

module.exports = {
  DEFAULT_FIXTURES,
  STATIC_PAGE_SCENARIOS,
  collectPageViews,
  dynamicPageScenarios,
  expectedPreviewFiles,
  fixtureScenarios,
  groupBrands,
  isPreviewInternalUrl,
  normalizePreviewFile,
  pageScenarios,
  slugify,
  validateRequestedFixture,
  validateThemePageCoverage,
};
