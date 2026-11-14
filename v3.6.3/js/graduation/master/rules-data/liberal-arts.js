// ============================================================
// 🎓 文學院 — 研究所畢業規則
// 學分規定若「含論文」，此處一律拆成 totalCredits（不含論文）＋ thesisCredits
// ============================================================

(function () {
    const C = '文學院';

    window.registerMasterPrograms([
        // ── 中國文學系 ──
        {
            id: '中國文學系碩士班（中國文學組）', college: C, degree: '碩士班',
            aliases: ['中文所', '中文碩', '中國文學碩士班', 'CL', 'K1'], catalogDepts: ['中文所'],
            versions: [{
                fromYear: 0, label: '115.05 博碩士班學生手冊（未標明適用入學年度）',
                source: '國立成功大學中國文學系博碩士班學生手冊（115 年 5 月）、中國文學系研究生學則（111.12.27 修訂）',
                totalCredits: 32, thesisCredits: 6, maxWaived: 8,
                requiredCourses: ['學術討論', '漢學英文'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '至少修滿 38 學分（含論文 6 學分、漢學英文一學年 0 學分、學術討論 0 學分）。',
                    '須在校內外學術期刊發表論文一篇以上（含經審查之學術會議論文）。',
                    '錄取後須研讀與論文方向有關之書籍 3 種並撰寫報告 3 篇。',
                    '非本科系畢業者須補修本系學士班必修課程 3 門（須含「中國文學史」或「中國思想史」至少一門），補修學分不計入畢業學分。',
                    '每學期選修最多 12 學分；乙組每學期須參與四次「習講」活動。'
                ],
                uncertain: []
            }]
        },
        {
            id: '中國文學系現代文學碩士班', college: C, degree: '碩士班',
            aliases: ['現代文學碩士班', '現文碩', '中文所現文'], catalogDepts: ['中文所'],
            versions: [{
                fromYear: 0, label: '115.05 博碩士班學生手冊（未標明適用入學年度）',
                source: '國立成功大學中國文學系博碩士班學生手冊（115 年 5 月）、中國文學系研究生學則（111.12.27 修訂）',
                totalCredits: 32, thesisCredits: 6, maxWaived: 8,
                requiredCourses: ['學術討論', '現代漢學英文選讀'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '至少修滿 38 學分（含論文 6 學分、現代漢學英文選讀一學年 4 學分、學術討論 0 學分）。',
                    '須在校內外學術期刊發表論文一篇以上（含經審查之學術會議論文）。'
                ],
                uncertain: []
            }]
        },
        {
            id: '中國文學系博士班', college: C, degree: '博士班',
            aliases: ['中文所博', '中文博'], catalogDepts: ['中文所'],
            versions: [{
                fromYear: 0, label: '115.05 博碩士班學生手冊（未標明適用入學年度）',
                source: '國立成功大學中國文學系博碩士班學生手冊（115 年 5 月）、中國文學系研究生學則（111.12.27 修訂）',
                totalCredits: 24, thesisCredits: 12, maxWaived: 8,
                requiredCourses: ['學術討論', '第二外語'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '至少修滿 36 學分（含論文 12 學分、第二外國語一學年 0 學分、學術討論 0 學分）；第二外語可依規定以語言檢定抵修。',
                    '須在學術期刊發表論文三篇以上，並於學術研討會發表論文一次以上。',
                    '須通過博士班資格考試（第 2 學年第 2 學期起可申請，至多 5 年內）。',
                    '修業年限 2 至 7 年。'
                ],
                uncertain: []
            }]
        },

        // ── 外國語文學系 ──
        {
            id: '外國語文學系碩士班（甲組文學組）', college: C, degree: '碩士班',
            aliases: ['外文所', '外文碩', '外文所文學組', 'FLL', 'K2'], catalogDepts: ['外文所'],
            versions: [{
                fromYear: 110, label: '110 學年度起入學（2021.5 修訂）',
                source: '國立成功大學外國語文學系碩士班章程【甲組（文學組）】（2021.5 修訂）',
                totalCredits: 30, thesisCredits: 6, maxExternal: 9,
                requiredCourses: ['文學研究方法與論文寫作', '文學批評'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '研究所課程須從四類別中任選至少三項，三項中各選修至少一門。',
                    '他系所／他校選修至多承認 9 學分（含入學前先修碩士課程之抵免學分）。',
                    '第二外語為必修：入學時未具能力證明者，須修本校第二外語兩年（或至少 8 學分），不計入畢業學分。',
                    '未修過指定基礎課程其中兩門（至少四學期）者，須於畢業前補修。',
                    '凡修畢規定學分而尚未提出論文者，皆應選修「專題討論」（0 學分）。',
                    '每學期修課至多 13 學分（含教育學程）；論文全文須達 50 頁以上。'
                ]
            }]
        },
        {
            id: '外國語文學系碩士班（乙組語言學組）', college: C, degree: '碩士班',
            aliases: ['外文所語言學組', '外文所乙組'], catalogDepts: ['外文所'],
            versions: [{
                fromYear: 110, label: '110 學年度起入學',
                source: '國立成功大學外國語文學系碩士班章程【乙組（語言學組）】',
                totalCredits: 32, thesisCredits: 6, maxExternal: 6, maxWaived: 6,
                requiredCourses: ['語言學研究方法'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '他系／他校選修至多 6 學分；本系碩士班跨組課程至多 3 學分。',
                    '本系大學部畢業生先修之碩士班課程（70 分以上、未計入大學畢業學分）可抵免至多 6 學分。',
                    '第二外語為必修：入學時未具能力證明者，須修本校第二外語兩年（或至少 8 學分），不計入畢業學分。',
                    '未修過指定基礎課程其中兩門（至少四學期）者，須於畢業前補修。',
                    '凡修畢規定學分而尚未提出論文者，皆應選修「專題討論」（0 學分）。',
                    '英文論文正文須達 60 頁以上。'
                ],
                uncertain: ['跨組課程最多承認 3 學分，系統無法區分組別，未自動檢查。']
            }]
        },

        // ── 歷史學系 ──
        {
            id: '歷史學系碩士班', college: C, degree: '碩士班',
            aliases: ['歷史所', '歷史碩', 'HIS', 'K3'], catalogDepts: ['歷史所'],
            versions: [{
                fromYear: 115, label: '115 學年度入學',
                source: '國立成功大學歷史學系碩士班手冊（115 學年度入學新生適用，2026/09）',
                totalCredits: 24, thesisCredits: 6, maxExternal: 6,
                requiredCourses: ['論文寫作與實習'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '30 學分含：必修「論文寫作與實習」（一學年 4 學分）、「高級史學英文」或「專業史學日文」（一學年 0 學分）、專業選修 20 學分、論文 6 學分。',
                    '所屬研究領域之專業課程不得少於 12 學分。',
                    '外系或外校課程不得超過專業選修三分之一（6 學分）。',
                    '英語達 CEFR B2 或日語 N2 以上者，可免修「高級史學英文」或「專業史學日文」。',
                    '論文口試前至少須出席「史學專題講座」4 次。',
                    '非本科系畢業者應加修本系 6 學分課程，不併入畢業學分。'
                ],
                uncertain: []
            }]
        },

        // ── 藝術研究所 ──
        {
            id: '藝術研究所碩士班', college: C, degree: '碩士班',
            aliases: ['藝術所', '藝研所', 'AS', 'K4'], catalogDepts: ['藝術所'],
            versions: [{
                fromYear: 110, label: '110 學年度起入學（110、112、113 學年度課程架構學分規定相同）',
                source: '藝術所課程架構表（110 學年度起 111.05.18、112 學年度起 113.11.27、113 學年度起 113.06.18 會議通過）',
                totalCredits: 33, thesisCredits: 0,
                requiredCourses: ['藝術學研究法', '美學', '藝術專題討論'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '必修 6 學分（藝術學研究法、美學、藝術專題討論 0 學分），選修 27 學分。',
                    '選修須自選一主修領域，其下五類課程各至少修 1 門；非主修領域各至少修 1 門。',
                    '外語畢業門檻：GEPT 中高級初試、TOEFL iBT 79、IELTS 5.5 等擇一，或修國際語言／全外語課程 4 學分以上（不得重複抵免畢業學分）。'
                ],
                uncertain: [
                    '規章未規定外所選修上限，系統不設上限。'
                ]
            }]
        },

        // ── 台灣文學系 ──
        {
            id: '台灣文學系碩士班', college: C, degree: '碩士班',
            aliases: ['台文所', '臺文所', '台文碩', 'TWL', 'K5'], catalogDepts: ['台文所'],
            versions: [
                {
                    fromYear: 115, label: '115 學年度起入學',
                    source: '國立成功大學台灣文學系研究生修業規定（115 學年度）',
                    totalCredits: 27, thesisCredits: 6, maxExternal: 6,
                    seminar: { mode: 'fixed', count: 0 },
                    notes: [
                        '33 學分含：論文 6 學分、專業必修 3 學分、專業選修 24 學分（外系及外校合計最高承認 6 學分）。',
                        '每學期專業科目以 9 學分為原則，最多 12 學分。',
                        '須於畢業當學期期末前完成「第一類語文」及「第二類語文」能力認定。'
                    ],
                    uncertain: []
                },
                {
                    fromYear: 110, label: '110～114 學年度入學',
                    source: '國立成功大學台灣文學系研究生修業規定（110～114 學年度，各年度學分規定相同）',
                    totalCredits: 33, thesisCredits: 6, maxExternal: 6,
                    seminar: { mode: 'fixed', count: 0 },
                    notes: [
                        '39 學分含：必修 9 學分（含碩士論文 6 學分）、選修 30 學分（外系及外校合計最高承認 6 學分）。',
                        '須參加 4 場校內外學術研討會；須完成語文能力認定。'
                    ],
                    uncertain: []
                }
            ]
        },
        {
            id: '台灣文學系碩士在職專班', college: C, degree: '碩士在職專班',
            aliases: ['台文在職', '台文碩專'], catalogDepts: ['台文所'],
            versions: [{
                fromYear: 110, label: '110 學年度起入學（110～115 學年度學分規定相同）',
                source: '國立成功大學台灣文學系研究生修業規定（110～115 學年度）',
                totalCredits: 24, thesisCredits: 6, maxExternal: 6,
                seminar: { mode: 'fixed', count: 0 },
                notes: ['30 學分含：論文 6 學分、專業必修 3 學分、專業選修 21 學分（外系及外校合計最高承認 6 學分）。', '畢業論文以 3 萬字以上為原則。'],
                uncertain: []
            }]
        },
        {
            id: '台灣文學系博士班', college: C, degree: '博士班',
            aliases: ['台文所博', '台文博'], catalogDepts: ['台文所'],
            versions: [
                {
                    fromYear: 115, label: '115 學年度起入學（一般生）',
                    source: '國立成功大學台灣文學系研究生修業規定（115 學年度）',
                    totalCredits: 24, thesisCredits: 12, maxExternal: 6,
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['一般生 36 學分含：論文 12 學分、專業必修 3 學分、專業選修 21 學分；逕博生 42 學分。', '須通過本系博士資格考試。'],
                    uncertain: []
                },
                {
                    fromYear: 110, label: '110～114 學年度入學（一般生）',
                    source: '國立成功大學台灣文學系研究生修業規定（110～114 學年度）',
                    totalCredits: 24, thesisCredits: 12, maxExternal: 6,
                    seminar: { mode: 'fixed', count: 0 },
                    notes: ['一般生 36 學分含：論文 12 學分、專業必修 6 學分、專業選修 18 學分。', '須通過本系博士資格考試。'],
                    uncertain: []
                }
            ]
        },

        // ── 考古學研究所 ──
        {
            id: '考古學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['考古所', '考古碩', 'Arxe', 'K7'], catalogDepts: ['考古所'],
            versions: [
                {
                    fromYear: 113, label: '113 學年度起入學',
                    source: '國立成功大學考古學研究所研究生總則（114.03.19 修訂）',
                    totalCredits: 31, thesisCredits: 0, maxExternal: 6,
                    seminar: { mode: 'fixed', count: 0 },
                    remedial: ['考古學概論', '臺灣考古學'],
                    notes: [
                        '畢業 31 學分：必修 13 學分、選修 18 學分。',
                        '外校或外系與考古學相關之研究所課程，經所長同意得抵認選修，至多 6 學分。',
                        '未修過「人類學導論或文化人類學」「考古學概論」「臺灣考古學」者須補修（不列入畢業學分）。',
                        '須於第四學期結束前發表碩士論文提綱，通過後次一學期始得申請學位考試。',
                        '114 學年度起入學者取消碩士班外語門檻。'
                    ],
                    uncertain: []
                },
                {
                    fromYear: 0, label: '112 學年度前入學',
                    source: '國立成功大學考古學研究所研究生總則（114.03.19 修訂）',
                    totalCredits: 28, thesisCredits: 0, maxExternal: 6,
                    seminar: { mode: 'fixed', count: 0 },
                    remedial: ['考古學概論', '臺灣考古學'],
                    notes: ['畢業 28 學分：必修 13 學分、選修 15 學分。', '須通過本所外語門檻。'],
                    uncertain: []
                }
            ]
        },
        {
            id: '考古學研究所博士班', college: C, degree: '博士班',
            aliases: ['考古所博', '考古博'], catalogDepts: ['考古所'],
            versions: [{
                fromYear: 0, label: '114.03.19 修訂版（未標明適用入學年度）',
                source: '國立成功大學考古學研究所研究生總則（114.03.19 修訂）',
                totalCredits: 28, thesisCredits: 0, maxExternal: 9,
                seminar: { mode: 'fixed', count: 0 },
                remedial: ['田野考古學'],
                notes: [
                    '畢業 28 學分：必修 10 學分、選修 18 學分；逕攻博士生 30 學分（必修 10、選修 20）。',
                    '外校或外系相關博士班課程至多採計 9 學分。',
                    '通過資格考試前每學年末須提交至少 5000 字研究進度報告並公開演講。'
                ],
                uncertain: ['逕攻博士生門檻不同，系統只依一般生計算。']
            }]
        },

        // ── 戲劇碩士學位學程 ──
        {
            id: '戲劇碩士學位學程', college: C, degree: '碩士班',
            aliases: ['戲劇學程', '戲劇碩', 'AD', 'K8'], catalogDepts: ['戲劇碩士學程'],
            versions: [{
                fromYear: 0, label: '115.08 學生手冊（未標明適用入學年度）',
                source: '國立成功大學戲劇碩士學位學程學生手冊（115.08）',
                totalCredits: 30, thesisCredits: 0, maxExternal: 6,
                requiredCourses: ['劇場實務', '戲劇學研究法'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '必修 6 學分（劇場實務、戲劇學研究法、專題討論 0 學分），選修 24 學分。',
                    '選修分文學、戲曲、戲劇、跨域四類，每類至少修 1 門。',
                    '非本學程課程（含校內外所、校際選課）與抵免合計至多 6 學分，須事先填同意書。',
                    '畢業方式二擇一：撰寫論文，或創作／展演連同書面報告（不列入學分）。',
                    '須累積 30 點以上學術或藝文活動點數，並發表一篇論文或公開展演後始得申請口試。'
                ]
            }]
        }
    ]);
})();
