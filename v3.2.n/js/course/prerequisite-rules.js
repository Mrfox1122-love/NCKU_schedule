// ============================================================
// 📚 TimeFlow v3.1 - 先修／擋修規則常數庫 (Prerequisite Rules)
// ============================================================

/**
 * 課程常用別名對照表 (用於自訂課程無代碼時之安全名稱匹配)
 */
const COURSE_ALIASES = {
    '微積分(一)': ['微積分（一）', '微積分 1', '微積分一'],
    '微積分(二)': ['微積分（二）', '微積分 2', '微積分二'],
    '普通物理(一)': ['普通物理（一）', '普物(一)', '普物（一）'],
    '普通物理(二)': ['普通物理（二）', '普物(二)', '普物（二）'],
    '電路學(一)': ['電路學（一）', '電路學 1', '電路學一'],
    '電子學(一)': ['電子學（一）', '電子學 1', '電子學一'],
    '工程數學(一)': ['工程數學（一）', '工數(一)', '工數（一）']
};

/**
 * 先修規則定義庫
 * 
 * 欄位說明：
 * - targetCode: 目標課程代碼
 * - targetName: 目標課程標準名稱
 * - type: 修課時序要求
 *     - 'completed_before': 【目前正式支援】需在目標課程所在學期之前修畢或安排
 *     - 'co_requisite':     【保留未來擴充】同梯次/並修規則（目前 Engine 尚未實作）
 * - required: 先修條件陣列
 *     - code: 先修課程代碼
 *     - name: 先修課程名稱
 *     - requirement: 修課成就要求 ('passed' | 'completed')
 *     - minScore: 當 requirement === 'passed' 時的最低成績門檻 (數值，不可省略)
 * - description: 規則說明文字
 */
const PREREQUISITE_RULES = [
    {
        targetCode: 'EE1002',
        targetName: '微積分 (二)',
        type: 'completed_before',
        required: [
            {
                code: 'EE1001',
                name: '微積分 (一)',
                requirement: 'passed',
                minScore: 60
            }
        ],
        description: '需先修微積分 (一)，且成績至少 60 分及格'
    },
    {
        targetCode: 'EE2002',
        targetName: '電子學 (一)',
        type: 'completed_before',
        required: [
            {
                code: 'EE2001',
                name: '電路學 (一)',
                requirement: 'passed',
                minScore: 50
            }
        ],
        description: '需先修電路學 (一)，且成績至少 50 分'
    },
    {
        targetCode: 'EE2003',
        targetName: '工程數學 (一)',
        type: 'completed_before',
        required: [
            {
                code: 'EE1002',
                name: '微積分 (二)',
                requirement: 'passed',
                minScore: 60
            }
        ],
        description: '需先修微積分 (二)，且成績至少 60 分及格'
    }
];

if (typeof window !== 'undefined') {
    window.COURSE_ALIASES = COURSE_ALIASES;
    window.PREREQUISITE_RULES = PREREQUISITE_RULES;
}