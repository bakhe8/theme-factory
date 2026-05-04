function setProductsGridCardState(card, active) {
  card.setAttribute('aria-current', active ? 'true' : 'false');
}

function initProductsGridExperience(root = document) {
  root.querySelectorAll('[data-products-grid-card]').forEach((card) => {
    if (card.dataset.productsGridReady === 'true') return;
    card.dataset.productsGridReady = 'true';

    card.addEventListener('mouseenter', () => setProductsGridCardState(card, true));
    card.addEventListener('mouseleave', () => setProductsGridCardState(card, false));
    card.addEventListener('focusin', () => setProductsGridCardState(card, true));
    card.addEventListener('focusout', () => setProductsGridCardState(card, false));
  });
}

document.addEventListener('theme::ready', () => initProductsGridExperience());
if (document.readyState !== 'loading') initProductsGridExperience();
