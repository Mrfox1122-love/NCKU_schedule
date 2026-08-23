const STORAGE_KEY = 'mySchedule';

// ============================================================
// ⏱️ TimeEngine：基礎輔助運算工具
// ============================================================
const TimeEngine = {
    formatDate(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    parseDate(str) {
        if (!str) return new Date();
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
};

// ============================================================
// 🌟 課程資料正規化與相容防呆
// ============================================================
function normalizeCourseData(c) {
    if (!c) return c;
    const color = c.color || '#2563eb';
    const score = (c.score !== undefined && c.score !== null) ? parseFloat(c.score) : null;
    const isPassed = (c.status === '已取得' || (c.status === undefined && c.passed !== false));

    return {
        id: c.id || Date.now(),
        code: c.code || '',
        name: c.name || "未命名課程",
        credits: parseFloat(c.credits) || 0,
        type: c.type || "系定必修",
        status: c.status || (isPassed ? '已取得' : '未取得'),
        score: score,
        passed: isPassed,
        isTentative: !!c.isTentative,
        slots: Array.isArray(c.slots) ? c.slots : [],
        color: color,
        textColor: c.textColor || (typeof getContrastTextColor === 'function' ? getContrastTextColor(color) : '#ffffff'),
        recurring: c.recurring !== false,
        teacher: c.teacher || "",
        room: c.room || "",
        url: c.url || "",
        notes: c.notes || "",
        frequency: c.frequency || 'weekly',
        overrides: (c.overrides && typeof c.overrides === 'object' && !Array.isArray(c.overrides)) ? c.overrides : {}
    };
}

// 🌟 全域核心資料結構 (TimeFlow v3.0)
let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    deptName: "電機系",
    entryYear: 118,
    currentSemester: "一上",
    semesterOrder: ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"],
    semesters: {
        "一上": [], "一下": [], "二上": [], "二下": [], "三上": [], "三下": [], "四上": [], "四下": []
    },
    wishlist: [],
    targetCredits: 138, 
    targetRequired: 59,
    targetReqElective: 3,
    targetElective: 51,
    maxOutElective: 9,
    englishWaived: 0,
    englishPassed: false,
    showNoon: true,
    showNight: false,
    showWeekend: false,
    crossMajor: { type: "none", name: "", target: 40 }
};

// 補強初始預設值與欄位防呆
if (!appData.deptName) appData.deptName = "電機系";
if (appData.entryYear === undefined) appData.entryYear = 118;
if (!appData.targetCredits) appData.targetCredits = 138;
if (!appData.targetRequired) appData.targetRequired = 59;
if (appData.targetReqElective === undefined) appData.targetReqElective = 3;
if (!appData.targetElective) appData.targetElective = 51;
if (appData.maxOutElective === undefined) appData.maxOutElective = 9;
if (appData.englishWaived === undefined) appData.englishWaived = 0;
if (appData.showNoon === undefined) appData.showNoon = true;
if (appData.showNight === undefined) appData.showNight = false;
if (appData.showWeekend === undefined) appData.showWeekend = false;
if (!appData.crossMajor) appData.crossMajor = { type: "none", name: "", target: 40 };
if (!appData.wishlist) appData.wishlist = [];
if (!appData.semesters) appData.semesters = {};
if (!appData.semesterOrder || !Array.isArray(appData.semesterOrder) || appData.semesterOrder.length === 0) {
    appData.semesterOrder = ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
}

// 遍歷修復現有課程與候選清單
Object.keys(appData.semesters).forEach(sem => {
    appData.semesters[sem] = (appData.semesters[sem] || []).map(normalizeCourseData);
});
appData.wishlist = (appData.wishlist || []).map(normalizeCourseData);

appData.semesterOrder.forEach(sem => {
    if (!appData.semesters[sem]) {
        appData.semesters[sem] = [];
    }
});

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// 💾 匯出完整規劃 JSON
function exportData() {
    const todayStr = TimeEngine.formatDate(new Date());
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TimeFlow_修課規劃備份_${appData.deptName || '個人課表'}_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// 📂 匯入備份 JSON
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && typeof importedData === 'object' && importedData.semesters && typeof importedData.semesters === 'object') {
                if (typeof cancelEdit === 'function') cancelEdit();

                if (!importedData.deptName) importedData.deptName = "電機系";
                if (importedData.entryYear === undefined) importedData.entryYear = 118;
                if (importedData.targetCredits === undefined) importedData.targetCredits = 138;
                if (importedData.targetRequired === undefined) importedData.targetRequired = 59;
                if (importedData.targetReqElective === undefined) importedData.targetReqElective = 3;
                if (importedData.targetElective === undefined) importedData.targetElective = 51;
                if (importedData.maxOutElective === undefined) importedData.maxOutElective = 9;
                if (importedData.englishWaived === undefined) importedData.englishWaived = 0;
                if (importedData.showNoon === undefined) importedData.showNoon = true;
                if (importedData.showNight === undefined) importedData.showNight = false;
                if (importedData.showWeekend === undefined) importedData.showWeekend = false;
                if (!importedData.crossMajor) importedData.crossMajor = { type: "none", name: "", target: 40 };
                if (!importedData.wishlist || !Array.isArray(importedData.wishlist)) importedData.wishlist = [];

                const rawSemKeys = Object.keys(importedData.semesters);
                if (!importedData.semesterOrder || !Array.isArray(importedData.semesterOrder) || importedData.semesterOrder.length === 0) {
                    importedData.semesterOrder = rawSemKeys.length > 0 ? rawSemKeys : ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
                }

                importedData.semesterOrder.forEach(sem => {
                    if (!importedData.semesters[sem] || !Array.isArray(importedData.semesters[sem])) {
                        importedData.semesters[sem] = [];
                    }
                });

                rawSemKeys.forEach(sem => {
                    if (!importedData.semesterOrder.includes(sem)) {
                        importedData.semesterOrder.push(sem);
                    }
                });

                if (!importedData.currentSemester || !importedData.semesterOrder.includes(importedData.currentSemester)) {
                    importedData.currentSemester = importedData.semesterOrder[0];
                }

                Object.keys(importedData.semesters).forEach(sem => {
                    importedData.semesters[sem] = (importedData.semesters[sem] || []).map(normalizeCourseData);
                });
                importedData.wishlist = (importedData.wishlist || []).map(normalizeCourseData);

                appData = importedData;
                saveData();

                if (typeof initTable === 'function') initTable();
                if (typeof updateAppUI === 'function') updateAppUI();
                alert("🎉 多學期修課規劃與候選庫已全數成功載入！");
            } else {
                alert("❌ 檔案結構不相容，請確認是否為 TimeFlow 匯出的 JSON 檔！");
            }
        } catch (err) {
            alert("❌ 讀取檔案失敗，請檢查 JSON 檔案格式！");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// 🗑️ 清空當前學期所有課程
function clearAll() {
    const curSem = appData.currentSemester;
    const courses = appData.semesters[curSem] || [];
    
    if (courses.length === 0) {
        alert(`「${curSem}」目前本來就沒有任何課程！`);
        return;
    }

    if (confirm(`⚠️ 確定要清空「${curSem}」的所有課程嗎？\n此動作將刪除該學期的 ${courses.length} 門課程且無法復原！`)) {
        appData.semesters[curSem] = [];
        if (typeof cancelEdit === 'function') cancelEdit();
        saveData();
        if (typeof updateAppUI === 'function') updateAppUI();
        alert(`🗑️ 已成功清空「${curSem}」的所有課程！`);
    }
}