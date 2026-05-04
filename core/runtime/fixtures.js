const fs = require('fs');
const path = require('path');

const IMAGE = {
  fashionHero: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=1600',
  lookbook: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=1400',
  dress: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=700',
  bag: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=700',
  shirt: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=700',
  glasses: 'https://images.unsplash.com/photo-1511499767390-a73953f44222?auto=format&fit=crop&q=80&w=700',
  perfume: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=700',
  perfumeShelf: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=1600',
  oudOil: 'https://images.unsplash.com/photo-1619994403073-2cec844b8e63?auto=format&fit=crop&q=80&w=900',
  bakhoor: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&q=80&w=900',
  incense: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=900',
  giftSet: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&q=80&w=900',
  musk: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&q=80&w=900',
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
    blog: {
      allow_likes_and_comments: true,
    },
    rating: {
      enabled: true,
      show_on_product: true,
      allow_update: true,
      update_period: 14,
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

const fragranceBrand = {
  id: 21,
  name: 'دار العود',
  url: 'brands/dar-al-oud.html',
  logo: IMAGE.emptyPlaceholder,
};

const fragranceCategories = [
  { id: 31, key: 'men', name: 'عطور رجالية', url: 'categories/perfumes-for-men.html', icon: 'sicon-user', image: IMAGE.perfume },
  { id: 32, key: 'women', name: 'عطور نسائية', url: 'categories/perfumes-for-women.html', icon: 'sicon-female', image: IMAGE.musk },
  { id: 33, key: 'unisex', name: 'له ولها', url: 'categories/unisex-fragrances.html', icon: 'sicon-users', image: IMAGE.oudOil },
  { id: 34, key: 'try-decide', name: 'جرب وقرّر', url: 'categories/try-and-decide.html', icon: 'sicon-star2', image: IMAGE.giftSet },
  { id: 35, key: 'bakhoor', name: 'بخور ومباخر', url: 'categories/bakhoor.html', icon: 'sicon-fire', image: IMAGE.bakhoor },
  { id: 36, key: 'sets', name: 'مجموعات', url: 'categories/fragrance-sets.html', icon: 'sicon-gift', image: IMAGE.giftSet },
  { id: 37, key: 'oils', name: 'زيوت عطرية', url: 'categories/perfume-oils.html', icon: 'sicon-drop', image: IMAGE.oudOil },
  { id: 38, key: 'musk', name: 'المسك', url: 'categories/musk.html', icon: 'sicon-heart', image: IMAGE.musk },
];

function fragranceProduct(overrides = {}) {
  const category = fragranceCategories.find((item) => item.key === overrides.family) || fragranceCategories[0];
  return product({
    brand: fragranceBrand,
    category,
    categories: [category],
    scent_family: overrides.scent_family || 'شرقي',
    fragrance_notes: overrides.fragrance_notes || ['عود', 'مسك', 'عنبر'],
    volume: overrides.volume || '100 مل',
    concentration: overrides.concentration || 'Eau de Parfum',
    audience: overrides.audience || 'للجنسين',
    ...overrides,
  });
}

const fragranceProducts = [
  fragranceProduct({
    id: 301,
    family: 'oils',
    name: 'دهن عود جنيد - للجنسين - زيت عربي - 3مل',
    subtitle: 'زيت عود مركز بطابع شرقي فاخر',
    price: 230,
    regular_price: 230,
    sale_price: 230,
    product_price: 230,
    quantity: 18,
    sold_quantity: 72,
    volume: '3 مل',
    concentration: 'زيت عربي مركز',
    scent_family: 'عود شرقي',
    fragrance_notes: ['عود طبيعي', 'خشب دافئ', 'لمسة بلسمية'],
    image: { url: IMAGE.oudOil, alt: 'دهن عود جنيد' },
    thumbnail: IMAGE.oudOil,
    rating: { stars: 5, count: 64 },
    tags: ['عود', 'زيت عربي', 'الأكثر مبيعاً'],
  }),
  fragranceProduct({
    id: 302,
    family: 'women',
    name: 'عطر فتينه - نسائي - عطر غربي - 100 مل',
    subtitle: 'زهور ناعمة مع قاعدة مسكية',
    price: 110,
    regular_price: 110,
    sale_price: 110,
    product_price: 110,
    quantity: 42,
    volume: '100 مل',
    audience: 'نسائي',
    scent_family: 'زهري غربي',
    fragrance_notes: ['ورد', 'فاكهة ناعمة', 'مسك أبيض'],
    image: { url: IMAGE.perfume, alt: 'عطر فتينه' },
    thumbnail: IMAGE.perfume,
    rating: { stars: 5, count: 38 },
  }),
  fragranceProduct({
    id: 303,
    family: 'unisex',
    name: 'عطر حجر - للجنسين - عطر عربي غربي - 100 مل',
    subtitle: 'مزج شرقي غربي بنفحات عود',
    price: 90,
    regular_price: 90,
    sale_price: 90,
    product_price: 90,
    quantity: 34,
    audience: 'للجنسين',
    scent_family: 'عربي غربي',
    fragrance_notes: ['حمضيات', 'خشب الصندل', 'دهن عود'],
    image: { url: IMAGE.perfumeShelf, alt: 'عطر حجر' },
    thumbnail: IMAGE.perfumeShelf,
    rating: { stars: 4, count: 27 },
  }),
  fragranceProduct({
    id: 304,
    family: 'women',
    name: 'عطر ثلوج - نسائي - غربي - 100مل',
    subtitle: 'انتعاش بارد ولمسة أنثوية يومية',
    price: 80,
    regular_price: 80,
    sale_price: 80,
    product_price: 80,
    quantity: 0,
    status: 'out',
    audience: 'نسائي',
    scent_family: 'منعش زهري',
    fragrance_notes: ['زهور بيضاء', 'مسك', 'حمضيات'],
    image: { url: IMAGE.musk, alt: 'عطر ثلوج' },
    thumbnail: IMAGE.musk,
    rating: { stars: 4, count: 18 },
  }),
  fragranceProduct({
    id: 305,
    family: 'unisex',
    name: 'عطر تباهي - للجنسين - عطر عربي غربي - 100 مل',
    subtitle: 'ملك عطور العود بقاعدة دافئة',
    price: 350,
    regular_price: 390,
    sale_price: 350,
    product_price: 390,
    is_on_sale: true,
    quantity: 12,
    audience: 'للجنسين',
    scent_family: 'عود فاخر',
    fragrance_notes: ['عود', 'عنبر', 'جلد ناعم'],
    image: { url: IMAGE.oudOil, alt: 'عطر تباهي' },
    thumbnail: IMAGE.oudOil,
    rating: { stars: 5, count: 91 },
    promotion_title: 'الأكثر طلباً',
  }),
  fragranceProduct({
    id: 306,
    family: 'musk',
    name: 'عطر مسك - نسائي - عطر غربي - 50 مل',
    subtitle: 'مسك أبيض ناعم بحجم عملي',
    price: 80,
    regular_price: 80,
    sale_price: 80,
    product_price: 80,
    quantity: 25,
    volume: '50 مل',
    audience: 'نسائي',
    scent_family: 'مسك',
    fragrance_notes: ['مسك أبيض', 'بودرة', 'ورد'],
    image: { url: IMAGE.musk, alt: 'عطر مسك' },
    thumbnail: IMAGE.musk,
    rating: { stars: 5, count: 15 },
  }),
  fragranceProduct({
    id: 307,
    family: 'bakhoor',
    name: 'بخور البيت الخليجي الملكي - للجنسين - 60 جرام',
    subtitle: 'بخور فرنسي بطابع مجالس فاخر',
    price: 160,
    regular_price: 160,
    sale_price: 160,
    product_price: 160,
    quantity: 30,
    volume: '60 جرام',
    audience: 'للجنسين',
    scent_family: 'بخور فرنسي',
    fragrance_notes: ['خشب عطري', 'ورد', 'عنبر'],
    image: { url: IMAGE.bakhoor, alt: 'بخور البيت الخليجي الملكي' },
    thumbnail: IMAGE.bakhoor,
    rating: { stars: 4, count: 21 },
  }),
  fragranceProduct({
    id: 308,
    family: 'bakhoor',
    name: 'مبخر مداخن المجالس - فضة',
    subtitle: 'إكسسوار فاخر لتجربة البخور',
    price: 220,
    regular_price: 220,
    sale_price: 220,
    product_price: 220,
    quantity: 9,
    audience: 'منزلي',
    scent_family: 'مبخرة',
    fragrance_notes: ['فضة', 'معدن مصقول', 'تصميم مجالس'],
    image: { url: IMAGE.incense, alt: 'مبخر مداخن المجالس' },
    thumbnail: IMAGE.incense,
    rating: { stars: 4, count: 8 },
  }),
  fragranceProduct({
    id: 309,
    family: 'sets',
    name: 'مجموعة مسك كولكشن - للجنسين - مجموعة عطور بخاخ - 30 مل',
    subtitle: 'مجموعة روائح صغيرة للتجربة والإهداء',
    price: 180,
    regular_price: 180,
    sale_price: 180,
    product_price: 180,
    type: 'bundle',
    quantity: 16,
    volume: '30 مل',
    audience: 'للجنسين',
    scent_family: 'مجموعة مسك',
    fragrance_notes: ['مسك', 'ورد', 'فانيلا'],
    image: { url: IMAGE.giftSet, alt: 'مجموعة مسك كولكشن' },
    thumbnail: IMAGE.giftSet,
    rating: { stars: 5, count: 6 },
  }),
  fragranceProduct({
    id: 310,
    family: 'try-decide',
    name: 'مجموعة عينات جرب وقرّر - خمس عطور فاخرة',
    subtitle: 'عينات عطرية لاكتشاف الرائحة المناسبة',
    price: 35,
    regular_price: 35,
    sale_price: 35,
    product_price: 35,
    type: 'digital',
    quantity: 100,
    volume: '5 عينات',
    audience: 'للجنسين',
    scent_family: 'عينات متنوعة',
    fragrance_notes: ['عود', 'مسك', 'زهور', 'عنبر', 'بخور'],
    image: { url: IMAGE.giftSet, alt: 'مجموعة عينات جرب وقرر' },
    thumbnail: IMAGE.giftSet,
    rating: { stars: 5, count: 33 },
    add_to_cart_label: 'اطلب العينة',
  }),
  fragranceProduct({
    id: 311,
    family: 'men',
    name: 'عطر كربون - رجالي - غربي - 200 مل',
    subtitle: 'رائحة رجالية بثبات عال وحضور واضح',
    price: 220,
    regular_price: 220,
    sale_price: 220,
    product_price: 220,
    quantity: 20,
    volume: '200 مل',
    audience: 'رجالي',
    scent_family: 'خشبي غربي',
    fragrance_notes: ['حمضيات', 'أخشاب', 'باتشولي'],
    image: { url: IMAGE.perfumeShelf, alt: 'عطر كربون' },
    thumbnail: IMAGE.perfumeShelf,
    rating: { stars: 4, count: 29 },
  }),
  fragranceProduct({
    id: 312,
    family: 'oils',
    name: 'دهن طيف - للجنسين - زيت غربي - 23 مل',
    subtitle: 'زيت عطري فاخر بحجم كبير',
    price: 420,
    regular_price: 420,
    sale_price: 420,
    product_price: 420,
    quantity: 5,
    has_preorder_campaign: true,
    preorder: { label: 'اطلب توفيره' },
    volume: '23 مل',
    concentration: 'زيت غربي',
    audience: 'للجنسين',
    scent_family: 'زيت فاخر',
    fragrance_notes: ['عنبر', 'مسك', 'أخشاب ناعمة'],
    image: { url: IMAGE.oudOil, alt: 'دهن طيف' },
    thumbnail: IMAGE.oudOil,
    rating: { stars: 5, count: 12 },
  }),
];

const fragranceReviews = [
  {
    id: 31,
    product_id: 301,
    name: 'عبدالله',
    user: 'عبدالله',
    avatar: 'https://i.pravatar.cc/150?u=oud',
    stars: 5,
    rating: 5,
    text: 'ثبات ممتاز ورائحة العود واضحة من أول استخدام.',
    content: 'ثبات ممتاز ورائحة العود واضحة من أول استخدام.',
    created_at: '2026-04-28',
  },
  {
    id: 32,
    product_id: 305,
    name: 'سارة',
    user: 'سارة',
    avatar: 'https://i.pravatar.cc/150?u=tabahi',
    stars: 5,
    rating: 5,
    text: 'تغليف فاخر والرائحة مناسبة للإهداء.',
    content: 'تغليف فاخر والرائحة مناسبة للإهداء.',
    created_at: '2026-04-20',
  },
  {
    id: 33,
    product_id: 307,
    name: 'نواف',
    user: 'نواف',
    avatar: '',
    stars: 4,
    rating: 4,
    text: 'البخور مناسب للمجالس، تمنيت وصفاً أوضح للمكونات.',
    content: 'البخور مناسب للمجالس، تمنيت وصفاً أوضح للمكونات.',
    created_at: '2026-04-12',
  },
  {
    id: 34,
    product_id: 310,
    name: 'ريم',
    user: 'ريم',
    avatar: 'https://i.pravatar.cc/150?u=samples',
    stars: 5,
    rating: 5,
    text: 'فكرة العينات ممتازة وساعدتني أختار العطر المناسب.',
    content: 'فكرة العينات ممتازة وساعدتني أختار العطر المناسب.',
    created_at: '2026-04-08',
  },
];

const fragranceHome = {
  slides: [
    {
      image: IMAGE.perfumeShelf,
      title: 'تسوق الآن واحصل على شحن مجاني',
      description: 'عطور عربية وغربية وزيوت عطرية وبخور بتجربة متجر فاخر.',
      without_overlay: false,
      url: 'categories/try-and-decide.html',
    },
    {
      image: IMAGE.bakhoor,
      title: 'بخور ومعمول ومباخر',
      description: 'منتجات مجالس بروائح شرقية وثبات طويل.',
      without_overlay: false,
      url: 'categories/bakhoor.html',
    },
    {
      image: IMAGE.giftSet,
      title: 'اطلب توفيره',
      description: 'تجربة طلب مسبق للمنتجات النادرة والمميزة.',
      without_overlay: false,
      url: 'products/312.html',
    },
  ],
  banners: [
    {
      image: IMAGE.giftSet,
      url: 'categories/try-and-decide.html',
      title: 'جرب وقرّر',
      description: 'عينات مختارة لاكتشاف الرائحة المناسبة.',
    },
    {
      image: IMAGE.bakhoor,
      url: 'categories/bakhoor.html',
      title: 'تشكيلة البخور',
      description: 'بخور ومباخر للمجالس والهدايا.',
    },
    {
      image: IMAGE.perfumeShelf,
      url: 'pages/fragrance-consultant.html',
      title: 'استشر خبير العطور',
      description: 'اختيار الرائحة حسب المناسبة والشخصية.',
    },
  ],
  links: fragranceCategories.map((category) => ({
    icon: category.icon,
    title: category.name,
    url: category.url,
  })),
  features: [
    { icon: 'sicon-shipping-fast', title: 'شحن مجاني', text: 'تفعيل الشحن المجاني داخل السعودية' },
    { icon: 'sicon-shield-check', title: 'دفع آمن', text: 'دعم خيارات الدفع الآجل والمحافظ' },
    { icon: 'sicon-gift', title: 'تغليف فاخر', text: 'تجربة مناسبة للهدايا والمناسبات' },
  ],
  productSections: [
    { title: 'الأكثر مبيعاً', sub_title: 'منتجات عطرية تشبه كثافة متجر جنيد', ids: [301, 302, 303, 305, 311, 309], limit: 6 },
    { title: 'تشكيلة المسك', sub_title: 'روائح مسكية ناعمة', ids: [306, 309, 310, 302], limit: 4 },
    { title: 'بخور، معمول، مباخر', sub_title: 'منتجات مجالس وإكسسوارات', ids: [307, 308], limit: 4 },
    { title: 'اكتشف إطلاقات جديدة', sub_title: 'منتجات فاخرة وحديثة', ids: [312, 311, 305, 310], limit: 4 },
  ],
  fragranceDiscovery: {
    title: 'اكتشف عطرك المناسب',
    subtitle: 'مستشار عطري محلي لاختبار قدرة الثيم على شرح الرائحة، اقتراح الهدايا، ومساعدة المتسوق على المقارنة قبل الشراء.',
    guide_title: 'مستشار الرائحة',
    gift_title: 'اقتراحات الإهداء والتجربة',
    compare_title: 'مقارنة الروائح',
    product_ids: [301, 302, 305, 306, 307, 309, 310, 311],
    guide_items: [
      {
        icon: 'sicon-star2',
        title: 'فخم للمناسبات',
        note: 'عود وعنبر وحضور واضح للمساء والهدايا الرسمية.',
        filter: 'عود',
      },
      {
        icon: 'sicon-heart',
        title: 'ناعم يومي',
        note: 'مسك وزهور بروائح هادئة للاستخدام اليومي.',
        filter: 'مسك',
      },
      {
        icon: 'sicon-fire',
        title: 'للمجالس',
        note: 'بخور ومباخر وروائح خشبية لاستقبال الضيوف.',
        filter: 'بخور',
      },
      {
        icon: 'sicon-gift',
        title: 'هدية آمنة',
        note: 'خيارات للجنسين أو عينات تساعد المتسوق على القرار.',
        filter: 'للجنسين',
      },
    ],
  },
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
  'fragrance-luxury': {
    id: 'fragrance-luxury',
    title: 'Luxury Fragrance Dataset',
    purpose: 'بيئة توليد واختبار لمتاجر العطور الفاخرة المشابهة لمتجر جنيد: عطور، عود، مسك، بخور، مجموعات، عينات، وتعدد دول/عملات.',
    source_reference: {
      name: 'Junaid Perfumes Saudi Arabia',
      url: 'https://sa.junaidperfumes.com/',
      observed_patterns: [
        'قائمة تصنيفات عطرية واسعة',
        'سلايدر عروض رئيسي',
        'أقسام منتجات متكررة: الأكثر مبيعاً، المسك، البخور، الإطلاقات الجديدة',
        'منتجات بزيوت عطرية وبخور ومجموعات وعينات',
        'رسائل شحن مجاني ودفع آمن',
        'تعدد دول/عملات ولغتين',
      ],
    },
    store: {
      ...baseStore,
      id: 21,
      name: 'دار العود للعطور',
      username: 'dar-al-oud',
      description: 'متجر عطور فاخر لاختبار ثيمات الروائح الشرقية والغربية على منصة سلة.',
      slogan: 'اكتشف رائحتك المميزة',
      logo: IMAGE.emptyPlaceholder,
      contacts: {
        mobile: '+966500002121',
        phone: '+966500002121',
        email: 'care@daraloud.example',
        whatsapp: '+966500002121',
      },
      social: {
        instagram: 'daraloud',
        twitter: 'daraloud',
        snapchat: 'daraloud',
        tiktok: 'daraloud',
        youtube: 'daraloud',
      },
      settings: {
        ...baseStore.settings,
        currencies_enabled: true,
        is_multilingual: true,
        cart: {
          apply_coupon_enabled: true,
          free_shipping_enabled: true,
        },
        product: {
          ...baseStore.settings.product,
          show_notes: true,
          total_sold_enabled: true,
        },
      },
    },
    user: {
      ...users.registered,
      name: 'عميل مهتم بالعطور',
      wishlist: [301, 305, 310, 312],
      wallet: { balance: 380 },
    },
    users: Object.values(users),
    products: fragranceProducts,
    cart: cartFromProducts(fragranceProducts.slice(0, 3), {
      coupon: { code: 'OUD15', discount: 55 },
      total_discount: 55,
      real_shipping_cost: 0,
    }),
    reviews: fragranceReviews,
    testimonials: fragranceReviews.map((review) => ({
      name: review.name,
      text: review.text,
      avatar: review.avatar || IMAGE.emptyPlaceholder,
      stars: review.stars,
    })),
    categories: fragranceCategories,
    brands: [fragranceBrand],
    orders: [
      { id: 9301, status: 'delivered', total: 570, items: fragranceProducts.slice(0, 2), url: 'customer/orders/9301.html' },
      { id: 9302, status: 'processing', total: 760, items: fragranceProducts.slice(6, 9), url: 'customer/orders/9302.html' },
    ],
    blog: [
      { id: 31, title: 'كيف تختار العطر المناسب لشخصيتك', url: 'blog/choose-your-scent.html', image: IMAGE.perfumeShelf },
      { id: 32, title: 'الفرق بين دهن العود والعطر البخاخ', url: 'blog/oud-oil-vs-spray.html', image: IMAGE.oudOil },
      { id: 33, title: 'دليل استخدام البخور في المجالس', url: 'blog/bakhoor-guide.html', image: IMAGE.bakhoor },
    ],
    home: fragranceHome,
    expectations: {
      minProducts: 12,
      minReviews: 4,
      minCategories: 8,
      requiredProductTypes: ['product', 'bundle', 'digital'],
      requiredProductFamilies: ['men', 'women', 'unisex', 'try-decide', 'bakhoor', 'sets', 'oils', 'musk'],
      requiredFragranceFields: ['scent_family', 'fragrance_notes', 'volume', 'audience'],
      requiredHomeProductSections: ['الأكثر مبيعاً', 'تشكيلة المسك', 'بخور، معمول، مباخر', 'اكتشف إطلاقات جديدة'],
      requiredHomeExperienceBlocks: ['fragranceDiscovery'],
      requiresSaleProduct: true,
      requiresOutOfStockProduct: true,
      requiresPreorderProduct: true,
      requiresRegisteredUser: true,
    },
  },
  'checkout-flow': {
    id: 'checkout-flow',
    title: 'Checkout Flow Dataset',
    purpose: 'بيانات مركزة لاختبار السلة وما حولها: قسيمة، شحن مجاني، خيارات منتج، ولاء، هدية، منتج رقمي، وطلب دفع معلق.',
    store: {
      ...baseStore,
      id: 41,
      name: 'مختبر الدفع المحلي',
      username: 'checkout-lab',
      slogan: 'كل حالات السلة في صفحة واحدة',
      settings: {
        ...baseStore.settings,
        cart: {
          apply_coupon_enabled: true,
          free_shipping_enabled: true,
        },
      },
    },
    user: {
      ...users.registered,
      name: 'عميل يختبر الدفع',
      wallet: { balance: 520 },
      wishlist: [401, 402, 403],
    },
    users: Object.values(users),
    products: [
      product({
        id: 401,
        name: 'طقم هدية فاخر مع تغليف',
        subtitle: 'منتج فعلي مع خيار هدية وملاحظة',
        price: 360,
        regular_price: 420,
        sale_price: 360,
        product_price: 420,
        is_on_sale: true,
        quantity: 8,
        is_giftable: true,
        can_add_note: true,
        can_upload_file: true,
        image: { url: IMAGE.giftSet, alt: 'طقم هدية فاخر' },
        thumbnail: IMAGE.giftSet,
        rating: { stars: 5, count: 18 },
        options: [
          {
            id: 701,
            name: 'نوع التغليف',
            required: true,
            type: 'single-option',
            details: [
              { id: 1, name: 'أسود فاخر', full_name: 'أسود فاخر (+25 ر.س)', additional_price: 25, is_selected: true },
              { id: 2, name: 'أبيض كلاسيكي', full_name: 'أبيض كلاسيكي', additional_price: 0, is_selected: false },
            ],
          },
        ],
      }),
      product({
        id: 402,
        name: 'بطاقة إهداء رقمية فورية',
        subtitle: 'منتج رقمي لا يحتاج شحن',
        price: 150,
        regular_price: 150,
        sale_price: 150,
        product_price: 150,
        type: 'digital',
        quantity: 999,
        can_add_note: true,
        image: { url: IMAGE.squareBanner, alt: 'بطاقة إهداء رقمية' },
        thumbnail: IMAGE.squareBanner,
        rating: { stars: 4, count: 12 },
      }),
      product({
        id: 403,
        name: 'عينة عطرية قبل الشراء',
        subtitle: 'منتج صغير لاختبار رسوم الشحن والشحن المجاني',
        price: 85,
        regular_price: 85,
        sale_price: 85,
        product_price: 85,
        quantity: 30,
        image: { url: IMAGE.perfume, alt: 'عينة عطرية' },
        thumbnail: IMAGE.perfume,
        rating: { stars: 5, count: 31 },
      }),
      product({
        id: 404,
        name: 'باقة اشتراك شهرية',
        subtitle: 'منتج bundle لاختبار الملحقات',
        price: 240,
        regular_price: 300,
        sale_price: 240,
        product_price: 300,
        is_on_sale: true,
        type: 'bundle',
        quantity: 4,
        image: { url: IMAGE.wideBanner, alt: 'باقة اشتراك شهرية' },
        thumbnail: IMAGE.wideBanner,
        rating: { stars: 4, count: 9 },
      }),
    ],
    cart: cartFromProducts([
      product({
        id: 401,
        name: 'طقم هدية فاخر مع تغليف',
        price: 360,
        regular_price: 420,
        sale_price: 360,
        product_price: 420,
        is_on_sale: true,
        quantity: 8,
        is_giftable: true,
        can_add_note: true,
        can_upload_file: true,
        image: { url: IMAGE.giftSet, alt: 'طقم هدية فاخر' },
        thumbnail: IMAGE.giftSet,
        options: [
          {
            id: 701,
            name: 'نوع التغليف',
            required: true,
            type: 'single-option',
            details: [
              { id: 1, name: 'أسود فاخر', full_name: 'أسود فاخر (+25 ر.س)', additional_price: 25, is_selected: true },
              { id: 2, name: 'أبيض كلاسيكي', full_name: 'أبيض كلاسيكي', additional_price: 0, is_selected: false },
            ],
          },
        ],
      }),
      product({
        id: 402,
        name: 'بطاقة إهداء رقمية فورية',
        price: 150,
        regular_price: 150,
        sale_price: 150,
        product_price: 150,
        type: 'digital',
        quantity: 999,
        can_add_note: true,
        image: { url: IMAGE.squareBanner, alt: 'بطاقة إهداء رقمية' },
        thumbnail: IMAGE.squareBanner,
      }),
      product({
        id: 403,
        name: 'عينة عطرية قبل الشراء',
        price: 85,
        regular_price: 85,
        sale_price: 85,
        product_price: 85,
        quantity: 30,
        image: { url: IMAGE.perfume, alt: 'عينة عطرية' },
        thumbnail: IMAGE.perfume,
      }),
    ], {
      id: 'checkout-flow-cart',
      coupon: { code: 'CHECKOUT20', discount: 90 },
      total_discount: 90,
      sub_total: 595,
      tax_amount: 89.25,
      real_shipping_cost: 0,
      total: 529.25,
      is_require_shipping: true,
      has_shipping: true,
      free_shipping_bar: {
        minimum_amount: 500,
        has_free_shipping: true,
        percent: 100,
        remaining: 0,
      },
      options_total: 25,
      options: [
        {
          id: 9501,
          quantity: 1,
          name: 'رسالة إهداء مطبوعة',
          price: 25,
          options: [
            {
              id: 801,
              name: 'نص الرسالة',
              required: true,
              type: 'textarea',
              details: [],
            },
          ],
        },
      ],
    }),
    gift: {
      enabled: true,
      text: 'اكتب رسالة الإهداء واختر تغليفاً مناسباً قبل إتمام الطلب.',
      type: 'physical',
    },
    reviews: richReviews.slice(0, 3),
    testimonials: richReviews.slice(0, 3).map((review) => ({
      name: review.name,
      text: review.text,
      avatar: review.avatar || IMAGE.emptyPlaceholder,
      stars: review.stars,
    })),
    categories: [
      { id: 41, name: 'هدايا', url: 'categories/gifts.html', icon: 'sicon-gift', image: IMAGE.giftSet },
      { id: 42, name: 'منتجات رقمية', url: 'categories/digital.html', icon: 'sicon-send', image: IMAGE.squareBanner },
      { id: 43, name: 'عينات', url: 'categories/samples.html', icon: 'sicon-star2', image: IMAGE.perfume },
    ],
    brands: [
      { id: 41, name: 'Checkout Lab', url: 'brands/checkout-lab.html', logo: IMAGE.emptyPlaceholder },
    ],
    orders: [
      {
        id: 9401,
        status: 'pending',
        is_pending_payment: true,
        pending_payment_ends_in: 1800,
        total: 529.25,
        source: 'buy_as_gift',
        url: 'customer/orders/9401.html',
      },
    ],
    blog: [
      { id: 41, title: 'كيف تعمل خيارات الدفع والشحن محلياً', url: 'blog/checkout-guide.html', image: IMAGE.wideBanner },
    ],
    home: {
      ...commonHome,
      slides: [
        {
          image: IMAGE.wideBanner,
          title: 'اختبار سلة دفع كاملة',
          description: 'قسائم، شحن مجاني، هدية، منتج رقمي، وولاء داخل معاينة واحدة.',
          without_overlay: false,
        },
      ],
      productSections: [
        { title: 'منتجات الدفع التجريبية', sub_title: 'كل الحالات التي تضغط صفحة السلة', ids: [401, 402, 403, 404], limit: 4 },
      ],
    },
    expectations: {
      minProducts: 4,
      minReviews: 3,
      requiredProductTypes: ['product', 'digital', 'bundle'],
      requiresSaleProduct: true,
      requiresRegisteredUser: true,
      requiresCoupon: true,
      requiresFreeShipping: true,
      requiresCartOptions: true,
      requiresGiftWidget: true,
      requiresPendingPaymentOrder: true,
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

function loadThemeFixtures(themePath) {
  if (!themePath) return {};
  const file = path.join(themePath, 'fixtures.js');
  if (!fs.existsSync(file)) return {};
  try {
    return require(file);
  } catch (e) {
    return {};
  }
}

function getFixture(id = 'fashion-rich', themePath = null) {
  const local = loadThemeFixtures(themePath);
  if (local[id]) return clone(local[id]);
  const fixture = fixtures[id] || fixtures['fashion-rich'];
  return clone(fixture);
}

function hasFixture(id, themePath = null) {
  if (themePath && loadThemeFixtures(themePath)[id]) return true;
  return Boolean(fixtures[id]);
}

function listFixtures(themePath = null) {
  const local = loadThemeFixtures(themePath);
  const all = { ...fixtures, ...local };
  return Object.values(all).map((fixture) => ({
    id: fixture.id,
    title: fixture.title,
    purpose: fixture.purpose,
    products: (fixture.products || []).length,
    reviews: (fixture.reviews || []).length,
    users: (fixture.users || []).length,
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

  if ((fixture.categories || []).length < Number(expectations.minCategories || 0)) {
    issues.push(`${fixture.id}: عدد التصنيفات أقل من المطلوب (${(fixture.categories || []).length}/${expectations.minCategories})`);
  }

  for (const type of expectations.requiredProductTypes || []) {
    if (!hasProductType(products, type)) issues.push(`${fixture.id}: لا يوجد منتج من نوع ${type}`);
  }

  for (const family of expectations.requiredProductFamilies || []) {
    if (!products.some((item) => item.family === family)) {
      issues.push(`${fixture.id}: لا يوجد منتج من عائلة ${family}`);
    }
  }

  for (const section of expectations.requiredHomeProductSections || []) {
    const sections = fixture.home?.productSections || [];
    if (!sections.some((item) => item.title === section)) {
      issues.push(`${fixture.id}: قسم الصفحة الرئيسية مفقود: ${section}`);
    }
  }

  for (const block of expectations.requiredHomeExperienceBlocks || []) {
    if (!fixture.home?.[block]) {
      issues.push(`${fixture.id}: تجربة الصفحة الرئيسية مفقودة: ${block}`);
    }
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

  if (expectations.requiresCoupon && !fixture.cart?.coupon?.code) {
    issues.push(`${fixture.id}: لا توجد قسيمة في السلة`);
  }

  if (expectations.requiresFreeShipping && fixture.cart?.free_shipping_bar?.has_free_shipping !== true) {
    issues.push(`${fixture.id}: الشحن المجاني غير مفعل في السلة`);
  }

  if (expectations.requiresCartOptions && !(fixture.cart?.options || []).length) {
    issues.push(`${fixture.id}: لا توجد خيارات طلب داخل السلة`);
  }

  if (expectations.requiresGiftWidget && fixture.gift?.enabled !== true) {
    issues.push(`${fixture.id}: gift widget غير مفعل`);
  }

  if (expectations.requiresPendingPaymentOrder && !(fixture.orders || []).some((order) => order.is_pending_payment || order.status === 'pending')) {
    issues.push(`${fixture.id}: لا يوجد طلب دفع معلق`);
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
    for (const field of expectations.requiredFragranceFields || []) {
      if (!item[field] || (Array.isArray(item[field]) && !item[field].length)) {
        issues.push(`${label}: حقل العطور ${field} مفقود`);
      }
    }
  });

  return { issues, warnings };
}

module.exports = {
  getFixture,
  hasFixture,
  listFixtures,
  validateFixture,
  makeProduct: product,
  cartFromProducts,
};
