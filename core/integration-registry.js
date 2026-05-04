const INTEGRATIONS = {
  'image-search-addon': {
    id: 'image-search-addon',
    aliases: ['image-search', 'image_search', 'visual-search', 'visual_search'],
    title: {
      ar: 'إضافة البحث بالصورة',
      en: 'Image Search Addon',
    },
    type: 'external-addon',
    status: 'requires-contract',
    intent: 'تمثيل ميزة بحث بالصورة مصدرها إضافة أو خدمة مفعلة على متجر سلة، بدون اختراع API داخل الثيم.',
    allowedPlacements: ['header-search', 'search-page', 'product-listing'],
    requiredEvidenceFields: ['source_url', 'handled_by', 'placement'],
    forbiddenThemeBehavior: [
      'رفع الصور إلى API غير موثق من الثيم',
      'طلب شبكة لكل منتج لمحاكاة البحث بالصورة',
      'إضافة سكربت خارجي غير مثبت من التاجر أو سلة',
    ],
  },
};

function normalizeIntegrationId(value) {
  const id = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  for (const integration of Object.values(INTEGRATIONS)) {
    if (integration.id === id || (integration.aliases || []).includes(id)) return integration.id;
  }

  return id;
}

function getIntegration(id) {
  return INTEGRATIONS[normalizeIntegrationId(id)] || null;
}

function listIntegrations() {
  return Object.values(INTEGRATIONS);
}

module.exports = {
  getIntegration,
  listIntegrations,
  normalizeIntegrationId,
};
