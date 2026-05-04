import BasePage from './base-page';

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
