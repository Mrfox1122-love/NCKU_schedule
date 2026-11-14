// ============================================================
// 🎓 生物科學與科技學院 各學系畢業學分規則資料庫
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 1. 生命科學系 (LS)
    // ------------------------------------------------------------
    const lsDisallowedGeneral = [
        '應用統計', '大自然的規律', '化學的生活應用', '應用化學與實驗',
        '自然科學概論', '物理的故事', '近代物理學饗宴', '生物多樣性',
        '生命科學概論', '生物技術概論', '醫學生物技術概論', '基因密碼',
        '基因改造食品的好與壞', '動物寄生蟲與生活', '疾病媒介', '身體結構與功能',
        '理性與感性-大腦的功能', '理性與感性一大腦的功能', '心血管生理病理學概論',
        '打開植物的奧秘', '食品營養與健康', '認識基因', '校園植物照護與解說',
        '植物與文明', '植物與生活', '生活園藝', '健康生物學'
    ];

    const lsRules112Plus = {
        targetCredits: 131,
        requiredCredits: 50, // 院必修 22 + 系必修 28
        requiredElectiveCredits: 0,
        electiveCredits: 53,
        maxOutsideDeptElective: 20,
        excludedGeneralDomains: [],
        generalDomainCaps: { '生命與健康': 2, '生命科學與健康': 2, bio: 2 },
        disallowedGeneralCourses: lsDisallowedGeneral,
        warningNote: '【通識限制】不採計特定 28 門通識課程。\n【外系選修】外系選修至多採計 20 學分。'
    };

    const lsRules110_111 = {
        targetCredits: 132,
        requiredCredits: 51, // 院必修 22 + 系必修 29
        requiredElectiveCredits: 0,
        electiveCredits: 53,
        maxOutsideDeptElective: 20,
        excludedGeneralDomains: [],
        generalDomainCaps: { '生命與健康': 2, '生命科學與健康': 2, bio: 2 },
        disallowedGeneralCourses: lsDisallowedGeneral,
        warningNote: '【通識限制】不採計特定 28 門通識課程。\n【外系選修】外系選修至多採計 20 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['生命科學系'] = {
        '119': { ...lsRules112Plus },
        '118': { ...lsRules112Plus },
        '117': { ...lsRules112Plus },
        '116': { ...lsRules112Plus },
        '115': { ...lsRules110_111 },
        '114': { ...lsRules110_111 }
    };
    window.DEPARTMENT_GRADUATION_RULES['生科系'] = window.DEPARTMENT_GRADUATION_RULES['生命科學系'];

    // ------------------------------------------------------------
    // 2. 生物科技與產業科學學系 (DBBS)
    // ------------------------------------------------------------
    const dbbsDisallowed110_111 = [
        '應用統計', '應用化學與實驗', '打開植物的奧秘', '基因改造食品的好與壞',
        '生物技術概論', '植物與生活', '植物與文明', '水產養殖與健康',
        '生命科學概論', '認識基因', '基因密碼'
    ];

    const dbbsDisallowed112 = [
        ...dbbsDisallowed110_111,
        '當代生物醫學:了解癌症,免疫,及老化', '當代生物醫學:了解癌症免疫及老化',
        '身體結構與功能', '醫學生物技術概論', '生活中之細胞功能運作'
    ];

    const dbbsDisallowed113Plus = [
        ...dbbsDisallowed112,
        '實驗生物模式概論'
    ];

    const dbbsRules113Plus = {
        targetCredits: 128,
        requiredCredits: 44,
        requiredElectiveCredits: 0,
        electiveCredits: 56,
        maxOutsideDeptElective: 23,
        excludedGeneralDomains: [],
        generalDomainCaps: { '生命與健康': 2, '生命科學與健康': 2, bio: 2 },
        disallowedGeneralCourses: dbbsDisallowed113Plus,
        warningNote: '【通識限制】不採計特定通識課程。\n【外系選修】外系選修至多採計 23 學分。'
    };

    const dbbsRules112 = {
        targetCredits: 128,
        requiredCredits: 51,
        requiredElectiveCredits: 0,
        electiveCredits: 49,
        maxOutsideDeptElective: 18,
        excludedGeneralDomains: [],
        generalDomainCaps: { '生命與健康': 2, '生命科學與健康': 2, bio: 2 },
        disallowedGeneralCourses: dbbsDisallowed112,
        warningNote: '【通識限制】不採計特定通識課程。\n【外系選修】外系選修至多採計 18 學分。'
    };

    const dbbsRules110_111 = {
        targetCredits: 128,
        requiredCredits: 51,
        requiredElectiveCredits: 0,
        electiveCredits: 49,
        maxOutsideDeptElective: 18,
        excludedGeneralDomains: [],
        generalDomainCaps: { '生命與健康': 2, '生命科學與健康': 2, bio: 2 },
        disallowedGeneralCourses: dbbsDisallowed110_111,
        warningNote: '【通識限制】不採計特定通識課程。\n【外系選修】外系選修至多採計 18 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['生物科技與產業科學學系'] = {
        '119': { ...dbbsRules113Plus },
        '118': { ...dbbsRules113Plus },
        '117': { ...dbbsRules113Plus },
        '116': { ...dbbsRules112 },
        '115': { ...dbbsRules110_111 },
        '114': { ...dbbsRules110_111 }
    };
    window.DEPARTMENT_GRADUATION_RULES['生技系'] = window.DEPARTMENT_GRADUATION_RULES['生物科技與產業科學學系'];
})();