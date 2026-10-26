// ============================================================
// 🎓 TimeFlow v3.3.5 — 碩士班畢業檢核畫面 (master-ui.js)
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

function applyDegreeLayout(isMaster) {
    const masterPanel = document.getElementById('masterGradPanel');
    const bachelorPanel = document.getElementById('bachelorGradPanel');
    if (masterPanel) masterPanel.style.display = isMaster ? '' : 'none';
    if (bachelorPanel) bachelorPanel.style.display = isMaster ? 'none' : '';
    document.getElementById('btnDegreeBachelor')?.classList.toggle('active', !isMaster);
    document.getElementById('btnDegreeMaster')?.classList.toggle('active', isMaster);
}

function masterCardStatus(earned, expected, target) {
    if (earned >= target) return 'passed-status';
    if (expected >= target) return 'planned-status';
    return 'failed-status';
}

function renderMasterCard({ title, earned, expected, target, targetText, subText = '', status }) {
    const cls = status || masterCardStatus(earned, expected, target);
    return `
        <div class="checker-card ${cls}">
            <div class="title">${escapeHTML(title)}</div>
            <div class="score-group">
                <div class="expected">預計: <span>${escapeHTML(expected)}</span></div>
                <div class="actual">目前: <span>${escapeHTML(earned)}</span></div>
            </div>
            <div class="target">${escapeHTML(targetText)}</div>
            ${subText ? `<div class="master-card-sub">${subText}</div>` : ''}
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
            targetText: `目標: ${c.target} 學分`,
            subText: (res.thesis.credits ? `論文 ${res.thesis.credits} 學分另計` : '論文不另計學分')
                + (rule.seminarCreditsCount ? '<br>專題討論學分計入' : '')
                + (c.waived.overflow > 0 ? `<br><span class="master-warn">抵免超過上限 ${c.waived.cap} 學分，已扣除 ${c.waived.overflow}</span>` : '')
        }),
        c.own.min !== null
            ? renderMasterCard({
                title: '本所課程', earned: c.own.earned, expected: c.own.expected, target: c.own.min,
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
                <div class="master-row"><span>${escapeHTML(r.name)}</span>${statusBadge(r.status)}</div>
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
                    ${statusBadge(r.status)}
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
