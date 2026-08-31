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

function updateThemeButtonsState() {
    const currentTheme = document.documentElement.dataset.theme || localStorage.getItem('timeflow_theme') || 'purple';
    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
        if (btn.getAttribute('data-theme-val') === currentTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const settingsIconEl = document.getElementById('icon-nav-settings');
    if (settingsIconEl && typeof Icons !== 'undefined') {
        settingsIconEl.innerHTML = Icons.get('settings', { size: 18 });
    }
    const savedTheme = localStorage.getItem('timeflow_theme') || 'purple';
    setAppTheme(savedTheme);
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