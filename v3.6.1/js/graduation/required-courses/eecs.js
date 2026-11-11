// ============================================================
// 📋 電機資訊學院 — 大學部必修科目表
// ============================================================

(function () {
    // ── 電機工程學系：各學年度起入學生必修科目、學分數暨畢業總學分表（114.08.01）──
    const EE_SOURCE = '電機工程學系各學年度起入學生必修科目、學分數暨畢業總學分表（114.08.01）';
    const eeLabs = [['電工實驗', 1], ['邏輯系統實驗', 1], ['電機概論實驗', 1], ['電儀表學實驗', 1], ['控制工程實驗', 1], ['通訊實驗', 1]];
    const eeCommon = [
        ...seq('微積分', 3, 2), ...seq('普通物理學', 3, 2), ...seq('普通物理學實驗', 1, 2),
        ['線性代數', 3], ...seq('工程數學', 3, 2), ...seq('電路學', 3, 2), ...seq('電子電路實驗', 1, 2),
        ['電機概論', 3], ['電儀表學', 3], ['控制工程', 3], ...seq('電磁學', 3, 2)
    ];
    // 112 學年度前入學：計算機概論（一）（二）於 114-1 起改名為「計算機概論」「程式設計」
    const eeOldComputer = [['計算機概論（一）', 3, { aka: ['計算機概論'] }], ['計算機概論（二）', 3, { aka: ['程式設計'] }]];
    const eeService = seq('服務學習', 0, 3);

    registerRequiredCourses('電機工程學系', [
        {
            fromYear: 114, label: '114 學年度起入學', source: EE_SOURCE,
            required: [...eeCommon, ['計算機概論', 3], ['程式設計', 3], ...seq('電子學', 3, 2), ['專題討論', 1]],
            pick: [{ label: '實驗課程', min: 3, countsAs: 'elective', courses: eeLabs, note: '6 門至少選修 3 門且及格（計入專業選修）' }],
            requiredElective: [['邏輯系統', 3]],
            notes: ['外系課程至多承認 9 學分。']
        },
        {
            fromYear: 112, label: '112 學年度起入學', source: EE_SOURCE,
            required: [...eeService, ...eeCommon, ...eeOldComputer, ...seq('電子學', 3, 3), ['專題討論', 1]],
            pick: [{ label: '實驗課程', min: 3, countsAs: 'elective', courses: eeLabs, note: '6 門至少選修 3 門且及格（計入專業選修）' }],
            requiredElective: [['邏輯系統', 3]],
            notes: ['外系課程至多承認 9 學分，電機資訊學院課程額外至多承認 6 學分，合計至多 15 學分。']
        },
        {
            fromYear: 111, label: '111 學年度起入學', source: EE_SOURCE,
            required: [...eeService, ...eeCommon, ...eeOldComputer, ...seq('電子學', 3, 3)],
            pick: [{ label: '實驗課程', min: 3, countsAs: 'required', courses: eeLabs, note: '6 門自選 3 門（計入系定必修；第 4 門起可計入專業選修）' }],
            requiredElective: [['邏輯系統', 3], ['專題討論', 1]],
            notes: ['外系課程至多承認 9 學分，電機資訊學院課程額外至多承認 6 學分，合計至多 15 學分。']
        },
        {
            fromYear: 107, label: '107 學年度起入學', source: EE_SOURCE,
            required: [...eeService, ...eeCommon, ...eeOldComputer, ...seq('電子學', 3, 3)],
            pick: [{ label: '實驗課程', min: 3, countsAs: 'required', courses: eeLabs, note: '6 門自選 3 門（計入系定必修；第 4 門起可計入專業選修）' }],
            requiredElective: [['邏輯系統', 3], ['資料結構緒論', 3], ['專題討論', 1]],
            notes: ['外系課程至多承認 9 學分，電機資訊學院課程額外至多承認 6 學分，合計至多 15 學分。']
        }
    ]);

    // ── 資訊工程學系：修課及畢業規定（中英對照版）──
    const CSIE_SOURCE = '國立成功大學資訊工程學系修課及畢業規定（Guidelines for Course Taking and Degree Completion）';
    const csieCore = [
        ...seq('程式設計', 3, 2), ['線性代數', 3], ['數位電路導論', 3], ['資料結構', 3], ['數位系統導論', 3], ['數位系統實驗', 1],
        ['機率與統計', 3, { aka: ['機率統計'] }], ['計算機組織', 3], ['離散數學', 3], ['演算法', 3], ['作業系統', 3], ['微算機原理與應用（含實驗）', 4, { aka: ['微算機原理與應用'] }],
        ['編譯系統', 3], ...seq('資訊專題', 2, 2), ...seq('微積分', 3, 2), ...seq('普通物理學', 3, 2)
    ];
    const csieNotes = [
        '大三上須選修「資訊專題（一）」並確定專題指導老師；大三下須選修「資訊專題（二）」並參與畢業專題實作發表。',
        '必修科目第一次修習須選本系開授課程；不及格者方可修讀他系等同課程。',
        '系上專業選修須修滿 21 學分以上，外系選修至多承認 21 學分。'
    ];

    registerRequiredCourses('資訊工程學系', [
        {
            fromYear: 114, label: '114 學年度起入學', source: CSIE_SOURCE,
            required: [...csieCore, ['電腦網路概論', 3]],
            notes: csieNotes
        },
        {
            fromYear: 109, label: '109～113 學年度入學', source: CSIE_SOURCE,
            required: [...csieCore, ['電腦網路概論', 3], ...seq('服務學習', 0, 3)],
            notes: csieNotes
        },
        {
            fromYear: 106, label: '106～108 學年度入學', source: CSIE_SOURCE,
            required: [...csieCore, ['計算機概論', 3], ['工程數學', 3], ['計算理論', 3], ...seq('服務學習', 0, 3)],
            notes: csieNotes
        }
    ]);
})();
