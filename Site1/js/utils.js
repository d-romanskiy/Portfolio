/* =====================================================================
   Допоміжні функції, спільні для всіх модулів
   ===================================================================== */

import { projectCards } from './data.js';

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Плавно обмежує частоту виклику під час прокручування. */
export function rafThrottle(fn) {
    let ticking = false;
    return (...args) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            fn(...args);
            ticking = false;
        });
    };
}

/** Екранує текст перед вставкою в HTML-шаблон. */
export function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Число з української локалі: 141.40 -> «141,4». */
export function formatNumber(value, maxDigits = 1) {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (Number.isNaN(num)) return '';
    return num.toLocaleString('uk-UA', { maximumFractionDigits: maxDigits });
}

/** Правильна форма іменника: 1 день / 2 дні / 5 днів. */
export function plural(count, one, few, many) {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
}

/** Каталог потрібен кільком модулям (сітка, лічильники, підбір будинку) — дані статичні. */
export function loadProjects() {
    return Promise.resolve(projectCards());
}

/* --- Блокування прокручування сторінки під модалкою ------------------ */
let lockCount = 0;
let savedScrollY = 0;

export function lockScroll() {
    if (lockCount === 0) {
        savedScrollY = window.scrollY;
        const scrollbar = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = scrollbar > 0 ? `${scrollbar}px` : '';
        document.body.classList.add('is-locked');
    }
    lockCount += 1;
}

export function unlockScroll() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.body.classList.remove('is-locked');
        document.body.style.paddingRight = '';
        window.scrollTo({ top: savedScrollY, behavior: 'auto' });
    }
}

/* --- Утримання фокуса всередині діалогу ------------------------------ */
const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Замикає Tab-навігацію в межах контейнера.
 * Повертає функцію, яка знімає обробник.
 */
export function trapFocus(container) {
    const onKeydown = (event) => {
        if (event.key !== 'Tab') return;
        const items = $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    container.addEventListener('keydown', onKeydown);
    return () => container.removeEventListener('keydown', onKeydown);
}

/** Прокручування до елемента з урахуванням висоти закріпленої шапки. */
export function scrollToSection(target) {
    const element = typeof target === 'string' ? $(target) : target;
    if (!element) return;
    const headerHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10
    ) || 76;
    const top = element.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({
        top,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
}
