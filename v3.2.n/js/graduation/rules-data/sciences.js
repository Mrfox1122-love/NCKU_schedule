// ============================================================
// 🎓 理學院 (Sciences) 各學系畢業學分規則資料庫
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 1. 數學系 (數學學系)
    // ------------------------------------------------------------
    const mathRules = {
        targetCredits: 128,
        requiredCredits: 55,
        requiredElectiveCredits: 9,  // 進階核心選修 6選3 (9學分)
        electiveCredits: 45,
        maxOutsideDeptElective: 12,  // 外系選修上限 12 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【選修說明】進階核心選修 6 選 3（至少 9 學分）。<br>【外系選修】外系選修至多採計 12 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['數學系'] = {
        '119': { ...mathRules },
        '118': { ...mathRules },
        '117': { ...mathRules },
        '116': { ...mathRules },
        '115': { ...mathRules },
        '114': { ...mathRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['數學學系'] = window.DEPARTMENT_GRADUATION_RULES['數學系'];

    // ------------------------------------------------------------
    // 2. 物理學系 (物理系)
    // ------------------------------------------------------------
    const physRules = {
        targetCredits: 130,
        requiredCredits: 62,
        requiredElectiveCredits: 15, // 本系選修至少 15 學分
        electiveCredits: 40,         // 總選修 40 學分
        maxOutsideDeptElective: 25,  // 外系選修上限 25 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【系選修限制】本系專業選修至少 15 學分。<br>【外系選修】外系選修至多採計 25 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['物理學系'] = {
        '119': { ...physRules },
        '118': { ...physRules },
        '117': { ...physRules },
        '116': { ...physRules },
        '115': { ...physRules },
        '114': { ...physRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['物理系'] = window.DEPARTMENT_GRADUATION_RULES['物理學系'];

    // ------------------------------------------------------------
    // 3. 化學學系 (化學系)
    // ------------------------------------------------------------
    const chemRules111Plus = {
        targetCredits: 128,
        requiredCredits: 59,
        requiredElectiveCredits: 17, // 本系選修至少 17 學分
        electiveCredits: 41,         // 總選修 41 學分
        maxOutsideDeptElective: 24,  // 外系選修上限 24 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【系選修限制】本系專業選修至少 17 學分。<br>【外系選修】外系選修至多採計 24 學分。'
    };

    const chemRules110 = {
        targetCredits: 128,
        requiredCredits: 59,
        requiredElectiveCredits: 24, // 本系選修至少 24 學分
        electiveCredits: 41,         // 總選修 41 學分
        maxOutsideDeptElective: 17,  // 外系選修上限 17 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【系選修限制】本系專業選修至少 24 學分。<br>【外系選修】外系選修至多採計 17 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['化學學系'] = {
        '119': { ...chemRules111Plus },
        '118': { ...chemRules111Plus },
        '117': { ...chemRules111Plus },
        '116': { ...chemRules111Plus },
        '115': { ...chemRules111Plus },
        '114': { ...chemRules110 }
    };
    window.DEPARTMENT_GRADUATION_RULES['化學系'] = window.DEPARTMENT_GRADUATION_RULES['化學學系'];

    // ------------------------------------------------------------
    // 4. 地球科學系 (地科系)
    // ------------------------------------------------------------
    const earthRules = {
        targetCredits: 132,
        requiredCredits: 51,
        requiredElectiveCredits: 17, // 專題 2 學分 + 領域核心 5 門 15 學分
        electiveCredits: 53,
        maxOutsideDeptElective: 12,  // 外系選修上限 12 學分
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學'], // 領域通識自然與工程不予採計
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外系選修至多採計 12 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['地球科學系'] = {
        '119': { ...earthRules },
        '118': { ...earthRules },
        '117': { ...earthRules },
        '116': { ...earthRules },
        '115': { ...earthRules },
        '114': { ...earthRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['地科系'] = window.DEPARTMENT_GRADUATION_RULES['地球科學系'];

    // ------------------------------------------------------------
    // 5. 光電科學與工程學系 (光電系)
    // ------------------------------------------------------------
    const optoRules111Plus = {
        targetCredits: 128,
        requiredCredits: 67,
        requiredElectiveCredits: 15, // 4大領域選2領域 (主修3門9學分 + 副修2門6學分)
        electiveCredits: 33,         // 系定專業選修 15 + 自由選修 18
        maxOutsideDeptElective: 18,  // 自由選修上限 18 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {
            nature: 4, '自然與工程科學': 4 // 自然與工程科學領域至多採計 2 門 (4 學分)
        },
        disallowedGeneralCourses: [],
        warningNote: '【通識限制】本系開出之通識不予採計。<br>【外系選修】自由選修上限 18 學分。'
    };

    const optoRules110 = {
        targetCredits: 128,
        requiredCredits: 68,
        requiredElectiveCredits: 15,
        electiveCredits: 32,         // 15 + 17
        maxOutsideDeptElective: 17,
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {
            nature: 4, '自然與工程科學': 4
        },
        disallowedGeneralCourses: [],
        warningNote: '【通識限制】本系開出之通識不予採計。<br>【外系選修】自由選修上限 17 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['光電科學與工程學系'] = {
        '119': { ...optoRules111Plus },
        '118': { ...optoRules111Plus },
        '117': { ...optoRules111Plus },
        '116': { ...optoRules111Plus },
        '115': { ...optoRules111Plus },
        '114': { ...optoRules110 }
    };
    window.DEPARTMENT_GRADUATION_RULES['光電系'] = window.DEPARTMENT_GRADUATION_RULES['光電科學與工程學系'];
})();