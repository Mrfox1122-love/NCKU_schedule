// ============================================================
// 📋 TimeFlow v3.5.1 — 大學部各學系必修科目表 (required-courses.js)
// ------------------------------------------------------------
// 整理自各學系「X 學年度起入學生必修科目表」，依適用起始學年分版本。
// 各學院資料放在 required-courses/*.js，以 registerRequiredCourses() 註冊；
// 課程地圖用來列出該屆的官方必修清單（年級、學期仍由開課資料對應）。
// ============================================================

/**
 * 版本（version）欄位：
 * - fromYear:          適用的入學學年起點（例如 114 表示 114 學年度起入學）
 * - label / source:    版本說明與出處
 * - required:          必修科目 [課名, 學分, { aka: [其他課名] }?]
 * - pick:              N 選 M 的必修群組 [{ label, min, countsAs, courses: [[課名, 學分]] }]
 *                      countsAs：'required' 計入系定必修、'elective' 計入專業選修
 * - requiredElective:  系定必選 [[課名, 學分]]
 * - notes / uncertain: 其他規定、整理時的系統處理方式（未經系所確認）
 */
window.DEPARTMENT_REQUIRED_COURSES = window.DEPARTMENT_REQUIRED_COURSES || {};

const ROMAN_SERIES = ['一', '二', '三', '四', '五', '六'];

/**
 * 展開系列課程，例如 seq('微積分', 3, 2) → [['微積分（一）', 3], ['微積分（二）', 3]]
 */
function seq(name, credits, count, startAt = 1) {
    return Array.from({ length: count }, (_, i) => [`${name}（${ROMAN_SERIES[startAt - 1 + i]}）`, credits]);
}

function registerRequiredCourses(dept, versions) {
    window.DEPARTMENT_REQUIRED_COURSES[dept] = [...versions].sort((a, b) => b.fromYear - a.fromYear);
}

/**
 * 依學系與入學學年取得適用的必修科目表；入學學年早於所有版本時採最早版本並註明
 * @param {string} dept 學系名稱（可為簡稱，會先正規化）
 * @param {number} entryAcademicYear 入學學年（例如 114）
 */
function getRequiredCourseList(dept, entryAcademicYear) {
    const name = typeof normalizeDepartmentName === 'function' ? normalizeDepartmentName(dept) : dept;
    const versions = window.DEPARTMENT_REQUIRED_COURSES[name];
    if (!versions || !versions.length) return null;
    const year = parseInt(entryAcademicYear, 10) || 0;
    let version = versions.find(v => year >= v.fromYear);
    let fallbackNote = '';
    if (!version) {
        version = versions[versions.length - 1];
        fallbackNote = `沒有收錄 ${year} 學年度入學的必修科目表，目前參考「${version.label}」。`;
    }
    return {
        pick: [],
        requiredElective: [],
        notes: [],
        uncertain: [],
        ...version,
        fallbackNote
    };
}

if (typeof window !== 'undefined') {
    window.seq = seq;
    window.registerRequiredCourses = registerRequiredCourses;
    window.getRequiredCourseList = getRequiredCourseList;
}
