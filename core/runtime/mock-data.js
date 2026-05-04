const fs = require('fs');
const path = require('path');
const { getFixture, listFixtures } = require('./fixtures');

const IMAGE = {
  fashionHero: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=1600',
  lookbook: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=1400',
  wideBanner: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1400',
  squareBanner: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=900',
  emptyPlaceholder: 'https://demo.salla.sa/assets/images/placeholder.png',
};

function readTwilight(themePath) {
  const file = path.join(themePath, 'twilight.json');
  if (!fs.existsSync(file)) return {};

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return {};
  }
}

function slugify(value, fallback = 'item') {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || fallback;
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
  if (value && typeof value === 'object') {
    if (typeof value.amount === 'number') return `${new Intl.NumberFormat('ar-SA').format(value.amount)} ر.س`;
    if (typeof value.getMoney === 'function') return normalizeMoney(value.getMoney().amount);
  }
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
  'common.elements.cancel': 'إلغاء',
  'common.search': 'بحث',
  'common.close': 'إغلاق',
  'common.elements.email': 'البريد الإلكتروني',
  'common.elements.mobile': 'الجوال',
  'common.elements.ok': 'موافق',
  'common.elements.save': 'حفظ',
  'common.show_more': 'عرض المزيد',
  'common.no_products': 'لا توجد منتجات',
  'common.no_reviews': 'لا توجد مراجعات بعد',
  'common.titles.home': 'الرئيسية',
  'common.titles.support': 'الدعم',
  'common.elements.back_home': 'العودة للرئيسية',
  'common.elements.tax_number': 'الرقم الضريبي',
  'common.elements.warning': 'تنبيه',
  'common.uploader.choose_suitable_picture': 'اختر صورة مناسبة',
  'common.uploader.drag_and_drop': 'اسحب الملفات هنا',
  'common.uploader.browse': 'استعراض',
  'blocks.header.cart': 'السلة',
  'blocks.home.display_all': 'عرض الكل',
  'blocks.home.latest_products': 'أحدث المنتجات',
  'blocks.home.testimonials': 'آراء العملاء',
  'blocks.footer.pages_links': 'روابط مهمة',
  'pages.products.add_to_cart': 'أضف للسلة',
  'pages.products.attachments': 'المرفقات',
  'pages.products.availability': 'التوفر',
  'pages.products.calories': 'سعرة',
  'pages.products.price': 'السعر',
  'pages.products.quantity': 'الكمية',
  'pages.products.read_more': 'قراءة المزيد',
  'pages.products.remained': 'المتبقي',
  'pages.products.select_branch': 'اختر الفرع',
  'pages.products.show_size_guides': 'عرض دليل المقاسات',
  'pages.products.similar_products': 'منتجات مشابهة',
  'pages.products.size_guides': 'دليل المقاسات',
  'pages.products.sku': 'رمز المنتج',
  'pages.products.sold': 'تم بيع',
  'pages.products.sold_times': 'مرة',
  'pages.products.starting_price': 'يبدأ من',
  'pages.products.tax_included': 'السعر شامل الضريبة',
  'pages.products.weight': 'الوزن',
  'pages.cart.add_to_cart': 'أضف للسلة',
  'pages.categories.sorting': 'الترتيب',
  'pages.products.out_of_stock': 'نفدت الكمية',
  'pages.products.pre_order_now': 'اطلب مسبقا',
  'pages.products.add_file': 'إضافة ملف',
  'pages.products.add_note': 'إضافة ملاحظة',
  'pages.products.notes_placeholder': 'اكتب ملاحظتك',
  'pages.cart.book_now': 'احجز الآن',
  'pages.cart.cart_options': 'خيارات السلة',
  'pages.cart.complete_order': 'إتمام الطلب',
  'pages.cart.discount': 'الخصم',
  'pages.cart.empty_cart': 'السلة فارغة',
  'pages.cart.final_total': 'الإجمالي النهائي',
  'pages.cart.free_shipping': 'الشحن المجاني',
  'pages.cart.gift_widget_title': 'أرسل الطلب كهدية',
  'pages.products.donation_exceed': 'اكتمل التبرع',
  'pages.cart.has_free_shipping': 'تم تفعيل الشحن المجاني',
  'pages.cart.free_shipping_alert': 'باقي {amount} للشحن المجاني',
  'pages.cart.items_total': 'مجموع المنتجات',
  'pages.cart.items_total_without_tax': 'مجموع المنتجات بدون الضريبة',
  'pages.cart.order_options_total': 'خيارات الطلب',
  'pages.cart.out_of_stock': 'غير متوفر',
  'pages.cart.summary': 'ملخص الطلب',
  'pages.cart.shipping_cost': 'تكلفة الشحن',
  'pages.cart.total': 'الإجمالي',
  'pages.cart.VAT_tax_amount': 'ضريبة القيمة المضافة',
  'pages.blog_articles.related': 'مقالات ذات صلة',
  'pages.blog_categories.categories': 'التصنيفات',
  'pages.blog_categories.no_articles': 'لا توجد مقالات',
  'pages.brands.non_products': 'لا توجد منتجات مرتبطة بالماركة',
  'pages.profile.first_name': 'الاسم الأول',
  'pages.profile.last_name': 'اسم العائلة',
  'pages.profile.birthday': 'تاريخ الميلاد',
  'pages.profile.birthday_placeholder': 'اختر تاريخ الميلاد',
  'pages.profile.gender': 'الجنس',
  'pages.profile.gender_placeholder': 'اختر الجنس',
  'pages.profile.male': 'ذكر',
  'pages.profile.female': 'أنثى',
  'pages.orders.non_orders': 'لا توجد طلبات بعد',
  'pages.orders.date': 'تاريخ الطلب',
  'pages.orders.shipment_details': 'بيانات الشحنة',
  'pages.orders.branch': 'الفرع',
  'pages.orders.status': 'الحالة',
  'pages.orders.shipment_no': 'رقم الشحنة',
  'pages.orders.print': 'طباعة',
  'pages.orders.finish_payment': 'إتمام الدفع',
  'pages.orders.pending_payment_expired': 'انتهت مهلة الدفع',
  'pages.orders.your_order_is_under_review': 'طلبك قيد المراجعة',
  'pages.orders.to_order_invoice_contact_vendor': 'للحصول على الفاتورة تواصل مع المتجر',
  'pages.orders.print_order_details': 'لطباعة تفاصيل الطلب',
  'pages.orders.click_here': 'اضغط هنا',
  'pages.orders.reorder': 'إعادة الطلب',
  'pages.orders.reorder_description': 'أضف منتجات هذا الطلب مرة أخرى للسلة',
  'pages.orders.cancel': 'إلغاء الطلب',
  'pages.orders.reorder_confirmation': 'هل تريد إعادة الطلب؟',
  'pages.orders.cancel_confirmation': 'هل تريد إلغاء الطلب؟',
  'pages.orders.file_url': 'رابط الملف',
  'pages.orders.gift_tag': 'هدية',
  'pages.order.order_rating_title': 'قيّم تجربتك',
  'pages.order.order_rating_message': 'رأيك يساعد المتجر على التحسن',
  'pages.order.order_cancelation_desc': 'يمكنك طلب إلغاء الطلب إذا كان مؤهلاً',
  'pages.order.can_edit_or_delete_your_review_within': 'يمكنك تعديل تقييمك خلال',
  'pages.order.days_since_added': 'أيام من إضافته',
  'pages.order.edit_period_ended': 'انتهت مدة التعديل',
  'pages.order.delete_period_ended': 'انتهت مدة الحذف',
  'pages.order.option_name': 'اسم الخيار',
  'pages.order.option_content': 'محتوى الخيار',
  'pages.rating.rate': 'قيّم',
  'pages.rating.pending': 'بانتظار المراجعة',
  'pages.rating.rate_the_store': 'تقييم المتجر',
  'pages.rating.rate_shipping': 'تقييم الشحن',
  'pages.offer.offer_finished': 'انتهى العرض',
  'pages.offer.offer_expired_message': 'هذا العرض لم يعد متاحاً',
  'pages.offer.offer_remaining_time': 'الوقت المتبقي',
  'pages.offer.included_products': 'المنتجات المشمولة',
  'pages.thank_you.order_id': 'رقم الطلب',
  'pages.thank_you.order_details': 'تفاصيل الطلب',
  'pages.thank_you.email_sent': 'تم إرسال الفاتورة إلى',
  'pages.thank_you.resend_email': 'إعادة إرسال الفاتورة',
  'blocks.comments.submit': 'إرسال',
  'pages.loyalty_program.free_product': 'مجاني',
  'pages.loyalty_program.you_have': 'لديك',
  'pages.loyalty_program.point': 'نقطة',
  'pages.loyalty_program.exchange_points': 'استبدال النقاط',
  'pages.loyalty_program.ways_to_get_points': 'طرق جمع النقاط',
  'pages.loyalty_program.copy_link': 'نسخ الرابط',
  'pages.loyalty_program.completed': 'مكتمل',
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

  function selectProducts(ids = [], limit = 8) {
    const selectedIds = new Set((ids || []).map((id) => Number(id)));
    const selected = products.filter((product) => selectedIds.has(Number(product.id)));
    return (selected.length ? selected : products).slice(0, limit);
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

  if (home.fragranceDiscovery) {
    const discovery = home.fragranceDiscovery;
    push('home.fragrance-discovery', {
      component: {
        title: discovery.title,
        subtitle: discovery.subtitle,
        guide_title: discovery.guide_title,
        gift_title: discovery.gift_title,
        compare_title: discovery.compare_title,
        guide_items: discovery.guide_items || [],
        products: selectProducts(discovery.product_ids, discovery.limit || 8),
      },
    });
  }

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

  if (products.length) {
    push('home.fixed-products', {
      title: 'اختيارات لا تفوت',
      display_all_url: 'product.html',
      products: {
        source: 'selected',
        source_value: products.slice(0, 6).map((item) => item.id),
      },
      limit: Math.min(products.length, 6),
    });

    push('home.products-slider', {
      title: 'الأكثر مشاهدة',
      sub_title: 'منتجات مختلفة لاختبار السلايدر',
      display_all_url: 'product.html',
      products: {
        source: 'selected',
        source_value: products.slice(0, 8).map((item) => item.id),
      },
      limit: Math.min(products.length, 8),
    });

    for (const section of home.productSections || []) {
      const sourceValue = (section.ids || []).filter((id) => products.some((product) => Number(product.id) === Number(id)));
      if (!sourceValue.length) continue;

      push('home.products-slider', {
        title: section.title,
        sub_title: section.sub_title || '',
        display_all_url: section.display_all_url || 'products.html',
        products: {
          source: 'selected',
          source_value: sourceValue,
        },
        limit: Math.min(section.limit || products.length, products.length),
      });
    }
  }

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

function moneyObject(amount) {
  return {
    amount: Number(amount || 0),
    currency: 'SAR',
    getMoney() {
      return { amount: this.amount, currency: this.currency };
    },
    toString() {
      return String(this.amount);
    },
  };
}

function enrichProduct(product, index = 0) {
  const imageUrl = product.image?.url || product.thumbnail || IMAGE.emptyPlaceholder;
  const productId = product.id || index + 1;
  const productUrl = product.url && product.url !== 'product.html'
    ? product.url
    : `products/${productId}.html`;
  const category = product.category || product.categories?.[0] || {
    id: 1,
    name: 'تجريبي',
    url: 'categories/default.html',
  };
  const enriched = {
    ...product,
    add_to_cart_label: product.add_to_cart_label || baseTranslations['pages.products.add_to_cart'],
    base_currency_price: product.base_currency_price || product.price || 0,
    brand: product.brand || { id: 1, name: 'Maison Noor', url: 'brands/noor.html', logo: product.image?.url || imageUrl },
    can_add_note: Boolean(product.can_add_note),
    can_quick_buy: Boolean(product.can_quick_buy),
    can_show_remained_quantity: product.can_show_remained_quantity ?? true,
    can_show_sold: product.can_show_sold ?? true,
    can_upload_file: Boolean(product.can_upload_file),
    categories: product.categories || [category],
    category: {
      ...category,
      url: category.url && category.url !== 'product.html' && category.url !== '#'
        ? category.url
        : `categories/${slugify(category.name, category.id || 'default')}.html`,
    },
    currency: 'SAR',
    description: product.description || `${product.subtitle || product.name || 'منتج'} ضمن بيانات المصنع المحلية لاختبار صفحات المنتج.`,
    digital_files_settings: product.digital_files_settings || null,
    has_3d_image: false,
    has_bundle_products: product.type === 'bundle',
    has_custom_form: false,
    has_metadata: product.has_metadata ?? false,
    metadata: product.metadata || null,
    has_options: Boolean(product.options?.length),
    has_read_more: Boolean(product.description && String(product.description).length > 160),
    has_size_guide: Boolean(product.has_size_guide),
    image: product.image || { url: imageUrl, alt: product.name || 'product' },
    images: product.images || [
      { id: `${product.id || index}-1`, url: imageUrl, alt: product.image?.alt || product.name || 'product', type: 'image' },
      { id: `${product.id || index}-2`, url: product.thumbnail || imageUrl, alt: product.image?.alt || product.name || 'product', type: 'image' },
    ],
    is_available: product.status !== 'out' && product.quantity !== 0,
    is_giftable: Boolean(product.is_giftable),
    is_hidden_quantity: product.is_hidden_quantity ?? false,
    is_in_wishlist: Boolean(product.is_in_wishlist),
    is_out_of_stock: product.status === 'out' || product.quantity === 0,
    is_require_shipping: product.type !== 'digital',
    is_taxable: product.is_taxable ?? true,
    max_quantity: product.max_quantity || Math.max(Number(product.quantity || 1), 1),
    notify_availability: product.notify_availability || null,
    options: product.options || [],
    product_image: imageUrl,
    product_name: product.name,
    sku: product.sku || `SKU-${product.id || index}`,
    show_availability: Boolean(product.show_availability),
    tags: (product.tags || []).map((tag) => (typeof tag === 'string' ? { name: tag, url: '#' } : tag)),
    url: productUrl,
    weight: product.weight || '',
    weight_label: product.weight_label || product.weight || '',
  };

  return enriched;
}

function createCartItem(product, index = 0) {
  const enriched = enrichProduct(product, index);
  const amount = Number(enriched.price || 0);
  return {
    ...enriched,
    id: index + 1,
    product_id: enriched.id,
    product_image: enriched.image?.url || enriched.thumbnail || '',
    product_name: enriched.name,
    price: moneyObject(amount),
    product_price: moneyObject(enriched.product_price || enriched.regular_price || amount),
    original_price: moneyObject(enriched.regular_price || amount),
    total: moneyObject(amount),
    total_special_price: moneyObject(amount),
    quantity: 1,
    has_discount: Boolean(enriched.is_on_sale),
    has_offer: false,
    offer: null,
    detailed_offers: [],
    attachments: [],
  };
}

function createBlogArticle(item, index = 0) {
  const image = typeof item.image === 'string'
    ? { url: item.image, alt: item.title || 'article' }
    : (item.image || { url: 'images/placeholder.png', alt: item.title || 'article' });

  return {
    id: item.id || index + 1,
    key: item.key || item.id || index + 1,
    title: item.title || 'مقال تجريبي',
    body: item.body || 'محتوى تجريبي طويل قليلاً لاختبار صفحة المقال داخل محاكي المصنع المحلي.',
    summary: item.summary || 'ملخص تجريبي للمقال داخل بيانات المصنع.',
    url: item.url || 'blog-single.html',
    has_image: Boolean(image.url),
    image,
    thumbnail: image.url,
    created_at: item.created_at || '2026-05-01',
    author: item.author || { name: 'فريق المتجر', url: '#' },
    likes_count: item.likes_count || 4,
    comments_count: item.comments_count || 1,
    tags: item.tags || [{ name: 'إلهام', url: '#' }],
  };
}

function createArticles(fixture) {
  const source = (fixture.blog || []).length
    ? fixture.blog
    : [{ id: 1, title: 'مقال افتتاحي للمتجر', url: 'blog-single.html', image: fixture.home?.slides?.[0]?.image }];
  const articles = source.map(createBlogArticle);
  articles.next_page = null;
  return articles;
}

function createCategories(fixture) {
  const source = Array.isArray(fixture.categories) ? fixture.categories : [];
  return source.map((category, index) => {
    const id = category.id || index + 1;
    const fallback = `categories/${slugify(category.name, `category-${id}`)}.html`;
    return {
      image: '',
      icon: 'sicon-store2',
      sub_categories: [],
      ...category,
      id,
      url: category.url && category.url !== '#' && category.url !== 'product.html' ? category.url : fallback,
    };
  });
}

function createBlogCategories() {
  return [
    { id: 1, name: 'إلهام', url: 'blog.html?category=inspiration', is_current: true },
    { id: 2, name: 'العناية بالمنتجات', url: 'blog.html?category=care', is_current: false },
    { id: 3, name: 'اختيارات الموسم', url: 'blog.html?category=seasonal', is_current: false },
  ];
}

function enrichUser(user = {}) {
  const nameParts = String(user.name || 'ليان عبدالله').trim().split(/\s+/);
  return {
    language_code: 'ar',
    language: { code: 'ar', dir: 'rtl' },
    first_name: nameParts[0] || 'ليان',
    last_name: nameParts.slice(1).join(' ') || 'عبدالله',
    birthday: '1992-06-15',
    gender: 'female',
    is_notifiable: true,
    is_profile_completed: true,
    loyalty_points: 1320,
    ...user,
  };
}

function createCustomFields() {
  return [
    { id: 'favorite_color', label: 'اللون المفضل', type: 'text', value: 'أسود', required: false },
    { id: 'style_reference', label: 'صورة مرجعية', type: 'photo', value: '', required: false },
  ];
}

function createNotifications() {
  const notifications = [
    {
      id: 1,
      is_new: true,
      url: 'customer/orders/9001.html',
      title: 'تم شحن طلبك',
      sub_title: 'طلبك في الطريق إليك',
      date: '2026-05-02',
    },
    {
      id: 2,
      is_new: false,
      url: 'loyalty.html',
      title: 'نقاط جديدة في رصيدك',
      sub_title: 'حصلت على 120 نقطة ولاء',
      date: '2026-04-30',
    },
  ];
  notifications.next_page = null;
  notifications.count = notifications.length;
  return notifications;
}

function createLoyaltyProgram(products = []) {
  return {
    name: 'نقاط كوتور',
    description: 'اكسب نقاطاً مع كل عملية شراء واستبدلها بمكافآت داخل المتجر.',
    image: IMAGE.wideBanner,
    promotion_title: 'مكافآت موسمية',
    promotion_description: 'ضاعف نقاطك في نهاية الأسبوع.',
    points: [
      { name: 'إكمال الملف الشخصي', description: 'أكمل بياناتك لتحصل على نقاط ترحيبية.', type: 'profile', url: 'customer/profile.html', points: 100, icon: 'sicon-user', color: '#2563eb' },
      { name: 'مشاركة المتجر', description: 'شارك رابط المتجر مع أصدقائك.', type: 'share', url: 'index.html', points: 50, icon: 'sicon-share', color: '#16a34a' },
      { name: 'تقييم الطلب', description: 'قيّم تجربتك بعد الشراء.', type: 'rating', url: 'customer/orders/9001.html', points: 80, icon: 'sicon-star2', color: '#d97706' },
      { name: 'طلب جديد', description: 'اكسب نقاطاً مع كل عملية شراء.', type: 'order', url: 'products.html', points: 120, icon: 'sicon-shopping-bag', color: '#be123c' },
    ],
    prizes: [
      {
        title: 'قسائم خصم',
        type: 'coupon_discount',
        items: [
          { id: 1, name: 'خصم 10%', description: 'قسيمة على الطلب القادم.', image: IMAGE.squareBanner, url: 'products.html', cost_points: 500 },
          { id: 2, name: 'شحن مجاني', description: 'شحن مجاني داخل المملكة.', image: IMAGE.wideBanner, url: 'cart.html', cost_points: 350 },
        ],
      },
      {
        title: 'منتجات مجانية',
        type: 'free_product',
        items: products.slice(0, 4).map((product, index) => ({
          id: product.id || index + 1,
          name: product.name,
          description: product.subtitle || 'مكافأة من برنامج الولاء.',
          image: product.image?.url || product.thumbnail || IMAGE.emptyPlaceholder,
          url: product.url,
          cost_points: 900 + (index * 150),
        })),
      },
    ],
    prize: {
      points: 350,
      title: 'شحن مجاني للطلب القادم',
    },
  };
}

function createLanding(products = [], testimonials = []) {
  return {
    id: 3001,
    title: 'عرض نهاية الأسبوع',
    content: 'مجموعة مختارة من المنتجات مع تجربة هبوط كاملة قابلة للفحص محلياً.',
    products: products.slice(0, 4),
    offer_ends_at: '2026-06-01 23:59:59',
    testimonials_type: testimonials.length ? 'selected' : '',
    show_quantity: true,
    is_slider: false,
    is_expired: false,
    show_store_features: true,
  };
}

function createOrderItem(product, index = 0) {
  const amount = Number(product.price || 0);
  return {
    id: index + 1,
    product_id: product.id,
    name: product.name,
    image: product.image?.url || product.thumbnail || IMAGE.emptyPlaceholder,
    price: moneyObject(amount),
    total: moneyObject(amount),
    quantity: 1,
    product,
    sub_products: [],
    note: index === 0 ? 'تغليف كهدية عند الإمكان' : '',
    attachments: index === 0 ? [{ type: 'image', url: product.image?.url || product.thumbnail || IMAGE.emptyPlaceholder }] : [],
    options: [
      { name: 'المقاس', value: 'M', is_image: false, color: '', price: 0 },
    ],
    product_reservations: { count: 0 },
    availability_date: '',
    booking_location: '',
    rating: index === 0 ? {
      id: 800 + index,
      content: 'تجربة شراء ممتازة.',
      is_pending: false,
      stars: 5,
      images: [],
      can_update: true,
    } : null,
  };
}

function createOrder(source = {}, products = [], index = 0) {
  const id = source.id || 9001 + index;
  const items = (source.items?.length ? source.items : products.slice(0, 2)).map(createOrderItem);
  const subTotal = items.reduce((sum, item) => sum + Number(item.total.amount || 0), 0);
  const tax = Number((subTotal * 0.15).toFixed(2));
  const total = subTotal + tax + 25;
  const status = typeof source.status === 'object' ? source.status : {
    delivered: { name: 'تم التسليم', icon: 'sicon-check-circle', color: '#16a34a' },
    processing: { name: 'قيد التجهيز', icon: 'sicon-packed-box', color: '#2563eb' },
    pending: { name: 'بانتظار الدفع', icon: 'sicon-wallet', color: '#d97706' },
  }[source.status || 'processing'] || { name: 'قيد التجهيز', icon: 'sicon-packed-box', color: '#2563eb' };

  return {
    ...source,
    id,
    reference_id: source.reference_id || `R-${id}`,
    created_at: source.created_at || '2026-05-01',
    sub_total: moneyObject(subTotal),
    total: moneyObject(total),
    cod_cost: moneyObject(0),
    can_reorder: true,
    can_cancel: index === 0,
    can_rate: true,
    cancel_url: '#',
    payment_url: 'cart.html',
    is_pending_payment: source.is_pending_payment ?? false,
    pending_payment_ends_in: source.pending_payment_ends_in ?? 3600,
    is_price_quote: false,
    is_rated: true,
    refund_message: '',
    source: source.source || 'store',
    url: source.url || `customer/orders/${id}.html`,
    status,
    shipping: {
      id: 1,
      name: 'شركة شحن تجريبية',
      number: 'SHIP-100',
      logo: IMAGE.emptyPlaceholder,
      cost: moneyObject(25),
    },
    shipments: [],
    packages: [
      {
        id: 1,
        branch: { name: 'الفرع الرئيسي' },
        shipping_company: {
          name: 'شركة شحن تجريبية',
          number: 'SHIP-100',
          logo: IMAGE.emptyPlaceholder,
          tracing_link: 'https://example.test/track',
        },
        status,
        is_delivered: source.status === 'delivered',
        items,
      },
    ],
    tax: { amount: moneyObject(tax), percent: 15 },
    discounts: [{ name: 'STYLE15', discount: moneyObject(20) }],
    items,
    options: [
      {
        options: [
          { name: 'تغليف هدية', value: 'نعم', price: moneyObject(15), reservations: null },
        ],
      },
    ],
    rating: {
      store: { id: 1, stars: 5, content: 'متجر رائع وسريع.', can_update: true },
      shipping: { id: 2, stars: 4, content: 'الشحن جيد.', can_update: true },
    },
    links: [{ url: '#', label: 'الفاتورة', type: 'print' }],
    customer: {
      email: 'layan@example.test',
    },
    email_sent: true,
    instructions: 'احتفظ برقم الطلب لاستخدامه عند التواصل مع الدعم.',
    print_url() {
      return '#';
    },
  };
}

function createMockContext(themeName, themePath, options = {}) {
  const twilight = readTwilight(themePath);
  const settings = collectSettings(twilight);
  const fixture = getFixture(options.fixture || process.env.FACTORY_FIXTURE || 'fashion-rich', themePath);
  const fixtureProducts = (Array.isArray(fixture.products) ? fixture.products : products).map(enrichProduct);
  const primaryProduct = fixtureProducts[0] || enrichProduct(products[0]);
  const categories = createCategories(fixture);
  const user = enrichUser(fixture.user || { type: 'guest', can_access_wallet: false });
  const users = (fixture.users || [user]).map(enrichUser);
  const cart = fixture.cart || {
    items_count: 0,
    count: 0,
    total: 0,
    sub_total: 0,
    tax_amount: 0,
    total_discount: 0,
    real_shipping_cost: 0,
    items: [],
  };
  const cartItems = (cart.items || []).map(createCartItem);
  const orders = (fixture.orders || [{ id: 9001, status: 'processing', items: fixtureProducts.slice(0, 2) }])
    .map((order, index) => createOrder(order, fixtureProducts, index));
  const runtimeCart = {
    ...cart,
    id: cart.id || 'local-cart',
    is_require_shipping: cart.is_require_shipping ?? true,
    has_shipping: cart.has_shipping ?? true,
    free_shipping_bar: cart.free_shipping_bar || {
      minimum_amount: 500,
      has_free_shipping: Number(cart.total || 0) >= 500,
      percent: Math.min(100, Math.round((Number(cart.total || 0) / 500) * 100)),
      remaining: Math.max(0, 500 - Number(cart.total || 0)),
    },
    items: cartItems,
    options: cart.options || [],
    options_total: cart.options_total || 0,
  };
  const articles = createArticles(fixture);
  const blogCategories = createBlogCategories();
  const notifications = createNotifications();
  const loyalty = createLoyaltyProgram(fixtureProducts);
  const landing = createLanding(fixtureProducts, fixture.testimonials || []);
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
    language: { code: 'ar', name: 'العربية', dir: 'rtl' },
    page: { id: 1, slug: 'index', title: 'الرئيسية', content: '', url: 'index.html' },
    user,
    customer: user,
    users,
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
    cart: runtimeCart,
    gift: fixture.gift || { enabled: false, text: '', type: 'physical' },
    gifting_intro: 'أرسلها كهدية',
    loyalty,
    landing,
    product: primaryProduct,
    products: fixtureProducts,
    reviews: fixture.reviews || [],
    testimonials: fixture.testimonials || [],
    categories,
    blog_categories: blogCategories,
    brands: fixture.brands || [],
    orders,
    order: orders[0],
    notifications,
    custom_fields: createCustomFields(),
    thank_you_title: 'شكراً لطلبك',
    messages: ['تم استلام طلبك بنجاح', 'سنرسل لك تحديثات الشحن قريباً'],
    can_print_invoice: true,
    blog: articles,
    article: articles[0],
    articles,
    related: articles.slice(1),
    slides: articles.slice(0, 2),
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
    order: context.order,
    notifications: context.notifications,
    loyalty: context.loyalty,
    landing: context.landing,
    custom_fields: context.custom_fields,
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
