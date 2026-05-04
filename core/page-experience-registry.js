const path = require('path');

const PAGE_EXPERIENCES = {
  'brands-alphabet-filter': {
    id: 'brands-alphabet-filter',
    status: 'implemented',
    title: {
      ar: 'فلتر الماركات الأبجدي العائم',
      en: 'Floating Brand Alphabet Filter',
    },
    pageView: 'pages/brands/index',
    pageSlug: 'brands.index',
    intent: 'تحسين صفحة الماركات عبر أزرار حروف أفقية عائمة تقفز إلى مجموعات البراندات بدون طلبات شبكة أو تغيير روابط البراندات.',
    docsSources: [
      {
        title: 'Brands Page',
        url: 'https://docs.salla.dev/422570m0',
        section: 'Usage / brands grouped by char',
      },
      {
        title: 'Raed brands index template',
        url: 'https://github.com/SallaApp/theme-raed/blob/master/src/views/pages/brands/index.twig',
        section: 'Official open-source theme page implementation',
      },
    ],
    gate: {
      specsKey: 'brands_alphabet_filter',
      twigMarkers: [
        'data-page-experience="brands-alphabet-filter"',
        'data-brand-letter-filter',
        'data-brand-section',
        'data-brand-card',
        'data-brand-name',
        'brand.url',
        'brands|length',
      ],
      jsMarkers: [
        'data-page-experience="brands-alphabet-filter"',
        'data-brand-letter-filter',
        'aria-pressed',
        'scrollIntoView',
        'Escape',
        'addEventListener',
      ],
      cssMarkers: [
        '.brands-nav--floating',
        '.brands-letter-filter',
        '.brand-section',
        'position: sticky',
        'prefers-reduced-motion',
      ],
      maxAddedSourceBytes: 42 * 1024,
    },
  },
};

function normalizePageExperienceId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPageExperience(id) {
  return PAGE_EXPERIENCES[normalizePageExperienceId(id)] || null;
}

function listPageExperiences() {
  return Object.values(PAGE_EXPERIENCES);
}

function isImplemented(experience) {
  return experience?.status === 'implemented';
}

function pathsForPageExperience(themePath, experience) {
  return {
    pageTwig: path.join(themePath, 'src', 'views', `${experience.pageView}.twig`),
    pageJs: path.join(themePath, 'src', 'assets', 'js', 'brands.js'),
    pageScss: path.join(themePath, 'src', 'assets', 'styles', '04-components', 'brands.scss'),
  };
}

module.exports = {
  getPageExperience,
  isImplemented,
  listPageExperiences,
  normalizePageExperienceId,
  pathsForPageExperience,
};
