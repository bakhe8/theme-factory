const path = require('path');

const rootDir = path.join(__dirname, '..', '..');
const intelligenceDir = __dirname;
const cacheDir = path.join(intelligenceDir, 'cache');
const rawDir = path.join(cacheDir, 'raw');
const generatedDir = path.join(intelligenceDir, 'generated');

const LLMS_URL = 'https://docs.salla.dev/llms.txt';

const OFFICIAL_THEME_SOURCES = [
  {
    id: 'theme-raed-readme',
    title: 'Theme Raed README',
    url: 'https://raw.githubusercontent.com/SallaApp/theme-raed/master/README.md',
    docsUrl: 'https://github.com/SallaApp/theme-raed',
    tags: ['official-template', 'readme', 'theme-raed'],
  },
  {
    id: 'theme-raed-master-layout',
    title: 'Theme Raed Master Layout',
    url: 'https://raw.githubusercontent.com/SallaApp/theme-raed/master/src/views/layouts/master.twig',
    docsUrl: 'https://docs.salla.dev/421944m0',
    tags: ['official-template', 'layout', 'theme-raed'],
  },
  {
    id: 'theme-raed-cart-page',
    title: 'Theme Raed Cart Page',
    url: 'https://raw.githubusercontent.com/SallaApp/theme-raed/master/src/views/pages/cart.twig',
    docsUrl: 'https://docs.salla.dev/422575m0',
    tags: ['official-template', 'page', 'cart', 'theme-raed'],
  },
  {
    id: 'theme-raed-single-order-page',
    title: 'Theme Raed Single Order Page',
    url: 'https://raw.githubusercontent.com/SallaApp/theme-raed/master/src/views/pages/customer/orders/single.twig',
    docsUrl: 'https://docs.salla.dev/422564m0',
    tags: ['official-template', 'page', 'customer', 'order', 'theme-raed'],
  },
  {
    id: 'theme-raed-wallet-page',
    title: 'Theme Raed Wallet Page',
    url: 'https://raw.githubusercontent.com/SallaApp/theme-raed/master/src/views/pages/customer/wallet.twig',
    docsUrl: 'https://github.com/SallaApp/theme-raed/blob/master/src/views/pages/customer/wallet.twig',
    tags: ['official-template', 'page', 'customer', 'wallet', 'theme-raed'],
  },
];

const OFFICIAL_THEME_REPOS = [
  {
    id: 'theme-raed',
    title: 'Theme Raed',
    treeUrl: 'https://api.github.com/repos/SallaApp/theme-raed/git/trees/master?recursive=1',
    rawBaseUrl: 'https://raw.githubusercontent.com/SallaApp/theme-raed/master/',
    repoUrl: 'https://github.com/SallaApp/theme-raed',
    docsUrl: 'https://docs.salla.dev/845904f0',
    tags: ['official-template', 'theme-raed', 'repo-source'],
    include: [
      /^README\.md$/,
      /^twilight\.json$/,
      /^src\/views\/.*\.twig$/,
      /^src\/assets\/js\/.*\.js$/,
    ],
  },
];

const SEED_DOCS = [
  {
    id: 'theme-technical-review',
    title: 'Technical Theme Review',
    url: 'https://docs.salla.dev/421888m0',
    tags: ['theme', 'review', 'deny', 'critical'],
  },
  {
    id: 'theme-main-requirements',
    title: 'Theme Publish Main Requirements',
    url: 'https://docs.salla.dev/421886m0',
    tags: ['theme', 'review', 'critical'],
  },
  {
    id: 'theme-ux-ui-review',
    title: 'UX/UI Review',
    url: 'https://docs.salla.dev/421887m0',
    tags: ['theme', 'review', 'page-contract', 'critical'],
  },
  {
    id: 'theme-metadata-review',
    title: 'Theme Metadata Review',
    url: 'https://docs.salla.dev/421889m0',
    tags: ['theme', 'metadata', 'critical'],
  },
  {
    id: 'theme-pre-launch-review',
    title: 'Final Salla Theme Review Before Launch',
    url: 'https://docs.salla.dev/421890m0',
    tags: ['theme', 'review', 'pre-launch', 'critical'],
  },
  {
    id: 'theme-setup',
    title: 'Setup Themes',
    url: 'https://docs.salla.dev/421879m0',
    tags: ['theme', 'setup', 'critical'],
  },
  {
    id: 'twilight-json',
    title: 'Twilight.json',
    url: 'https://docs.salla.dev/421921m0',
    tags: ['theme', 'config', 'twilight-json', 'critical'],
  },
  {
    id: 'twilight-flavoured-twig',
    title: 'Twilight Flavoured Twig',
    url: 'https://docs.salla.dev/421929m0',
    tags: ['theme', 'twig', 'helpers', 'filters', 'critical'],
  },
  {
    id: 'theme-hooks',
    title: 'Themes Hooks',
    url: 'https://docs.salla.dev/422552m0',
    tags: ['theme', 'hooks', 'allow'],
  },
  {
    id: 'theme-components-overview',
    title: 'Twilight Theme Components Overview',
    url: 'https://docs.salla.dev/422580m0',
    tags: ['theme', 'components', 'overview', 'component-catalog', 'critical'],
  },
  {
    id: 'web-components-customization',
    title: 'Components Customization',
    url: 'https://docs.salla.dev/422690m0',
    tags: ['theme', 'components', 'customization', 'web-components-customization', 'critical'],
  },
  {
    id: 'twilight-web-components-usage',
    title: 'Twilight Web Components Usage',
    url: 'https://docs.salla.dev/422689m0',
    tags: ['theme', 'components', 'usage', 'web-components-usage', 'critical'],
  },
  {
    id: 'product-card',
    title: 'Salla Product Card',
    url: 'https://docs.salla.dev/422718m0',
    tags: ['component', 'product', 'allow'],
  },
  {
    id: 'add-product',
    title: 'Salla Add Product',
    url: 'https://docs.salla.dev/422692m0',
    tags: ['component', 'product', 'restricted'],
  },
  {
    id: 'comments-component',
    title: 'Comments Component',
    url: 'https://docs.salla.dev/422603m0',
    tags: ['component', 'comments', 'template-component', 'allow'],
  },
  {
    id: 'product-options-components',
    title: 'Product Options Components',
    url: 'https://docs.salla.dev/422605m0',
    tags: ['component', 'product', 'options', 'template-component', 'allow'],
  },
  {
    id: 'product-size-guide',
    title: 'Salla Product Size Guide',
    url: 'https://docs.salla.dev/422721m0',
    tags: ['component', 'product', 'size-guide', 'allow'],
  },
  {
    id: 'verify',
    title: 'Salla Verify',
    url: 'https://docs.salla.dev/422742m0',
    tags: ['component', 'user', 'allow'],
  },
  {
    id: 'wishlist-page',
    title: 'Wishlist Page Guide',
    url: 'https://docs.salla.dev/422565m0',
    tags: ['page', 'customer', 'allow'],
  },
  {
    id: 'notifications-page',
    title: 'Notifications Page',
    url: 'https://docs.salla.dev/422566m0',
    tags: ['page', 'customer', 'allow'],
  },
  {
    id: 'single-order-page',
    title: 'Single Order Page Guide',
    url: 'https://docs.salla.dev/422564m0',
    tags: ['page', 'customer', 'allow'],
  },
  {
    id: 'cart-page',
    title: 'Cart Page Template',
    url: 'https://docs.salla.dev/422575m0',
    tags: ['page', 'cart', 'allow'],
  },
  {
    id: 'loyalty-page',
    title: 'Loyalty Program Page Template',
    url: 'https://docs.salla.dev/422576m0',
    tags: ['page', 'loyalty', 'allow', 'critical'],
  },
  {
    id: 'landing-page',
    title: 'Landing Page Template',
    url: 'https://docs.salla.dev/422579m0',
    tags: ['page', 'landing', 'allow'],
  },
  {
    id: 'home-page',
    title: 'Themes Home Page',
    url: 'https://docs.salla.dev/422558m0',
    tags: ['page', 'home', 'allow', 'critical'],
  },
  {
    id: 'global-variables',
    title: 'Themes Global Variables',
    url: 'https://docs.salla.dev/421938m0',
    tags: ['theme', 'variables', 'allow'],
  },
  {
    id: 'theme-change-log',
    title: 'Twilight Change Log',
    url: 'https://docs.salla.dev/888746f0',
    tags: ['theme', 'changelog', 'critical'],
  },
  {
    id: 'bundle-publish-requirements',
    title: 'Bundle Publish Requirements',
    url: 'https://docs.salla.dev/1945741m0',
    tags: ['bundle', 'review', 'deny'],
  },
];

const DISCOVERY_TERMS = [
  /twilight/i,
  /theme/i,
  /storefront/i,
  /web components?/i,
  /component bundle/i,
  /product card/i,
  /add product/i,
  /verify/i,
  /wishlist/i,
  /notifications/i,
  /global variables/i,
  /hooks/i,
  /review/i,
  /requirements/i,
];

module.exports = {
  DISCOVERY_TERMS,
  LLMS_URL,
  OFFICIAL_THEME_REPOS,
  OFFICIAL_THEME_SOURCES,
  SEED_DOCS,
  cacheDir,
  generatedDir,
  intelligenceDir,
  rawDir,
  rootDir,
};
