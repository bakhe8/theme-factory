function setProductFlipState(card, active) {
  const toggleButtons = card.querySelectorAll('[data-product-flip-toggle]');
  const back = card.querySelector('.product-flip-card__back');

  card.classList.toggle('is-flipped', active);
  toggleButtons.forEach((button) => button.setAttribute('aria-expanded', active ? 'true' : 'false'));
  if (back) back.setAttribute('aria-hidden', active ? 'false' : 'true');
}

function initProductFlipExperience(root = document) {
  root.querySelectorAll('[data-product-flip-card]').forEach((card) => {
    if (card.dataset.productFlipReady === 'true') return;
    card.dataset.productFlipReady = 'true';

    card.querySelectorAll('[data-product-flip-toggle]').forEach((button) => {
      button.addEventListener('click', () => setProductFlipState(card, !card.classList.contains('is-flipped')));
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setProductFlipState(card, false);
    });
  });
}

document.addEventListener('theme::ready', () => initProductFlipExperience());
if (document.readyState !== 'loading') initProductFlipExperience();
