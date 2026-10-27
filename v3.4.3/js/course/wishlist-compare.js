// ============================================================
// ⚖️ TimeFlow v3.4.3 — 候選課比較 (wishlist-compare.js)
// ------------------------------------------------------------
// 把幾門候選課放在一起看：週課表疊圖、彼此與已排課程是否衝堂、
// 學分加總、畢業類別、開課學期與先修狀態，並可直接排入。
// ============================================================

const COMPARE_MAX = 8;
let compareSelection = new Set();

/**
 * 與候選清單相同的篩選（本學期／全部）
 */
function getCompareCandidates() {
    const list = appData.wishlist || [];
    if (typeof currentWishlistFilter !== 'undefined' && currentWishlistFilter === 'current') {
        return list.filter(w => !w.semester || w.semester === appData.currentSemester);
    }
    return list;
}

function openWishlistCompare() {
    const candidates = getCompareCandidates();
    if (!candidates.length) {
        alert('候選清單是空的，先從找課或課程表單加入幾門候選課吧！');
        return;
    }
    compareSelection = new Set(candidates.slice(0, COMPARE_MAX).map(w => String(w.id)));
    renderWishlistCompare();
    ModalManager.open('wishlistCompareModal');
}

function closeWishlistCompare(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
    ModalManager.close('wishlistCompareModal');
}

function toggleCompareItem(id, checked) {
    if (checked && compareSelection.size >= COMPARE_MAX) {
        alert(`一次最多比較 ${COMPARE_MAX} 門課。`);
        renderWishlistCompare();
        return;
    }
    if (checked) compareSelection.add(String(id));
    else compareSelection.delete(String(id));
    renderWishlistCompare();
}

function compareAddToSchedule(id) {
    addWishlistToSchedule(id);
    compareSelection.delete(String(id));
    if (getCompareCandidates().length) renderWishlistCompare();
    else ModalManager.close('wishlistCompareModal');
}

/**
 * 課程佔用的「星期-節次」集合（單雙週課程視為每週都佔用，保守判斷衝堂）
 */
function getCourseSlotKeys(course) {
    const keys = new Set();
    (course.slots || []).forEach(s => (s.periods || []).forEach(p => keys.add(`${s.day}-${p}`)));
    return keys;
}

function coursesOverlap(a, b) {
    const keysA = getCourseSlotKeys(a);
    return [...getCourseSlotKeys(b)].some(k => keysA.has(k));
}

function formatCourseSlots(course) {
    const names = (typeof dayNames !== 'undefined') ? dayNames : {};
    const text = (course.slots || [])
        .filter(s => (s.periods || []).length)
        .map(s => `(${names[s.day] || s.day})${s.periods.join(',')}`)
        .join(' ');
    return text || '未排時段';
}

/**
 * 逐門分析：衝堂、開課學期、先修
 */
function analyzeCompareCandidate(item, selected, scheduled, sem) {
    const conflictScheduled = scheduled.filter(c => coursesOverlap(c, item)).map(c => c.name);
    const conflictCandidates = selected.filter(c => c !== item && coursesOverlap(c, item)).map(c => c.name);
    const offering = (item.code && typeof checkOfferingForSemester === 'function') ? checkOfferingForSemester(item.code, sem) : null;

    let prereq = null;
    if (window.PrerequisiteEngine) {
        const result = PrerequisiteEngine.check(item, sem, appData.semesters, appData.semesterOrder);
        if (result.hasPrerequisite) prereq = { level: result.overallStatus, text: result.message };
    }
    return { conflictScheduled, conflictCandidates, offering, prereq };
}

/**
 * 迷你週課表：已排課程為灰色、勾選的候選依課程顏色，同一格多門課標示衝堂
 */
function renderCompareGrid(scheduled, selected) {
    const allSlots = (typeof timeSlots !== 'undefined') ? timeSlots : [];
    const courses = [...scheduled.map(c => ({ c, kind: 'scheduled' })), ...selected.map(c => ({ c, kind: 'candidate' }))];

    const usedIdx = [];
    const usedDays = new Set();
    courses.forEach(({ c }) => (c.slots || []).forEach(s => {
        usedDays.add(s.day);
        (s.periods || []).forEach(p => {
            const idx = allSlots.findIndex(slot => String(slot.period) === String(p));
            if (idx !== -1) usedIdx.push(idx);
        });
    }));
    if (!usedIdx.length) return '<div class="master-muted">勾選的候選課程沒有排定時段。</div>';

    const slots = allSlots.slice(Math.min(...usedIdx), Math.max(...usedIdx) + 1);
    const days = [1, 2, 3, 4, 5, 6, 7].filter(d => d <= 5 || usedDays.has(d));
    const names = (typeof dayNames !== 'undefined') ? dayNames : {};

    const cell = (day, period) => {
        const key = `${day}-${period}`;
        const here = courses.filter(({ c }) => getCourseSlotKeys(c).has(key));
        const chips = here.map(({ c, kind }) => {
            const color = /^#[0-9a-fA-F]{3,8}$/.test(c.color || '') ? c.color : '#2563eb';
            const style = kind === 'candidate'
                ? `background:${color}; color:${typeof getContrastTextColor === 'function' ? getContrastTextColor(color) : '#fff'};`
                : '';
            return `<span class="compare-chip ${kind}" style="${style}" title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</span>`;
        }).join('');
        return `<div class="compare-cell ${here.length > 1 ? 'conflict' : ''}">${chips}</div>`;
    };

    return `
        <div class="compare-grid" style="grid-template-columns:44px repeat(${days.length}, minmax(0, 1fr));">
            <div></div>
            ${days.map(d => `<div class="compare-grid-head">${escapeHTML(names[d] || d)}</div>`).join('')}
            ${slots.map(slot => `
                <div class="compare-grid-period">${escapeHTML(slot.period)}</div>
                ${days.map(d => cell(d, slot.period)).join('')}
            `).join('')}
        </div>`;
}

function renderWishlistCompare() {
    const body = document.getElementById('wishlistCompareBody');
    if (!body) return;

    const sem = appData.currentSemester;
    const candidates = getCompareCandidates();
    const selected = candidates.filter(w => compareSelection.has(String(w.id)));
    const scheduled = ((appData.semesters && appData.semesters[sem]) || []).filter(c => !c.isTentative);

    const scheduledCredits = scheduled.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
    const selectedCredits = selected.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);

    const rows = candidates.map(item => {
        const isSelected = compareSelection.has(String(item.id));
        const info = isSelected ? analyzeCompareCandidate(item, selected, scheduled, sem) : null;
        const cleanId = escapeHTML(String(item.id));
        const origin = typeof getWishlistOrigin === 'function' ? getWishlistOrigin(item) : { dept: '' };

        const flags = [];
        if (info) {
            if (info.conflictScheduled.length) flags.push(`<span class="tf-badge tf-badge-danger">與已排衝堂：${escapeHTML(info.conflictScheduled.join('、'))}</span>`);
            if (info.conflictCandidates.length) flags.push(`<span class="tf-badge tf-badge-warning">與候選衝堂：${escapeHTML(info.conflictCandidates.join('、'))}</span>`);
            if (!info.conflictScheduled.length && !info.conflictCandidates.length && (item.slots || []).some(s => (s.periods || []).length)) {
                flags.push('<span class="tf-badge tf-badge-success">不衝堂</span>');
            }
            if (info.prereq) {
                const cls = info.prereq.level === 'passed' ? 'tf-badge-success' : (info.prereq.level === 'blocked' ? 'tf-badge-danger' : 'tf-badge-warning');
                flags.push(`<span class="tf-badge ${cls}" title="${escapeHTML(info.prereq.text)}">先修：${escapeHTML(info.prereq.text)}</span>`);
            }
            if (info.offering) flags.push(`<span class="tf-badge tf-badge-warning" title="${escapeHTML(info.offering)}">開課學期可能不符</span>`);
        }

        return `
            <div class="compare-row ${isSelected ? '' : 'dimmed'}">
                <label class="compare-row-check">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleCompareItem('${cleanId}', this.checked)">
                </label>
                <div class="compare-row-main">
                    <div class="compare-row-title">
                        <b>${escapeHTML(item.name)}</b>
                        <span class="master-muted">${escapeHTML(item.credits)} 學分・${escapeHTML(item.type)}${origin.dept ? `・${escapeHTML(origin.dept)}` : ''}</span>
                    </div>
                    <div class="master-muted">${escapeHTML(formatCourseSlots(item))}${item.teacher ? `｜${escapeHTML(item.teacher)}` : ''}${item.semester && item.semester !== sem ? `｜候選學期 ${escapeHTML(item.semester)}` : ''}</div>
                    ${flags.length ? `<div class="compare-row-flags">${flags.join('')}</div>` : ''}
                </div>
                <button type="button" class="btn-wishlist-add-mini" onclick="compareAddToSchedule('${cleanId}')">＋ 排入</button>
            </div>`;
    }).join('');

    body.innerHTML = `
        <div class="compare-summary">
            <span>比較學期：<b>${escapeHTML(sem)}</b></span>
            <span>已排 <b>${escapeHTML(scheduledCredits)}</b> 學分 ＋ 勾選候選 <b>${escapeHTML(selectedCredits)}</b> 學分 ＝ <b class="compare-total">${escapeHTML(scheduledCredits + selectedCredits)}</b> 學分</span>
        </div>
        ${renderCompareGrid(scheduled, selected)}
        <div class="compare-legend"><span class="compare-chip scheduled">已排課程</span><span class="compare-chip candidate" style="background:var(--tf-color-primary); color:#fff;">勾選的候選</span><span class="compare-legend-conflict">紅框＝衝堂</span></div>
        <div class="compare-list">${rows}</div>
    `;
}

if (typeof window !== 'undefined') {
    window.openWishlistCompare = openWishlistCompare;
    window.closeWishlistCompare = closeWishlistCompare;
    window.toggleCompareItem = toggleCompareItem;
    window.compareAddToSchedule = compareAddToSchedule;
}
