// ============================================================
// 📋 文學院 — 大學部必修科目表
// ============================================================

(function () {
    const SERVICE = seq('服務學習', 0, 3);

    // ── 中國文學系 ──
    const chineseCore = [
        ...seq('國學導讀', 2, 2), ...seq('文學概論', 2, 2), ...seq('歷代文選及習作', 2, 2), ...seq('詩選及習作', 3, 2),
        ...seq('文字學', 3, 2), ...seq('中國文學史', 3, 2), ...seq('詞選及習作', 2, 2), ['曲選及習作', 2],
        ...seq('聲韻學', 3, 2), ...seq('中國思想史', 3, 2)
    ];
    const chineseNotes = [
        '一學年的課程須修完上、下學期才可取得學分。',
        '可承認外系必選修 10 學分、國外學校 6 學分；微學分最多承認 2 學分。'
    ];
    const CHINESE_SOURCE = '中國文學系畢業學分規定';
    registerRequiredCourses('中國文學系', [
        { fromYear: 114, label: '114 學年度起入學', source: CHINESE_SOURCE, required: chineseCore, notes: ['專業選修至少 52 學分。', ...chineseNotes] },
        {
            fromYear: 110, label: '110～113 學年度入學', source: CHINESE_SOURCE,
            required: [...chineseCore, ...seq('現代戲劇欣賞及習作', 2, 2), ...seq('現代小說欣賞及習作', 2, 2), ...SERVICE],
            notes: ['專業選修至少 44 學分。', ...chineseNotes]
        }
    ]);

    // ── 台灣文學系 ──
    const twLangPick = [{
        label: '台灣語言基礎及寫作', min: 4, countsAs: 'required',
        courses: [
            ...seq('台灣語言基礎及寫作（台語）', 2, 2), ...seq('台灣語言基礎及寫作（客語）', 2, 2), ...seq('台灣語言基礎及寫作（原住民語）', 2, 2)
        ],
        note: '台語、客語、原住民語三選二，各修（一）（二）共 8 學分；第三種語言可取代大學國文或計入專業選修'
    }];
    const twCore = [
        ['台灣歷史與文化', 3], ['文化與社會基本議題', 3], ['文學文本解讀', 3], ...seq('語言學概論', 2, 2),
        ...seq('台灣文學史', 3, 3), ...seq('文學理論與批評', 2, 2), ['文化研究', 3]
    ];
    const twNotes = ['專業必修須修習本系開設的課程。', '外系選修最多承認 30 學分（國際語言課程最多 4 學分）。'];
    const TW_SOURCE = '國立成功大學台灣文學系大學部學生手冊';
    registerRequiredCourses('台灣文學系', [
        { fromYear: 114, label: '114 學年度起入學', source: TW_SOURCE, required: twCore, pick: twLangPick, notes: ['專業選修至少 63 學分。', ...twNotes] },
        { fromYear: 113, label: '113 學年度入學', source: TW_SOURCE, required: [...twCore, ...SERVICE], pick: twLangPick, notes: ['專業選修至少 63 學分。', ...twNotes] },
        {
            fromYear: 110, label: '110～112 學年度入學', source: TW_SOURCE, required: [...twCore, ['台灣文學縱觀', 2], ...SERVICE],
            pick: twLangPick, notes: ['專業選修至少 61 學分。', ...twNotes],
            uncertain: ['「台灣文學縱觀」在 111 學年度以後的開課資料中找不到，課程地圖無法標出年級與學期（手冊列為大一上）。']
        }
    ]);

    // ── 歷史學系 ──
    const historyCore = [
        ...seq('中國通史', 3, 2), ['台灣史（一）', 3, { aka: ['臺灣史（一）'] }], ['台灣史（二）', 3, { aka: ['臺灣史（二）'] }], ...seq('史學理論與方法', 3, 2), ['史學名著導讀', 3], ['史學專題講座', 0]
    ];
    const historyPick = [{
        label: '世界文化史', min: 2, countsAs: 'required', courses: seq('世界文化史', 3, 4),
        note: '（一）～（四）每學期輪流開課，四選二（多修計入世界史領域）'
    }];
    const historyNotes = [
        '「史學名著導讀」依中國史、臺灣史、世界史輪流開課，至少必修一門（多修計入該領域選修）。',
        '「史學專題講座」0 學分，畢業前至少須聽講 10 場。',
        '選修外系課程至少 4 學分、至多承認 16 學分；一學年的課程須修完（一）（二）才採計。'
    ];
    const HISTORY_SOURCE = '國立成功大學歷史學系學士班手冊';
    registerRequiredCourses('歷史學系', [
        {
            fromYear: 114, label: '114 學年度起入學', source: HISTORY_SOURCE, required: historyCore, pick: historyPick,
            notes: ['中國史、世界史、臺灣史每一領域至少修本系課程 6 學分。', ...historyNotes]
        },
        {
            fromYear: 112, label: '112～113 學年度入學', source: HISTORY_SOURCE, required: [...historyCore, ...SERVICE], pick: historyPick,
            notes: ['中國史、世界史、臺灣史每一領域至少修本系課程 6 學分。', ...historyNotes]
        },
        {
            fromYear: 110, label: '110～111 學年度入學', source: HISTORY_SOURCE, required: [...historyCore, ...SERVICE], pick: historyPick,
            notes: ['中國史、世界史、臺灣史每一領域至少修本系課程 12 學分。', ...historyNotes]
        }
    ]);

    // ── 外國語文學系 ──
    const fllCore = [...seq('英文作文', 3, 4), ...seq('英語口語訓練', 3, 4), ['西洋文學概論', 3], ['文學作品導讀', 3], ...seq('語言學概論', 3, 2)];
    const fllPick = [{
        label: '第二外語', min: 4, countsAs: 'required',
        courses: ['日文', '德文', '法文', '西班牙文'].flatMap(lang => seq(lang, 3, 4)),
        note: '日文、德文、法文、西班牙文擇一語言修（一）～（四）共 12 學分'
    }];
    const fllNotes = [
        '外文系必選 18 學分：文學專業必選至少三門 9 學分、語言學及語言教學專業必選至少三門 9 學分。',
        '外文系選修至少 34 學分，其中外系選修至多承認 16 學分。'
    ];
    const fllUncertain = ['依外文系網站的畢業學分說明整理（未分入學學年度）；第二外語以「同一語言修（一）～（四）」處理。'];
    const FLL_SOURCE = '外國語文學系大學部畢業學分說明（系網）';
    registerRequiredCourses('外國語文學系', [
        { fromYear: 114, label: '114 學年度起入學', source: FLL_SOURCE, required: fllCore, pick: fllPick, notes: fllNotes, uncertain: fllUncertain },
        { fromYear: 110, label: '113 學年度以前入學', source: FLL_SOURCE, required: [...fllCore, ...SERVICE], pick: fllPick, notes: fllNotes, uncertain: fllUncertain }
    ]);
})();
