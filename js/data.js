const STORAGE_KEY = 'mySchedule';

// 🌟 舊資料相容正規化輔助函式
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
        // 🌟 新增欄位與預設值
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
    semesterOrder: ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"],
    semesters: {
        "一上": [], "一下": [], "二上": [], "二下": [], "三上": [], "三下": [], "四上": [], "四下": []
    }
};

// 補強初始預設值與舊課程資料正規化
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
if (!appData.semesters) appData.semesters = {};
if (!appData.semesterOrder || !Array.isArray(appData.semesterOrder) || appData.semesterOrder.length === 0) {
    appData.semesterOrder = ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
}

// 遍歷所有學期與候選庫進行舊資料修復
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

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "my_schedule_generic.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if(importedData && importedData.semesters) {
                cancelEdit();
                
                if (importedData.deptName === undefined) importedData.deptName = "我的自訂科系";
                if (importedData.targetRequired === undefined) importedData.targetRequired = 50;
                if (importedData.targetElective === undefined) importedData.targetElective = 40;
                if (importedData.maxOutElective === undefined) importedData.maxOutElective = 0;
                if (importedData.showNoon === undefined) importedData.showNoon = true;
                if (importedData.showNight === undefined) importedData.showNight = false;
                if (importedData.showWeekend === undefined) importedData.showWeekend = false;
                if (!importedData.crossMajor) importedData.crossMajor = { type: "none", name: "", target: 40 };
                if (!importedData.wishlist) importedData.wishlist = [];
                if (!importedData.semesterOrder) {
                    importedData.semesterOrder = Object.keys(importedData.semesters);
                }
                
                // 匯入資料正規化
                Object.keys(importedData.semesters).forEach(sem => {
                    importedData.semesters[sem] = (importedData.semesters[sem] || []).map(normalizeCourseData);
                });
                importedData.wishlist = (importedData.wishlist || []).map(normalizeCourseData);

                appData = importedData;
                initTable();
                updateAppUI();
                alert("全學期修業規劃載入成功！");
            } else {
                alert("檔案結構不相容！");
            }
        } catch (err) {
            alert("讀取檔案失敗！");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}