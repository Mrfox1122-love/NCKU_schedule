// ============================================================
// 📋 社會科學院 — 大學部必修科目表
// ============================================================

(function () {
    const SERVICE = seq('服務學習', 0, 3);

    // ── 法律學系 ──
    const lawCore = [
        ['民法總則', 3], ['憲法', 3], ['民法債編總論', 4], ['刑法總則', 4], ['民法物權編', 3], ['行政法', 4], ['刑法分則', 3],
        ['民法親屬編與繼承編', 3], ['民法債編各論', 4], ['刑事訴訟法', 4], ['民事訴訟法', 4], ['海商法', 2], ['票據法', 2],
        ['公司法', 3], ['保險法', 2]
    ];
    const lawCommon = ['非本系開設的法律類課程（如通識「法律與生活」「法學緒論」）不計入畢業學分。'];
    const lawNew = [
        '系定專業選修 36 學分：公法、民事法、刑事法、商法與科技智財法四學群任選 2 個，各至少 14 學分。',
        '一般自由選修 16 學分（本系選修或外系非法律類課程，不含通識）。',
        ...lawCommon
    ];
    const LAW_SOURCE = '國立成功大學法律學系學士班畢業規定及課程規劃';
    registerRequiredCourses('法律學系', [
        { fromYear: 114, label: '114 學年度起入學', source: LAW_SOURCE, required: lawCore, notes: lawNew },
        {
            fromYear: 111, label: '111～113 學年度入學', source: LAW_SOURCE, required: [...lawCore, ...SERVICE], notes: lawNew,
            uncertain: ['選修結構依 114 學年度規定（111.06.15 修正通過）整理，111～113 學年度的規定未逐年比對；必修科目各屆相同。']
        },
        {
            fromYear: 110, label: '110 學年度入學', source: LAW_SOURCE, required: [...lawCore, ...SERVICE],
            notes: [
                '系定專業選修 40 學分：相鄰學科 2、基礎法學 4、特別法 10、專題及實例研討 12、法學外文 4 學分以上。',
                '第二外文 4 學分；一般自由選修 8 學分。',
                ...lawCommon
            ]
        }
    ]);

    // ── 政治學系 ──
    const polCore = [
        ...seq('政治學概論', 3, 2), ['法學緒論', 3], ['中華民國憲法與政府', 3], ['行政學', 3], ['比較政治與政府', 3], ['國際關係', 3],
        ['政治哲學概論', 3], ['應用統計', 3], ['公共政策', 3], ...seq('政治學方法論', 3, 2), ['政治經濟學', 3]
    ];
    const polNotes = ['系開選修分政治理論與方法、公共行政、比較政治、國際關係 4 領域，每領域至少 5 學分。', '未修政治學概論（一）（二）者不得修習本系部分選修課程。'];
    const POL_SOURCE = '政治學系學士班課程結構表';
    registerRequiredCourses('政治學系', [
        { fromYear: 114, label: '114 學年度起入學', source: POL_SOURCE, required: [...polCore, ['經濟學', 3]], notes: polNotes },
        {
            fromYear: 112, label: '112～113 學年度入學', source: POL_SOURCE, required: [...polCore, ['經濟學', 3], ...SERVICE], notes: polNotes,
            uncertain: ['依 114 學年度結構表整理（社會學概論改為選修，必修 42 學分），112、113 學年度的結構表未逐一比對。']
        },
        { fromYear: 111, label: '111 學年度入學', source: POL_SOURCE, required: [...polCore, ['經濟學', 3], ['社會學概論', 3], ...SERVICE], notes: polNotes },
        {
            fromYear: 110, label: '110 學年度入學', source: POL_SOURCE,
            required: [...polCore, ...seq('經濟學原理', 3, 2), ['社會學概論', 3], ['兩岸關係', 3], ...SERVICE],
            notes: ['系開選修 25 學分，分 4 領域，每領域至少 5 學分。', polNotes[1]]
        }
    ]);

    // ── 經濟學系 ──
    const econCore = [
        ...seq('經濟學原理', 3, 2), ...seq('統計學', 3, 2), ...seq('會計學', 3, 2), ...seq('微積分', 3, 2), ...seq('總體經濟學', 3, 2),
        ...seq('個體經濟學', 3, 2), ['公共財政學', 3], ['貨幣銀行學', 3], ['國際貿易', 3], ['國際金融', 3]
    ];
    const econNotes = [
        '系定選修 27 學分：經濟分析工具領域必選 12 學分、應用經濟領域必選 15 學分。',
        '統計學、微積分可修統計系或理、工、電資學院同名課程；會計學可修管理學院的會計學或初級會計學（112 學年度起）。'
    ];
    const ECON_SOURCE = '國立成功大學經濟學系學士班課程結構表與修業規定';
    registerRequiredCourses('經濟學系', [
        { fromYear: 114, label: '114 學年度起入學', source: ECON_SOURCE, required: econCore, notes: econNotes },
        { fromYear: 110, label: '110～113 學年度入學', source: ECON_SOURCE, required: [...econCore, ...SERVICE], notes: econNotes }
    ]);

    // ── 心理學系 ──
    const psyCore = [
        ...seq('心理學概論', 3, 2), ...seq('心理與教育統計學', 3, 2), ['發展心理學', 3], ['社會心理學', 3], ...seq('心理實驗法', 3, 2),
        ['心理測驗', 3], ['性格心理學', 3], ['認知心理學', 3], ['生理心理學', 3], ['生理心理學實驗', 2]
    ];
    const psyNotes = ['專業選修 24 學分（本系開設的選修課均可認定），自由選修 35 學分。', '通識課程「心理學」不承認為畢業通識學分。'];
    const PSY_SOURCE = '國立成功大學心理系學士班學生修業規則';
    registerRequiredCourses('心理學系', [
        {
            fromYear: 115, label: '115 學年度起入學', source: PSY_SOURCE, required: [...psyCore, ['知覺心理學', 3]],
            notes: ['必要選修：「微積分（一）」或人工智慧、大數據、程式設計、數學及統計相關課程至少 3 學分（單門課，由系主任認列）。', ...psyNotes]
        },
        {
            fromYear: 114, label: '114 學年度入學', source: PSY_SOURCE, required: [...psyCore, ['知覺心理學', 3]],
            requiredElective: [['微積分（一）', 3]], notes: psyNotes
        },
        {
            fromYear: 111, label: '111～113 學年度入學', source: PSY_SOURCE, required: [...psyCore, ['知覺心理學', 3], ...SERVICE],
            requiredElective: [['微積分（一）', 3]], notes: psyNotes
        },
        {
            fromYear: 108, label: '108～110 學年度入學', source: PSY_SOURCE, required: [...psyCore, ['感覺與知覺', 3], ...SERVICE],
            requiredElective: [['微積分（一）', 3]], notes: psyNotes
        }
    ]);
})();
