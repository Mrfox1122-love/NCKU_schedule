// ============================================================
// 🎓 全校不分系學士學位學程 (CCEP) 畢業學分規則資料庫
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 跨領域問題導向專題方法論課程清單 (9門必選3門，至少8學分)
    // ------------------------------------------------------------
    const methodologyCourses = [
        '服務設計方法論',
        '場域觀察和現象發掘方法',
        '資料科學方法與實作',
        '文本跨閱與思辨方法',
        '人類行為的演化方法',
        '社會事件之觀察與省思方法',
        '科技人必備的歷史思維與批判方法',
        '人機互動設計與應用方法論',
        '商業模式解析與價值導向創新'
    ];

    // ------------------------------------------------------------
    // 不分系排除授予學位清單
    // ------------------------------------------------------------
    const excludedMajorDepartments = [
        '醫學系', '牙醫學系', '牙醫系', '藥學系',
        '護理學系', '護理系', '物理治療學系', '物治系',
        '職能治療學系', '職治系', '醫學檢驗生物技術學系', '醫技系',
        '建築學系', '建築系', '建築學系設計組', '建築學系工程組',
        '法律學系', '法律系' // 法律系僅能認列為第二專長
    ];

    // ------------------------------------------------------------
    // 113~115 學年度 (117~119 級) 新制修業規章
    // ------------------------------------------------------------
    const ccepRules113Plus = {
        targetCredits: 128,
        requiredCredits: 18,             // 不分系核心課程 18 學分
        facultySpecializationCredits: 50,// 院專長養成 50 學分 (含輔系)
        requiredElectiveCredits: 0,
        electiveCredits: 32,             // 自由選修 32 學分 (Coursera 上限 8 學分)
        maxOutsideDeptElective: 32,
        studyYears: 4,
        isInterdisciplinary: true,       // 標記為不分系專屬 UI
        coreStructure: {
            careerExploration: 1,        // 自我與職涯探索 (1)
            methodologyMinCredits: 8,    // 專題方法論至少 8 學分 (必選 3 門)
            methodologyMinCourses: 3,
            methodologyList: methodologyCourses,
            projectsRequiredCredits: 9,  // 跨領域專題一、二、三各 3 學分 (共 9 學分)
            projectCourses: [
                '跨領域問題導向專題(一)', '跨領域問題導向專題（一）',
                '跨領域問題導向專題(二)', '跨領域問題導向專題（二）',
                '跨領域問題導向專題(三)', '跨領域問題導向專題（三）'
            ]
        },
        excludedMajorList: excludedMajorDepartments,
        excludedGeneralDomains: [],
        disallowedGeneralCourses: [],
        courseraCap: 8,
        warningNote: '專長養成須修滿單一學院50學分且滿足該系輔系門檻。\n醫學院全系、建築系、法律系不可作為單一主修畢業專長。'
    };

    window.DEPARTMENT_GRADUATION_RULES['全校不分系學士學位學程'] = {
        '119': { ...ccepRules113Plus }, // 115 學年
        '118': { ...ccepRules113Plus }, // 114 學年 (免修服學)
        '117': { ...ccepRules113Plus }, // 113 學年
        '116': { ...ccepRules113Plus }, // 112 學年
        '115': { ...ccepRules113Plus }, // 111 學年
        '114': { ...ccepRules113Plus }  // 110 學年
    };

    // 常用別名縮寫對應
    window.DEPARTMENT_GRADUATION_RULES['全校不分系'] = window.DEPARTMENT_GRADUATION_RULES['全校不分系學士學位學程'];
    window.DEPARTMENT_GRADUATION_RULES['不分系'] = window.DEPARTMENT_GRADUATION_RULES['全校不分系學士學位學程'];
    window.DEPARTMENT_GRADUATION_RULES['大一不分系'] = window.DEPARTMENT_GRADUATION_RULES['全校不分系學士學位學程'];
})();