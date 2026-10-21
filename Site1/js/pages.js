/* =====================================================================
   Дрібна інтерактивність внутрішніх сторінок:
   каскадна поява чипів і модальні вікна заявок.
   ===================================================================== */

import { $, $$, lockScroll, unlockScroll, trapFocus } from './utils.js';

/** Проставляє --i, щоб чипи й теги з'являлися каскадом. */
function stampIndexes() {
    ['.case__tags', '.tag-cloud', '.eco-grid'].forEach((selector) => {
        $$(selector).forEach((group) => {
            $$(':scope > *', group).forEach((item, i) => item.style.setProperty('--i', i));
        });
    });
}


/* =====================================================================
   Модальні вікна сторінок: заявка та перевірка житлових програм.
   Одна пара кнопок на всі сторінки: [data-open-lead] і [data-open-check].
   ===================================================================== */

const MODALS = ['#leadModal', '#checkModal'];

let modalTrap = null;
let modalLastFocus = null;
let modalFocusTimer = null;

export function openModal(id) {
    const modal = $(id);
    if (!modal || modal.classList.contains('is-open')) return;

    modalLastFocus = document.activeElement;
    modal.classList.add('is-open');

    lockScroll();
    modalTrap = trapFocus(modal);
    modalFocusTimer = setTimeout(() => $('.modal__dialog', modal)?.focus(), 320);
}

function closeModal(id) {
    const modal = $(id);
    if (!modal || !modal.classList.contains('is-open')) return;

    modal.classList.remove('is-open');
    unlockScroll();

    clearTimeout(modalFocusTimer);
    if (modalTrap) {
        modalTrap();
        modalTrap = null;
    }

    if (modalLastFocus && document.body.contains(modalLastFocus)) modalLastFocus.focus();
}

const closeAllModals = () => MODALS.forEach(closeModal);

function initModals() {
    if (!MODALS.some((id) => $(id))) return;

    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-open-lead]')) {
            event.preventDefault();
            closeModal('#checkModal');
            openModal('#leadModal');
            return;
        }
        if (event.target.closest('[data-open-check]')) {
            event.preventDefault();
            closeModal('#leadModal');
            openModal('#checkModal');
            return;
        }
        if (event.target.closest('[data-close-check]')) closeAllModals();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAllModals();
    });
}

export function initPages() {
    stampIndexes();
    initModals();
}
