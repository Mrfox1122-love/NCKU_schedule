// ============================================================
// 💾 Data Store Core (TimeFlow v3.2.5 - Strict Period Whitelist)
// ============================================================
var STORAGE_KEY = window.STORAGE_KEY || 'mySchedule';
window.STORAGE_KEY = STORAGE_KEY;

// 🛡️ 成大官方 14 節次法定白名單
const VALID_PERIOD_SET = new Set(['1', '2', '3', '4', 'N', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D']);

var TimeEngine = window.TimeEngine || {
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
window.TimeEngine = TimeEngine;

var SEMESTER_NUM_MAP = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

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

// 🌟 課程資料正規化 (嚴格節次白名單過濾)
function normalizeCourseData(c) {
    if (!c || typeof c !== 'object') return null;

    let cleanId;
    if (typeof c.id === 'number' && !isNaN(c.id) && c.id > 0) {
        cleanId = c.id;
    } else if (typeof c.id === 'string' && /^\d+$/.test(c.id.trim())) {
        cleanId = Number(c.id.trim());
    } else {
        cleanId = Date.now() + Math.floor(Math.random() * 10000);
    }

    const rawColor = typeof c.color === 'string' ? c.color.trim() : '';
    const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#2563eb';

    const isWaived = (c.status === '已抵免');
    const rawScore = (!isWaived && c.score !== undefined && c.score !== null && c.score !== '') ? parseFloat(c.score) : null;
    const score = (rawScore !== null && !isNaN(rawScore) && rawScore >= 0 && rawScore <= 100) ? rawScore : null;
    
    const isPassed = isWaived ? true : (c.status === '已取得' || (c.status === undefined && c.passed !== false));
    const status = isWaived ? '已抵免' : (['修讀中', '未取得', '已取得'].includes(c.status) ? c.status : (isPassed ? '已取得' : '未取得'));

    // 🛡️ 節次白名單檢驗：僅允許 VALID_PERIOD_SET 中的字元
    const safeSlots = Array.isArray(c.slots) ? c.slots.filter(s => s && typeof s === 'object').map(s => {
        const dayNum = parseInt(s.day, 10);
        const validDay = (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 7) ? dayNum : 1;
        const validPeriods = Array.isArray(s.periods) 
            ? s.periods
                .map(p => String(p).trim().toUpperCase())
                .filter(p => VALID_PERIOD_SET.has(p))
            : [];
        return { day: validDay, periods: validPeriods };
    }) : [];

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
        textColor: (typeof getContrastTextColor === 'function') ? getContrastTextColor(color) : (c.textColor || '#ffffff'),
        recurring: c.recurring !== false,
        teacher: typeof c.teacher === 'string' ? c.teacher.slice(0, 50) : '',
        room: typeof c.room === 'string' ? c.room.slice(0, 50) : '',
        url: typeof c.url === 'string' ? c.url.slice(0, 300) : '',
        notes: typeof c.notes === 'string' ? c.notes.slice(0, 500) : '',
        frequency: ['weekly', 'odd', 'even'].includes(c.frequency) ? c.frequency : 'weekly',
        overrides: (c.overrides && typeof c.overrides === 'object' && !Array.isArray(c.overrides)) ? c.overrides : {}
    };
}

var appData = (function() {
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
window.appData = appData;

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

function importData(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("❌ 檔案過大，請確認是否為正確的 TimeFlow 規劃檔！");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        let importedData = null;

        try {
            const rawText = String(e.target.result || '').replace(/^\uFEFF/, '').trim();
            importedData = JSON.parse(rawText);
        } catch (parseErr) {
            console.error("[TimeFlow Import] JSON Parse Error:", parseErr);
            alert("❌ 檔案不是合法的 JSON 格式，請確認備份檔是否完整！");
            event.target.value = '';
            return;
        }

        if (!importedData || typeof importedData !== 'object' || !importedData.semesters || typeof importedData.semesters !== 'object') {
            console.error("[TimeFlow Import] Incompatible Structure:", importedData);
            alert("❌ 檔案結構不相容，請確認是否為 TimeFlow 匯出的 JSON 檔！");
            event.target.value = '';
            return;
        }

        // 🛡️ 資料規模上限防護 (防止惡意大量資料引發 DoS / 記憶體崩潰)
        const MAX_SEMESTERS = 16;       // 最多 16 個學期
        const MAX_COURSES_PER_SEM = 40; // 單學期最多 40 門課
        const MAX_WISHLIST = 60;        // 候選庫最多 60 門課

        const rawSemKeysAll = Object.keys(importedData.semesters);
        if (rawSemKeysAll.length > MAX_SEMESTERS) {
            alert(`❌ 檔案包含 ${rawSemKeysAll.length} 個學期，超過系統上限（最多 ${MAX_SEMESTERS} 個學期）！`);
            event.target.value = '';
            return;
        }

        // 截斷單學期過多課程
        rawSemKeysAll.forEach(sem => {
            if (Array.isArray(importedData.semesters[sem]) && importedData.semesters[sem].length > MAX_COURSES_PER_SEM) {
                importedData.semesters[sem] = importedData.semesters[sem].slice(0, MAX_COURSES_PER_SEM);
            }
        });

        // 截斷過多候選課
        if (Array.isArray(importedData.wishlist) && importedData.wishlist.length > MAX_WISHLIST) {
            importedData.wishlist = importedData.wishlist.slice(0, MAX_WISHLIST);
        }

        try {
            if (typeof cancelEdit === 'function') cancelEdit();

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

            const SEM_NAME_REGEX = /^([一二三四五六七八九十\d]{1,4})(上|下|暑)$/;
            const rawSemKeys = Object.keys(importedData.semesters).map(k => String(k).trim()).filter(k => SEM_NAME_REGEX.test(k));

            if (!importedData.semesterOrder || !Array.isArray(importedData.semesterOrder)) {
                importedData.semesterOrder = rawSemKeys.length > 0 ? rawSemKeys : ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
            } else {
                importedData.semesterOrder = importedData.semesterOrder
                    .filter(s => typeof s === 'string' && SEM_NAME_REGEX.test(s.trim()))
                    .map(s => s.trim());
            }

            rawSemKeys.forEach(sem => {
                if (!importedData.semesterOrder.includes(sem)) {
                    importedData.semesterOrder.push(sem);
                }
            });

            importedData.semesterOrder.forEach(sem => {
                if (!importedData.semesters[sem] || !Array.isArray(importedData.semesters[sem])) {
                    importedData.semesters[sem] = [];
                }
            });

            sortSemesterOrder(importedData.semesterOrder);

            if (!importedData.currentSemester || !importedData.semesterOrder.includes(importedData.currentSemester)) {
                importedData.currentSemester = importedData.semesterOrder[0] || '一上';
            }

            // 正規化各學期課程
            Object.keys(importedData.semesters).forEach(sem => {
                if (SEM_NAME_REGEX.test(sem)) {
                    importedData.semesters[sem] = (importedData.semesters[sem] || []).map(normalizeCourseData).filter(Boolean);
                } else {
                    delete importedData.semesters[sem];
                }
            });
            importedData.wishlist = (importedData.wishlist || []).map(normalizeCourseData).filter(Boolean);

            appData = importedData;
            window.appData = appData;
            saveData();
        } catch (normErr) {
            console.error("[TimeFlow Import] Normalization Error:", normErr);
            alert("❌ 資料內容處理失敗，請查看 Console 錯誤資訊！");
            event.target.value = '';
            return;
        }

        try {
            if (typeof initTable === 'function') initTable();
            if (typeof updateAppUI === 'function') updateAppUI();
            alert("🎉 多學期修課規劃與候選庫已全數成功載入！");
        } catch (renderErr) {
            console.error("[TimeFlow Import] UI Render Warning:", renderErr);
            alert("⚠️ 資料已成功載入並儲存，但畫面渲染時發生警告（請查看 Console）！");
        }

        event.target.value = '';
    };
    reader.readAsText(file);
}

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

// 🧹 公用電腦實體隱私：一鍵抹除本機所有資料
function resetAllAppData() {
    const msg = "⚠️ 警告：這將會完全抹除此瀏覽器儲存的所有課表、成績、GPA 與自訂設定！\n\n" +
                "適用情境：於學校計中、圖書館等公用電腦使用完畢準備離開。\n\n" +
                "確定要清除所有資料並重設嗎？";

    if (confirm(msg)) {
        if (confirm("請再次確認：所有尚未匯出備份的資料將永久遺失，確定清除？")) {
            try {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem('timeflow_theme');
                localStorage.removeItem('timeflow_privacy_mode');
                localStorage.removeItem('nckuee_grad_config_collapsed');
            } catch (e) {
                console.error("LocalStorage 清除失敗:", e);
            }
            alert("🧹 所有本機修課資料已完全清除！即將重新載入預設頁面。");
            location.reload();
        }
    }
}

if (typeof window !== 'undefined') {
    window.resetAllAppData = resetAllAppData;
}