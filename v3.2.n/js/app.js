// ============================================================
// 🧭 TimeFlow 主應用程式控制器與三核心路由 (Clean)
// ============================================================

function updateAppUI() {
    renderSchedule();
    const gradResult = calculateGraduation(appData);
    renderGraduationUI(gradResult, appData);
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
    saveData();
    updateAppUI();
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
}

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

function setAppTheme(themeName) {
    document.documentElement.dataset.theme = themeName;
    localStorage.setItem('timeflow_theme', themeName);
    updateThemeButtonsState();
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
    localStorage.setItem('timeflow_theme_collapsed', isCollapsed ? '1' : '0');
}

function updateThemeButtonsState() {
    const currentTheme = document.documentElement.dataset.theme || localStorage.getItem('timeflow_theme') || 'purple';
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
    const isCollapsed = localStorage.getItem('timeflow_theme_collapsed') !== '0';
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
    element.classList.toggle('open');
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

// 掛載至全域
if (typeof window !== 'undefined') {
    window.openFaqModal = openFaqModal;
    window.closeFaqModal = closeFaqModal;
    window.toggleFaqAccordion = toggleFaqAccordion;
    window.openDataSourceModal = openDataSourceModal;
    window.closeDataSourceModal = closeDataSourceModal;
    window.openTermsModal = openTermsModal;
    window.closeTermsModal = closeTermsModal;
}