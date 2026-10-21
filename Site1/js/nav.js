/* =====================================================================
   Навігація: закріплена шапка, панель контактів,
   активний пункт меню, навігація по розділах сторінки
   ===================================================================== */

import { $, $$, rafThrottle, lockScroll, unlockScroll, trapFocus, scrollToSection } from './utils.js';

/* --- Закріплена шапка + прогрес прокручування ------------------------ */
function initHeader() {
    const header = $('#header');
    const progress = $('#scrollProgress');
    if (!header) return;

    const update = rafThrottle(() => {
        const y = window.scrollY;
        header.classList.toggle('is-stuck', y > 32);

        if (progress) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const ratio = max > 0 ? Math.min(1, y / max) : 0;
            progress.style.transform = `scaleX(${ratio})`;
        }
    });

    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* --- Панель контактів -------------------------------------------------- */
let panelReleaseTrap = null;
let panelLastFocus = null;
let panelFocusTimer = null;

export function openContactPanel(projectSlug = '', projectName = '') {
    const panel = $('#contactPanel');
    const backdrop = $('#panelBackdrop');
    // Повторне відкриття вже відкритої панелі подвоїло б блокування прокручування
    if (!panel || !backdrop || panel.classList.contains('is-open')) return;

    panelLastFocus = document.activeElement;

    const projectField = $('#pf-project');
    const messageField = $('#pf-message');
    if (projectField) projectField.value = projectSlug || '';
    if (messageField && projectName && !messageField.value) {
        messageField.value = `Цікавить проєкт «${projectName}». `;
    }

    panel.classList.add('is-open');
    backdrop.classList.add('is-open');

    lockScroll();
    panelReleaseTrap = trapFocus(panel);
    panelFocusTimer = setTimeout(() => $('#pf-name', panel)?.focus(), 420);
}

export function closeContactPanel() {
    const panel = $('#contactPanel');
    const backdrop = $('#panelBackdrop');
    if (!panel || !panel.classList.contains('is-open')) return;

    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    unlockScroll();

    clearTimeout(panelFocusTimer);
    if (panelReleaseTrap) {
        panelReleaseTrap();
        panelReleaseTrap = null;
    }

    if (panelLastFocus && document.body.contains(panelLastFocus)) {
        panelLastFocus.focus();
    }
}

function initContactPanel() {
    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-open-contact]')) {
            event.preventDefault();
            openContactPanel();
        }
        if (event.target.closest('[data-close-contact]') || event.target.id === 'panelBackdrop') {
            closeContactPanel();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeContactPanel();
    });
}

/* --- Активний пункт навігації ------------------------------------------ */
function initScrollSpy() {
    const links = $$('#navList .nav__link');
    if (links.length === 0) return;

    const sections = links
        .map((link) => {
            const id = link.getAttribute('href');
            const section = id && id.startsWith('#') ? $(id) : null;
            return section ? { link, section } : null;
        })
        .filter(Boolean);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const match = sections.find((item) => item.section === entry.target);
                if (!match) return;
                links.forEach((link) => link.classList.remove('is-active'));
                match.link.classList.add('is-active');
            });
        },
        { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach(({ section }) => observer.observe(section));
}

/* --- Плавне прокручування для якорів ------------------------------------ */
function initSmoothAnchors() {
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('#/')) return;

        const target = $(href);
        if (!target) return;

        event.preventDefault();
        scrollToSection(target);
        history.replaceState(null, '', href);
    });
}

/* --- Рік у підвалі ------------------------------------------------------- */
function initYear() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
}

export function initNav() {
    initHeader();
    initContactPanel();
    initScrollSpy();
    initSmoothAnchors();
    initYear();
}
