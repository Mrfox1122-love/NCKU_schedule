// ============================================================
// 🎓 管理學院 — 研究所畢業規則
// ============================================================

(function () {
    const C = '管理學院';

    // 工業與資訊管理學系、資訊管理研究所：30 學分＝核心 12＋選修 12＋專題討論(一)(二) 各 1、(三)(四) 各 2
    const iimVersion = (dept, fromYear, label) => ({
        fromYear, label,
        source: `${dept}碩士班相關規定（${fromYear} 學年度入學新生起實施）`,
        totalCredits: 30, thesisCredits: 6, maxExternal: 9, seminarCreditsCount: true,
        seminar: { mode: 'fixed', count: 4 },
        notes: [
            '畢業學分 30：核心課程 12、選修 12、專題討論 4 學期（(一)(二) 各 1 學分、(三)(四) 各 2 學分）；另有先修科目。',
            '須修習一門全英語教學課程（含於 30 學分內）或通過英文檢定（GEPT 中高級初試、iBT 69、IELTS 5.0、TOEIC 700 擇一）。',
            '外系所課程每學期最多承認 6 學分、修業期間至多 9 學分；專題討論及核心課程不得在外系所修習。'
        ],
        uncertain: ['規定未寫論文學分，系統以 6 學分計算。']
    });

    // 交通管理科學系碩士班研究生手冊（114、115 學年度內容相同）
    const tlmVersion = year => ({
        fromYear: year, label: `${year} 學年度碩士班研究生手冊`,
        source: `成功大學交通管理科學系碩士班研究生手冊（中華民國 ${year} 年 9 月）`,
        totalCredits: 34, thesisCredits: 6, maxExternal: 3, maxWaived: 6, seminarCreditsCount: true,
        seminar: { mode: 'fixed', count: 4 },
        notes: [
            '除專題討論 4 學分（每學期必修 1 學分）外，尚須選修 10 門課（30 學分）；論文 6 學分。',
            '分旅客運輸、物流管理、運輸科技、電信管理四領域，必修所屬領域核心課程至少 1 門（3 學分）。',
            '外所課程（須經指導教授同意）至多承認 1 門；境外交換至多抵免 6 學分及 1 個專題討論。',
            '大學部未修過「運輸學」相關課程者須補修；同等學歷須補修大學部 2 門課程。',
            '每學期修課不得超過 5 門（專題討論除外）；須參加研討會二次或發表論文一次。',
            '105 學年度起入學者須通過英檢（GEPT 中高級初試、iBT 69、IELTS 5.0、TOEIC 630 擇一）。'
        ],
        uncertain: ['規定為「外所至多 1 門」，系統以 3 學分計算。']
    });

    // 電信管理研究所碩士班研究生手冊
    const telecomVersion = (year, core, elective, own) => ({
        fromYear: year, label: `${year} 學年度碩士班研究生手冊`,
        source: `成功大學電信管理研究所碩士班研究生手冊（${year} 學年度）`,
        totalCredits: 37, thesisCredits: 6, maxExternal: 3, seminarCreditsCount: true,
        seminar: { mode: 'fixed', count: 4 },
        notes: [
            `畢業學分 33（不含專題討論 4 學分，每學期必修 1 學分）＋論文 6：核心必選 ${core} 學分、專業選修 ${elective} 學分。`,
            `專業選修中至少 ${own} 學分須為本所開授課程、方法論課程至少 1 門（3 學分）、外所課程至多 1 門（3 學分）。`,
            '大學未修過經濟學、會計學、統計學者，需補修相關課程二科以上（大學部不計、研究所計入畢業學分）。'
        ],
        uncertain: ['系統把專題討論 4 學分併入畢業學分，以 37 學分檢查。', '「專業選修中本所開授至少若干學分」系統未自動檢查。']
    });

    // 會計／財金所課表：最低畢業學分 39 學分（必修 18＋選修 21）
    const accountingNotes = [
        '專題研討每學期都要修課，至少四次（0 學分）。',
        '若欲選修管院以外課程，應與指導教授討論並經所長同意。',
        '先修課程未修者需至大學部補修（不計入畢業學分）。'
    ];

    window.registerMasterPrograms([
        {
            id: '會計學系碩士班（甲組：會計組）', college: C, degree: '碩士班',
            aliases: ['會計所', '會計所甲組', '會計碩', 'ACC', 'R1'], catalogDepts: ['會計所'],
            versions: [{
                fromYear: 110, label: '110 學年度起入學（甲組課表）',
                source: '會計所（甲組：會計組）碩士班課表',
                totalCredits: 39, thesisCredits: 0,
                requiredCourses: ['高級財務會計學', '高級管理會計學', '高級審計學', '財務報告分析與研究', '計量經濟學', '金融科技創新與應用'],
                seminar: { mode: 'fixed', count: 4 },
                notes: ['最低畢業學分 39：必修 18、選修 21。先修：財務管理（或基本財務學）、企業資源規劃與資料探勘。', ...accountingNotes],
                uncertain: ['課表未寫論文學分，也未說明 39 學分是否含論文，系統以課程 39 學分、論文 0 學分計算。']
            }]
        },
        {
            id: '會計學系碩士班（乙組：資訊組）', college: C, degree: '碩士班',
            aliases: ['會計所乙組', '會計資訊組'], catalogDepts: ['會計所'],
            versions: [{
                fromYear: 110, label: '110～113 學年度入學（乙組課表；114 學年度起不再招收乙組）',
                source: '110 學年度入學會計所（乙組：資訊組）碩士班課表',
                totalCredits: 33, thesisCredits: 0,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['最低畢業學分 33：必修 12、選修 21；必修含高等資料探勘、資料探勘與大數據、電腦審計與安全等組合。', '乙組只招收到 113 學年度入學。', ...accountingNotes],
                uncertain: ['課表未寫論文學分，系統以 0 學分計算。']
            }]
        },
        {
            id: '財務金融研究所碩士班', college: C, degree: '碩士班',
            aliases: ['財金所', '財金碩', 'FIN', 'R8'], catalogDepts: ['財金所'],
            versions: [{
                fromYear: 110, label: '110 學年度入學課表',
                source: '110 學年度入學財金所碩士班課表',
                totalCredits: 39, thesisCredits: 0,
                requiredCourses: ['財務報告分析與研究', '計量經濟學', '總體經濟學', '投資學理論', '國際財務管理', '公司理財'],
                seminar: { mode: 'fixed', count: 4 },
                notes: ['最低畢業學分 39：必修 18、選修 21。', '未修中級會計學之學生需至大學部補修 6 學分。', ...accountingNotes],
                uncertain: ['系統只收錄 110 學年度入學課表，111 學年度以後入學者沿用此版。', '課表未寫論文學分，系統以 0 學分計算。']
            }]
        },
        {
            id: '企業管理學系碩士班', college: C, degree: '碩士班',
            aliases: ['企管所', '企管碩', 'BA', 'R4'], catalogDepts: ['企管所'],
            versions: [115, 112].map(year => ({
                fromYear: year, label: year === 115 ? '115 學年度以後入學' : '112～114 學年度入學',
                source: `國立成功大學企業管理學系碩士班修業規定（適用 ${year} 學年度以後入學）`,
                totalCredits: 45, thesisCredits: 0,
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '必須修滿 45 學分且成績及格，方得申請學位口試。',
                    '六大課群（行銷、財務與經濟、營運與研發、組織與策略、人力資源、資訊與科技）均須修習該課群之基礎課。',
                    '須從本系六門方法課程中擇一修習（限本系開設）。',
                    '入學前未修統計學、會計學、經濟學者須於畢業前補修；大學已修相關企管基礎課程可申請免修（不計入畢業學分）。',
                    '每學期至多修五門課；每學期可至本院其他研究所修一門課；非本系碩士學分班學分承認上限 12 學分。'
                ],
                uncertain: ['規定未說明 45 學分是否含論文，系統以課程 45 學分、論文 0 學分計算。', '規定為「每學期至多一門管院外所課程」，無法換算總上限，系統未設外所上限。']
            }))
        },
        {
            id: '國際企業研究所碩士班', college: C, degree: '碩士班',
            aliases: ['國企所', '國企碩', 'IB', 'R6'], catalogDepts: ['國企所'],
            versions: [{
                fromYear: 0, label: '114.06.19 修訂版（未標明適用入學年度）',
                source: '國立成功大學國際企業研究所碩士班修業規則（114.06.19 所務會議修訂通過）',
                totalCredits: 42, thesisCredits: 0, maxExternal: 9,
                requiredCourses: ['國際企業管理', '國際行銷管理', '國際財務管理', '國際人力資源管理'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '必須修滿 42 學分，修畢規定必選修科目，並通過英語能力要求。',
                    '必修：國際企業管理 3；必選一：國際行銷管理、國際財務管理、國際人力資源管理共 9 學分。',
                    '必選二：行銷管理、財務管理、人力資源管理（大學修過可免修，但不計入畢業學分）。',
                    '必補基礎課程：商用統計、商用經濟、商用會計（不列入畢業學分）。',
                    '在學期間最多可至外所選修 3 門課程；每學期以修 15 學分為上限。'
                ],
                uncertain: ['規則未說明 42 學分是否含論文，系統以課程 42 學分、論文 0 學分計算。', '規定為「外所至多 3 門」，系統以 9 學分計算。']
            }]
        },
        {
            id: '國際經營管理研究所碩士班', college: C, degree: '碩士班',
            aliases: ['國經所', 'IMBA', '國際經營管理', 'RA'], catalogDepts: ['國經所'],
            versions: [
                {
                    fromYear: 111, label: '110-2 學期（含）以後入學',
                    source: '國際經營管理研究所網站「碩士生修課規定」、IMBA 學生手冊',
                    totalCredits: 39, thesisCredits: 6,
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['須修滿 45 學分：課程 39 學分＋論文 6 學分。', '至少修習一門方法論課程；研究方法(一) 需修習超過 12 學分後方可選修；十一門選修課程（33 學分）。', '先修課程不計入 39 學分。'],
                    uncertain: ['新制自「110-2 學期」入學起適用，系統以入學學年 111 起套用；110 學年度第 2 學期入學者請改依新制自行核對。', '規定未寫外所選修上限，系統不設上限。']
                },
                {
                    fromYear: 0, label: '110-1 學期（含）以前入學',
                    source: '國際經營管理研究所網站「碩士生修課規定」、IMBA 學生手冊',
                    totalCredits: 39, thesisCredits: 6,
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['須修滿 45 學分：課程 39 學分＋論文 6 學分。', '至少修習一門方法論課程；核心課程三門（9 學分）；八門選修課程（24 學分）。'],
                    uncertain: []
                }
            ]
        },
        {
            id: '經營管理碩士學位學程（AMBA）', college: C, degree: '碩士在職專班',
            aliases: ['AMBA', 'AMBA碩士學程', '經營管理碩士學程', 'RD'], catalogDepts: ['AMBA碩士學程'],
            versions: [{
                fromYear: 106, label: '106～111 學年度入學（A109～A114 級）',
                source: 'AMBA 課程規劃表（2018-2-1 起適用；2017.12.26 課程委員會修正通過）',
                totalCredits: 39, thesisCredits: 6, maxExternal: 6,
                requiredCourses: ['企業經營專討', '人力資源管理', '行銷管理', '財務管理', '營運管理', '策略管理'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '最低畢業學分 39：共同必修企業經營專討 3、核心能力五科 15、專業必選 9（擇一領域至對應研究所修讀）、選修 12；論文 6 學分另計。',
                    '基礎課程統計方法、管理會計、管理經濟必修但 0 學分（可至大學部、研究所或 EMBA 補修）。',
                    '經指導教授同意可選修其它學院日間部研究所課程，上限 6 學分；不得修習在職專班課程或與在職專班合開之課程。',
                    '已修滿 39 學分但未完成學位考試者，須選修「專題討論（0 學分）」。'
                ],
                uncertain: ['112 學年度以後入學的課程規劃未收錄，系統沿用 106～111 版。', 'AMBA 在系統中歸類於「碩士在職專班」。', '「專業必選 9 學分」須在管院其他所修讀，系統會算成「外所選修」而可能超過 6 學分上限，排入後請改為本所選修。']
            }]
        },
        {
            id: '統計學系碩士班', college: C, degree: '碩士班',
            aliases: ['統資所', '統計所', '統計與資料科學', 'STAT', 'R2'], catalogDepts: ['統資所'],
            versions: [115, 114].map(year => ({
                fromYear: year, label: `${year} 學年度入學（${year + 2} 級）`,
                source: `${year === 115 ? '統計與資料科學學系' : '統計學系'}碩士班課程規劃及畢業規定（${year} 學年度入學）`,
                totalCredits: 34, thesisCredits: 6, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '總畢業學分 34（論文 6 另計）：必修專題討論(一)～(四) 4、必選 15、選修 15。',
                    '必選包含數理統計(一)(二)、統計方法、統計諮詢、多變量分析理論與應用、企業決策方法等。',
                    '英語門檻：修習一門全英文教學課程，或通過 B2 等級英檢（GEPT 中高級複試、iBT 72、IELTS 5.5、TOEIC 聽讀 785＋說寫 310）。'
                ],
                uncertain: ['規定未寫外所選修上限，系統不設上限。', '115 學年度起系名改為「統計與資料科學學系」，系統所別沿用舊名「統計學系碩士班」。']
            }))
        },
        {
            id: '數據科學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['數據所', '數科所', '數據科學', 'IDS', 'RE'], catalogDepts: ['數據所'],
            versions: [115, 114].map(year => ({
                fromYear: year, label: `${year} 學年度入學（${year + 2} 級）`,
                source: `數據科學研究所碩士班課程規劃及畢業規定（${year} 學年度入學）`,
                totalCredits: 34, thesisCredits: 6, maxExternal: 15, seminarCreditsCount: true,
                requiredCourses: ['統計方法', '資料科學', '機器學習'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '總畢業學分 34（論文 6 另計）：必修專題討論(一)～(四) 4、必選 15、選修 15。',
                    '必選含統計方法、資料科學、機器學習、最佳化方法等；建議外所課程至多 5 門。',
                    '英語門檻同統計系（全英文課程一門或 B2 英檢）。'
                ],
                uncertain: ['規定為「建議外所課程至多 5 門」，系統以外所上限 15 學分計算。']
            }))
        },
        {
            id: '工業與資訊管理學系碩士班', college: C, degree: '碩士班',
            aliases: ['工資所', '工資管', '工資管碩', 'IIM', 'R3'], catalogDepts: ['工資所'],
            versions: [
                iimVersion('國立成功大學工業與資訊管理學系', 114, '114 學年度入學（113.09.27 修訂）'),
                iimVersion('國立成功大學工業與資訊管理學系', 113, '113 學年度入學'),
                iimVersion('國立成功大學工業與資訊管理學系', 112, '112 學年度入學'),
                iimVersion('國立成功大學工業與資訊管理學系', 110, '110～111 學年度入學')
            ]
        },
        {
            id: '資訊管理研究所碩士班', college: C, degree: '碩士班',
            aliases: ['資管所', '資管碩', 'IM', 'R7'], catalogDepts: ['資管所'],
            versions: [
                iimVersion('國立成功大學資訊管理研究所', 113, '113 學年度以後入學'),
                iimVersion('國立成功大學資訊管理研究所', 112, '112 學年度入學')
            ]
        },
        {
            id: '交通管理科學系碩士班', college: C, degree: '碩士班',
            aliases: ['交管所', '交管碩', 'TLM', 'R5'], catalogDepts: ['交管所'],
            versions: [tlmVersion(115), tlmVersion(114)]
        },
        {
            id: '電信管理研究所碩士班', college: C, degree: '碩士班',
            aliases: ['電管所', '電信管理所', '電信所', 'ITM', 'R9'], catalogDepts: ['電管所'],
            versions: [telecomVersion(115, 21, 12, 9), telecomVersion(114, 24, 9, 6)]
        },
        {
            id: '體育健康與休閒研究所碩士班', college: C, degree: '碩士班',
            aliases: ['體健所', '體育健康休閒', 'PEHL', 'RB'], catalogDepts: ['體健所'],
            versions: [{
                fromYear: 101, label: '101 學年度起入學（109.12.14 修訂）',
                source: '國立成功大學體育健康與休閒研究所碩士班修課要點（101 學年度起入學適用，109.12.14 修訂）',
                totalCredits: 30, thesisCredits: 0, maxWaived: 6, seminarCreditsCount: true,
                requiredCourses: ['體育健康與休閒研究法', '統計學'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '畢業學分至少 30：必修 10（體育健康與休閒研究法 3、統計學 3、專題討論 4 學期共 4）、選修 20。',
                    '修外系所統計學需經指導教授認可。',
                    '外校學生抵免：基礎專業及各領域核心專業不可抵免，專業選修至多抵免 6 學分。',
                    '畢業前須修一門全英文課程或通過英檢（如 TOEIC 600）。'
                ],
                uncertain: ['要點未寫論文學分，系統以 0 學分計算。', '要點未寫外所選修上限，系統不設上限。']
            }]
        }
    ]);
})();
