const STORAGE_KEY = 'mySchedule';

// 🌟 課程資料正規化防呆函式
function normalizeCourseData(c) {
    if (!c) return c;
    return {
        id: c.id || Date.now(),
        name: c.name || "未命名課程",
        credits: parseFloat(c.credits) || 0,
        type: c.type || "系定必修",
        status: c.status || (c.passed !== false ? '已取得' : '未取得'),
        score: (c.score !== undefined && c.score !== null) ? parseFloat(c.score) : null,
        passed: (c.status === '已取得' || (c.status === undefined && c.passed !== false)),
        isTentative: !!c.isTentative,
        slots: Array.isArray(c.slots) ? c.slots : [],
        color: c.color || '#2563eb',
        textColor: c.textColor || '#ffffff',
        recurring: c.recurring !== false,
        teacher: c.teacher || "",
        room: c.room || "",
        url: c.url || "",
        notes: c.notes || "",
        reminder: c.reminder ? {
            enabled: !!c.reminder.enabled,
            offsetMinutes: parseInt(c.reminder.offsetMinutes) || 30,
            type: c.reminder.type || "before_class"
        } : {
            enabled: false,
            offsetMinutes: 30,
            type: "before_class"
        }
    };
}

// 🌟 全域資料結構 (含課表、行事曆、學期起訖與各項門檻)
let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    deptName: "我的自訂科系",
    targetCredits: 128, 
    targetRequired: 50,
    targetReqElective: 0,
    targetElective: 40,
    maxOutElective: 0,
    englishWaived: 0,
    currentSemester: "一上",
    englishPassed: false,
    showNoon: true,
    showNight: false,
    showWeekend: false,
    crossMajor: { type: "none", name: "", target: 40 },
    wishlist: [],
    calendarEvents: [],   // 📅 行事曆行程庫
    semesterDates: {},    // 📅 各學期起訖與週數記錄
    semesterOrder: ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"],
    semesters: {
        "一上": [], "一下": [], "二上": [], "二下": [], "三上": [], "三下": [], "四上": [], "四下": []
    }
};

// 補強初始預設值與欄位防呆
if (!appData.deptName) appData.deptName = "我的自訂科系";
if (!appData.targetCredits) appData.targetCredits = 128;
if (!appData.targetRequired) appData.targetRequired = 50;
if (appData.targetReqElective === undefined) appData.targetReqElective = 0;
if (!appData.targetElective) appData.targetElective = 40;
if (appData.maxOutElective === undefined) appData.maxOutElective = 0;
if (appData.englishWaived === undefined) appData.englishWaived = 0;
if (appData.showNoon === undefined) appData.showNoon = true;
if (appData.showNight === undefined) appData.showNight = false;
if (appData.showWeekend === undefined) appData.showWeekend = false;
if (!appData.crossMajor) appData.crossMajor = { type: "none", name: "", target: 40 };
if (!appData.wishlist) appData.wishlist = [];
if (!appData.calendarEvents) appData.calendarEvents = [];
if (!appData.semesterDates) appData.semesterDates = {};
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

// 💾 匯出完整備份 JSON (含課表、行事曆、學期起訖日、畢業設定)
function exportData() {
    const todayStr = (typeof formatDate === 'function') ? formatDate(new Date()) : new Date().toISOString().split('T')[0];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `NCKUEE_課表備份_${appData.deptName || '個人課表'}_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// 📂 匯入備份 JSON (全域覆蓋、正規化並同步更新所有 UI)
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && typeof importedData === 'object' && importedData.semesters) {
                cancelEdit();

                // 欄位防呆補齊
                if (!importedData.deptName) importedData.deptName = "我的自訂科系";
                if (importedData.targetRequired === undefined) importedData.targetRequired = 50;
                if (importedData.targetElective === undefined) importedData.targetElective = 40;
                if (importedData.maxOutElective === undefined) importedData.maxOutElective = 0;
                if (importedData.showNoon === undefined) importedData.showNoon = true;
                if (importedData.showNight === undefined) importedData.showNight = false;
                if (importedData.showWeekend === undefined) importedData.showWeekend = false;
                if (!importedData.crossMajor) importedData.crossMajor = { type: "none", name: "", target: 40 };
                if (!importedData.wishlist) importedData.wishlist = [];
                if (!importedData.calendarEvents) importedData.calendarEvents = [];
                if (!importedData.semesterDates) importedData.semesterDates = {};
                if (!importedData.semesterOrder) {
                    importedData.semesterOrder = Object.keys(importedData.semesters);
                }

                // 課程正規化
                Object.keys(importedData.semesters).forEach(sem => {
                    importedData.semesters[sem] = (importedData.semesters[sem] || []).map(normalizeCourseData);
                });
                importedData.wishlist = (importedData.wishlist || []).map(normalizeCourseData);

                // 賦值並寫入資料庫
                appData = importedData;
                saveData();

                // 刷新介面
                initTable();
                updateAppUI();
                alert("🎉 全學期課表、學期時程與行事曆行程已全數成功載入！");
            } else {
                alert("❌ 檔案結構不相容，請確認是否為本系統匯出的 JSON 檔！");
            }
        } catch (err) {
            alert("❌ 讀取檔案失敗，請檢查 JSON 檔案格式！");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}