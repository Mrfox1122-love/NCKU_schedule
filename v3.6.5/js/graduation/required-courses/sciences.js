// ============================================================
// 📋 理學院 — 大學部必修科目表
// ============================================================

(function () {
    const SERVICE = seq('服務學習', 0, 3);

    // ── 數學系 ──
    const mathCore = [
        ['數學導論', 3], ...seq('微積分', 4, 2), ...seq('線性代數', 3, 2), ...seq('普通物理學', 3, 2),
        ['計算機概論與程式語言', 3, { aka: ['計概與程式語言'] }], ...seq('代數學', 3, 2), ...seq('高等微積分', 4, 2), ['機率導論', 3], ['微分方程導論', 3]
    ];
    const mathPickCourses = [['幾何學（一）', 3], ['複變數函數論', 3], ['初等分析', 3], ['應用分析', 3], ['數值分析（一）', 3], ['偏微分方程導論', 3]];
    const mathPick = courses => [{
        label: '核心選讀', min: 3, countsAs: 'required', courses,
        note: `${courses.length} 科至少選 3 科（計入必修）`
    }];
    const mathNotes = [
        '數學相關選修至少 33 學分，其中本系（所）課程不少於 21 學分（三、四年級或研究所選修課至少 3 門）。',
        '其他外系課程（非通識必修、教育學程）至多 12 學分。'
    ];
    const MATH_SOURCE = '數學系學年度新生入學課程規定及注意事項';
    registerRequiredCourses('數學系', [
        { fromYear: 114, label: '114 學年度起入學', source: MATH_SOURCE, required: mathCore, pick: mathPick(mathPickCourses), notes: mathNotes },
        { fromYear: 112, label: '112～113 學年度入學', source: MATH_SOURCE, required: [...mathCore, ...SERVICE], pick: mathPick(mathPickCourses), notes: mathNotes },
        {
            fromYear: 108, label: '108～111 學年度入學', source: MATH_SOURCE, required: [...mathCore, ...SERVICE],
            pick: mathPick([...mathPickCourses, ['科學計算導論', 3]]), notes: mathNotes
        }
    ]);

    // ── 物理學系 ──
    const physCore = [
        ...seq('微積分', 3, 2), ...seq('普通物理學', 4, 2), ...seq('普通物理學實驗', 1, 2), ...seq('普通化學', 3, 2), ...seq('普通化學實驗', 1, 2),
        ...seq('物理數學', 3, 2), ...seq('力學', 3, 2), ...seq('電磁學', 3, 2), ...seq('物理實驗', 2, 4),
        ['光學', 3], ['熱力學', 3], ...seq('量子物理', 3, 2)
    ];
    const physNotes = ['選修至少 40 學分，其中本系（物理系所開授）選修至少 15 學分。'];
    const PHYS_SOURCE = '物理學系大學部學生手冊（2025.09 版）';
    registerRequiredCourses('物理學系', [
        { fromYear: 114, label: '114 學年度起入學', source: PHYS_SOURCE, required: physCore, notes: physNotes },
        { fromYear: 106, label: '106～113 學年度入學', source: PHYS_SOURCE, required: [...physCore, ...SERVICE], notes: physNotes }
    ]);

    // ── 化學系 ──
    const chemCore = [
        ...seq('普通化學', 3, 2), ...seq('普通化學實驗', 1, 2), ...seq('微積分', 3, 2), ...seq('普通物理學', 3, 2), ...seq('普通物理學實驗', 1, 2),
        ['化學數學', 3], ...seq('有機化學', 4, 2), ...seq('物理化學', 3, 2), ...seq('有機化學實驗', 1, 2),
        ...seq('無機化學', 3, 2), ...seq('分析化學', 3, 2), ...seq('物理化學實驗', 1, 2), ...seq('分析化學實驗', 1, 2), ...seq('書報討論', 1, 2)
    ];
    const chemNotes = ['本系選修至少 17 學分，外系選修至多 24 學分。'];
    const CHEM_SOURCE = '國立成功大學化學系學士班各學年度入學適用畢業應修學分數';
    registerRequiredCourses('化學學系', [
        { fromYear: 114, label: '114 學年度起入學', source: CHEM_SOURCE, required: chemCore, notes: chemNotes },
        { fromYear: 111, label: '111～113 學年度入學', source: CHEM_SOURCE, required: [...chemCore, ...SERVICE], notes: chemNotes },
        {
            fromYear: 110, label: '110 學年度入學', source: CHEM_SOURCE, required: [...chemCore, ...SERVICE],
            notes: ['本系選修至少 24 學分，外系選修至多 17 學分。', '自 112 學年度起刪除大三「化學文獻」，110 學年度入學者無須修習。']
        }
    ]);

    // ── 地球科學系 ──
    const earthCore = [
        ...seq('微積分', 3, 2), ...seq('普通物理學', 3, 2), ...seq('普通物理學實驗', 1, 2), ...seq('普通化學', 3, 2), ...seq('普通化學實驗', 1, 2),
        ...seq('地球科學概論', 3, 2), ...seq('地球科學概論實習', 1, 2), ['礦物學', 2], ['礦物學實習', 1], ['地史學', 3], ['地史學實習', 1],
        ['岩石學', 3], ['岩石學實習', 1], ['構造地質學', 2], ['構造地質學實習', 1], ['野外地質學', 2], ['野外地質訓練（一）', 3], ['野外地質訓練（二）', 2]
    ];
    const earthNotes = [
        '專業選修至少 53 學分：必選「專題研究」2 學期，另選核心科目 5 科（至少 2 個課程領域，其中 3 科同一領域：岩礦地化、地球物理、應用地質）。',
        '外系選修至多 12 學分；通識課程一律不採計為專業選修。'
    ];
    const EARTH_SOURCE = '國立成功大學地球科學系學士班修習課程規定';
    registerRequiredCourses('地球科學系', [
        {
            fromYear: 114, label: '114 學年度起入學', source: EARTH_SOURCE, required: earthCore, notes: earthNotes,
            uncertain: ['系上 113 學年度起的規定仍列服務學習（一）～（三），但學校自 114 學年度起已取消服務學習必修，這裡不列入。']
        },
        { fromYear: 110, label: '110～113 學年度入學', source: EARTH_SOURCE, required: [...earthCore, ...SERVICE], notes: earthNotes }
    ]);

    // ── 光電科學與工程學系 ──
    const optoCore = [
        ['普通化學實驗', 1], ['光電科技概論', 3], ...seq('普通物理學', 3, 2), ...seq('普通物理學實驗', 1, 2), ...seq('微積分', 3, 2),
        ...seq('普通化學', 3, 2), ['計算機概論', 3], ...seq('工程數學', 3, 3), ...seq('電子學', 3, 2), ...seq('電磁學', 3, 2),
        ...seq('光學', 3, 2), ...seq('電子學實驗', 1, 2), ...seq('光電實驗', 1, 2), ['近代物理', 3], ...seq('光電子學導論', 3, 2)
    ];
    const optoNotes = [
        '系定專業選修 15 學分：4 大領域任選 2 領域，主修領域至少 3 門、副修領域至少 2 門，須為表定課程。',
        '光電專題（三）（四）不納入畢業學分。'
    ];
    const OPTO_SOURCE = '光電科學與工程學系課程結構表';
    registerRequiredCourses('光電科學與工程學系', [
        { fromYear: 114, label: '114 學年度起入學', source: OPTO_SOURCE, required: optoCore, notes: optoNotes },
        { fromYear: 111, label: '111～113 學年度入學', source: OPTO_SOURCE, required: [...optoCore, ...SERVICE], notes: optoNotes },
        { fromYear: 110, label: '110 學年度入學', source: OPTO_SOURCE, required: [...optoCore, ['光電專題（一）', 1], ...SERVICE], notes: optoNotes }
    ]);
})();
