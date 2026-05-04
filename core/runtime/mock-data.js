const fs = require('fs');
const path = require('path');
const { getFixture, listFixtures } = require('./fixtures');

function readTwilight(themePath) {
  const file = path.join(themePath, 'twilight.json');
  if (!fs.existsSync(file)) return {};

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return {};
  }
}

function collectSettings(twilight) {
  const settings = {};
  for (const item of twilight.settings || []) {
    if (!item.id || item.type === 'static') continue;
    if (Object.prototype.hasOwnProperty.call(item, 'selected')) {
      settings[item.id] = item.selected;
    } else if (Object.prototype.hasOwnProperty.call(item, 'value')) {
      settings[item.id] = item.value;
    } else {
      settings[item.id] = null;
    }
  }

  return {
    primary_color: '#111111',
    accent_color: '#E6BEAE',
    bg_color: '#ffffff',
    header_is_sticky: true,
    footer_is_dark: false,
    topnav_is_dark: false,
    enable_more_menu: true,
    enable_add_product_toast: true,
    placeholder: 'images/placeholder.png',
    ...settings,
  };
}

function normalizeMoney(value) {
  const number = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(number)) return String(value || '');
  return `${new Intl.NumberFormat('ar-SA').format(number)} ر.س`;
}

function mixColor(hex, target, alpha) {
  const clean = String(hex || '#111111').replace('#', '');
  if (clean.length !== 6) return hex || '#111111';

  const source = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
  const result = source.map((value, index) => {
    const next = Math.round(value + (target[index] - value) * alpha);
    return next.toString(16).padStart(2, '0');
  });

  return `#${result.join('')}`;
}

const baseTranslations = {
  'common.search': 'بحث',
  'common.close': 'إغلاق',
  'common.show_more': 'عرض المزيد',
  'common.no_products': 'لا توجد منتجات',
  'common.no_reviews': 'لا توجد مراجعات بعد',
  'common.elements.tax_number': 'الرقم الضريبي',
  'blocks.home.display_all': 'عرض الكل',
  'blocks.home.latest_products': 'أحدث المنتجات',
  'blocks.home.testimonials': 'آراء العملاء',
  'blocks.footer.pages_links': 'روابط مهمة',
  'pages.products.add_to_cart': 'أضف للسلة',
  'pages.cart.add_to_cart': 'أضف للسلة',
  'pages.products.out_of_stock': 'نفدت الكمية',
  'pages.products.pre_order_now': 'اطلب مسبقا',
  'pages.cart.book_now': 'احجز الآن',
  'pages.products.donation_exceed': 'اكتمل التبرع',
  'pages.cart.has_free_shipping': 'تم تفعيل الشحن المجاني',
  'pages.cart.free_shipping_alert': 'باقي {amount} للشحن المجاني',
};

const products = [
  {
    id: 101,
    name: 'فستان سهرة حريري طويل',
    subtitle: 'تصميم ناعم للمناسبات',
    url: 'product.html',
    price: 850,
    sale_price: 850,
    regular_price: 1100,
    product_price: 1100,
    starting_price: null,
    is_on_sale: true,
    status: 'sale',
    type: 'product',
    quantity: 18,
    image: {
      url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=600',
      alt: 'فستان سهرة حريري طويل',
    },
    rating: { stars: 5 },
  },
  {
    id: 102,
    name: 'حقيبة يد جلدية كلاسيكية',
    subtitle: 'جلد طبيعي بتفاصيل هادئة',
    url: 'product.html',
    price: 400,
    regular_price: 400,
    sale_price: 400,
    product_price: 400,
    is_on_sale: false,
    status: 'sale',
    type: 'product',
    quantity: 32,
    image: {
      url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600',
      alt: 'حقيبة يد جلدية كلاسيكية',
    },
    rating: { stars: 4 },
  },
  {
    id: 103,
    name: 'قميص كتان صيفي',
    subtitle: 'مريح وخفيف للاستخدام اليومي',
    url: 'product.html',
    price: 220,
    regular_price: 220,
    sale_price: 220,
    product_price: 220,
    is_on_sale: false,
    status: 'sale',
    type: 'product',
    quantity: 64,
    image: {
      url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600',
      alt: 'قميص كتان صيفي',
    },
    rating: { stars: 5 },
  },
  {
    id: 104,
    name: 'نظارة شمسية بإطار ذهبي',
    subtitle: 'لمسة فاخرة لطلعات النهار',
    url: 'product.html',
    price: 350,
    sale_price: 350,
    regular_price: 480,
    product_price: 480,
    is_on_sale: true,
    status: 'sale',
    type: 'product',
    quantity: 11,
    image: {
      url: 'https://images.unsplash.com/photo-1511499767390-a73953f44222?auto=format&fit=crop&q=80&w=600',
      alt: 'نظارة شمسية بإطار ذهبي',
    },
    rating: { stars: 5 },
  },
];

function hasComponent(themePath, name) {
  return fs.existsSync(path.join(themePath, 'src', 'views', 'components', `${name.replace(/\./g, path.sep)}.twig`));
}

function buildHomeSections(themePath, fixture) {
  const products = fixture.products || [];
  const home = fixture.home || {};
  const testimonials = fixture.testimonials || [];
  const sections = [];
  let position = 0;

  function push(pathName, context) {
    if (!hasComponent(themePath, pathName)) return;
    sections.push({
      path: pathName,
      context: {
        position,
        ...context,
      },
    });
    position += 1;
  }

  push('home.enhanced-slider', {
    component: {
      slides: home.slides || [],
    },
  });

  push('home.main-links', {
    component: {
      title: 'تسوق حسب الاهتمام',
      links: home.links || [],
      categories: fixture.categories || [],
      show_cats: Boolean((fixture.categories || []).length),
      show_controls: true,
      merge_with_top_component: false,
    },
  });

  push('home.enhanced-square-banners', {
    component: {
      banners: home.banners || [],
    },
  });

  push('home.store-features', {
    items: home.features || [],
  });

  if (hasComponent(themePath, 'home.zen-products')) {
    push('home.zen-products', {
      title: 'منتجات مختارة',
      products,
    });
  } else {
    push('home.latest-products', {
      products,
    });
  }

  push('home.fixed-products', {
    title: 'اختيارات لا تفوت',
    display_all_url: 'product.html',
    products: {
      source: 'selected',
      source_value: products.slice(0, 6).map((item) => item.id),
    },
    limit: Math.min(products.length || 4, 6),
  });

  push('home.products-slider', {
    title: 'الأكثر مشاهدة',
    sub_title: 'منتجات مختلفة لاختبار السلايدر',
    display_all_url: 'product.html',
    products: {
      source: 'selected',
      source_value: products.slice(0, 8).map((item) => item.id),
    },
    limit: Math.min(products.length || 4, 8),
  });

  push('home.brands', {
    component: {
      title: 'علامات مختارة',
      show_all: true,
      brands: fixture.brands || [],
    },
  });

  push('home.custom-testimonials', {
    component: {
      items: testimonials,
    },
  });

  return sections.filter((section) => {
    if (section.path === 'home.enhanced-slider') return (section.context.component.slides || []).length;
    if (section.path === 'home.enhanced-square-banners') return (section.context.component.banners || []).length;
    if (section.path === 'home.store-features') return (section.context.items || []).length;
    if (section.path === 'home.brands') return (section.context.component.brands || []).length;
    if (section.path === 'home.custom-testimonials') return (section.context.component.items || []).length;
    return true;
  });
}

function createMockContext(themeName, themePath, options = {}) {
  const twilight = readTwilight(themePath);
  const settings = collectSettings(twilight);
  const fixture = getFixture(options.fixture || process.env.FACTORY_FIXTURE || 'fashion-rich');
  const fixtureProducts = Array.isArray(fixture.products) ? fixture.products : products;
  const translations = {
    ...baseTranslations,
    ...(fixture.translations || {}),
  };
  const primary = settings.primary_color || '#111111';
  const homeSections = buildHomeSections(themePath, fixture);

  const themeSettings = {
    values: settings,
    get(key, fallback = null) {
      return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : fallback;
    },
    set(key, value) {
      this.values[key] = value;
      return '';
    },
  };

  const context = {
    language: { code: 'ar', name: 'العربية' },
    page: { slug: 'index', title: 'الرئيسية' },
    user: fixture.user || { type: 'guest', can_access_wallet: false },
    users: fixture.users || [],
    store: fixture.store,
    theme: {
      id: 1,
      name: themeName,
      mode: 'preview',
      is_rtl: true,
      translations_hash: Date.now(),
      color: {
        primary,
        text: '#ffffff',
        reverse_primary: '#ffffff',
        reverse_text: '#111111',
        is_dark: true,
        darker(alpha = 0.15, hex = primary) {
          return mixColor(hex, [0, 0, 0], Number(alpha));
        },
        lighter(alpha = 0.15, hex = primary) {
          return mixColor(hex, [255, 255, 255], Number(alpha));
        },
      },
      font: {
        name: settings.font_family || 'DINNextLTArabic-Regular',
        path: 'fonts/default.css',
      },
      settings: themeSettings,
    },
    cart: fixture.cart || {
      items_count: 0,
      count: 0,
      total: 0,
      sub_total: 0,
      tax_amount: 0,
      total_discount: 0,
      real_shipping_cost: 0,
      items: [],
    },
    products: fixtureProducts,
    reviews: fixture.reviews || [],
    testimonials: fixture.testimonials || [],
    categories: fixture.categories || [],
    brands: fixture.brands || [],
    orders: fixture.orders || [],
    blog: fixture.blog || [],
    component: {},
    position: 0,
    runtime: {
      themeName,
      fixtureId: fixture.id,
      fixtures: listFixtures(),
      settings,
      translations,
      money: normalizeMoney,
      copyright: `© ${new Date().getFullYear()} ${themeName}`,
      homeSections,
    },
  };

  return context;
}

function createClientState(context) {
  return {
    store: context.store,
    cart: context.cart,
    products: context.products,
    reviews: context.reviews,
    testimonials: context.testimonials,
    categories: context.categories,
    brands: context.brands,
    orders: context.orders,
    blog: context.blog,
    theme: {
      name: context.theme.name,
      is_rtl: context.theme.is_rtl,
      color: {
        primary: context.theme.color.primary,
        text: context.theme.color.text,
      },
      settings: context.runtime.settings,
    },
    language: context.language,
    page: context.page,
    user: context.user,
    users: context.users,
    fixture: context.runtime.fixtureId,
    translations: context.runtime.translations,
  };
}

module.exports = {
  createMockContext,
  createClientState,
  normalizeMoney,
};
