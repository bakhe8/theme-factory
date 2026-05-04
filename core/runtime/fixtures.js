const IMAGE = {
  fashionHero: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=1600',
  lookbook: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=1400',
  dress: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=700',
  bag: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=700',
  shirt: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=700',
  glasses: 'https://images.unsplash.com/photo-1511499767390-a73953f44222?auto=format&fit=crop&q=80&w=700',
  perfume: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=700',
  watch: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=700',
  shoes: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=700',
  abaya: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=700',
  wideBanner: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1400',
  squareBanner: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=900',
  emptyPlaceholder: 'https://demo.salla.sa/assets/images/placeholder.png',
};

function product(overrides = {}) {
  const base = {
    id: 1000,
    name: 'منتج تجريبي',
    subtitle: 'وصف مختصر للمنتج',
    url: 'product.html',
    price: 100,
    sale_price: 100,
    regular_price: 100,
    product_price: 100,
    starting_price: null,
    is_on_sale: false,
    status: 'sale',
    type: 'product',
    quantity: 20,
    sold_quantity: 8,
    promotion_title: null,
    add_to_cart_label: null,
    thumbnail: IMAGE.emptyPlaceholder,
    image: {
      url: IMAGE.emptyPlaceholder,
      alt: 'منتج تجريبي',
    },
    rating: {
      stars: 4,
      count: 12,
    },
    tags: [],
    categories: [],
  };

  return {
    ...base,
    ...overrides,
    image: {
      ...base.image,
      ...(overrides.image || {}),
    },
    rating: {
      ...base.rating,
      ...(overrides.rating || {}),
    },
  };
}

const fashionProducts = [
  product({
    id: 101,
    name: 'فستان سهرة حريري طويل',
    subtitle: 'تصميم ناعم للمناسبات',
    price: 850,
    sale_price: 850,
    regular_price: 1100,
    product_price: 1100,
    is_on_sale: true,
    quantity: 18,
    promotion_title: 'خصم محدود',
    image: { url: IMAGE.dress, alt: 'فستان سهرة حريري طويل' },
    thumbnail: IMAGE.dress,
    rating: { stars: 5, count: 42 },
    tags: ['new', 'evening'],
  }),
  product({
    id: 102,
    name: 'حقيبة يد جلدية كلاسيكية',
    subtitle: 'جلد طبيعي بتفاصيل هادئة',
    price: 400,
    regular_price: 400,
    sale_price: 400,
    product_price: 400,
    quantity: 32,
    image: { url: IMAGE.bag, alt: 'حقيبة يد جلدية كلاسيكية' },
    thumbnail: IMAGE.bag,
    rating: { stars: 4, count: 19 },
  }),
  product({
    id: 103,
    name: 'قميص كتان صيفي أبيض باسم طويل لاختبار التفاف النص داخل البطاقات',
    subtitle: 'مريح وخفيف للاستخدام اليومي',
    price: 220,
    regular_price: 220,
    sale_price: 220,
    product_price: 220,
    quantity: 64,
    image: { url: IMAGE.shirt, alt: 'قميص كتان صيفي' },
    thumbnail: IMAGE.shirt,
    rating: { stars: 5, count: 31 },
  }),
  product({
    id: 104,
    name: 'نظارة شمسية بإطار ذهبي',
    subtitle: 'لمسة فاخرة لطلعات النهار',
    price: 350,
    sale_price: 350,
    regular_price: 480,
    product_price: 480,
    is_on_sale: true,
    quantity: 11,
    image: { url: IMAGE.glasses, alt: 'نظارة شمسية بإطار ذهبي' },
    thumbnail: IMAGE.glasses,
    rating: { stars: 5, count: 17 },
  }),
  product({
    id: 105,
    name: 'عطر شرقي مركز',
    subtitle: 'نفحات عنبر ومسك',
    price: 290,
    regular_price: 290,
    sale_price: 290,
    product_price: 290,
    type: 'product',
    quantity: 0,
    status: 'out',
    image: { url: IMAGE.perfume, alt: 'عطر شرقي مركز' },
    thumbnail: IMAGE.perfume,
    rating: { stars: 3, count: 8 },
  }),
  product({
    id: 106,
    name: 'ساعة معدنية كلاسيكية',
    subtitle: 'طلب مسبق يصل خلال 10 أيام',
    price: 620,
    regular_price: 620,
    sale_price: 620,
    product_price: 620,
    quantity: 0,
    status: 'sale',
    has_preorder_campaign: true,
    preorder: { label: 'طلب مسبق' },
    image: { url: IMAGE.watch, alt: 'ساعة معدنية كلاسيكية' },
    thumbnail: IMAGE.watch,
    rating: { stars: 4, count: 23 },
  }),
  product({
    id: 107,
    name: 'حجز جلسة تنسيق إطلالة',
    subtitle: 'خدمة حجز شخصية',
    price: 180,
    regular_price: 180,
    sale_price: 180,
    product_price: 180,
    type: 'booking',
    quantity: 10,
    image: { url: IMAGE.lookbook, alt: 'جلسة تنسيق إطلالة' },
    thumbnail: IMAGE.lookbook,
    rating: { stars: 5, count: 15 },
  }),
  product({
    id: 108,
    name: 'بطاقة هدية رقمية',
    subtitle: 'تصل فوراً عبر البريد',
    price: 250,
    regular_price: 250,
    sale_price: 250,
    product_price: 250,
    type: 'digital',
    quantity: 999,
    image: { url: IMAGE.squareBanner, alt: 'بطاقة هدية رقمية' },
    thumbnail: IMAGE.squareBanner,
    rating: { stars: 4, count: 11 },
  }),
  product({
    id: 109,
    name: 'تبرع لكسوة الشتاء',
    subtitle: 'مساهمة اجتماعية من المتجر',
    price: 50,
    regular_price: 50,
    sale_price: 50,
    product_price: 50,
    type: 'donating',
    quantity: 1000,
    donation: {
      can_donate: true,
      target_amount: 10000,
      collected_amount: 6200,
      custom_amount_enabled: true,
    },
    image: { url: IMAGE.abaya, alt: 'تبرع لكسوة الشتاء' },
    thumbnail: IMAGE.abaya,
    rating: { stars: 5, count: 64 },
  }),
  product({
    id: 110,
    name: 'مجموعة إكسسوارات سفر',
    subtitle: 'منتج bundle متعدد القطع',
    price: 310,
    sale_price: 310,
    regular_price: 390,
    product_price: 390,
    is_on_sale: true,
    type: 'bundle',
    quantity: 7,
    image: { url: IMAGE.shoes, alt: 'مجموعة إكسسوارات سفر' },
    thumbnail: IMAGE.shoes,
    rating: { stars: 4, count: 9 },
  }),
];

const richReviews = [
  {
    id: 1,
    product_id: 101,
    name: 'نورة القحطاني',
    user: 'نورة القحطاني',
    avatar: 'https://i.pravatar.cc/150?u=noura',
    stars: 5,
    rating: 5,
    text: 'الجودة فاقت توقعاتي، الفستان رائع والتوصيل كان سريعاً.',
    content: 'الجودة فاقت توقعاتي، الفستان رائع والتوصيل كان سريعاً.',
    created_at: '2026-04-21',
  },
  {
    id: 2,
    product_id: 102,
    name: 'أحمد الشهري',
    user: 'أحمد الشهري',
    avatar: 'https://i.pravatar.cc/150?u=ahmad',
    stars: 4,
    rating: 4,
    text: 'تغليف راق وتجربة شراء سهلة. تمنيت صوراً أكثر للمنتج.',
    content: 'تغليف راق وتجربة شراء سهلة. تمنيت صوراً أكثر للمنتج.',
    created_at: '2026-04-18',
  },
  {
    id: 3,
    product_id: 104,
    name: 'سارة محمد',
    user: 'سارة محمد',
    avatar: 'https://i.pravatar.cc/150?u=sara',
    stars: 5,
    rating: 5,
    text: 'النظارة أجمل من الصور وخفيفة جداً.',
    content: 'النظارة أجمل من الصور وخفيفة جداً.',
    created_at: '2026-04-11',
  },
  {
    id: 4,
    product_id: 105,
    name: 'ريم',
    user: 'ريم',
    avatar: '',
    stars: 2,
    rating: 2,
    text: 'الرائحة جميلة لكن الكمية نفدت سريعاً من المتجر.',
    content: 'الرائحة جميلة لكن الكمية نفدت سريعاً من المتجر.',
    created_at: '2026-03-29',
  },
];

const users = {
  guest: {
    id: null,
    type: 'guest',
    name: 'زائر',
    can_access_wallet: false,
    wishlist: [],
  },
  registered: {
    id: 501,
    type: 'user',
    name: 'ليان عبدالله',
    email: 'layan@example.test',
    mobile: '+966500000111',
    avatar: 'https://i.pravatar.cc/150?u=layan',
    can_access_wallet: true,
    wallet: { balance: 145.5 },
    wishlist: [101, 104, 108],
  },
  vip: {
    id: 777,
    type: 'user',
    name: 'عميل VIP باسم طويل لاختبار القوائم',
    email: 'vip@example.test',
    mobile: '+966500000777',
    avatar: 'https://i.pravatar.cc/150?u=vip',
    can_access_wallet: true,
    wallet: { balance: 2200 },
    wishlist: [101, 102, 103, 104, 105],
  },
};

function cartFromProducts(items, overrides = {}) {
  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  return {
    items_count: items.length,
    count: items.length,
    total,
    sub_total: total,
    tax_amount: Number((total * 0.15).toFixed(2)),
    total_discount: 0,
    real_shipping_cost: total > 300 ? 0 : 25,
    coupon: null,
    items,
    ...overrides,
  };
}

const baseStore = {
  id: 1,
  name: 'Couture Fashion',
  username: 'couture',
  description: 'وجهة تجريبية للأناقة العصرية داخل Runtime المصنع المحلي.',
  slogan: 'أناقة يومية بهدوء',
  logo: IMAGE.emptyPlaceholder,
  url: 'index.html',
  api: '#',
  icon: '',
  contacts: {
    mobile: '+966500000000',
    phone: '+966500000000',
    email: 'hello@example.test',
    whatsapp: '+966500000000',
  },
  social: {
    instagram: 'couture_sa',
    twitter: 'couture_sa',
    snapchat: 'couture_sa',
  },
  settings: {
    is_multilingual: true,
    currencies_enabled: true,
    arabic_numbers_enabled: true,
    rating_enabled: true,
    auth: {
      email_allowed: true,
      mobile_allowed: true,
      is_email_required: false,
    },
    cart: {
      apply_coupon_enabled: true,
    },
    product: {
      total_sold_enabled: true,
      fit_type: 'cover',
      show_price_as_dash: false,
    },
    category: {
      testimonial_enabled: true,
    },
    tax: {
      number: '310123456700003',
      certificate: IMAGE.emptyPlaceholder,
      taxable_prices_enabled: true,
    },
  },
};

const commonHome = {
  slides: [
    {
      image: IMAGE.fashionHero,
      title: 'تجربة معاينة محلية قريبة من سلة',
      description: 'بيانات ومتجر ومكونات تعمل داخل المصنع قبل الرفع.',
      without_overlay: false,
    },
    {
      image: IMAGE.wideBanner,
      title: 'مجموعة موسمية مختارة',
      description: 'اختبر السلايدر مع أكثر من شريحة وصورة عريضة.',
      without_overlay: false,
    },
  ],
  banners: [
    {
      image: IMAGE.wideBanner,
      url: 'product.html',
      title: 'إطلالة نهاية الأسبوع',
      description: 'صورة عريضة لاختبار تكوين البنرات.',
    },
    {
      image: IMAGE.squareBanner,
      url: 'product.html',
      title: 'تفاصيل صغيرة',
      description: 'صورة مربعة لاختبار القص.',
    },
    {
      image: IMAGE.lookbook,
      url: 'product.html',
      title: 'لوك بوك',
      description: 'اربط القصة بالمنتجات.',
    },
  ],
  links: [
    { icon: 'sicon-packed-box', title: 'وصل حديثاً', url: 'product.html' },
    { icon: 'sicon-offer', title: 'العروض', url: 'product.html' },
    { icon: 'sicon-star2', title: 'الأعلى تقييماً', url: 'product.html' },
    { icon: 'sicon-gift', title: 'الهدايا', url: 'product.html' },
  ],
  features: [
    { icon: 'sicon-shipping-fast', title: 'شحن سريع', text: 'خيارات شحن داخل المملكة' },
    { icon: 'sicon-shield-check', title: 'دفع آمن', text: 'تجربة دفع محمية' },
    { icon: 'sicon-return-box', title: 'استبدال مرن', text: 'سياسة واضحة للمرتجعات' },
  ],
};

const fixtures = {
  'fashion-rich': {
    id: 'fashion-rich',
    title: 'Fashion Rich Dataset',
    purpose: 'بيانات غنية لاختبار واجهات البيع الأساسية والمتقدمة.',
    store: baseStore,
    user: users.registered,
    users: Object.values(users),
    products: fashionProducts,
    cart: cartFromProducts(fashionProducts.slice(0, 3), {
      coupon: { code: 'STYLE15', discount: 120 },
      total_discount: 120,
    }),
    reviews: richReviews,
    testimonials: richReviews.map((review) => ({
      name: review.name,
      text: review.text,
      avatar: review.avatar || IMAGE.emptyPlaceholder,
      stars: review.stars,
    })),
    categories: [
      { id: 1, name: 'فساتين', url: 'product.html', icon: 'sicon-dress', image: IMAGE.dress },
      { id: 2, name: 'حقائب', url: 'product.html', icon: 'sicon-shopping-bag', image: IMAGE.bag },
      { id: 3, name: 'عطور', url: 'product.html', icon: 'sicon-star2', image: IMAGE.perfume },
      { id: 4, name: 'هدايا رقمية', url: 'product.html', icon: 'sicon-gift', image: IMAGE.squareBanner },
    ],
    brands: [
      { id: 1, name: 'Maison Noor', url: 'brands/noor.html', logo: IMAGE.emptyPlaceholder },
      { id: 2, name: 'Layan Studio', url: 'brands/layan.html', logo: IMAGE.emptyPlaceholder },
      { id: 3, name: 'Satin House', url: 'brands/satin.html', logo: IMAGE.emptyPlaceholder },
      { id: 4, name: 'Amber Co.', url: 'brands/amber.html', logo: IMAGE.emptyPlaceholder },
      { id: 5, name: 'Urban Abaya', url: 'brands/abaya.html', logo: IMAGE.emptyPlaceholder },
    ],
    orders: [
      { id: 9001, status: 'delivered', total: 1250, items: fashionProducts.slice(0, 2) },
      { id: 9002, status: 'processing', total: 620, items: fashionProducts.slice(5, 6) },
    ],
    blog: [
      { id: 1, title: 'كيف تختارين إطلالة موسم الرياض', url: 'blog/style-guide.html', image: IMAGE.lookbook },
      { id: 2, title: 'دليل العناية بالجلد الطبيعي', url: 'blog/leather-care.html', image: IMAGE.bag },
    ],
    home: commonHome,
    expectations: {
      minProducts: 8,
      minReviews: 3,
      requiredProductTypes: ['product', 'booking', 'digital', 'donating', 'bundle'],
      requiresSaleProduct: true,
      requiresOutOfStockProduct: true,
      requiresPreorderProduct: true,
      requiresRegisteredUser: true,
    },
  },
  'edge-cases': {
    id: 'edge-cases',
    title: 'Edge Cases Dataset',
    purpose: 'بيانات قاسية تكشف مشاكل النصوص الطويلة والصور الناقصة والحالات غير المثالية.',
    store: {
      ...baseStore,
      name: 'متجر اختبار الحالات الصعبة باسم طويل جداً لمعرفة هل ينهار الهيدر أم لا',
      slogan: 'اختبار النصوص الطويلة والبيانات الناقصة',
    },
    user: users.vip,
    users: Object.values(users),
    products: [
      product({
        id: 201,
        name: 'منتج باسم طويل جداً جداً جداً جداً لاختبار التفاف النص داخل كروت المنتجات والقوائم والسلايدرات',
        subtitle: 'وصف طويل نسبياً لاختبار مساحة النص في البطاقات عند تعدد الأسطر',
        price: 123456.75,
        regular_price: 150000,
        sale_price: 123456.75,
        product_price: 150000,
        is_on_sale: true,
        quantity: 1,
        image: { url: IMAGE.wideBanner, alt: 'صورة عريضة' },
        thumbnail: IMAGE.wideBanner,
      }),
      product({
        id: 202,
        name: 'منتج بدون صورة فعلية',
        subtitle: '',
        price: 0,
        regular_price: 0,
        sale_price: 0,
        product_price: 0,
        quantity: 0,
        status: 'out',
        image: { url: '', alt: '' },
        thumbnail: '',
        rating: { stars: 0, count: 0 },
      }),
      product({
        id: 203,
        name: 'حجز بكمية محدودة',
        type: 'booking',
        price: 75,
        regular_price: 75,
        sale_price: 75,
        product_price: 75,
        quantity: 2,
        image: { url: IMAGE.lookbook, alt: 'حجز بكمية محدودة' },
        thumbnail: IMAGE.lookbook,
      }),
      product({
        id: 204,
        name: 'منتج تبرع بمبلغ مفتوح',
        type: 'donating',
        price: 25,
        regular_price: 25,
        sale_price: 25,
        product_price: 25,
        donation: {
          can_donate: true,
          target_amount: 5000,
          collected_amount: 4100,
          custom_amount_enabled: true,
        },
        image: { url: IMAGE.abaya, alt: 'تبرع' },
        thumbnail: IMAGE.abaya,
      }),
    ],
    cart: cartFromProducts([], {
      coupon: { code: 'BROKEN-LONG-CODE-2026', discount: 0 },
    }),
    reviews: [
      {
        id: 10,
        product_id: 201,
        name: 'مراجع باسم طويل جداً جداً',
        avatar: '',
        stars: 1,
        rating: 1,
        text: 'نص مراجعة طويل لاختبار حدود المساحة داخل السلايدر أو قائمة المراجعات. يجب ألا يكسر التصميم أو يتداخل مع الأزرار.',
        content: 'نص مراجعة طويل لاختبار حدود المساحة داخل السلايدر أو قائمة المراجعات. يجب ألا يكسر التصميم أو يتداخل مع الأزرار.',
      },
    ],
    testimonials: [
      {
        name: 'عميل بلا صورة',
        avatar: '',
        stars: 1,
        text: 'اختبار ظهور الصورة البديلة والنص الطويل داخل الشهادات.',
      },
    ],
    categories: [
      { id: 9, name: 'تصنيف طويل جداً جداً جداً', url: '#', icon: 'sicon-store2', image: '' },
    ],
    brands: [],
    orders: [],
    blog: [],
    home: {
      ...commonHome,
      slides: [
        {
          image: IMAGE.wideBanner,
          title: 'عنوان طويل جداً لاختبار السلايدر الرئيسي عندما تكون الجملة أطول من المعتاد داخل شاشة الجوال',
          description: 'وصف طويل أيضاً يضغط السلايدر ويكشف مشاكل line clamp والارتفاعات.',
          without_overlay: false,
        },
      ],
      banners: [],
    },
    expectations: {
      minProducts: 4,
      minReviews: 1,
      requiredProductTypes: ['product', 'booking', 'donating'],
      requiresSaleProduct: true,
      requiresOutOfStockProduct: true,
      allowsMissingImages: true,
      requiresRegisteredUser: true,
    },
  },
  'empty-store': {
    id: 'empty-store',
    title: 'Empty Store Dataset',
    purpose: 'اختبار الحالات الفارغة: لا منتجات، لا مراجعات، وسلة فارغة.',
    store: {
      ...baseStore,
      name: 'متجر جديد بدون منتجات',
      slogan: 'قريباً',
    },
    user: users.guest,
    users: [users.guest],
    products: [],
    cart: cartFromProducts([]),
    reviews: [],
    testimonials: [],
    categories: [],
    brands: [],
    orders: [],
    blog: [],
    home: {
      slides: [
        {
          image: IMAGE.fashionHero,
          title: 'متجر جديد',
          description: 'اختبار ظهور حالات عدم وجود منتجات.',
          without_overlay: false,
        },
      ],
      banners: [],
      links: [],
      features: commonHome.features,
    },
    expectations: {
      minProducts: 0,
      minReviews: 0,
      allowsEmptyStore: true,
    },
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getFixture(id = 'fashion-rich') {
  const fixture = fixtures[id] || fixtures['fashion-rich'];
  return clone(fixture);
}

function hasFixture(id) {
  return Boolean(fixtures[id]);
}

function listFixtures() {
  return Object.values(fixtures).map((fixture) => ({
    id: fixture.id,
    title: fixture.title,
    purpose: fixture.purpose,
    products: fixture.products.length,
    reviews: fixture.reviews.length,
    users: fixture.users.length,
  }));
}

function hasProductType(products, type) {
  return products.some((item) => item.type === type);
}

function validateFixture(fixture) {
  const issues = [];
  const warnings = [];
  const expectations = fixture.expectations || {};
  const products = fixture.products || [];
  const reviews = fixture.reviews || [];

  if (!fixture.id) issues.push('fixture.id مفقود');
  if (!fixture.store?.name) issues.push(`${fixture.id}: store.name مفقود`);
  if (!fixture.user?.type) issues.push(`${fixture.id}: user.type مفقود`);
  if (!Array.isArray(products)) issues.push(`${fixture.id}: products يجب أن تكون مصفوفة`);
  if (!Array.isArray(reviews)) issues.push(`${fixture.id}: reviews يجب أن تكون مصفوفة`);

  if (products.length < Number(expectations.minProducts || 0)) {
    issues.push(`${fixture.id}: عدد المنتجات أقل من المطلوب (${products.length}/${expectations.minProducts})`);
  }

  if (reviews.length < Number(expectations.minReviews || 0)) {
    issues.push(`${fixture.id}: عدد المراجعات أقل من المطلوب (${reviews.length}/${expectations.minReviews})`);
  }

  for (const type of expectations.requiredProductTypes || []) {
    if (!hasProductType(products, type)) issues.push(`${fixture.id}: لا يوجد منتج من نوع ${type}`);
  }

  if (expectations.requiresSaleProduct && !products.some((item) => item.is_on_sale)) {
    issues.push(`${fixture.id}: لا يوجد منتج مخفض`);
  }

  if (expectations.requiresOutOfStockProduct && !products.some((item) => item.status === 'out' || item.quantity === 0)) {
    issues.push(`${fixture.id}: لا يوجد منتج نافد`);
  }

  if (expectations.requiresPreorderProduct && !products.some((item) => item.has_preorder_campaign || item.preorder)) {
    issues.push(`${fixture.id}: لا يوجد منتج طلب مسبق`);
  }

  if (expectations.requiresRegisteredUser && fixture.user?.type === 'guest') {
    issues.push(`${fixture.id}: المستخدم يجب أن يكون مسجلاً`);
  }

  products.forEach((item, index) => {
    const label = `${fixture.id}: products[${index}]`;
    if (!item.id) issues.push(`${label}: id مفقود`);
    if (!item.name) issues.push(`${label}: name مفقود`);
    if (!Object.prototype.hasOwnProperty.call(item, 'price')) issues.push(`${label}: price مفقود`);
    if (!item.url) warnings.push(`${label}: url مفقود`);
    if (!item.image?.url && !expectations.allowsMissingImages) warnings.push(`${label}: image.url مفقود`);
    if (!item.status) issues.push(`${label}: status مفقود`);
    if (!item.type) issues.push(`${label}: type مفقود`);
  });

  return { issues, warnings };
}

module.exports = {
  getFixture,
  hasFixture,
  listFixtures,
  validateFixture,
};
