// ============================================================
// 🎓 理學院 — 研究所畢業規則
// ============================================================

(function () {
    const C = '理學院';

    window.registerMasterPrograms([
        {
            id: '數學系應用數學碩士班', college: C, degree: '碩士班',
            aliases: ['應數所', '應用數學所', '數學所', 'MATH', 'L1'], catalogDepts: ['應數所'],
            versions: [{
                fromYear: 111, label: '111 學年度入學（114.12.18 系務會議修訂）',
                source: '應用數學研究所（111 學年度入學）碩士學位修業規定（114.12.18 系務會議修訂）',
                totalCredits: 24, thesisCredits: 6, minOwnCredits: 9,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '必修：專題討論(一)～(四)（0 學分，4 學期）。',
                    '必修課程至少修讀通過 9 學分（超過部分當選修），其中至少通過「分析通論(一)」「代數通論(一)」其中一門。',
                    '本所開授課程至少 9 學分；與大學部合開之課程由指導教授認定。',
                    '指導教授於第一學年第二學期開學前選定。'
                ],
                uncertain: []
            }]
        },
        {
            id: '物理學系碩士班', college: C, degree: '碩士班',
            aliases: ['物理所', '物理碩', 'PHYS', 'L2'], catalogDepts: ['物理所'],
            versions: [{
                fromYear: 104, label: '104 學年度（含）之後入學',
                source: '物理所必修課程表（104 學年度之後入學適用）、物理系網站研究所課程資訊',
                totalCredits: 24, thesisCredits: 6, maxExternal: 6,
                requiredCourses: ['量子力學(一)', '電動力學(一)'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '必修：量子力學(一)、電動力學(一)共 6 學分。',
                    '4 選 2 必修 6 學分（須經指導教授同意）：固態物理(一)、量子力學(二)、電動力學(二)、統計力學。',
                    '選修 12 學分；指導教授同意之外系選修最多 6 學分（113 學年度第 2 學期起畢業之學生適用）。',
                    '專題討論(一)～(四)為必修 0 學分，請依年級順序選修以免延畢。'
                ],
                uncertain: []
            }]
        },
        {
            id: '化學系碩士班', college: C, degree: '碩士班',
            aliases: ['化學所', '化學碩', 'CHEM', 'L3'], catalogDepts: ['化學所'],
            versions: [{
                fromYear: 100, label: '100 學年度起入學（2024.12.04 公告）',
                source: '化學系學生專區「畢業學分及科目」「選課規定」（2024.12.04 公告）',
                totalCredits: 24, thesisCredits: 0, maxExternal: 6,
                requiredCourses: ['書報討論(一)', '書報討論(二)', '書報討論(三)'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '24 學分：四組專業必修 6 學分、書報討論(一)～(三) 3 學分、選修 15 學分。',
                    '專業必修：本組必修課程＋另一組別之專業必修 1 門（高等有機、高等物化、高等分析、高等無機）；超過 6 學分部分可當選修。',
                    '須修完 4 個以上及格的碩班或博班專題討論。',
                    '本校外所課程限 6 學分；學分抵免只能抵本所必選修科目。'
                ],
                uncertain: []
            }]
        },
        {
            id: '化學系博士班', college: C, degree: '博士班',
            aliases: ['化學所博', '化學博'], catalogDepts: ['化學所'],
            versions: [{
                fromYear: 100, label: '100 學年度起入學（2024.12.04 公告）',
                source: '化學系學生專區「畢業學分及科目」「選課規定」（2024.12.04 公告）',
                totalCredits: 18, thesisCredits: 0, maxExternal: 6,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '博士班選修 18 學分（不含論文），須修完 4 個專題討論。',
                    '逕攻博士班 42 學分（專業必修 6、書報討論 3、選修 33），外所課程限 12 學分。',
                    '博班資格考、英語畢業門檻、論文期刊請參考本系博士班修讀辦法；103 學年起畢業之博士生論文須以英文撰寫。'
                ],
                uncertain: ['逕攻博士生門檻不同，系統只依一般博士生計算。']
            }]
        },
        ...[
            { id: '地球科學系碩士班', degree: '碩士班', aliases: ['地科所', '地科碩', 'EARS', 'L4'], external: true },
            { id: '地球科學系碩士在職專班', degree: '碩士在職專班', aliases: ['地科在職', '地科碩專'], external: false }
        ].map(p => ({
            id: p.id, college: C, degree: p.degree, aliases: p.aliases, catalogDepts: ['地科所'],
            versions: [{
                fromYear: 0, label: '113.10.17 修正版（未標明適用入學年度）',
                source: '國立成功大學地球科學系研究生規章（113.10.17 修正）',
                totalCredits: 24, thesisCredits: 6, minOwnCredits: 6, minExternal: p.external ? 6 : null,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    p.external
                        ? '須包括經指導教授認可之非本系開授課程至少 6 學分，及本系專業課程至少 6 學分（不含論文）。'
                        : '須包括本系專業課程至少 6 學分（不含論文）。',
                    '非本系或相關科系畢業者，須另修本系學士班「地球科學概論(一)(二)」共 6 學分（不計入畢業學分）。',
                    '學分抵免以畢業學分總數二分之一為限。',
                    '碩士班須完成研究成果發表兩次，且至少一次於研究生「專題討論」課。'
                ],
                uncertain: []
            }]
        })),
        {
            id: '地球科學系博士班', college: C, degree: '博士班',
            aliases: ['地科所博', '地科博'], catalogDepts: ['地科所'],
            versions: [{
                fromYear: 0, label: '113.10.17 修正版（未標明適用入學年度）',
                source: '國立成功大學地球科學系研究生規章（113.10.17 修正）',
                totalCredits: 18, thesisCredits: 12,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '逕修博士學位者至少須修滿 42 學分，另加論文 12 學分。',
                    '博士學位候選人資格考核完成前須累計兩學期且每學期至少修滿 9 學分（全職修習）。',
                    '須完成研究成果報告四次，且至少一次以英文發表於研究生「專題討論」課。'
                ],
                uncertain: ['逕修博士生門檻不同，系統只依一般博士生計算。']
            }]
        },
        {
            id: '光電科學與工程學系碩士班', college: C, degree: '碩士班',
            aliases: ['光電所', '光電碩', 'DPS', 'L7'], catalogDepts: ['光電所'],
            versions: [{
                fromYear: 0, label: '114.12.03 修訂版（未標明適用入學年度）',
                source: '國立成功大學光電科學與工程學系碩士班修讀辦法（1141203 系務會議修訂）',
                totalCredits: 24, thesisCredits: 6, maxExternal: 3, maxWaived: 9,
                requiredCourses: ['光電子學(一)', '光電子學(二)'],
                seminar: { mode: 'fixed', count: 2 },
                notes: [
                    '必修 6 學分：光電子學(一)(二)；專題討論(一)(二) 0 學分。',
                    '選修至少 18 學分，須選修「光電實驗」1 學分且及格（已修學士班光電實驗(一)(二)且平均 70 分以上者可免）。',
                    '外所選課最多承認 3 學分；一般生「外所選課」加「抵免學分」不得超過 9 學分。',
                    '學士班、碩士班不得重覆修課；同一老師課程不得超過 10 學分，其中專題類最多承認 4 學分。'
                ],
                uncertain: []
            }]
        },
        {
            id: '太空與電漿科學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['電漿所', '太空電漿所', 'SAPS', 'LA'], catalogDepts: ['電漿所'],
            versions: [{
                fromYear: 0, label: '114 學年度起實施（適用所有在學學生）',
                source: '太空與電漿科學研究所碩士班修業規定（114 學年度起必修改為 5 學分，適用所有在學學生）',
                totalCredits: 24, thesisCredits: 6, maxExternal: 6, seminarCreditsCount: true,
                requiredCourses: ['電漿物理'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '必修 5 學分：電漿物理 3 學分、專題討論(1)(2) 各 1 學分、專題討論(3)(4) 0 學分；原「太空物理」改為選修。',
                    '選修至少 19 學分；外所選課最多承認 6 學分。',
                    '未列於入學當年或次學年「太空與電漿科學所研究相關建議課程」名單上的學分數不得超過 3 學分，並須經指導教授及所長同意。'
                ],
                uncertain: []
            }]
        }
    ]);
})();
