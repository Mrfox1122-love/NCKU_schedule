// ============================================================
// 🎓 社會科學院 (Social Sciences) 各學系畢業學分規則資料庫
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 1. 法律學系 (法律系)
    // ------------------------------------------------------------
    const lawDisallowedGeneral = [
        '法律與生活', '法學緒論', '民法概要', '憲法與生活'
    ];

    const lawRules = {
        targetCredits: 128,
        requiredCredits: 48,
        requiredElectiveCredits: 0,
        electiveCredits: 52,        // 專業選修 36 + 自由選修 16
        maxOutsideDeptElective: 16, // 一般自由選修上限 16 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: lawDisallowedGeneral,
        warningNote: '【通識限制】不採計法律與生活、法學緒論、民法概要、憲法與生活。<br>【外系選修】自由選修上限 16 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['法律學系'] = {
        '119': { ...lawRules },
        '118': { ...lawRules },
        '117': { ...lawRules },
        '116': { ...lawRules },
        '115': { ...lawRules },
        '114': { ...lawRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['法律系'] = window.DEPARTMENT_GRADUATION_RULES['法律學系'];

    // ------------------------------------------------------------
    // 2. 政治學系 (政治系)
    // ------------------------------------------------------------
    const polRules112Plus = {
        targetCredits: 128,
        requiredCredits: 42,
        requiredElectiveCredits: 20, // 四大領域各至少 5 學分
        electiveCredits: 58,         // 20 (系選) + 38 (自由選修)
        maxOutsideDeptElective: 38,  // 自由選修上限 38 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【系選修限制】四大領域各至少需修習 5 學分。<br>【外系選修】自由選修上限 38 學分。'
    };

    const polRules111 = {
        targetCredits: 128,
        requiredCredits: 45,
        requiredElectiveCredits: 20,
        electiveCredits: 55,         // 20 (系選) + 35 (自由選修)
        maxOutsideDeptElective: 35,  // 自由選修上限 35 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【系選修限制】四大領域各至少需修習 5 學分。<br>【外系選修】自由選修上限 35 學分。'
    };

    const polRules110 = {
        targetCredits: 128,
        requiredCredits: 51,
        requiredElectiveCredits: 25,
        electiveCredits: 49,         // 25 (系選) + 24 (自由選修)
        maxOutsideDeptElective: 24,  // 自由選修上限 24 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】自由選修上限 24 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['政治學系'] = {
        '119': { ...polRules112Plus },
        '118': { ...polRules112Plus },
        '117': { ...polRules112Plus },
        '116': { ...polRules112Plus },
        '115': { ...polRules111 },
        '114': { ...polRules110 }
    };
    window.DEPARTMENT_GRADUATION_RULES['政治系'] = window.DEPARTMENT_GRADUATION_RULES['政治學系'];

    // ------------------------------------------------------------
    // 3. 經濟學系 (經濟系)
    // ------------------------------------------------------------
    const econRules = {
        targetCredits: 128,
        requiredCredits: 48,
        requiredElectiveCredits: 27, // 經濟分析工具 12 + 應用經濟 15
        electiveCredits: 52,         // 系定選修 27 + 自由選修 25
        maxOutsideDeptElective: 25,  // 自由選修上限 25 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【系選修限制】包含經濟分析工具（12學分）與應用經濟（15學分）。<br>【外系選修】自由選修上限 25 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['經濟學系'] = {
        '119': { ...econRules },
        '118': { ...econRules },
        '117': { ...econRules },
        '116': { ...econRules },
        '115': { ...econRules },
        '114': { ...econRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['經濟系'] = window.DEPARTMENT_GRADUATION_RULES['經濟學系'];

    // ------------------------------------------------------------
    // 4. 心理學系 (心理系)
    // ------------------------------------------------------------
    const psyDisallowedGeneral = [
        '心理學',
        '心理學概論'
    ];

    const psyRules115 = {
        targetCredits: 128,
        requiredCredits: 41,
        requiredElectiveCredits: 3,
        electiveCredits: 59,         // 專業選修 24 + 自由選修 35
        maxOutsideDeptElective: 35,  // 自由選修上限 35 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: psyDisallowedGeneral,
        warningNote: '【通識限制】不採計「心理學」與「心理學概論」通識。<br>【必修說明】必要選修微積分(一)或AI/大數據/程式/數統 3 學分。<br>【外系選修】自由選修上限 35 學分。'
    };

    const psyRules108_114 = {
        targetCredits: 128,
        requiredCredits: 41,
        requiredElectiveCredits: 3,
        electiveCredits: 59,         // 專業選修 24 + 自由選修 35
        maxOutsideDeptElective: 35,  // 自由選修上限 35 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: psyDisallowedGeneral,
        warningNote: '【通識限制】不採計「心理學」與「心理學概論」通識。<br>【必修說明】必要選修微積分(一) 3 學分。<br>【外系選修】自由選修上限 35 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['心理學系'] = {
        '119': { ...psyRules115 },
        '118': { ...psyRules108_114 },
        '117': { ...psyRules108_114 },
        '116': { ...psyRules108_114 },
        '115': { ...psyRules108_114 },
        '114': { ...psyRules108_114 }
    };
    window.DEPARTMENT_GRADUATION_RULES['心理系'] = window.DEPARTMENT_GRADUATION_RULES['心理學系'];
})();