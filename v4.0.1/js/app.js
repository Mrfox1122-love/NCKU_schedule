// ============================================================
// 🧭 TimeFlow 主應用程式控制器與三核心路由 (Clean)
// ============================================================

(function () {
function updateAppUI() {
    renderSchedule();

    // 碩士班與大學部使用各自獨立的規則、計算與畫面
    const isMaster = typeof isMasterMode === 'function' && isMasterMode(appData);
    if (typeof applyDegreeLayout === 'function') applyDegreeLayout(isMaster);

    if (isMaster) {
        renderMasterGraduationUI(calculateMasterGraduation(appData), appData);
        updateMasterCourseTypeOptions();
    } else {
        const gradResult = calculateGraduation(appData);
        renderGraduationUI(gradResult, appData);
        if (typeof updateBachelorFindButtons === 'function') updateBachelorFindButtons(gradResult);
    }
    if (typeof renderProgramCheck === 'function') renderProgramCheck();
    if (typeof renderScheduleCheck === 'function') renderScheduleCheck();
}

function toggleSidebar(forceState) {
    const body = document.body;
    if (forceState !== undefined) {
        body.classList.toggle('sidebar-open', forceState);
    } else {
        body.classList.toggle('sidebar-open');
    }
}

function switchSemester() {
    appData.currentSemester = document.getElementById('semSelect').value;
    cancelEdit();
    TimeFlowStore.commit();
}

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewId}`);
    const targetNav = document.getElementById(`nav-${viewId}`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    // 離開規劃視圖時關閉側邊欄
    if (document.body.classList.contains('sidebar-open') && viewId !== 'plan') {
        toggleSidebar(false);
    }

    if (viewId === 'discover' && typeof openDiscoverView === 'function') {
        openDiscoverView();
    } else if (viewId === 'graduation' && typeof renderScheduleCheck === 'function') {
        renderScheduleCheck();
    }
}

// 所有模組透過 TimeFlowStore.commit() / refresh() 觸發重繪，不直接呼叫 updateAppUI()
TimeFlowStore.on('change', updateAppUI);

window.addEventListener('DOMContentLoaded', () => {
    initTable();
    updateAppUI();
    switchView('plan');
});

function openSettingsModal() {
    updateThemeButtonsState();
    ModalManager.open('settingsModal');
}

function closeSettingsModal() {
    ModalManager.close('settingsModal');
}

// 「跟隨系統」對應的深淺色主題
const AUTO_THEME = { dark: 'purple', light: 'glacier' };
const systemLightQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

function getSavedThemePreference() {
    try {
        return localStorage.getItem('timeflow_theme') || 'purple';
    } catch (e) {
        return 'purple';
    }
}

function resolveTheme(pref) {
    if (pref !== 'auto') return pref;
    return (systemLightQuery && systemLightQuery.matches) ? AUTO_THEME.light : AUTO_THEME.dark;
}

function setAppTheme(themeName) {
    document.documentElement.dataset.theme = resolveTheme(themeName);
    try {
        localStorage.setItem('timeflow_theme', themeName);
    } catch (e) { /* 無法儲存時本次仍套用 */ }
    updateThemeButtonsState();
}

// 系統深淺色切換時，「跟隨系統」立即同步
if (systemLightQuery) {
    const onSystemThemeChange = () => {
        if (getSavedThemePreference() === 'auto') setAppTheme('auto');
    };
    if (typeof systemLightQuery.addEventListener === 'function') {
        systemLightQuery.addEventListener('change', onSystemThemeChange);
    } else if (typeof systemLightQuery.addListener === 'function') {
        systemLightQuery.addListener(onSystemThemeChange);
    }
}

// 🎨 主題選單摺疊控制
function toggleThemeAccordion() {
    const body = document.getElementById('themeAccordionBody');
    const arrow = document.getElementById('themeAccordionArrow');
    if (!body) return;

    const isCollapsed = body.classList.toggle('collapsed');
    if (arrow) {
        arrow.classList.toggle('open', !isCollapsed);
    }
    try {
        localStorage.setItem('timeflow_theme_collapsed', isCollapsed ? '1' : '0');
    } catch (e) { /* 無法存取儲存空間時本次仍套用 */ }
}

function updateThemeButtonsState() {
    const currentTheme = getSavedThemePreference();
    let currentThemeName = '夜幕紫';

    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
        if (btn.getAttribute('data-theme-val') === currentTheme) {
            btn.classList.add('active');
            const textEl = btn.querySelector('.theme-opt-text');
            if (textEl) {
                // 取括號前的主題中文名稱
                currentThemeName = textEl.innerText.split(' ')[0];
            }
        } else {
            btn.classList.remove('active');
        }
    });

    const badge = document.getElementById('currentThemeBadge');
    if (badge) {
        badge.innerText = currentThemeName;
    }
}

// 初始化時記憶使用者上次的展開/收合狀態 (預設為收合)
window.addEventListener('DOMContentLoaded', () => {
    let isCollapsed = true;
    try {
        isCollapsed = localStorage.getItem('timeflow_theme_collapsed') !== '0';
    } catch (e) { /* 無法存取儲存空間時維持預設 */ }
    const body = document.getElementById('themeAccordionBody');
    const arrow = document.getElementById('themeAccordionArrow');
    if (body && arrow) {
        body.classList.toggle('collapsed', isCollapsed);
        arrow.classList.toggle('open', !isCollapsed);
    }
    updateThemeButtonsState();
});

// ============================================================
// FAQ、資料來源、使用者條款彈窗與手風琴控制器
// ============================================================

function openFaqModal() {
    ModalManager.open('faqModal');
}

function closeFaqModal(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) {
        return;
    }
    ModalManager.close('faqModal');
}

function toggleFaqAccordion(element) {
    if (!element) return;
    const item = typeof element.closest === 'function' ? element.closest('.tf-accordion-item') : null;
    (item || element).classList.toggle('open');
}

function openDataSourceModal() {
    ModalManager.open('dataSourceModal');
}

function closeDataSourceModal(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) {
        return;
    }
    ModalManager.close('dataSourceModal');
}

function openTermsModal() {
    ModalManager.open('termsModal');
}

function closeTermsModal(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) {
        return;
    }
    ModalManager.close('termsModal');
}


// ── 對外公開（其他模組、HTML data-action、測試使用）；其餘名稱只在本模組內可見 ──
TimeFlow.expose('app', {
    updateAppUI, toggleSidebar, switchSemester, switchView, openSettingsModal, closeSettingsModal,
    setAppTheme, toggleThemeAccordion, openFaqModal, closeFaqModal, toggleFaqAccordion,
    openDataSourceModal, closeDataSourceModal, openTermsModal, closeTermsModal
});
})();
