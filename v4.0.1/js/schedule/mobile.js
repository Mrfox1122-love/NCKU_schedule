// ============================================================
// 📱 TimeFlow v4.0.1 — 手機版輔助 (mobile.js)
// ------------------------------------------------------------
// 1. 今天的課：規劃頁最上方列出今天的課與下一堂（手機版顯示）
// 2. 規劃頁「更多」：手機上把次要按鈕收起來，課表不會被擠到下面
// 3. 找課篩選抽屜：手機上篩選條件從底部滑出，結果列表直接在搜尋框下方
// ============================================================

(function () {

// ── 今天的課 ───────────────────────────────────────────────

/** 節次 → { start, end }（分鐘數） */
function getPeriodMinutes(period) {
    const slot = timeSlots.find(s => s.period === String(period));
    if (!slot) return null;
    const [start, end] = slot.time.split('~').map(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    });
    return { start, end };
}

function formatMinutes(min) {
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** JS 的 getDay()（0=週日）→ TimeFlow 的星期（1=週一 … 7=週日） */
function toTfDay(date) {
    const d = date.getDay();
    return d === 0 ? 7 : d;
}

/**
 * 某天要上的課，依開始時間排序。
 * 回傳 [{ course, start, end, periods }]；同一門課同一天分開的時段各算一筆。
 * 暫定課程與無固定時間的課不列入。
 */
function getClassesOnDay(courses, day) {
    const out = [];
    (courses || []).forEach(course => {
        if (!course || course.isTentative || course.isNoSchedule) return;
        (course.slots || []).forEach(slot => {
            if (Number(slot.day) !== day || !slot.periods || !slot.periods.length) return;
            const sorted = slot.periods.slice().sort((a, b) => periodOrder.indexOf(a) - periodOrder.indexOf(b));
            // 不連續的節次（例如 2、5）拆成兩段
            let group = [];
            const flush = () => {
                if (!group.length) return;
                const first = getPeriodMinutes(group[0]);
                const last = getPeriodMinutes(group[group.length - 1]);
                if (first && last) out.push({ course, start: first.start, end: last.end, periods: group.slice() });
                group = [];
            };
            sorted.forEach(p => {
                const prev = group[group.length - 1];
                if (prev !== undefined && periodOrder.indexOf(p) !== periodOrder.indexOf(prev) + 1) flush();
                group.push(p);
            });
            flush();
        });
    });
    return out.sort((a, b) => a.start - b.start);
}

/**
 * 今天的課表摘要。now 可傳入方便測試。
 * 回傳 { day, items:[{..., state:'done'|'now'|'next'|'later'}], nextDay }
 * nextDay：今天沒有接下來的課時，往後找第一個有課的日子 { day, first }
 */
function getTodaySummary(courses, now) {
    const date = now || new Date();
    const day = toTfDay(date);
    const minutes = date.getHours() * 60 + date.getMinutes();
    const items = getClassesOnDay(courses, day).map(item => ({ ...item, state: 'later' }));

    let nextMarked = false;
    items.forEach(item => {
        if (minutes >= item.end) item.state = 'done';
        else if (minutes >= item.start) item.state = 'now';
        else if (!nextMarked) { item.state = 'next'; nextMarked = true; }
    });

    let nextDay = null;
    if (!items.some(i => i.state !== 'done')) {
        for (let offset = 1; offset <= 7; offset++) {
            const d = ((day - 1 + offset) % 7) + 1;
            const list = getClassesOnDay(courses, d);
            if (list.length) { nextDay = { day: d, first: list[0], offset }; break; }
        }
    }
    return { day, items, nextDay };
}

/** 學期的顯示名稱（與學期選單一致，例如「大一 上學期」） */
function getSemesterLabel(sem) {
    const select = document.getElementById('semSelect');
    const opt = select && Array.from(select.options || []).find(o => o.value === sem);
    return opt ? opt.textContent.trim() : sem;
}

function renderTodayCard() {
    const box = document.getElementById('todayCard');
    if (!box || typeof appData === 'undefined') return;
    const sem = appData.currentSemester;
    const courses = (appData.semesters && appData.semesters[sem]) || [];
    const scheduled = courses.filter(c => !c.isTentative && !c.isNoSchedule && c.slots && c.slots.length);
    const hasOngoing = scheduled.some(c => !c.status || c.status === '修讀中');
    if (!scheduled.length || !hasOngoing) {
        box.hidden = true;
        box.innerHTML = '';
        return;
    }

    const { day, items, nextDay } = getTodaySummary(courses);
    const label = { now: '上課中', next: '下一堂' };
    const rows = items.map(item => `
        <li class="tf-today-row is-${item.state}">
            <span class="tf-today-time">${formatMinutes(item.start)}<small>${formatMinutes(item.end)}</small></span>
            <span class="tf-today-bar" data-style="background:${escapeHTML(item.course.color)};"></span>
            <span class="tf-today-main">
                <b>${escapeHTML(item.course.name)}</b>
                <span class="tf-today-meta">第 ${escapeHTML(item.periods.join('、'))} 節${item.course.room ? ' · ' + escapeHTML(item.course.room) : ''}${item.course.frequency === 'odd' ? ' · 單週' : (item.course.frequency === 'even' ? ' · 雙週' : '')}</span>
            </span>
            ${label[item.state] ? `<span class="tf-today-tag">${label[item.state]}</span>` : ''}
        </li>`).join('');

    let footer = '';
    if (nextDay) {
        const when = nextDay.offset === 1 ? '明天' : `週${dayNames[nextDay.day]}`;
        footer = `<div class="tf-today-next">${items.length ? '今天的課都上完了。' : '今天沒有課。'}${when}第一堂：<b>${escapeHTML(nextDay.first.course.name)}</b> ${formatMinutes(nextDay.first.start)}</div>`;
    }

    box.innerHTML = `
        <div class="tf-today-head">
            <span class="tf-today-title">今天 · 週${dayNames[day]}</span>
            <span class="tf-today-sem">${escapeHTML(getSemesterLabel(sem))}</span>
        </div>
        ${rows ? `<ul class="tf-today-list">${rows}</ul>` : ''}
        ${footer}`;
    box.hidden = false;
}

// ── 規劃頁「更多」──────────────────────────────────────────

function togglePlanMore(force) {
    const bar = document.querySelector('#view-plan .tf-sched-topbar');
    const btn = document.getElementById('btnPlanMore');
    if (!bar) return;
    const open = typeof force === 'boolean' ? force : !bar.classList.contains('is-more-open');
    bar.classList.toggle('is-more-open', open);
    if (btn) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? '✕' : '⋯';
        btn.setAttribute('aria-label', open ? '收起更多選項' : '更多選項');
    }
}

// ── 找課篩選抽屜 ───────────────────────────────────────────

/** 目前有幾個篩選條件不是預設值 */
function countActiveDiscoverFilters() {
    const bar = document.querySelector('#view-discover .tf-filter-bar');
    if (!bar) return 0;
    let n = 0;
    bar.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') { if (el.checked) n++; }
        else if (el.tagName === 'SELECT') { if (el.value && el.value !== 'all') n++; }
        else if (String(el.value || '').trim()) n++;
    });
    return n;
}

function updateDiscoverFilterBadge() {
    const badge = document.getElementById('discoverFilterCount');
    if (badge) {
        const n = countActiveDiscoverFilters();
        badge.textContent = n ? String(n) : '';
        badge.hidden = !n;
    }
    const done = document.getElementById('btnDiscoverFiltersDone');
    const count = document.getElementById('discoverResultCount');
    if (done && count) done.textContent = `顯示結果（${count.textContent.replace(/^共\s*/, '')}）`;
}

function toggleDiscoverFilters(force) {
    const header = document.querySelector('#view-discover .tf-discover-header');
    const btn = document.getElementById('btnDiscoverFilters');
    if (!header) return;
    const open = typeof force === 'boolean' ? force : !header.classList.contains('filters-open');
    header.classList.toggle('filters-open', open);
    document.body.classList.toggle('tf-sheet-open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    updateDiscoverFilterBadge();
    if (!open && btn && btn.offsetParent) btn.focus({ preventScroll: true });
}

function initMobileHelpers() {
    const bar = document.querySelector('#view-discover .tf-filter-bar');
    if (bar) {
        const later = () => setTimeout(updateDiscoverFilterBadge, 0);
        bar.addEventListener('change', later);
        bar.addEventListener('input', later);
        bar.addEventListener('click', later);
    }
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const header = document.querySelector('#view-discover .tf-discover-header.filters-open');
        if (header) toggleDiscoverFilters(false);
    });
    if (typeof window.matchMedia === 'function') {
        const desktopMq = window.matchMedia('(min-width: 769px)');
        const onWide = e => {
            if (e.matches && document.body.classList.contains('tf-sheet-open')) {
                toggleDiscoverFilters(false);
            }
        };
        if (typeof desktopMq.addEventListener === 'function') desktopMq.addEventListener('change', onWide);
        else if (typeof desktopMq.addListener === 'function') desktopMq.addListener(onWide);
    }
    // 頁面載入後才訂閱資料變更（測試環境不會觸發 DOMContentLoaded，也就不會動到假的 DOM）
    TimeFlowStore.on('change', () => {
        renderTodayCard();
        updateDiscoverFilterBadge();
    });
    // app.js 的初次繪製（含學期選單）在同一個 DOMContentLoaded 之後才跑，延後一拍再畫
    setTimeout(() => {
        renderTodayCard();
        updateDiscoverFilterBadge();
    }, 0);
    // 每分鐘更新「上課中／下一堂」
    setInterval(() => {
        if (document.visibilityState === 'visible') renderTodayCard();
    }, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') renderTodayCard();
    });
}

document.addEventListener('DOMContentLoaded', initMobileHelpers);

// ── 對外公開（其他模組、HTML data-action、測試使用）；其餘名稱只在本模組內可見 ──
TimeFlow.expose('mobile', {
    getClassesOnDay, getTodaySummary, renderTodayCard, togglePlanMore,
    toggleDiscoverFilters, countActiveDiscoverFilters, updateDiscoverFilterBadge
});
})();
