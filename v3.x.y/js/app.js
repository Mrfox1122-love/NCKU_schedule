// ============================================================
// 🧭 TimeFlow 主應用程式控制器與雙核心路由 (Plan / Graduation)
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

// 🧭 雙核心路由切換 (Plan / Graduation)
function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewId}`);
    const targetNav = document.getElementById(`nav-${viewId}`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    const sidebar = document.getElementById('sidebarPanel');
    if (sidebar) {
        if (viewId === 'plan') {
            sidebar.style.display = '';
        } else {
            sidebar.style.display = 'none';
            if (document.body.classList.contains('sidebar-open')) {
                toggleSidebar(false);
            }
        }
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