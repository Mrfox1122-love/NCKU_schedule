// ============================================================
// 🎓 電機資訊學院 (EECS) 各學系畢業學分規則資料庫
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ⚡ 電機系不承認通識清單 (112學年起 / 111學年以前)
    const eeDisallowed112Plus = [
        '應用統計', '資訊系統應用', '應用電學', '應用電學與智慧電網',
        '網路與資訊科技', '電腦入門與應用', '工程概論', '光電科技導論',
        '界面化學的生活應用', '介面化學的生活應用', '能源概論', 'WWW 網頁設計', 'WWW網頁設計',
        '奈米科技導論', '生活中玩光電', '拍出跨域資訊應用首部曲--python', '拍出跨域資訊應用首部曲-python',
        '拍出跨域資訊應用首部曲', '應用物理與實驗', 'R語言入門'
    ];

    const eeDisallowed111Before = [
        '應用統計', '資訊系統應用', '應用電學', '應用電學與智慧電網',
        '網路與資訊科技', '電腦入門與應用', '工程概論', '光電科技導論',
        '界面化學的生活應用', '介面化學的生活應用', '能源概論', 'WWW 網頁設計', 'WWW網頁設計',
        '奈米科技導論'
    ];

    // 💻 資訊系不承認通識清單 (109學年度起適用)
    const csDisallowed = [
        '電腦入門與應用', '認識電腦網路', '視窗、網路與資料庫', '視窗網路與資料庫',
        '資訊科技與應用', '資料庫入門與應用', '各種視窗網路與資料庫介紹',
        'WWW網路世界', '物件導向設計概論', '網路與資訊科技', '資訊科技應用',
        '拍出跨域資訊應用首部曲--python', '拍出跨域資訊應用首部曲-python',
        '拍出跨域資訊應用首部曲'
    ];

    // 1. 電機工程學系
    window.DEPARTMENT_GRADUATION_RULES['電機工程學系'] = {
        '119': { targetCredits: 138, requiredCredits: 59, requiredElectiveCredits: 3, electiveCredits: 51, maxOutsideDeptElective: 9, excludedGeneralDomains: [], disallowedGeneralCourses: eeDisallowed112Plus,warningNote: '【通識限制】不採計特定通識課程。<br>【必選課程】核心選修至少須修滿 3 學分。<br>【外系選修】外系選修至多採計 9 學分。' },
        '118': { targetCredits: 138, requiredCredits: 59, requiredElectiveCredits: 3, electiveCredits: 51, maxOutsideDeptElective: 9, excludedGeneralDomains: [], disallowedGeneralCourses: eeDisallowed112Plus,warningNote: '【通識限制】不採計特定通識課程。<br>【必選課程】核心選修至少須修滿 3 學分。<br>【外系選修】外系選修至多採計 9 學分。'},
        '117': { targetCredits: 144, requiredCredits: 62, requiredElectiveCredits: 3, electiveCredits: 54, maxOutsideDeptElective: 9, excludedGeneralDomains: [], disallowedGeneralCourses: eeDisallowed112Plus,warningNote: '【通識限制】不採計特定通識課程。<br>【必選課程】核心選修至少須修滿 3 學分。<br>【外系選修】外系選修至多採計 9 學分。'},
        '116': { targetCredits: 144, requiredCredits: 62, requiredElectiveCredits: 3, electiveCredits: 54, maxOutsideDeptElective: 9, excludedGeneralDomains: [], disallowedGeneralCourses: eeDisallowed112Plus,warningNote: '【通識限制】不採計特定通識課程。<br>【必選課程】核心選修至少須修滿 3 學分。<br>【外系選修】外系選修至多採計 9 學分。'},
        '115': { targetCredits: 144, requiredCredits: 64, requiredElectiveCredits: 4, electiveCredits: 52, maxOutsideDeptElective: 9, excludedGeneralDomains: [], disallowedGeneralCourses: eeDisallowed111Before,warningNote: '【通識限制】不採計特定通識課程。<br>【必選課程】核心選修至少須修滿 4 學分。<br>【外系選修】外系選修至多採計 9 學分。'},
        '114': { targetCredits: 144, requiredCredits: 64, requiredElectiveCredits: 7, electiveCredits: 52, maxOutsideDeptElective: 9, excludedGeneralDomains: [], disallowedGeneralCourses: eeDisallowed111Before,warningNote: '【通識限制】不採計特定通識課程。<br>【必選課程】核心選修至少須修滿 7 學分。<br>【外系選修】外系選修至多採計 9 學分。'}
    };
    window.DEPARTMENT_GRADUATION_RULES['電機系'] = window.DEPARTMENT_GRADUATION_RULES['電機工程學系'];

    // 2. 資訊工程學系
    const csieRules = {
        targetCredits: 130,
        requiredCredits: 60,
        requiredElectiveCredits: 0,
        electiveCredits: 42,
        maxOutsideDeptElective: 21,
        excludedGeneralDomains: [],
        disallowedGeneralCourses: csDisallowed,
        warningNote: '【通識限制】不採計特定通識課程。<br>【外系選修】外系選修至多採計 21 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['資訊工程學系'] = {
        '119': { ...csieRules },
        '118': { ...csieRules },
        '117': { ...csieRules },
        '116': { ...csieRules },
        '115': { ...csieRules },
        '114': { ...csieRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['資工系'] = window.DEPARTMENT_GRADUATION_RULES['資訊工程學系'];
})();