// 🎓 國立成功大學修業與畢業法規常數
const GRADUATION_RULES = {
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

    // 共同英文
    ENGLISH_BASE_TARGET: 4,

    // 跨領域修業預設法規低標
    CROSS_MAJOR_DEFAULTS: {
        '雙主修': 40,
        '輔系': 20,
        '學分學程': 15
    }
};

// 英文免修換算規則
function getEnglishRule(waivedEng = 0) {
    const waived = parseInt(waivedEng) || 0;
    return {
        waived,
        targetEnglish: Math.max(0, GRADUATION_RULES.ENGLISH_BASE_TARGET - waived)
    };
}

// 通識動態上限換算規則
function getGeneralEducationLimits(waivedEng = 0) {
    const waived = parseInt(waivedEng) || 0;
    return {
        maxCombinedGen: GRADUATION_RULES.GEN_BASE_CAP + waived,
        domainMax: GRADUATION_RULES.GEN_DOMAIN_MAX,
        rongMax: GRADUATION_RULES.GEN_RONG_MAX,
        domainMin: GRADUATION_RULES.GEN_DOMAIN_MIN,
        domainCountMin: GRADUATION_RULES.GEN_DOMAIN_COUNT_MIN,
        rongMin: GRADUATION_RULES.GEN_RONG_MIN
    };
}

// 跨領域預設學分目標
function getCrossMajorDefaultTarget(type) {
    return GRADUATION_RULES.CROSS_MAJOR_DEFAULTS[type] || 40;
}