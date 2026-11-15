// ============================================================
// 📋 管理學院 — 大學部必修科目表
// ============================================================

(function () {
    const SERVICE = seq('服務學習', 0, 3);

    // ── 統計與資料科學學系 ──
    const statBase = [
        ['線性代數', 3], ['計算機概論', 3], ...seq('統計學', 3, 2), ...seq('微積分', 3, 2), ['管理學', 3], ...seq('會計學', 3, 2),
        ['抽樣調查', 3], ['迴歸分析', 3], ...seq('數理統計', 3, 2), ['實驗設計', 3], ['多變量分析', 3]
    ];
    const statPick = [
        { label: '調查實務', min: 1, countsAs: 'required', courses: [['統計調查實務', 1], ['市場調查實務', 1]], note: '二選一' },
        { label: '統計實務', min: 1, countsAs: 'required', courses: [['統計諮詢', 3], ['統計資料分析', 3]], note: '二選一' }
    ];
    const statNotes = ['「程式設計」為必選（二上），及格列入選修學分。'];
    const STAT_SOURCE = '國立成功大學統計學系畢業生應修科目及學分數一覽表';
    registerRequiredCourses('統計與資料科學學系', [
        {
            fromYear: 115, label: '115 學年度起入學', source: STAT_SOURCE, pick: statPick, notes: statNotes,
            required: [...statBase, ['機率概論', 3], ['資料科學導論', 3], ['機器學習', 3], ['統計計算與模擬', 3], ['最佳化方法與應用', 3]],
            uncertain: ['115 學年度一覽表未列「經濟學（一）（二）」與「類別資料分析」，這裡依表列處理（合計 64 學分）。', '「最佳化方法與應用」為 115 學年度新課，開課資料尚無紀錄，課程地圖暫時無法標出年級學期（表定三下）。']
        },
        {
            fromYear: 114, label: '114 學年度入學', source: STAT_SOURCE, pick: statPick, notes: statNotes,
            required: [...statBase, ...seq('經濟學', 3, 2), ['類別資料分析', 3], ['機率概論', 3]]
        },
        {
            fromYear: 111, label: '111～113 學年度入學', source: STAT_SOURCE, pick: statPick,
            required: [...statBase, ...seq('經濟學', 3, 2), ['類別資料分析', 3], ['無母數統計', 3], ...SERVICE],
            notes: ['「程式設計」「機率概論」為必選，及格列入選修學分。']
        }
    ]);

    // ── 會計學系 ──
    const acctCore = [
        ...seq('初級會計學', 3, 2).map(([n, c]) => [`${n}及實習`, c, { aka: [n] }]),
        ...seq('經濟學', 3, 2), ['微積分（一）', 3],
        ['中級會計學（一）及實習', 4, { aka: ['中級會計學（一）'] }], ['中級會計學（二）及實習', 4, { aka: ['中級會計學（二）'] }],
        ['中級會計學（三）及實習', 4, { aka: ['中級會計學（三）'] }],
        ['成本會計學（一）及實習', 3, { aka: ['成本會計學（一）', '成本會計（一）'] }], ['成本會計學（二）及實習', 3, { aka: ['成本會計學（二）', '成本會計（二）'] }],
        ...seq('統計學', 3, 2), ['基本財務學', 3],
        ...seq('高級會計學', 3, 2).map(([n, c]) => [`${n}及實習`, c, { aka: [n] }]),
        ['公司法及商業會計法', 3], ['企業資源規劃與資料探勘', 3],
        ...seq('審計學', 3, 2).map(([n, c]) => [`${n}及實習`, c, { aka: [n] }])
    ];
    const acctElective = [['民法概要', 3], ['微積分（二）', 3], ['管理學', 3], ['衍生性金融商品導論', 3], ['財務報表分析', 3], ['所得稅法', 3]];
    const ACCT_SOURCE = '會計系日間部學士班必選科目表';
    registerRequiredCourses('會計學系', [
        { fromYear: 114, label: '114 學年度起入學', source: ACCT_SOURCE, required: acctCore, requiredElective: acctElective, notes: ['選修 40 學分（含必選）。'] },
        { fromYear: 106, label: '106～113 學年度入學', source: ACCT_SOURCE, required: [...acctCore, ...SERVICE], requiredElective: acctElective, notes: ['選修 40 學分（含必選）。'] }
    ]);

    // ── 交通管理科學系 ──
    const tcmCore = [
        ['運輸學', 3], ['公共運輸', 3], ...seq('會計學', 3, 2), ...seq('經濟學', 3, 2), ...seq('微積分', 3, 2), ['計算機概論', 3], ['計算機程式', 3],
        ['管理學', 3], ['運輸工程', 3], ...seq('統計學', 3, 2), ['管理數學', 3], ['交通工程', 3],
        ['作業研究', 3], ['運輸規劃', 3], ['財務管理', 3], ['運輸經濟', 3], ['運輸管理', 3], ['運輸安全', 3]
    ];
    const tcmNotes = [
        '大二下分旅客運輸、物流管理、運輸科技、電信管理 4 領域，須主修一個領域並修畢該領域規定課程。',
        '必修課程不得至外系選課（重修者例外）。'
    ];
    const TCM_SOURCE = '交管系入學新生選課規定';
    registerRequiredCourses('交通管理科學系', [
        { fromYear: 114, label: '114 學年度起入學', source: TCM_SOURCE, required: tcmCore, requiredElective: [['專題研究（一）', 2]], notes: tcmNotes },
        { fromYear: 110, label: '110～113 學年度入學', source: TCM_SOURCE, required: [...tcmCore, ...SERVICE], requiredElective: [['專題研究（一）', 2]], notes: tcmNotes }
    ]);

    // ── 企業管理學系 ──
    const baCore = [
        ['管理學', 3], ['財務管理', 3], ['人力資源管理', 3], ...seq('統計學', 3, 2), ...seq('微積分', 3, 2), ...seq('會計學', 3, 2),
        ...seq('經濟學', 3, 2), ['行銷管理', 3], ['組織行為', 3], ['作業管理', 3], ['企業政策', 3], ['資訊管理', 3]
    ];
    const BA_SOURCE = '企管系學士班畢業學分試算表';
    const baUncertain = ['試算表只列科目名稱，學分依每科 3 學分計算（與必修合計相符）。'];
    registerRequiredCourses('企業管理學系', [
        { fromYear: 114, label: '114 學年度起入學', source: BA_SOURCE, required: [...baCore, ['商事法', 3]], notes: ['本系專業選修至少 25 學分，外系選修至多 24 學分。'], uncertain: baUncertain },
        { fromYear: 111, label: '111～113 學年度入學', source: BA_SOURCE, required: [...baCore, ['商事法', 3], ...SERVICE], notes: ['本系專業選修至少 25 學分，外系選修至多 24 學分。'], uncertain: baUncertain },
        { fromYear: 110, label: '110 學年度入學', source: BA_SOURCE, required: [...baCore, ...SERVICE], notes: ['本系專業選修至少 28 學分，外系選修至多 24 學分。'], uncertain: baUncertain }
    ]);

    // ── 工業與資訊管理學系 ──
    const iimCore = [
        ...seq('微積分', 3, 2), ...seq('經濟學', 3, 2), ['工業管理概論', 3], ['計算機概論', 3], ['資訊管理概論', 3],
        ['計算機程式與應用', 3, { aka: ['計算機程式及應用'] }], ...seq('統計學', 3, 2), ['會計學', 3], ['管理學', 3], ['資料結構', 3],
        ['作業研究', 3], ['資料庫管理', 3], ['系統分析與設計', 3], ['品質管理', 3], ['生產與作業管理', 3], ['行銷管理', 3]
    ];
    const iimElective = [['工業與資訊管理專題（一）', 1], ['工業與資訊管理專題（二）', 2]];
    const iimNotes = ['專業選修分生產與作業管理、資訊科技、管理科學三組，主修組至少 9 學分，另兩組合計至少 9 學分（各至少 3 學分）。'];
    const IIM_SOURCE = '國立成功大學工業與資訊管理學系學士班選課辦法與課程規劃';
    registerRequiredCourses('工業與資訊管理學系', [
        {
            fromYear: 114, label: '114 學年度起入學', source: IIM_SOURCE, required: iimCore, requiredElective: iimElective, notes: iimNotes,
            uncertain: ['114 學年度選課辦法未附課程規劃表，必修科目依 109 學年度起的課程規劃整理（學分數相同）。']
        },
        { fromYear: 109, label: '109～113 學年度入學', source: IIM_SOURCE, required: [...iimCore, ...SERVICE], requiredElective: iimElective, notes: iimNotes }
    ]);
})();
