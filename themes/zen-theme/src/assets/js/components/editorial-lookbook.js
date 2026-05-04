function setLookbookActiveProduct(product) {
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
