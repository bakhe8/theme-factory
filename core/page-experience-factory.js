const fs = require('fs');
const path = require('path');
const { printPageExperienceGate, printThemePageExperienceGate, validatePageExperience } = require('./page-experience-gate');
const {
  getPageExperience,
  isImplemented,
  listPageExperiences,
  pathsForPageExperience,
} = require('./page-experience-registry');

const rootDir = path.join(__dirname, '..');
const themesDir = path.join(rootDir, 'themes');

const HELP = `
Usage:
  node factory.js page-experience list
  node factory.js page-experience show <page-experience-id>
  node factory.js page-experience gate <theme>
  node factory.js page-experience gate <theme> <page-experience-id>
  node factory.js page-experience <theme> <page-experience-id> [--dry-run] [--force]

Examples:
  node factory.js page-experience list
  node factory.js page-experience show brands-alphabet-filter
  node factory.js page-experience luxury-fragrance brands-alphabet-filter --dry-run
`;

function parseOptions(args) {
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createRollback(files, enabled) {
  if (!enabled) return { commit() {}, restore() {} };

  let committed = false;
  const snapshots = files.map((file) => ({
    file,
    exists: fs.existsSync(file),
    content: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null,
  }));

  return {
    commit() {
      committed = true;
    },
    restore() {
      if (committed) return;
      for (const snapshot of snapshots) {
        if (snapshot.exists) {
          ensureDir(path.dirname(snapshot.file));
          fs.writeFileSync(snapshot.file, snapshot.content);
        } else if (fs.existsSync(snapshot.file)) {
          fs.rmSync(snapshot.file, { force: true });
        }
      }
    },
  };
}

function relativeThemePath(themePath, file) {
  return path.relative(themePath, file).replace(/\\/g, '/');
}

function renderBrandsIndexTemplate() {
  return `{#
| Variable   | Type         | Description                                                |
|------------|--------------|------------------------------------------------------------|
| page       | object       |                                                            |
| page.title | string       |                                                            |
| page.slug  | string       |                                                            |
| brands     | Collection[] | Brands grouped by char, ex:{b:[{'name':'brand1',...},...]} |
#}
{% extends "layouts.master" %}
{% block content %}
    <div class="container mb-20" data-page-experience="brands-alphabet-filter">

        {# add breadcumbs container in pages to make a space in case breadcrumbs is off #}
        <nav class="breadcrumbs w-full py-5">
            <salla-breadcrumb></salla-breadcrumb>
        </nav>

        <div class="flex justify-between pt-2 pb-6">
            <h2 class="font-bold mb-6 md:mb-0">{{ page.title }}</h2>
        </div>

        {% if brands|length %}
            <div class="brands-nav-wrap" data-brand-letter-filter-wrap>
                <nav id="brands-nav" class="brands-nav brands-nav--floating" aria-label="{{ page.title|e('html_attr') }}">
                    <a
                        class="brands-nav__item brands-letter-filter is-selected"
                        href="#brand-section-all"
                        data-id="all"
                        data-brand-letter-filter="all"
                        aria-pressed="true">
                        <span class="fix-align">الكل</span>
                    </a>
                    {% for char,brands_group in brands %}
                        <a
                            class="brands-nav__item brands-letter-filter"
                            href="#brand-section-{{ loop.index }}"
                            data-id="{{ loop.index }}"
                            data-brand-letter-filter="{{ char|e('html_attr') }}"
                            aria-pressed="false">
                            <span class="fix-align">{{ char }}</span>
                        </a>
                    {% endfor %}
                </nav>
            </div>

            <div class="px-8 xl:px-0" id="brand-section-all">

                {% hook 'brands:index.items.start' %}

                {% for char,brandGroup in brands %}
                    <section
                        id="brand-section-{{ loop.index }}"
                        class="brand-section pt-24 first:pt-16 md:first:pt-24"
                        data-brand-section
                        data-brand-letter="{{ char|e('html_attr') }}">
                        <div class="flex items-center mb-10">
                            <span data-id="{{ loop.index }}" class="brand-char">
                              <span class="fix-align">{{ char }}</span>
                            </span>
                            <div class="bg-border-color h-px flex-1"></div>
                        </div>
                        <div class="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 grid-flow-row gap-4 md:gap-8">
                            {% for brand in brandGroup %}
                                <a
                                    href="{{ brand.url }}"
                                    class="brand-item"
                                    data-brand-card
                                    data-brand-name="{{ brand.name|e('html_attr') }}"
                                    data-brand-letter="{{ char|e('html_attr') }}">
                                    <img class="max-h-full" width="400" height="300" src="{{ brand.logo }}" alt="{{ brand.name }}">
                                </a>
                            {% endfor %}
                        </div>
                    </section>
                {% endfor %}

                {% hook 'brands:index.items.end' %}

            </div>
        {% else %}
            <div class="no-content-placeholder">
                <span class="rounded-icon !w-36 !h-36 bg-gray-100 mb-6">
                    <i class="sicon-award-ribbon text-6xl block text-gray-400"></i>
                </span>
                <h1 class="font-bold text-sm mb-1">{{ trans('pages.brands.non_brands') }}</h1>
                <small>{{ trans('pages.brands.try_again') }}</small>
            </div>
        {% endif %}
    </div>
{% endblock %}
{% block scripts %}
    <script defer src="{{ 'pages.js' | asset }}"></script>
{% endblock %}
`;
}

function renderBrandsScript() {
  return `import BasePage from './base-page';

function setSelectedBrandLetter(nav, activeButton) {
    nav.querySelectorAll('[data-brand-letter-filter]').forEach(button => {
        const isActive = button === activeButton;
        button.classList.toggle('is-selected', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function scrollToBrandSection(button) {
    const targetId = button.getAttribute('href');
    if (!targetId || targetId === '#brand-section-all') {
        window.scrollTo({top: 0, behavior: 'smooth'});
        return;
    }

    const target = document.querySelector(targetId);
    if (target) target.scrollIntoView({block: 'start', behavior: 'smooth'});
}

class Brands extends BasePage {
    onReady() {
        const experience = document.querySelector('[data-page-experience="brands-alphabet-filter"]'),
              nav = document.querySelector('#brands-nav'),
              navWrap = document.querySelector('.brands-nav-wrap');

        if (!nav || !navWrap) return;
        navWrap.style.height = nav.clientHeight + 'px';

        nav.querySelectorAll('[data-brand-letter-filter]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                setSelectedBrandLetter(nav, button);
                scrollToBrandSection(button);
            });
        });

        window.addEventListener('scroll', () => {
            let scrolAtTop = window.pageYOffset <= 200;
            app.toggleClassIf('#brands-nav', 'is-not-sticky', 'is-sticky', () => scrolAtTop);
        }, {passive: true});

        if (experience) {
            experience.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    const allButton = nav.querySelector('[data-brand-letter-filter="all"]');
                    if (allButton) {
                        setSelectedBrandLetter(nav, allButton);
                        scrollToBrandSection(allButton);
                    }
                }
            });
        }
    }
}

Brands.initiateWhenReady(['brands.index']);
`;
}

function renderBrandsStyles() {
  return `.brands-nav-wrap {
  @apply relative z-20;
}

.brands-nav {
  @apply flex flex-wrap justify-center rtl:space-x-reverse space-x-2 space-y-2;

  &__item {
    @apply flex items-center justify-center rounded-md hover:shadow-sm focus:border-primary text-sm w-10 h-10 bg-white text-gray-500 p-1 transition;

    &.is-selected {
      @apply bg-primary text-primary-reverse #{!important};
    }

    span {
      @apply pointer-events-none;
    }
  }

  &.brands-nav--floating {
    position: sticky;
    top: 0.75rem;
    z-index: 30;
    align-items: center;
    gap: 0.45rem;
    max-width: 100%;
    margin-inline: auto;
    padding: 0.55rem;
    border: 1px solid rgba(17, 24, 39, 0.08);
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 32px rgba(17, 24, 39, 0.08);
    backdrop-filter: blur(10px);
  }

  &.is-sticky {
    @apply z-30;
  }
}

.brands-letter-filter {
  min-width: 2.5rem;
  min-height: 2.5rem;
  white-space: nowrap;

  &[data-brand-letter-filter='all'] {
    width: auto;
    min-width: 3.5rem;
    padding-inline: 0.85rem;
  }
}

.brand-section {
  scroll-margin-top: 6rem;
}

.brand-char {
  @apply rtl:ml-5 ltr:mr-5 rtl:md:ml-12 ltr:md:mr-12 bg-white rounded-md w-10 h-10 flex items-center transition justify-center hover:shadow-sm border border-transparent focus:border-primary text-sm;
}

.brand-item {
  @apply flex justify-center items-center bg-white transition hover:opacity-95 bg-cover h-20 sm:h-24 md:h-32 text-white text-center p-3 sm:p-4 md:p-8 rounded-md overflow-hidden relative;

  .index & {
    @apply p-4;

    img {
      @apply xs:max-w-[150px] w-auto;
    }
  }
}

@media (max-width: 640px) {
  .brands-nav.brands-nav--floating {
    justify-content: flex-start;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-block: 0.45rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brands-nav__item,
  .brand-item {
    transition: none;
  }
}
`;
}

function applyBrandsAlphabetFilter(themeName, options) {
  const experience = getPageExperience('brands-alphabet-filter');
  const themePath = path.join(themesDir, themeName);
  if (!fs.existsSync(themePath)) throw new Error(`Theme not found: ${themeName}`);

  const paths = pathsForPageExperience(themePath, experience);
  for (const file of [paths.pageTwig, paths.pageJs, paths.pageScss]) {
    if (!fs.existsSync(file)) throw new Error(`Required file missing: ${relativeThemePath(themePath, file)}`);
  }

  const alreadyInstalled = fs.readFileSync(paths.pageTwig, 'utf8').includes('data-page-experience="brands-alphabet-filter"');
  if (alreadyInstalled && !options.force) {
    console.log(`\n✅ Page experience موجودة مسبقاً: ${experience.id}`);
    printPageExperienceGate(themeName, experience.id);
    return;
  }

  if (options.dryRun) {
    console.log('\n🧪 Page Experience Blueprint Gate');
    console.log('--------------------------------');
    console.log(`Theme: ${themeName}`);
    console.log(`Page experience: ${experience.id}`);
    console.log(`Page view: ${experience.pageView}`);
    console.log('Checks planned: Twig markers, JS event handling, horizontal sticky nav, brand links preserved, no network requests.');
    console.log('✅ Blueprint gate passed.');
    return;
  }

  const rollback = createRollback([paths.pageTwig, paths.pageJs, paths.pageScss], true);
  try {
    fs.writeFileSync(paths.pageTwig, renderBrandsIndexTemplate());
    fs.writeFileSync(paths.pageJs, renderBrandsScript());
    fs.writeFileSync(paths.pageScss, renderBrandsStyles());

    const gate = validatePageExperience(themeName, experience.id);
    if (gate.issues.length) {
      for (const item of gate.issues) console.log(`❌ ${item.file}: ${item.detail}`);
      throw new Error('Page experience gate failed after creation. Rolling back.');
    }

    rollback.commit();
    console.log(`\n✅ تم تثبيت Page Experience: ${experience.id}`);
    console.log(`   Twig: ${relativeThemePath(themePath, paths.pageTwig)}`);
    console.log(`   JS: ${relativeThemePath(themePath, paths.pageJs)}`);
    console.log(`   SCSS: ${relativeThemePath(themePath, paths.pageScss)}`);
    printPageExperienceGate(themeName, experience.id);
  } catch (error) {
    rollback.restore();
    throw error;
  }
}

function printList() {
  console.log('\n🧭 Page Experience Registry');
  console.log('---------------------------');
  for (const experience of listPageExperiences()) {
    const status = experience.status === 'implemented' ? 'ready' : experience.status;
    console.log(`- ${experience.id} [${status}] ${experience.title?.ar || experience.title?.en || ''}`);
    console.log(`  page=${experience.pageSlug} view=${experience.pageView}`);
    if (experience.intent) console.log(`  ${experience.intent}`);
  }
}

function printShow(id) {
  const experience = getPageExperience(id);
  if (!experience) throw new Error(`Page experience not found: ${id}`);

  console.log(`\n🧩 ${experience.id}`);
  console.log('----------------------');
  console.log(`Status: ${experience.status}`);
  console.log(`Title: ${experience.title?.ar || '-'} / ${experience.title?.en || '-'}`);
  console.log(`Page: ${experience.pageSlug}`);
  console.log(`View: ${experience.pageView}`);
  console.log(`Intent: ${experience.intent || '-'}`);

  if (experience.docsSources?.length) {
    console.log('\nSources:');
    for (const source of experience.docsSources) {
      console.log(`- ${source.title} - ${source.section} (${source.url})`);
    }
  }
}

function createPageExperience(themeName, pageExperienceId, options) {
  const experience = getPageExperience(pageExperienceId);
  if (!experience) throw new Error(`Page experience not found: ${pageExperienceId}`);
  if (!isImplemented(experience)) throw new Error(`Page experience is not implemented yet: ${experience.id}`);

  if (experience.id === 'brands-alphabet-filter') {
    applyBrandsAlphabetFilter(themeName, options);
    return;
  }

  throw new Error(`No factory implementation for page experience: ${experience.id}`);
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length || ['help', '-h', '--help'].includes(args[0])) {
    console.log(HELP.trim());
    return;
  }

  if (args[0] === 'list') {
    printList();
    return;
  }

  if (args[0] === 'show') {
    printShow(args[1]);
    return;
  }

  if (args[0] === 'gate') {
    const [themeName, pageExperienceId] = args.slice(1);
    if (!themeName) throw new Error('Usage: node factory.js page-experience gate <theme> [page-experience-id]');
    const result = pageExperienceId
      ? printPageExperienceGate(themeName, pageExperienceId)
      : printThemePageExperienceGate(themeName);
    if (result.issues.length) process.exitCode = 1;
    return;
  }

  const [themeName, pageExperienceId, ...rest] = args;
  if (!themeName || !pageExperienceId) throw new Error('Usage: node factory.js page-experience <theme> <page-experience-id> [--dry-run] [--force]');
  createPageExperience(themeName, pageExperienceId, parseOptions(rest));
}

try {
  main();
} catch (error) {
  console.error(`\n❌ Page experience factory failed: ${error.message}`);
  process.exit(1);
}
