// ============================================================
// 🎓 醫學院 — 研究所畢業規則
// ============================================================

(function () {
    const C = '醫學院';
    const UNDATED = '（未標明適用入學年度）';

    // 臨床醫學研究所畢業修課學分表（114、115 學年度）
    const clinicalMaster = (year, required) => ({
        fromYear: year, label: `${year} 學年度入學`,
        source: `臨床醫學研究所 ${year} 學年度入學碩士班（一般生、在職生）畢業修課學分表`,
        totalCredits: 24, thesisCredits: 6, maxExternal: 4, seminarCreditsCount: true,
        requiredCourses: required,
        seminar: { mode: 'fixed', count: 4 },
        notes: [
            `必修專題討論(1)～(4) 各 1 學分，選修 20 學分（含必選 ${year === 115 ? 9 : 10} 學分）；修業期限至多 4 年。`,
            '修習所外學分需經指導教授同意，最多不得超過 4 學分。'
        ],
        uncertain: ['學分表未寫論文學分，系統以 6 學分計算。']
    });
    const clinicalWorking = year => ({
        fromYear: year, label: `${year} 學年度入學`,
        source: `臨床醫學研究所 ${year} 學年度入學碩士班（一般生、在職生）畢業修課學分表`,
        totalCredits: 24, thesisCredits: 6, maxExternal: 4, seminarCreditsCount: true,
        seminar: { mode: 'fixed', count: 4 },
        notes: [
            `必修專題討論(1)～(4) 各 1 學分，選修 20 學分：生命科學暨轉譯醫學組含必選 11 學分、臨床試驗組含必選 12 學分（${year} 學年度）；修業期限至多 5 年。`,
            '修習所外學分需經指導教授同意，最多不得超過 4 學分。'
        ],
        uncertain: ['學分表未寫論文學分，系統以 6 學分計算。', '114 學年度學分表寫兩組皆「必選 12 學分」，115 學年度改為 11／12 學分。']
    });

    // 臨床藥學與藥物科技研究所（三組）
    const clinicalPharmacy = (code, group, fromYear, label, required, totalNote, uncertain) => ({
        id: `臨床藥學與藥物科技研究所碩士班（${code}：${group}）`, college: C, degree: '碩士班',
        aliases: [`臨藥所${code}`, `臨藥${group}`, '臨藥所', '臨床藥學所', 'S6'],
        catalogDepts: ['臨藥科技所'],
        versions: [{
            fromYear, label,
            source: `臨床藥學與藥物科技研究所${group}（${code}）研究生修業須知`,
            totalCredits: 24, thesisCredits: 6, requiredCourses: required,
            seminar: { mode: 'fixed', count: 0 },
            notes: [totalNote, '書報討論(一)～(四) 為必修；第二年書報討論須以英文報告。'],
            uncertain
        }]
    });

    window.registerMasterPrograms([
        {
            id: '分子醫學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['分醫所', '分子醫學', 'IMM', 'T1'], catalogDepts: ['分醫所'],
            versions: [{
                fromYear: 0, label: `所網頁「總修業學分」（2014.4.15 所務會議修正）${UNDATED}`,
                source: '分子醫學研究所網站「課程資訊－總修業學分」、課程架構',
                totalCredits: 24, thesisCredits: 6, maxWaived: 5, seminarCreditsCount: true,
                requiredCourses: ['高等分子生物學', '高等細胞生物學'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '畢業總學分 30：必修 10（專題討論(一)～(四)、高等分子生物學、高等細胞生物學）、選修 14、論文 6。',
                    '選修 14 學分中經指導老師同意可外修相關課程；選修分感染性疾病、遺傳及發育生物學、癌症生物學、老化生物學等領域。',
                    '暑期選修生物科技課程之學分抵免僅可抵選修最多 3 學分（104 學年起特殊抵免最多 5 學分）；大學時期修習成大醫學院課程僅可抵免選修 2 學分。',
                    '碩二專題討論須以英文報告。'
                ],
                uncertain: ['所網未寫明專題討論(一)～(四) 各幾學分，系統依登錄的學分計入。', '抵免有 3、5、2 學分多種上限，系統以 5 學分計算。']
            }]
        },
        {
            id: '基礎醫學研究所博士班', college: C, degree: '博士班',
            aliases: ['基醫所', '基礎醫學', '基醫博', 'S5'], catalogDepts: ['基醫所'],
            versions: [{
                fromYear: 0, label: `所網頁「學程資訊」${UNDATED}`,
                source: '基礎醫學研究所網站「課程－學程資訊」',
                totalCredits: 22, thesisCredits: 12, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '必修 6 學分（含專題討論 4 學分）、選修 16 學分（含核心課程；逕讀博士 28 學分）、畢業論文 12 學分。',
                    '教學實習 4 學期 0 學分（二年級下學期開始修）。',
                    '博一、博二須報告專題討論；博三～博五每學期須選專題討論 0 學分並參與至少 16 次。',
                    '須依所屬學程（癌症生物、感染症、神經科學、轉譯醫學、再生醫學與細胞治療）完成必修及核心課程。'
                ],
                uncertain: ['逕讀博士生門檻不同，系統只依一般博士生計算。']
            }]
        },
        {
            id: '微生物及免疫學研究所碩士班（微免組）', college: C, degree: '碩士班',
            aliases: ['微免所', '微生物所', '微免組', 'S4'], catalogDepts: ['微免所'],
            versions: [{
                fromYear: 109, label: '109 學年度起入學',
                source: '微生物及免疫學研究所網站「研究所課程」（109 學年度起入學新生適用）',
                totalCredits: 24, thesisCredits: 6, seminarCreditsCount: true,
                requiredCourses: ['實驗室教育訓練', '實驗微生物及免疫學', '免疫學', '醫學微生物學'],
                seminar: { mode: 'fixed', count: 4 },
                notes: ['微免組（甲組）：必修 14、選修 10、論文 6，共 30 學分。', '必修：專題討論(一)(二) 各 1、(三)(四) 各 2（共 6）、實驗室教育訓練 1、實驗微生物及免疫學 1、免疫學 3、醫學微生物學 3。'],
                uncertain: []
            }]
        },
        {
            id: '微生物及免疫學研究所碩士班（寄生蟲組）', college: C, degree: '碩士班',
            aliases: ['微免所寄生蟲組', '寄生蟲組'], catalogDepts: ['微免所'],
            versions: [{
                fromYear: 109, label: '109 學年度起入學',
                source: '微生物及免疫學研究所網站「研究所課程」（109 學年度起入學新生適用）',
                totalCredits: 24, thesisCredits: 6, seminarCreditsCount: true,
                requiredCourses: ['實驗室教育訓練', '實驗微生物及免疫學', '免疫學', '寄生蟲學'],
                seminar: { mode: 'fixed', count: 4 },
                notes: ['寄生蟲組（乙組）：必修 13、選修 11、論文 6，共 30 學分。', '必修：專題討論(一)～(四) 共 6、實驗室教育訓練 1、實驗微生物及免疫學 1、免疫學 3、寄生蟲學 2。'],
                uncertain: []
            }]
        },
        {
            id: '物理治療學系碩士班（臨床組）', college: C, degree: '碩士班',
            aliases: ['物治所', '物治所臨床組', '物理治療', 'T6'], catalogDepts: ['物治所'],
            versions: [{
                fromYear: 0, label: `2026-05-04 更新${UNDATED}`,
                source: '物理治療學系網站「課程及畢業相關規定－必選修課程表」（2026-05-04 更新）',
                totalCredits: 24, thesisCredits: 6,
                requiredCourses: ['生物統計', '物理治療研究方法學', '物理治療專題討論(一)', '物理治療專題討論(二)', '物理治療專題討論(三)', '臨床藥物學', '臨床影像學'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '最低 30 學分（含論文 6）：必修 7（生物統計、物理治療研究方法學、物理治療專題討論(一)～(三)）、必選至少 10（須含臨床藥物學、臨床影像學）、選修 7。',
                    '四大高階專科技巧及論證需擇二（共 4 學分）；高階專科實作至少 2 學分，須包含自己指導教師領域。',
                    '實作先修條件：於臺灣完成 36 週以上之物理治療臨床實習。'
                ],
                uncertain: ['系網未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '物理治療學系碩士班（研究組）', college: C, degree: '碩士班',
            aliases: ['物治所研究組'], catalogDepts: ['物治所'],
            versions: [{
                fromYear: 0, label: `2026-05-04 更新${UNDATED}`,
                source: '物理治療學系網站「課程及畢業相關規定－必選修課程表」（2026-05-04 更新）',
                totalCredits: 24, thesisCredits: 6,
                requiredCourses: ['生物統計', '物理治療研究方法學', '物理治療專題討論(一)', '物理治療專題討論(二)', '物理治療專題討論(三)'],
                seminar: { mode: 'fixed', count: 0 },
                notes: ['最低 30 學分（含論文 6）：必修 7（生物統計、物理治療研究方法學、物理治療專題討論(一)～(三)）、選修至少 17。'],
                uncertain: ['系網未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '生理學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['生理所', '生理學科暨研究所', 'S3'], catalogDepts: ['生理所'],
            versions: [{
                fromYear: 0, label: `所網頁「課程概要」${UNDATED}`,
                source: '生理學科暨研究所網站「課程規劃－課程概要」',
                totalCredits: 24, thesisCredits: 6, seminarCreditsCount: true,
                requiredCourses: ['高等生理學', '研究方法導論', '分子生物學'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '最低畢業學分 30：必修 18（高等生理學 6、研究方法導論 2、專題討論(I)～(IV) 4、碩士論文 6），其餘 12 學分中需選本所三門課程。',
                    '分子生物學為必選。'
                ],
                uncertain: ['所網未寫外所上限，系統不設上限。']
            }]
        },
        {
            id: '臨床醫學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['臨醫所', '臨床醫學', 'S9'], catalogDepts: ['臨醫所'],
            versions: [
                clinicalMaster(115, ['轉譯醫學(一)', '轉譯醫學與臨床試驗特論', '分子細胞學(一)', '分子細胞學(二)']),
                clinicalMaster(114, ['轉譯醫學(一)', '轉譯醫學與臨床試驗特論', '分子細胞學(一)', '分子細胞學(二)', '學術原創研究經驗談'])
            ]
        },
        {
            id: '臨床醫學研究所碩士在職專班', college: C, degree: '碩士在職專班',
            aliases: ['臨醫在職', '臨醫碩專'], catalogDepts: ['臨醫所'],
            versions: [clinicalWorking(115), clinicalWorking(114)]
        },
        {
            id: '藥理學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['藥理所', '藥理學科暨研究所', 'S2'], catalogDepts: ['藥理所'],
            versions: [{
                fromYear: 0, label: `所網頁「修課規定」${UNDATED}`,
                source: '藥理學科暨研究所網站「研究生相關資訊－修課規定」',
                totalCredits: 24, thesisCredits: 6,
                requiredCourses: ['分子生物學', '分子藥理學', '實驗藥理學', '藥理學專題討論(一)', '藥理學專題討論(二)', '藥理學專題討論(三)', '藥理學專題討論(四)'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '須修滿 30 學分（含論文 6 學分）；必修共 12 學分：分子生物學 2、分子藥理學 3、實驗藥理學 3、藥理學專題討論(一)～(四) 4。',
                    '碩一下須提出論文研究題目報告；第二年上下學期須做研究進度報告；畢業前至少參加一次學術研討會。'
                ],
                uncertain: []
            }]
        },
        {
            id: '行為醫學研究所碩士班（臨床心理學組）', college: C, degree: '碩士班',
            aliases: ['行醫所', '行醫所臨心組', '行為醫學', 'S8'], catalogDepts: ['行醫所'],
            versions: [{
                fromYear: 0, label: `所網頁「課程介紹與畢業學分數要求」${UNDATED}`,
                source: '行為醫學研究所網站「課程介紹與畢業學分數要求」',
                totalCredits: 49, thesisCredits: 6,
                requiredCourses: ['專題討論', '專題研究', '研究設計', '行為與醫學', '臨床心理實習'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '必修：專題討論 4、專題研究 4、研究設計 3、行為與醫學 1；臨床心理學程必選修至少 21 學分（心理病理至少 9、心理衡鑑至少 6、心理治療至少 6）；臨床實習 16 學分；含論文合計至少 55 學分。',
                    '入學前須先修心理學 24 學分與統計學相關 3 學分。',
                    '臨床實習期間只能選修臨床心理學實習與碩士論文學分。'
                ],
                uncertain: []
            }]
        },
        {
            id: '行為醫學研究所碩士班（行為神經科學組／精神醫學組）', college: C, degree: '碩士班',
            aliases: ['行醫所行為神經科學組', '行醫所精神醫學組'], catalogDepts: ['行醫所'],
            versions: [{
                fromYear: 0, label: `所網頁「課程介紹與畢業學分數要求」${UNDATED}`,
                source: '行為醫學研究所網站「課程介紹與畢業學分數要求」',
                totalCredits: 24, thesisCredits: 6,
                requiredCourses: ['專題討論', '專題研究', '研究設計', '行為與醫學'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '碩士論文 6 學分以外，畢業學分須達 24 學分。',
                    '行為神經科學組必選 10 學分：行為神經藥物學 3、行為神經科學研究法 3、物質濫用專題(1～4) 各 1。',
                    '精神醫學組必選 8 學分：精神疾病之診斷與治療 2、生物精神醫學 2、精神藥物學(1)(2) 各 2。'
                ],
                uncertain: []
            }]
        },
        {
            id: '食品安全衛生暨風險管理研究所碩士班', college: C, degree: '碩士班',
            aliases: ['食安所', '食安衛所', '食品安全', 'SC'], catalogDepts: ['食安所'],
            versions: [{
                fromYear: 106, label: '106 學年度入學新生',
                source: '106 學年度食品安全衛生暨風險管理研究所課程規定',
                totalCredits: 26, thesisCredits: 6, seminarCreditsCount: true,
                requiredCourses: ['健康風險評估', '毒理學', '食品化學'],
                seminar: { mode: 'fixed', count: 4 },
                notes: ['畢業學分 26：必修 10（專題討論(一)～(四) 各 1、健康風險評估 2、毒理學 2、食品化學 2）、選修 16；論文 6 學分另計。'],
                uncertain: ['系統只收錄 106 學年度課程規定，107 學年度以後入學者沿用此版。', '規定未寫外所選修上限，系統不設上限。']
            }]
        },
        {
            id: '公共衛生研究所碩士班', college: C, degree: '碩士班',
            aliases: ['公衛所', '公共衛生', 'T8'], catalogDepts: ['公衛所'],
            versions: [{
                fromYear: 0, label: `所網頁課程規劃${UNDATED}`,
                source: '公共衛生研究所網站「必修專題討論」「必修／必選核心課」與畢業學分示意圖',
                totalCredits: 24, thesisCredits: 6,
                requiredCourses: ['公共衛生的歷史理念與實踐', '進階生物統計學'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '24 學分＝專題討論四學期（0 學分）＋必修一門（公共衛生的歷史理念與實踐 2）＋三組必選 6 學分＋選修 16 學分，另須 AREE 修課測驗證明。',
                    '必選核心：B 生物統計學（進階生物統計學）、C 流行病學（流行病學／流行病學分析二選一）、D 健康政策（健康與醫療的政治經濟學、健康促進理論與實踐等三選一）。'
                ],
                uncertain: []
            }]
        },
        {
            id: '生物化學暨分子生物學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['生化所', '生化暨分生所', '生化', 'S1'], catalogDepts: ['生化所'],
            versions: [{
                fromYear: 0, label: `所網頁「研究生畢業條件」${UNDATED}`,
                source: '生物化學暨分子生物學研究所網站「研究生畢業條件」',
                totalCredits: 24, thesisCredits: 6,
                seminar: { mode: 'fixed', count: 0 },
                notes: ['畢業學分 30：專業必修 14、專業選修至少 10、論文 6。', '須參加 2 次研究進度報告發表，並參與大學部生物化學實驗課程教育實習。', '學科考試及格才可交論文題目及摘要。'],
                uncertain: ['所網未寫專題討論學期數與外所上限，系統不檢查專題討論學期、外所不設上限。']
            }]
        },
        {
            id: '細胞生物與解剖學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['細胞所', '解剖所', '細胞生物', 'T9'], catalogDepts: ['細胞所'],
            versions: [{
                fromYear: 0, label: `2024.03.04 更新${UNDATED}`,
                source: '細胞生物與解剖學研究所碩士班研究生之畢業規定、修課須知（2024.03.04 更新）',
                totalCredits: 24, thesisCredits: 6,
                requiredCourses: ['細胞生物學', '分子生物學'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '最低畢業學分 30（含論文 6）：必修 12、選修 12；細胞生物學、分子生物學為必選。',
                    '暑修學分至多承認 4 學分；所有研究生須擔任至少一門本所課程之助教。'
                ],
                uncertain: ['規定未寫外所上限與專題討論學期數，系統不檢查專題討論學期、外所不設上限。']
            }]
        },
        {
            id: '醫學檢驗生物技術學系碩士班', college: C, degree: '碩士班',
            aliases: ['醫技所', '醫檢生技', 'T3'], catalogDepts: ['醫技所'],
            versions: [{
                fromYear: 114, label: '114 學年度入學（114.08～116.06 課程表）',
                source: '醫學檢驗生物技術學系碩士班 114 學年課程表（1131128 課程委員會決議）',
                totalCredits: 24, thesisCredits: 6, maxExternal: 8, maxWaived: 6, seminarCreditsCount: true,
                requiredCourses: ['實驗室管理及品管'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '總修畢業學分 24（必修 7、選修 17），完成碩士論文另得 6 學分。',
                    '非本系開授課程經指導教授簽章同意，最多可承認 8 學分為選修（外籍生不在此限）。',
                    '每學期應修專題討論；實驗室教學實習(一)～(四) 碩一、碩二每學年擇一必選。',
                    '新生抵免學分最多 6 學分（預研生不在此限）；非醫技系畢業者必選「實驗診斷學概論」。'
                ],
                uncertain: []
            }]
        },
        clinicalPharmacy('甲組', '臨床藥學組', 111, '甲組修業須知（111.7.20 修訂）',
            [], '畢業學分：必修 13、選修 11，碩士論文 6 學分另計；另有「必選修」應修畢；醫院藥事作業實習四週。',
            ['須知標題寫「116 學年度起入學生適用」但修訂日期為 111.7.20，系統以 111 學年度起套用。']),
        clinicalPharmacy('乙組', '生物藥劑及基因體組', 114, '乙組修業須知（114 學年度起入學）',
            [], '必修 11 學分、必選修 1 學分、其他選修，共計 24 學分（碩士論文 6 學分另計）。',
            ['系統只收錄 114 學年度起的版本，113 學年度以前入學者沿用此版。']),
        clinicalPharmacy('丙組', '藥物化學組', 110, '丙組修業須知（110 學年度起入學）',
            [], '必修 12 學分、其他選修，共計 24 學分（碩士論文 6 學分另計）。',
            []),
        {
            id: '工業衛生學科暨環境醫學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['環醫所', '環境醫學', '工衛環醫', 'S7'], catalogDepts: ['環醫所'],
            versions: [{
                fromYear: 0, label: `115.05.26 所務會議通過${UNDATED}`,
                source: '國立成功大學工業衛生學科暨環境醫學所課程（碩士班，115.05.26 所務會議通過）',
                totalCredits: 24, thesisCredits: 6, seminarCreditsCount: true,
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '畢業學分 24（論文 6 另計）：共同必修 12（專題討論(1)～(4) 4，生物統計、工業與環境衛生、環境毒物學、流行病學等選 3 門）、組內選修。',
                    '分甲（職業與環境衛生）、乙（環境毒物學與化學分析量測）、丙（流行病學、生物統計、職業醫學）三組；甲組選修 12 學分中組內需選 8 學分。'
                ],
                uncertain: ['規定未寫外所上限，系統不設上限。']
            }]
        },
        {
            id: '老年學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['老年所', '老年學', 'TC'], catalogDepts: ['老年所'],
            versions: [{
                fromYear: 0, label: `所修業辦法${UNDATED}`,
                source: '老年學研究所碩士班修業辦法及學位考試相關規定',
                totalCredits: 27, thesisCredits: 6,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['修畢至少 27 學分（含本所規定課程）：必修 15、選修至少 12，及 4 次專題討論。', '須通過一次研究論文進度報告；至少前一學期提出論文計畫書口頭報告。'],
                uncertain: ['辦法未寫論文學分，系統以 6 學分計算。']
            }]
        },
        {
            id: '職能治療學系碩士班', college: C, degree: '碩士班',
            aliases: ['職治所', '職能治療', 'T7'], catalogDepts: ['職治所'],
            versions: [{
                fromYear: 0, label: `研究生手冊${UNDATED}`,
                source: '職能治療學系碩士班研究生手冊',
                totalCredits: 24, thesisCredits: 6, seminarCreditsCount: true,
                requiredCourses: ['職能治療理論與應用', '基礎研究方法學'],
                seminar: { mode: 'fixed', count: 4 },
                notes: [
                    '畢業最低 30 學分（含論文 6）：必修 16（職能治療理論與應用 3、基礎研究方法學 3、專題討論(1-4) 4、論文 6）、選修至少 14。',
                    '需選修至少 2 門本系所教師開設之課程（不含獨立研究），及資料處理與統計分析相關課程；碩一修教學實習（上、下）0 學分。'
                ],
                uncertain: ['手冊未寫外所上限，系統不設上限。']
            }]
        },
        {
            id: '口腔醫學研究所碩士班', college: C, degree: '碩士班',
            aliases: ['口醫所', '口腔醫學', 'T4'], catalogDepts: ['口醫所'],
            versions: [{
                fromYear: 115, label: '115 學年度研究生手冊',
                source: '口腔醫學研究所研究生手冊（115）',
                totalCredits: 24, thesisCredits: 6,
                seminar: { mode: 'fixed', count: 4 },
                notes: ['碩士班畢業需修滿至少 30 學分（24 學分＋論文 6 學分），臨床牙科實習學分另計。', '專題討論(一～四) 每學期須口頭報告一次，並參加校內 3 次聯合專題演講；畢業前至少參加學術研討會 1 次並發表。', '經指導教授同意選修的外系所課程均認定為畢業學分。'],
                uncertain: ['系統只收錄 115 學年度手冊，114 學年度以前入學者沿用此版。']
            }]
        },
        {
            id: '護理學系碩士班', college: C, degree: '碩士班',
            aliases: ['護理所', '護理碩', 'T2'], catalogDepts: ['護理所'],
            versions: [{
                fromYear: 0, label: `研究生手冊${UNDATED}`,
                source: '護理學系碩士班研究生手冊',
                totalCredits: 30, thesisCredits: 6,
                seminar: { mode: 'fixed', count: 0 },
                notes: ['最低畢業學分 36（包括論文 6）：必修 27、選修 9（含論文）；必、選修課程科目見手冊表一。', '修業 2～4 年彈性修業。'],
                uncertain: ['手冊未寫外所上限，系統不設上限。']
            }]
        },
        {
            id: '健康照護科學研究所博士班', college: C, degree: '博士班',
            aliases: ['健照所', '健康照護', '健照博', 'TA'], catalogDepts: ['健照所'],
            versions: [{
                fromYear: 0, label: `研究生手冊${UNDATED}`,
                source: '國立成功大學健康照護科學研究所研究生手冊',
                totalCredits: 18, thesisCredits: 12,
                requiredCourses: ['健康照護專題討論(一)', '健康照護專題討論(二)', '健康照護專題討論(三)', '健康照護專題討論(四)', '獨立研究(一)', '獨立研究(二)', '獨立研究(三)', '獨立研究(四)', '臨床研究設計(一)', '臨床研究設計(二)'],
                seminar: { mode: 'fixed', count: 0 },
                notes: [
                    '畢業學分 30（臨心 A 組 35）：共同必修 12（健康照護專題討論(一)～(四)、獨立研究(一)～(四) 各 1、臨床研究設計(一)(二) 各 2）、跨領域研究群課程 6、論文 12、各組專業選修 0～5。',
                    '分臨床心理、臨床認知神經、物理治療、職能治療等組。'
                ],
                uncertain: ['臨心 A 組須 35 學分（不含論文 23 學分），系統以一般組 18 學分檢查。']
            }]
        }
    ]);
})();
