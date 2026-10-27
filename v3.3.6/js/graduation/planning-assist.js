// ============================================================
// 🧭 TimeFlow v3.3.6 — 畢業檢核與找課的串接 (planning-assist.js)
// ------------------------------------------------------------
// 1. 找課補足：畢業檢核未達標的項目，一鍵跳到找課並帶入對應篩選
// 2. 排程檢查：掃描尚未修完的課程，檢查開課學期與先修順序
// 大學部與研究所共用。
// ============================================================

// ── 找課補足 ──

/**
 * 跳到找課並套用篩選
 * @param {{ type?: string, keyword?: string }} query type 為找課「類別」篩選值，keyword 為搜尋字
 */
function findCoursesFor(query = {}) {
    if (typeof switchView === 'function') switchView('discover');
    if (typeof loadCourseCatalog !== 'function') return;

    loadCourseCatalog().then(() => {
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        setValue('discoverSearchInput', query.keyword || '');
        setValue('filterDiscoverDept', '');
        ['filterDiscoverGrade', 'filterDiscoverCredits', 'filterDiscoverDay', 'filterDiscoverPeriod', 'filterDiscoverTerm']
            .forEach(id => setValue(id, 'all'));

        const typeSelect = document.getElementById('filterDiscoverType');
        if (typeSelect) {
            const hasType = query.type && [...typeSelect.options].some(o => o.value === query.type);
            typeSelect.value = hasType ? query.type : 'all';
        }
        const noConflict = document.getElementById('filterDiscoverNoConflict');
        if (noConflict) noConflict.checked = false;

        handleDiscoverSearch();
        document.getElementById('view-discover')?.scrollIntoView({ block: 'start' });
    }).catch(() => { /* 載入失敗時找課頁本身會顯示錯誤 */ });
}

/**
 * 「找課補足」按鈕 HTML；查詢條件以 data 屬性傳遞，避免在 onclick 中拼接字串
 */
function findCoursesButtonHTML(query, label = '找課補足') {
    return `<button type="button" class="tf-find-btn" data-find="${escapeHTML(JSON.stringify(query))}"
        onclick="event.stopPropagation(); findCoursesFor(JSON.parse(this.dataset.find))">${escapeHTML(label)} ›</button>`;
}

/**
 * 大學部檢核卡片（寫在 index.html 的固定卡片）：未達標時在卡片底部顯示找課按鈕
 */
function setCardFindButton(cardId, query, label) {
    const card = document.getElementById(cardId);
    if (!card) return;
    let slot = card.querySelector('.tf-find-slot');
    if (!slot) {
        slot = document.createElement('div');
        slot.className = 'tf-find-slot';
        card.appendChild(slot);
    }
    const show = !!query && !card.classList.contains('passed-status');
    slot.innerHTML = show ? findCoursesButtonHTML(query, label) : '';
    slot.style.display = show ? '' : 'none';
}

/**
 * 依大學部檢核結果更新各卡片的找課按鈕
 */
function updateBachelorFindButtons(res) {
    if (!res) return;
    const isCCEP = !!res.isInterdisciplinary;
    setCardFindButton('card-req', isCCEP ? null : { type: '系定必修' }, '找系定必修');
    setCardFindButton('card-elec', isCCEP ? null : { type: '選修-本系' }, '找本系選修');

    // 通識：領域通識未達標找通識，融合通識未達標找融通
    const gen = res.generalEducation || {};
    const genQuery = gen.domain && !gen.domain.isPassed ? { type: '通識' }
        : (gen.rong && !gen.rong.isPassed ? { type: '融通' } : null);
    setCardFindButton('card-gen-combined', genQuery, genQuery && genQuery.type === '融通' ? '找融合通識' : '找通識');

    setCardFindButton('card-chinese', { keyword: '國文' }, '找國文');
    setCardFindButton('card-english', { keyword: '英文' }, '找英文');
    setCardFindButton('card-pe', { keyword: '體育' }, '找體育');
    setCardFindButton('card-tainan', { keyword: '踏溯' }, '找踏溯台南');
}

// ── 排程檢查 ──

/**
 * 掃描尚未修完（修讀中、暫定）的課程：
 * - 開課學期：歷年只在上（下）學期開，卻排在另一個學期
 * - 先修順序：先修課沒有排在之前的學期
 */
function collectScheduleIssues(data) {
    const order = data.semesterOrder || Object.keys(data.semesters || {});
    const requiredTypes = new Set(['系定必修', '本所必修']);
    const issues = [];

    order.forEach(sem => {
        (data.semesters[sem] || []).forEach(course => {
            if (course.status === '已取得' || course.status === '已抵免') return;
            const base = { semester: sem, name: course.name, required: requiredTypes.has(course.type), tentative: !!course.isTentative };

            const offering = (course.code && typeof checkOfferingForSemester === 'function')
                ? checkOfferingForSemester(course.code, sem) : null;
            if (offering) issues.push({ ...base, kind: '開課學期', text: offering });

            if (window.PrerequisiteEngine) {
                const result = PrerequisiteEngine.check(course, sem, data.semesters, order);
                if (result.overallStatus === 'blocked') issues.push({ ...base, kind: '先修順序', text: result.message });
            }
        });
    });

    // 必修排在前面，其次依學期順序
    return issues.sort((a, b) => (b.required - a.required) || (order.indexOf(a.semester) - order.indexOf(b.semester)));
}

let scheduleCheckLoading = false;

function renderScheduleCheck() {
    const panel = document.getElementById('scheduleCheckPanel');
    if (!panel) return;

    // 開課學期需要歷年課程資料；尚未載入時先在背景載入，完成後重畫
    const historyReady = !!window.COURSE_HISTORY && typeof getOfferingInfo === 'function';
    if (!historyReady && typeof loadCourseCatalog === 'function' && !scheduleCheckLoading) {
        scheduleCheckLoading = true;
        loadCourseCatalog()
            .then(() => { scheduleCheckLoading = false; renderScheduleCheck(); })
            .catch(() => { scheduleCheckLoading = false; });
    }

    const issues = collectScheduleIssues(appData);
    const body = issues.length
        ? `<ul class="schedule-check-list">${issues.map(i => `
            <li>
                <div class="schedule-check-head">
                    <span class="tf-badge ${i.kind === '先修順序' ? 'tf-badge-danger' : 'tf-badge-warning'}">${escapeHTML(i.kind)}</span>
                    ${i.required ? '<span class="tf-badge tf-badge-accent">必修</span>' : ''}
                    <b>${escapeHTML(i.semester)}｜${escapeHTML(i.name)}</b>${i.tentative ? '<span class="master-muted">（暫定）</span>' : ''}
                </div>
                <div class="schedule-check-text">${escapeHTML(i.text)}</div>
            </li>`).join('')}</ul>`
        : `<div class="master-muted">${historyReady ? '目前排定的課程沒有發現開課學期或先修順序的問題。' : '正在載入歷年開課資料，完成後會檢查開課學期…'}</div>`;

    panel.innerHTML = `
        <div class="master-section">
            <div class="master-section-title">排程檢查（開課學期・先修順序）${issues.length ? `<span class="tf-badge tf-badge-warning" style="margin-left:6px;">${issues.length} 項</span>` : ''}</div>
            ${body}
            <div class="master-muted">只檢查尚未修完的課程；開課學期依 ${escapeHTML(window.COURSE_HISTORY_META ? `${window.COURSE_HISTORY_META.from}～${window.COURSE_HISTORY_META.to}` : '歷年')} 開課紀錄推估，實際以學校當學期公告為準。</div>
        </div>`;
}

if (typeof window !== 'undefined') {
    window.findCoursesFor = findCoursesFor;
    window.findCoursesButtonHTML = findCoursesButtonHTML;
    window.updateBachelorFindButtons = updateBachelorFindButtons;
    window.collectScheduleIssues = collectScheduleIssues;
    window.renderScheduleCheck = renderScheduleCheck;
}
