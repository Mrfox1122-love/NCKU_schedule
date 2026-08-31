// ============================================================
// 🎓 管理學院 (Management) 各學系畢業學分規則資料庫 (生科院 schema 標準化版)
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 1. 統計與資料科學學系 (統計學系)
    // ------------------------------------------------------------
    const statDisallowedGeneral = [
        '經濟學概論', '應用統計', '經濟學與生活', '管理與生活', '電腦入門與應用'
    ];

    const statRules115 = {
        targetCredits: 129,
        requiredCredits: 64,
        requiredElectiveCredits: 3,
        electiveCredits: 37,
        maxOutsideDeptElective: 22,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: statDisallowedGeneral,
        warningNote: ''
    };

    const statRules114 = {
        targetCredits: 129,
        requiredCredits: 61,
        requiredElectiveCredits: 3,
        electiveCredits: 40,
        maxOutsideDeptElective: 18,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: statDisallowedGeneral,
        warningNote: ''
    };

    const statRules110_113 = {
        targetCredits: 129,
        requiredCredits: 61,
        requiredElectiveCredits: 6,
        electiveCredits: 40,
        maxOutsideDeptElective: 18,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: statDisallowedGeneral,
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['統計與資料科學學系'] = {
        '119': { ...statRules115 },     // 115 學年
        '118': { ...statRules114 },     // 114 學年
        '117': { ...statRules110_113 }, // 113 學年
        '116': { ...statRules110_113 }, // 112 學年
        '115': { ...statRules110_113 }, // 111 學年
        '114': { ...statRules110_113 }  // 110 學年
    };
    window.DEPARTMENT_GRADUATION_RULES['統計學系'] = window.DEPARTMENT_GRADUATION_RULES['統計與資料科學學系'];
    window.DEPARTMENT_GRADUATION_RULES['統計系'] = window.DEPARTMENT_GRADUATION_RULES['統計與資料科學學系'];
    window.DEPARTMENT_GRADUATION_RULES['統資系'] = window.DEPARTMENT_GRADUATION_RULES['統計與資料科學學系'];

    // ------------------------------------------------------------
    // 2. 會計學系
    // ------------------------------------------------------------
    const acctRules = {
        targetCredits: 128,
        requiredCredits: 60,
        requiredElectiveCredits: 18,
        electiveCredits: 40,
        maxOutsideDeptElective: 8,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['會計學系'] = {
        '119': { ...acctRules },
        '118': { ...acctRules },
        '117': { ...acctRules },
        '116': { ...acctRules },
        '115': { ...acctRules },
        '114': { ...acctRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['會計系'] = window.DEPARTMENT_GRADUATION_RULES['會計學系'];

    // ------------------------------------------------------------
    // 3. 交通管理科學系 (交管系)
    // ------------------------------------------------------------
    const tcmDisallowedGeneral = [
        '應用統計', '統計與生活', '管理學概論', '經濟學概論', '應用會計'
    ];

    const tcmRules = {
        targetCredits: 128,
        requiredCredits: 66,
        requiredElectiveCredits: 2,
        electiveCredits: 34,
        maxOutsideDeptElective: 0,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: tcmDisallowedGeneral,
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['交通管理科學系'] = {
        '119': { ...tcmRules },
        '118': { ...tcmRules },
        '117': { ...tcmRules },
        '116': { ...tcmRules },
        '115': { ...tcmRules },
        '114': { ...tcmRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['交管系'] = window.DEPARTMENT_GRADUATION_RULES['交通管理科學系'];

    // ------------------------------------------------------------
    // 4. 企業管理學系 (企管系)
    // ------------------------------------------------------------
    const baRules111Plus = {
        targetCredits: 128,
        requiredCredits: 51,
        requiredElectiveCredits: 0, 
        electiveCredits: 49,
        maxOutsideDeptElective: 24,
        courseraCap: 8,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [], 
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: 'Coursera課程至多採計企管系選修8學分（其中外系Coursera至多採計2學分）。'
    };

    const baRules110 = {
        targetCredits: 128,
        requiredCredits: 48,
        requiredElectiveCredits: 0, 
        electiveCredits: 52,
        maxOutsideDeptElective: 24,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [], 
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: [],
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['企業管理學系'] = {
        '119': { ...baRules111Plus },
        '118': { ...baRules111Plus },
        '117': { ...baRules111Plus },
        '116': { ...baRules111Plus },
        '115': { ...baRules111Plus },
        '114': { ...baRules110 }
    };
    window.DEPARTMENT_GRADUATION_RULES['企管系'] = window.DEPARTMENT_GRADUATION_RULES['企業管理學系'];

    // ------------------------------------------------------------
    // 5. 工業與資訊管理學系 (工資管系 / 工管系)
    // ------------------------------------------------------------
    const iimDisallowed110_111 = [
        '人際互動與溝通', '應用統計', '個人理財與生活規劃', '心理學',
        '經濟學與生活', '國際化經營管理', '統計與生活', '經濟學概論',
        '管理學概論', '個人理財', '管理與生活', '經濟與國家發展',
        '資料庫入門與應用', '電腦入門與應用', '各種視窗網路與資料庫介紹',
        'WWW 網路世界', 'WWW網路世界', '視窗網路與資料庫', '網路與資訊科技',
        '網際網路與全球資訊', '淺談資訊科技', '認識電腦網路', '物件導向設計概論',
        '工程概論', '近代物理學概論', '物理的故事'
    ];

    const iimDisallowed112Plus = [
        '人際互動與溝通', '應用統計', '個人理財與生活規劃', '經濟學與生活',
        '國際化經營管理', '統計與生活', '生活經濟學', '經濟學概論',
        '管理學概論', '個人理財', '管理與生活', '經濟與國家發展',
        '國際經貿與經濟永續發展', '運動經濟學',
        '資料庫入門與應用', '電腦入門與應用', '各種視窗網路與資料庫介紹',
        'WWW 網路世界', 'WWW網路世界', '視窗網路與資料庫', '網路與資訊科技',
        '網際網路與全球資訊', 'WWW 網頁設計', 'WWW網頁設計',
        '工程科學之人工智慧與深度學習導論', '影像編修入門', 'R語言入門',
        '淺談資訊科技', '認識電腦網路', '物件導向設計概論', '工程概論',
        '近代物理學概論', '物理的故事', '拍出跨域資訊應用首部曲-python',
        '拍出跨域資訊應用首部曲--python', '拍出跨域資訊應用首部曲',
        '電腦網路概論', '人工智慧導論', '視窗程式設計', '向量繪圖設計入門',
        '心理學與健康生活', '生物醫學統計學',
        '系統思維與統計應用——人文與科技', '系統思維與統計應用-人文與科技', '系統思維與統計應用'
    ];

    const iimRules112Plus = {
        targetCredits: 128,
        requiredCredits: 57,
        requiredElectiveCredits: 0,
        electiveCredits: 43,
        maxOutsideDeptElective: 7,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: iimDisallowed112Plus,
        warningNote: ''
    };

    const iimRules110_111 = {
        targetCredits: 128,
        requiredCredits: 57,
        requiredElectiveCredits: 0,
        electiveCredits: 43,
        maxOutsideDeptElective: 4,
        studyYears: 4,
        requiredGeneralDomainsCount: 0,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        diversityExcludedDomains: [],
        disallowedGeneralCourses: iimDisallowed110_111,
        warningNote: ''
    };

    window.DEPARTMENT_GRADUATION_RULES['工業與資訊管理學系'] = {
        '119': { ...iimRules112Plus },
        '118': { ...iimRules112Plus },
        '117': { ...iimRules112Plus },
        '116': { ...iimRules112Plus },
        '115': { ...iimRules110_111 },
        '114': { ...iimRules110_111 }
    };
    window.DEPARTMENT_GRADUATION_RULES['工資管系'] = window.DEPARTMENT_GRADUATION_RULES['工業與資訊管理學系'];
    window.DEPARTMENT_GRADUATION_RULES['工管系'] = window.DEPARTMENT_GRADUATION_RULES['工業與資訊管理學系'];
    window.DEPARTMENT_GRADUATION_RULES['工資系'] = window.DEPARTMENT_GRADUATION_RULES['工業與資訊管理學系'];
})();