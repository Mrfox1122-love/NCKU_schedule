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
        if (!str || typeof str !== 'string') return new Date();
        const parts = str.split('-').map(Number);
        if (parts.length < 3 || parts.some(isNaN)) return new Date();
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }
};

// ============================================================
// 🌟 學期排序與命名輔助工具 (支援暑修：一上 < 一下 < 一暑 < 二上)
// ============================================================
const SEMESTER_NUM_MAP = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function sortSemesterOrder(orderList = []) {
    const getIndex = s => {
        if (typeof s !== 'string') return 999;
        const m = s.match(/^([一二三四五六七八九十\d]+)(上|下|暑)$/);
        if (!m) return 999;
        const yIdx = SEMESTER_NUM_MAP.indexOf(m[1]);
        const termIdx = m[2] === '上' ? 0 : (m[2] === '下' ? 1 : 2);
        return (yIdx >= 0 ? yIdx : 10) * 3 + termIdx;
    };
    orderList.sort((a, b) => getIndex(a) - getIndex(b));
    return orderList;
}

function getNextSemesterName(orderList = []) {
    const regularList = orderList.filter(s => typeof s === 'string' && (s.endsWith('上') || s.endsWith('下')));
    if (regularList.length === 0) return '一上';
    
    const last = regularList[regularList.length - 1];
    const match = last.match(/^([一二三四五六七八九十\d]+)(上|下)$/);
    if (!match) return '五上';

    const y = match[1];
    const t = match[2];
    const yIdx = SEMESTER_NUM_MAP.indexOf(y);

    if (t === '上') {
        return `${y}下`;
    } else {
        const nextY = (yIdx !== -1 && yIdx + 1 < SEMESTER_NUM_MAP.length) ? SEMESTER_NUM_MAP[yIdx + 1] : '五';
        return `${nextY}上`;
    }
}

// ============================================================
// 🌟 課程資料正規化與資安防呆 (嚴格型別校驗與 ID 安全化)
// ============================================================
function normalizeCourseData(c) {
    if (!c || typeof c !== 'object') return null;

    // 🛡️ 資安防護：強制 ID 必須為合法安全數值，防止屬性逃逸注入
    let cleanId;
    if (typeof c.id === 'number' && !isNaN(c.id) && c.id > 0) {
        cleanId = c.id;
    } else if (typeof c.id === 'string' && /^\d+$/.test(c.id.trim())) {
        cleanId = Number(c.id.trim());
    } else {
        cleanId = Date.now() + Math.floor(Math.random() * 10000);
    }

    // 🛡️ 資安防護：顏色必須符合 HEX 格式，避免 CSS 屬性注入
    const rawColor = typeof c.color === 'string' ? c.color.trim() : '';
    const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#2563eb';

    const isWaived = (c.status === '已抵免');
    const rawScore = (!isWaived && c.score !== undefined && c.score !== null) ? parseFloat(c.score) : null;
    const score = (rawScore !== null && !isNaN(rawScore) && rawScore >= 0 && rawScore <= 100) ? rawScore : null;
    
    const isPassed = isWaived ? true : (c.status === '已取得' || (c.status === undefined && c.passed !== false));
    const status = isWaived ? '已抵免' : (c.status === '修讀中' || c.status === '未取得' || c.status === '已取得' ? c.status : (isPassed ? '已取得' : '未取得'));

    // 處理時段 slots 陣列安全格式化
    const safeSlots = Array.isArray(c.slots) ? c.slots.filter(s => s && typeof s === 'object').map(s => ({
        day: (typeof s.day === 'number' && s.day >= 1 && s.day <= 7) ? s.day : 1,
        periods: Array.isArray(s.periods) ? s.periods.map(p => String(p).trim()).filter(Boolean) : []
    })) : [];

    return {
        id: cleanId,
        code: typeof c.code === 'string' ? c.code.slice(0, 30) : '',
        name: typeof c.name === 'string' ? (c.name.trim() || '未命名課程') : '未命名課程',
        credits: (!isNaN(parseFloat(c.credits)) && parseFloat(c.credits) >= 0) ? parseFloat(c.credits) : 0,
        type: typeof c.type === 'string' ? c.type : '系定必修',
        status: status,
        score: score,
        passed: isPassed,
        isTentative: !!c.isTentative,
        isNoSchedule: !!c.isNoSchedule,
        slots: safeSlots,
        color: color,
        textColor: (typeof getContrastTextColor === 'function') ? getContrastTextColor(color) : '#ffffff',
        recurring: c.recurring !== false,
        teacher: typeof c.teacher === 'string' ? c.teacher.slice(0, 50) : '',
        room: typeof c.room === 'string' ? c.room.slice(0, 50) : '',
        url: typeof c.url === 'string' ? c.url.slice(0, 300) : '',
        notes: typeof c.notes === 'string' ? c.notes.slice(0, 500) : '',
        frequency: ['weekly', 'odd', 'even'].includes(c.frequency) ? c.frequency : 'weekly',
        overrides: (c.overrides && typeof c.overrides === 'object' && !Array.isArray(c.overrides)) ? c.overrides : {}
    };
}

// 🌟 全域核心資料結構 (TimeFlow v3.2)
let appData = (function() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
})() || {
    deptName: "電機工程學系",
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
if (!appData.deptName || typeof appData.deptName !== 'string') appData.deptName = "電機工程學系";
if (appData.entryYear === undefined || isNaN(parseInt(appData.entryYear, 10))) appData.entryYear = 118;
if (!appData.targetCredits || isNaN(Number(appData.targetCredits))) appData.targetCredits = 138;
if (!appData.targetRequired || isNaN(Number(appData.targetRequired))) appData.targetRequired = 59;
if (appData.targetReqElective === undefined || isNaN(Number(appData.targetReqElective))) appData.targetReqElective = 3;
if (!appData.targetElective || isNaN(Number(appData.targetElective))) appData.targetElective = 51;
if (appData.maxOutElective === undefined || isNaN(Number(appData.maxOutElective))) appData.maxOutElective = 9;
if (appData.englishWaived === undefined || isNaN(Number(appData.englishWaived))) appData.englishWaived = 0;
if (appData.showNoon === undefined) appData.showNoon = true;
if (appData.showNight === undefined) appData.showNight = false;
if (appData.showWeekend === undefined) appData.showWeekend = false;
if (!appData.crossMajor || typeof appData.crossMajor !== 'object') appData.crossMajor = { type: "none", name: "", target: 40 };
if (!appData.wishlist || !Array.isArray(appData.wishlist)) appData.wishlist = [];
if (!appData.semesters || typeof appData.semesters !== 'object') appData.semesters = {};
if (!appData.semesterOrder || !Array.isArray(appData.semesterOrder) || appData.semesterOrder.length === 0) {
    appData.semesterOrder = ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
}

// 遍歷修復現有課程與候選清單
Object.keys(appData.semesters).forEach(sem => {
    appData.semesters[sem] = (appData.semesters[sem] || []).map(normalizeCourseData).filter(Boolean);
});
appData.wishlist = (appData.wishlist || []).map(normalizeCourseData).filter(Boolean);

appData.semesterOrder.forEach(sem => {
    if (!appData.semesters[sem]) {
        appData.semesters[sem] = [];
    }
});

sortSemesterOrder(appData.semesterOrder);

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {
        console.error("儲存資料至 localStorage 失敗:", e);
    }
}

// 💾 匯出完整規劃 JSON
function exportData() {
    const todayStr = TimeEngine.formatDate(new Date());
    const safeDept = (appData.deptName || '個人課表').replace(/[\/\\:*?"<>|]/g, '_');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TimeFlow_修課規劃備份_${safeDept}_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// 📂 匯入備份 JSON (加入嚴格校驗防護)
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 限制檔案大小不超過 5MB
    if (file.size > 5 * 1024 * 1024) {
        alert("❌ 檔案過大，請確認是否為正確的 TimeFlow 規劃檔！");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && typeof importedData === 'object' && importedData.semesters && typeof importedData.semesters === 'object') {
                if (typeof cancelEdit === 'function') cancelEdit();

                // 🛡️ 頂層欄位校驗與清洗
                const cleanDept = typeof importedData.deptName === 'string' ? importedData.deptName.trim().slice(0, 50) : "電機工程學系";
                const cleanYear = !isNaN(parseInt(importedData.entryYear, 10)) ? parseInt(importedData.entryYear, 10) : 118;
                
                importedData.deptName = cleanDept;
                importedData.entryYear = cleanYear;
                importedData.targetCredits = !isNaN(Number(importedData.targetCredits)) ? Number(importedData.targetCredits) : 138;
                importedData.targetRequired = !isNaN(Number(importedData.targetRequired)) ? Number(importedData.targetRequired) : 59;
                importedData.targetReqElective = !isNaN(Number(importedData.targetReqElective)) ? Number(importedData.targetReqElective) : 3;
                importedData.targetElective = !isNaN(Number(importedData.targetElective)) ? Number(importedData.targetElective) : 51;
                importedData.maxOutElective = !isNaN(Number(importedData.maxOutElective)) ? Number(importedData.maxOutElective) : 9;
                importedData.englishWaived = !isNaN(Number(importedData.englishWaived)) ? Number(importedData.englishWaived) : 0;
                importedData.englishPassed = !!importedData.englishPassed;
                importedData.showNoon = importedData.showNoon !== false;
                importedData.showNight = !!importedData.showNight;
                importedData.showWeekend = !!importedData.showWeekend;
                
                if (!importedData.crossMajor || typeof importedData.crossMajor !== 'object') {
                    importedData.crossMajor = { type: "none", name: "", target: 40 };
                } else {
                    importedData.crossMajor = {
                        type: typeof importedData.crossMajor.type === 'string' ? importedData.crossMajor.type : 'none',
                        name: typeof importedData.crossMajor.name === 'string' ? importedData.crossMajor.name.slice(0, 50) : '',
                        target: !isNaN(Number(importedData.crossMajor.target)) ? Number(importedData.crossMajor.target) : 40
                    };
                }

                if (!importedData.wishlist || !Array.isArray(importedData.wishlist)) {
                    importedData.wishlist = [];
                }

                const rawSemKeys = Object.keys(importedData.semesters);
                if (!importedData.semesterOrder || !Array.isArray(importedData.semesterOrder) || importedData.semesterOrder.length === 0) {
                    importedData.semesterOrder = rawSemKeys.length > 0 ? rawSemKeys : ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
                }

                // 限制學期鍵名僅包含合法字元
                importedData.semesterOrder = importedData.semesterOrder.filter(s => typeof s === 'string' && s.length <= 10);

                importedData.semesterOrder.forEach(sem => {
                    if (!importedData.semesters[sem] || !Array.isArray(importedData.semesters[sem])) {
                        importedData.semesters[sem] = [];
                    }
                });

                rawSemKeys.forEach(sem => {
                    if (typeof sem === 'string' && sem.length <= 10 && !importedData.semesterOrder.includes(sem)) {
                        importedData.semesterOrder.push(sem);
                    }
                });

                sortSemesterOrder(importedData.semesterOrder);

                if (!importedData.currentSemester || !importedData.semesterOrder.includes(importedData.currentSemester)) {
                    importedData.currentSemester = importedData.semesterOrder[0] || '一上';
                }

                // 全面正規化各學期之課程資料
                Object.keys(importedData.semesters).forEach(sem => {
                    importedData.semesters[sem] = (importedData.semesters[sem] || []).map(normalizeCourseData).filter(Boolean);
                });
                importedData.wishlist = (importedData.wishlist || []).map(normalizeCourseData).filter(Boolean);

                appData = importedData;
                saveData();

                if (typeof initTable === 'function') initTable();
                if (typeof updateAppUI === 'function') updateAppUI();
                alert("🎉 多學期修課規劃與候選庫已全數成功載入！");
            } else {
                alert("❌ 檔案結構不相容，請確認是否為 TimeFlow 匯出的 JSON 檔！");
            }
        } catch (err) {
            alert("❌ 讀取檔案失敗，請檢查 JSON 檔案格式是否正確！");
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