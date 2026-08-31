// ============================================================
// 🎓 醫學院 (Medicine) 各學系畢業學分規則資料庫 (生科院 schema 標準化版)
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 1. 護理學系 (護理系 - 4 年制)
    // ------------------------------------------------------------
    const nursingRules = {
        targetCredits: 128,
        requiredCredits: 85,
        requiredElectiveCredits: 7,
        electiveCredits: 15,
        maxOutsideDeptElective: 6,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['護理學系'] = {
        '119': { ...nursingRules },
        '118': { ...nursingRules },
        '117': { ...nursingRules },
        '116': { ...nursingRules },
        '115': { ...nursingRules },
        '114': { ...nursingRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['護理系'] = window.DEPARTMENT_GRADUATION_RULES['護理學系'];

    // ------------------------------------------------------------
    // 2. 物理治療學系 (物治系 - 4 年制)
    // ------------------------------------------------------------
    const ptRules111Plus = {
        targetCredits: 139,
        requiredCredits: 97,
        requiredElectiveCredits: 8,
        electiveCredits: 14,
        maxOutsideDeptElective: 6,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {
            bio: 2,
            '生命與健康': 2,
            '生命科學與健康': 2
        },
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    const ptRules110 = {
        targetCredits: 139,
        requiredCredits: 98,
        requiredElectiveCredits: 8,
        electiveCredits: 13,
        maxOutsideDeptElective: 5,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {
            bio: 2,
            '生命與健康': 2,
            '生命科學與健康': 2
        },
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['物理治療學系'] = {
        '119': { ...ptRules111Plus },
        '118': { ...ptRules111Plus },
        '117': { ...ptRules111Plus },
        '116': { ...ptRules111Plus },
        '115': { ...ptRules111Plus },
        '114': { ...ptRules110 }
    };
    window.DEPARTMENT_GRADUATION_RULES['物治系'] = window.DEPARTMENT_GRADUATION_RULES['物理治療學系'];

    // ------------------------------------------------------------
    // 3. 職能治療學系 (職治系 - 4 年制)
    // ------------------------------------------------------------
    const otDisallowedGeneral = [
        '社會學', '社會學概論', '普通心理學', '心理學',
        '肌力解剖與肌力訓練入門', '兒童青少年的健康', '兒童青少年健康', '身體結構與功能',
        '老化與生活綜論', '從心理學看成功老化', '全球老化與老年生活', '健康老化與高齡社會',
        '心理學與健康生活', '心理急救你我他—從心理疾病復元之生命敘事', '心理急救你我他-從心理疾病復元之生命敘事',
        '心理急救你我他', '心血管生理病理學概論', '理性與感性-大腦的功能', '理性與感性一大腦的功能', '物理治療與健康'
    ];

    const otRules114Plus = {
        targetCredits: 135,
        requiredCredits: 99,
        requiredElectiveCredits: 0,
        electiveCredits: 8,
        maxOutsideDeptElective: 8,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: otDisallowedGeneral,
        warningNote: ''
    };

    const otRules110_113 = {
        targetCredits: 135,
        requiredCredits: 99,
        requiredElectiveCredits: 0,
        electiveCredits: 8,
        maxOutsideDeptElective: 8,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: otDisallowedGeneral,
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['職能治療學系'] = {
        '119': { ...otRules114Plus },
        '118': { ...otRules114Plus },
        '117': { ...otRules110_113 },
        '116': { ...otRules110_113 },
        '115': { ...otRules110_113 },
        '114': { ...otRules110_113 }
    };
    window.DEPARTMENT_GRADUATION_RULES['職治系'] = window.DEPARTMENT_GRADUATION_RULES['職能治療學系'];

    // ------------------------------------------------------------
    // 4. 公共衛生學系 (公衛系 - 4 年制)
    // ------------------------------------------------------------
    const phRules113Plus = {
        targetCredits: 128,
        requiredCredits: 44,
        requiredElectiveCredits: 16,
        electiveCredits: 56,
        maxOutsideDeptElective: 30,
        studyYears: 4,
        requiredGeneralDomainsCount: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: '公衛系選修須於四大領域各選至少4學分(共16學分)，其餘選修依系辦審查為準。'
    };

    const phRules110_112 = {
        targetCredits: 128,
        requiredCredits: 42,
        requiredElectiveCredits: 16,
        electiveCredits: 58,
        maxOutsideDeptElective: 30,
        studyYears: 4,
        requiredGeneralDomainsCount: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: '公衛系舊制核心與選修歷經課程整併，修課認定請務必親洽系辦助教再次核對。'
    };

    window.DEPARTMENT_GRADUATION_RULES['公共衛生學系'] = {
        '119': { ...phRules113Plus },
        '118': { ...phRules113Plus },
        '117': { ...phRules113Plus },
        '116': { ...phRules110_112 },
        '115': { ...phRules110_112 },
        '114': { ...phRules110_112 }
    };
    window.DEPARTMENT_GRADUATION_RULES['公衛系'] = window.DEPARTMENT_GRADUATION_RULES['公共衛生學系'];

    // ------------------------------------------------------------
    // 5. 醫學檢驗生物技術學系 (醫技系 - 4 年制)
    // ------------------------------------------------------------
    const mtRules111Plus = {
        targetCredits: 132,
        requiredCredits: 72,
        requiredElectiveCredits: 8,
        electiveCredits: 32,
        maxOutsideDeptElective: 10,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    const mtRules110 = {
        targetCredits: 132,
        requiredCredits: 73,
        requiredElectiveCredits: 8,
        electiveCredits: 31,
        maxOutsideDeptElective: 10,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['醫學檢驗生物技術學系'] = {
        '119': { ...mtRules111Plus },
        '118': { ...mtRules111Plus },
        '117': { ...mtRules111Plus },
        '116': { ...mtRules111Plus },
        '115': { ...mtRules111Plus },
        '114': { ...mtRules110 }
    };
    window.DEPARTMENT_GRADUATION_RULES['醫技系'] = window.DEPARTMENT_GRADUATION_RULES['醫學檢驗生物技術學系'];

    // ------------------------------------------------------------
    // 6. 牙醫學系 (牙醫系 - 6 年制)
    // ------------------------------------------------------------
    const dentRules114Plus = {
        targetCredits: 236,
        requiredCredits: 200,
        requiredElectiveCredits: 4,
        electiveCredits: 8,
        maxOutsideDeptElective: 4,
        studyYears: 6,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    const dentRules113 = {
        targetCredits: 237,
        requiredCredits: 201,
        requiredElectiveCredits: 4,
        electiveCredits: 8,
        maxOutsideDeptElective: 4,
        studyYears: 6,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    const dentRules111_112 = {
        targetCredits: 238,
        requiredCredits: 202,
        requiredElectiveCredits: 4,
        electiveCredits: 8,
        maxOutsideDeptElective: 4,
        studyYears: 6,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    const dentRules110 = {
        targetCredits: 239,
        requiredCredits: 203,
        requiredElectiveCredits: 4,
        electiveCredits: 8,
        maxOutsideDeptElective: 4,
        studyYears: 6,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['牙醫學系'] = {
        '119': { ...dentRules114Plus },
        '118': { ...dentRules114Plus },
        '117': { ...dentRules113 },
        '116': { ...dentRules111_112 },
        '115': { ...dentRules111_112 },
        '114': { ...dentRules110 }
    };
    window.DEPARTMENT_GRADUATION_RULES['牙醫系'] = window.DEPARTMENT_GRADUATION_RULES['牙醫學系'];

    // ------------------------------------------------------------
    // 7. 藥學系 (藥學系 - 6 年制)
    // ------------------------------------------------------------
    const pharmacyDisallowedGeneral = [
        '日常生活中的微生物',
        '身體結構與功能',
        '心血管生理病理學概論',
        '醫學與健康',
        '生命科學概論',
        '生活中的毒物',
        '應用統計',
        '中醫食療',
        '這樣吃藥才正確',
        '當代生物醫學:了解癌症, 免疫, 及老化',
        '當代生物醫學:了解癌症、免疫、及老化',
        '當代生物醫學',
        '界面化學的生活應用',
        '兒童青少年的健康',
        '兒童青少年健康',
        '檢驗醫學概論',
        '基因密碼'
    ];

    const pharmacyRules = {
        targetCredits: 171,
        requiredCredits: 133,
        requiredElectiveCredits: 0,
        electiveCredits: 10,
        maxOutsideDeptElective: 0,
        studyYears: 6,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: pharmacyDisallowedGeneral,
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['藥學系'] = {
        '119': { ...pharmacyRules },
        '118': { ...pharmacyRules },
        '117': { ...pharmacyRules },
        '116': { ...pharmacyRules },
        '115': { ...pharmacyRules },
        '114': { ...pharmacyRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['藥學'] = window.DEPARTMENT_GRADUATION_RULES['藥學系'];

    // ------------------------------------------------------------
    // 8. 醫學系 (醫學系 - 6 年制)
    // ------------------------------------------------------------
    const medicineRules = {
        targetCredits: 218,
        requiredCredits: 170,
        requiredElectiveCredits: 8,
        electiveCredits: 20,
        maxOutsideDeptElective: 4,
        studyYears: 6,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['醫學系'] = {
        '119': { ...medicineRules },
        '118': { ...medicineRules },
        '117': { ...medicineRules },
        '116': { ...medicineRules },
        '115': { ...medicineRules },
        '114': { ...medicineRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['醫學'] = window.DEPARTMENT_GRADUATION_RULES['醫學系'];
})();