module.exports = {
    store: {
        name: "Couture Fashion | كوتور للأزياء",
        logo: "https://demo.salla.sa/assets/images/placeholder.png",
        url: "#",
        description: "الوجهة الأولى للأناقة العصرية في المملكة. نقدم لكم تشكيلة مختارة بعناية من أرقى تصاميم الأزياء التي تجمع بين الحداثة والأصالة.",
        settings: {
            is_multilingual: true,
            currencies_enabled: true,
            tax: {
                number: "310123456700003",
                certificate: "https://demo.salla.sa/assets/images/placeholder.png"
            }
        },
        social: {
            instagram: "couture_sa",
            twitter: "couture_sa",
            snapchat: "couture_sa"
        }
    },
    cart: {
        items_count: 2,
        total: "1,250 ر.س",
        items: []
    },
    theme: {
        settings: {
            get: (key) => {
                const settings = {
                    primary_color: "#111111",
                    accent_color: "#E6BEAE",
                    bg_color: "#FFFFFF",
                    font_family: "Outfit",
                    header_is_sticky: true,
                    footer_is_dark: false
                };
                return settings[key];
            }
        }
    },
    // منتجات حقيقية بصور جذابة
    products: [
        {
            id: 101,
            name: "فستان سهرة حريري طويل - لون نود ملكي",
            url: "#",
            price: "850 ر.س",
            regular_price: "1,100 ر.س",
            is_on_sale: true,
            image: { url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=600" },
            rating: { stars: 5 }
        },
        {
            id: 102,
            name: "حقيبة يد كلاسيكية من الجلد الطبيعي - أسود فاخر",
            url: "#",
            price: "400 ر.س",
            is_on_sale: false,
            image: { url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600" },
            rating: { stars: 4 }
        },
        {
            id: 103,
            name: "قميص كتان صيفي خفيف - أبيض لؤلؤي",
            url: "#",
            price: "220 ر.س",
            is_on_sale: false,
            image: { url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600" },
            rating: { stars: 5 }
        },
        {
            id: 104,
            name: "نظارة شمسية بإطار ذهبي عيار 18 - تصميم إيطالي",
            url: "#",
            price: "350 ر.س",
            is_on_sale: true,
            image: { url: "https://images.unsplash.com/photo-1511499767390-a73953f44222?auto=format&fit=crop&q=80&w=600" },
            rating: { stars: 5 }
        }
    ],
    // آراء عملاء حقيقية
    testimonials: [
        {
            content: "الجودة فاقت توقعاتي، الفستان رائع جداً والتوصيل كان سريعاً. شكراً كوتور!",
            author: "نورة القحطاني",
            avatar: "https://i.pravatar.cc/150?u=noura"
        },
        {
            content: "أفضل تجربة شراء أونلاين، الموقع سهل الاستخدام والتغليف كان راقياً جداً.",
            author: "أحمد الشهري",
            avatar: "https://i.pravatar.cc/150?u=ahmad"
        },
        {
            content: "الحقيبة جودتها ممتازة وتفاصيل الجلد طبيعية جداً. سأكرر التجربة بالتأكيد.",
            author: "سارة محمد",
            avatar: "https://i.pravatar.cc/150?u=sara"
        }
    ]
};
