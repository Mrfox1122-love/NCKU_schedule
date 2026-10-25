// ============================================================
// 🎓 TimeFlow v3.3.2 — 碩士班畢業檢核畫面 (master-ui.js)
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
    if (field === 'masterProgram' && MASTER_PROGRAMS[value]) appData.masterProgram = value;
    if (field === 'masterEntryYear') appData.masterEntryYear = parseInt(value, 10) || appData.masterEntryYear;
    if (field === 'masterDuration' && ['1', '1.5', '2'].includes(value)) appData.masterDuration = value;
    if (field === 'masterEthicsHours') appData.masterEthicsHours = Math.max(0, Math.min(99, parseFloat(value) || 0));
    saveData();
    updateAppUI();
}

function toggleMasterRemedial(index, checked) {
    const rule = getMasterRule(appData.masterProgram, appData.masterEntryYear);
    const name = rule.remedial[index];
    if (!name) return;
    appData.masterRemedialDone = appData.masterRemedialDone || {};
    if (checked) appData.masterRemedialDone[name] = true;
    else delete appData.masterRemedialDone[name];
    saveData();
    updateAppUI();
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

    const programOptions = Object.keys(MASTER_PROGRAMS).map(key =>
        `<option value="${escapeHTML(key)}" ${key === rule.programKey ? 'selected' : ''}>${escapeHTML(key)}</option>`).join('');
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
    const cards = [
        renderMasterCard({
            title: '畢業學分', earned: c.earned, expected: c.expected, target: c.target,
            targetText: `目標: ${c.target} 學分`,
            subText: `論文 ${res.thesis.credits} 學分另計` + (c.waived.overflow > 0 ? `<br><span class="master-warn">抵免超過上限 ${c.waived.cap} 學分，已扣除 ${c.waived.overflow}</span>` : '')
        }),
        renderMasterCard({
            title: '本所選修', earned: c.own.earned, expected: c.own.expected, target: 0,
            targetText: '計入畢業學分', status: 'planned-status'
        }),
        renderMasterCard({
            title: '外所選修', earned: c.external.countedEarned, expected: c.external.countedExpected, target: 0,
            targetText: `上限: ${c.external.cap} 學分`,
            status: c.external.expected > c.external.cap ? 'failed-status' : 'planned-status',
            subText: c.external.expected > c.external.cap
                ? `<span class="master-warn">已修 ${c.external.expected} 學分，超出 ${c.external.expected - c.external.cap} 學分不承認</span>`
                : `已修 ${c.external.expected} 學分`
        }),
        renderMasterCard({
            title: '專題討論', earned: res.seminar.earned, expected: res.seminar.expected, target: res.seminar.required,
            targetText: `目標: ${res.seminar.required} 學期`,
            subText: res.seminar.mode === 'byDuration' ? '依預計修業年限計算，每學期僅能修一門' : '須通過 4 學期'
        }),
        renderMasterCard({
            title: '碩士論文',
            earned: res.thesis.status === 'earned' ? '已完成' : '-',
            expected: res.thesis.status === 'missing' ? '未排入' : (res.thesis.semester || '-'),
            target: 1, targetText: `${res.thesis.credits} 學分（另計）`,
            status: res.thesis.status === 'earned' ? 'passed-status' : (res.thesis.status === 'planned' ? 'planned-status' : 'failed-status'),
            subText: '請將論文課程類別設為「碩士論文」'
        })
    ];
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
                    <span class="progress-badge">碩士班畢業學分進度</span>
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
                    <div class="config-group-tag tag-primary">碩士班設定</div>
                    <div class="config-pills-wrap">
                        <div class="cfg-pill">
                            <span class="cfg-label">所別</span>
                            <select class="cfg-select" onchange="updateMasterConfig('masterProgram', this.value)">${programOptions}</select>
                        </div>
                        <div class="cfg-pill">
                            <span class="cfg-label">入學學年</span>
                            <select class="cfg-select" onchange="updateMasterConfig('masterEntryYear', this.value)">${yearOptions}</select>
                        </div>
                        ${durationPill}
                        ${ethicsPill}
                    </div>
                </div>
            </div>

            <div class="checker-grid-core master-card-grid">${cards.join('')}</div>

            ${requiredHtml}
            ${remedialHtml}
            ${uncountedHtml}

            <div class="master-section">
                <div class="master-section-title">其他規定（需自行留意）</div>
                <ul class="master-notes">${rule.notes.map(n => `<li>${escapeHTML(n)}</li>`).join('')}</ul>
                <div class="master-muted">依據：${escapeHTML(rule.source)}（${escapeHTML(rule.program.fullName)}）</div>
            </div>
        </div>
    `;
}

if (typeof window !== 'undefined') {
    window.isMasterMode = isMasterMode;
    window.setDegree = setDegree;
    window.updateMasterConfig = updateMasterConfig;
    window.toggleMasterRemedial = toggleMasterRemedial;
    window.updateMasterCourseTypeOptions = updateMasterCourseTypeOptions;
    window.applyDegreeLayout = applyDegreeLayout;
    window.renderMasterGraduationUI = renderMasterGraduationUI;
}
