// ============================================================
// 🎓 TimeFlow v3.4.3 — 碩士班畢業檢核畫面 (master-ui.js)
// ============================================================

const MASTER_ENTRY_YEARS = [115, 114, 113, 112, 111, 110];

function isMasterMode(data = appData) {
    return data && data.degree === 'master';
}

/**
 * 切換學制（大學部 / 碩士班）
 */
function setDegree(degree) {
    appData.degree = degree === 'master' ? 'master' : 'bachelor';
    if (typeof saveData === 'function') saveData();
    updateAppUI();
}

function updateMasterConfig(field, value) {
    if (field === 'masterProgram') {
        const program = value === CUSTOM_MASTER_PROGRAM ? null : findMasterProgram(value);
        if (program) appData.masterProgram = program.id;
        else if (value === CUSTOM_MASTER_PROGRAM) appData.masterProgram = value;
    }
    if (field === 'masterEntryYear') appData.masterEntryYear = parseInt(value, 10) || appData.masterEntryYear;
    if (field === 'masterDuration' && ['1', '1.5', '2'].includes(value)) appData.masterDuration = value;
    if (field === 'masterEthicsHours') appData.masterEthicsHours = Math.max(0, Math.min(99, parseFloat(value) || 0));
    saveData();
    updateAppUI();
}

/**
 * 自訂所別的規則欄位（課程清單以「、」或逗號分隔，抵免上限留空表示不限）
 */
function updateMasterCustom(field, value) {
    const custom = { ...(appData.masterCustom || DEFAULT_MASTER_CUSTOM) };
    if (field === 'requiredCourses' || field === 'remedial') {
        custom[field] = String(value || '').split(/[、,，]/);
    } else if (field === 'maxWaived') {
        custom.maxWaived = String(value).trim() === '' ? null : value;
    } else {
        custom[field] = value;
    }
    appData.masterCustom = normalizeMasterCustom(custom);
    saveData();
    updateAppUI();
}

function toggleMasterRemedial(index, checked) {
    const rule = getMasterRule(appData.masterProgram, appData.masterEntryYear, appData.masterCustom);
    const name = rule.remedial[index];
    if (!name) return;
    appData.masterRemedialDone = appData.masterRemedialDone || {};
    if (checked) appData.masterRemedialDone[name] = true;
    else delete appData.masterRemedialDone[name];
    saveData();
    updateAppUI();
}

// ── 所別選擇器：顯示全名，依學院分組，可用全名、縮寫或系所代碼搜尋 ──
function renderMasterProgramOptions(keyword, currentKey) {
    const programs = searchMasterPrograms(keyword);
    const option = p => {
        const shortName = p.aliases.find(a => /[一-鿿]/.test(a)) || '';
        return `
            <button type="button" class="master-program-option ${p.id === currentKey ? 'active' : ''}" data-program="${escapeHTML(p.id)}" onclick="pickMasterProgram(this.dataset.program)">
                <span>${escapeHTML(p.id)}</span><span class="alias">${escapeHTML(shortName)}</span>
            </button>`;
    };
    const customOption = `
        <div class="master-program-group">找不到你的所？</div>
        <button type="button" class="master-program-option ${currentKey === CUSTOM_MASTER_PROGRAM ? 'active' : ''}" data-program="${CUSTOM_MASTER_PROGRAM}" onclick="pickMasterProgram(this.dataset.program)">
            <span>＋ 自訂其他所別</span><span class="alias">自行填寫門檻</span>
        </button>`;

    if (!programs.length) return `<div class="master-program-empty">找不到符合「${escapeHTML(keyword)}」的所別</div>${customOption}`;

    // 有搜尋字時依符合程度排序，不分組；未搜尋時依學院分組
    if (String(keyword || '').trim()) return programs.map(option).join('') + customOption;
    const groups = MASTER_COLLEGE_ORDER
        .map(college => ({ college, items: programs.filter(p => p.college === college) }))
        .filter(g => g.items.length);
    return groups.map(g => `<div class="master-program-group">${escapeHTML(g.college)}</div>${g.items.map(option).join('')}`).join('') + customOption;
}

function toggleMasterProgramPicker(open) {
    const popover = document.getElementById('masterProgramPopover');
    if (!popover) return;
    const willOpen = typeof open === 'boolean' ? open : popover.hidden;
    popover.hidden = !willOpen;
    document.getElementById('masterProgramBtn')?.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
        // 窄螢幕時往左移，保持距離畫面右緣 16px
        popover.style.left = '';
        const overflow = popover.getBoundingClientRect().right - (window.innerWidth - 16);
        if (overflow > 0) popover.style.left = `${-overflow}px`;
        const input = document.getElementById('masterProgramSearch');
        if (input) { input.value = ''; filterMasterProgramPicker(''); input.focus(); }
        popover.querySelector('.master-program-option.active')?.scrollIntoView({ block: 'nearest' });
    }
}

function filterMasterProgramPicker(keyword) {
    const list = document.getElementById('masterProgramList');
    if (list) list.innerHTML = renderMasterProgramOptions(keyword, appData.masterProgram);
}

function pickMasterProgram(key) {
    toggleMasterProgramPicker(false);
    updateMasterConfig('masterProgram', key);
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
        const popover = document.getElementById('masterProgramPopover');
        if (popover && !popover.hidden && !e.target.closest('.master-program-pill')) toggleMasterProgramPicker(false);
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const popover = document.getElementById('masterProgramPopover');
        if (popover && !popover.hidden) toggleMasterProgramPicker(false);
    });
}

/**
 * 課程編輯器的類別選單改為碩士班類別
 */
function updateMasterCourseTypeOptions() {
    const select = document.getElementById('courseType');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = `
        <optgroup label="碩士班課程">
            ${MASTER_COURSE_TYPES.map(t => `<option value="${escapeHTML(t.value)}">${escapeHTML(t.label)}</option>`).join('')}
        </optgroup>
    `;
    if ([...select.options].some(o => o.value === currentVal)) select.value = currentVal;
}

// 找課「類別」篩選：依學制只顯示該學制的類別
const DISCOVER_TYPE_OPTIONS = {
    bachelor: [
        ['all', '全部'], ['系定必修', '系定必修'], ['選修-本系', '選修-本系'], ['選修-外系', '選修-外系'],
        ['通識', '通識（全部領域）'], ['通識-人文', '通識-人文'], ['通識-社科', '通識-社科'], ['通識-自然', '通識-自然'],
        ['通識-生醫', '通識-生醫'], ['通識-科際', '通識-科際'], ['融通', '融通'],
        ['國文/英文/體育/軍訓', '國文 / 英文 / 體育 / 軍訓'], ['第二外語', '第二外語']
    ],
    master: [
        ['all', '全部'], ['本所必修', '本所必修'], ['本所選修', '本所選修'], ['外所選修', '外所選修'],
        ['專題討論', '專題討論'], ['大學部課程', '大學部課程（不計學分）']
    ]
};

function updateDiscoverTypeFilter(isMaster) {
    const select = document.getElementById('filterDiscoverType');
    const mode = isMaster ? 'master' : 'bachelor';
    if (!select || select.dataset.mode === mode) return;
    const current = select.value;
    select.innerHTML = DISCOVER_TYPE_OPTIONS[mode]
        .map(([value, label]) => `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join('');
    select.dataset.mode = mode;
    const kept = DISCOVER_TYPE_OPTIONS[mode].some(([value]) => value === current);
    select.value = kept ? current : 'all';
    // 原本選的類別在新學制不存在時，重新套用篩選
    if (!kept && typeof handleDiscoverSearch === 'function' && window.COURSE_CATALOG) handleDiscoverSearch();
}

function applyDegreeLayout(isMaster) {
    updateDiscoverTypeFilter(isMaster);
    const masterPanel = document.getElementById('masterGradPanel');
    const bachelorPanel = document.getElementById('bachelorGradPanel');
    if (masterPanel) masterPanel.style.display = isMaster ? '' : 'none';
    if (bachelorPanel) bachelorPanel.style.display = isMaster ? 'none' : '';
    document.getElementById('btnDegreeBachelor')?.classList.toggle('active', !isMaster);
    document.getElementById('btnDegreeMaster')?.classList.toggle('active', isMaster);
    // 轉系／雙主修試算只適用大學部
    const whatIfBtn = document.getElementById('btnWhatIf');
    if (whatIfBtn) whatIfBtn.style.display = isMaster ? 'none' : '';
}

/**
 * 修業時程參考：依入學學年與學制排出各學期的常見節點（僅供參考，各所規定不同）
 */
function buildMasterTimeline(rule, entryYear) {
    const isPhD = rule.program.degree === '博士班';
    const prefix = isPhD ? '博' : '碩';
    const semesterCount = isPhD ? 8 : 4;
    const yearNames = ['一', '二', '三', '四'];
    const year = parseInt(entryYear, 10) || 115;

    const semesters = Array.from({ length: semesterCount }, (_, i) => {
        const academicYear = year + Math.floor(i / 2);
        const isFirstTerm = i % 2 === 0;
        const western = academicYear + 1911;
        return {
            label: `${prefix}${yearNames[Math.floor(i / 2)]}${isFirstTerm ? '上' : '下'}`,
            term: `${academicYear}-${isFirstTerm ? 1 : 2}`,
            months: isFirstTerm ? `${western}/9～${western + 1}/1` : `${western + 1}/2～${western + 1}/6`,
            items: []
        };
    });
    const last = semesters[semesters.length - 1];

    semesters[0].items.push('選課須經指導教授或所長確認（依各所規定）');
    semesters[0].items.push('學分抵免申請：多數所須於入學第一學期開學後約一個月內提出');
    if (rule.remedial.length) semesters[0].items.push(`補修科目（${rule.remedial.join('、')}）：依所上規定期限修畢`);
    if (rule.ethicsHours > 0) semesters[0].items.push(`學術倫理課程 ${rule.ethicsHours} 小時：建議第一學年內完成並取得修課證明`);
    semesters[1].items.push('選定指導教授：多數所規定第一學年結束前完成');

    if (isPhD) {
        semesters[3].items.push('博士學位候選人資格考：多數所規定入學後 2～3 年內通過');
        semesters[5].items.push('論文計畫審查、期刊發表：依各所博士班修業辦法累積發表要求');
    } else {
        semesters[2].items.push('論文題目／計畫審查：部分所規定須於學位考試前一學期完成');
    }
    last.items.push('申請學位考試：各所截止日不同，上學期常見於 12 月、下學期常見於 5～6 月');
    last.items.push('完成學位考試（口試）：上學期約 1/31 前、下學期約 7/31 前（以學校與所上公告為準）');
    last.items.push('論文上傳、繳交與離校手續');

    return { semesters, note: isPhD ? '以修業 4 年估算' : '以修業 2 年估算' };
}

function renderMasterTimeline(rule, entryYear) {
    const { semesters, note } = buildMasterTimeline(rule, entryYear);
    return `
        <details class="master-section master-timeline">
            <summary class="master-section-title">修業時程參考 <span class="tf-badge tf-badge-warning">僅供參考</span></summary>
            <div class="master-callout warning">此時程依本校常見規定整理，各所的期限與要求不同；實際請以所上修業辦法、學校行事曆與系辦公告為準。（${escapeHTML(note)}）</div>
            <ol class="master-timeline-list">
                ${semesters.filter(s => s.items.length).map(s => `
                    <li>
                        <div class="master-timeline-term"><b>${escapeHTML(s.label)}</b> <span class="master-muted">${escapeHTML(s.term)}｜${escapeHTML(s.months)}</span></div>
                        <ul>${s.items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
                    </li>`).join('')}
            </ol>
        </details>`;
}

function masterCardStatus(earned, expected, target) {
    if (earned >= target) return 'passed-status';
    if (expected >= target) return 'planned-status';
    return 'failed-status';
}

function renderMasterCard({ title, earned, expected, target, targetText, subText = '', status, find = null }) {
    const cls = status || masterCardStatus(earned, expected, target);
    // 未達標時顯示「找課補足」（find 為找課篩選條件）
    const findHtml = find && cls !== 'passed-status' && typeof findCoursesButtonHTML === 'function'
        ? `<div class="tf-find-slot">${findCoursesButtonHTML(find.query, find.label)}</div>` : '';
    return `
        <div class="checker-card ${cls}">
            <div class="title">${escapeHTML(title)}</div>
            <div class="score-group">
                <div class="expected">預計: <span>${escapeHTML(expected)}</span></div>
                <div class="actual">目前: <span>${escapeHTML(earned)}</span></div>
            </div>
            <div class="target">${escapeHTML(targetText)}</div>
            ${subText ? `<div class="master-card-sub">${subText}</div>` : ''}
            ${findHtml}
        </div>
    `;
}

const MASTER_STATUS_TEXT = {
    passed: { text: '已通過', cls: 'tf-badge-success' },
    exempt: { text: '大學已修', cls: 'tf-badge-success' },
    planned: { text: '修讀中', cls: 'tf-badge-warning' },
    missing: { text: '尚未修', cls: 'tf-badge-danger' }
};

function renderMasterGraduationUI(res, data) {
    const panel = document.getElementById('masterGradPanel');
    if (!panel) return;

    const rule = res.rule;
    const c = res.credits;
    const percent = Math.min(100, Math.round((c.earned / c.target) * 100)) || 0;

    const isCustom = rule.programKey === CUSTOM_MASTER_PROGRAM;
    const isPhD = rule.program.degree === '博士班';
    const thesisName = isPhD ? '博士論文' : '碩士論文';
    const programPill = `
        <div class="cfg-pill master-program-pill">
            <span class="cfg-label">所別</span>
            <button type="button" id="masterProgramBtn" class="master-program-btn" aria-haspopup="listbox" aria-expanded="false" onclick="toggleMasterProgramPicker()" title="${escapeHTML(rule.program.fullName)}">
                <span class="name">${escapeHTML(rule.program.fullName)}</span>
                ${isCustom ? '' : `<span class="degree">${escapeHTML(rule.program.college)}</span>`}
                <span aria-hidden="true">▾</span>
            </button>
            <div id="masterProgramPopover" class="master-program-popover" hidden>
                <input type="search" id="masterProgramSearch" class="master-program-search" placeholder="搜尋全名或縮寫，例如：機械所、ME、N1" autocomplete="off"
                    oninput="filterMasterProgramPicker(this.value)"
                    onkeydown="if (event.key === 'Enter') { event.preventDefault(); document.querySelector('#masterProgramList .master-program-option')?.click(); }">
                <div id="masterProgramList" class="master-program-list" role="listbox"></div>
            </div>
        </div>`;

    // 規章版本、年度對應與整理時不確定的地方
    const ruleMeta = isCustom ? '' : `
        <div class="master-rule-meta">
            <div>適用規章：${escapeHTML(rule.versionLabel)}</div>
            ${rule.fallbackNote ? `<div class="master-callout info">📌 ${escapeHTML(rule.fallbackNote)}</div>` : ''}
            ${rule.uncertain.length ? `
                <div class="master-callout warning">⚠️ 規章未明確規定之處（以下為本系統的處理方式，未經系所確認）：
                    <ul>${rule.uncertain.map(u => `<li>${escapeHTML(u)}</li>`).join('')}</ul>
                </div>` : ''}
        </div>`;

    // 自訂所別：所有門檻由使用者填寫
    const custom = data.masterCustom || DEFAULT_MASTER_CUSTOM;
    const customNum = (field, label, value, max, placeholder = '') => `
        <div class="cfg-pill">
            <span class="cfg-label">${label}</span>
            <input type="number" class="cfg-input-num" min="0" max="${max}" step="1" value="${value === null ? '' : escapeHTML(value)}" placeholder="${placeholder}" onchange="updateMasterCustom('${field}', this.value)">
        </div>`;
    const customText = (field, label, value, placeholder, width) => `
        <div class="cfg-pill">
            <span class="cfg-label" style="white-space:nowrap;">${label}</span>
            <input type="text" class="cfg-input-text" maxlength="200" style="width:${width}px; max-width:45vw;" value="${escapeHTML(value)}" placeholder="${placeholder}" onchange="updateMasterCustom('${field}', this.value)">
        </div>`;
    const customRow = isCustom ? `
        <div class="config-row-group" style="margin-top:8px;">
            <div class="config-group-tag tag-primary">自訂規則</div>
            <div class="config-pills-wrap">
                ${customText('name', '所名', custom.name, '例如：機械所', 110)}
                ${customNum('totalCredits', '畢業學分', custom.totalCredits, 99)}
                ${customNum('thesisCredits', '論文學分', custom.thesisCredits, 30)}
                ${customNum('maxExternal', '外所上限', custom.maxExternal, 99)}
                ${customNum('maxWaived', '抵免上限', custom.maxWaived, 99, '不限')}
                ${customNum('seminarCount', '專題討論學期', custom.seminarCount, 12)}
                ${customNum('ethicsHours', '學術倫理時數', custom.ethicsHours, 99)}
                ${customText('requiredCourses', '指定課程', custom.requiredCourses.join('、'), '以「、」分隔，可留空', 180)}
                ${customText('remedial', '補修科目', custom.remedial.join('、'), '以「、」分隔，可留空', 180)}
            </div>
        </div>` : '';
    const yearOptions = MASTER_ENTRY_YEARS.map(y =>
        `<option value="${y}" ${y === parseInt(data.masterEntryYear, 10) ? 'selected' : ''}>${y}學年</option>`).join('');
    const durationPill = rule.seminar.mode === 'byDuration' ? `
        <div class="cfg-pill">
            <span class="cfg-label">預計修業</span>
            <select class="cfg-select" onchange="updateMasterConfig('masterDuration', this.value)">
                ${[['1', '1 年'], ['1.5', '1.5 年'], ['2', '2 年以上']].map(([v, t]) =>
                    `<option value="${v}" ${v === res.seminar.duration ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
        </div>` : '';
    const ethicsPill = res.ethics.required > 0 ? `
        <div class="cfg-pill">
            <span class="cfg-label">學術倫理時數</span>
            <input type="number" class="cfg-input-num" min="0" max="99" step="1" value="${escapeHTML(res.ethics.hours)}" onchange="updateMasterConfig('masterEthicsHours', this.value)">
        </div>` : '';

    // ── 檢核卡片 ──
    const externalOver = c.external.cap !== null && c.external.expected > c.external.cap;
    const cards = [
        renderMasterCard({
            title: '畢業學分', earned: c.earned, expected: c.expected, target: c.target,
            find: { query: { type: '本所選修' }, label: '找本所課程' },
            targetText: `目標: ${c.target} 學分`,
            subText: (res.thesis.credits ? `論文 ${res.thesis.credits} 學分另計` : '論文不另計學分')
                + (rule.seminarCreditsCount ? '<br>專題討論學分計入' : '')
                + (c.waived.overflow > 0 ? `<br><span class="master-warn">抵免超過上限 ${c.waived.cap} 學分，已扣除 ${c.waived.overflow}</span>` : '')
        }),
        c.own.min !== null
            ? renderMasterCard({
                title: '本所課程', earned: c.own.earned, expected: c.own.expected, target: c.own.min,
                find: { query: { type: '本所選修' }, label: '找本所課程' },
                targetText: `至少: ${c.own.min} 學分`,
                subText: `須修本所（本系）開授課程<br>必修 ${c.own.required.expected}・選修 ${c.own.elective.expected} 學分（預計）`
            })
            : renderMasterCard({
                title: '本所課程', earned: c.own.earned, expected: c.own.expected, target: 0,
                targetText: '計入畢業學分', status: 'planned-status',
                subText: `必修 ${c.own.required.expected}・選修 ${c.own.elective.expected} 學分（預計）`
            }),
        renderMasterCard({
            title: '外所選修', earned: c.external.countedEarned, expected: c.external.countedExpected, target: c.external.min || 0,
            find: c.external.min !== null ? { query: { type: '外所選修' }, label: '找外所課程' } : null,
            targetText: [c.external.min !== null ? `至少: ${c.external.min} 學分` : '', c.external.cap === null ? (c.external.min !== null ? '' : '上限: 規章未限制') : `上限: ${c.external.cap} 學分`].filter(Boolean).join('｜'),
            status: externalOver ? 'failed-status' : (c.external.min !== null ? undefined : 'planned-status'),
            subText: externalOver
                ? `<span class="master-warn">已修 ${c.external.expected} 學分，超出 ${c.external.expected - c.external.cap} 學分不承認</span>`
                : `已修 ${c.external.expected} 學分`
        })
    ];
    if (res.seminar.required > 0) {
        cards.push(renderMasterCard({
            title: '專題討論', earned: res.seminar.earned, expected: res.seminar.expected, target: res.seminar.required,
            find: { query: { type: '專題討論' }, label: '找專題討論' },
            targetText: `目標: ${res.seminar.required} 學期`,
            subText: res.seminar.mode === 'byDuration' ? '依預計修業年限計算，每學期僅能修一門' : `須通過 ${res.seminar.required} 學期`
        }));
    }
    cards.push(renderMasterCard({
        title: thesisName,
        earned: res.thesis.status === 'earned' ? '已完成' : '-',
        expected: res.thesis.status === 'missing' ? '未排入' : (res.thesis.semester || '-'),
        target: 1, targetText: res.thesis.credits ? `${res.thesis.credits} 學分（另計）` : '完成學位論文',
        status: res.thesis.status === 'earned' ? 'passed-status' : (res.thesis.status === 'planned' ? 'planned-status' : 'failed-status'),
        subText: '請將論文課程類別設為「學位論文」'
    }));
    if (res.ethics.required > 0) {
        cards.push(renderMasterCard({
            title: '學術倫理', earned: res.ethics.hours, expected: res.ethics.hours, target: res.ethics.required,
            targetText: `目標: ${res.ethics.required} 小時`, subText: '於上方設定填寫已完成時數'
        }));
    }

    const statusBadge = status => {
        const s = MASTER_STATUS_TEXT[status] || MASTER_STATUS_TEXT.missing;
        return `<span class="tf-badge ${s.cls}">${s.text}</span>`;
    };

    const requiredHtml = res.requiredCourses.length ? `
        <div class="master-section">
            <div class="master-section-title">指定必須通過課程</div>
            ${res.requiredCourses.map(r => `
                <div class="master-row"><span>${escapeHTML(r.name)}</span><span style="display:flex; align-items:center; gap:6px;">${r.status === 'missing' && typeof findCoursesButtonHTML === 'function' ? findCoursesButtonHTML({ keyword: r.name }, '找課') : ''}${statusBadge(r.status)}</span></div>
            `).join('')}
        </div>` : '';

    const remedialHtml = res.remedial.length ? `
        <div class="master-section">
            <div class="master-section-title">大學未修須補修（補修學分不計入畢業學分）</div>
            ${res.remedial.map((r, idx) => `
                <div class="master-row">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                        <input type="checkbox" ${r.status === 'exempt' ? 'checked' : ''} onchange="toggleMasterRemedial(${idx}, this.checked)">
                        ${escapeHTML(r.name)}<span class="master-muted">（大學已修過請勾選）</span>
                    </label>
                    <span style="display:flex; align-items:center; gap:6px;">${r.status === 'missing' && typeof findCoursesButtonHTML === 'function' ? findCoursesButtonHTML({ keyword: r.name }, '找課') : ''}${statusBadge(r.status)}</span>
                </div>
            `).join('')}
        </div>` : '';

    const uncountedHtml = res.uncounted.length ? `
        <div class="master-section">
            <div class="master-section-title">未計入畢業學分的課程</div>
            ${res.uncounted.map(u => `
                <div class="master-row">
                    <span>${escapeHTML(u.semester)}｜${escapeHTML(u.name)}（${escapeHTML(u.credits)} 學分）</span>
                    <span class="master-muted">${escapeHTML(u.reason)}</span>
                </div>
            `).join('')}
        </div>` : '';

    panel.innerHTML = `
        <div class="progress-board">
            <div class="progress-info-row">
                <div class="progress-info-left">
                    <span class="progress-badge">${escapeHTML(rule.program.degree)}畢業學分進度</span>
                    <div class="progress-details-text">已取得 ${escapeHTML(c.earned)} / ${escapeHTML(c.target)} 學分（預計 ${escapeHTML(c.expected)}）${res.allPassed ? '｜✅ 已符合所有畢業條件' : ''}</div>
                </div>
                <div class="progress-info-right-group">
                    <div class="progress-percent-badge">${percent}%</div>
                </div>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${percent}%;"></div></div>
        </div>

        <div class="grad-checker-board">
            <div class="config-bar-modern">
                <div class="config-row-group">
                    <div class="config-group-tag tag-primary">研究所設定</div>
                    <div class="config-pills-wrap">
                        ${programPill}
                        <div class="cfg-pill">
                            <span class="cfg-label">入學學年</span>
                            <select class="cfg-select" onchange="updateMasterConfig('masterEntryYear', this.value)">${yearOptions}</select>
                        </div>
                        ${durationPill}
                        ${ethicsPill}
                    </div>
                </div>
                ${customRow}
                ${ruleMeta}
            </div>

            <div class="checker-grid-core master-card-grid">${cards.join('')}</div>

            ${requiredHtml}
            ${remedialHtml}
            ${uncountedHtml}
            ${isCustom ? '' : renderMasterTimeline(rule, data.masterEntryYear)}

            <div class="master-section">
                <div class="master-section-title">其他規定（需自行留意）</div>
                <ul class="master-notes">${rule.notes.map(n => `<li>${escapeHTML(n)}</li>`).join('')}</ul>
                <div class="master-muted">依據：${escapeHTML(rule.source)}（${escapeHTML(rule.program.fullName)}）｜實際畢業資格請以所上規章與系辦審核為準</div>
            </div>
        </div>
    `;
}

if (typeof window !== 'undefined') {
    window.isMasterMode = isMasterMode;
    window.setDegree = setDegree;
    window.updateMasterConfig = updateMasterConfig;
    window.toggleMasterProgramPicker = toggleMasterProgramPicker;
    window.filterMasterProgramPicker = filterMasterProgramPicker;
    window.pickMasterProgram = pickMasterProgram;
    window.toggleMasterRemedial = toggleMasterRemedial;
    window.updateMasterCustom = updateMasterCustom;
    window.updateMasterCourseTypeOptions = updateMasterCourseTypeOptions;
    window.applyDegreeLayout = applyDegreeLayout;
    window.renderMasterGraduationUI = renderMasterGraduationUI;
}
