// ============================================================
// 🎓 工學院 — 研究所畢業規則
// ============================================================

(function () {
    const C = '工學院';
    const UNDATED = '（未標明適用入學年度）';

    // 航太系（含民航所、太空所、能源學程）共用：34 學分＝專業選修 24＋專題討論(一)～(四) 各 1 學分＋論文 6
    const AERO_SEMINAR_NOTE = '專題討論為在學每學期必修，第 1～4 學期專題討論(一)～(四) 各 1 學分，第 5 學期起 0 學分；碩一下申請口試者至少修滿專題討論 2 學分，其餘以專業選修補足。';
    const AERO_COMMON_NOTES = [
        '研究生選修大學部課程不列入畢業學分。',
        '大學時所修研究所課程成績 70 分以上始得抵免，抵免學分不得超過專業選修學分數之 3/4；修習超過 20 年者不得抵免。'
    ];

    // 土木系碩、博士班畢業學分認定實施要點（111、113、115 三個版本學分相同，差在核心課程與博士班專題討論）
    const CIVIL_MASTER_NOTES = [
        '應含本系碩、博士班課程至少 15 學分；他系所碩博士班課程經指導教授同意至多認定 9 學分；語文課程不計。',
        '應至少在本系修畢所屬學術分組或指導教授所屬學術分組兩門核心課程。',
        '大學部期間選修之碩博士班課程（70 分以上、未計入大學畢業學分）得抵免，以 6 學分為限。',
        '103 學年度起入學、非本科系畢業者，須修畢本系大學部專業必修至少 15 學分（不列入畢業學分）。',
        '專題討論須修畢四學期但不計入畢業學分；提前畢業者得僅修畢至該學期。'
    ];
    const civilMaster = (fromYear, coreNote) => ({
        fromYear, label: `${fromYear} 學年度版`,
        source: `國立成功大學土木工程學系碩、博士班畢業學分認定實施要點（${fromYear} 學年度版）`,
        totalCredits: 24, thesisCredits: 6, maxExternal: 9, maxWaived: 6, minOwnCredits: 15,
        seminar: { mode: 'fixed', count: 4 },
        notes: [...CIVIL_MASTER_NOTES, coreNote],
        uncertain: []
    });

    // 材料系碩士班（含綠色應用材料碩士班）
    const MSE_NOTES = [
        '普物、普化各需修滿 6 學分，未符合者須至大學部補修（不算在畢業學分）。',
        '碩士論文內容需投稿期刊或學術研討會，申請畢業之研究生須在學生排名第一位。',
        '畢業學分除論文外，修習本系開授之科目至少 19 學分。'
    ];

    window.registerMasterPrograms([
        {
            id: '機械工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['機械所', '機械碩', 'ME', 'N1'], catalogDepts: ['機械所'],
            versions: [{
                fromYear: 0, label: `111.06.14 修正版${UNDATED}`,
                source: '國立成功大學機械工程學系碩士班修課辦法（111.06.14 系務會議修正通過）',
                totalCredits: 24, thesisCredits: 6, minOwnCredits: 12,
                seminar: { mode: 'fixed', count: 2 },
                notes: [
                    '應修滿本系規定之選修 24 學分（不含論文及專題討論，不含在職專班課程）。',
                    '各組學生應修滿該組指定之課程；選修本系開授選修課程至少 12 學分（不含外校外系抵免學分課程）。',
                    '非碩士班期間所修研究所課程，經指導教授同意、課委會審查通過，最多得抵免二門課之學分數。',
                    '專題討論須修滿二學期；提早畢業者僅需修足在學之學期數。',
                    '欲選修外系所博碩士班課程（本系具相同課程）需以當學期本系未開授為原則。'
                ],
                uncertain: ['規定為「抵免最多二門課」，無法換算為學分，系統未設抵免上限。', '辦法未規定外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '化學工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['化工所', '化工碩', 'ChE', 'N3'], catalogDepts: ['化工所'],
            versions: [{
                fromYear: 0, label: `2025.08.12 選課規定${UNDATED}`,
                source: '化學工程學系選課規定（含碩博班，2025.08.12）',
                totalCredits: 24, thesisCredits: 6, maxExternal: 12,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '修習所有課程皆須指導教授簽名同意，每學期須繳交各階段選課確認表。',
                    '大學部開授課程不承認為畢業學分（乙組生另依碩士班畢業資格規定）；在職專班課程及合開課程不承認。',
                    '語文相關課程至多採計一門；選修外系課程至多 12 學分。',
                    '每學期至少須修習一門課程（含專題討論）；研究生通識納入「專題討論」實施。'
                ],
                uncertain: ['收錄的選課規定未寫碩士班畢業學分數、論文學分與專題討論學期數，系統暫以 24 學分＋論文 6 學分、專題討論 4 學期計算，請以系上畢業資格規定為準。']
            }]
        },
        {
            id: '化學工程學系博士班', college: C, degree: '博士班',
            aliases: ['化工所博', '化工博'], catalogDepts: ['化工所'],
            versions: [{
                fromYear: 0, label: `2025.08.12 選課規定${UNDATED}`,
                source: '化學工程學系選課規定（含碩博班，2025.08.12）',
                totalCredits: 18, thesisCredits: 12,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['大學部開授課程、在職專班課程不承認為畢業學分；語文相關課程至多採計一門。'],
                uncertain: ['收錄的選課規定未寫博士班畢業學分數、外所上限與專題討論學期數，系統暫以 18 學分＋論文 12 學分、專題討論 4 學期計算，請以系上畢業資格規定為準。']
            }]
        },
        {
            id: '土木工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['土木所', '土木碩', 'CE', 'N6'], catalogDepts: ['土木所'],
            versions: [
                civilMaster(115, '115 學年度版核心課程分組同 113 版（戊組：安全與維護管理、作業研究、工程資訊管理）。'),
                civilMaster(113, '113 學年度版新成立「工程資訊組」，戊、己組核心課程調整。'),
                civilMaster(111, '111 學年度版戊組核心課程：工程成本與財務、工程時程控制、作業研究、工程資訊管理。')
            ]
        },
        {
            id: '土木工程學系碩士在職專班', college: C, degree: '碩士在職專班',
            aliases: ['土木在職', '土木碩專'], catalogDepts: ['土木所'],
            versions: [{
                fromYear: 0, label: `111.03.07 修正版${UNDATED}`,
                source: '國立成功大學土木工程學系碩士在職進修專班實施辦法（111.03.07 系務會議修正通過）',
                totalCredits: 24, thesisCredits: 6, maxWaived: 9, minOwnCredits: 15,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '應含本系碩士專班課程至少 15 學分；語文課程不計。',
                    '以學分班、選讀生方式選修之研究所課程（70 分以上）得併入畢業學分，以 12 學分為限。',
                    '退學或肄業碩士生在學期間所選修課程得抵免，以 9 學分為限。',
                    '專題討論須修讀四學期且成績均達 70 分，但不計入畢業學分。'
                ],
                uncertain: ['辦法未規定外系所選修上限，系統不設上限。']
            }]
        },
        {
            id: '土木工程學系博士班', college: C, degree: '博士班',
            aliases: ['土木所博', '土木博'], catalogDepts: ['土木所'],
            versions: [
                {
                    fromYear: 115, label: '115 學年度版',
                    source: '國立成功大學土木工程學系碩、博士班畢業學分認定實施要點（115 學年度版）',
                    totalCredits: 18, thesisCredits: 12, maxExternal: 9, minOwnCredits: 9,
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['應含本系博士班課程至少 9 學分；他系所博士班課程至多認定 9 學分。', '115 學年度版刪除博士班必修專題討論規定。', '除另有規定外，博士班不接受抵免學分之申請。'],
                    uncertain: ['「本系博士班課程至少 9 學分」系統以本所選修學分判斷，未區分碩士班或博士班課程。']
                },
                {
                    fromYear: 111, label: '111～114 學年度版',
                    source: '國立成功大學土木工程學系碩、博士班畢業學分認定實施要點（111、113 學年度版）',
                    totalCredits: 18, thesisCredits: 12, maxExternal: 9, minOwnCredits: 9,
                    seminar: { mode: 'fixed', count: 4 },
                    notes: ['應含本系博士班課程至少 9 學分；他系所博士班課程至多認定 9 學分。', '專題討論須修畢四學期但不計入畢業學分；演講場次及成績由指導教授決定。'],
                    uncertain: ['「本系博士班課程至少 9 學分」系統以本所選修學分判斷，未區分碩士班或博士班課程。']
                }
            ]
        },
        {
            id: '水利及海洋工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['水利所', '水利碩', 'HOE', 'N8'], catalogDepts: ['水利所'],
            versions: [{
                fromYear: 0, label: `106.8.21 版${UNDATED}`,
                source: '國立成功大學水利及海洋工程學系碩士班有關規定（106.8.21 M-R01）',
                totalCredits: 28, thesisCredits: 6, maxExternal: 9, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '28 學分：專題討論(一)～(四) 各 1 學分、必修 6 學分、選修 18 學分；論文 6 學分另計。',
                    '選修其他系所課程須經指導教授同意，在畢業學分中至多承認 1/3。',
                    '修讀本系碩士在職專班專業課程至多承認 6 學分，且視為外系選修；專題討論不得互選。',
                    '語言類課程一律不承認為畢業學分；每學期至少應選修一門課程。'
                ],
                uncertain: ['規定為「外系至多承認 1/3」，系統以 9 學分（28 × 1/3 取整）計算。']
            }]
        },
        {
            id: '水利及海洋工程學系碩士在職專班', college: C, degree: '碩士在職專班',
            aliases: ['水利在職', '水利碩專'], catalogDepts: ['水利所'],
            versions: [{
                fromYear: 0, label: `106.8.21 版${UNDATED}`,
                source: '國立成功大學水利及海洋工程學系碩士班有關規定（106.8.21 M-R01）',
                totalCredits: 32, thesisCredits: 6, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['32 學分：專題討論(一)～(四) 各 1 學分、必修 6 學分、選修 22 學分；論文 6 學分另計。', '修業期限得再延長一年。'],
                uncertain: ['規定未寫在職專班外系選修上限，系統不設上限。']
            }]
        },
        {
            id: '水利及海洋工程學系博士班', college: C, degree: '博士班',
            aliases: ['水利所博', '水利博'], catalogDepts: ['水利所'],
            versions: [{
                fromYear: 99, label: '99 學年度起入學',
                source: '國立成功大學水利及海洋工程學系博士班有關規定（106.8.21 P-R01，99 學年入學生起適用）',
                totalCredits: 30, thesisCredits: 12, maxExternal: 15, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '30 學分：專題討論(一)～(四) 各 1 學分、選修 26 學分；論文 12 學分另計。',
                    '逕行修讀博士學位者 44 學分（專題討論 6、選修 38）。',
                    '選修其他系所課程至多承認 1/2；修讀碩士在職專班課程、語言類課程不採計。'
                ],
                uncertain: ['規定為「外系至多承認 1/2」，系統以 15 學分（30 × 1/2）計算。', '逕讀博士生門檻不同，系統只依一般博士生計算。']
            }]
        },
        {
            id: '自然災害減災及管理國際碩士學位學程', college: C, degree: '碩士班',
            aliases: ['自災所', '自災碩士學程', '自災學程', 'NDMR', 'NC'], catalogDepts: ['自災碩士學程'],
            versions: [
                {
                    fromYear: 106, label: '106 學年度起入學',
                    source: '自然災害減災及管理國際碩士學位學程碩士班修業相關規定',
                    totalCredits: 28, thesisCredits: 6, maxExternal: 9, seminarCreditsCount: true,
                    requiredCourses: ['防災概論'],
                    seminar: { mode: 'fixed', count: 4 },
                    notes: ['28 學分：專題討論(一)～(四) 各 1 學分＋防災概論 3 學分（必修 7）、選修 21 學分；論文 6 學分另計。', '修習外系選修課程上限 9 學分。']
                },
                {
                    fromYear: 0, label: '105 學年度前入學',
                    source: '自然災害減災及管理國際碩士學位學程碩士班修業相關規定',
                    totalCredits: 28, thesisCredits: 6, maxExternal: 9, seminarCreditsCount: true,
                    seminar: { mode: 'fixed', count: 4 },
                    notes: ['28 學分：專題討論(一)～(四) 各 1 學分、選修 24 學分；論文 6 學分另計。', '修習外系選修課程上限 9 學分。']
                }
            ]
        },
        {
            id: '工程科學系碩士班', college: C, degree: '碩士班',
            aliases: ['工科所', '工科碩', 'ES', 'N9'], catalogDepts: ['工科所'],
            versions: [
                {
                    fromYear: 112, label: '112 學年度版（111.12.29 系務會議通過）',
                    source: '國立成功大學工程科學系碩士班學生修業規定（111.12.29 系務會議通過）',
                    totalCredits: 24, thesisCredits: 6, minOwnCredits: 15,
                    seminar: { mode: 'fixed', count: 4 },
                    notes: [
                        '至少 24 學分（不含論文；語文、寫作及專利類課程不予承認）及必修專題討論(一)～(四)。',
                        '核心課程依各組訂定，成績須達 70 分以上；須在本系修滿至少 15 學分（外籍生不受限）。',
                        '外校修課以台、清、交、政、師大及中央、中興、中正、中山等校課程為原則。',
                        '提前畢業者各科成績均須達 80 分以上，且經該組及指導教授同意。'
                    ],
                    uncertain: ['規定未寫外所選修上限，系統不設上限。']
                },
                {
                    fromYear: 105, label: '105～111 學年度入學',
                    source: '國立成功大學工程科學系碩士班學生修課規定（105.11.30 系務會議通過，105 學年度新生起實施）',
                    totalCredits: 24, thesisCredits: 6, minOwnCredits: 15,
                    seminar: { mode: 'fixed', count: 4 },
                    notes: ['至少 24 學分（不含論文；語文、寫作及專利類課程不予承認）及必修專題討論(一)～(四)。', '核心課程依各組訂定，成績須達 70 分以上；須在本系修滿至少 15 學分。'],
                    uncertain: ['此版規定自 105 學年度起實施，系統套用於 105～111 學年度入學者。']
                }
            ]
        },
        {
            id: '工程科學系碩士在職專班', college: C, degree: '碩士在職專班',
            aliases: ['工科在職', '工科碩專'], catalogDepts: ['工科所'],
            versions: [{
                fromYear: 110, label: '110 學年度起入學',
                source: '工程科學系碩士學程在職進修專班修業規定（110 學年度入學新生起適用）',
                totalCredits: 30, thesisCredits: 6,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['修畢本專班規定之 30 學分（不含論文）及完成畢業論文。', '分甲（資訊網路）、乙（半導體製程與構裝系統）、丙（智慧科技及資訊安全）組，各組必選課程見課程規劃。', '專題討論(一)～(四) 0 學分必修；修業年限以三年為原則。'],
                uncertain: ['規定未寫外所選修與抵免上限，系統不設上限。']
            }]
        },
        {
            id: '工程科學系博士班', college: C, degree: '博士班',
            aliases: ['工科所博', '工科博'], catalogDepts: ['工科所'],
            versions: [{
                fromYear: 0, label: `111.12.29 修訂版${UNDATED}`,
                source: '國立成功大學工程科學系博士班學位修業辦法（111.12.29 系務會議修訂通過）',
                totalCredits: 18, thesisCredits: 0,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['須修滿 18 學分（不含論文；語文、寫作及專利類課程不予承認）及必修專題討論(一)～(四)。', '核心課程依各組訂定，成績須達 70 分以上；碩士班修過且達 70 分者可免再修。'],
                uncertain: ['辦法未寫博士論文學分，系統以 0 學分計算。', '辦法未規定外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '材料科學及工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['材料所', '材料碩', 'MSE', 'N5'], catalogDepts: ['材料所'],
            versions: [
                {
                    fromYear: 103, label: '103 學年度（含）以後入學',
                    source: '材料系碩士班畢業規定',
                    totalCredits: 28, thesisCredits: 6, minOwnCredits: 19, seminarCreditsCount: true,
                    requiredCourses: ['固態熱力學', '高等材料分析', '材料動力學'],
                    seminar: { mode: 'fixed', count: 4 },
                    notes: ['畢業 34 學分：必修 13（專題討論(一)～(四) 各 1、固態熱力學、高等材料分析、材料動力學）、選修 15、論文 6。', ...MSE_NOTES],
                    uncertain: ['規定未寫外系選修上限與抵免上限，系統不設上限。']
                },
                {
                    fromYear: 101, label: '101～102 學年度入學',
                    source: '材料系碩士班畢業規定',
                    totalCredits: 31, thesisCredits: 6, minOwnCredits: 19, seminarCreditsCount: true,
                    requiredCourses: ['固態熱力學', '高等材料分析', '材料動力學'],
                    seminar: { mode: 'fixed', count: 4 },
                    notes: ['畢業 37 學分：必修 13、選修 18、論文 6。', ...MSE_NOTES]
                }
            ]
        },
        {
            id: '材料科學及工程學系綠色應用材料碩士班', college: C, degree: '碩士班',
            aliases: ['綠材所', '綠色應用材料', '綠材碩'], catalogDepts: ['材料所'],
            versions: [
                {
                    fromYear: 112, label: '112 學年度（含）以後入學',
                    source: '國立成功大學材料科學及工程學系綠色應用材料碩士班畢業規定',
                    totalCredits: 28, thesisCredits: 6, minOwnCredits: 19, seminarCreditsCount: true,
                    seminar: { mode: 'fixed', count: 4 },
                    notes: [
                        '畢業 34 學分：必修 7（專題討論(一)～(四) 各 1＋固態熱力學、高等材料分析、材料動力學三選一）、選修 21、論文 6。',
                        '選修須從「固態離子元件」「永續綠色材料導論」「電化學」等核心課程中擇二。',
                        ...MSE_NOTES
                    ],
                    uncertain: ['112 版核心課程寫「五門中擇二」，但規定只列出三門，請以系上公告為準。']
                },
                {
                    fromYear: 109, label: '109～111 學年度入學',
                    source: '國立成功大學材料科學及工程學系綠色應用材料碩士班畢業規定',
                    totalCredits: 28, thesisCredits: 6, minOwnCredits: 19, seminarCreditsCount: true,
                    seminar: { mode: 'fixed', count: 4 },
                    notes: [
                        '畢業 34 學分：必修 7（專題討論(一)～(四) 各 1＋固態熱力學、高等材料分析、材料動力學三選一）、選修 21、論文 6。',
                        '選修須從「固態離子元件」「耐蝕材料」「永續綠色材料導論」「能源材料」四門中擇二作為核心課程（亦可適用 112 新版）。',
                        ...MSE_NOTES
                    ],
                    uncertain: []
                }
            ]
        },
        {
            id: '材料科學及工程學系博士班', college: C, degree: '博士班',
            aliases: ['材料所博', '材料博'], catalogDepts: ['材料所'],
            versions: [{
                fromYear: 105, label: '105 學年度（含）以後入學（甲組／乙組）',
                source: '材料系博士班畢業規定（含材料科學及工程組、奈米科技組）',
                totalCredits: 25, thesisCredits: 12, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '畢業學分 25：專題討論(一)～(四) 各 1、選修 21；論文 12 學分另計。',
                    '入學後三年內修習固態熱力學、高等材料分析、材料動力學三科核心課程，成績皆達全班前 70% 可抵免資格考（乙組為三選一再加兩門相關課程）。',
                    '英文能力畢業門檻（GEPT 中級、TOEFL iBT 60、IELTS 5.0、TOEIC 700 擇一）。',
                    '須於本系認可之期刊發表與博士論文相關之著作至少兩篇。',
                    '直升博班：103 學年度以後入學 46 學分（必修 4、選修 30、論文 12）。'
                ],
                uncertain: ['規定另列「115 學年度（含）以後入學 論文 12 學分（115.5.11 系務會議）」，未見其他改動，115 學年度起沿用同一門檻。', '直升博班門檻不同，系統只依一般博士生計算。']
            }]
        },
        {
            id: '資源工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['資源所', '資源碩', 'N4'], catalogDepts: ['資源所'],
            versions: [{
                fromYear: 114, label: '114 學年度起新生適用（115 年 9 月新生刊）',
                source: '國立成功大學資源工程學系碩、博士班新生入學須知（114 學年度起新生適用）',
                totalCredits: 24, thesisCredits: 6, maxWaived: 12, minOwnCredits: 15,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '至少 24 學分及論文 6 學分，其中修習本所開授之科目至少 15 學分；指導教授得視需要增加學分。',
                    '非本系畢業者須另補修大學部專門學科至少 6 學分（同等學歷 12 學分），不計入畢業學分。',
                    '專題討論四學期並及格，但不計入畢業學分。',
                    '抵免學分以 12 學分為原則，限本所開授課程，需於入學後第一學期內申請。'
                ],
                uncertain: ['須知未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '資源工程學系博士班', college: C, degree: '博士班',
            aliases: ['資源所博', '資源博'], catalogDepts: ['資源所'],
            versions: [{
                fromYear: 114, label: '114 學年度起新生適用（115 年 9 月新生刊）',
                source: '國立成功大學資源工程學系碩、博士班新生入學須知（114 學年度起新生適用）',
                totalCredits: 18, thesisCredits: 6,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['至少 18 學分及論文 6 學分；逕攻博士 42 學分及論文 6 學分。', '非本系畢業者另補修「資源工程」研究所課程 2 學分。', '至少需在本所全職就讀兩年；已達畢業學分者可申請加註「撰寫論文」免修專題討論。'],
                uncertain: ['須知寫博士論文「6 學分」（一般博士論文多為 12 學分），系統依須知以 6 學分計算。', '逕攻博士生門檻不同，系統只依一般博士生計算。']
            }]
        },
        {
            id: '環境工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['環工所', '環工碩', 'EnvE', 'P5'], catalogDepts: ['環工所'],
            versions: [{
                fromYear: 114, label: '114 學年度研究生手冊',
                source: '環境工程學系研究生手冊（114 學年度）',
                totalCredits: 24, thesisCredits: 6,
                seminar: { mode: 'fixed', count: 2 },
                notes: [
                    '專業選修至少 24 學分；本系四科核心課程（環工數學原理、環工物理原理、環工化學原理、環工生物原理）中選課二科以上。',
                    '專題討論每學期必選修（至少 2 學期必修），不計入畢業學分。',
                    '外校（系）考入未修過基礎課程者須補修；本地生補修 7／6／5 門及格者可分別計入畢業選修 9／6／3 學分。'
                ],
                uncertain: ['手冊同時寫「專題討論至少 2 學期必修」與「專題討論 4 學期不包括在畢業學分內」，系統以 2 學期計算。', '手冊未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '環境工程學系博士班', college: C, degree: '博士班',
            aliases: ['環工所博', '環工博'], catalogDepts: ['環工所'],
            versions: [{
                fromYear: 114, label: '114 學年度研究生手冊',
                source: '環境工程學系研究生手冊（114 學年度）',
                totalCredits: 24, thesisCredits: 12,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['專業選修至少 24 學分；本系四科核心課程中選課二科以上。', '專題討論每學期必選修（至少 4 學期必修），不計入畢業學分。', '須通過博士班資格考試。'],
                uncertain: []
            }]
        },
        {
            id: '航空太空工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['航太所', '航太碩', 'AA', 'P4'], catalogDepts: ['航太所'],
            versions: [{
                fromYear: 0, label: `109.09.03 修訂版${UNDATED}`,
                source: '國立成功大學航空太空工程學系碩士班修習學分規定（109.09.03 系務會議修訂通過）',
                totalCredits: 28, thesisCredits: 6, minOwnCredits: 12, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業 34 學分：專業選修至少 24（須含本系各組核心課程 3 門）＋專題討論 4＋論文 6。', AERO_SEMINAR_NOTE, '至少需修讀本系研究所課程 4 門 12 學分。', ...AERO_COMMON_NOTES],
                uncertain: ['規定未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '航空太空工程學系碩士在職專班', college: C, degree: '碩士在職專班',
            aliases: ['航太在職', '航太碩專'], catalogDepts: ['航太所'],
            versions: [{
                fromYear: 0, label: `103.10.17 修訂版${UNDATED}`,
                source: '國立成功大學航空太空工程學系碩士在職專班修習學分規定（103.10.17 系務會議修訂通過）',
                totalCredits: 28, thesisCredits: 6, minOwnCredits: 18, seminarCreditsCount: true,
                requiredCourses: ['工程分析'],
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業 34 學分：專業選修至少 24（須含核心課程「工程分析」）＋專題討論 4＋論文 6。', AERO_SEMINAR_NOTE, '至少需修讀本系研究所課程 6 門 18 學分；修業期限一至五年。', '研究生選修大學部課程不列入畢業學分。'],
                uncertain: ['規定未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '航空太空工程學系博士班', college: C, degree: '博士班',
            aliases: ['航太所博', '航太博'], catalogDepts: ['航太所'],
            versions: [{
                fromYear: 0, label: `103.10.17 修訂版${UNDATED}`,
                source: '國立成功大學航空太空工程學系博士班修習學分規定（103.10.17 系務會議修訂通過）',
                totalCredits: 22, thesisCredits: 12, maxWaived: 12, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業 34 學分以上：專業選修至少 18＋專題討論(一)～(四) 4＋論文 12。', '抵修學分不得超過專業選修學分數之 2/3（12 學分）。', '逕修博士 58 學分（專業選修 42）。', '申請口試須 P＋Y ≥ 6 且 P ≥ 1（P 為 SCI 期刊論文篇數、Y 為修業年數）。'],
                uncertain: ['逕修博士生門檻不同，系統只依一般博士生計算。']
            }]
        },
        {
            id: '民航研究所碩士班', college: C, degree: '碩士班',
            aliases: ['民航所', '民航碩', 'IOCA', 'Q4'], catalogDepts: ['民航所'],
            versions: [{
                fromYear: 0, label: `103.10.17 修訂版${UNDATED}`,
                source: '國立成功大學民航所碩士班修習學分規定（103.10.17 系務會議修訂通過）',
                totalCredits: 28, thesisCredits: 6, minOwnCredits: 12, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業 34 學分：專業選修至少 24（須含核心課程 3 門）＋專題討論 4＋論文 6。', AERO_SEMINAR_NOTE, '至少需修讀本系研究所課程 4 門 12 學分。', '核心課程：民航實務（暑假實習）、飛航安全管理，及民航系統、多變量分析理論與應用等三門中任選二門。', ...AERO_COMMON_NOTES],
                uncertain: ['收錄的規定中核心課程清單不完整（「三門中任選二門」的第三門未列出），請以所上公告為準。', '規定未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '太空系統工程研究所碩士班', college: C, degree: '碩士班',
            aliases: ['太空所', '太空系統', '太空碩', 'ISSE', 'Q8'], catalogDepts: ['太空所'],
            versions: [{
                fromYear: 0, label: `112.6.16 修訂版${UNDATED}`,
                source: '國立成功大學太空系統工程研究所修習學分規定（112.6.16 系務會議修訂通過）',
                totalCredits: 28, thesisCredits: 6, minOwnCredits: 12, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '畢業 34 學分：本所必修至少 12＋專業選修至少 12（共 24）＋專題討論 4＋論文 6。',
                    AERO_SEMINAR_NOTE,
                    '必修課程分兩領域：系統工程（系統工程、複雜系統專案管理）、太空工程（太空任務與系統設計、成本效益太空任務操作），至少修 4 門 12 學分。',
                    '大學時所修研究所課程抵免不得超過必修＋專業選修學分之 3/4；重複修讀大學已修本所課程不計學分。'
                ],
                uncertain: ['規定未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '能源工程國際碩士學位學程', college: C, degree: '碩士班',
            aliases: ['能源學程', '能源碩', '能源碩博學程', 'IMPE', 'F0', 'P0'], catalogDepts: ['能源學程', '能源碩博學程'],
            versions: [{
                fromYear: 0, label: `106.01.13 修訂版${UNDATED}`,
                source: '國立成功大學能源工程國際碩士學位學程修習學分規定（106.01.13 系務會議修訂通過）',
                totalCredits: 28, thesisCredits: 6, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業 34 學分：專業選修至少 24＋專題討論 4＋論文 6。', AERO_SEMINAR_NOTE, ...AERO_COMMON_NOTES],
                uncertain: ['規定未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '能源工程國際博士學位學程', college: C, degree: '博士班',
            aliases: ['能源學程博', '能源博'], catalogDepts: ['能源學程', '能源碩博學程'],
            versions: [{
                fromYear: 0, label: `110.7.28 版${UNDATED}`,
                source: '國立成功大學能源工程國際博士學位學程修習學分規定（110.7.28 系務會議通過）',
                totalCredits: 22, thesisCredits: 12, maxWaived: 12, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業 34 學分以上：專業選修至少 18＋專題討論(一)～(四) 4＋論文 12。', '抵修學分不得超過專業選修學分數之 2/3；逕修博士 58 學分（專業選修 42）。'],
                uncertain: ['逕修博士生門檻不同，系統只依一般博士生計算。']
            }]
        },
        {
            id: '海洋科技與事務研究所碩士班', college: C, degree: '碩士班',
            aliases: ['海事所', '海洋科技與事務', '海事碩', 'NA'], catalogDepts: ['海事所'],
            versions: [{
                fromYear: 106, label: '106 學年度起入學',
                source: '海事所碩士班修課須知（106 學年度起入學之新生適用）',
                totalCredits: 31, thesisCredits: 6, maxExternal: 9, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業 31 學分：必修專題討論(一)～(四) 各 1 學分、選修 27 學分；論文 6 學分另計。', '不得選讀他系專題討論抵免；選修其他系所課程至多承認 9 學分。', '每學期至少應選修一門課程。'],
                uncertain: ['本規定標示為「海事所」，系統對應為海洋科技與事務研究所。']
            }]
        },
        {
            id: '海洋科技與事務研究所博士班', college: C, degree: '博士班',
            aliases: ['海事所博', '海事博'], catalogDepts: ['海事所'],
            versions: [{
                fromYear: 0, label: `海事所博士班修課須知${UNDATED}`,
                source: '海事所博士班修課須知',
                totalCredits: 30, thesisCredits: 12, maxExternal: 13, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業 30 學分：必修專題討論(一)～(四) 各 1 學分、選修 26 學分；論文 12 學分另計。', '選修其他系所課程至多承認 13 學分。'],
                uncertain: ['本規定標示為「海事所」，系統對應為海洋科技與事務研究所。']
            }]
        },
        {
            id: '系統及船舶機電工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['系統所', '系統碩', '系統船舶', 'SNME', 'P1'], catalogDepts: ['系統所'],
            versions: [{
                fromYear: 0, label: `2025.08.28 公告${UNDATED}`,
                source: '系統及船舶機電工程學系網站「碩士班課程及修業規定」（2025.08.28）',
                totalCredits: 27, thesisCredits: 6, maxExternal: 9,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['除專題討論外，須選修九門課（27 學分）；論文 6 學分另計。', '在學期間每學期皆應選修專題討論；修業二年後已達畢業學分者得免修並加註撰寫論文。', '外系選修相關課程至多三門，第三門需填申請表經指導教授同意。', '業界專家參與教學超過 9 週之課程承認為系外選修學分。'],
                uncertain: ['規定為「每學期皆應選修專題討論」，系統以 4 學期計算。', '規定為「外系至多三門」，系統以 9 學分計算。']
            }]
        },
        {
            id: '工程管理碩士在職專班', college: C, degree: '碩士在職專班',
            aliases: ['工程管理碩專', '工管在職', 'N0'], catalogDepts: ['工程管理碩專'],
            versions: [
                {
                    fromYear: 111, label: '111 學年度以後入學',
                    source: '工程管理碩士在職專班網站「修課規定」',
                    totalCredits: 31, thesisCredits: 6, maxExternal: 6,
                    requiredCourses: ['工程管理專題研討(一)', '工程管理專題研討(二)', '工程管理專題研討(三)', '工程管理專題研討(四)'],
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['必修：工程管理專題研討(一)～(四) 共 4 學分；核心及專業課程 27 學分，其中核心課程至少 12 學分。', '每學期至少需修習一科；經指導教授同意可修讀最多兩門其他研究所課程（限正規學期）。', '本專班必修及核心課程不開放選修外系相同課程。'],
                    uncertain: ['規定為「外系最多兩門」，系統以 6 學分計算。']
                },
                {
                    fromYear: 108, label: '108～110 學年度入學',
                    source: '工程管理碩士在職專班網站「修課規定」',
                    totalCredits: 31, thesisCredits: 6, maxExternal: 6,
                    requiredCourses: ['工程管理專題研討(一)', '工程管理專題研討(二)', '工程管理專題研討(三)', '工程管理專題研討(四)'],
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['必修：工程管理專題研討(一)～(四) 共 4 學分；核心及專業課程 27 學分，其中核心課程至少 6 學分。'],
                    uncertain: ['規定為「外系最多兩門」，系統以 6 學分計算。']
                },
                {
                    fromYear: 103, label: '103～107 學年度入學',
                    source: '工程管理碩士在職專班網站「修課規定」',
                    totalCredits: 31, thesisCredits: 6, maxExternal: 6,
                    requiredCourses: ['工程管理專題研討(一)', '工程管理專題研討(二)', '工程管理專題研討(三)', '工程管理專題研討(四)'],
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['必修：工程管理專題研討(一)～(四) 共 4 學分；核心及專業課程 27 學分，其中核心課程至少 15 學分。'],
                    uncertain: ['規定為「外系最多兩門」，系統以 6 學分計算。']
                },
                {
                    fromYear: 0, label: '102 學年度以前入學',
                    source: '工程管理碩士在職專班網站「修課規定」',
                    totalCredits: 34, thesisCredits: 6, maxExternal: 6,
                    requiredCourses: ['工程管理專題研討(一)', '工程管理專題研討(二)', '工程管理專題研討(三)', '工程管理專題研討(四)'],
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['必修：工程管理專題研討(一)～(四) 共 4 學分；核心及專業課程 30 學分，其中核心課程至少 15 學分。'],
                    uncertain: ['規定為「外系最多兩門」，系統以 6 學分計算。']
                }
            ]
        },
        {
            id: '生物醫學工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['醫工所', '醫工碩', 'BME', 'P8'], catalogDepts: ['醫工所'],
            versions: [{
                fromYear: 112, label: '112 學年起適用',
                source: '成功大學生物醫學工程學系碩士班修業辦法（112 學年起適用）',
                totalCredits: 30, thesisCredits: 6, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '至少應修滿 30 學分（含四學期專題討論），論文學分另計。',
                    '甲乙組必選：醫學工程概論、生理學、解剖學各 3 學分以上；丙組必選：醫學工程概論、醫用數學(一)(二) 各 3 學分以上；大學部已修畢者得免。',
                    '研究生通識規劃於專題討論(二)(三) 課程中。',
                    '選修他系課程須填「學分承認申請書」經指導教授同意。'
                ],
                uncertain: ['辦法未寫論文學分，系統以 6 學分計算。', '辦法未寫外系選修上限，系統不設上限。']
            }]
        }
    ]);
})();
