// ============================================================
// 🎯 TimeFlow v3.5.1 — 學分學程／微學程檢核 (program-check.js)
// ------------------------------------------------------------
// 學程的科目清單由使用者依各學程公告自行輸入（學程種類多、每年調整，未內建規則）。
// 一門課可以同時算入主修與學程，因此這裡只「對照」課表，不改動課程類別。
// 資料：appData.programs（正規化見 data.js normalizePrograms）
// 大學部與研究所共用。
// ============================================================

const PROGRAM_KINDS = ['學分學程', '微學程', '其他'];
let editingProgramId = null;

function programNameKey(name) {
    return typeof cleanGeneralCourseTitle === 'function'
        ? cleanGeneralCourseTitle(name)
        : String(name || '').replace(/\s/g, '').toLowerCase();
}

/**
 * 把輸入框文字拆成課名清單：換行、頓號、逗號、分號皆可分隔
 */
function parseProgramCourseList(text) {
    const seen = new Set();
    return String(text || '')
        .split(/[\n\r、,，;；]+/)
        .map(s => s.trim())
        .filter(s => {
            const key = programNameKey(s);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

// 課程狀態排序：同一門課重修時取最好的狀態
const PROGRAM_STATUS_RANK = { done: 3, progress: 2, planned: 1 };

function getProgramCourseStatus(course) {
    if (course.status === '未取得') return null;
    if (course.isTentative) return 'planned';
    if (course.status === '已取得' || course.status === '已抵免') return 'done';
    return 'progress';
}

/**
 * 計算單一學程的達成狀況
 * @returns {{ earned: number, expected: number, planned: number, required: Array, counted: Array, isPassed: boolean }}
 */
function calculateProgramProgress(program, data) {
    const requiredKeys = new Map(program.required.map(n => [programNameKey(n), n]));
    const electiveKeys = new Set(program.electives.map(programNameKey));
    const extraIds = new Set(program.extraIds);
    const order = data.semesterOrder || Object.keys(data.semesters || {});

    // 依課名合併（重修只算一次），保留最好的狀態
    const matched = new Map();
    order.forEach(sem => {
        (data.semesters[sem] || []).forEach(course => {
            const status = getProgramCourseStatus(course);
            if (!status) return;
            const key = programNameKey(course.name);
            const isRequired = requiredKeys.has(key);
            if (!isRequired && !electiveKeys.has(key) && !extraIds.has(String(course.id))) return;

            const prev = matched.get(key);
            if (prev && PROGRAM_STATUS_RANK[prev.status] >= PROGRAM_STATUS_RANK[status]) return;
            matched.set(key, {
                key, sem, status, isRequired,
                name: course.name,
                credits: parseFloat(course.credits) || 0
            });
        });
    });

    let earned = 0, expected = 0, planned = 0;
    matched.forEach(m => {
        if (m.status === 'done') earned += m.credits;
        if (m.status !== 'planned') expected += m.credits;
        planned += m.credits;
    });

    const required = [...requiredKeys].map(([key, name]) => {
        const m = matched.get(key);
        return { name, status: m ? m.status : 'missing', sem: m ? m.sem : '' };
    });
    const counted = [...matched.values()].filter(m => !m.isRequired);
    const isPassed = earned >= program.targetCredits && required.every(r => r.status === 'done');

    return { earned, expected, planned, required, counted, isPassed };
}

// ── 畫面 ──

const PROGRAM_STATUS_LABEL = { done: '已修', progress: '修讀中', planned: '暫定', missing: '未排' };
const PROGRAM_STATUS_CLASS = { done: 'is-done', progress: 'is-progress', planned: '', missing: 'is-missing' };

function programChipHTML(name, status, sem) {
    const label = PROGRAM_STATUS_LABEL[status];
    const where = sem ? `${sem}・` : '';
    const find = status === 'missing' && typeof findCoursesButtonHTML === 'function'
        ? findCoursesButtonHTML({ keyword: name }, '找課') : '';
    return `<span class="program-chip ${PROGRAM_STATUS_CLASS[status]}" title="${escapeHTML(where + label)}">${escapeHTML(name)}<span class="master-muted">${escapeHTML(where + label)}</span>${find}</span>`;
}

function programCardHTML(program, res) {
    const target = program.targetCredits;
    const pct = target ? Math.min(100, Math.round((res.earned / target) * 100)) : 0;
    const statusBadge = res.isPassed
        ? '<span class="tf-badge tf-badge-success">已達標</span>'
        : (res.expected >= target && target > 0 ? '<span class="tf-badge tf-badge-accent">含修讀中可達學分</span>' : '');
    const missingCount = res.required.filter(r => r.status === 'missing').length;

    const requiredBlock = res.required.length ? `
        <div class="program-sub-label">必修科目（${res.required.length - missingCount}／${res.required.length} 已排入）</div>
        <div class="program-chips">${res.required.map(r => programChipHTML(r.name, r.status, r.sem)).join('')}</div>` : '';
    const countedBlock = `
        <div class="program-sub-label">已算入的選修（${res.counted.length} 門）</div>
        ${res.counted.length
            ? `<div class="program-chips">${res.counted.map(c => programChipHTML(`${c.name}（${c.credits}）`, c.status, c.sem)).join('')}</div>`
            : '<div class="master-muted">課表中還沒有符合選修清單的課程。</div>'}`;

    return `
        <div class="program-card ${res.isPassed ? 'program-passed' : ''}">
            <div class="program-card-title">
                <span>${escapeHTML(program.name)}</span>
                <span class="tf-badge tf-badge-accent">${escapeHTML(program.kind)}</span>
                ${statusBadge}
                <span class="program-card-actions">
                    <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" onclick="openProgramEditor('${escapeHTML(program.id)}')">編輯</button>
                </span>
            </div>
            <div class="whatif-bar">
                <div class="whatif-bar-label">
                    <span>已修 <b>${escapeHTML(res.earned)}</b>｜含修讀中 ${escapeHTML(res.expected)}｜含暫定 ${escapeHTML(res.planned)}</span>
                    <span>目標 ${escapeHTML(target)} 學分</span>
                </div>
                <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
            </div>
            ${requiredBlock}
            ${countedBlock}
        </div>`;
}

function renderProgramCheck() {
    const panel = document.getElementById('programCheckPanel');
    if (!panel || !window.appData) return;
    const programs = appData.programs || [];

    const body = programs.length
        ? `<div class="program-list">${programs.map(p => programCardHTML(p, calculateProgramProgress(p, appData))).join('')}</div>`
        : '<div class="master-muted">還沒有加入學程。按「新增學程」並貼上學程公告的科目清單，就能追蹤已修學分與缺少的必修。</div>';

    panel.innerHTML = `
        <div class="master-section">
            <div class="program-head">
                <div class="master-section-title">學分學程／微學程${programs.length ? `<span class="tf-badge tf-badge-accent" style="margin-left:6px;">${programs.length} 個</span>` : ''}</div>
                <button type="button" class="tf-btn tf-btn-sm tf-btn-primary" onclick="openProgramEditor()" ${programs.length >= MAX_PROGRAMS ? 'disabled title="最多 10 個學程"' : ''}>＋ 新增學程</button>
            </div>
            ${body}
            <div class="master-muted">依課名比對課表（重修只算一次），一門課可同時算入主修與學程；科目清單與學分請依各學程最新公告輸入，實際認定以學程辦公室為準。</div>
        </div>`;
}

// ── 編輯彈窗 ──

function renderProgramManualList(program) {
    const box = document.getElementById('programManualList');
    if (!box) return;
    const chosen = new Set(program ? program.extraIds : []);
    const rows = [];
    (appData.semesterOrder || []).forEach(sem => {
        (appData.semesters[sem] || []).forEach(c => {
            rows.push(`<label><input type="checkbox" value="${escapeHTML(String(c.id))}" ${chosen.has(String(c.id)) ? 'checked' : ''}>
                <span>${escapeHTML(sem)}｜${escapeHTML(c.name)}<span class="master-muted">（${escapeHTML(c.credits)} 學分）</span></span></label>`);
        });
    });
    box.innerHTML = rows.length ? rows.join('') : '<div class="master-muted">課表中還沒有課程。</div>';
}

function openProgramEditor(id) {
    const program = id ? (appData.programs || []).find(p => p.id === id) : null;
    if (!program && (appData.programs || []).length >= MAX_PROGRAMS) {
        alert(`最多只能加入 ${MAX_PROGRAMS} 個學程。`);
        return;
    }
    editingProgramId = program ? program.id : null;

    document.getElementById('programEditTitle').textContent = program ? '編輯學程' : '新增學程';
    document.getElementById('programNameInput').value = program ? program.name : '';
    document.getElementById('programKindSelect').value = program ? program.kind : '學分學程';
    document.getElementById('programCreditsInput').value = program ? program.targetCredits : 20;
    document.getElementById('programRequiredInput').value = program ? program.required.join('\n') : '';
    document.getElementById('programElectiveInput').value = program ? program.electives.join('\n') : '';
    document.getElementById('btnProgramDelete').style.display = program ? '' : 'none';
    renderProgramManualList(program);

    ModalManager.open('programEditModal');
    document.getElementById('programNameInput').focus();
}

function closeProgramEditor(e) {
    if (e && e.target !== e.currentTarget) return;
    ModalManager.close('programEditModal');
    editingProgramId = null;
}

function saveProgramEditor() {
    const name = document.getElementById('programNameInput').value.trim();
    if (!name) {
        alert('請輸入學程名稱。');
        return;
    }
    const extraIds = [...document.querySelectorAll('#programManualList input:checked')].map(el => el.value);
    const program = normalizeProgram({
        id: editingProgramId || `p${Date.now()}`,
        name,
        kind: document.getElementById('programKindSelect').value,
        targetCredits: document.getElementById('programCreditsInput').value,
        required: parseProgramCourseList(document.getElementById('programRequiredInput').value),
        electives: parseProgramCourseList(document.getElementById('programElectiveInput').value),
        extraIds
    });
    if (!program) return;

    const idx = appData.programs.findIndex(p => p.id === program.id);
    if (idx === -1) appData.programs.push(program);
    else appData.programs[idx] = program;

    saveData();
    ModalManager.close('programEditModal');
    editingProgramId = null;
    renderProgramCheck();
}

function deleteProgramFromEditor() {
    const idx = appData.programs.findIndex(p => p.id === editingProgramId);
    if (idx === -1) return;
    const [removed] = appData.programs.splice(idx, 1);
    saveData();
    ModalManager.close('programEditModal');
    editingProgramId = null;
    renderProgramCheck();

    showToast(`已刪除學程「${removed.name}」`, {
        actionLabel: '復原',
        onAction: () => {
            if (appData.programs.some(p => p.id === removed.id)) return;
            appData.programs.splice(Math.min(idx, appData.programs.length), 0, removed);
            saveData();
            renderProgramCheck();
        }
    });
}

if (typeof window !== 'undefined') {
    window.calculateProgramProgress = calculateProgramProgress;
    window.renderProgramCheck = renderProgramCheck;
    window.openProgramEditor = openProgramEditor;
    window.closeProgramEditor = closeProgramEditor;
    window.saveProgramEditor = saveProgramEditor;
    window.deleteProgramFromEditor = deleteProgramFromEditor;
}
