/* =====================================================================
   Калькулятор вартості будинку («Наші проєкти» → #kalkuliator).
   Ціна = площа × ставка ступеня, округлено до сотні доларів — як у
   CatalogService. Додаткові послуги в суму не входять: їх рахує менеджер.
   Заявка йде через звичайну форму (forms.js) з source=calculator.
   ===================================================================== */

import { $, $$, esc } from './utils.js';
import { formatUsd } from './catalog.js';
import { openModal } from './pages.js';
import { track } from './consent.js';

const AREA_MIN = 15;
const AREA_MAX = 1000;
const DELIVERY = 'Доставка';

const price = (area, rate) => Math.round(area * rate);
const rateLabel = (rate) => `${Number(rate).toLocaleString('uk-UA')} $/м²`;

export function initCalculator() {
    const form = $('#calc');
    if (!form) return;

    const areaInput = $('#calcArea', form);
    const range = $('#calcRange', form);
    const placeField = $('#calcPlaceField', form);
    const place = $('#calcPlace', form);
    let area = Number(areaInput.value);

    function read() {
        const stage = $('input[name="stage"]:checked', form);
        const extras = $$('input[name="extra"]:checked', form).map((el) => el.value);
        return {
            area,
            rate: Number(stage.value),
            stage: stage.dataset.name,
            total: price(area, Number(stage.value)),
            extras,
            place: extras.includes(DELIVERY) ? place.value.trim() : '',
        };
    }

    /** Рядки розрахунку — і для підсумку на сторінці, і для вікна заявки. */
    function rows(calc) {
        const list = [
            ['Площа', `${calc.area} м²`],
            ['Ступінь готовності', calc.stage],
            ['Ставка', rateLabel(calc.rate)],
        ];
        if (calc.extras.length) list.push(['Додатково, рахуємо окремо', calc.extras.join(', ')]);
        if (calc.place) list.push(['Доставка до', calc.place]);
        list.push(['Виготовлення', '≈ 60 днів']);
        return list;
    }

    // Перша взаємодія з калькулятором — окрема аудиторія «рахували, але не написали»
    let used = false;
    function markUsed() {
        if (used) return;
        used = true;
        const calc = read();
        track('calculator_use', { value: calc.total, area: calc.area, stage: calc.stage });
    }

    function render() {
        const calc = read();
        $$('[data-stage-sum]', form).forEach((sum) => {
            const rate = Number(sum.closest('.calc-stage').querySelector('input').value);
            sum.textContent = formatUsd(price(area, rate));
        });
        $('#calcTotal', form).textContent = formatUsd(calc.total);
        $('#calcLines', form).innerHTML = rows(calc)
            .map(([key, value]) => `<li><span>${esc(key)}</span><span>${esc(value)}</span></li>`)
            .join('');
        placeField.hidden = !calc.extras.includes(DELIVERY);
    }

    // Площа: поле й повзунок тримаємо синхронно; неможливе число не приймаємо
    areaInput.addEventListener('input', () => {
        const value = Math.round(Number(areaInput.value));
        if (!areaInput.value || value < AREA_MIN || value > AREA_MAX) return;
        area = value;
        range.value = String(Math.min(Math.max(value, Number(range.min)), Number(range.max)));
        render();
        markUsed();
    });
    areaInput.addEventListener('change', () => { areaInput.value = String(area); });
    range.addEventListener('input', () => {
        area = Number(range.value);
        areaInput.value = String(area);
        render();
        markUsed();
    });

    form.addEventListener('change', (event) => {
        if (event.target.name === 'stage' || event.target.name === 'extra') {
            render();
            markUsed();
        }
    });
    place.addEventListener('input', () => {
        placeField.classList.remove('has-error');
        render();
    });

    // «Надіслати заявку»: перевіряємо доставку, переносимо розрахунок у форму й відкриваємо її
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const calc = read();

        if (calc.extras.includes(DELIVERY) && !calc.place) {
            placeField.classList.add('has-error');
            place.setAttribute('aria-invalid', 'true');
            place.focus();
            return;
        }
        place.setAttribute('aria-invalid', 'false');

        $('#calcRecap').innerHTML = [['Орієнтовна вартість', formatUsd(calc.total)], ...rows(calc)]
            .map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`)
            .join('');

        // Текст заявки для бота: коротко, бо в картці менеджера коментар обрізається
        $('#calcMessage').value = [
            `Калькулятор: ${calc.area} м² · ${calc.stage} (${rateLabel(calc.rate)}) ≈ ${formatUsd(calc.total)}`,
            calc.extras.length ? `Додатково (рахуємо індивідуально): ${calc.extras.join(', ')}` : '',
            calc.place ? `Доставка до: ${calc.place}` : '',
        ].filter(Boolean).join('\n');
        $('#calcValue').value = String(calc.total);

        openModal('#leadModal');
    });

    render();
}
