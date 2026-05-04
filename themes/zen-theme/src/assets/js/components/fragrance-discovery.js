function fragranceText(product) {
  return [
    product.dataset.fragranceAudience,
    product.dataset.fragranceFamily,
    product.dataset.fragranceNotes,
    product.dataset.fragranceKey,
  ].filter(Boolean).join(' ').toLowerCase();
}

function productMatchesFragranceFilter(product, filter) {
  const normalized = String(filter || 'all').trim().toLowerCase();
  if (!normalized || normalized === 'all') return true;
  return fragranceText(product).includes(normalized);
}

function setFragranceFilter(discovery, filter, sourceButton = null) {
  let visible = 0;

  discovery.querySelectorAll('[data-fragrance-filter]').forEach((button) => {
    const active = button === sourceButton || (sourceButton == null && button.dataset.fragranceFilter === filter);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  discovery.querySelectorAll('[data-fragrance-product]').forEach((product) => {
    const matched = productMatchesFragranceFilter(product, filter);
    product.hidden = !matched;
    if (matched) visible += 1;
  });

  const empty = discovery.querySelector('[data-fragrance-empty]');
  if (empty) empty.hidden = visible !== 0;
}

function initFragranceDiscovery(root = document) {
  root.querySelectorAll('[data-fragrance-discovery]').forEach((discovery) => {
    if (discovery.dataset.fragranceDiscoveryReady === 'true') return;
    discovery.dataset.fragranceDiscoveryReady = 'true';

    discovery.querySelectorAll('[data-fragrance-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        setFragranceFilter(discovery, button.dataset.fragranceFilter, button);
      });
    });

    discovery.querySelectorAll('[data-fragrance-compare-row]').forEach((row) => {
      row.addEventListener('mouseenter', () => row.setAttribute('aria-current', 'true'));
      row.addEventListener('mouseleave', () => row.setAttribute('aria-current', 'false'));
      row.addEventListener('focus', () => row.setAttribute('aria-current', 'true'));
      row.addEventListener('blur', () => row.setAttribute('aria-current', 'false'));
    });

    discovery.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setFragranceFilter(discovery, 'all');
    });
  });
}

document.addEventListener('theme::ready', () => initFragranceDiscovery());
if (document.readyState !== 'loading') initFragranceDiscovery();
