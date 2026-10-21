/* =====================================================================
   Форми заявок: клієнтська валідація + демо-відправка (без бекенду)
   ===================================================================== */

import { $, $$ } from './utils.js';

const PHONE_RE = /^[+()\-\s\d]{9,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setFieldError(form, name, message) {
    const control = form.querySelector(`[name="${name}"]`);
    if (!control) return;
    const field = control.closest('.field');
    if (!field) return;

    field.classList.toggle('has-error', Boolean(message));
    control.setAttribute('aria-invalid', message ? 'true' : 'false');

    const errorNode = field.querySelector(`[data-error-for="${name}"]`);
    if (errorNode && message) errorNode.textContent = message;
}

function clearErrors(form) {
    $$('.field', form).forEach((field) => field.classList.remove('has-error'));
    $$('[aria-invalid]', form).forEach((el) => el.setAttribute('aria-invalid', 'false'));
}

function validate(form, data) {
    const errors = {};

    if (!data.name || data.name.trim().length < 2) {
        errors.name = "Вкажіть, будь ласка, ваше ім'я";
    }
    if (!data.phone || !PHONE_RE.test(data.phone.trim())) {
        errors.phone = 'Перевірте формат номера телефону';
    }
    if (data.email && !EMAIL_RE.test(data.email.trim())) {
        errors.email = 'Перевірте формат e-mail';
    }

    Object.entries(errors).forEach(([name, message]) => setFieldError(form, name, message));
    return errors;
}

function showStatus(statusNode, type, message) {
    if (!statusNode) return;
    statusNode.className = `form__status is-visible form__status--${type}`;
    statusNode.textContent = message;
}

function hideStatus(statusNode) {
    if (!statusNode) return;
    statusNode.className = 'form__status';
    statusNode.textContent = '';
}

function bindForm(form) {
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    const submit = form.querySelector('[type="submit"]');
    const status = form.querySelector('.form__status');
    if (!submit) return;

    // Прибираємо помилку, щойно користувач почав виправляти поле
    form.addEventListener('input', (event) => {
        const field = event.target.closest('.field');
        if (field) field.classList.remove('has-error');
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideStatus(status);
        clearErrors(form);

        const data = Object.fromEntries(new FormData(form).entries());

        // Додаткові кваліфікаційні поля дописуємо в текст повідомлення:
        // бекенд приймає фіксований набір полів ліда.
        const extra = $$('[data-extra]', form)
            .filter((el) => el.value && el.value.trim())
            .map((el) => `${el.dataset.extra}: ${el.value.trim()}`)
            .join('\n');
        if (extra) data.message = [data.message, extra].filter(Boolean).join('\n');
        const errors = validate(form, data);

        if (Object.keys(errors).length > 0) {
            form.querySelector('.field.has-error .field__control')?.focus();
            showStatus(status, 'err', 'Перевірте, будь ласка, заповнені поля.');
            return;
        }

        const originalHtml = submit.innerHTML;
        submit.disabled = true;
        submit.innerHTML = '<span class="spinner"></span> Надсилаємо…';

        // Демо без бекенду: заявка нікуди не йде. Тут підключається свій API, CRM чи Telegram-бот.
        await new Promise((resolve) => setTimeout(resolve, 700));

        form.reset();
        showStatus(status, 'ok', "Дякуємо! Ми зв'яжемося з вами протягом робочого дня. (Демо-режим: заявку не надіслано.)");
        submit.disabled = false;
        submit.innerHTML = originalHtml;
    });
}

/** Прив'язує будь-яку форму заявки на сторінці. */
export function initForms(scope = document) {
    $$('form[data-lead-form]', scope).forEach(bindForm);
}
