/* =====================================================================
   Меню сайту — бічна панель, дзеркальна до панелі контактів.

   Перший рівень — сторінки сайту. Поточна сторінка розгорнута й показує
   свої розділи; інші розгортаються стрілкою, а назва веде на сторінку.
   Пункти беруться з menu-data.js — одного файлу на всі сторінки.
   ===================================================================== */

import { $, $$, esc, lockScroll, unlockScroll, trapFocus, scrollToSection, prefersReducedMotion } from './utils.js';
import { MENU } from './menu-data.js';

let releaseTrap = null;
let lastFocus = null;
let focusTimer = null;

function isOpen(panel) {
    return panel.classList.contains('is-open');
}

function open(btn, panel, backdrop) {
    if (isOpen(panel)) return;
    lastFocus = document.activeElement;

    panel.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');

    lockScroll();
    releaseTrap = trapFocus(panel);
    focusTimer = setTimeout(() => panel.focus(), 420);
}

function close(btn, panel, backdrop, restoreFocus = true) {
    if (!isOpen(panel)) return;

    panel.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    unlockScroll();

    clearTimeout(focusTimer);
    if (releaseTrap) {
        releaseTrap();
        releaseTrap = null;
    }

    if (restoreFocus && lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
}

/* --- Побудова меню ------------------------------------------------------ */

/** Розділ: на своїй сторінці — якір, на чужій — посилання на сторінку з якорем. */
function sectionItem(group, isCurrent, [id, icon, name, desc]) {
    const href = isCurrent ? `#${id}` : `${group.href}#${id}`;
    return `
        <li>
            <a class="page-nav__item" href="${esc(href)}">
                <span class="page-nav__icon" aria-hidden="true">
                    <svg width="20" height="20"><use href="#i-${esc(icon)}"></use></svg>
                </span>
                <span class="page-nav__body-text">
                    <span class="page-nav__name">${esc(name)}</span>
                    <span class="page-nav__desc">${esc(desc)}</span>
                </span>
            </a>
        </li>`;
}

function renderMenu(body) {
    const page = document.body.dataset.page;

    body.innerHTML = `<ul class="menu">${MENU.map((group, i) => {
        const isCurrent = group.page === page;
        const listId = `menu-${group.page}`;
        return `
            <li class="menu__group${isCurrent ? ' is-current is-open' : ''}" style="--i:${i}">
                <div class="menu__row">
                    <a class="menu__page" href="${esc(group.href)}"${isCurrent ? ' aria-current="page"' : ''}>${esc(group.title)}</a>
                    <button class="menu__toggle" type="button" aria-expanded="${isCurrent}"
                            aria-controls="${listId}" aria-label="Розділи сторінки «${esc(group.title)}»">
                        <svg width="16" height="16" aria-hidden="true"><use href="#i-chevron-right"></use></svg>
                    </button>
                </div>
                <div class="menu__sections" id="${listId}">
                    <ul class="menu__list">
                        ${group.sections.map((section) => sectionItem(group, isCurrent, section)).join('')}
                    </ul>
                </div>
            </li>`;
    }).join('')}</ul>`;
}

function setGroup(group, expanded) {
    group.classList.toggle('is-open', expanded);
    group.querySelector('.menu__toggle')?.setAttribute('aria-expanded', String(expanded));
}

/**
 * Відкрита лише одна сторінка: інакше на «Про нас» із десятьма розділами
 * решта сторінок ховається нижче екрана. Після розгортання показуємо
 * групу від її назви — вже після того, як сусідня встигла згорнутись.
 */
function toggleGroup(group, body) {
    const expanding = !group.classList.contains('is-open');
    $$('.menu__group.is-open', body).forEach((other) => setGroup(other, false));
    setGroup(group, expanding);
    if (!expanding) return;

    setTimeout(() => {
        const top = group.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
        body.scrollTo({ top: Math.max(0, top - 4), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, 300);
}

/** Підсвічує пункт панелі, який відповідає видимому розділу. */
function spySections(links) {
    const items = links
        .map((link) => {
            const href = link.getAttribute('href') || '';
            const section = href.startsWith('#') && href.length > 1 ? $(href) : null;
            return section ? { link, section } : null;
        })
        .filter(Boolean);

    if (items.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const match = items.find((item) => item.section === entry.target);
                if (!match) return;
                items.forEach(({ link }) => link.classList.remove('is-active'));
                match.link.classList.add('is-active');
            });
        },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );

    items.forEach(({ section }) => observer.observe(section));
}

export function initPageNav() {
    const btn = $('#pageNavBtn');
    const panel = $('#pageNav');
    const body = $('#pageNavBody');
    if (!btn || !panel || !body) return;

    const backdrop = $('#pageNavBackdrop');
    renderMenu(body);

    btn.addEventListener('click', () => {
        if (isOpen(panel)) close(btn, panel, backdrop);
        else open(btn, panel, backdrop);
    });

    panel.addEventListener('click', (event) => {
        if (event.target.closest('[data-close-page-nav]')) {
            close(btn, panel, backdrop);
            return;
        }

        // «Залишити заявку» відкриває панель контактів — цю закриваємо
        if (event.target.closest('[data-open-contact]')) {
            close(btn, panel, backdrop, false);
            return;
        }

        const toggle = event.target.closest('.menu__toggle');
        if (toggle) {
            toggleGroup(toggle.closest('.menu__group'), body);
            return;
        }

        const link = event.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href') || '';
        close(btn, panel, backdrop, false);

        // Назва поточної сторінки — повертаємо на її початок, а не перезавантажуємо
        if (link.matches('[aria-current="page"]')) {
            event.preventDefault();
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 240);
            return;
        }

        // Внутрішні якорі гортаємо самі, решту посилань лишаємо браузеру
        if (href.startsWith('#') && href.length > 1) {
            event.preventDefault();
            setTimeout(() => {
                scrollToSection(href);
                history.replaceState(null, '', href);
            }, 240);
        }
    });

    backdrop?.addEventListener('click', () => close(btn, panel, backdrop));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close(btn, panel, backdrop);
    });

    spySections($$('.page-nav__item', panel));
}

/** Підсвічує пункт верхнього меню, що відповідає поточній сторінці. */
export function initActiveSection() {
    const page = document.body.dataset.page;
    if (!page) return;
    $$(`[data-nav="${page}"]`).forEach((link) => link.classList.add('is-active'));
}
