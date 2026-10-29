// ============================================================
// 🔎 TimeFlow v3.5.1 — 就地找課 (quick-find.js)
// ------------------------------------------------------------
// 畢業檢核、課程地圖、學程等處的「找課」按鈕改為在目前頁面開啟找課彈窗，
// 直接候選、排入，不必切到找課頁再切回來；需要完整篩選時再前往找課頁。
// 搜尋、類別判定、候選與排入沿用 discover.js。
// ============================================================

const QUICK_FIND_PAGE_SIZE = 30;

const quickFindState = {
    query: {},          // { keyword?, type? } 由按鈕帶入
    label: '',
    keyword: '',
    type: '',
    source: 'current',  // 'current' 本學期開課 | 'history' 歷年課程
    visible: QUICK_FIND_PAGE_SIZE,
    autoSource: true    // 使用者沒手動切換時，本學期查無結果自動改看歷年
};

let quickFindInputTimer = null;

function isQuickFindOpen() {
    return !!document.getElementById('quickFindModal')?.classList.contains('show');
}

/**
 * 開啟就地找課
 * @param {{ keyword?: string, type?: string }} query
 * @param {string} [label] 按鈕文字，作為彈窗標題
 */
function openQuickFind(query = {}, label = '') {
    quickFindState.query = query || {};
    quickFindState.label = String(label || '').replace(/\s*›\s*$/, '');
    quickFindState.keyword = query.keyword || '';
    quickFindState.type = query.type || '';
    quickFindState.visible = QUICK_FIND_PAGE_SIZE;
    quickFindState.autoSource = true;
    quickFindState.source = 'current';

    const input = document.getElementById('quickFindInput');
    if (input) input.value = quickFindState.keyword;
    document.getElementById('quickFindTitle').textContent = quickFindState.label || '找課';

    ModalManager.open('quickFindModal');
    renderQuickFind();

    if (typeof loadCourseCatalog === 'function') {
        loadCourseCatalog().then(renderQuickFind).catch(() => {
            document.getElementById('quickFindBody').innerHTML =
                '<div class="master-muted">課程資料載入失敗，請確認網路連線後再試一次。</div>';
        });
    }
}

function closeQuickFind(e) {
    if (e && e.target !== e.currentTarget) return;
    ModalManager.close('quickFindModal');
}

function setQuickFindSource(source) {
    quickFindState.source = source === 'history' ? 'history' : 'current';
    quickFindState.autoSource = false;
    quickFindState.visible = QUICK_FIND_PAGE_SIZE;
    renderQuickFind();
}

function clearQuickFindType() {
    quickFindState.type = '';
    quickFindState.visible = QUICK_FIND_PAGE_SIZE;
    renderQuickFind();
}

function onQuickFindInput() {
    clearTimeout(quickFindInputTimer);
    quickFindInputTimer = setTimeout(() => {
        quickFindState.keyword = document.getElementById('quickFindInput').value.trim();
        quickFindState.visible = QUICK_FIND_PAGE_SIZE;
        renderQuickFind();
    }, 200);
}

function showMoreQuickFind() {
    quickFindState.visible += QUICK_FIND_PAGE_SIZE;
    renderQuickFind();
}

/**
 * 依關鍵字與類別篩選；課名完全相同 → 開頭相同 → 其他，讓要找的那門課排在最前面
 */
function searchQuickFind(pool) {
    const keyword = quickFindState.keyword.toLowerCase();
    const type = quickFindState.type;
    const rank = c => {
        if (!keyword) return 0;
        const name = (c.name || '').toLowerCase();
        if (name === keyword) return 0;
        if (name.startsWith(keyword)) return 1;
        return 2;
    };

    return pool.filter(c => {
        c.type = resolveCatalogType(c);
        if (keyword) {
            const haystack = [c.name, c.teacher, c.code, c.deptSeq, c.dept].join(' ').toLowerCase();
            if (!haystack.includes(keyword)) return false;
        }
        return matchDiscoverType(c, type);
    }).map((c, i) => ({ c, r: rank(c), i }))
        .sort((a, b) => (a.r - b.r) || (a.i - b.i))
        .map(x => x.c);
}

/**
 * 這門課（同課號）已排在哪些學期
 */
function getPlannedSemesters(course) {
    const code = (course.code || '').trim().toUpperCase();
    if (!code) return [];
    return (appData.semesterOrder || []).filter(sem =>
        (appData.semesters[sem] || []).some(c => (c.code || '').trim().toUpperCase() === code));
}

function quickFindRowHTML(c) {
    const safeId = escapeHTML(c.id);
    const isWish = isCourseInWishlist(c);
    const planned = getPlannedSemesters(c);
    const prereq = buildPrereqTag(c);
    const meta = [
        c.dept,
        c.grade ? `${c.grade} 年級` : '',
        `${c.credits} 學分`,
        c.teacher || '教師未定'
    ].filter(Boolean).map(escapeHTML).join(' · ');

    return `
        <li class="quick-find-row">
            <div class="quick-find-info" onclick="showDiscoverDetail('${safeId}')" title="查看課程詳情">
                <div class="quick-find-name">
                    <b>${escapeHTML(c.name)}</b>
                    <span class="l-type-badge">${escapeHTML(c.type)}</span>
                    ${offeringBadgeHtml(c)}
                    ${planned.length ? `<span class="tf-badge tf-badge-success">已排入 ${escapeHTML(planned.join('、'))}</span>` : ''}
                </div>
                <div class="quick-find-meta">${meta}</div>
                <div class="quick-find-meta">${Icons.get('clock', { size: 11 })} ${escapeHTML(formatCatalogSlots(c) + formatSlotSource(c))}${c.room ? ` · ${escapeHTML(c.room)}` : ''}</div>
                ${prereq ? `<div class="quick-find-meta">需先修：${prereq}</div>` : ''}
            </div>
            <div class="quick-find-actions">
                <button type="button" class="tf-btn tf-btn-sm ${isWish ? 'btn-act-wish is-active' : 'tf-btn-ghost'}" onclick="addDiscoverToWishlist('${safeId}')">${Icons.get('star', { size: 12 })} ${isWish ? '已候選' : '候選'}</button>
                <button type="button" class="tf-btn tf-btn-sm tf-btn-primary" onclick="openAddToSemesterModal('${safeId}')">${Icons.get('plus', { size: 12 })} 排入</button>
            </div>
        </li>`;
}

function renderQuickFind() {
    const body = document.getElementById('quickFindBody');
    const sourceBox = document.getElementById('quickFindSource');
    if (!body || !sourceBox) return;

    // 類別條件以可移除的標籤呈現
    const typeChip = document.getElementById('quickFindTypeChip');
    if (typeChip) {
        typeChip.innerHTML = quickFindState.type
            ? `<span class="program-chip">類別：${escapeHTML(quickFindState.type)}<button type="button" class="course-map-restore" onclick="clearQuickFindType()" title="移除類別條件">✕</button></span>`
            : '';
    }

    if (!window.COURSE_CATALOG || !window.COURSE_HISTORY) {
        sourceBox.innerHTML = '';
        body.innerHTML = '<div class="master-muted">課程資料載入中…第一次開啟需要下載全校課程資料，請稍候。</div>';
        return;
    }

    const current = searchQuickFind(getCourseCatalog());
    const history = searchQuickFind(getCourseHistory());
    if (quickFindState.autoSource && current.length === 0 && history.length > 0) {
        quickFindState.source = 'history';
    }
    const isHistory = quickFindState.source === 'history';
    const list = isHistory ? history : current;

    const meta = window.COURSE_CATALOG_META;
    const hMeta = window.COURSE_HISTORY_META;
    sourceBox.innerHTML = `
        <div class="tf-degree-switch" role="group" aria-label="資料來源">
            <button type="button" class="tf-pill-btn ${isHistory ? '' : 'active'}" onclick="setQuickFindSource('current')">本學期開課${meta ? `（${escapeHTML(meta.semester)}）` : ''}・${current.length}</button>
            <button type="button" class="tf-pill-btn ${isHistory ? 'active' : ''}" onclick="setQuickFindSource('history')">歷年課程${hMeta ? `（${escapeHTML(hMeta.from)}～${escapeHTML(hMeta.to)}）` : ''}・${history.length}</button>
        </div>`;

    if (list.length === 0) {
        body.innerHTML = `<div class="master-muted">${current.length + history.length === 0
            ? '本學期與歷年課程都查無符合的課，試試縮短關鍵字或移除類別條件。'
            : '這個資料來源查無符合的課，可切換上方的資料來源。'}</div>`;
        return;
    }

    const visible = list.slice(0, quickFindState.visible);
    const remaining = list.length - visible.length;
    body.innerHTML = `
        ${isHistory ? '<div class="master-muted">歷年課程的時段取自最近一次開課，排入後請依當學期公告確認。</div>' : ''}
        <ul class="quick-find-list">${visible.map(quickFindRowHTML).join('')}</ul>
        ${remaining > 0 ? `<button type="button" class="tf-btn tf-btn-sm tf-btn-secondary" style="align-self:center;" onclick="showMoreQuickFind()">顯示更多（還有 ${remaining} 門）</button>` : ''}`;
}

/**
 * 候選、排入後更新列表（彈窗沒開就略過）
 */
function refreshQuickFind() {
    if (isQuickFindOpen()) renderQuickFind();
}

/**
 * 前往找課頁並帶入目前的條件（需要更多篩選時）
 */
function openQuickFindInDiscover() {
    if (typeof setDiscoverSource === 'function') setDiscoverSource(quickFindState.source);
    openDiscoverWithQuery({ keyword: quickFindState.keyword, type: quickFindState.type });
}

if (typeof window !== 'undefined') {
    window.openQuickFind = openQuickFind;
    window.closeQuickFind = closeQuickFind;
    window.setQuickFindSource = setQuickFindSource;
    window.clearQuickFindType = clearQuickFindType;
    window.onQuickFindInput = onQuickFindInput;
    window.showMoreQuickFind = showMoreQuickFind;
    window.refreshQuickFind = refreshQuickFind;
    window.openQuickFindInDiscover = openQuickFindInDiscover;
}
