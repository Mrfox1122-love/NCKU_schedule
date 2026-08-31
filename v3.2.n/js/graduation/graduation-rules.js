// ============================================================
// 🎓 TimeFlow v3.2 — 成功大學修業與畢業法規規則資料庫 (Engine & Registry)
// ============================================================

// 1. 全校共同必修法規標準
const UNIVERSITY_GRADUATION_RULES = {
    CHINESE_TARGET: 4,
    TAINAN_TARGET: 1,
    PE_TARGET_TERMS: 4,
    
    // 通識教育法定標準
    GEN_BASE_CAP: 19,
    GEN_DOMAIN_MIN: 4,
    GEN_DOMAIN_MAX: 18,
    GEN_DOMAIN_COUNT_MIN: 3,
    GEN_RONG_MIN: 1,
    GEN_RONG_MAX: 15,

    // 共同英文基準
    ENGLISH_BASE_TARGET: 4,

    // 跨領域修業預設法規低標
    CROSS_MAJOR_DEFAULTS: {
        '雙主修': 40,
        '輔系': 20,
        '學分學程': 15
    }
};

// 全域規則註冊表 (由 rules-data/ 各學院模組動態掛載注入)
window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

// 🎓 成大各系所常用簡稱與別名對照表 (全校 9 大學院 + 不分系)
const DEPARTMENT_ALIASES = {
    '電機工程學系': ['電機', '電機系', 'EE'],
    '資訊工程學系': ['資工', '資工系', '資訊', '資訊系', 'CS', 'CSIE'],
    '機械工程學系': ['機械', '機械系', 'ME'],
    '化學工程學系': ['化工', '化工系', 'ChE'],
    '土木工程學系': ['土木', '土木系', 'Civil'],
    '材料科學與工程學系': ['材料', '材料系', 'MSE'],
    '水利及海洋工程學系': ['水利', '水利系', '水海', 'HE'],
    '工程科學系': ['工科', '工科系', 'ES'],
    '系統及船舶機電工程學系': ['系統', '系統系', '造船', '造船系', 'SE'],
    '航空太空工程學系': ['航太', '航太系', 'IAAE'],
    '資源工程學系': ['資源', '資源系', '礦冶', 'RE'],
    '環境工程學系': ['環境工程學系', '環工', '環工系', 'EvE'],
    '生物醫學工程學系': ['醫工', '醫工系', 'BME'],
    '測量及空間資訊學系': ['測量', '測量系', '測空', 'Geomatics'],
    '能源工程國際學士學位學程': ['能源', '能源學程', '能源國際', 'Energy'],
    '數學系': ['數學', '數學學系', 'Math'],
    '物理學系': ['物理', '物理系', 'Phys'],
    '化學學系': ['化學', '化學系', 'Chem'],
    '地球科學系': ['地科', '地科系', 'Earth'],
    '光電科學與工程學系': ['光電', '光電系', 'EO'],
    '醫學系': ['醫學', 'Med'],
    '牙醫學系': ['牙醫', '牙醫系', 'Dent'],
    '護理學系': ['護理', '護理系', 'Nur'],
    '物理治療學系': ['物治', '物治系', 'PT', '物理治療'],
    '職能治療學系': ['職治', '職治系', 'OT', '職能治療'],
    '醫學檢驗生物技術學系': ['醫技', '醫技系', 'MT', '醫檢', '醫學檢驗'],
    '藥學系': ['藥學', '藥學系', 'Pharm'],
    '公共衛生學系': ['公衛', '公衛系', 'PH', '公共衛生'],
    '工業與資訊管理學系': ['工資', '工資系', '工資管', '工資管系', '工管', '工管系', 'IIM'],
    '交通管理科學系': ['交管', '交管系', 'TPM'],
    '企業管理學系': ['企管', '企管系', 'BA'],
    '統計與資料科學學系': ['統計', '統計系', '統資', '統資系', '統計學系', 'Stat'],
    '會計學系': ['會計', '會計系', 'Acct'],
    '政治學系': ['政治', '政治系', 'PS'],
    '經濟學系': ['經濟', '經濟系', 'Econ'],
    '法律學系': ['法律', '法律系', 'Law'],
    '心理學系': ['心理', '心理系', 'Psy'],
    '建築學系': ['建築', '建築系', 'Arch', '建築學系 (四年制)', '建築系 (四年制)'],
    '建築學系 (五年制)': ['建築五年制', '建築系五年制', '建築五', '建築設計組'],
    '都市計劃學系': ['都計', '都計系', 'UP'],
    '工業設計學系': ['工設', '工設系', 'ID'],
    '中國文學系': ['中文', '中文系', '國文'],
    '外國語文學系': ['外文', '外文系', '外語', 'FL'],
    '歷史學系': ['歷史', '歷史系', 'Hist'],
    '台灣文學系': ['台文', '台文系', 'TL'],
    '生命科學系': ['生科', '生科系', 'LS'],
    '生物科技與產業科學學系': ['生技', '生技系', '生科產', '生產', 'BT'],
    '全校不分系學士學位學程': ['全校不分系', '大一不分系', '不分系', 'CCEP', '學士學程']
};

/**
 * 標準化科系名稱
 */
function normalizeDepartmentName(dept) {
    if (!dept || typeof dept !== 'string') return '';
    const clean = dept.replace(/國立成功大學|成功大學|成大/g, '').trim();

    if (DEPARTMENT_ALIASES[clean]) return clean;

    for (const [canonical, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
        if (aliases.includes(clean) || aliases.map(a => a.toLowerCase()).includes(clean.toLowerCase())) {
            return canonical;
        }
    }
    return clean;
}

/**
 * 查詢科系與入學年份對應之畢業規則
 */
function getDepartmentGraduationRule(department, entryYear, customData = null) {
    const normDept = normalizeDepartmentName(department);
    const yearKey = String(entryYear).trim();
    const rulesDB = window.DEPARTMENT_GRADUATION_RULES || {};

    const deptRules = rulesDB[normDept] || rulesDB[department];

    // 1. 若該系已有已建檔的年度官方規則
    if (deptRules && deptRules[yearKey] && Object.keys(deptRules[yearKey]).length > 0) {
        return {
            ruleFound: true,
            isCustom: false,
            department: normDept,
            entryYear: yearKey,
            ...deptRules[yearKey]
        };
    }

    // 2. 自訂科系或尚未建檔之科系：回傳自訂模式
    return {
        ruleFound: true,
        isCustom: true,
        department: department || '自訂科系',
        entryYear: yearKey,
        targetCredits: parseFloat(customData?.targetCredits) || 128,
        requiredCredits: parseFloat(customData?.targetRequired) || 50,
        requiredElectiveCredits: parseFloat(customData?.targetReqElective) || 0,
        electiveCredits: parseFloat(customData?.targetElective) || 40,
        maxOutsideDeptElective: parseFloat(customData?.maxOutElective) || 0,
        excludedGeneralDomains: [],
        studyYears: 4
    };
}

function getEnglishRule(waivedEng = 0, entryYear = 118) {
    const waived = parseInt(waivedEng, 10) || 0;
    const year = parseInt(entryYear, 10) || 118;
    const requiresSubstitution = (year >= 118);

    return {
        waived,
        targetEnglish: Math.max(0, UNIVERSITY_GRADUATION_RULES.ENGLISH_BASE_TARGET - waived),
        requiresSubstitution,
        waivedCreditsCredited: requiresSubstitution ? 0 : waived
    };
}

function getGeneralEducationLimits(waivedEng = 0, entryYear = 118) {
    const waived = parseInt(waivedEng, 10) || 0;
    const year = parseInt(entryYear, 10) || 118;
    const requiresSubstitution = (year >= 118);
    const extra = requiresSubstitution ? waived : 0;

    return {
        maxCombinedGen: UNIVERSITY_GRADUATION_RULES.GEN_BASE_CAP + extra, // 19 + extra
        domainMax: UNIVERSITY_GRADUATION_RULES.GEN_DOMAIN_MAX + extra,     // 18 + extra
        rongMax: UNIVERSITY_GRADUATION_RULES.GEN_RONG_MAX + extra,         // 15 + extra
        domainMin: UNIVERSITY_GRADUATION_RULES.GEN_DOMAIN_MIN,
        domainCountMin: UNIVERSITY_GRADUATION_RULES.GEN_DOMAIN_COUNT_MIN,
        rongMin: UNIVERSITY_GRADUATION_RULES.GEN_RONG_MIN,
        requiresSubstitution
    };
}

function getCrossMajorDefaultTarget(type) {
    return UNIVERSITY_GRADUATION_RULES.CROSS_MAJOR_DEFAULTS[type] || 40;
}

const GRADUATION_RULES = UNIVERSITY_GRADUATION_RULES;

if (typeof window !== 'undefined') {
    window.UNIVERSITY_GRADUATION_RULES = UNIVERSITY_GRADUATION_RULES;
    window.DEPARTMENT_ALIASES = DEPARTMENT_ALIASES;
    window.getDepartmentGraduationRule = getDepartmentGraduationRule;
}