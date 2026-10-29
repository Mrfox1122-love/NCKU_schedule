// ============================================================
// 📋 TimeFlow v3.5.1 — 課程地圖 (course-map.js)
// ------------------------------------------------------------
// 依年級與上下學期列出本系（本所）開授的必修課，並標示修課進度：
// - 年級取自課程資料的「年級」欄，上下學期取自歷年開課紀錄
// - 已修、已規劃（排在哪個學期）、未排；規劃學期與建議學期不同時提醒
// 大學部與研究所共用。
// ============================================================

const COURSE_MAP_GRADE_NAMES = ['一', '二', '三', '四', '五', '六', '七'];

/**
 * 本系（本所）開授的必修課：同名課程（不同班別）合併為一筆
 */
function collectRequiredCourses() {
    const isMaster = typeof isMasterMode === 'function' && isMasterMode(appData);
    const program = isMaster ? getMasterProgram(appData.masterProgram, appData.masterCustom) : null;
    const isOwnRequired = c => {
        const type = resolveCatalogType(c);
        if (isMaster) {
            return type === '本所必修' && program.catalogDepts.some(prefix => (c.dept || '').startsWith(prefix));
        }
        return type === '系定必修' || (type === '選修-本系' && c.courseType === '必選');
    };

    const byName = new Map();
    const add = (c, offered) => {
        const key = PrerequisiteEngine.normalizeName(c.name);
        if (!byName.has(key)) {
            byName.set(key, { key, name: c.name, code: c.code, credits: new Map(), grades: new Map(), offered: new Set(), elective: false });
        }
        const entry = byName.get(key);
        entry.credits.set(c.credits, (entry.credits.get(c.credits) || 0) + 1);
        if (c.grade) entry.grades.set(c.grade, (entry.grades.get(c.grade) || 0) + 1);
        offered.forEach(s => entry.offered.add(s));
        if (c.courseType === '必選') entry.elective = true;
    };

    // 歷年資料有各學年期的開課紀錄；本學期資料補上本學期的開課
    const currentSemester = window.COURSE_CATALOG_META ? window.COURSE_CATALOG_META.semester : '';
    (window.COURSE_HISTORY || []).filter(isOwnRequired).forEach(c => add(c, c.offered || []));
    (window.COURSE_CATALOG || []).filter(isOwnRequired).forEach(c => add(c, currentSemester ? [currentSemester] : []));

    // 資料中每個學期（上／下）最近有紀錄的學年
    const latestYear = { 1: 0, 2: 0 };
    byName.forEach(entry => entry.offered.forEach(s => {
        const [year, term] = s.split('-').map(Number);
        if (latestYear[term] !== undefined) latestYear[term] = Math.max(latestYear[term], year);
    }));
    const entryYear = typeof getEntryAcademicYear === 'function' ? getEntryAcademicYear() : null;

    /**
     * 依入學學年對應「這一屆修這個年級時」的學年（例如 114 入學的二年級＝115 學年）：
     * 該學年已有資料就看那一年有沒有開，未來的學年看最近一年有沒有開，
     * 藉此排除已停開或改名的舊課程（例如改制前的計算機概論（一）（二））
     */
    const offeredFor = (entry, grade, termNo) => {
        const latest = latestYear[termNo];
        if (!latest) return false;
        const cohortYear = entryYear && grade ? entryYear + grade - 1 : latest;
        return entry.offered.has(`${Math.min(cohortYear, latest)}-${termNo}`);
    };

    const mostCommon = map => [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return [...byName.values()].map(entry => {
        const grade = parseInt(mostCommon(entry.grades), 10) || 0;
        const up = offeredFor(entry, grade, 1);
        const down = offeredFor(entry, grade, 2);
        if (!up && !down) return null;
        const termNo = up ? 1 : 2;
        return {
            key: entry.key,
            name: entry.name,
            code: entry.code,
            credits: parseFloat(mostCommon(entry.credits)) || 0,
            grade,
            // 上下學期都開的課以上學期為建議學期
            term: up ? '上' : '下',
            bothTerms: up && down,
            elective: entry.elective,
            // 這一屆修這門課的學年還沒有資料，是以最近一年（前幾屆的課程）推估
            inferred: !!(entryYear && grade && entryYear + grade - 1 > latestYear[termNo])
        };
    }).filter(Boolean);
}

/**
 * 不列入課程地圖的必修：學系規則註明該屆起已非必修（courseMapExclude），或使用者自行隱藏
 */
function getCourseMapExclusions() {
    const isMaster = typeof isMasterMode === 'function' && isMasterMode(appData);
    const rule = !isMaster && typeof getDepartmentGraduationRule === 'function'
        ? getDepartmentGraduationRule(appData.deptName, appData.entryYear) : null;
    const norm = name => PrerequisiteEngine.normalizeName(name);
    return {
        byRule: new Set(((rule && rule.courseMapExclude) || []).map(norm)),
        byUser: new Set((appData.courseMapHidden || []).map(norm))
    };
}

function toggleCourseMapHidden(name, hide) {
    const list = new Set(appData.courseMapHidden || []);
    if (hide) list.add(name);
    else list.delete(name);
    appData.courseMapHidden = [...list];
    saveData();
    renderCourseMap();
}

/**
 * 官方必修科目表的課程：年級與上下學期由開課資料對應（優先採本系開授的同名課程）
 */
function buildOfficialCourseEntries(items) {
    const records = [...(window.COURSE_HISTORY || []), ...(window.COURSE_CATALOG || [])];
    const ownTypes = new Set(['系定必修', '選修-本系', '本所必修', '本所選修']);
    const currentSemester = window.COURSE_CATALOG_META ? window.COURSE_CATALOG_META.semester : '';

    return items.map(([name, credits, opts = {}]) => {
        const names = [name, ...(opts.aka || [])];
        const keys = names.map(n => PrerequisiteEngine.normalizeName(n));
        const matches = records.filter(r => keys.includes(PrerequisiteEngine.normalizeName(r.name)));
        const own = matches.filter(r => ownTypes.has(resolveCatalogType(r)));
        const pool = own.length ? own : matches;

        const grades = new Map();
        const terms = new Set();
        pool.forEach(r => {
            if (r.grade) grades.set(r.grade, (grades.get(r.grade) || 0) + 1);
            (r.offered || (r.isHistory ? [] : [currentSemester])).forEach(s => terms.add(s.endsWith('-1') ? '上' : '下'));
        });
        const grade = parseInt([...grades.entries()].sort((a, b) => b[1] - a[1])[0]?.[0], 10) || 0;
        return {
            key: keys[0],
            name,
            aka: opts.aka || [],
            code: '',
            credits,
            grade,
            term: terms.has('上') || !terms.size ? '上' : '下',
            bothTerms: terms.has('上') && terms.has('下'),
            elective: false,
            inferred: false,
            official: true
        };
    });
}

/**
 * 使用者是否已修或已規劃這門課（含改名前後的課名）
 */
function findCourseProgress(required) {
    const order = appData.semesterOrder || Object.keys(appData.semesters || {});
    const names = [required.name, ...(required.aka || [])];
    let found = null;
    order.forEach(sem => (appData.semesters[sem] || []).forEach(course => {
        if (!names.some(n => PrerequisiteEngine.isCourseMatch(course, required.code, n))) return;
        const done = course.status === '已取得' || course.status === '已抵免';
        if (done && (!found || !found.done)) found = { done: true, semester: sem };
        else if (!found && course.status !== '未取得') found = { done: false, semester: sem };
    }));
    return found;
}

function renderCourseMap() {
    const body = document.getElementById('courseMapBody');
    if (!body) return;

    const isMaster = typeof isMasterMode === 'function' && isMasterMode(appData);
    const ownerName = typeof getPrereqMapOwnerName === 'function' ? getPrereqMapOwnerName() : (appData.deptName || '本系');
    const exclusions = getCourseMapExclusions();
    // 有該屆官方必修科目表就照表列出，否則由開課資料推測
    const official = !isMaster && typeof getRequiredCourseList === 'function'
        ? getRequiredCourseList(appData.deptName, typeof getEntryAcademicYear === 'function' ? getEntryAcademicYear() : null)
        : null;
    if (official) exclusions.byRule.clear();
    const allCourses = official ? buildOfficialCourseEntries(official.required) : collectRequiredCourses();
    const ruleExcluded = allCourses.filter(c => exclusions.byRule.has(c.key));
    const userHidden = allCourses.filter(c => exclusions.byUser.has(c.key) && !exclusions.byRule.has(c.key));
    const courses = allCourses.filter(c => !exclusions.byRule.has(c.key) && !exclusions.byUser.has(c.key));
    if (!courses.length && !userHidden.length) {
        body.innerHTML = `<div class="master-muted">課程資料中找不到 ${escapeHTML(ownerName)} 開授的必修課。</div>`;
        return;
    }

    const entryYear = typeof getEntryAcademicYear === 'function' ? getEntryAcademicYear() : null;
    const prefix = isMaster ? (getMasterProgram(appData.masterProgram, appData.masterCustom).degree === '博士班' ? '博' : '碩') : '';
    const maxGrade = Math.max(isMaster ? 2 : 4, ...courses.map(c => c.grade));

    courses.forEach(c => { c.progress = findCourseProgress(c); });
    const total = courses.reduce((s, c) => s + c.credits, 0);
    const done = courses.filter(c => c.progress && c.progress.done).reduce((s, c) => s + c.credits, 0);
    const planned = courses.filter(c => c.progress && !c.progress.done).reduce((s, c) => s + c.credits, 0);

    const cellCourses = (grade, term) => courses
        .filter(c => c.grade === grade && c.term === term)
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));

    const chip = c => {
        const p = c.progress;
        // 規劃學期名稱不含「碩／博」前綴（例如「一上」），前綴只用於顯示
        const suggestedSem = `${COURSE_MAP_GRADE_NAMES[c.grade - 1] || ''}${c.term}`;
        const suggested = `${prefix}${suggestedSem}`;
        const status = p ? (p.done ? 'done' : 'planned') : 'missing';
        const statusText = p ? `${p.done ? '已修' : '已規劃'}・${p.semester}` : '未排';
        const offTerm = p && !p.done && c.grade && p.semester !== suggestedSem && !c.bothTerms;
        const action = !p && typeof findCoursesButtonHTML === 'function' ? findCoursesButtonHTML({ keyword: c.name }, '找課') : '';
        return `
            <div class="course-map-chip ${status}">
                <div class="course-map-chip-head">
                    <b>${escapeHTML(c.name)}</b>
                    <span class="master-muted">${escapeHTML(c.credits)} 學分${c.elective ? '・必選' : ''}${c.bothTerms ? '・上下皆開' : ''}</span>
                </div>
                <div class="course-map-chip-status">
                    <span>${escapeHTML(statusText)}</span>
                    ${offTerm ? `<span class="course-map-off" title="課程地圖建議 ${escapeHTML(suggested)} 修">建議 ${escapeHTML(suggested)}</span>` : ''}
                    ${c.inferred ? '<span class="course-map-inferred" title="你這一屆修這門課的學年還沒有開課資料，以最近一年的課程推估">推估</span>' : ''}
                    ${action}
                    <button type="button" class="course-map-hide" data-name="${escapeHTML(c.name)}" onclick="toggleCourseMapHidden(this.dataset.name, true)" title="這門課不是你這一屆的必修時，可以從地圖隱藏">不是我的必修</button>
                </div>
            </div>`;
    };

    const termHeader = (grade, term) => {
        const semName = `${prefix}${COURSE_MAP_GRADE_NAMES[grade - 1]}${term}`;
        const academic = (typeof semesterToAcademic === 'function' && entryYear) ? semesterToAcademic(`${COURSE_MAP_GRADE_NAMES[grade - 1]}${term}`, entryYear) : null;
        return `${semName}${academic ? `（${academic.label}）` : ''}`;
    };

    const rows = [];
    for (let grade = 1; grade <= maxGrade; grade++) {
        const up = cellCourses(grade, '上');
        const down = cellCourses(grade, '下');
        if (!up.length && !down.length && grade > (isMaster ? 2 : 4)) continue;
        const credits = list => list.reduce((s, c) => s + c.credits, 0);
        rows.push(`
            <div class="course-map-row">
                <div class="course-map-grade">${prefix || ''}${COURSE_MAP_GRADE_NAMES[grade - 1]}年級</div>
                ${[['上', up], ['下', down]].map(([term, list]) => `
                    <div class="course-map-cell">
                        <div class="course-map-cell-head">${escapeHTML(termHeader(grade, term))}<span class="master-muted">${list.length} 門・${credits(list)} 學分</span></div>
                        ${list.length ? list.map(chip).join('') : '<div class="master-muted">（無必修）</div>'}
                    </div>`).join('')}
            </div>`);
    }

    const ungraded = courses.filter(c => !c.grade);
    const rule = !isMaster && typeof getDepartmentGraduationRule === 'function' ? getDepartmentGraduationRule(appData.deptName, appData.entryYear) : null;

    body.innerHTML = `
        <div class="prereq-summary">
            <span>${escapeHTML(ownerName)}：必修 ${courses.length} 門、${total} 學分${rule && rule.requiredCredits ? `（畢業規定必修 ${escapeHTML(rule.requiredCredits)} 學分）` : ''}</span>
            <span class="prereq-legend">
                <span class="prereq-chip done">已修 ${done} 學分</span>
                <span class="prereq-chip planned">已規劃 ${planned} 學分</span>
                <span class="prereq-chip">未排 ${total - done - planned} 學分</span>
            </span>
        </div>
        <div class="course-map-grid">${rows.join('')}</div>
        ${courses.some(c => c.inferred) ? '<div class="master-muted">標「推估」的課：你這一屆修那個年級時的開課資料還沒出來，依最近一年（前幾屆）的課程推估；系上若改過課程，可按「不是我的必修」隱藏。</div>' : ''}
        ${ungraded.length ? `
            <div class="master-section">
                <div class="master-section-title">未標年級的必修（${ungraded.length} 門）</div>
                <div class="course-map-ungraded">${ungraded.map(chip).join('')}</div>
            </div>` : ''}
        ${ruleExcluded.length ? `<div class="master-callout info">依學系規定，你這一屆起以下課程已不是必修，地圖不列出：${ruleExcluded.map(c => escapeHTML(c.name)).join('、')}。</div>` : ''}
        ${userHidden.length ? `
            <div class="master-section">
                <div class="master-section-title">你隱藏的課程（${userHidden.length} 門）</div>
                <div class="course-map-hidden-list">${userHidden.map(c => `
                    <span class="prereq-chip">${escapeHTML(c.name)} <button type="button" class="course-map-restore" data-name="${escapeHTML(c.name)}" onclick="toggleCourseMapHidden(this.dataset.name, false)">恢復</button></span>`).join('')}
                </div>
            </div>` : ''}
        ${official ? renderOfficialExtras(official) : `
        <div class="master-muted">整理自課程查詢的開課資料：年級取自「年級」欄，並依你的入學學年對應各年級開課的學年（未來的學年以最近一年為準），已停開或改制前的舊課程不列入。只列出本系（本所）開授的必修課；通識、國文、英文等校共同必修不在此列。各屆課程規劃可能調整，請以系上公告的課程地圖為準。</div>`}`;
}

/**
 * 官方必修科目表的「N 選 M」群組、系定必選與出處
 */
function renderOfficialExtras(official) {
    const progressOf = ([name, credits]) => ({ name, credits, progress: findCourseProgress({ name, code: '' }) });
    const statusText = p => (p ? (p.done ? `已修・${p.semester}` : `已規劃・${p.semester}`) : '未排');
    const statusCls = p => (p ? (p.done ? 'done' : 'planned') : '');

    const groups = official.pick.map(group => {
        const items = group.courses.map(progressOf);
        const done = items.filter(i => i.progress && i.progress.done).length;
        const planned = items.filter(i => i.progress && !i.progress.done).length;
        const met = done >= group.min;
        return `
            <div class="master-section">
                <div class="master-section-title">${escapeHTML(group.label)}：${escapeHTML(group.note || `至少選 ${group.min} 門`)}
                    <span class="prereq-chip ${met ? 'done' : (done + planned >= group.min ? 'planned' : '')}">已修 ${done}・規劃 ${planned} / ${group.min} 門</span>
                </div>
                <div class="course-map-hidden-list">${items.map(i => `<span class="prereq-chip ${statusCls(i.progress)}">${escapeHTML(i.name)}（${escapeHTML(i.credits)}）・${escapeHTML(statusText(i.progress))}</span>`).join('')}</div>
            </div>`;
    }).join('');

    const electives = official.requiredElective.length ? `
        <div class="master-section">
            <div class="master-section-title">系定必選（計入專業選修）</div>
            <div class="course-map-hidden-list">${official.requiredElective.map(progressOf).map(i => `<span class="prereq-chip ${statusCls(i.progress)}">${escapeHTML(i.name)}（${escapeHTML(i.credits)}）・${escapeHTML(statusText(i.progress))}</span>`).join('')}</div>
        </div>` : '';

    return `
        ${groups}
        ${electives}
        ${official.fallbackNote ? `<div class="master-callout info">📌 ${escapeHTML(official.fallbackNote)}</div>` : ''}
        ${official.notes.length ? `<ul class="master-notes">${official.notes.map(n => `<li>${escapeHTML(n)}</li>`).join('')}</ul>` : ''}
        ${official.uncertain.length ? `<div class="master-callout warning">⚠️ 規定未明確之處（系統的處理方式，未經系所確認）：<ul>${official.uncertain.map(u => `<li>${escapeHTML(u)}</li>`).join('')}</ul></div>` : ''}
        <div class="master-muted">必修清單依據：${escapeHTML(official.source)}（${escapeHTML(official.label)}）。年級與上下學期由開課資料對應，找不到開課紀錄的課列在「未標年級」。通識、國文、英文、體育等校定必修不在此列。</div>`;
}

function openCourseMap() {
    const body = document.getElementById('courseMapBody');
    ModalManager.open('courseMapModal');
    if (body) body.innerHTML = '<div class="master-muted">正在載入課程資料…</div>';
    loadCourseCatalog().then(renderCourseMap).catch(() => {
        if (body) body.innerHTML = '<div class="master-muted">課程資料載入失敗，請確認網路連線後再試一次。</div>';
    });
}

function closeCourseMap(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
    ModalManager.close('courseMapModal');
}

if (typeof window !== 'undefined') {
    window.openCourseMap = openCourseMap;
    window.closeCourseMap = closeCourseMap;
    window.collectRequiredCourses = collectRequiredCourses;
    window.toggleCourseMapHidden = toggleCourseMapHidden;
}
