/* =====================================================================
   Анімації: поява при прокручуванні, лічильники, паралакс героя,
   безшовний рухомий рядок
   ===================================================================== */

import { $, $$, rafThrottle, prefersReducedMotion, loadProjects, plural } from './utils.js';

/* --- Поява елементів при прокручуванні -------------------------------- */
let revealObserver = null;

function ensureRevealObserver() {
    if (revealObserver) return revealObserver;

    revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    return revealObserver;
}

/** Підключає спостерігач до нових елементів (у т. ч. відрендерених динамічно). */
export function observeReveals(scope = document) {
    const targets = $$('[data-reveal], .reveal-img', scope);

    if (prefersReducedMotion()) {
        targets.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const observer = ensureRevealObserver();
    targets.forEach((el) => {
        if (el.classList.contains('is-visible')) return;
        observer.observe(el);
    });
}

/* --- Лічильники --------------------------------------------------------- */
function animateCounter(el) {
    const target = Number(el.dataset.count || 0);

    if (prefersReducedMotion()) {
        el.textContent = String(target);
        return;
    }

    const duration = 1500;
    const start = performance.now();

    const step = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        // easeOutExpo — швидкий старт, м'яке гальмування
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        el.textContent = String(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

/**
 * Кількість проєктів на банерах рахуємо з каталогу: додали об'єкт у базу —
 * цифра на сайті змінилась сама. data-catalog-count="PUBLIC" рахує лише
 * один розділ; data-catalog-plural="один|два|п'ять" узгоджує підпис.
 */
async function fillCatalogCounts() {
    const live = $$('[data-catalog-count]');
    if (live.length === 0) return;
    try {
        const projects = await loadProjects();
        live.forEach((el) => {
            const purpose = el.dataset.catalogCount;
            const count = purpose
                ? projects.filter((p) => p.purpose === purpose).length
                : projects.length;
            if (el.hasAttribute('data-count')) el.dataset.count = String(count);
            else el.textContent = String(count);

            const label = el.closest('[data-catalog-scope]')?.querySelector('[data-catalog-plural]');
            if (label) {
                const [one, few, many] = label.dataset.catalogPlural.split('|');
                label.textContent = plural(count, one, few, many);
            }
        });
    } catch {
        // Лишаються числа з розмітки
    }
}

function initCounters() {
    const counters = $$('[data-count]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            });
        },
        { threshold: 0.5 }
    );

    // Лічильники каталогу стартують, коли відомо справжнє число
    const live = counters.filter((el) => el.hasAttribute('data-catalog-count'));
    counters.filter((el) => !live.includes(el)).forEach((el) => observer.observe(el));
    if (live.length > 0) {
        catalogCounts.then(() => live.forEach((el) => observer.observe(el)));
    }
}

let catalogCounts = Promise.resolve();

/* --- Паралакс героя ------------------------------------------------------ */
function initHeroParallax() {
    const media = $('#heroMedia');
    if (!media || prefersReducedMotion()) return;

    const image = media.querySelector('img');
    if (!image) return;

    const update = rafThrottle(() => {
        const y = window.scrollY;
        if (y > window.innerHeight * 1.2) return;
        const shift = y * 0.28;
        const scale = 1 + Math.min(0.06, y / 8000);
        image.style.transform = `translate3d(0, ${shift}px, 0) scale(${scale})`;
    });

    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* --- Безшовний рухомий рядок ---------------------------------------------- */
function initTicker() {
    const track = $('#ticker');
    if (!track) return;

    // Дублюємо вміст, щоб анімація translateX(-50%) виглядала безперервною
    const items = Array.from(track.children);
    items.forEach((item) => track.appendChild(item.cloneNode(true)));
}

export function initAnimations() {
    catalogCounts = fillCatalogCounts();
    initTicker();
    observeReveals();
    initCounters();
    initHeroParallax();
}
