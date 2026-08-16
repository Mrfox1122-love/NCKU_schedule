function updateAppUI() {
    renderSchedule();
    const gradResult = calculateGraduation(appData);
    renderGraduationUI(gradResult, appData);
    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }
    // 🌟 核心同步：UI 更新時同步重新計算並渲染首頁
    if (typeof renderHomeView === 'function') {
        renderHomeView();
    }
}

function previewGrade() {
    const score = parseFloat(document.getElementById('courseScore').value);
    const previewEl = document.getElementById('gradePreview');
    if (!isNaN(score) && score >= 0 && score <= 100) {
        previewEl.innerText = `等第: ${getLetterGrade(score)} ｜ GPA: ${getGradePoint(score)}`;
    } else {
        previewEl.innerText = '';
    }
}

function toggleScoreInput() {
    const mode = document.getElementById('courseStatusMode').value;
    const group = document.getElementById('scoreInputGroup');
    if (mode === '已結算') {
        group.style.display = 'block';
        previewGrade();
    } else {
        group.style.display = 'none';
    }
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

// 🌟 頁面載入初始化
window.addEventListener('DOMContentLoaded', () => {
    // 1. 讀取上次的收合狀態 (預設為收合 '1')
    const isCollapsed = localStorage.getItem('nckuee_grad_collapsed');
    const board = document.querySelector('.grad-checker-board');
    if (board) {
        board.classList.toggle('collapsed', isCollapsed !== '0');
    }

    // 2. 初始化課表與所有 UI
    initTable();
    updateAppUI();

    // 3. 預設顯示生活入口首頁
    switchView('home');
});

// 🧭 View Router: 處理視圖切換與 UI 狀態連動
function switchView(viewId) {
    // 1. 重置所有 View 與 Nav 狀態
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // 2. 啟用目標 View
    const targetView = document.getElementById(`view-${viewId}`);
    const targetNav = document.getElementById(`nav-${viewId}`);
    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    // 3. 連動 Sidebar 邏輯 (只有課表頁需要課程編輯器)
    const sidebar = document.getElementById('sidebarPanel');
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebar && sidebarToggle) {
        if (viewId === 'schedule') {
            sidebar.style.display = '';
            sidebarToggle.style.display = '';
        } else {
            sidebar.style.display = 'none';
            sidebarToggle.style.display = 'none';
            if (document.body.classList.contains('sidebar-open')) {
                toggleSidebar(false);
            }
        }
    }

    // 4. 切換視圖時即時重新計算並更新對應畫面
    if (viewId === 'home' && typeof renderHomeView === 'function') {
        renderHomeView();
    }
    if (viewId === 'calendar' && typeof renderCalendar === 'function') {
        renderCalendar();
    }
}

// 📅 行程表單儲存處理函式
function handleSaveEventForm() {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    if (!title || !date) {
        alert('請填寫行程名稱與日期！');
        return;
    }

    const eventData = {
        title: title,
        date: date,
        startTime: document.getElementById('eventStartTime').value,
        endTime: document.getElementById('eventEndTime').value,
        category: document.getElementById('eventCategory').value,
        color: document.getElementById('eventColor').value,
        location: document.getElementById('eventLocation').value,
        notes: document.getElementById('eventNotes').value
    };

    if (editingEventId) {
        updateCalendarEvent(editingEventId, eventData);
    } else {
        addCalendarEvent(eventData);
    }
    closeEventEditor();
    updateAppUI();
}