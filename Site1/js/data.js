/* =====================================================================
   Каталог без бази даних: проєкти описані тут і рахуються в браузері.
   Щоб додати проєкт — скопіюйте об'єкт у PROJECTS і змініть поля.
   Ціни: площа × ставка за м², округлено до сотні доларів.
   ===================================================================== */

const unsplash = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const photo = (id, alt) => ({ url: unsplash(id, 1600), thumbUrl: unsplash(id, 720), alt, plan: false });

export const CATEGORIES = [
    { slug: 'house', name: 'Будинки', tagline: "Житлові будинки на дерев'яному каркасі" },
];

const PURPOSE_TITLES = { RESIDENTIAL: 'Будинки', PUBLIC: "Соціальні об'єкти", COMMERCIAL: 'Комерційні об\'єкти' };

/** Змінюючи ставки, оновіть «Комплектації» на housing.html, «Скільки коштує» на about.html і калькулятор. */
const TURNKEY_USD_SQM = 1250;
const HOUSE_STAGES = [
    ['Коробка', "Дерев'яний каркас, стіни, перекриття, покрівля", 250],
    ['Тепловий контур', 'Плюс інженерні мережі та вікна', 500],
    ['З оздобленням', 'Внутрішнє й зовнішнє оздоблення', 900],
    ['З санвузлом', 'Оздоблення плюс сантехніка в санвузлі', 950],
    ['Під ключ', 'Базові меблі й кухня — можна жити', TURNKEY_USD_SQM],
];

const PROJECTS = [
    {
        slug: 'linden-96',
        name: 'LINDEN 96',
        subtitle: 'Одноповерховий будинок на три спальні з терасою',
        summary: 'Сімейний будинок 96 м² із кухнею-вітальнею, мастер-спальнею та терасою під навісом.',
        description:
            "Будинок для родини з дітьми на ділянці від 6 соток. Центр плану — світла кухня-вітальня " +
            "на 34 м² з панорамними вікнами й виходом на терасу. Спальні винесені в окреме крило: " +
            "мастер-спальня з гардеробом і власним санвузлом, дитяча та кабінет, який легко стає гостьовою. " +
            "Каркас і стінові панелі виготовляємо на виробництві, тож на ділянці будинок збирається " +
            "за тиждень, а заїхати можна вже за три місяці від підписання договору.",
        categorySlug: 'house',
        purpose: 'RESIDENTIAL',
        totalArea: 96,
        terraceArea: 16.5,
        floors: 1,
        bedrooms: 3,
        bathrooms: 2,
        widthM: 12,
        lengthM: 8,
        ceilingM: 2.7,
        frame: "Дерев'яний каркас камерної сушки, стійки 45×195 мм",
        facade: 'Фіброцементні панелі та планкен із термодерева',
        roof: 'Односхила фальцева покрівля, ухил 8°',
        insulation: 'Мінвата 200 мм у стінах, 250 мм у покрівлі',
        heating: 'Тепловий насос повітря–вода, тепла підлога',
        foundation: 'Гвинтові палі або утеплена шведська плита',
        utilities: 'Електрика, вода, каналізація, припливно-витяжна вентиляція з рекуперацією',
        energyClass: 'A',
        buildDays: 60,
        installDays: 7,
        warrantyYears: 10,
        priceRateUsd: 250,
        smartHome: true,
        transportable: false,
        features: [
            'Кухня-вітальня 34 м² з панорамними вікнами',
            'Мастер-спальня з гардеробом і власним санвузлом',
            'Тераса 16,5 м² під навісом',
            'Тепловий насос і тепла підлога',
            'Підготовка під сонячну станцію на даху',
            'Розумний дім: світло, клімат, датчики протікання',
        ],
        rooms: [
            ['Кухня-вітальня', 34.3],
            ['Хол і передпокій', 11.2],
            ['Мастер-спальня', 15.2],
            ['Гардероб', 2.5],
            ['Санвузол при спальні', 3.1],
            ['Дитяча', 11.2],
            ['Кабінет / гостьова', 9.2],
            ['Санвузол', 5.3],
            ['Техприміщення й пральня', 3.9],
        ].map(([name, area]) => ({ name, area, floorNo: 1 })),
        images: [
            photo('1671621556327-0596aad30b6f', 'Головний фасад LINDEN 96: вхід і доріжка до ґанку'),
            photo('1671621556339-d833f511ab5d', 'Тераса під перголою біля кухні-вітальні'),
            photo('1671621556393-72aae2f654e5', 'Садовий фасад: панорамні вікна й вихід на терасу'),
            photo('1583847268964-b28dc8f51f92', 'Кухня-вітальня з панорамним вікном'),
            photo('1765371515325-b6611765dfad', 'Кухня з фасадами з дерева'),
            photo('1765547090903-348b711f0eee', 'Мастер-спальня з дерев\'яними акцентами'),
            photo('1763485956310-55f3c0e822d5', "Санвузол із кам'яною плиткою"),
            { url: 'images/plans/linden-96.svg', thumbUrl: 'images/plans/linden-96.svg', alt: 'План будинку LINDEN 96: 96 м² і тераса 16,5 м²', plan: true },
        ],
    },
];

/* --- Те, що раніше рахував бекенд --------------------------------------- */

const priceUsd = (area, rate) => (area > 0 && rate ? Math.round((area * rate) / 100) * 100 : null);

const priceLabel = (p) => (p.purpose === 'PUBLIC' ? 'Базова комплектація від' : 'Коробка від');

function priceStages(p) {
    const stages = p.purpose === 'COMMERCIAL' ? HOUSE_STAGES.slice(0, 2) : HOUSE_STAGES;
    return stages.map(([title, note, rate]) => ({ title, note, rateUsd: rate, totalUsd: priceUsd(p.totalArea, rate) }));
}

function category(p) {
    return CATEGORIES.find((c) => c.slug === p.categorySlug) || { name: p.categorySlug, tagline: '' };
}

/** Повна картка проєкту — для модалки й сторінки project.html. */
function toDetail(p) {
    const cat = category(p);
    return {
        ...p,
        categoryName: cat.name,
        categoryTagline: cat.tagline,
        purposeTitle: PURPOSE_TITLES[p.purpose],
        priceUsd: priceUsd(p.totalArea, p.priceRateUsd),
        priceLabel: priceLabel(p),
        priceStages: priceStages(p),
        gallery: p.images.filter((i) => !i.plan),
        plans: p.images.filter((i) => i.plan),
    };
}

/** Скорочена картка — для сітки каталогу. */
function toCard(p) {
    const d = toDetail(p);
    return {
        ...d,
        turnkeyUsd: priceUsd(p.totalArea, TURNKEY_USD_SQM),
        cover: d.gallery[0] || null,
        imageCount: d.gallery.length,
        features: p.features.slice(0, 3),
    };
}

export const projectCards = () => PROJECTS.map(toCard);

export function projectDetail(slug) {
    const project = PROJECTS.find((p) => p.slug === slug);
    return project ? toDetail(project) : null;
}
