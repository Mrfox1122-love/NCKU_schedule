// ============================================================
// 🔄 TimeFlow v4.0.1 — 衝堂換班與開課資料校正 (schedule-sync.js)
// ------------------------------------------------------------
// 1. 衝堂：同一學期兩門課時段重疊時列出，並從開課資料找同一門課的其他班別（不會再衝堂的）供一鍵換班
// 2. 開課資料校正：本學期開課資料公布後，比對依歷年時段「預估」排入的課，
//    以及開課資料更新後時段／教室／教師有變動的課，一鍵換成本學期實際班別
// 結果併入「排程檢查」（planning-assist.js）顯示。
// ============================================================

(function () {
const SYNC_DONE_STATUS = new Set(['已取得', '已抵免']);

/** 本學期開課資料（例如 115-1）對應到的規劃學期名稱（例如「二上」）；無法對應時回傳 null */
function getCatalogPlanSemester(data = appData) {
    const label = window.COURSE_CATALOG_META && window.COURSE_CATALOG_META.semester;
    const entry = typeof getEntryAcademicYear === 'function' ? getEntryAcademicYear() : null;
    if (!label || !entry || typeof semesterToAcademic !== 'function') return null;
    const order = data.semesterOrder || Object.keys(data.semesters || {});
    return order.find(sem => {
        const acad = semesterToAcademic(sem, entry);
        return acad && acad.label === label;
    }) || null;
}

/** 時段文字，例如「一 2、3／三 5」 */
function formatSlotList(slots) {
    const names = typeof dayNames !== 'undefined' ? dayNames : ['', '一', '二', '三', '四', '五', '六', '日'];
    const text = (slots || []).filter(s => s.periods && s.periods.length)
        .map(s => `${names[s.day] || s.day} ${s.periods.join('、')}`).join('／');
    return text || '無固定時段';
}

function slotKeySet(slots) {
    const set = new Set();
    (slots || []).forEach(s => (s.periods || []).forEach(p => set.add(`${s.day}-${p}`)));
    return set;
}

function sameSlots(a, b) {
    const x = slotKeySet(a);
    const y = slotKeySet(b);
    return x.size === y.size && [...x].every(k => y.has(k));
}

/** 兩組時段重疊的部分（依星期分組） */
function overlapSlots(a, b) {
    const other = slotKeySet(b);
    const byDay = new Map();
    (a || []).forEach(s => (s.periods || []).forEach(p => {
        if (!other.has(`${s.day}-${p}`)) return;
        if (!byDay.has(s.day)) byDay.set(s.day, []);
        if (!byDay.get(s.day).includes(p)) byDay.get(s.day).push(p);
    }));
    return [...byDay.entries()].map(([day, periods]) => ({ day, periods }));
}

/** 會佔用時段、需要檢查衝堂的課（未修完、非暫定、每週上課） */
function isSchedulingCourse(course) {
    return course && !SYNC_DONE_STATUS.has(course.status) && !course.isTentative
        && !course.isNoSchedule && (course.frequency || 'weekly') === 'weekly'
        && (course.slots || []).some(s => s.periods && s.periods.length);
}

/**
 * 同一門課可選的班別：本學期用本學期開課資料，其他學期用歷年資料（同上／下學期開過的班別）
 */
function findCourseSections(course, sem) {
    const isNow = sem && sem === getCatalogPlanSemester();
    const norm = name => (window.PrerequisiteEngine ? PrerequisiteEngine.normalizeName(name) : String(name || '').trim());
    const sameCourse = r => (course.code ? r.code === course.code : norm(r.name) === norm(course.name));
    if (isNow) return (window.COURSE_CATALOG || []).filter(sameCourse);

    const term = sem && sem.endsWith('上') ? '1' : (sem && sem.endsWith('下') ? '2' : null);
    const history = (window.COURSE_HISTORY || []).filter(sameCourse);
    const inTerm = term ? history.filter(r => (r.offered || []).some(s => s.endsWith(`-${term}`))) : history;
    return inTerm.length ? inTerm : history;
}

const SYNC_OWN_TYPES = new Set(['系定必修', '選修-本系', '本所必修', '本所選修']);

/** 是否為本系（本所）開的班別；其他單位開的同名課（例如產業聯盟專班）可能有修課限制 */
function isOwnSection(record) {
    return typeof resolveCatalogType === 'function' && SYNC_OWN_TYPES.has(resolveCatalogType(record));
}

/** 本系開的班別排前面，其次與目前同一個開課單位 */
function sortSectionsByDept(sections, course) {
    const score = r => (isOwnSection(r) ? 2 : 0) + (course.dept && r.dept === course.dept ? 1 : 0);
    return sections.slice().sort((a, b) => score(b) - score(a));
}

function sectionLabel(record) {
    const teacher = (record.teacher || '').split('、').slice(0, 2).join('、');
    const cls = record.isHistory ? '' : (record.classGroup ? `${record.classGroup}班` : (record.classCode ? `${record.classCode} 班` : ''));
    const otherDept = !isOwnSection(record) && record.dept ? `${record.dept.split(' ')[0]}開` : '';
    const parts = [cls, formatSlotList(record.slots), teacher, otherDept].filter(Boolean);
    if (record.isHistory && record.lastSemester) parts.push(`依 ${record.lastSemester}`);
    return parts.join('・');
}

// ── 衝堂 ──

function collectConflictIssues(data = appData) {
    const order = data.semesterOrder || Object.keys(data.semesters || {});
    const requiredTypes = new Set(['系定必修', '本所必修']);
    const issues = [];

    order.forEach(sem => {
        const courses = (data.semesters[sem] || []).filter(isSchedulingCourse);
        for (let i = 0; i < courses.length; i++) {
            for (let j = i + 1; j < courses.length; j++) {
                const a = courses[i];
                const b = courses[j];
                const overlap = overlapSlots(a.slots, b.slots);
                if (!overlap.length) continue;

                const actions = [a, b].flatMap(course => {
                    const others = courses.filter(c => c !== course);
                    return sortSectionsByDept(findCourseSections(course, sem), course)
                        .filter(r => r.id !== course.catalogId && (r.slots || []).some(s => s.periods && s.periods.length))
                        .filter(r => !sameSlots(r.slots, course.slots))
                        .filter(r => others.every(o => !overlapSlots(r.slots, o.slots).length))
                        .slice(0, 3)
                        .map(r => ({ label: `「${course.name}」改上 ${sectionLabel(r)}`, sem, courseId: course.id, catalogId: r.id }));
                });

                issues.push({
                    semester: sem,
                    name: `${a.name} ↔ ${b.name}`,
                    required: requiredTypes.has(a.type) || requiredTypes.has(b.type),
                    tentative: false,
                    kind: '衝堂',
                    text: `時段重疊：${formatSlotList(overlap)} 節。${actions.length ? '可以換成下列不會衝堂的班別：' : '開課資料中找不到不衝堂的其他班別，需要擇一或改到其他學期。'}`,
                    actions
                });
            }
        }
    });
    return issues;
}

// ── 開課資料校正 ──

/** 依歷年時段預估排入的課（由找課的歷年課程或課程地圖一鍵排入） */
function isEstimatedCourse(course) {
    return /^H_/.test(course.catalogId || '') || /歷年課程/.test(course.source || '');
}

function collectCatalogSyncIssues(data = appData) {
    const sem = getCatalogPlanSemester(data);
    const catalog = window.COURSE_CATALOG;
    if (!sem || !catalog) return [];
    const label = window.COURSE_CATALOG_META.semester;
    const byId = new Map(catalog.map(r => [r.id, r]));
    const issues = [];

    (data.semesters[sem] || []).forEach(course => {
        if (SYNC_DONE_STATUS.has(course.status) || course.isTentative) return;
        const base = { semester: sem, name: course.name, required: ['系定必修', '本所必修'].includes(course.type), tentative: false, kind: '開課資料' };

        // 已是本學期班別：開課資料更新後時段、教室或教師有變動
        const current = byId.get(course.catalogId);
        if (current) {
            const changes = [];
            if (!sameSlots(current.slots, course.slots)) changes.push(`時段 ${formatSlotList(course.slots)} → ${formatSlotList(current.slots)}`);
            if ((current.room || '') !== (course.room || '')) changes.push(`教室 ${course.room || '未定'} → ${current.room || '未定'}`);
            if ((current.teacher || '') !== (course.teacher || '')) changes.push(`教師 ${course.teacher || '未定'} → ${current.teacher || '未定'}`);
            if (changes.length) {
                issues.push({ ...base, text: `${label} 開課資料有更新：${changes.join('；')}。`, actions: [{ label: '套用最新開課資料', sem, courseId: course.id, catalogId: current.id }] });
            }
            return;
        }

        if (!isEstimatedCourse(course)) return;
        const sections = findCourseSections(course, sem);
        if (!sections.length) {
            issues.push({ ...base, text: `目前的時段是依歷年資料預估的，但 ${label} 開課資料中找不到這門課，可能停開、改名或改到其他學期，請確認。`, actions: [] });
            return;
        }

        // 原本預估的班別：同班別代碼優先，其次同一位老師
        const historyId = (course.catalogId || '').replace(/^H_[^-]+-?/, '');
        const deptScore = r => (isOwnSection(r) ? 2 : 0) + (course.dept && r.dept === course.dept ? 1 : 0);
        const ranked = sections.slice().sort((x, y) =>
            (deptScore(y) - deptScore(x))
            || ((y.classCode === historyId) - (x.classCode === historyId))
            || (((y.teacher || '') === (course.teacher || '')) - ((x.teacher || '') === (course.teacher || ''))));
        const best = ranked[0];
        const unchanged = sections.length === 1 && sameSlots(best.slots, course.slots);
        issues.push({
            ...base,
            text: sections.length === 1
                ? `${label} 開課資料已公布，${unchanged ? '時段和預估相同，可以更新成實際的教室與教師。' : `實際時段為 ${formatSlotList(best.slots)}（原本預估 ${formatSlotList(course.slots)}）。`}`
                : `${label} 開課資料已公布，這門課有 ${sections.length} 個班別，請選擇你的班別（原本預估 ${formatSlotList(course.slots)}）：`,
            actions: ranked.slice(0, 4).map(r => ({
                label: sections.length === 1 ? '更新為本學期班別' : sectionLabel(r),
                sem, courseId: course.id, catalogId: r.id
            }))
        });
    });
    return issues;
}

// ── 套用班別 ──

/** 把課程換成指定的開課班別：保留修課狀態、成績、顏色與自己的備註 */
function applyCourseSection(sem, courseId, catalogId) {
    const list = appData.semesters[sem] || [];
    const idx = list.findIndex(c => String(c.id) === String(courseId));
    const record = typeof findCatalogCourse === 'function' ? findCatalogCourse(catalogId) : null;
    if (idx === -1 || !record) return;

    const old = list[idx];
    const fresh = buildCourseFromCatalog(record);
    const autoNote = /^(時段依 .*預估|這門課有 \d+ 個班別|上課時間未公開)/;
    const keptNotes = String(old.notes || '').split('\n').filter(line => line && !autoNote.test(line) && !String(fresh.notes || '').includes(line));
    const updated = {
        ...old,
        code: fresh.code,
        catalogId: fresh.catalogId,
        dept: fresh.dept,
        deptSeq: fresh.deptSeq,
        source: fresh.source,
        teacher: fresh.teacher,
        room: fresh.room,
        url: fresh.url || old.url,
        slots: fresh.slots,
        credits: fresh.credits || old.credits,
        isNoSchedule: !fresh.slots.length,
        overrides: {},
        notes: [fresh.notes, ...keptNotes].filter(Boolean).join('\n')
    };
    list[idx] = typeof normalizeCourseData === 'function' ? normalizeCourseData(updated) : updated;
    TimeFlowStore.commit();

    showToast(`已將【${sem}】「${old.name}」換成 ${formatSlotList(fresh.slots)}`, {
        type: 'success',
        actionLabel: '復原',
        onAction: () => {
            const i = list.findIndex(c => String(c.id) === String(courseId));
            if (i !== -1) list[i] = old;
            TimeFlowStore.commit();
        }
    });
}

function applyCourseSectionFromButton(btn) {
    applyCourseSection(btn.dataset.sem, btn.dataset.course, btn.dataset.catalog);
}

/** 排程檢查中的動作按鈕 */
function scheduleIssueActionsHTML(issue) {
    if (!issue.actions || !issue.actions.length) return '';
    return `<div class="schedule-check-actions">${issue.actions.map(a => `
        <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" data-sem="${escapeHTML(a.sem)}" data-course="${escapeHTML(String(a.courseId))}" data-catalog="${escapeHTML(a.catalogId)}" data-onclick="applyCourseSectionFromButton(this)">${escapeHTML(a.label)}</button>`).join('')}</div>`;
}

// ── 開課資料公布時提醒一次 ──

function notifyCatalogSyncIfNeeded() {
    const label = window.COURSE_CATALOG_META && window.COURSE_CATALOG_META.semester;
    if (!label || appData.catalogSyncNotified === label || !window.TimeFlowNotify) return;
    const count = collectCatalogSyncIssues(appData).length;
    if (!count) return;
    appData.catalogSyncNotified = label;
    TimeFlowStore.save();
    TimeFlowNotify.showBanner('catalog-sync', `${label} 開課資料已公布：你的課表有 ${count} 門課可以更新成實際的班別與時段。`, {
        type: 'info',
        actionLabel: '查看',
        onAction: () => {
            if (typeof switchView === 'function') switchView('graduation');
            const panel = document.getElementById('scheduleCheckPanel');
            if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}


// ── 對外公開（其他模組、HTML data-action、測試使用）；其餘名稱只在本模組內可見 ──
TimeFlow.expose('scheduleSync', {
    collectConflictIssues, collectCatalogSyncIssues, applyCourseSectionFromButton,
    scheduleIssueActionsHTML, notifyCatalogSyncIfNeeded
});
})();
