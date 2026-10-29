// ============================================================
// 🔀 TimeFlow v3.5.1 — 轉系／雙主修試算 (what-if.js)
// ------------------------------------------------------------
// 不改動使用者設定，把已修與規劃中的課程換成「目標學系」的角度重新歸類：
// - 轉系：以目標學系規則重算整份畢業檢核，與目前學系並排比較
// - 雙主修／輔系：統計可算入目標學系的課程學分（僅供參考）
// 大學部專用。
// ============================================================

// 會隨學系改變的課程類別（通識、國文、英文、體育等不受影響）
const WHATIF_DEPT_TYPES = new Set(['系定必修', '選修-本系', '選修-必選', '選修-外系', '跨領域-必修', '跨領域-選修']);
const WHATIF_OWN_TYPES = new Set(['系定必修', '選修-本系', '選修-必選']);

let whatIfMode = 'transfer';

/**
 * 系名正規化後比較（例如「統資系 STAT」與「統計與資料科學學系」為同一系）
 */
function isSameDepartment(a, b) {
    if (!a || !b) return false;
    const norm = name => normalizeDepartmentName(String(name).split(' ')[0]);
    return norm(a) === norm(b);
}

/**
 * 課程的開課系所與課程系統的必／選修標示（由找課加入的課程才有）
 */
function getCourseOffering(course) {
    const catalogCourse = (course.catalogId && typeof findCatalogCourse === 'function') ? findCatalogCourse(course.catalogId) : null;
    return {
        dept: course.dept || (catalogCourse ? catalogCourse.dept : ''),
        courseType: catalogCourse ? catalogCourse.courseType : ''
    };
}

/**
 * 以目標學系的角度重新歸類一門課
 * @returns {{ type: string, basis: 'keep'|'catalog'|'cross'|'guess' }}
 */
function reclassifyCourseForDept(course, targetDept, data) {
    if (!WHATIF_DEPT_TYPES.has(course.type)) return { type: course.type, basis: 'keep' };

    const offering = getCourseOffering(course);
    if (offering.dept) {
        if (!isSameDepartment(offering.dept, targetDept)) return { type: '選修-外系', basis: 'catalog' };
        if (offering.courseType === '必修') return { type: '系定必修', basis: 'catalog' };
        if (offering.courseType === '必選') return { type: '選修-必選', basis: 'catalog' };
        if (offering.courseType === '選修') return { type: '選修-本系', basis: 'catalog' };
        // 有開課系所但沒有必／選修資料：沿用原本的本系類別
        return { type: WHATIF_OWN_TYPES.has(course.type) ? course.type : '選修-本系', basis: 'catalog' };
    }

    // 沒有開課系所資料（手動新增）：只能推測
    const cross = data.crossMajor || {};
    if (course.type.startsWith('跨領域-') && isSameDepartment(cross.name, targetDept)) {
        return { type: course.type === '跨領域-必修' ? '系定必修' : '選修-本系', basis: 'cross' };
    }
    if (isSameDepartment(data.deptName, targetDept)) return { type: course.type, basis: 'keep' };
    return { type: '選修-外系', basis: 'guess' };
}

/**
 * 目標學系開授的必修課名（本學期與歷年資料），用來提示同名課程可能可抵免
 */
function getDeptRequiredCourseNames(targetDept) {
    const all = [...((window.COURSE_CATALOG) || []), ...((window.COURSE_HISTORY) || [])];
    return new Set(all
        .filter(c => c.courseType === '必修' && isSameDepartment(c.dept, targetDept))
        .map(c => normalizeMasterCourseName(c.name)));
}

/**
 * 產生「換成目標學系」後的課程資料與歸類變化清單
 */
function buildWhatIfData(targetDept) {
    const order = appData.semesterOrder || Object.keys(appData.semesters || {});
    const requiredNames = getDeptRequiredCourseNames(targetDept);
    const semesters = {};
    const changes = [];
    order.forEach(sem => {
        semesters[sem] = (appData.semesters[sem] || []).map(course => {
            const { type, basis } = reclassifyCourseForDept(course, targetDept, appData);
            if (type !== course.type || basis === 'guess') {
                // 他系開的課，但與目標學系的必修同名（例如各系的微積分）：轉系時常可申請抵免
                const maybeWaivable = type === '選修-外系' && requiredNames.has(normalizeMasterCourseName(course.name));
                changes.push({ id: course.id, semester: sem, name: course.name, credits: parseFloat(course.credits) || 0, from: course.type, to: type, basis, status: course.status, maybeWaivable });
            }
            return type === course.type ? course : { ...course, type };
        });
    });
    const data = { ...appData, deptName: targetDept, semesters, crossMajor: { type: 'none', name: '', target: 40 } };
    return { data, changes };
}

/**
 * 可選擇的目標學系：有畢業規則的學系（以正式全名列出）
 */
function getWhatIfDepartments() {
    const rules = window.DEPARTMENT_GRADUATION_RULES || {};
    const names = Object.keys(rules).filter(name => normalizeDepartmentName(name) === name);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

// ── 畫面 ──

function openWhatIf() {
    const input = document.getElementById('whatIfDeptInput');
    const list = document.getElementById('whatIfDeptList');
    if (list) list.innerHTML = getWhatIfDepartments().map(n => `<option value="${escapeHTML(n)}"></option>`).join('');
    if (input && !input.value) input.value = '';
    ModalManager.open('whatIfModal');

    // 歸類需要課程資料（開課系所、必選修）
    const body = document.getElementById('whatIfBody');
    if (typeof loadCourseCatalog === 'function' && !window.COURSE_CATALOG) {
        if (body) body.innerHTML = '<div class="master-muted">正在載入課程資料…</div>';
        loadCourseCatalog().then(renderWhatIf).catch(renderWhatIf);
    } else {
        renderWhatIf();
    }
}

function closeWhatIf(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
    ModalManager.close('whatIfModal');
}

function setWhatIfMode(mode) {
    whatIfMode = mode === 'double' ? 'double' : 'transfer';
    document.getElementById('btnWhatIfTransfer')?.classList.toggle('active', whatIfMode === 'transfer');
    document.getElementById('btnWhatIfDouble')?.classList.toggle('active', whatIfMode === 'double');
    renderWhatIf();
}

const WHATIF_BASIS_TEXT = {
    catalog: { text: '依課程資料', cls: 'tf-badge-success' },
    cross: { text: '依跨領域設定', cls: 'tf-badge-accent' },
    guess: { text: '推測', cls: 'tf-badge-warning' }
};

function renderWhatIfChanges(changes) {
    if (!changes.length) return '<div class="master-muted">沒有課程的歸類會改變。</div>';
    return `
        <ul class="whatif-change-list">
            ${changes.map(c => {
                const basis = WHATIF_BASIS_TEXT[c.basis] || WHATIF_BASIS_TEXT.guess;
                return `
                <li>
                    <span><b>${escapeHTML(c.name)}</b> <span class="master-muted">${escapeHTML(c.semester)}・${escapeHTML(c.credits)} 學分</span></span>
                    <span class="whatif-change-type">${escapeHTML(c.from)}${c.from !== c.to ? ` → <b>${escapeHTML(c.to)}</b>` : ''} <span class="tf-badge ${basis.cls}">${basis.text}</span>${c.maybeWaivable ? '<span class="tf-badge tf-badge-accent" title="目標學系有同名必修，轉系後通常可申請抵免，實際由系上審核">同名必修，可能可抵免</span>' : ''}</span>
                </li>`;
            }).join('')}
        </ul>`;
}

function renderWhatIfTransfer(targetDept) {
    const current = calculateGraduation(appData);
    const { data, changes } = buildWhatIfData(targetDept);
    const target = calculateGraduation(data);

    const cell = (earned, expected, goal, passed) => `
        <td class="${passed ? 'whatif-pass' : ''}">
            <b>${escapeHTML(earned)}</b><span class="master-muted"> / ${escapeHTML(goal)}</span>
            ${expected > earned ? `<div class="master-muted">預計 ${escapeHTML(expected)}</div>` : ''}
        </td>`;
    const row = (label, pick) => `
        <tr>
            <th>${escapeHTML(label)}</th>
            ${cell(...pick(current))}
            ${cell(...pick(target))}
        </tr>`;

    const guessCount = changes.filter(c => c.basis === 'guess').length;
    const waivable = changes.filter(c => c.maybeWaivable);
    const waivableCredits = waivable.reduce((sum, c) => sum + c.credits, 0);
    const targetNotes = target.deptRuleNotices || [];

    return `
        <table class="whatif-table">
            <thead><tr><th></th><th>目前：${escapeHTML(current.deptName || appData.deptName || '目前學系')}</th><th>轉到：${escapeHTML(targetDept)}</th></tr></thead>
            <tbody>
                ${row('畢業學分', r => [r.total.earned, r.total.expected, r.total.target, r.total.earned >= r.total.target])}
                ${row('系定必修', r => [r.required.earned, r.required.expected, r.required.target, r.required.isPassed])}
                ${row('系定選修', r => [r.elective.earnedRaw, r.elective.expectedRaw, r.elective.target, r.elective.isPassed])}
                ${row('外系選修（採計上限）', r => [r.elective.outElective.capped, r.elective.outElective.raw, r.elective.outElective.max, !r.elective.outElective.isOver])}
                ${row('通識', r => [r.generalEducation.effectiveEarned, r.generalEducation.effectiveExpected, r.generalEducation.target, r.generalEducation.isAllPassed])}
            </tbody>
        </table>
        <div class="master-muted">表中「已取得 / 目標」；外系選修列為「採計學分 / 上限」，超出上限的部分不計入畢業學分。</div>

        <div class="master-section">
            <div class="master-section-title">課程歸類變化（${changes.length} 門）</div>
            ${waivable.length ? `<div class="master-callout info">有 ${waivable.length} 門課（${waivableCredits} 學分）與 ${escapeHTML(targetDept)} 的必修同名，例如各系的微積分、普通物理。轉系後通常可申請抵免為必修，上表沒有計入，實際由轉入學系審核。</div>` : ''}
            ${guessCount ? `<div class="master-callout warning">有 ${guessCount} 門課沒有開課系所資料（多為手動新增），系統推測為「選修-外系」；若其實是目標學系的課，實際可採計的學分會更多。</div>` : ''}
            ${renderWhatIfChanges(changes)}
        </div>

        ${targetNotes.length ? `
        <div class="master-section">
            <div class="master-section-title">${escapeHTML(targetDept)} 的修業提醒</div>
            <ul class="master-notes">${targetNotes.map(n => `<li>${escapeHTML(n)}</li>`).join('')}</ul>
        </div>` : ''}

        ${renderApplyTransferSection(targetDept, waivable)}`;
}

// ── 轉系成功：套用到自己的規劃 ──

/**
 * 「轉系成功了嗎？」區塊：選擇適用的入學學年規則、勾選已核准抵免的同名必修
 */
function renderApplyTransferSection(targetDept, waivable) {
    const entry = parseInt(appData.entryYear, 10) || 118;
    const academic = entry - 4;   // entryYear 存「入學學年 + 4」
    const waiveHtml = waivable.length ? `
        <div class="whatif-apply-field">
            <span>系上已核准抵免為必修的同名課程（沒勾的維持外系選修）</span>
            ${waivable.map(c => `
                <label class="whatif-waive"><input type="checkbox" class="whatif-waive-cb" value="${escapeHTML(String(c.id))}"> ${escapeHTML(c.name)} <span class="master-muted">${escapeHTML(c.semester)}・${escapeHTML(c.credits)} 學分</span></label>`).join('')}
        </div>` : '';
    return `
        <div class="master-section whatif-apply">
            <div class="master-section-title">轉系成功了嗎？</div>
            <div class="master-muted">套用後會把學系改成 ${escapeHTML(targetDept)}，並依上面的結果重新歸類所有課程（含候選清單）。套用前會自動備份，可隨時復原。</div>
            <label class="whatif-apply-field">
                <span>適用的入學學年規則</span>
                <select id="whatIfEntryYear" class="cfg-select">
                    <option value="${entry}">一般轉系：沿用 ${academic} 學年度入學規則</option>
                    <option value="${entry + 1}">降級轉系：改依 ${academic + 1} 學年度入學規則</option>
                </select>
            </label>
            ${waiveHtml}
            <button type="button" class="tf-btn tf-btn-primary" onclick="applyTransfer()">我已轉系成功，套用到我的規劃</button>
        </div>`;
}

function applyTransfer() {
    const raw = (document.getElementById('whatIfDeptInput')?.value || '').trim();
    const targetDept = normalizeDepartmentName(raw);
    if (!targetDept || !(window.DEPARTMENT_GRADUATION_RULES || {})[targetDept]) return;
    const entryYear = parseInt(document.getElementById('whatIfEntryYear')?.value, 10) || appData.entryYear;
    const waivedIds = new Set([...document.querySelectorAll('.whatif-waive-cb:checked')].map(cb => cb.value));

    if (!confirm(`確定要把學系改成「${targetDept}」並重新歸類所有課程嗎？\n套用前會自動備份，之後可以在這裡復原。`)) return;

    // 1. 備份目前的學系、入學學年、跨領域設定與每門課的類別
    const types = {};
    Object.values(appData.semesters).forEach(list => list.forEach(c => { types[String(c.id)] = c.type; }));
    (appData.wishlist || []).forEach(c => { types[String(c.id)] = c.type; });
    const backup = {
        savedAt: new Date().toISOString().slice(0, 10),
        toDept: targetDept,
        deptName: appData.deptName,
        entryYear: appData.entryYear,
        crossMajor: { ...(appData.crossMajor || { type: 'none', name: '', target: 40 }) },
        types
    };

    // 2. 以目前學系為基準重新歸類（必須在改學系之前計算）
    const { data } = buildWhatIfData(targetDept);
    Object.keys(appData.semesters).forEach(sem => {
        appData.semesters[sem] = (data.semesters[sem] || appData.semesters[sem]).map(c =>
            waivedIds.has(String(c.id)) ? { ...c, type: '系定必修' } : c);
    });
    appData.wishlist = (appData.wishlist || []).map(c => {
        const { type } = reclassifyCourseForDept(c, targetDept, appData);
        return type === c.type ? c : { ...c, type };
    });

    // 3. 轉入的學系原本是雙主修／輔系時，跨領域設定一併取消
    if (isSameDepartment((appData.crossMajor || {}).name, targetDept)) {
        appData.crossMajor = { type: 'none', name: '', target: 40 };
    }

    applyDepartmentSettings(targetDept, entryYear);
    appData.transferBackup = backup;
    saveData();
    if (typeof renderSemesterSelect === 'function') renderSemesterSelect();
    updateAppUI();
    renderWhatIf();
}

function undoTransfer() {
    const backup = appData.transferBackup;
    if (!backup) return;
    if (!confirm(`確定要復原為「${backup.deptName}」嗎？轉系後新增的課程會保留，類別維持現狀。`)) return;

    const restore = c => (backup.types[String(c.id)] ? { ...c, type: backup.types[String(c.id)] } : c);
    Object.keys(appData.semesters).forEach(sem => { appData.semesters[sem] = appData.semesters[sem].map(restore); });
    appData.wishlist = (appData.wishlist || []).map(restore);
    appData.crossMajor = backup.crossMajor;
    applyDepartmentSettings(backup.deptName, backup.entryYear);
    appData.transferBackup = null;
    saveData();
    if (typeof renderSemesterSelect === 'function') renderSemesterSelect();
    updateAppUI();
    renderWhatIf();
}

function renderTransferBackupBanner() {
    const backup = appData.transferBackup;
    if (!backup) return '';
    return `
        <div class="master-callout info whatif-backup">
            <span>你在 ${escapeHTML(backup.savedAt)} 從「${escapeHTML(backup.deptName)}」轉到「${escapeHTML(backup.toDept || appData.deptName)}」。</span>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" onclick="undoTransfer()">復原轉系</button>
        </div>`;
}

function renderWhatIfDouble(targetDept) {
    const { data } = buildWhatIfData(targetDept);
    const rule = getDepartmentGraduationRule(targetDept, appData.entryYear) || {};
    const order = data.semesterOrder || Object.keys(data.semesters);

    const sums = { required: { earned: 0, expected: 0 }, elective: { earned: 0, expected: 0 } };
    const courses = [];
    order.forEach(sem => (data.semesters[sem] || []).forEach(course => {
        if (course.isTentative) return;
        const offering = getCourseOffering(course);
        const isTargetCourse = offering.dept ? isSameDepartment(offering.dept, targetDept)
            : (course.type.startsWith('跨領域-') && isSameDepartment((appData.crossMajor || {}).name, targetDept));
        if (!isTargetCourse) return;
        const bucket = course.type === '系定必修' ? sums.required : sums.elective;
        const credits = parseFloat(course.credits) || 0;
        const done = course.status === '已取得' || course.status === '已抵免';
        if (done) bucket.earned += credits;
        if (done || course.status === '修讀中') bucket.expected += credits;
        courses.push({ sem, name: course.name, credits, type: course.type === '系定必修' ? '必修' : '選修', done });
    }));

    const total = sums.required.expected + sums.elective.expected;
    const defaults = (window.UNIVERSITY_GRADUATION_RULES || UNIVERSITY_GRADUATION_RULES).CROSS_MAJOR_DEFAULTS;
    const bar = (label, value, goal) => {
        const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
        return `
            <div class="whatif-bar">
                <div class="whatif-bar-label"><span>${escapeHTML(label)}</span><span><b>${escapeHTML(value)}</b> / ${escapeHTML(goal)} 學分</span></div>
                <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
            </div>`;
    };

    return `
        <div class="master-callout info">雙主修、輔系的應修科目與學分由各學系另訂（通常是加修學系的專業必修，或指定的若干學分）。以下只統計你已修、修讀中且由 ${escapeHTML(targetDept)} 開授的課程，<b>僅供參考</b>，實際認定請查詢該系雙主修／輔系辦法。</div>
        ${bar(`${targetDept} 開授的必修（對照該系必修 ${rule.requiredCredits || '?'} 學分）`, sums.required.expected, rule.requiredCredits || 0)}
        ${bar(`可算入雙主修的課程（對照預設 ${defaults['雙主修']} 學分）`, total, defaults['雙主修'])}
        ${bar(`可算入輔系的課程（對照預設 ${defaults['輔系']} 學分）`, total, defaults['輔系'])}
        <div class="master-muted">已取得：必修 ${escapeHTML(sums.required.earned)}、選修 ${escapeHTML(sums.elective.earned)} 學分；含修讀中共 ${escapeHTML(total)} 學分。</div>

        <div class="master-section">
            <div class="master-section-title">${escapeHTML(targetDept)} 開授的課程（${courses.length} 門）</div>
            ${courses.length ? `<ul class="whatif-change-list">${courses.map(c => `
                <li>
                    <span><b>${escapeHTML(c.name)}</b> <span class="master-muted">${escapeHTML(c.sem)}・${escapeHTML(c.credits)} 學分</span></span>
                    <span class="whatif-change-type">${escapeHTML(c.type)} ${c.done ? '<span class="tf-badge tf-badge-success">已取得</span>' : '<span class="tf-badge tf-badge-warning">修讀中</span>'}</span>
                </li>`).join('')}</ul>` : '<div class="master-muted">目前沒有修過這個學系開授的課程。可以到找課篩選該系的課程，加入候選後再回來試算。</div>'}
        </div>`;
}

function renderWhatIf() {
    const body = document.getElementById('whatIfBody');
    if (!body) return;
    const raw = (document.getElementById('whatIfDeptInput')?.value || '').trim();
    const targetDept = raw ? normalizeDepartmentName(raw) : '';
    const rules = window.DEPARTMENT_GRADUATION_RULES || {};

    const banner = renderTransferBackupBanner();
    if (!targetDept) {
        body.innerHTML = banner + '<div class="master-muted">選擇想轉入或雙主修的學系，系統會把你已修和規劃中的課程換成該系的角度重新計算。只有按下「套用」才會改動你的設定。</div>';
        return;
    }
    if (!rules[targetDept]) {
        body.innerHTML = banner + `<div class="master-muted">找不到「${escapeHTML(raw)}」的畢業規則，請從清單中選擇學系全名。</div>`;
        return;
    }
    if (isSameDepartment(targetDept, appData.deptName) && whatIfMode === 'transfer') {
        body.innerHTML = banner + '<div class="master-muted">這就是你目前設定的學系，請選擇其他學系。</div>';
        return;
    }

    body.innerHTML = banner + (whatIfMode === 'transfer' ? renderWhatIfTransfer(targetDept) : renderWhatIfDouble(targetDept)) + `
        <div class="master-muted whatif-disclaimer">試算以你目前的入學學年度套用目標學系規則；轉系生的編入年級、應修學分與抵免由轉入學系審核，結果僅供規劃參考。</div>`;
}

if (typeof window !== 'undefined') {
    window.openWhatIf = openWhatIf;
    window.closeWhatIf = closeWhatIf;
    window.setWhatIfMode = setWhatIfMode;
    window.renderWhatIf = renderWhatIf;
    window.applyTransfer = applyTransfer;
    window.undoTransfer = undoTransfer;
    window.reclassifyCourseForDept = reclassifyCourseForDept;
    window.buildWhatIfData = buildWhatIfData;
}
