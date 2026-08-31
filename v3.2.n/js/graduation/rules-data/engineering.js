// ============================================================
// 🎓 工學院 (Engineering) 各學系畢業學分規則資料庫 (全 13 系所/學程規格化完整版)
// ============================================================

(function() {
    window.DEPARTMENT_GRADUATION_RULES = window.DEPARTMENT_GRADUATION_RULES || {};

    // ------------------------------------------------------------
    // 1. 機械工程學系 (機械系 / ME)
    // ------------------------------------------------------------
    const meRules113Plus = {
        targetCredits: 144,
        requiredCredits: 81,
        requiredElectiveCredits: 12, // 核心選修 6 選 4 門 (12 學分)
        electiveCredits: 35,
        maxOutsideDeptElective: 17,  // 35 - 18 = 17 學分 (系內至少 18 學分)
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學', '自然與工程', '自然', 'nature'],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【核心選修】須自 6 門中必選 4 門(12學分)：工數(三)、熱力(二)、材力(二)、機動(二)、伺服控制、機械振動。<br>【外系選修】系內選修至少 18 學分，外系選修至多採計 17 學分。'
    };

    const meRules110_112 = {
        targetCredits: 144,
        requiredCredits: 81,
        requiredElectiveCredits: 0,
        electiveCredits: 35,
        maxOutsideDeptElective: 17,
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學', '自然與工程', '自然', 'nature'],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】系內選修至少須修滿 18 學分，外系選修至多採計 17 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['機械工程學系'] = {
        '119': { ...meRules113Plus },
        '118': { ...meRules113Plus },
        '117': { ...meRules113Plus },
        '116': { ...meRules110_112 },
        '115': { ...meRules110_112 },
        '114': { ...meRules110_112 }
    };
    window.DEPARTMENT_GRADUATION_RULES['機械系'] = window.DEPARTMENT_GRADUATION_RULES['機械工程學系'];

    // ------------------------------------------------------------
    // 2. 化學工程學系 (化工系 / CHE)
    // ------------------------------------------------------------
    const cheDisallowedGeneral = [
        '應用化學與實驗', '應用電學', '電腦入門與應用', '材料科技概論',
        '工程概論', '界面化學的生活應用', '介面化學的生活應用',
        '環境污染與防治', '資訊科技應用'
    ];

    const cheRules = {
        targetCredits: 138,
        requiredCredits: 77,
        requiredElectiveCredits: 10, // 計概(3) + 電子電工(3) + 工安(3) + 論文/文獻四選一(1) = 10
        electiveCredits: 33,         // 必選 10 + 其他選修 23 = 33
        maxOutsideDeptElective: 12,  // 33 - 21 = 12 學分 (本系選修含必選至少 21 學分)
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: cheDisallowedGeneral,
        warningNote: '【通識限制】不採計特定 9 門通識課程。<br>【選修規定】本系選修(含必選)至少修滿 21 學分，外系選修至多採計 12 學分；必選 10 學分含計概(3)、電工電子(3)、工安(3)、論文/文獻(1)。'
    };

    window.DEPARTMENT_GRADUATION_RULES['化學工程學系'] = {
        '119': { ...cheRules },
        '118': { ...cheRules },
        '117': { ...cheRules },
        '116': { ...cheRules },
        '115': { ...cheRules },
        '114': { ...cheRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['化工系'] = window.DEPARTMENT_GRADUATION_RULES['化學工程學系'];

    // ------------------------------------------------------------
    // 3. 土木工程學系 (土木系 / CE)
    // ------------------------------------------------------------
    const civilRules113Plus = {
        targetCredits: 134,
        requiredCredits: 68,         // 院共同必修 18 + 系專業必修 50 = 68
        requiredElectiveCredits: 0,  // 必選3門(結構二、材力二、基礎工程)須修過1次
        electiveCredits: 38,         // 本系專業選修 35 + 不限系所選修 3 = 38
        maxOutsideDeptElective: 12,  // 一般自由選修 3 + 土環學群/規設院至多 9 = 12 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【必選修】結構學(二)、材料力學(二)、基礎工程學須修過 1 次。<br>【外系選修】系專選得含環工、測量、水利及規設院課程至多 9 學分（非本系 Coursera 至多 6 學分）。'
    };

    const civilRules110_112 = {
        targetCredits: 137,
        requiredCredits: 71,         // 院共同必修 18 + 系專業必修 53 (含運輸工程) = 71
        requiredElectiveCredits: 0,
        electiveCredits: 38,
        maxOutsideDeptElective: 12,
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【必修】必修 53 學分含運輸工程學(3)。<br>【必選修】結構學(二)、材料力學(二)、基礎工程學、環境工程學。<br>【外系選修】系專選得含土環學群及規設院至多 9 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['土木工程學系'] = {
        '119': { ...civilRules113Plus },
        '118': { ...civilRules113Plus },
        '117': { ...civilRules113Plus },
        '116': { ...civilRules110_112 },
        '115': { ...civilRules110_112 },
        '114': { ...civilRules110_112 }
    };
    window.DEPARTMENT_GRADUATION_RULES['土木系'] = window.DEPARTMENT_GRADUATION_RULES['土木工程學系'];

    // ------------------------------------------------------------
    // 4. 材料科學與工程學系 (材料系 / MSE)
    // ------------------------------------------------------------
    const mseRules114Plus = {
        targetCredits: 130,
        requiredCredits: 69,
        requiredElectiveCredits: 0,
        electiveCredits: 33,
        maxOutsideDeptElective: 12,  // 114起外系選修放寬至至多 12 學分 (A開頭除外)
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學', '自然與工程', '自然', 'nature'],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外系選修最多採計 12 學分（A 開頭通識課程除外）。'
    };

    const mseRules112_113 = {
        targetCredits: 130,
        requiredCredits: 69,
        requiredElectiveCredits: 0,
        electiveCredits: 33,
        maxOutsideDeptElective: 6,
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學', '自然與工程', '自然', 'nature'],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外系選修最多採計 6 學分（A 開頭課程除外）。'
    };

    const mseRules110_111 = {
        targetCredits: 130,
        requiredCredits: 69,
        requiredElectiveCredits: 0,
        electiveCredits: 33,
        maxOutsideDeptElective: 6,
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外系選修最多採計 6 學分（A 開頭除外）。<br>【通識限制】通識內容不可與本系必選修相似，材化資學群開授之科目不予承認。'
    };

    window.DEPARTMENT_GRADUATION_RULES['材料科學與工程學系'] = {
        '119': { ...mseRules114Plus },
        '118': { ...mseRules114Plus },
        '117': { ...mseRules112_113 },
        '116': { ...mseRules112_113 },
        '115': { ...mseRules110_111 },
        '114': { ...mseRules110_111 }
    };
    window.DEPARTMENT_GRADUATION_RULES['材料系'] = window.DEPARTMENT_GRADUATION_RULES['材料科學與工程學系'];

    // ------------------------------------------------------------
    // 5. 水利及海洋工程學系 (水利系 / 水海系 / HE)
    // ------------------------------------------------------------
    const heRules = {
        targetCredits: 135,
        requiredCredits: 75,         // 專業必修 71 + 設計必修 4 (4選2) = 75
        requiredElectiveCredits: 1,  // 必選 1 學分 (水利及海洋工程概論)
        electiveCredits: 32,         // 必選 1 + 專業選修 31 = 32
        maxOutsideDeptElective: 21,  // 31 - 10 = 21 學分 (本系專選至少修滿 10 學分)
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【必修/必選】設計必修 4 學分(防洪/水資源/海洋/海岸工程設計 4 選 2)；必選 1 學分為水利及海洋工程概論。<br>【修課限制】水文學與流體力學僅限修本系。<br>【外系選修】本系選修至少 10 學分，外系選修至多採計 21 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['水利及海洋工程學系'] = {
        '119': { ...heRules },
        '118': { ...heRules },
        '117': { ...heRules },
        '116': { ...heRules },
        '115': { ...heRules },
        '114': { ...heRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['水利系'] = window.DEPARTMENT_GRADUATION_RULES['水利及海洋工程學系'];
    window.DEPARTMENT_GRADUATION_RULES['水海系'] = window.DEPARTMENT_GRADUATION_RULES['水利及海洋工程學系'];

    // ------------------------------------------------------------
    // 6. 工程科學系 (工科系 / ES)
    // ------------------------------------------------------------
    const esRules = {
        targetCredits: 130,
        requiredCredits: 70,
        requiredElectiveCredits: 0,
        electiveCredits: 32,
        maxOutsideDeptElective: 9,   // 外系選修上限 9 學分 (修讀本系歷年曾開選修課可認列系內)
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學', '自然與工程', '自然', 'nature'],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外系選修至多採計 9 學分（至外系修讀本系歷年曾開授之選修課可認列系內選修）。<br>【門檻規定】英文門檻為多益785 / 英檢中高級 / 托福87 / 雅思5.5。'
    };

    window.DEPARTMENT_GRADUATION_RULES['工程科學系'] = {
        '119': { ...esRules },
        '118': { ...esRules },
        '117': { ...esRules },
        '116': { ...esRules },
        '115': { ...esRules },
        '114': { ...esRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['工科系'] = window.DEPARTMENT_GRADUATION_RULES['工程科學系'];

    // ------------------------------------------------------------
    // 7. 系統及船舶機電工程學系 (系統系 / 造船系 / SNAME)
    // ------------------------------------------------------------
    const seRules112Plus = {
        targetCredits: 131,
        requiredCredits: 71,
        requiredElectiveCredits: 0,
        electiveCredits: 32,
        maxOutsideDeptElective: 6,   // 工電專業課程 1 門 (3) + 本校他系/自主探究 (3) = 6 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: { '自然與工程科學': 2, '自然與工程': 2, '自然': 2, nature: 2 },
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外系選修至多採計 6 學分 (工電專業課至多 3 學分 + 他系課至多 3 學分)。<br>【分組選修】須通過本組至少 5 門 + 跨組大三課 1 門 (共用 5 門★至多採計 1 門)。'
    };

    const seRules110_111 = {
        targetCredits: 131,
        requiredCredits: 71,
        requiredElectiveCredits: 0,
        electiveCredits: 32,
        maxOutsideDeptElective: 3,   // 僅限承認工學院或電資學院專業課程 1 門 (3 學分)
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: { '自然與工程科學': 2, '自然與工程': 2, '自然': 2, nature: 2 },
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外系選修至多採計 3 學分 (僅限工學院或電資學院專業課 1 門)。<br>【分組選修】須通過本組至少 5 門 + 跨組 2 門。'
    };

    window.DEPARTMENT_GRADUATION_RULES['系統及船舶機電工程學系'] = {
        '119': { ...seRules112Plus },
        '118': { ...seRules112Plus },
        '117': { ...seRules112Plus },
        '116': { ...seRules112Plus },
        '115': { ...seRules110_111 },
        '114': { ...seRules110_111 }
    };
    window.DEPARTMENT_GRADUATION_RULES['系統系'] = window.DEPARTMENT_GRADUATION_RULES['系統及船舶機電工程學系'];
    window.DEPARTMENT_GRADUATION_RULES['造船系'] = window.DEPARTMENT_GRADUATION_RULES['系統及船舶機電工程學系'];

    // ------------------------------------------------------------
    // 8. 航空太空工程學系 (航太系 / DAA)
    // ------------------------------------------------------------
    const iaaeRules111Plus = {
        targetCredits: 133,
        requiredCredits: 75,         // 必修增至 75 學分 (含熱力學二 3學分、空氣動力學二 3學分)
        requiredElectiveCredits: 0,
        electiveCredits: 30,
        maxOutsideDeptElective: 12,  // 30 - 18 = 12 學分 (本系選修至少 18 學分)
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學', '自然與工程', '自然', 'nature'],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】本系選修(含航太所/民航所)至少修滿 18 學分，外系選修上限 12 學分。<br>【修課限制】「論文(一)(二)」或「航太實作專題(一)(二)」須修畢 1 與 2 始得採計。'
    };

    const iaaeRules110 = {
        targetCredits: 133,
        requiredCredits: 73,         // 必修 73 學分 (含航太工程實作一二共4學分)
        requiredElectiveCredits: 0,
        electiveCredits: 32,
        maxOutsideDeptElective: 14,  // 32 - 18 = 14 學分 (本系選修至少 18 學分)
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學', '自然與工程', '自然', 'nature'],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】本系選修(含航太所/民航所)至少修滿 18 學分，外系選修上限 14 學分。<br>【修課限制】「論文(一)(二)」或「航太實作專題(一)(二)」須修畢 1 與 2 始得採計。'
    };

    window.DEPARTMENT_GRADUATION_RULES['航空太空工程學系'] = {
        '119': { ...iaaeRules111Plus },
        '118': { ...iaaeRules111Plus },
        '117': { ...iaaeRules111Plus },
        '116': { ...iaaeRules111Plus },
        '115': { ...iaaeRules111Plus },
        '114': { ...iaaeRules110 }
    };
    window.DEPARTMENT_GRADUATION_RULES['航太系'] = window.DEPARTMENT_GRADUATION_RULES['航空太空工程學系'];

    // ------------------------------------------------------------
    // 9. 資源工程學系 (資源系 / RE)
    // ------------------------------------------------------------
    const reDisallowedGeneral = [
        '材料科技概論', '應用化學與實驗', '地震研究', '化學的生活應用',
        '工程概論', '大自然的規律', '界面化學的生活應用', '介面化學的生活應用',
        '環境污染與防治', '電腦入門與應用'
    ];

    const reRules = {
        targetCredits: 128,
        requiredCredits: 61,         // 18門系共同必修共 61 學分
        requiredElectiveCredits: 0,
        electiveCredits: 39,         // 選修至少 39 學分 (系選修E4/N4，得採計外系選修)
        maxOutsideDeptElective: 15,
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: reDisallowedGeneral,
        warningNote: '【通識限制】不採計特定 10 門自然科學領域通識。<br>【選修規定】系共同必修 61 學分 (共 18 門)；選修至少 39 學分 (系選修為 E4/N4 開課序號，得採計外系選課)。<br>【門檻規定】須通過英文能力門檻或修習補強英文。'
    };

    window.DEPARTMENT_GRADUATION_RULES['資源工程學系'] = {
        '119': { ...reRules },
        '118': { ...reRules },
        '117': { ...reRules },
        '116': { ...reRules },
        '115': { ...reRules },
        '114': { ...reRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['資源系'] = window.DEPARTMENT_GRADUATION_RULES['資源工程學系'];

    // ------------------------------------------------------------
    // 10. 環境工程學系 (環工系 / EV)
    // ------------------------------------------------------------
    const eveDisallowedGeneral = [
        '應用統計', '統計與生活',
        '近代物理學饗宴', '物理的故事', '物理與現代生活',
        '化學的生活應用', '化學與生活', '應用化學',
        '應用化學與實驗', '趣味化學與實驗',
        '網路與資訊科技', '電腦入門與應用',
        '地震研究', '認識地震', '工程與防震',
        '火、能源、環境與安全(二)', '工程概論',
        '全球環境變遷', '環境污染與防治',
        '水之禪', '臺灣的水資源', '台灣的水資源',
        '建築與抗震', '應用物理與實驗',
        '生態學', '環境與生活', '動物醫學概論', '寵物醫學概論',
        '生物多樣性', '生命科學概論', '生物技術概論'
    ];

    const eveRules113Plus = {
        targetCredits: 129,
        requiredCredits: 66,         // 院基礎 35 (工程力學3) + 系基礎 31 = 66
        requiredElectiveCredits: 18, // 系組指定必選 6 門各 3 學分 = 18
        electiveCredits: 35,         // 必選 18 + 本外系選修 17 = 35
        maxOutsideDeptElective: 6,   // 外系選修至多承認 6 學分
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: { '自然與工程科學': 2, '自然與工程': 2, '自然': 2, nature: 2, '生命與健康': 4, '生命科學與健康': 4, bio: 4 },
        disallowedGeneralCourses: eveDisallowedGeneral,
        warningNote: '【通識限制】不採計特定 31 門通識課程。<br>【外系選修】外系選修上限 6 學分。<br>【必選修】必選 18 學分 (生物學、電工電子、污水、RC、環工物理概論、環工設計一)。'
    };

    const eveRules112 = {
        targetCredits: 129,
        requiredCredits: 66,
        requiredElectiveCredits: 18,
        electiveCredits: 35,
        maxOutsideDeptElective: 6,
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: { '自然與工程科學': 2, '自然與工程': 2, '自然': 2, nature: 2 },
        disallowedGeneralCourses: eveDisallowedGeneral,
        warningNote: '【通識限制】不採計特定 31 門通識課程。<br>【外系選修】外系選修上限 6 學分。<br>【必選修】必選 18 學分 (生物學、電工電子、污水、RC、環工物理概論、環工設計一)。'
    };

    const eveRules110_111 = {
        targetCredits: 129,
        requiredCredits: 69,         // 院基礎 38 (應力3+材力3) + 系基礎 31 = 69
        requiredElectiveCredits: 18,
        electiveCredits: 32,         // 必選 18 + 本外系選修 14 = 32
        maxOutsideDeptElective: 6,
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: { '自然與工程科學': 2, '自然與工程': 2, '自然': 2, nature: 2 },
        disallowedGeneralCourses: eveDisallowedGeneral,
        warningNote: '【必修】必修 69 學分 (含應力 3、材力 3)。<br>【通識限制】不採計特定 31 門通識課程。<br>【外系選修】外系選修上限 6 學分。<br>【必選修】必選 18 學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['環境工程學系'] = {
        '119': { ...eveRules113Plus },
        '118': { ...eveRules113Plus },
        '117': { ...eveRules113Plus },
        '116': { ...eveRules112 },
        '115': { ...eveRules110_111 },
        '114': { ...eveRules110_111 }
    };
    window.DEPARTMENT_GRADUATION_RULES['環工系'] = window.DEPARTMENT_GRADUATION_RULES['環境工程學系'];

    // ------------------------------------------------------------
    // 11. 生物醫學工程學系 (醫工系 / BME)
    // ------------------------------------------------------------
    const bmeRules = {
        targetCredits: 134,
        requiredCredits: 68,         // 專業必修 68 學分
        requiredElectiveCredits: 0,
        electiveCredits: 38,         // 專業選修 38 學分
        maxOutsideDeptElective: 16,  // 38 - 22 = 16 學分 (本系選修至少須修滿 22 學分)
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】本系選修至少須修滿 22 學分，外系選修至多採計 16 學分（須填寫外系學分承認單並經導師簽核）。<br>【必選修】甲組力學必選生醫材料導論(3)+實驗(1)，乙組醫電必選電子學與實驗(一)(4)+電子學與實驗(二)(4)。<br>【門檻規定】英文門檻為 CEFR B2。'
    };

    window.DEPARTMENT_GRADUATION_RULES['生物醫學工程學系'] = {
        '119': { ...bmeRules },
        '118': { ...bmeRules },
        '117': { ...bmeRules },
        '116': { ...bmeRules },
        '115': { ...bmeRules },
        '114': { ...bmeRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['醫工系'] = window.DEPARTMENT_GRADUATION_RULES['生物醫學工程學系'];

    // ------------------------------------------------------------
    // 12. 測量及空間資訊學系 (測量系 / 測空系 / GEOM)
    // ------------------------------------------------------------
    const geomaticsRules = {
        targetCredits: 135,
        requiredCredits: 67,         // 專業必修 67 學分
        requiredElectiveCredits: 0,
        electiveCredits: 40,         // 專業選修 40 學分以上
        maxOutsideDeptElective: 9,   // 一般外系選修上限 9 學分（雙輔/跨領域學程者至多 15 學分）
        studyYears: 4,
        excludedGeneralDomains: [],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】外(校)系選修最多採計 9 學分；修習「雙主修、輔系、跨領域學分學程」者，最高可承認 15 個外系專業學分。'
    };

    window.DEPARTMENT_GRADUATION_RULES['測量及空間資訊學系'] = {
        '119': { ...geomaticsRules },
        '118': { ...geomaticsRules },
        '117': { ...geomaticsRules },
        '116': { ...geomaticsRules },
        '115': { ...geomaticsRules },
        '114': { ...geomaticsRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['測量系'] = window.DEPARTMENT_GRADUATION_RULES['測量及空間資訊學系'];
    window.DEPARTMENT_GRADUATION_RULES['測空系'] = window.DEPARTMENT_GRADUATION_RULES['測量及空間資訊學系'];

    // ------------------------------------------------------------
    // 13. 能源工程國際學士學位學程 (能源學程 / IBDPE)
    // ------------------------------------------------------------
    const energyRules = {
        targetCredits: 131,
        requiredCredits: 69,         // 學程專業必修 69 學分
        requiredElectiveCredits: 0,
        electiveCredits: 34,         // 總選修 34 學分
        maxOutsideDeptElective: 14,  // 34 - 20 = 14 學分 (本學程選修至少須修滿 20 學分)
        studyYears: 4,
        excludedGeneralDomains: ['自然與工程科學', '自然與工程', '自然', 'nature'],
        generalDomainCaps: {},
        disallowedGeneralCourses: [],
        warningNote: '【外系選修】學程選修至少修滿 20 學分(碩博課程可認列)，外系選修上限 14 學分。<br>【修課限制】「專題論文(一)(二)」須修畢 1 與 2 始得採計。'
    };

    window.DEPARTMENT_GRADUATION_RULES['能源工程國際學士學位學程'] = {
        '119': { ...energyRules },
        '118': { ...energyRules },
        '117': { ...energyRules },
        '116': { ...energyRules },
        '115': { ...energyRules },
        '114': { ...energyRules }
    };
    window.DEPARTMENT_GRADUATION_RULES['能源學程'] = window.DEPARTMENT_GRADUATION_RULES['能源工程國際學士學位學程'];
    window.DEPARTMENT_GRADUATION_RULES['能源國際學士學位學程'] = window.DEPARTMENT_GRADUATION_RULES['能源工程國際學士學位學程'];
    window.DEPARTMENT_GRADUATION_RULES['能源國際'] = window.DEPARTMENT_GRADUATION_RULES['能源工程國際學士學位學程'];
})();