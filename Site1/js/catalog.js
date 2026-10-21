/* =====================================================================
   Каталог проєктів: фільтри, сітка карток, модальне вікно з деталями
   Дані — статичні, з js/data.js (без бекенду й бази даних)
   ===================================================================== */

import {
    $, $$, esc, formatNumber, plural, loadProjects,
    lockScroll, unlockScroll, trapFocus, scrollToSection, prefersReducedMotion,
} from './utils.js';
import { observeReveals } from './animations.js';
import { openContactPanel } from './nav.js';
import { CATEGORIES, projectCards, projectDetail } from './data.js';

export const projectUrl = (slug) => `project.html?slug=${encodeURIComponent(slug)}`;

const PURPOSES = [
    { value: 'all', label: 'Усі проєкти' },
    { value: 'RESIDENTIAL', label: 'Будинки' },
    { value: 'PUBLIC', label: "Соціальні об'єкти" },
    { value: 'COMMERCIAL', label: 'Комерційні' },
];

const state = {
    projects: [],
    categories: [],
    purpose: 'all',
    category: 'all',
    sort: 'default',
};

/** Ціни рахує бекенд: площа × ставка проєкту (CatalogService). */
export function formatUsd(value) {
    if (!value) return '';
    return Number(value).toLocaleString('uk-UA') + ' $';
}

const icon = (name, size = 15) =>
    `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

/* =====================================================================
   Рендер фільтрів
   ===================================================================== */

function renderPurposeFilters() {
    const box = $('#purposeFilters');
    if (!box) return;

    // Один розділ призначення — фільтрувати нема чого
    box.closest('.filters__row').hidden = new Set(state.projects.map((p) => p.purpose)).size <= 1;

    box.innerHTML = PURPOSES.map((item) => {
        const count = item.value === 'all'
            ? state.projects.length
            : state.projects.filter((p) => p.purpose === item.value).length;
        if (count === 0) return '';
        return `
            <button class="chip" type="button"
                    data-purpose="${item.value}"
                    aria-pressed="${state.purpose === item.value}">
                ${esc(item.label)}
                <span class="chip__count">${count}</span>
            </button>`;
    }).join('');
}

function renderCategoryFilters() {
    const box = $('#categoryFilters');
    if (!box) return;

    // Показуємо лише типи, доступні в поточному розділі призначення
    const scoped = state.purpose === 'all'
        ? state.projects
        : state.projects.filter((p) => p.purpose === state.purpose);

    const available = new Map();
    scoped.forEach((p) => available.set(p.categorySlug, (available.get(p.categorySlug) || 0) + 1));

    // Один тип у розділі — фільтрувати нема чого
    box.closest('.filters__row').hidden = available.size <= 1;
    if (available.size <= 1) {
        box.innerHTML = '';
        return;
    }

    const chips = [`
        <button class="chip" type="button" data-category="all"
                aria-pressed="${state.category === 'all'}">
            Усі типи
            <span class="chip__count">${scoped.length}</span>
        </button>`];

    state.categories.forEach((category) => {
        const count = available.get(category.slug) || 0;
        if (count === 0) return;
        chips.push(`
            <button class="chip" type="button" data-category="${esc(category.slug)}"
                    aria-pressed="${state.category === category.slug}"
                    title="${esc(category.tagline || '')}">
                ${esc(category.name)}
                <span class="chip__count">${count}</span>
            </button>`);
    });

    box.innerHTML = chips.join('');
}

/* =====================================================================
   Рендер карток
   ===================================================================== */

function cardSpecs(project) {
    const specs = [];

    if (project.totalArea) {
        specs.push(`<span class="spec">${icon('area')}${formatNumber(project.totalArea)} м²</span>`);
    }
    if (project.floors) {
        specs.push(`<span class="spec">${icon('floors')}${project.floors} ${plural(project.floors, 'поверх', 'поверхи', 'поверхів')}</span>`);
    }
    if (project.bedrooms) {
        specs.push(`<span class="spec">${icon('bed')}${project.bedrooms} ${plural(project.bedrooms, 'спальня', 'спальні', 'спалень')}</span>`);
    }
    if (project.units) {
        specs.push(`<span class="spec">${icon('apartment')}${project.units} ${plural(project.units, 'одиниця', 'одиниці', 'одиниць')}</span>`);
    }
    if (!project.bedrooms && !project.units && project.capacityMax) {
        specs.push(`<span class="spec">${icon('users')}до ${project.capacityMax} осіб</span>`);
    }

    return specs.slice(0, 3).join('');
}

function projectCard(project, index) {
    const cover = project.cover;
    const image = cover
        ? `<img src="${esc(cover.thumbUrl || cover.url)}" alt="${esc(cover.alt || project.name)}"
                loading="lazy" decoding="async" width="720" height="540">`
        : '';

    const features = (project.features || [])
        .map((feature) => `<li>${esc(feature)}</li>`)
        .join('');

    return `
        <a class="project-card" href="${projectUrl(project.slug)}" data-slug="${esc(project.slug)}"
           style="--card-index:${index}" aria-label="Відкрити картку проєкту ${esc(project.name)}">
            <div class="project-card__media">
                ${image}
                <div class="project-card__tags">
                    <span class="badge badge--accent">${esc(project.categoryName)}</span>
                    ${project.smartHome && project.categorySlug !== 'smart'
                        ? '<span class="badge badge--light">Smart Home</span>' : ''}
                    ${project.transportable ? '<span class="badge">Мобільний</span>' : ''}
                </div>
                ${project.imageCount > 1
                    ? `<span class="project-card__count">${icon('image', 13)}${project.imageCount}</span>`
                    : ''}
            </div>

            <div class="project-card__body">
                <h3 class="project-card__name">${esc(project.name)}</h3>
                ${project.subtitle ? `<p class="project-card__subtitle">${esc(project.subtitle)}</p>` : ''}
                <div class="spec-row">${cardSpecs(project)}</div>
                ${features ? `<ul class="project-card__features">${features}</ul>` : ''}
            </div>

            <div class="project-card__foot">
                ${project.priceUsd ? `
                    <span class="project-card__price">
                        <span class="project-card__price-kind">${esc(project.priceLabel || 'Орієнтовно від')}</span>
                        <span class="project-card__price-value">${PRICE}</span>
                    </span>` : ''}
                <span class="project-card__more">
                    Детальніше ${icon('arrow-right', 14)}
                </span>
            </div>
        </a>`;
}

function visibleProjects() {
    let list = state.projects.slice();

    if (state.purpose !== 'all') {
        list = list.filter((p) => p.purpose === state.purpose);
    }
    if (state.category !== 'all') {
        list = list.filter((p) => p.categorySlug === state.category);
    }

    const area = (p) => Number(p.totalArea || 0);
    switch (state.sort) {
        case 'area-asc':
            list.sort((a, b) => area(a) - area(b));
            break;
        case 'area-desc':
            list.sort((a, b) => area(b) - area(a));
            break;
        case 'speed':
            list.sort((a, b) => (a.buildDays || 9999) - (b.buildDays || 9999));
            break;
        default:
            break;
    }

    return list;
}

function renderGrid() {
    const grid = $('#catalogGrid');
    const counter = $('#catalogCount');
    if (!grid) return;

    const list = visibleProjects();
    grid.setAttribute('aria-busy', 'false');
    // Мініатюри по три в ряд на мобільному — лише коли карток вистачає
    grid.classList.toggle('is-few', list.length < 3);

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p class="empty-state__title">За вибраними фільтрами нічого не знайдено</p>
                <p>Спробуйте змінити розділ або тип об'єкта.</p>
                <button class="btn btn--ghost btn--sm" type="button" data-reset-filters>Скинути фільтри</button>
            </div>`;
    } else {
        grid.innerHTML = list.map(projectCard).join('');
    }

    if (counter) {
        counter.innerHTML = `Показано <strong>${list.length}</strong> ${plural(list.length, 'проєкт', 'проєкти', 'проєктів')} із <strong>${state.projects.length}</strong>`;
    }
}

function renderSkeletons(count = 6) {
    const grid = $('#catalogGrid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: count }).map(() => `
        <div class="card-skeleton">
            <div class="card-skeleton__media"></div>
            <div class="card-skeleton__body">
                <div class="card-skeleton__line"></div>
                <div class="card-skeleton__line"></div>
                <div class="card-skeleton__line"></div>
            </div>
        </div>`).join('');
}

/* =====================================================================
   Модальне вікно з деталями проєкту
   ===================================================================== */

const gallery = { images: [], index: 0 };
let modalReleaseTrap = null;
let modalLastFocus = null;

/** Відкрита модалка проєкту живе в адресі як #/proekt/<slug>. */
function slugFromUrl() {
    const match = location.hash.match(/^#\/proekt\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
}

/* =====================================================================
   Розмітка картки проєкту — спільна для модалки й project.html
   ===================================================================== */

const has = (value) => Boolean(Number(value));
/** Демо: замість цін будинку — заглушка. Справжні суми рахує data.js, показати — повернути formatUsd. */
export const PRICE = '0000 $';
const usd = () => PRICE;

function galleryHtml(p, images) {
    if (images.length === 0) return '';
    const slides = images.map((image, i) => `
        <div class="gallery__slide${image.plan ? ' gallery__slide--plan' : ''}${i === 0 ? ' is-active"' : '" aria-hidden="true"'} data-slide="${i}">
            <img src="${esc(image.url)}" alt="${esc(image.alt || p.name)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
        </div>`).join('');
    const thumbs = images.map((image, i) => `
        <button class="gallery__thumb${i === 0 ? ' is-active' : ''}" type="button" data-thumb="${i}"
                aria-label="Показати зображення ${i + 1} з ${images.length}">
            <img src="${esc(image.thumbUrl || image.url)}" alt="" loading="lazy" decoding="async">
        </button>`).join('');
    const nav = images.length < 2 ? '' : `
        <button class="gallery__nav gallery__nav--prev" type="button" data-gallery-prev aria-label="Попереднє зображення">${icon('chevron-left', 20)}</button>
        <button class="gallery__nav gallery__nav--next" type="button" data-gallery-next aria-label="Наступне зображення">${icon('chevron-right', 20)}</button>`;
    return `
        <div class="gallery">
            <div class="gallery__stage">
                ${slides}${nav}
                <p class="gallery__caption" id="galleryCaption">${esc(images[0].alt)}</p>
            </div>
            ${images.length > 1 ? `<div class="gallery__thumbs">${thumbs}</div>` : ''}
        </div>`;
}

function keySpecsHtml(p) {
    const specs = [];
    if (has(p.totalArea)) specs.push([`${formatNumber(p.totalArea)}<sup> м²</sup>`, 'Загальна площа']);
    if (has(p.terraceArea)) specs.push([`${formatNumber(p.terraceArea)}<sup> м²</sup>`, 'Тераса']);
    if (has(p.floors)) specs.push([p.floors, plural(p.floors, 'Поверх', 'Поверхи', 'Поверхів')]);
    if (has(p.bedrooms)) specs.push([p.bedrooms, plural(p.bedrooms, 'Спальня', 'Спальні', 'Спалень')]);
    if (has(p.bathrooms)) specs.push([p.bathrooms, plural(p.bathrooms, 'Санвузол', 'Санвузли', 'Санвузлів')]);
    if (has(p.units)) specs.push([p.units, 'Квартир / кімнат']);
    if (has(p.capacityMin) && has(p.capacityMax)) {
        specs.push([p.capacityMin === p.capacityMax ? p.capacityMax : `${p.capacityMin}–${p.capacityMax}`, 'Місткість, осіб']);
    }
    if (p.energyClass) specs.push([esc(p.energyClass), 'Енергоклас']);
    return specs.map(([value, label]) =>
        `<div class="key-spec"><span class="key-spec__value">${value}</span><span class="key-spec__label">${label}</span></div>`).join('');
}

function specTableHtml(p) {
    const rows = [];
    if (has(p.widthM) && has(p.lengthM)) rows.push(['Габарити', `${formatNumber(p.widthM)} × ${formatNumber(p.lengthM)} м`]);
    if (has(p.ceilingM)) rows.push(['Висота стелі', `${formatNumber(p.ceilingM, 2)} м`]);
    if (has(p.buildDays)) rows.push(['Виготовлення', `~${p.buildDays} днів, монтаж ${p.installDays || '—'} днів`]);
    if (has(p.warrantyYears)) rows.push(['Гарантія на конструктив', `${p.warrantyYears} років`]);
    rows.push(['Каркас', p.frame], ['Фасад', p.facade], ['Покрівля', p.roof], ['Утеплення', p.insulation],
        ['Опалення', p.heating], ['Фундамент', p.foundation], ['Комунікації', p.utilities]);
    return rows.filter(([, value]) => value).map(([key, value]) =>
        `<div class="spec-table__row"><span class="spec-table__key">${key}</span><span class="spec-table__val">${esc(value)}</span></div>`).join('');
}

function roomsHtml(p) {
    if (!p.rooms?.length) return '';
    const byFloor = new Map();
    p.rooms.forEach((room) => {
        const floor = room.floorNo || 0;
        byFloor.set(floor, [...(byFloor.get(floor) || []), room]);
    });
    const floors = [...byFloor.keys()].sort((a, b) => a - b);
    const multiFloor = floors.filter((f) => f > 0).length > 1;
    const blocks = floors.map((floor) => `
        <div>
            ${multiFloor || floor === 0 ? `<p class="rooms__floor-title">${floor === 0 ? 'Склад приміщень' : `${floor}-й поверх`}</p>` : ''}
            <ul class="rooms__list">${byFloor.get(floor).map((room) =>
                `<li class="rooms__item"><span>${esc(room.name)}</span><span>${has(room.area) ? `${formatNumber(room.area, 2)} м²` : '—'}</span></li>`).join('')}</ul>
        </div>`).join('');
    return `<div><p class="modal__block-title">Планування</p><div class="rooms">${blocks}</div></div>`;
}

function priceHtml(p) {
    if (!p.priceUsd && !p.priceStages.length) return '';
    const rows = p.priceStages.map((stage) => `
        <li class="price-stages__row">
            <span class="price-stages__name">${esc(stage.title)}<span class="price-stages__note">${esc(stage.note)}</span></span>
            <span class="price-stages__sum">${stage.totalUsd ? usd(stage.totalUsd) : '—'}<span class="price-stages__rate">0000 $/м²</span></span>
        </li>`).join('');
    const note = p.purpose === 'PUBLIC'
        ? 'Остаточна вартість залежить від комплектації — фіксуємо її після погодження специфікації.'
        : 'Фундамент, доставка й монтаж, тераса та зовнішні підключення — окремими послугами.';
    return `
        <div class="price price--modal">
            <span class="price__kind">${esc(p.priceLabel || 'Орієнтовно від')}</span>
            <span class="price__value">${p.priceUsd ? usd(p.priceUsd) : ''}</span>
            ${rows ? `<ul class="price-stages" aria-label="Вартість за ступенями готовності">${rows}</ul>` : ''}
            <span class="price__note">Орієнтовно, за площею ${formatNumber(p.totalArea)} м². ${note}</span>
        </div>`;
}

/** Повна картка проєкту (галерея, характеристики, планування, ціни). */
export function projectHtml(p) {
    const badges = [`<span class="badge badge--accent">${esc(p.categoryName)}</span>`];
    if (p.purposeTitle !== p.categoryName) badges.push(`<span class="badge">${esc(p.purposeTitle)}</span>`);
    if (p.smartHome) badges.push('<span class="badge badge--light">Smart Home</span>');
    if (p.transportable) badges.push('<span class="badge">Мобільний</span>');

    const features = p.features.length ? `
        <div>
            <p class="modal__block-title">Ключові переваги</p>
            <ul class="modal__features">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        </div>` : '';

    return `
        ${galleryHtml(p, [...p.gallery, ...p.plans])}
        <div class="modal__body">
            <div class="modal__main">
                <header class="modal__head">
                    <div class="modal__tags">${badges.join('')}</div>
                    <h1 class="modal__title" id="projectTitle">${esc(p.name)}</h1>
                    ${p.subtitle ? `<p class="modal__subtitle">${esc(p.subtitle)}</p>` : ''}
                </header>
                <div class="key-specs">${keySpecsHtml(p)}</div>
                ${p.description ? `<p class="modal__text">${esc(p.description)}</p>` : ''}
                <div>
                    <p class="modal__block-title">Технічні характеристики</p>
                    <div class="spec-table">${specTableHtml(p)}</div>
                </div>
            </div>
            <aside class="modal__side">
                ${features}${roomsHtml(p)}${priceHtml(p)}
                <div class="modal__cta">
                    <p class="modal__cta-title">Цікавить цей проєкт?</p>
                    <p class="modal__cta-text">Підготуємо адаптацію під вашу ділянку, графік виготовлення та варіанти оплати.</p>
                    <button class="btn btn--accent btn--block" type="button" data-request-project="${esc(p.slug)}"
                            data-project-name="${esc(p.name)}">Залишити заявку ${icon('arrow-right', 16)}</button>
                    <a class="btn btn--ghost-light btn--block" href="tel:+380000000000">${icon('phone', 16)} +38 000 000 00 00</a>
                </div>
            </aside>
        </div>`;
}

function syncGallery() {
    gallery.images = $$('.gallery__slide img').map((img) => ({ alt: img.alt }));
    gallery.index = 0;
}

function showSlide(next) {
    const total = gallery.images.length;
    if (total === 0) return;

    gallery.index = (next + total) % total;

    $$('.gallery__slide').forEach((slide, i) => {
        const active = i === gallery.index;
        slide.classList.toggle('is-active', active);
        slide.toggleAttribute('aria-hidden', !active);
    });

    $$('.gallery__thumb').forEach((thumb, i) => {
        thumb.classList.toggle('is-active', i === gallery.index);
        if (i === gallery.index) {
            thumb.scrollIntoView({
                block: 'nearest', inline: 'center',
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            });
        }
    });

    const caption = $('#galleryCaption');
    if (caption) caption.textContent = gallery.images[gallery.index].alt || '';
}

function openProject(slug, updateUrl = true) {
    const modal = $('#projectModal');
    const content = $('#modalContent');
    const dialog = $('#modalDialog');
    if (!modal || !content) return;

    const alreadyOpen = modal.classList.contains('is-open');
    if (!alreadyOpen) modalLastFocus = document.activeElement;

    if (!alreadyOpen) {
        modal.classList.add('is-open');
        lockScroll();
        modalReleaseTrap = trapFocus(modal);
    }

    // Відкритий проєкт — в адресі: посилання можна скопіювати
    if (updateUrl) {
        history.pushState({ project: slug }, '', `#/proekt/${encodeURIComponent(slug)}`);
    }

    const project = projectDetail(slug);
    if (project) {
        content.innerHTML = projectHtml(project);
        syncGallery();
        if (dialog) dialog.scrollTop = 0;
        $('.modal__close')?.focus();
    } else {
        content.innerHTML = `
            <div class="modal__body">
                <div class="modal__main">
                    <h2 class="modal__title" id="projectTitle">Проєкт не знайдено</h2>
                    <p class="modal__text">
                        Не вдалося завантажити картку проєкту. Спробуйте оновити сторінку
                        або зв'яжіться з нами — підберемо рішення разом.
                    </p>
                    <button class="btn btn--accent" type="button" data-open-contact>Зв'язатися</button>
                </div>
            </div>`;
    }
}

function closeProject(updateUrl = true) {
    const modal = $('#projectModal');
    if (!modal || !modal.classList.contains('is-open')) return;

    modal.classList.remove('is-open');
    unlockScroll();

    if (modalReleaseTrap) {
        modalReleaseTrap();
        modalReleaseTrap = null;
    }

    // Вміст чистимо після згасання — щоб галерея не «моргала» на виході
    setTimeout(() => {
        if (!modal.classList.contains('is-open')) $('#modalContent').innerHTML = '';
    }, 320);

    if (updateUrl && slugFromUrl()) {
        history.pushState(null, '', location.pathname + location.search);
    }

    if (modalLastFocus && document.body.contains(modalLastFocus)) {
        modalLastFocus.focus();
    }
}

/* =====================================================================
   Події
   ===================================================================== */

function applyFilters({ scroll = false } = {}) {
    renderPurposeFilters();
    renderCategoryFilters();
    renderGrid();
    if (scroll) scrollToSection('#proekty');
}

function bindEvents() {
    // Фільтр за призначенням
    $('#purposeFilters')?.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-purpose]');
        if (!chip) return;
        state.purpose = chip.dataset.purpose;
        state.category = 'all';
        applyFilters();
    });

    // Фільтр за типом об'єкта
    $('#categoryFilters')?.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-category]');
        if (!chip) return;
        state.category = chip.dataset.category;
        applyFilters();
    });

    // Сортування
    $('#catalogSort')?.addEventListener('change', (event) => {
        state.sort = event.target.value;
        renderGrid();
    });

    // Картки, скидання фільтрів, перехід із карток типів об'єктів
    document.addEventListener('click', (event) => {
        const card = event.target.closest('.project-card[data-slug]');
        if (card && $('#projectModal') && !(event.ctrlKey || event.metaKey || event.shiftKey)) {
            event.preventDefault();
            openProject(card.dataset.slug);
            return;
        }

        if (event.target.closest('[data-reset-filters]')) {
            state.purpose = 'all';
            state.category = 'all';
            applyFilters();
            return;
        }

        const styleBtn = event.target.closest('[data-style-filter]');
        if (styleBtn) {
            state.purpose = 'all';
            state.category = styleBtn.dataset.styleFilter;
            applyFilters({ scroll: true });
            return;
        }

        // Картка «Соціальні об'єкти» відкриває цілий розділ, а не один тип
        const purposeBtn = event.target.closest('[data-purpose-filter]');
        if (purposeBtn) {
            state.purpose = purposeBtn.dataset.purposeFilter;
            state.category = 'all';
            applyFilters({ scroll: true });
            return;
        }

        if (event.target.closest('[data-close-modal]')) {
            closeProject();
            return;
        }

        const requestBtn = event.target.closest('[data-request-project]');
        if (requestBtn) {
            const slug = requestBtn.dataset.requestProject;
            const name = requestBtn.dataset.projectName;
            closeProject();
            setTimeout(() => openContactPanel(slug, name), 340);
            return;
        }

        const thumb = event.target.closest('[data-thumb]');
        if (thumb) {
            showSlide(Number(thumb.dataset.thumb));
            return;
        }

        if (event.target.closest('[data-gallery-prev]')) showSlide(gallery.index - 1);
        if (event.target.closest('[data-gallery-next]')) showSlide(gallery.index + 1);
    });

    // Клавіатура: галерея в модалці
    document.addEventListener('keydown', (event) => {
        const modalOpen = $('#projectModal')?.classList.contains('is-open');
        if (!modalOpen) return;

        if (event.key === 'Escape') closeProject();
        if (event.key === 'ArrowLeft') showSlide(gallery.index - 1);
        if (event.key === 'ArrowRight') showSlide(gallery.index + 1);
    });

    // Кнопка «Назад» браузера
    window.addEventListener('popstate', () => {
        const slug = slugFromUrl();
        if (slug) {
            openProject(slug, false);
        } else {
            closeProject(false);
        }
    });
}

/* =====================================================================
   Прев'ю каталогу на головній сторінці
   ===================================================================== */

function renderGatewayMosaic(projects) {
    const mosaic = $('#gatewayMosaic');
    if (!mosaic) return;

    // Три плитки: обкладинки проєктів, а якщо проєктів менше — ще фото з їхніх галерей
    const picks = projects.flatMap((project) => project.gallery.map((image, i) => ({ project, image, i })))
        .sort((a, b) => a.i - b.i)
        .slice(0, 3);
    if (picks.length === 0) return;

    mosaic.innerHTML = picks.map(({ project, image, i }) => `
        <a class="gateway__tile" href="${projectUrl(project.slug)}"
           aria-label="${esc(project.name)} — сторінка проєкту">
            <img src="${esc(image.thumbUrl || image.url)}"
                 alt="${esc(image.alt || project.name)}" loading="lazy" decoding="async">
            <span class="gateway__tile-label">
                <span>${esc(i === 0 ? project.name : image.alt)}</span>
                ${i === 0 && project.priceUsd ? `<span class="gateway__tile-price">від ${PRICE}</span>` : ''}
            </span>
        </a>`).join('');

    const counter = $('#gatewayCount');
    if (counter) counter.textContent = String(projects.length);
}

/** project.html?slug=<slug> — окрема сторінка проєкту (раніше її рендерив сервер). */
function renderProjectPage() {
    const cards = projectCards();
    const slug = new URLSearchParams(location.search).get('slug') || cards[0]?.slug;
    const project = slug && projectDetail(slug);
    const article = $('[data-project]');
    if (!project) {
        article.innerHTML = `
            <div class="modal__body"><div class="modal__main">
                <h1 class="modal__title">Проєкт не знайдено</h1>
                <p class="modal__text">Можливо, посилання застаріло. Подивіться інші проєкти в каталозі.</p>
                <a class="btn btn--accent" href="projects.html#proekty">До каталогу</a>
            </div></div>`;
        return;
    }

    document.title = `${project.name}: ${project.subtitle || project.categoryName} — LINDEN HOUSE`;
    $('meta[name="description"]')?.setAttribute('content', project.summary || project.name);
    $('#crumbName').textContent = project.name;
    article.innerHTML = projectHtml(project);
    syncGallery();

    const others = cards.filter((card) => card.slug !== project.slug);
    const more = $('#moreProjects');
    if (others.length === 0) {
        more.hidden = true;
        return;
    }
    $('.project-page__links', more).innerHTML = others.map((card) => `
        <li><a class="project-page__link" href="${projectUrl(card.slug)}">
            ${card.cover ? `<img src="${esc(card.cover.thumbUrl)}" alt="" loading="lazy" decoding="async">` : ''}
            <span class="project-page__link-name">${esc(card.name)}</span>
            <span class="project-page__link-meta">${formatNumber(card.totalArea)} м²${card.priceUsd ? ` · від ${PRICE}` : ''}</span>
        </a></li>`).join('');
}

export async function initCatalog() {
    const hasGrid = Boolean($('#catalogGrid'));
    const hasMosaic = Boolean($('#gatewayMosaic'));
    const isProjectPage = Boolean($('[data-project]'));
    if (!hasGrid && !hasMosaic && !isProjectPage) return;

    if (hasGrid) renderSkeletons();
    bindEvents();

    if (isProjectPage) {
        renderProjectPage();
        return;
    }

    try {
        const projects = await loadProjects();

        state.categories = CATEGORIES;
        state.projects = projects;

        if (hasGrid) {
            applyFilters();
            observeReveals($('#proekty'));
            // Картки щойно зсунули сторінку — повертаємося до якоря нижче (#kalkuliator)
            if (/^#[\w-]+$/.test(location.hash)) scrollToSection(location.hash);
        }
        renderGatewayMosaic(projects);

        // Старе посилання на проєкт: /projects.html#/proekt/<slug>
        const slug = slugFromUrl();
        if (slug) openProject(slug, false);
    } catch (error) {
        const grid = $('#catalogGrid');
        if (grid) {
            grid.setAttribute('aria-busy', 'false');
            grid.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state__title">Не вдалося завантажити каталог</p>
                    <p>Перевірте з'єднання та оновіть сторінку.</p>
                    <button class="btn btn--ghost btn--sm" type="button"
                            onclick="location.reload()">Оновити</button>
                </div>`;
        }
        const counter = $('#catalogCount');
        if (counter) counter.textContent = 'Каталог тимчасово недоступний';
    }
}
