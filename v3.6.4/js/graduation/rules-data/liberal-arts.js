// ============================================================
// 🎓 文學院 (Liberal Arts) 各學系畢業學分規則資料庫 (生科院 schema 標準化版)
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 1. 中國文學系 (中文系)
    // ------------------------------------------------------------
    const chineseRules114Plus = {
        targetCredits: 128,
        requiredCredits: 48,
        requiredElectiveCredits: 0,
        electiveCredits: 52,
        maxOutsideDeptElective: 10,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: { human: 2, '人文學': 2 },
        diversityExcludedDomains: ['human', '人文學', '人文'],
        disallowedGeneralCourses: [],
        warningNote: '須修系上相關選修課程',
        chineseNote: '須修系上相關選修課程'
    };

    const chineseRules110_113 = {
        targetCredits: 128,
        requiredCredits: 56,
        requiredElectiveCredits: 0,
        electiveCredits: 44,
        maxOutsideDeptElective: 10,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: { human: 2, '人文學': 2 },
        diversityExcludedDomains: ['human', '人文學', '人文'],
        disallowedGeneralCourses: [],
        warningNote: '須修系上「各體文選及習作」',
        chineseNote: '須修系上「各體文選及習作」'
    };

    window.DEPARTMENT_GRADUATION_RULES['中國文學系'] = {
        '119': { ...chineseRules114Plus }, // 115 學年
        '118': { ...chineseRules114Plus }, // 114 學年
        '117': { ...chineseRules110_113 }, // 113 學年
        '116': { ...chineseRules110_113 }, // 112 學年
        '115': { ...chineseRules110_113 }, // 111 學年
        '114': { ...chineseRules110_113 }  // 110 學年
    };
    window.DEPARTMENT_GRADUATION_RULES['中文系'] = window.DEPARTMENT_GRADUATION_RULES['中國文學系'];

    // ------------------------------------------------------------
    // 2. 台灣文學系 (台文系)
    // ------------------------------------------------------------
    const twlitRules113Plus = {
        targetCredits: 128,
        requiredCredits: 37,
        requiredElectiveCredits: 0,
        electiveCredits: 63,
        maxOutsideDeptElective: 30,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: '須以系上第三門語言必修或系內專業課程替代',
        chineseNote: '須以系上第三門語言必修或系內專業課程替代'
    };

    const twlitRules110_112 = {
        targetCredits: 128,
        requiredCredits: 39,
        requiredElectiveCredits: 0,
        electiveCredits: 61,
        maxOutsideDeptElective: 30,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: '須以系上第三門語言必修或系內專業課程替代',
        chineseNote: '須以系上第三門語言必修或系內專業課程替代'
    };

    window.DEPARTMENT_GRADUATION_RULES['台灣文學系'] = {
        '119': { ...twlitRules113Plus }, // 115 學年
        '118': { ...twlitRules113Plus }, // 114 學年
        '117': { ...twlitRules113Plus }, // 113 學年
        '116': { ...twlitRules110_112 }, // 112 學年
        '115': { ...twlitRules110_112 }, // 111 學年
        '114': { ...twlitRules110_112 }  // 110 學年
    };
    window.DEPARTMENT_GRADUATION_RULES['台文系'] = window.DEPARTMENT_GRADUATION_RULES['台灣文學系'];

    // ------------------------------------------------------------
    // 3. 歷史學系 (歷史系)
    // ------------------------------------------------------------
    const historyRules112Plus = {
        targetCredits: 128,
        requiredCredits: 27,
        requiredElectiveCredits: 18,
        electiveCredits: 73,
        maxOutsideDeptElective: 16,
        studyYears: 4,
        requiredGeneralDomainsCount: 5,
        excludedGeneralDomains: [],
        generalDomainCaps: { human: 2, '人文學': 2 },
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    const historyRules110_111 = {
        targetCredits: 128,
        requiredCredits: 27,
        requiredElectiveCredits: 36,
        electiveCredits: 73,
        maxOutsideDeptElective: 16,
        studyYears: 4,
        requiredGeneralDomainsCount: 5,
        excludedGeneralDomains: [],
        generalDomainCaps: { human: 2, '人文學': 2 },
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['歷史學系'] = {
        '119': { ...historyRules112Plus }, // 115 學年
        '118': { ...historyRules112Plus }, // 114 學年
        '117': { ...historyRules112Plus }, // 113 學年
        '116': { ...historyRules112Plus }, // 112 學年
        '115': { ...historyRules110_111 }, // 111 學年
        '114': { ...historyRules110_111 }  // 110 學年
    };
    window.DEPARTMENT_GRADUATION_RULES['歷史系'] = window.DEPARTMENT_GRADUATION_RULES['歷史學系'];

    // ------------------------------------------------------------
    // 4. 外國語文學系 (外文系)
    // ------------------------------------------------------------
    const fllRules = {
        targetCredits: 128,
        requiredCredits: 48,
        requiredElectiveCredits: 18,
        electiveCredits: 52,
        maxOutsideDeptElective: 16,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: '須另修外文系4學分選修代替',
        englishNote: '須另修外文系4學分選修代替'
    };

    window.DEPARTMENT_GRADUATION_RULES['外國語文學系'] = {
        '119': { ...fllRules }, // 115 學年
        '118': { ...fllRules }, // 114 學年
        '117': { ...fllRules }, // 113 學年
        '116': { ...fllRules }, // 112 學年
        '115': { ...fllRules }, // 111 學年
        '114': { ...fllRules }  // 110 學年
    };
    window.DEPARTMENT_GRADUATION_RULES['外文系'] = window.DEPARTMENT_GRADUATION_RULES['外國語文學系'];
})();