/* =====================================================================
   Точка входу: збирає всі модулі сайту
   ===================================================================== */

import { initNav } from './nav.js';
import { initPageNav, initActiveSection } from './pagenav.js';
import { initAnimations } from './animations.js';
import { initCatalog } from './catalog.js';
import { initForms } from './forms.js';
import { initPages } from './pages.js';
import { initHousingCheck } from './housing.js';
import { initCalculator } from './calc.js';
import { initConsent } from './consent.js';

function boot() {
    initConsent();
    initNav();
    initPageNav();
    initActiveSection();
    initAnimations();
    initForms();
    initCatalog();
    initPages();
    initHousingCheck();
    initCalculator();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}
