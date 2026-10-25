// ============================================================
// 🎓 TimeFlow v3.3.2 — 碩士班畢業規則資料庫 (master-rules.js)
// ------------------------------------------------------------
// 與大學部規則完全分開；新增所別時只需補資料，不需修改計算引擎。
// ============================================================

/**
 * 規則集欄位說明（versions 依入學學年由新到舊排列，取第一個 fromYear ≤ 入學學年者）：
 * - totalCredits:    畢業學分（不含論文）
 * - thesisCredits:   論文學分（另計）
 * - maxExternal:     外所選修最多承認學分
 * - maxWaived:       抵免學分上限（null 表示規章未另訂）
 * - requiredCourses: 指定必須通過的課程名稱（可列入畢業學分）
 * - seminar:         專題討論要求
 *     - { mode: 'fixed', count }                   固定學期數
 *     - { mode: 'byDuration', byDuration: {...} }  依預計修業年限
 * - remedial:        大學未修過須補修的科目（補修學分不計入畢業學分）
 * - ethicsHours:     學術倫理時數要求（0 表示規章未另訂）
 * - notes:           無法自動檢核、需自行留意的規定
 */
const MASTER_RULE_SETS = {
    EE_MASTER: {
        source: '國立成功大學電機工程學系碩士班修業辦法（115.6.10 系所務會議通過）',
        versions: [
            {
                fromYear: 0,
                totalCredits: 24,
                thesisCredits: 6,
                maxExternal: 12,
                maxWaived: null,
                requiredCourses: [],
                seminar: { mode: 'byDuration', byDuration: { '1': 2, '1.5': 3, '2': 4 } },
                remedial: [],
                ethicsHours: 6,
                notes: [
                    '外系所課程須經指導教授及系主任同意；本系有開授相同課程者，原則上不得以外系所課程取代。',
                    '大學部課程不列入畢業學分。',
                    '專題討論每學期均須選修且僅能修一門，任一學期未修須延畢半年。',
                    '抵免課程除本系所取得者外，一律僅承認為外系所學分。',
                    '入學後第一學年結束前須取得論文指導教授同意。'
                ]
            }
        ]
    },

    CS_MASTER: {
        source: '資訊工程研究所學分承認及抵免辦法－碩士班（113.3.12 系務會議修正通過）',
        versions: [
            {
                fromYear: 112,
                totalCredits: 24,
                thesisCredits: 6,
                maxExternal: 9,
                maxWaived: 6,
                requiredCourses: ['資工與醫資導論'],
                seminar: { mode: 'fixed', count: 4 },
                remedial: ['計算機組織', '資料結構', '離散數學'],
                ethicsHours: 0,
                notes: [
                    '外所選修課程須經指導教授簽名認可。',
                    '選修大學部課程、大學部曾修過的研究所課程、暑修及推廣課程，學分一概不予承認。',
                    '抵免課程須開設於研究所、成績 70 分以上且未列入大學畢業學分，最多抵免 6 學分。',
                    '補修限本校電資學院與工科系所開授之課程（外籍生得由指導教授認可）。'
                ]
            },
            {
                fromYear: 0,
                totalCredits: 24,
                thesisCredits: 6,
                maxExternal: 9,
                maxWaived: 6,
                requiredCourses: ['資工與醫資導論'],
                // 碩一須通過本所專題討論(1)(2)，碩二以上須通過 2 學期，合計 4 學期
                seminar: { mode: 'fixed', count: 4 },
                remedial: ['計算機組織', '資料結構', '離散數學'],
                ethicsHours: 0,
                notes: [
                    '碩一須通過本所專題討論(1)(2)，碩二以上須通過 2 學期專題討論。',
                    '外所選修課程須經指導教授簽名認可。',
                    '選修大學部課程、大學部曾修過的研究所課程、暑修及推廣課程，學分一概不予承認。',
                    '抵免課程須開設於研究所、成績 70 分以上且未列入大學畢業學分，最多抵免 6 學分。'
                ]
            }
        ]
    }
};

/**
 * 可選擇的碩士班所別
 * - ruleSet:     套用的規則集
 * - catalogDepts: 課程資料庫中屬於「本所」的開課單位名稱開頭（其餘研究所課程視為外所）
 */
const MASTER_PROGRAMS = {
    '電機所': { fullName: '電機工程學系碩士班', ruleSet: 'EE_MASTER', catalogDepts: ['電機所'] },
    '通訊所': { fullName: '通訊工程研究所', ruleSet: 'EE_MASTER', catalogDepts: ['通訊所'] },
    '微電所': { fullName: '微電子工程研究所', ruleSet: 'EE_MASTER', catalogDepts: ['微電所'] },
    '奈米積電學程': { fullName: '奈米積體電路工程碩士學位學程', ruleSet: 'EE_MASTER', catalogDepts: ['奈米積電'] },
    '資安碩士學程': { fullName: '智慧資訊安全碩士學位學程', ruleSet: 'EE_MASTER', catalogDepts: ['資安碩士學程'] },
    '資訊所': { fullName: '資訊工程研究所碩士班', ruleSet: 'CS_MASTER', catalogDepts: ['資訊所'] }
};

const DEFAULT_MASTER_PROGRAM = '電機所';

// 碩士班課程類別（課程編輯器與找課共用）
const MASTER_COURSE_TYPES = [
    { value: '本所選修', label: '本所選修', counted: true },
    { value: '外所選修', label: '外所選修（有承認上限）', counted: true },
    { value: '專題討論', label: '專題討論（0 學分，計學期數）', counted: false },
    { value: '論文', label: '碩士論文（學分另計）', counted: false },
    { value: '大學部課程', label: '大學部課程（不計畢業學分）', counted: false },
    { value: '補修', label: '補修（不計畢業學分）', counted: false }
];

function getMasterProgram(programKey) {
    return MASTER_PROGRAMS[programKey] || MASTER_PROGRAMS[DEFAULT_MASTER_PROGRAM];
}

/**
 * 依所別與入學學年取得適用的規則版本
 */
function getMasterRule(programKey, entryYear) {
    const program = getMasterProgram(programKey);
    const ruleSet = MASTER_RULE_SETS[program.ruleSet];
    const year = parseInt(entryYear, 10) || 0;
    const version = ruleSet.versions.find(v => year >= v.fromYear) || ruleSet.versions[ruleSet.versions.length - 1];
    return {
        programKey: MASTER_PROGRAMS[programKey] ? programKey : DEFAULT_MASTER_PROGRAM,
        program,
        source: ruleSet.source,
        ...version
    };
}

if (typeof window !== 'undefined') {
    window.MASTER_RULE_SETS = MASTER_RULE_SETS;
    window.MASTER_PROGRAMS = MASTER_PROGRAMS;
    window.MASTER_COURSE_TYPES = MASTER_COURSE_TYPES;
    window.DEFAULT_MASTER_PROGRAM = DEFAULT_MASTER_PROGRAM;
    window.getMasterProgram = getMasterProgram;
    window.getMasterRule = getMasterRule;
}
