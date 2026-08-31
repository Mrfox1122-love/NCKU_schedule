// ============================================================
// 🎓 規劃與設計學院 (Planning & Design) 各學系畢業學分規則資料庫
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 1. 工業設計學系 (工設系)
    // ------------------------------------------------------------
    const idRules = {
        targetCredits: 128,
        requiredCredits: 64,
        requiredElectiveCredits: 18, // 系內專業選修至少 18 學分
        electiveCredits: 36,         // 總選修 36 學分
        maxOutsideDeptElective: 18,  // 外系選修上限 18 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外系選修至多採計 18 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['工業設計學系'] = {
        '119': { ...idRules },
        '118': { ...idRules },
        '117': { ...idRules },
        '116': { ...idRules },
        '115': { ...idRules },
        '114': { ...idRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['工設系'] = window.DEPARTMENT_GRADUATION_RULES['工業設計學系'];

    // ------------------------------------------------------------
    // 2. 都市計劃學系 (都計系)
    // ------------------------------------------------------------
    const upDisallowedGeneral = [
        '經濟學概論', '經濟學與生活', '社會學', '當前台灣土地問題',
        '應用統計', '統計與生活', '統計介紹', '實用統計', '運輸學',
        '社區營造理論與實務', '社會科學導論', '都市規劃概論',
        '工程概論', '都市問題與生活', '衛星資訊概論', '衛星資訊', '衛星資訊與生活',
        '電腦入門與應用', '網際網路與全球資訊網', '淺談資訊科技',
        '各種視窗網路與資料庫介紹', 'www網路世界', 'www 網路世界',
        '認識電腦網路', '視窗網路與資料庫',
        '生態學', '環境與生活',
        '21世紀環境議題環境政策', '都市與生活', '永續城市發展'
    ];

    const upRules = {
        targetCredits: 132,
        requiredCredits: 70,
        requiredElectiveCredits: 27, // 系內專業選修至少 27 學分
        electiveCredits: 34,         // 專業選修總計 34 學分
        maxOutsideDeptElective: 7,   // 外系選修上限 7 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: upDisallowedGeneral,
        warningNote: '【通識限制】不採計特定 30 門通識課程。<br>【外系選修】外系選修至多採計 7 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['都市計劃學系'] = {
        '119': { ...upRules },
        '118': { ...upRules },
        '117': { ...upRules },
        '116': { ...upRules },
        '115': { ...upRules },
        '114': { ...upRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['都計系'] = window.DEPARTMENT_GRADUATION_RULES['都市計劃學系'];

    // ------------------------------------------------------------
    // 3. 建築學系 (四年制 / 四年制工程組)
    // ------------------------------------------------------------
    const arch4Rules = {
        targetCredits: 137,
        requiredCredits: 71,
        requiredElectiveCredits: 1,  // 必選「建築敘事」1 學分
        electiveCredits: 38,
        maxOutsideDeptElective: 12,  // 外系選修上限 12 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【必修說明】必選「建築敘事」1 學分。<br>【外系選修】外系選修至多採計 12 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['建築學系 (四年制)'] = {
        '119': { ...arch4Rules },
        '118': { ...arch4Rules },
        '117': { ...arch4Rules },
        '116': { ...arch4Rules },
        '115': { ...arch4Rules },
        '114': { ...arch4Rules }
    };
    window.DEPARTMENT_GRADUATION_RULES['建築系 (四年制)'] = window.DEPARTMENT_GRADUATION_RULES['建築學系 (四年制)'];

    // ------------------------------------------------------------
    // 4. 建築學系 (五年制 / 五年制設計組)
    // ------------------------------------------------------------
    const arch5Rules = {
        targetCredits: 156,
        requiredCredits: 83,
        requiredElectiveCredits: 0,
        electiveCredits: 45,
        maxOutsideDeptElective: 12,  // 外系選修上限 12 學分
        studyYears: 5,               // 五年制學程
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【修業年限】五年制學程。<br>【外系選修】外系選修至多採計 12 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['建築學系 (五年制)'] = {
        '119': { ...arch5Rules },
        '118': { ...arch5Rules },
        '117': { ...arch5Rules },
        '116': { ...arch5Rules },
        '115': { ...arch5Rules },
        '114': { ...arch5Rules }
    };
    window.DEPARTMENT_GRADUATION_RULES['建築系 (五年制)'] = window.DEPARTMENT_GRADUATION_RULES['建築學系 (五年制)'];
    window.DEPARTMENT_GRADUATION_RULES['建築學系'] = window.DEPARTMENT_GRADUATION_RULES['建築學系 (四年制)']; // 預設導向四年制
    window.DEPARTMENT_GRADUATION_RULES['建築系'] = window.DEPARTMENT_GRADUATION_RULES['建築學系 (四年制)'];
})();