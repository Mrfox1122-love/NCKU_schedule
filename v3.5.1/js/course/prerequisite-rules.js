// ============================================================
// 📚 TimeFlow v3.5.1 - 先修／擋修規則庫 (Prerequisite Rules)
// ============================================================

/**
 * 課程常用別名對照表 (用於自訂課程無代碼時之安全名稱匹配)
 * 名稱比對前會統一全半形括號，因此只需列出半形寫法
 */
const COURSE_ALIASES = {
    '微積分(一)': ['微積分 1', '微積分一'],
    '微積分(二)': ['微積分 2', '微積分二'],
    '普通物理學(一)': ['普通物理(一)', '普物(一)'],
    '普通物理學(二)': ['普通物理(二)', '普物(二)'],
    '電路學(一)': ['電路學 1', '電路學一'],
    '電子學(一)': ['電子學 1', '電子學一'],
    '工程數學(一)': ['工數(一)']
};

/**
 * 先修規則定義庫（由課程資料庫 COURSE_CATALOG 自動產生）
 *
 * 欄位說明：
 * - targetCode: 目標課程代碼
 * - targetName: 目標課程標準名稱
 * - catalogIds: 套用此規則的課程資料庫 id（同代碼不同班別的先修條件可能不同）
 * - type: 修課時序要求
 *     - 'completed_before': 【目前正式支援】需在目標課程所在學期之前修畢或安排
 *     - 'co_requisite':     【保留未來擴充】同梯次/並修規則（目前 Engine 尚未實作）
 * - required: 先修條件陣列（多門時須全部符合）
 *     - code: 先修課程代碼（學校資料僅提供名稱，留空）
 *     - name: 先修課程名稱
 *     - requirement: 修課成就要求 ('passed' | 'completed')
 *     - minScore: 當 requirement === 'passed' 時的最低成績門檻 (數值，不可省略)
 * - description: 規則說明文字
 */
function buildPrerequisiteRulesFromCatalog(catalog = []) {
    const rulesByKey = new Map();

    catalog.forEach(course => {
        if (!course.prerequisites || course.prerequisites.length === 0) return;

        const required = course.prerequisites.map(p => ({
            code: '',
            name: p.name,
            requirement: p.requirement,
            ...(p.requirement === 'passed' ? { minScore: p.minScore } : {})
        }));
        // 同代碼且先修條件相同的班別共用一條規則
        const key = `${course.code}|${JSON.stringify(required)}`;

        if (rulesByKey.has(key)) {
            rulesByKey.get(key).catalogIds.push(course.id);
            return;
        }

        const descParts = required.map(r => r.requirement === 'passed'
            ? `${r.name}（${r.minScore} 分以上）`
            : `${r.name}（修過即可）`);

        rulesByKey.set(key, {
            targetCode: course.code,
            targetName: course.name,
            catalogIds: [course.id],
            type: 'completed_before',
            required,
            description: `需先修：${descParts.join('、')}`
        });
    });

    return [...rulesByKey.values()];
}

/**
 * 課程資料庫載入後呼叫，重建全域先修規則
 * 本學期資料優先；本學期未開的課號才採用歷年開課摘要中最近一次列出的先修條件
 */
function refreshPrerequisiteRules() {
    const catalog = (typeof window !== 'undefined' && window.COURSE_CATALOG) || [];
    const catalogCodes = new Set(catalog.map(c => c.code));
    const historyOnly = ((typeof window !== 'undefined' && window.COURSE_HISTORY) || [])
        .filter(r => !catalogCodes.has(r.code));
    window.PREREQUISITE_RULES = [
        ...buildPrerequisiteRulesFromCatalog(catalog),
        ...buildPrerequisiteRulesFromCatalog(historyOnly)
    ];
    return window.PREREQUISITE_RULES;
}

if (typeof window !== 'undefined') {
    window.COURSE_ALIASES = COURSE_ALIASES;
    window.PREREQUISITE_RULES = window.PREREQUISITE_RULES || [];
    window.buildPrerequisiteRulesFromCatalog = buildPrerequisiteRulesFromCatalog;
    window.refreshPrerequisiteRules = refreshPrerequisiteRules;
}
