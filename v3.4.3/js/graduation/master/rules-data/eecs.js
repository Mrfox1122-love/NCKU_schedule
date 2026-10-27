// ============================================================
// 🎓 電機資訊學院 — 研究所畢業規則
// ============================================================

(function () {
    // 國立成功大學電機工程學系碩士班修業辦法（含碩士在職專班、通訊所、微電所、奈米積電學程、資安學程）
    const EE_MASTER_VERSIONS = [{
        fromYear: 0,
        label: '115.6.10 修正版（未標明適用入學年度）',
        source: '國立成功大學電機工程學系碩士班修業辦法（115.6.10 系所務會議通過）',
        totalCredits: 24,
        thesisCredits: 6,
        maxExternal: 12,
        seminar: { mode: 'byDuration', byDuration: { '1': 2, '1.5': 3, '2': 4 } },
        ethicsHours: 6,
        notes: [
            '外系所課程須經指導教授及系主任同意；本系有開授相同課程者，原則上不得以外系所課程取代。',
            '大學部課程不列入畢業學分。',
            '專題討論每學期均須選修且僅能修一門，任一學期未修須延畢半年。',
            '抵免課程除本系所取得者外，一律僅承認為外系所學分。',
            '入學後第一學年結束前須取得論文指導教授同意。'
        ],
        uncertain: []
    }];

    // 資訊工程研究所學分承認及抵免辦法－碩士班（113.3.12 修正）
    const CS_MASTER_NOTES = [
        '外所選修課程須經指導教授簽名認可。',
        '選修大學部課程、大學部曾修過的研究所課程、暑修及推廣課程，學分一概不予承認。',
        '抵免課程須開設於研究所、成績 70 分以上且未列入大學畢業學分，最多抵免 6 學分。',
        '補修限本校電資學院與工科系所開授之課程（外籍生得由指導教授認可）。'
    ];

    window.registerMasterPrograms([
        ...[
            { id: '電機工程學系碩士班', degree: '碩士班', aliases: ['電機所', '電機碩', 'EE', 'N2'], catalogDepts: ['電機所'] },
            { id: '電機工程學系碩士在職專班', degree: '碩士在職專班', aliases: ['電機在職', '電機碩專'], catalogDepts: ['電機所'] },
            { id: '電腦與通訊工程研究所碩士班', degree: '碩士班', aliases: ['通訊所', '電通所', 'CCE', 'Q3'], catalogDepts: ['通訊所'] },
            { id: '微電子工程研究所碩士班', degree: '碩士班', aliases: ['微電所', 'IME', 'Q1'], catalogDepts: ['微電所'] },
            { id: '奈米積體電路工程碩士學位學程', degree: '碩士班', aliases: ['奈米積電學程', '奈積碩博學程', '奈積', 'NICE', 'Q7'], catalogDepts: ['奈積'] },
            { id: '智慧資訊安全碩士學位學程', degree: '碩士班', aliases: ['資安碩士學程', '資安學程', 'CSI', 'NQ'], catalogDepts: ['資安碩士學程'] }
        ].map(p => ({
            ...p,
            college: '電機資訊學院',
            versions: EE_MASTER_VERSIONS.map(v => p.degree === '碩士在職專班'
                ? { ...v, notes: [...v.notes, '碩士在職專班修業年限得延長一年。'] }
                : v)
        })),

        {
            id: '資訊工程學系碩士班',
            college: '電機資訊學院',
            degree: '碩士班',
            aliases: ['資訊所', '資工所', '資工碩', 'CSIE', 'P7'],
            catalogDepts: ['資訊所'],
            versions: [
                {
                    fromYear: 112,
                    label: '112 學年度起入學',
                    source: '資訊工程研究所學分承認及抵免辦法－碩士班（113.3.12 系務會議修正通過）',
                    totalCredits: 24, thesisCredits: 6, maxExternal: 9, maxWaived: 6,
                    requiredCourses: ['資工與醫資導論'],
                    seminar: { mode: 'fixed', count: 4 },
                    remedial: ['計算機組織', '資料結構', '離散數學'],
                    notes: CS_MASTER_NOTES
                },
                {
                    fromYear: 0,
                    label: '111 學年度前入學',
                    source: '資訊工程研究所學分承認及抵免辦法－碩士班（113.3.12 系務會議修正通過）',
                    totalCredits: 24, thesisCredits: 6, maxExternal: 9, maxWaived: 6,
                    requiredCourses: ['資工與醫資導論'],
                    seminar: { mode: 'fixed', count: 4 },
                    remedial: ['計算機組織', '資料結構', '離散數學'],
                    notes: ['碩一須通過本所專題討論(1)(2)，碩二以上須通過 2 學期專題討論。', ...CS_MASTER_NOTES]
                }
            ]
        },
        {
            id: '資訊工程學系博士班',
            college: '電機資訊學院',
            degree: '博士班',
            aliases: ['資訊所博', '資工博', 'CSIE博'],
            catalogDepts: ['資訊所'],
            versions: [{
                fromYear: 112,
                label: '112 學年度起入學（一般博士生）',
                source: '資訊工程研究所學分承認及抵免辦法－博士班（114.3.25 系務會議修正通過）',
                totalCredits: 18, thesisCredits: 12, maxExternal: 6, maxWaived: 9, minOwnCredits: 12,
                requiredCourses: ['資工與醫資導論'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '大學直升博士、碩士直升博士須修 36 學分（含碩士修課學分），外所選修（含碩士期間）至多承認 12 學分，碩士班時期修的大碩合班課至多承認 2 門。',
                    '選修科目不可與個人碩士班期間修習科目相同；大學部課程、暑修與推廣課程不予承認。',
                    '本系碩士班畢業且已修過「資工與醫資導論」者可抵修。'
                ],
                uncertain: [
                    '直升博士（36 學分）與一般博士（18 學分）門檻不同，系統只依一般博士生計算；直升生請以 36 學分自行核對。',
                    '112 學年度前入學者專題討論為「博一修(1)(2)、博二以上修 2 學期」，系統同樣以 4 學期計算。'
                ]
            }]
        },
        {
            id: '製造資訊與系統研究所碩士班',
            college: '電機資訊學院',
            degree: '碩士班',
            aliases: ['製造所', '製造資訊', 'IMIS', 'P9'],
            catalogDepts: ['製造所'],
            versions: [{
                fromYear: 0,
                label: '113.3.11 修正版（未標明適用入學年度）',
                source: '國立成功大學製造資訊與系統研究所碩士班修業要點（113.3.11 所務會議修正通過）',
                totalCredits: 24, thesisCredits: 6, minOwnCredits: 12,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '除專題討論四學期與論文外，至少須修滿研究所級之課程 24 學分。',
                    '至少須選修本所開課程 4 門（12 學分），含入學已辦學分抵免之本所主開課程。',
                    '選修課程須經指導教授核可；學期成績 70 分及格。',
                    '碩二上學期前五週須進行論文計畫口試，通過三個月後始能提出學位口試。'
                ],
                uncertain: ['規章未寫外所選修上限與抵免上限，系統不設上限。']
            }]
        },
        {
            id: '醫學資訊研究所碩士班',
            college: '電機資訊學院',
            degree: '碩士班',
            aliases: ['醫資所', '醫學資訊', 'IMI', 'Q5'],
            catalogDepts: ['醫資所'],
            versions: [
                {
                    fromYear: 112,
                    label: '112 學年度起入學',
                    source: '國立成功大學醫學資訊研究所碩士班學分承認及抵免辦法（113.5.8 所務會議修正通過）',
                    totalCredits: 24, thesisCredits: 6, maxExternal: 12, maxWaived: 6, minOwnCredits: 12,
                    requiredCourses: ['資工與醫資導論'],
                    seminar: { mode: 'fixed', count: 4 },
                    remedial: ['程式設計(一)', '計算機概論'],
                    notes: [
                        '專業選修須至少修習且通過二門核心課程（生醫訊號處理、資料探勘、基因體資訊學、影像處理、電腦視覺與深度學習、工程用解剖生理學）。',
                        '本所外選修課程至多承認 12 學分，須經指導教授輔導確認。',
                        '大學部、大學部曾修過的研究所課程、暑修和推廣課程不列入畢業學分。',
                        '未修過生物醫學相關基礎課程者，須補修等同課程（由指導教授輔導選修）。',
                        '補修「程式設計(一)」「計算機概論」限電資學院與工科系開授之課程。'
                    ],
                    uncertain: []
                },
                {
                    fromYear: 0,
                    label: '111 學年度前入學',
                    source: '國立成功大學醫學資訊研究所碩士班學分承認及抵免辦法（113.5.8 所務會議修正通過）',
                    totalCredits: 24, thesisCredits: 6, maxExternal: 12, maxWaived: 6, minOwnCredits: 12,
                    requiredCourses: ['資工與醫資導論'],
                    seminar: { mode: 'fixed', count: 4 },
                    remedial: ['程式設計(一)', '計算機概論'],
                    notes: [
                        '碩一須通過本所專題討論(1)(2)；碩二以上須通過 2 個學期之專題討論。',
                        '專業選修須至少修習且通過二門核心課程。',
                        '本所外選修課程至多承認 12 學分；大學部、暑修和推廣課程不列入畢業學分。'
                    ],
                    uncertain: []
                }
            ]
        },
        {
            id: '人工智慧科技碩士學位學程',
            college: '電機資訊學院',
            degree: '碩士班',
            aliases: ['AI學程', '人工智慧學程', 'AI碩', 'NE'],
            catalogDepts: ['人工智慧碩士學程'],
            versions: [{
                fromYear: 112,
                label: '112 學年度起入學（115.08 新生須知）',
                source: '人工智慧科技碩士學位學程新生須知（115.08）、學分承認及抵免辦法',
                totalCredits: 24, thesisCredits: 6, maxExternal: 6, maxWaived: 6, minOwnCredits: 18,
                requiredCourses: ['資工與醫資導論'],
                seminar: { mode: 'fixed', count: 4 },
                remedial: ['計算機組織', '資料結構', '線性代數'],
                notes: [
                    '本學程選修課程需修 18 學分以上，學程外選修至多承認 6 學分，須經課程委員會認可。',
                    '選修大學部課程、暑修和推廣課程，學分一概不予承認。',
                    '補修限電資學院與工科系開授之課程；外籍生是否補修由指導教授認定。',
                    '修外系課須填外系修課申請表並經指導教授簽名。'
                ],
                uncertain: [
                    '112 學年度前入學者專題討論為「碩一修(1)(2)、碩二以上修專題討論」，系統同樣以 4 學期計算。',
                    '找課判斷本所課程時以開課單位「人工智慧碩士學程」比對；學程課程多由資訊系開授，排入後可能需手動改為本所選修。'
                ]
            }]
        }
    ]);
})();
