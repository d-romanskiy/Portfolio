/* =====================================================================
   «Житло для людей» — перевірка житлових можливостей.

   Одне питання на екран. Телефон не питаємо до результату:
   спершу людина отримує напрямки, бюджет і будинки під цю суму.

   Це попередня орієнтація, а не рішення про надання житла —
   дисклеймер показуємо разом із результатом.
   ===================================================================== */

import {
    $, $$, esc, formatNumber, loadProjects,
    lockScroll, unlockScroll, trapFocus,
} from './utils.js';
import { initForms } from './forms.js';
import { track } from './consent.js';

/* ponytail: курс статичний — з комерційної пропозиції від 21.09.2026 (44,72 грн/$).
   Якщо знадобиться актуальний — тягнути з НБУ (bank.gov.ua/NBUStatService)
   і кешувати на добу. */
const USD_UAH = 44.7;

const OWN_FUNDS = {
    none: { label: 'Немає власних коштів', value: 0 },
    upto250: { label: 'До 250 тис. грн', value: 125000 },
    to500: { label: '250–500 тис. грн', value: 375000 },
    to1m: { label: '500 тис. грн – 1 млн грн', value: 750000 },
    over1m: { label: 'Понад 1 млн грн', value: 1200000 },
};

const STEPS = [
    {
        key: 'yeoselia',
        question: 'Чи є у вас житловий сертифікат або схвалення за програмою «єОселя»?',
        hint: '«єОселя» — пільгова іпотека під 3% або 7% річних. Рішення ухвалює банк-партнер.',
        options: [
            { value: 'approved', label: 'Так, банк уже схвалив' },
            { value: 'applied', label: 'Подав заявку, чекаю рішення' },
            { value: 'want', label: 'Ще ні, але хочу перевірити, чи підходжу' },
            { value: 'no', label: 'Ні, це не мій випадок' },
        ],
    },
    {
        key: 'category',
        question: 'До якої категорії ви належите?',
        options: [
            { value: 'idp', label: 'Внутрішньо переміщена особа (ВПО)' },
            { value: 'veteran', label: 'Ветеран' },
            { value: 'ubd', label: 'Учасник бойових дій (УБД)' },
            { value: 'military', label: 'Військовослужбовець' },
            { value: 'family', label: 'Член сімʼї ветерана або військового' },
            { value: 'other', label: 'Інше' },
        ],
    },
    {
        key: 'idpStatus',
        question: 'Чи маєте статус ВПО?',
        hint: 'Ідеться про офіційно оформлену довідку про взяття на облік.',
        options: [
            { value: 'yes', label: 'Так, довідка оформлена' },
            { value: 'process', label: 'Оформлюю зараз' },
            { value: 'no', label: 'Ні' },
        ],
    },
    {
        key: 'destroyed',
        question: 'Чи було ваше житло знищене або пошкоджене?',
        options: [
            { value: 'destroyed', label: 'Так, знищене повністю' },
            { value: 'damaged', label: 'Так, пошкоджене' },
            { value: 'no', label: 'Ні' },
            { value: 'unknown', label: 'Не знаю / не оформлено' },
        ],
    },
    {
        key: 'instrument',
        question: 'Що у вас уже є?',
        hint: 'Якщо кілька — оберіть основне.',
        options: [
            { value: 'certificate', label: 'Житловий сертифікат' },
            { value: 'voucher', label: 'Житловий ваучер' },
            { value: 'compensation', label: 'Рішення про компенсацію' },
            { value: 'nothing', label: 'Нічого з переліченого' },
            { value: 'unknown', label: 'Не знаю' },
        ],
    },
    {
        key: 'amount',
        type: 'number',
        question: 'Якщо сума за програмою відома — вкажіть її',
        hint: 'Можна пропустити. Ми не вигадуємо сум державних програм — рахуємо лише те, що ви вкажете.',
        unit: 'грн',
        optional: true,
        when: (a) => ['certificate', 'voucher', 'compensation'].includes(a.instrument)
            || a.yeoselia === 'approved',
    },
    {
        key: 'ownFunds',
        question: 'Скільки власних коштів можете додати?',
        options: Object.entries(OWN_FUNDS).map(([value, item]) => ({ value, label: item.label })),
    },
    {
        key: 'land',
        question: 'Чи маєте земельну ділянку?',
        options: [
            { value: 'yes', label: 'Так, ділянка є' },
            { value: 'family', label: 'Є у родини' },
            { value: 'no', label: 'Ні' },
        ],
    },
    {
        key: 'familySize',
        type: 'number',
        question: 'Скільки людей у сімʼї?',
        unit: 'осіб',
        optional: true,
    },
];

const PATHS = {
    yeoselia: {
        name: '«єОселя» — пільгова іпотека',
        text: 'Для ветеранів, УБД, військовослужбовців, медиків, педагогів і членів їхніх сімей. Ставка 3% або 7% річних, перший внесок від 20%. Рішення ухвалює банк-партнер за власними критеріями.',
    },
    evidnovlennia: {
        name: 'єВідновлення — компенсація за житло',
        text: 'Компенсація за зруйноване або пошкоджене житло. Варто перевірити статус заяви: кошти за таким рішенням можна спрямувати на придбання іншого житла.',
    },
    certificate: {
        name: 'Житловий сертифікат',
        text: 'Якщо сертифікат уже видано — можна одразу дивитися житлові рішення під його суму. Якщо ні — варто перевірити умови отримання саме у вашій ситуації.',
    },
    voucher: {
        name: 'Житловий ваучер для ВПО',
        text: 'Програма доступна не всім ВПО: має власні критерії відбору та обмежений ресурс. Варто перевірити, чи підпадає ваша ситуація під чинні умови.',
    },
    veterans: {
        name: 'Програми підтримки ветеранів',
        text: 'Крім житлових програм, для ветеранів та УБД діють місцеві й донорські механізми. Їх варто перевіряти паралельно з основною програмою.',
    },
    community: {
        name: 'Житло від громади',
        text: 'Громади створюють житловий фонд за постановами №301 і №751. LINDEN HOUSE будує такі квартали — варто перевірити, чи є проєкт у вашому регіоні.',
    },
    own: {
        name: 'Власні кошти та поетапна оплата',
        text: 'Якщо програма не підійде або її суми забракне — модульний будинок можна будувати чергами. Найповільніший, але найпередбачуваніший шлях: він не залежить від рішень держави.',
    },
};

const state = { answers: {}, index: 0, houses: [] };

const activeSteps = () => STEPS.filter((step) => !step.when || step.when(state.answers));

/* ---------------------------------------------------------------------
   Крок перевірки
   --------------------------------------------------------------------- */

function renderStep() {
    const stage = $('#quizStage');
    if (!stage) return;

    const steps = activeSteps();
    const step = steps[state.index];
    if (!step) {
        renderResult();
        return;
    }

    const total = steps.length;
    const progress = Math.round((state.index / total) * 100);
    const current = state.answers[step.key];

    const body = step.type === 'number'
        ? `
            <div class="quiz__input field">
                <input class="field__control" type="number" inputmode="numeric" min="0"
                       id="quizNumber" value="${current ? esc(current) : ''}"
                       placeholder="${step.unit === 'грн' ? '1 200 000' : '3'}"
                       aria-label="${esc(step.question)}">
            </div>
            <div class="quiz__nav">
                <button class="btn btn--accent" type="button" data-quiz-next>
                    Далі
                    <svg class="btn__icon" width="16" height="16" aria-hidden="true"><use href="#i-arrow-right"></use></svg>
                </button>
                ${step.optional ? '<button class="quiz__skip" type="button" data-quiz-skip>Пропустити</button>' : ''}
            </div>`
        : `
            <div class="quiz__opts ${step.options.length > 4 ? 'quiz__opts--2' : ''}">
                ${step.options.map((option, i) => `
                    <button class="opt ${current === option.value ? 'is-selected' : ''}" type="button"
                            style="--i:${i}" data-quiz-pick="${esc(option.value)}">
                        <span class="opt__mark" aria-hidden="true"></span>
                        <span>${esc(option.label)}</span>
                    </button>`).join('')}
            </div>`;

    stage.innerHTML = `
        <div class="quiz__step">
            <div class="quiz__top">
                <p class="quiz__meta">
                    <span>Питання <strong>${state.index + 1}</strong> із <strong>${total}</strong></span>
                    <span>${progress}%</span>
                </p>
                <div class="quiz__bar"><div class="quiz__bar-fill" style="width:${progress}%"></div></div>
            </div>

            <h3 class="quiz__q">${esc(step.question)}</h3>
            ${step.hint ? `<p class="quiz__hint">${esc(step.hint)}</p>` : ''}
            ${body}

            ${state.index > 0 ? `
                <p><button class="quiz__back" type="button" data-quiz-back>
                    <svg width="15" height="15" aria-hidden="true"><use href="#i-chevron-left"></use></svg>
                    Назад
                </button></p>` : ''}
        </div>`;

    if (step.type === 'number') $('#quizNumber')?.focus();
}

function next() {
    state.index += 1;
    if (state.index >= activeSteps().length) renderResult();
    else renderStep();
}

/* ---------------------------------------------------------------------
   Результат: напрямки, бюджет, підбір будинків
   --------------------------------------------------------------------- */

function pickPaths(a) {
    const ids = [];
    const veteranLike = ['veteran', 'ubd', 'military', 'family'].includes(a.category);

    if (veteranLike || ['approved', 'applied', 'want'].includes(a.yeoselia)) ids.push('yeoselia');
    if (['destroyed', 'damaged'].includes(a.destroyed)) ids.push('evidnovlennia');
    if (a.instrument === 'certificate' || (a.idpStatus === 'yes' && a.destroyed === 'destroyed')) {
        ids.push('certificate');
    }
    if (['yes', 'process'].includes(a.idpStatus)
        && !['certificate', 'compensation'].includes(a.instrument)) {
        ids.push('voucher');
    }
    if (['veteran', 'ubd'].includes(a.category)) ids.push('veterans');
    if (['nothing', 'unknown'].includes(a.instrument)) ids.push('community');
    ids.push('own');

    return [...new Set(ids)].slice(0, 4).map((id) => ({ id, ...PATHS[id] }));
}

function budgetOf(a) {
    const program = Number(a.amount) || 0;
    const own = OWN_FUNDS[a.ownFunds]?.value || 0;
    return { program, own, total: program + own };
}

/** Людям із житловими програмами потрібен дім, де можна жити, — тож рахуємо «під ключ», а не коробку. */
function matchHouses(budgetUah) {
    const withUah = state.houses
        .filter((p) => p.categorySlug === 'house' && p.turnkeyUsd)
        .map((p) => ({ ...p, priceUah: p.turnkeyUsd * USD_UAH }));

    const affordable = withUah
        .filter((p) => p.priceUah <= budgetUah)
        .sort((a, b) => b.priceUah - a.priceUah)
        .slice(0, 3);

    if (affordable.length > 0) return { list: affordable, fits: true };

    return { list: withUah.sort((a, b) => a.priceUah - b.priceUah).slice(0, 3), fits: false };
}

function matchCard(project, i) {
    const cover = project.cover;
    const meta = [
        project.totalArea ? `${formatNumber(project.totalArea)} м²` : '',
        project.bedrooms ? `${project.bedrooms} сп.` : '',
        project.categoryName,
    ].filter(Boolean).join(' · ');

    return `
        <a class="match" style="--i:${i}" href="project.html?slug=${esc(project.slug)}">
            <span class="match__media">
                ${cover ? `<img src="${esc(cover.thumbUrl || cover.url)}"
                                alt="${esc(cover.alt || project.name)}" loading="lazy" decoding="async">` : ''}
            </span>
            <span class="match__body">
                <span class="match__name">${esc(project.name)}</span>
                <span class="match__meta">${esc(meta)}</span>
                <span class="match__price">під ключ від 0000 грн</span>
            </span>
        </a>`;
}

function renderResult() {
    const stage = $('#quizStage');
    if (!stage) return;

    // Лише факт завершення: відповіді нікуди не йдуть (політика, розділ 4)
    track('housing_check_complete');

    const a = state.answers;
    const paths = pickPaths(a);
    const { program, own, total } = budgetOf(a);
    const match = matchHouses(total);
    const uah = (value) => `${Math.round(value).toLocaleString('uk-UA')} грн`;

    stage.innerHTML = `
        <div class="result">
            <div>
                <p class="quiz__meta"><span>Попередній результат</span></p>
                <h3 class="result__lead">Ось напрямки, які варто перевірити у вашій ситуації</h3>
            </div>

            <div class="paths">
                ${paths.map((path, i) => `
                    <article class="path" style="--i:${i}">
                        <span class="path__num">Напрямок ${String(i + 1).padStart(2, '0')}</span>
                        <h4 class="path__name">${esc(path.name)}</h4>
                        <p class="path__text">${esc(path.text)}</p>
                    </article>`).join('')}
            </div>

            <div class="budget">
                <p class="quiz__meta" style="color:var(--amber-400)"><span>Орієнтовний бюджет</span></p>
                <div class="budget__rows">
                    <div class="budget__row">
                        <span>Сума за програмою${program ? '' : ' — не вказана'}</span>
                        <span>${program ? uah(program) : '—'}</span>
                    </div>
                    <div class="budget__row">
                        <span>Власні кошти${own ? ' (середина діапазону)' : ''}</span>
                        <span>${own ? uah(own) : '—'}</span>
                    </div>
                    <div class="budget__row budget__row--total">
                        <span>Разом</span>
                        <span>${total ? uah(total) : 'потребує уточнення'}</span>
                    </div>
                </div>
                <p class="budget__note">
                    ${program
                        ? 'Розрахунок спирається лише на суми, які ви вказали. Ми не прогнозуємо розмір державної допомоги.'
                        : 'Ви не вказали суму за програмою, тож оцінка неповна — тут лише ваші власні кошти.'}
                    ${['yes', 'family'].includes(a.land)
                        ? ' Наявна ділянка помітно здешевлює проєкт: земля — зазвичай найбільша окрема стаття витрат.'
                        : ' Вартість земельної ділянки в розрахунок не входить.'}
                </p>
            </div>

            ${match.list.length > 0 ? `
                <div>
                    <p class="modal__block-title">
                        ${match.fits
                            ? 'Будинки LINDEN HOUSE у межах цього бюджету'
                            : 'Найдоступніші будинки LINDEN HOUSE'}
                    </p>
                    ${match.fits ? '' : `
                        <p class="quiz__hint" style="margin:0 0 16px">
                            ${total > 0
                                ? 'У межі вказаного бюджету поки нічого не потрапляє. Показуємо найдоступніші моделі — їх можна будувати чергами: спершу коробка й тепловий контур, оздоблення та меблі пізніше.'
                                : 'Бюджет ще не визначений, тож показуємо найдоступніші моделі — з них зазвичай і починають.'}
                        </p>`}
                    <div class="matches">${match.list.map(matchCard).join('')}</div>
                </div>` : ''}

            <p class="legal-note">
                LINDEN HOUSE не є державним органом і не ухвалює рішень щодо державних житлових
                програм. Остаточне право на участь визначають відповідні державні установи або банк.
                Ця перевірка безкоштовна й не є рішенням про надання житла.
            </p>

            <div class="quiz__nav">
                <button class="btn btn--ghost btn--sm" type="button" data-quiz-restart>
                    Пройти перевірку ще раз
                </button>
            </div>
        </div>`;

    // Форма зʼявляється лише після результату — телефон не питаємо раніше
    const lead = $('#housingLead');
    if (!lead) return;

    lead.hidden = false;
    const summary = $('#hf2-message');
    if (summary && !summary.value) {
        summary.value = `Перевірка можливостей: ${paths.map((p) => p.name).join('; ')}.`
            + (total ? ` Орієнтовний бюджет: ${uah(total)}.` : '');
    }
    initForms(lead);
}

/* ---------------------------------------------------------------------
   Ініціалізація
   --------------------------------------------------------------------- */

export function initHousingCheck() {
    const stage = $('#quizStage');
    if (!stage) return;

    loadProjects()
        .then((projects) => { state.houses = projects; })
        .catch(() => { state.houses = []; });

    stage.addEventListener('click', (event) => {
        const pick = event.target.closest('[data-quiz-pick]');
        if (pick) {
            state.answers[activeSteps()[state.index].key] = pick.dataset.quizPick;
            $$('.opt', stage).forEach((opt) => opt.classList.toggle('is-selected', opt === pick));
            setTimeout(next, 220);
            return;
        }

        if (event.target.closest('[data-quiz-next]')) {
            const value = $('#quizNumber')?.value.trim();
            if (value) state.answers[activeSteps()[state.index].key] = value;
            next();
            return;
        }

        if (event.target.closest('[data-quiz-skip]')) {
            delete state.answers[activeSteps()[state.index].key];
            next();
            return;
        }

        if (event.target.closest('[data-quiz-back]')) {
            state.index = Math.max(0, state.index - 1);
            renderStep();
            return;
        }

        if (event.target.closest('[data-quiz-restart]')) {
            state.answers = {};
            state.index = 0;
            const lead = $('#housingLead');
            if (lead) lead.hidden = true;
            renderStep();
        }
    });

    // Enter у числовому полі = «Далі»
    stage.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.id === 'quizNumber') {
            event.preventDefault();
            const value = event.target.value.trim();
            if (value) state.answers[activeSteps()[state.index].key] = value;
            next();
        }
    });

    renderStep();
}
