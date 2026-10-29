// ============================================================
// 🎓 TimeFlow v3.5.1 — 研究所畢業規則資料庫核心 (master-rules.js)
// ------------------------------------------------------------
// 與大學部規則完全分開。各學院的所別資料放在 master/rules-data/*.js，
// 以 registerMasterPrograms() 註冊；新增所別只需補資料，不需修改計算引擎。
// ============================================================

/**
 * 所別（program）欄位：
 * - id:           唯一鍵，使用正式全名（例如「機械工程學系碩士班」）
 * - college:      學院
 * - degree:       '碩士班' | '碩士在職專班' | '博士班'
 * - aliases:      縮寫與俗稱（供搜尋，例如「機械所」「ME」「N1」）
 * - catalogDepts: 課程資料庫中屬於「本所」的開課單位名稱開頭（找課判斷本所／外所用）
 * - versions:     規則版本，依 fromYear（適用入學學年）由新到舊排列
 *
 * 規則版本（version）欄位：
 * - fromYear:        適用的入學學年起點；0 表示規章未標明適用年度
 * - label:           版本說明，例如「115 學年度起入學」
 * - source:          規章名稱與修訂日期
 * - totalCredits:    畢業學分（不含論文）
 * - thesisCredits:   論文學分（另計；0 表示不列學分）
 * - maxExternal:     外所選修最多承認學分（null 表示規章未限制）
 * - maxWaived:       抵免學分上限（null 表示規章未另訂）
 * - minOwnCredits:   至少須修本所（本系）開授課程學分（null 表示未規定）
 * - minExternal:     至少須修外所（非本系）課程學分（null 表示未規定，例如地科系 6 學分）
 * - seminarCreditsCount: 專題討論學分是否計入畢業學分
 * - requiredCourses: 指定必須通過的課程名稱
 * - seminar:         { mode: 'fixed', count } 或 { mode: 'byDuration', byDuration }
 * - remedial:        大學未修過須補修的科目（補修學分不計入畢業學分）
 * - ethicsHours:     學術倫理時數；未填時依校規：111 學年度起入學者 6 小時
 * - notes:           無法自動檢核、需自行留意的規定
 * - uncertain:       規章未明確規定、由本系統自行判斷的處理方式（畫面上以 ⚠️ 標示，未經系所確認）
 */
const MASTER_PROGRAM_LIST = [];
const MASTER_PROGRAM_INDEX = new Map();

const MASTER_DEGREES = ['碩士班', '碩士在職專班', '博士班'];
const MASTER_COLLEGE_ORDER = [
    '文學院', '理學院', '生物科學與科技學院', '工學院', '電機資訊學院', '規劃與設計學院',
    '管理學院', '醫學院', '社會科學院', '敏求智慧運算學院', '智慧半導體及永續製造學院', '校級學位學程'
];

const DEFAULT_MASTER_PROGRAM = '電機工程學系碩士班';
const CUSTOM_MASTER_PROGRAM = '自訂';

// 校規：111 學年度起入學之研究生，畢業前須修畢學術倫理至少 6 小時
const SCHOOL_ETHICS_FROM_YEAR = 111;
const SCHOOL_ETHICS_HOURS = 6;

function registerMasterPrograms(programs) {
    programs.forEach(p => {
        if (MASTER_PROGRAM_INDEX.has(p.id)) {
            console.warn(`[TimeFlow] 研究所 id 重複：${p.id}`);
            return;
        }
        const program = {
            aliases: [],
            catalogDepts: [],
            ...p,
            versions: [...(p.versions || [])].sort((a, b) => (b.fromYear || 0) - (a.fromYear || 0))
        };
        MASTER_PROGRAM_LIST.push(program);
        MASTER_PROGRAM_INDEX.set(program.id, program);
    });
}

function normalizeProgramKeyword(text) {
    return String(text || '').replace(/[\s（）()・·]/g, '').toLowerCase();
}

/**
 * 以 id 或縮寫找所別（相容舊版設定，例如「電機所」「資訊所」）
 */
function findMasterProgram(key) {
    if (!key) return null;
    if (MASTER_PROGRAM_INDEX.has(key)) return MASTER_PROGRAM_INDEX.get(key);
    const norm = normalizeProgramKeyword(key);
    return MASTER_PROGRAM_LIST.find(p =>
        p.aliases.some(a => normalizeProgramKeyword(a) === norm)) || null;
}

/**
 * 搜尋所別：比對全名、縮寫、系所代碼與學院；縮寫完全相同者排最前，只符合學院名稱者排最後
 */
function searchMasterPrograms(keyword) {
    const norm = normalizeProgramKeyword(keyword);
    if (!norm) return [...MASTER_PROGRAM_LIST];
    const score = p => {
        const aliases = p.aliases.map(normalizeProgramKeyword);
        if (aliases.includes(norm)) return 0;
        if (normalizeProgramKeyword(p.id).includes(norm) || aliases.some(a => a.includes(norm))) return 1;
        if (normalizeProgramKeyword(p.college).includes(norm)) return 2;
        return -1;
    };
    return MASTER_PROGRAM_LIST
        .map((p, index) => ({ p, index, s: score(p) }))
        .filter(x => x.s >= 0)
        .sort((a, b) => a.s - b.s || a.index - b.index)
        .map(x => x.p);
}

// 自訂所別：尚未建檔的所，由使用者依所上修業規章自行填寫門檻
const DEFAULT_MASTER_CUSTOM = {
    name: '',              // 所名，例如「機械所」；同時作為找課判斷本所課程的開課單位名稱
    totalCredits: 24,
    thesisCredits: 6,
    maxExternal: 12,
    maxWaived: null,       // null 表示不限
    seminarCount: 4,
    requiredCourses: [],
    remedial: [],
    ethicsHours: 0
};

function buildCustomMasterProgram(custom) {
    const c = { ...DEFAULT_MASTER_CUSTOM, ...(custom || {}) };
    return {
        id: CUSTOM_MASTER_PROGRAM,
        fullName: c.name || '自訂研究所',
        college: '自訂',
        degree: '碩士班',
        aliases: [],
        catalogDepts: c.name ? [c.name] : [],
        versions: [{
            fromYear: 0,
            label: '使用者自訂',
            source: '使用者自訂（請依所上修業規章確認）',
            totalCredits: c.totalCredits,
            thesisCredits: c.thesisCredits,
            maxExternal: c.maxExternal,
            maxWaived: c.maxWaived,
            minOwnCredits: null,
            requiredCourses: c.requiredCourses,
            seminar: { mode: 'fixed', count: c.seminarCount },
            remedial: c.remedial,
            ethicsHours: c.ethicsHours,
            notes: [
                '此為自訂規則，學分門檻與條件依你填寫的內容計算，請以所上修業規章與系辦審核為準。',
                c.name ? `找課時，開課單位名稱以「${c.name}」開頭的課程視為本所選修。` : '填寫所名後，找課才能自動判斷本所與外所課程。'
            ],
            uncertain: []
        }]
    };
}

function getMasterProgram(programKey, custom = null) {
    if (programKey === CUSTOM_MASTER_PROGRAM) return buildCustomMasterProgram(custom);
    const program = findMasterProgram(programKey) || findMasterProgram(DEFAULT_MASTER_PROGRAM) || MASTER_PROGRAM_LIST[0];
    return { ...program, fullName: program.id };
}

/**
 * 依所別與入學學年取得適用的規則版本：
 * - 取 fromYear ≤ 入學學年的最新版本
 * - 入學學年早於所有已收錄版本時，採用最早的版本，並註明「目前參考的規章」
 */
function getMasterRule(programKey, entryYear, custom = null) {
    const program = getMasterProgram(programKey, custom);
    const year = parseInt(entryYear, 10) || 0;
    const versions = program.versions;
    let version = versions.find(v => year >= (v.fromYear || 0));
    let fallbackNote = '';
    if (!version) {
        version = versions[versions.length - 1];
        fallbackNote = `你的入學學年（${year}）沒有收錄對應年度的規章，目前參考的規章是「${version.label}」。`;
    }

    const ethicsHours = (typeof version.ethicsHours === 'number')
        ? version.ethicsHours
        : (year >= SCHOOL_ETHICS_FROM_YEAR ? SCHOOL_ETHICS_HOURS : 0);

    return {
        maxExternal: null,
        maxWaived: null,
        minOwnCredits: null,
        minExternal: null,
        seminarCreditsCount: false,
        requiredCourses: [],
        remedial: [],
        notes: [],
        uncertain: [],
        ...version,
        ethicsHours,
        programKey: program.id,
        program,
        versionLabel: version.label,
        fallbackNote
    };
}

// 研究所課程類別（課程編輯器與找課共用）
const MASTER_COURSE_TYPES = [
    { value: '本所必修', label: '本所必修', counted: true },
    { value: '本所選修', label: '本所選修', counted: true },
    { value: '外所選修', label: '外所選修（有承認上限）', counted: true },
    { value: '專題討論', label: '專題討論（計學期數）', counted: false },
    { value: '論文', label: '學位論文（學分另計）', counted: false },
    { value: '大學部課程', label: '大學部課程（不計畢業學分）', counted: false },
    { value: '補修', label: '補修（不計畢業學分）', counted: false }
];

if (typeof window !== 'undefined') {
    window.MASTER_PROGRAM_LIST = MASTER_PROGRAM_LIST;
    window.MASTER_DEGREES = MASTER_DEGREES;
    window.MASTER_COLLEGE_ORDER = MASTER_COLLEGE_ORDER;
    window.MASTER_COURSE_TYPES = MASTER_COURSE_TYPES;
    window.DEFAULT_MASTER_PROGRAM = DEFAULT_MASTER_PROGRAM;
    window.CUSTOM_MASTER_PROGRAM = CUSTOM_MASTER_PROGRAM;
    window.DEFAULT_MASTER_CUSTOM = DEFAULT_MASTER_CUSTOM;
    window.registerMasterPrograms = registerMasterPrograms;
    window.findMasterProgram = findMasterProgram;
    window.searchMasterPrograms = searchMasterPrograms;
    window.getMasterProgram = getMasterProgram;
    window.getMasterRule = getMasterRule;
}
