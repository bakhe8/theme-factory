(function () {
  const state = window.__SALLA_MOCK__ || {};
  const listeners = new Map();

  function getPath(source, key, fallback = null) {
    if (!key) return source;
    const value = String(key).split('.').reduce((current, part) => {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) return current[part];
      return undefined;
    }, source);
    return value === undefined ? fallback : value;
  }

  function formatMoney(value) {
    const number = typeof value === 'number' ? value : Number(String(value || '').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(number)) return String(value || '');
    return `${new Intl.NumberFormat('ar-SA').format(number)} ر.س`;
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
    const callbacks = listeners.get(name) || [];
    callbacks.forEach((callback) => callback(detail));
  }

  function on(name, callback) {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(callback);
    return () => {
      const callbacks = listeners.get(name) || [];
      listeners.set(name, callbacks.filter((entry) => entry !== callback));
    };
  }

  function ready(callback) {
    const promise = new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      } else {
        resolve();
      }
    });

    if (typeof callback === 'function') promise.then(callback);
    return promise;
  }

  const storage = new Map();

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function selectedProducts(element) {
    const products = state.products || [];
    const sourceValue = element.getAttribute('source-value');
    const limit = Number(element.getAttribute('limit') || products.length || 0);

    if (sourceValue) {
      try {
        const ids = JSON.parse(sourceValue);
        if (Array.isArray(ids) && ids.length) {
          return products.filter((product) => ids.includes(product.id)).slice(0, limit);
        }
      } catch (error) {
        return products.slice(0, limit);
      }
    }

    return products.slice(0, limit);
  }

  function productCardMarkup(product) {
    const image = product.image?.url || product.thumbnail || `${state.publicUrl || ''}/images/placeholder.png`;
    const alt = product.image?.alt || product.name || '';
    const productUrl = product.url || '#';
    const isOut = product.status === 'out' || product.quantity === 0;

    return [
      `<article class="salla-runtime-product-card ${isOut ? 'is-out' : ''}">`,
      `  <a href="${escapeHtml(productUrl)}" class="salla-runtime-product-card__image">`,
      `    <img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}">`,
      '  </a>',
      '  <div class="salla-runtime-product-card__content">',
      `    <h3><a href="${escapeHtml(productUrl)}">${escapeHtml(product.name || '')}</a></h3>`,
      product.subtitle ? `    <p>${escapeHtml(product.subtitle)}</p>` : '',
      '    <div class="salla-runtime-product-card__price">',
      product.is_on_sale ? `      <span>${formatMoney(product.regular_price)}</span>` : '',
      `      <strong>${formatMoney(product.price)}</strong>`,
      '    </div>',
      `    <salla-add-product-button product-id="${escapeHtml(product.id)}" product-status="${escapeHtml(product.status)}" product-type="${escapeHtml(product.type)}">${escapeHtml(isOut ? window.salla.lang.get('pages.products.out_of_stock') : window.salla.lang.get('pages.cart.add_to_cart'))}</salla-add-product-button>`,
      '  </div>',
      '</article>',
    ].filter(Boolean).join('');
  }

  window.salla = {
    init() {
      emit('salla::ready', state);
    },
    onReady: ready,
    log: (...args) => console.log('[salla-runtime]', ...args),
    logger: {
      warn: (...args) => console.warn('[salla-runtime]', ...args),
      error: (...args) => console.error('[salla-runtime]', ...args),
    },
    config: {
      get(key, fallback = null) {
        const config = {
          page: state.page,
          store: state.store,
          theme: state.theme,
          user: state.user,
        };
        return getPath(config, key, fallback);
      },
      set(key, value) {
        state.config = state.config || {};
        state.config[key] = value;
        return value;
      },
      isGuest() {
        return getPath(state, 'user.type', 'guest') === 'guest';
      },
    },
    lang: {
      get(key, params = {}) {
        let value = getPath(state.translations || {}, key, key);
        Object.entries(params || {}).forEach(([name, replacement]) => {
          value = value.replace(`{${name}}`, replacement);
        });
        return value;
      },
      addBulk(messages = {}) {
        state.translations = state.translations || {};
        Object.entries(messages).forEach(([key, value]) => {
          state.translations[key] = typeof value === 'object'
            ? value.ar || value.en || Object.values(value)[0] || key
            : value;
        });
      },
      onLoaded(callback) {
        return ready(callback);
      },
    },
    money: formatMoney,
    helpers: {
      money: formatMoney,
      number: (value) => new Intl.NumberFormat('ar-SA').format(value || 0),
      addParamToUrl(key, value) {
        const url = new URL(window.location.href);
        url.searchParams.set(key, value);
        return url.toString();
      },
      inputDigitsOnly(input) {
        input.value = String(input.value || '').replace(/[^\d]/g, '');
      },
    },
    url: {
      get: () => window.location.href,
      asset: (value) => `${state.publicUrl || ''}/${String(value || '').replace(/^\/+/, '')}`,
      cdn: (value) => value,
      is_page: (slug) => String(state.page?.slug || '') === String(slug || ''),
      is_placeholder: (value) => !value || String(value).includes('placeholder'),
    },
    storage: {
      get(key, fallback = null) {
        return storage.has(key) ? storage.get(key) : fallback;
      },
      set(key, value) {
        storage.set(key, value);
        return value;
      },
    },
    notify: {
      success: (message) => console.log('[salla-runtime:success]', message),
      error: (message) => console.error('[salla-runtime:error]', message),
      setNotifier(callback) {
        state.notifier = callback;
      },
    },
    event: {
      dispatch: emit,
      on,
      once(name, callback) {
        document.addEventListener(name, (event) => callback(event.detail), { once: true });
      },
      document: {
        onClick(selector, callback) {
          document.addEventListener('click', (event) => {
            if (event.target?.closest?.(selector)) callback(event);
          });
        },
      },
      cart: {
        onUpdated(callback) {
          on('cart::updated', callback);
        },
      },
    },
    component: {
      getMenus(source = 'header') {
        const menus = {
          header: [
            { id: 1, title: 'الرئيسية', url: 'index.html' },
            { id: 2, title: 'المنتجات', url: 'product.html' },
            { id: 3, title: 'المدونة', url: '#' },
          ],
          footer: [
            { id: 4, title: 'سياسة الخصوصية', url: '#' },
            { id: 5, title: 'الشروط والأحكام', url: '#' },
          ],
        };
        return Promise.resolve({ data: menus[source] || menus.header });
      },
    },
    api: {
      component: {
        getMenus(source) {
          return window.salla.component.getMenus(source);
        },
      },
      cart: {
        getCurrentCartId: () => Promise.resolve(1),
      },
    },
    cart: {
      api: {
        details() {
          return Promise.resolve({ data: { cart: state.cart || { items: [] } } });
        },
      },
      event: {
        onUpdated(callback) {
          on('cart::updated', callback);
        },
        onItemAdded(callback) {
          on('cart::item-added', (detail) => {
            callback(detail?.response || { data: state.cart }, detail?.product?.id || detail?.product_id);
          });
        },
        onItemUpdated(callback) {
          on('cart::item-updated', callback);
        },
        onItemUpdatedFailed(callback) {
          on('cart::item-updated-failed', callback);
        },
        onItemDeleted(callback) {
          on('cart::item-deleted', callback);
        },
      },
      details() {
        return Promise.resolve({ data: { cart: state.cart || { items: [] } } });
      },
      deleteItem(id) {
        state.cart = state.cart || { count: 0, items_count: 0, items: [], total: 0 };
        state.cart.items = (state.cart.items || []).filter((entry) => String(entry.id) !== String(id));
        state.cart.count = state.cart.items.length;
        state.cart.items_count = state.cart.items.length;
        emit('cart::item-deleted', { id, cart: state.cart });
        emit('cart::updated', state.cart);
        return Promise.resolve({ data: state.cart });
      },
      addItem(item = {}) {
        const product = (state.products || []).find((entry) => Number(entry.id) === Number(item.id || item.product_id)) || state.products?.[0];
        state.cart = state.cart || { count: 0, items_count: 0, items: [], total: 0 };
        state.cart.count += 1;
        state.cart.items_count = state.cart.count;
        state.cart.total += Number(product?.price || 0);
        state.cart.items.push(product);
        emit('cart::item-added', { response: { data: state.cart }, product });
        emit('cart::updated', state.cart);
        document.querySelectorAll('salla-cart-summary').forEach((element) => element.update && element.update());
        return Promise.resolve({ data: state.cart });
      },
      submit() {
        emit('cart::submitted', state.cart);
        return Promise.resolve({ data: state.cart });
      },
    },
    product: {
      getPrice() {
        const product = state.product || state.products?.[0] || {};
        const data = {
          ...product,
          price: product.price || 0,
          regular_price: product.regular_price || product.price || 0,
          has_sale_price: product.has_sale_price || product.is_on_sale || false,
          weight: product.weight || '',
        };
        emit('product::price.updated', { data });
        return Promise.resolve({ data });
      },
      event: {
        onPriceUpdated(callback) {
          on('product::price.updated', callback);
        },
      },
    },
    wishlist: {
      event: {
        onAdded(callback) {
          on('wishlist::added', (detail) => callback(detail?.response || { data: state.wishlist || [] }, detail?.id));
        },
        onRemoved(callback) {
          on('wishlist::removed', (detail) => callback(detail?.response || { data: state.wishlist || [] }, detail?.id));
        },
      },
      toggle(id) {
        const key = 'salla::wishlist';
        const wishlist = storage.get(key) || [];
        const numericId = Number(id);
        const index = wishlist.indexOf(numericId);
        if (index >= 0) {
          wishlist.splice(index, 1);
          emit('wishlist::removed', { response: { data: wishlist }, id: numericId });
        } else {
          wishlist.push(numericId);
          emit('wishlist::added', { response: { data: wishlist }, id: numericId });
        }
        storage.set(key, wishlist);
        emit('wishlist::updated', wishlist);
        return Promise.resolve({ data: wishlist });
      },
      remove(id) {
        const key = 'salla::wishlist';
        const wishlist = (storage.get(key) || []).filter((item) => Number(item) !== Number(id));
        storage.set(key, wishlist);
        emit('wishlist::removed', { response: { data: wishlist }, id: Number(id) });
        emit('wishlist::updated', wishlist);
        return Promise.resolve({ data: wishlist });
      },
    },
    order: {
      show: () => Promise.resolve({ data: {} }),
      createCartFromOrder: () => Promise.resolve({ data: {} }),
      cancel: () => Promise.resolve({ data: {} }),
      event: {
        onInvoiceSent(callback) {
          on('order::invoice-sent', callback);
        },
      },
    },
    comment: {
      event: {
        onAdded(callback) {
          on('comment::added', callback);
        },
      },
    },
    form: {
      onSubmit(action, event) {
        if (event?.preventDefault) event.preventDefault();
        emit(`form::${action}`, event);
        return false;
      },
      onChange(action, event) {
        emit(`form::${action}`, event);
        return false;
      },
    },
  };

  const originalDefine = customElements.define.bind(customElements);
  const definedConstructors = new WeakSet();
  customElements.define = function define(name, constructor, options) {
    if (customElements.get(name)) return;
    if (definedConstructors.has(constructor)) return;
    const result = originalDefine(name, constructor, options);
    definedConstructors.add(constructor);
    return result;
  };

  class RuntimeElement extends HTMLElement {
    connectedCallback() {
      if (!this.dataset.runtimeReady) {
        this.dataset.runtimeReady = 'true';
        this.render();
      }
    }

    render() {}
  }

  class SallaButton extends RuntimeElement {
    load() {
      this.setAttribute('loading', 'true');
      return this;
    }

    stop() {
      this.removeAttribute('loading');
      return this;
    }

    render() {
      this.setAttribute('role', this.getAttribute('role') || 'button');
      this.tabIndex = this.tabIndex >= 0 ? this.tabIndex : 0;
      this.addEventListener('click', () => {
        const productId = this.getAttribute('product-id');
        if (productId) window.salla.cart.addItem({ id: productId });
      });
    }
  }

  class SallaAddProductButton extends SallaButton {}

  class SallaCartSummary extends RuntimeElement {
    animateToCart(target) {
      if (target?.animate) {
        target.animate([
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(.92)', opacity: .75 },
          { transform: 'scale(1)', opacity: 1 },
        ], { duration: 450, easing: 'ease-out' });
      }
      return this;
    }

    update() {
      this.render();
    }

    render() {
      if (this.querySelector('[data-runtime-cart-count]')) {
        this.querySelector('[data-runtime-cart-count]').textContent = state.cart?.items_count || state.cart?.count || 0;
        return;
      }
      const badge = document.createElement('span');
      badge.dataset.runtimeCartCount = 'true';
      badge.className = 'salla-runtime-cart-count';
      badge.textContent = state.cart?.items_count || state.cart?.count || 0;
      this.appendChild(badge);
    }
  }

  class SallaSearch extends RuntimeElement {
    render() {
      if (this.children.length) return;
      const input = document.createElement('input');
      input.type = 'search';
      input.placeholder = this.getAttribute('placeholder') || window.salla.lang.get('common.search');
      input.className = 'salla-runtime-search';
      this.appendChild(input);
    }
  }

  class SallaMenu extends RuntimeElement {
    render() {
      const source = this.getAttribute('source') || this.getAttribute('type') || 'header';
      window.salla.component.getMenus(source).then((response) => {
        const nav = document.createElement('nav');
        nav.className = 'salla-runtime-menu';
        response.data.forEach((item) => {
          const link = document.createElement('a');
          link.href = item.url;
          link.textContent = item.title;
          nav.appendChild(link);
        });
        this.replaceChildren(nav);
      });
    }
  }

  class SallaProductsList extends RuntimeElement {
    render() {
      if (this.children.length) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'salla-runtime-products';
      const products = selectedProducts(this);
      if (!products.length) {
        const empty = document.createElement('p');
        empty.className = 'salla-runtime-empty';
        empty.textContent = window.salla.lang.get('common.no_products');
        wrapper.appendChild(empty);
        this.appendChild(wrapper);
        return;
      }
      products.forEach((product) => {
        const fragment = document.createElement('template');
        fragment.innerHTML = productCardMarkup(product);
        wrapper.appendChild(fragment.content);
      });
      this.appendChild(wrapper);
    }
  }

  class SallaProductsSlider extends SallaProductsList {
    render() {
      super.render();
      this.classList.add('salla-runtime-products-slider');
    }
  }

  class SallaSlider extends RuntimeElement {
    render() {
      this.classList.add('salla-runtime-slider');
    }
  }

  class SallaReviews extends RuntimeElement {
    render() {
      if (this.children.length) return;
      const reviews = state.reviews || state.testimonials || [];
      const wrapper = document.createElement('div');
      wrapper.className = 'salla-runtime-reviews';
      if (!reviews.length) {
        const empty = document.createElement('p');
        empty.className = 'salla-runtime-empty';
        empty.textContent = window.salla.lang.get('common.no_reviews');
        wrapper.appendChild(empty);
        this.appendChild(wrapper);
        return;
      }
      reviews.forEach((review) => {
        const item = document.createElement('article');
        item.className = 'salla-runtime-review';
        item.innerHTML = [
          review.avatar ? `<img src="${escapeHtml(review.avatar)}" alt="${escapeHtml(review.name || review.user || '')}">` : '',
          `<strong>${escapeHtml(review.name || review.user || '')}</strong>`,
          `<span>${'★'.repeat(Number(review.stars || review.rating || 0))}</span>`,
          `<p>${escapeHtml(review.text || review.content || '')}</p>`,
        ].join('');
        wrapper.appendChild(item);
      });
      this.appendChild(wrapper);
    }
  }

  class SallaRatingStars extends RuntimeElement {
    render() {
      const value = Number(this.getAttribute('value') || 0);
      this.textContent = '★'.repeat(Math.max(0, Math.min(5, value)));
      this.setAttribute('aria-label', `${value} stars`);
    }
  }

  const simpleTags = [
    'salla-user-menu',
    'salla-social',
    'salla-contacts',
    'salla-trust-badges',
    'salla-payments',
    'salla-apps-icons',
    'salla-modal',
    'salla-login-modal',
    'salla-offer-modal',
    'salla-localization-modal',
    'salla-notifications',
    'salla-orders',
    'salla-wallet',
    'salla-user-settings',
    'salla-verify',
    'salla-edit-order-button',
    'salla-order-totals-card',
    'salla-rating-modal',
    'salla-datetime-picker',
    'salla-tel-input',
    'salla-filters',
    'salla-infinite-scroll',
    'salla-comments',
    'salla-conditional-offer',
    'salla-progress-bar',
    'salla-count-down',
    'salla-quantity-input',
    'salla-product-options',
    'salla-breadcrumb',
    'salla-cart-coupons',
    'salla-cart-item-offers',
    'salla-file-upload',
    'salla-gifting',
    'salla-installment',
    'salla-loading',
    'salla-loyalty-panel',
    'salla-metadata',
    'salla-mini-checkout-widget',
    'salla-multiple-bundle-product',
    'salla-offer',
    'salla-product-size-guide',
    'salla-quick-order',
    'salla-social-share',
    'salla-tiered-offer',
  ];

  const registry = {
    'salla-button': SallaButton,
    'salla-add-product-button': SallaAddProductButton,
    'salla-cart-summary': SallaCartSummary,
    'salla-search': SallaSearch,
    'salla-menu': SallaMenu,
    'salla-products-list': SallaProductsList,
    'salla-products-slider': SallaProductsSlider,
    'salla-slider': SallaSlider,
    'salla-reviews': SallaReviews,
    'salla-rating-stars': SallaRatingStars,
  };

  if (!window.__SALLA_TWILIGHT_EXTERNAL__) {
    Object.entries(registry).forEach(([name, constructor]) => {
      if (!customElements.get(name)) customElements.define(name, constructor);
    });

    simpleTags.forEach((name) => {
      if (!customElements.get(name)) customElements.define(name, class extends RuntimeElement {});
    });
  }

  ready(() => {
    window.app = window.app || {};
    window.app.status = 'ready';
    document.dispatchEvent(new CustomEvent('theme::ready'));
    window.salla.init();
  });
})();
