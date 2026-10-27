// ============================================================
// 🔍 TimeFlow Discover 模組 (TimeFlow v3.3.6 - Real Catalog & Lazy Loaded)
// ============================================================

// 本學期課程（約 2.5 MB）與歷年開課摘要（約 3 MB）僅在第一次開啟「找課」時載入
const CATALOG_SCRIPT_SRC = 'js/discover/catalog-data.js';
const HISTORY_SCRIPT_SRC = 'js/discover/history-data.js';
const DISCOVER_PAGE_SIZE = 50;

let catalogLoadPromise = null;
let catalogById = new Map();
let historyByCode = new Map();
let deptCodeByName = new Map();
let discoverSource = 'current';   // 'current' 本學期開課 | 'history' 歷年課程
let discoverResults = [];
let discoverVisibleCount = DISCOVER_PAGE_SIZE;
let currentTargetCourseToSemester = null;

function getCourseCatalog() {
    return window.COURSE_CATALOG || [];
}

function getCourseHistory() {
    return window.COURSE_HISTORY || [];
}

function getDiscoverPool() {
    return discoverSource === 'history' ? getCourseHistory() : getCourseCatalog();
}

function findCatalogCourse(catalogId) {
    return catalogById.get(catalogId) || null;
}

function loadScriptOnce(src, readyCheck) {
    return new Promise((resolve, reject) => {
        if (readyCheck()) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`${src} 載入失敗`));
        document.head.appendChild(script);
    });
}

/**
 * 補上歷年摘要中可由 offered 推得的欄位（建置時省略以縮小檔案）
 */
function hydrateHistoryRecord(record, meta) {
    const offered = record.offered || [];
    const terms = new Set(offered.map(s => s.split('-')[1]));
    const last = offered[offered.length - 1] || '';
    const [lastYear, lastTerm] = last.split('-');

    record.id = `H_${record.code}`;
    record.isHistory = true;
    record.classCode = '';
    record.classGroup = '';
    record.lastSemester = last;
    record.offerYears = new Set(offered.map(s => s.split('-')[0])).size;
    record.totalYears = (meta && meta.years) ? meta.years.length : record.offerYears;
    record.semester = terms.has('1') && terms.has('2') ? '上下' : (terms.has('1') ? '上' : '下');
    if (last) {
        record.syllabusUrl = `https://class-qry.acad.ncku.edu.tw/syllabus/syllabus.php?syear=0${lastYear}&sem=${lastTerm}&co_no=${record.code}&class_code=${record.lastClassCode || ''}`;
    }
    return record;
}

/**
 * 延遲載入課程資料庫（以 <script> 注入，file:// 開啟時也能運作）
 */
function loadCourseCatalog() {
    if (catalogLoadPromise) return catalogLoadPromise;

    catalogLoadPromise = Promise.all([
        loadScriptOnce(CATALOG_SCRIPT_SRC, () => !!window.COURSE_CATALOG),
        loadScriptOnce(HISTORY_SCRIPT_SRC, () => !!window.COURSE_HISTORY)
    ]).then(() => {
        const meta = window.COURSE_HISTORY_META;
        getCourseHistory().forEach(r => hydrateHistoryRecord(r, meta));
        historyByCode = new Map(getCourseHistory().map(r => [r.code, r]));
        catalogById = new Map([...getCourseCatalog(), ...getCourseHistory()].map(c => [c.id, c]));
        if (typeof refreshPrerequisiteRules === 'function') refreshPrerequisiteRules();
        renderDiscoverMeta();
        renderDeptOptions();
    }).catch(err => {
        catalogLoadPromise = null;
        throw err;
    });

    return catalogLoadPromise;
}

// ============================================================
// 歷年開課規律
// ============================================================

function getOfferingInfo(code) {
    return historyByCode.get(code) || null;
}

/**
 * 開課規律文字，例如「每年上學期」「近 4 年開 2 次・下學期」
 */
function describeOffering(info) {
    if (!info) return '';
    const termText = info.semester === '上下' ? '上下學期' : `${info.semester}學期`;
    if (info.offerYears >= info.totalYears) {
        return info.semester === '上下' ? '每學期開' : `每年${termText}`;
    }
    if (info.offerYears === 1) return `近 ${info.totalYears} 年僅開 1 次（${info.lastSemester}）`;
    return `近 ${info.totalYears} 年開 ${info.offerYears} 年・${termText}`;
}

function getSemesterTerm(semName) {
    if (!semName) return null;
    if (semName.endsWith('上')) return '上';
    if (semName.endsWith('下')) return '下';
    return null;   // 暑修等不檢查
}

/**
 * 規劃學期與歷年開課學期不符時回傳提醒文字（例如只在上學期開的課排到下學期）
 */
function checkOfferingForSemester(code, semName) {
    const info = getOfferingInfo(code);
    const term = getSemesterTerm(semName);
    if (!info || !term || info.semester.includes(term)) return null;
    return `近 ${info.totalYears} 年只在${info.semester}學期開課（${info.offered.join('、')}），排在${term}學期可能修不到。`;
}

/**
 * 以「系號-序號」前段（例如 E2-054 → E2）建立系所代碼對照，並填入系所下拉建議
 */
function renderDeptOptions() {
    deptCodeByName = new Map();
    [...getCourseCatalog(), ...getCourseHistory()].forEach(c => {
        if (!deptCodeByName.has(c.dept)) deptCodeByName.set(c.dept, '');
        if (c.deptSeq && !deptCodeByName.get(c.dept)) {
            deptCodeByName.set(c.dept, c.deptSeq.split('-')[0]);
        }
    });

    const listEl = document.getElementById('discoverDeptList');
    if (!listEl) return;
    const names = [...deptCodeByName.keys()].sort((a, b) =>
        (deptCodeByName.get(a) || 'ZZ').localeCompare(deptCodeByName.get(b) || 'ZZ'));
    listEl.innerHTML = names.map(name => {
        const code = deptCodeByName.get(name);
        return `<option value="${escapeHTML(name)}">${escapeHTML(code)}</option>`;
    }).join('');
}

// 研究所開課單位（例如 電機所 EE、戲劇碩士學程 AD）：各所、碩博士班與學位學程、研究所模組課、學院研究所共同課程
// （「不分系學程」為學士班，不算）
function isGraduateDept(dept) {
    const name = dept || '';
    if (name.startsWith('不分系學程')) return false;
    return /所 |所$|研究所|碩|博|EMBA|ＥＭＢＡ|學程|半導體學院課程|敏求學院課程/.test(name);
}

function matchGradeFilter(course, gradeFilter) {
    if (gradeFilter === 'all') return true;
    if (gradeFilter === 'grad') return isGraduateDept(course.dept);
    if (gradeFilter === 'none') return !course.grade && !isGraduateDept(course.dept);
    if (gradeFilter === '5+') return parseInt(course.grade, 10) >= 5;
    return course.grade === gradeFilter;
}

function matchDeptFilter(course, deptKeyword) {
    if (!deptKeyword) return true;
    const code = (deptCodeByName.get(course.dept) || '').toLowerCase();
    return course.dept.toLowerCase().includes(deptKeyword) || code === deptKeyword;
}

/**
 * 目前學期已排課程佔用的時段（不含暫定課程），格式為「星期-節次」
 */
function getOccupiedSlotKeys() {
    const occupied = new Set();
    (appData.semesters[appData.currentSemester] || []).forEach(course => {
        if (course.isTentative) return;
        (course.slots || []).forEach(s => (s.periods || []).forEach(p => occupied.add(`${s.day}-${p}`)));
    });
    return occupied;
}

function resetDiscoverFilters() {
    ['discoverSearchInput', 'filterDiscoverDept'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['filterDiscoverGrade', 'filterDiscoverType', 'filterDiscoverCredits', 'filterDiscoverDay', 'filterDiscoverPeriod', 'filterDiscoverTerm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = 'all';
    });
    const noConflict = document.getElementById('filterDiscoverNoConflict');
    if (noConflict) noConflict.checked = false;
    handleDiscoverSearch();
}

/**
 * 進入找課視圖時呼叫（由 app.js 的 switchView 觸發）
 */
function openDiscoverView() {
    const container = document.getElementById('discoverCourseList');
    if (!window.COURSE_CATALOG && container) {
        container.innerHTML = `
            <div class="tf-empty-state-box">
                <div class="tf-empty-title">課程資料載入中…</div>
                <div class="tf-empty-desc">第一次開啟需要下載全校課程資料，請稍候。</div>
            </div>
        `;
    }

    loadCourseCatalog()
        .then(() => handleDiscoverSearch())
        .catch(() => {
            if (container) {
                container.innerHTML = `
                    <div class="tf-empty-state-box">
                        <div class="tf-empty-title">課程資料載入失敗</div>
                        <div class="tf-empty-desc">請確認網路連線後重新開啟「找課」。</div>
                    </div>
                `;
            }
        });
}

function renderDiscoverMeta() {
    const metaEl = document.getElementById('discoverCatalogMeta');
    const meta = window.COURSE_CATALOG_META;
    const hMeta = window.COURSE_HISTORY_META;
    if (!metaEl) return;
    if (discoverSource === 'history' && hMeta) {
        metaEl.innerText = `歷年課程：${hMeta.from}～${hMeta.to}｜共 ${hMeta.codeCount} 個課號（時段以最近一次開課為準）｜更新於 ${hMeta.builtAt}`;
    } else if (meta) {
        metaEl.innerText = `資料學期：${meta.semester}｜共 ${meta.count} 門課｜更新於 ${meta.builtAt}`;
    }
}

/**
 * 切換資料來源：本學期開課 / 歷年課程（規劃未來學期用）
 */
function setDiscoverSource(source) {
    discoverSource = source === 'history' ? 'history' : 'current';
    document.getElementById('btnDiscoverCurrent')?.classList.toggle('active', discoverSource === 'current');
    document.getElementById('btnDiscoverHistory')?.classList.toggle('active', discoverSource === 'history');
    renderDiscoverMeta();
    if (window.COURSE_CATALOG) handleDiscoverSearch();
}

function matchTermFilter(course, termFilter) {
    if (termFilter === 'all') return true;
    const info = course.isHistory ? course : getOfferingInfo(course.code);
    if (termFilter === 'yearly') return !!info && info.offerYears >= info.totalYears;
    if (!info) return false;
    return info.semester.includes(termFilter);
}

/**
 * 依使用者所屬系所判定課程類別
 * 通識、國文、英文、體育等已於資料建置時判定 (baseType)；
 * 系上課程依開課系所是否為本系，分為系定必修 / 選修-本系 / 選修-外系
 */
function resolveCatalogType(course) {
    // 研究所：本所開課依課程系統標示的必/選修分為本所必修、本所選修；
    // 規章指定的必修課（即使由他所開授）也算本所必修；其他研究所為外所選修，大學部課程不計畢業學分
    if (typeof isMasterMode === 'function' && isMasterMode(appData)) {
        if ((course.name || '').startsWith('專題討論')) return '專題討論';
        const rule = getMasterRule(appData.masterProgram, appData.masterEntryYear, appData.masterCustom);
        const isOwn = rule.program.catalogDepts.some(prefix => (course.dept || '').startsWith(prefix));
        if (isOwn && ['必修', '必選'].includes(course.courseType)) return '本所必修';
        if (isMasterRequiredCourse(rule, course.name)) return '本所必修';
        if (isOwn) return '本所選修';
        return isGraduateDept(course.dept) ? '外所選修' : '大學部課程';
    }

    if (course.baseType) return course.baseType;

    const normalize = (typeof normalizeDepartmentName === 'function') ? normalizeDepartmentName : (d => d);
    const userDept = normalize(appData.deptName || '');
    const courseDept = normalize((course.dept || '').split(' ')[0]);

    if (userDept && courseDept === userDept) {
        return course.courseType === '必修' ? '系定必修' : '選修-本系';
    }
    return '選修-外系';
}

function formatCatalogSlots(course, separator = ' ') {
    if (course.timeHidden) return '時間未公開';
    const text = (course.slots || []).map(s => {
        const dName = (dayNames && dayNames[s.day]) ? dayNames[s.day] : String(s.day);
        return `(${dName})${(s.periods || []).join(',')}`;
    }).join(separator);
    return text || course.timeNote || '未定';
}

function isCourseInWishlist(targetCourse) {
    if (!targetCourse || !appData.wishlist) return false;
    return appData.wishlist.some(w => w.catalogId && w.catalogId === targetCourse.id);
}

function handleDiscoverSearch() {
    const inputEl = document.getElementById('discoverSearchInput');
    const keyword = (inputEl ? inputEl.value : '').trim().toLowerCase();
    const typeFilter = document.getElementById('filterDiscoverType')?.value || 'all';
    const creditFilter = document.getElementById('filterDiscoverCredits')?.value || 'all';
    const dayFilter = document.getElementById('filterDiscoverDay')?.value || 'all';
    const periodFilter = document.getElementById('filterDiscoverPeriod')?.value || 'all';
    const gradeFilter = document.getElementById('filterDiscoverGrade')?.value || 'all';
    const deptKeyword = (document.getElementById('filterDiscoverDept')?.value || '').trim().toLowerCase();
    const termFilter = document.getElementById('filterDiscoverTerm')?.value || 'all';
    const excludeConflict = !!document.getElementById('filterDiscoverNoConflict')?.checked;
    const occupied = excludeConflict ? getOccupiedSlotKeys() : null;

    discoverResults = getDiscoverPool().filter(c => {
        c.type = resolveCatalogType(c);

        if (keyword) {
            const haystack = [c.name, c.teacher, c.code, c.deptSeq, c.dept].join(' ').toLowerCase();
            if (!haystack.includes(keyword)) return false;
        }

        if (!matchDeptFilter(c, deptKeyword)) return false;
        if (!matchGradeFilter(c, gradeFilter)) return false;
        if (!matchTermFilter(c, termFilter)) return false;

        if (typeFilter !== 'all') {
            if (typeFilter === '通識') {
                if (!c.type.startsWith('通識') && c.type !== '融通') return false;
            } else if (typeFilter === '國文/英文/體育/軍訓') {
                if (!['國文', '英文', '體育', '軍訓', '服務學習', '踏溯台南'].includes(c.type)) return false;
            } else if (typeFilter === '第二外語') {
                if (!c.type.startsWith('第二外語')) return false;
            } else if (c.type !== typeFilter) {
                return false;
            }
        }

        if (creditFilter !== 'all') {
            const cr = parseFloat(c.credits) || 0;
            if (creditFilter === '4' && cr < 4) return false;
            if (creditFilter !== '4' && cr !== parseFloat(creditFilter)) return false;
        }

        // 星期與節次同時指定時，需在同一個時段（例如週二第 3 節）
        if (dayFilter !== 'all' || periodFilter !== 'all') {
            const hit = (c.slots || []).some(s =>
                (dayFilter === 'all' || String(s.day) === dayFilter) &&
                (periodFilter === 'all' || (s.periods || []).includes(periodFilter)));
            if (!hit) return false;
        }

        if (occupied && (c.slots || []).some(s => (s.periods || []).some(p => occupied.has(`${s.day}-${p}`)))) {
            return false;
        }

        return true;
    });

    discoverVisibleCount = DISCOVER_PAGE_SIZE;
    renderDiscoverResults();
}

function clearDiscoverSearch() {
    const inputEl = document.getElementById('discoverSearchInput');
    if (inputEl) inputEl.value = '';
    handleDiscoverSearch();
}

function showMoreDiscoverResults() {
    discoverVisibleCount += DISCOVER_PAGE_SIZE;
    renderDiscoverResults();
}

function buildPrereqTag(c) {
    if (typeof PrerequisiteEngine === 'undefined') return '';
    const rule = PrerequisiteEngine.getRule({ code: c.code, name: c.name, catalogId: c.id });
    if (!rule || !rule.required || rule.required.length === 0) return '';
    return rule.required.map(r => escapeHTML(r.name)).join('、');
}

function offeringBadgeHtml(c) {
    const label = describeOffering(c.isHistory ? c : getOfferingInfo(c.code));
    return label ? `<span class="l-offer-badge" title="歷年開課規律">${escapeHTML(label)}</span>` : '';
}

// 歷年課程的時段取自最近一次開課，註明來源學期
function formatSlotSource(c) {
    return c.isHistory && c.lastSemester ? `（${c.lastSemester}）` : '';
}

function renderDiscoverResults() {
    const list = discoverResults;
    const container = document.getElementById('discoverCourseList');
    const countBadge = document.getElementById('discoverResultCount');
    const wishBadge = document.getElementById('discoverWishlistCount');
    if (!container) return;

    if (countBadge) countBadge.innerText = `共 ${list.length} 門課程`;
    if (wishBadge) {
        const wishCount = (appData.wishlist || []).length;
        wishBadge.innerHTML = `${Icons.get('star', { size: 12 })} 已候選 ${wishCount} 門`;
    }

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="tf-empty-state-box">
                <div class="tf-empty-icon-wrap">${Icons.get('search', { size: 32 })}</div>
                <div class="tf-empty-title">查無符合條件的課程</div>
                <div class="tf-empty-desc">請嘗試更換搜尋關鍵字，或放寬類別與學分篩選條件。</div>
            </div>
        `;
        return;
    }

    // 一次只渲染部分結果，避免數千列同時產生造成卡頓
    const visible = list.slice(0, discoverVisibleCount);

    const tableRowsHtml = visible.map(c => {
        const isWish = isCourseInWishlist(c);
        const wishBtnClass = isWish ? 'tf-btn tf-btn-sm btn-act-wish is-active' : 'tf-btn tf-btn-sm tf-btn-ghost btn-act-wish';
        const wishBtnText = isWish ? `${Icons.get('star', { size: 12 })} 已候選` : `${Icons.get('star', { size: 12 })} 候選`;

        const deptBase = [c.dept, c.grade ? `${c.grade} 年級` : '', c.classGroup].filter(Boolean).map(escapeHTML).join(' · ');
        const prereqNames = buildPrereqTag(c);
        const prereqTagHtml = prereqNames
            ? `<span style="font-size:0.68rem; color:var(--tf-text-muted); display:inline-flex; align-items:center; gap:2px; margin-top:2px;">${Icons.get('info', { size: 11 })} 需先修：${prereqNames}</span>`
            : '';
        const remarkText = [...(c.restrictions || []), ...(c.tags || [])].join('、');
        const safeId = escapeHTML(c.id);

        return `
            <tr class="tf-table-row" onclick="handleTableRowClick(event, '${safeId}')">
                <td class="col-name">
                    <div class="table-course-name-wrap">
                        <span class="table-course-name">${escapeHTML(c.name)}</span>
                        <span class="table-course-code">${escapeHTML(c.isHistory ? c.code : (c.deptSeq || c.code))}</span>
                        <span class="l-type-badge">${escapeHTML(c.type)}</span>
                        ${offeringBadgeHtml(c)}
                    </div>
                    ${prereqTagHtml}
                </td>
                <td class="col-dept">
                    <div class="table-dept-wrap">
                        <span>${deptBase || '-'}</span>
                    </div>
                </td>
                <td class="col-credit"><b>${escapeHTML(c.credits)}</b></td>
                <td class="col-teacher">${escapeHTML(c.teacher || '-')}</td>
                <td class="col-time">
                    <div class="table-time-wrap">
                        <span>${escapeHTML(formatCatalogSlots(c) + formatSlotSource(c))}</span>
                        ${c.room ? `<span class="table-room-sub">${escapeHTML(c.room)}</span>` : ''}
                    </div>
                </td>
                <td class="col-assess" title="${escapeHTML(remarkText)}">${escapeHTML(remarkText || '-')}</td>
                <td class="col-actions" onclick="event.stopPropagation()">
                    <div class="table-action-btns">
                        <button type="button" class="${wishBtnClass}" onclick="addDiscoverToWishlist('${safeId}')">${wishBtnText}</button>
                        <button type="button" class="tf-btn tf-btn-sm tf-btn-primary btn-act-plan" onclick="openAddToSemesterModal('${safeId}')">${Icons.get('plus', { size: 12 })} 排入</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    const mobileListHtml = visible.map(c => {
        const isWish = isCourseInWishlist(c);
        const wishBtnClass = isWish ? 'tf-btn tf-btn-sm btn-act-wish is-active' : 'tf-btn tf-btn-sm tf-btn-secondary';
        const wishBtnText = isWish ? `${Icons.get('star', { size: 12 })} 已候選` : `${Icons.get('star', { size: 12 })} 候選`;
        const metaText = [c.dept, c.grade ? `${c.grade} 年級` : ''].filter(Boolean).map(escapeHTML).join(' · ');
        const prereqNames = buildPrereqTag(c);
        const safeId = escapeHTML(c.id);

        return `
            <div class="tf-discover-mobile-row" onclick="showDiscoverDetail('${safeId}')">
                <div class="m-row-top">
                    <div class="m-row-title-wrap">
                        <span class="m-row-title">${escapeHTML(c.name)}</span>
                        <span class="l-type-badge">${escapeHTML(c.type)}</span>
                        ${offeringBadgeHtml(c)}
                    </div>
                </div>
                <div class="m-row-meta">
                    <span>${metaText}</span> ·
                    <span><b>${escapeHTML(c.credits)}</b> 學分</span> ·
                    <span>${escapeHTML(c.teacher || '教師未定')}</span>
                    ${prereqNames ? ` · <span style="color:var(--tf-text-muted);">需先修：${prereqNames}</span>` : ''}
                </div>
                <div class="m-row-time">
                    <span>${Icons.get('clock', { size: 11 })} ${escapeHTML(formatCatalogSlots(c) + formatSlotSource(c))}</span>
                    ${c.room ? `<span> · ${Icons.get('location', { size: 11 })} ${escapeHTML(c.room)}</span>` : ''}
                </div>
                <div class="m-row-actions" onclick="event.stopPropagation()">
                    <button type="button" class="${wishBtnClass}" onclick="addDiscoverToWishlist('${safeId}')">${wishBtnText}</button>
                    <button type="button" class="tf-btn tf-btn-sm tf-btn-primary" onclick="openAddToSemesterModal('${safeId}')">${Icons.get('plus', { size: 12 })} 排入規劃</button>
                </div>
            </div>
        `;
    }).join('');

    const remaining = list.length - visible.length;
    const moreBtnHtml = remaining > 0
        ? `<div style="display:flex; justify-content:center; padding:12px 0;">
               <button type="button" class="tf-btn tf-btn-sm tf-btn-secondary" onclick="showMoreDiscoverResults()">顯示更多（還有 ${remaining} 門）</button>
           </div>`
        : '';

    container.innerHTML = `
        <div class="tf-table-responsive-wrapper">
            <table class="tf-data-table">
                <thead>
                    <tr>
                        <th class="col-name">課程名稱</th>
                        <th class="col-dept">開課系所 / 年級</th>
                        <th class="col-credit">學分</th>
                        <th class="col-teacher">教師</th>
                        <th class="col-time">時間 / 教室</th>
                        <th class="col-assess">限制 / 標籤</th>
                        <th class="col-actions">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>
        </div>
        <div class="tf-discover-mobile-list">
            ${mobileListHtml}
        </div>
        ${moreBtnHtml}
    `;
}

function handleTableRowClick(e, catalogId) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    showDiscoverDetail(catalogId);
}

function showDiscoverDetail(catalogId) {
    const c = findCatalogCourse(catalogId);
    if (!c) return;

    const modal = document.getElementById('courseDetailModal');
    if (!modal) return;

    c.type = resolveCatalogType(c);
    document.getElementById('modalCourseName').innerText = c.name || '未命名課程';
    document.getElementById('modalCourseColorBar').style.backgroundColor = '#7c3aed';

    const slotText = c.timeHidden
        ? '時間未公開（請至學校課程查詢頁點選「上課時間」查看）'
        : ((c.slots || []).map(s => {
            const dName = (dayNames && dayNames[s.day]) ? dayNames[s.day] : String(s.day);
            return `週${dName} 第 ${(s.periods || []).join(',')} 節`;
        }).join(' ｜ ') || c.timeNote || '未定');

    const sectionsHtml = (c.sections || []).length > 0 ? `
        <div class="detail-row">
            <span class="detail-label">演習分組：</span>
            <div class="detail-val">${c.sections.map(sec => {
                const secSlots = (sec.slots || []).map(s => {
                    const dName = (dayNames && dayNames[s.day]) ? dayNames[s.day] : String(s.day);
                    return `週${dName} 第 ${(s.periods || []).join(',')} 節 ${s.room || ''}`;
                }).join('、');
                return `<div>${escapeHTML(sec.group || '-')} 組｜${escapeHTML(sec.teacher || '-')}｜${escapeHTML(secSlots || '未定')}</div>`;
            }).join('')}</div>
        </div>
    ` : '';

    const syllabusUrl = c.syllabusUrl ? sanitizeURL(c.syllabusUrl) : '';
    const isWish = isCourseInWishlist(c);

    // 歷年開課紀錄
    const offerInfo = c.isHistory ? c : getOfferingInfo(c.code);
    const offerHtml = offerInfo ? `
        <div class="detail-row">
            <span class="detail-label">歷年開課：</span>
            <div class="detail-val" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                ${offerInfo.offered.map(s => `<span class="detail-badge">${escapeHTML(s)}</span>`).join(' ')}
                <span style="font-size:0.75rem; color:var(--tf-color-primary-light); font-weight:500;">(${escapeHTML(describeOffering(offerInfo))})</span>
            </div>
        </div>
        ${!c.isHistory && offerInfo.teacher ? `<div class="detail-row"><span class="detail-label">歷年教師：</span><span class="detail-val">${escapeHTML(offerInfo.teacher)}</span></div>` : ''}
    ` : `<div class="detail-row"><span class="detail-label">歷年開課：</span><span class="detail-val">${escapeHTML(window.COURSE_HISTORY_META ? `${window.COURSE_HISTORY_META.from}～${window.COURSE_HISTORY_META.to} 未開過（新開課程）` : '-')}</span></div>`;
    const slotSourceNote = c.isHistory ? `<span class="master-muted">（以 ${escapeHTML(c.lastSemester)} 開課資料為準，實際以當學期公告為準）</span>` : '';

    let prereqHtml = '';
    if (typeof PrerequisiteEngine !== 'undefined') {
        const pRes = PrerequisiteEngine.check({ code: c.code, name: c.name, catalogId: c.id }, appData.currentSemester, appData.semesters, appData.semesterOrder);
        if (pRes.hasPrerequisite) {
            const rule = PrerequisiteEngine.getRule({ code: c.code, name: c.name, catalogId: c.id });
            let badgeClass = pRes.overallStatus === 'passed' ? 'tf-badge-success' : (pRes.overallStatus === 'planned' ? 'tf-badge-warning' : (pRes.overallStatus === 'blocked' ? 'tf-badge-danger' : 'tf-badge-neutral'));
            let statusTagText = pRes.overallStatus === 'passed' ? '已符合' : (pRes.overallStatus === 'planned' ? '預計符合' : (pRes.overallStatus === 'blocked' ? '不符合' : '未明'));

            prereqHtml = `
                <div style="background:var(--tf-surface-sunken); border:1px solid var(--tf-border-default); border-radius:var(--tf-radius-md); padding:8px 10px; margin-top:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:600; font-size:0.8rem; color:var(--tf-text-primary);">先修條件</span>
                        <span class="tf-badge ${badgeClass}">${statusTagText} (${escapeHTML(appData.currentSemester)}基準)</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--tf-text-secondary); margin-top:3px;">${escapeHTML(rule ? rule.description : '')}</div>
                    <div style="font-size:0.75rem; color:var(--tf-text-muted); margin-top:3px;">${escapeHTML(pRes.message)}</div>
                </div>
            `;
        }
    }

    const safeId = escapeHTML(c.id);
    const codeText = c.isHistory ? c.code : [c.deptSeq, c.code + (c.classCode ? `-${c.classCode}` : '')].filter(Boolean).join('｜');
    const metaText = [c.dept, c.grade ? `${c.grade} 年級` : '', c.classGroup].filter(Boolean).join(' · ');

    document.getElementById('modalCourseContent').innerHTML = `
        <div class="detail-row">
            <span class="detail-label">課程類別：</span>
            <span class="detail-badge">${escapeHTML(c.type)}</span> ｜
            <span style="font-weight:bold;">${escapeHTML(c.credits)} 學分</span> ｜
            <span style="color:var(--tf-text-secondary); font-size:0.8rem;">${escapeHTML(c.courseType)}</span>
        </div>
        <div class="detail-row"><span class="detail-label">開課系所：</span><span class="detail-val">${escapeHTML(metaText || '-')}</span></div>
        <div class="detail-row"><span class="detail-label">系號／課號：</span><span class="detail-val">${escapeHTML(codeText || '無代碼')}</span></div>
        <div class="detail-row"><span class="detail-label">授課教師：</span><span class="detail-val">${escapeHTML(c.teacher || '未填寫')}</span></div>
        <div class="detail-row"><span class="detail-label">上課時段：</span><span class="detail-val">${escapeHTML(slotText)} ${slotSourceNote}</span></div>
        <div class="detail-row"><span class="detail-label">上課教室：</span><span class="detail-val">${escapeHTML(c.room || '未指定')}</span></div>
        ${offerHtml}
        ${(c.restrictions || []).length ? `<div class="detail-row"><span class="detail-label">限修條件：</span><span class="detail-val">${escapeHTML(c.restrictions.join('、'))}</span></div>` : ''}
        ${(c.tags || []).length ? `<div class="detail-row"><span class="detail-label">標籤：</span><span class="detail-val">${c.tags.map(t => `<span class="detail-badge">${escapeHTML(t)}</span>`).join(' ')}</span></div>` : ''}
        ${sectionsHtml}
        ${prereqHtml}
        ${syllabusUrl ? `
            <div class="detail-row" style="margin-top:4px;">
                <span class="detail-label">課程大綱：</span>
                <a href="${escapeHTML(syllabusUrl)}" target="_blank" rel="noopener noreferrer" class="tf-btn tf-btn-sm tf-btn-secondary detail-url-btn">
                    ${Icons.get('info', { size: 13 })} 查看課程大綱 ↗
                </a>
            </div>
        ` : ''}
        ${c.notes ? `<div class="detail-notes-box">${escapeHTML(c.notes)}</div>` : ''}
    `;

    const moveBox = document.querySelector('.modal-move-semester-box');
    if (moveBox) moveBox.style.display = 'none';

    const wishBtnText = isWish ? '取消候選' : '存入候選庫';
    const wishBtnClass = isWish ? 'tf-btn tf-btn-sm btn-act-wish is-active' : 'tf-btn tf-btn-sm tf-btn-secondary';

    const footer = document.querySelector('.course-detail-footer');
    if (footer) {
        footer.innerHTML = `
            <button type="button" class="${wishBtnClass}" onclick="addDiscoverToWishlist('${safeId}'); showDiscoverDetail('${safeId}');">${Icons.get('star', { size: 12 })} ${wishBtnText}</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-primary" onclick="closeCourseDetail(); openAddToSemesterModal('${safeId}');">${Icons.get('plus', { size: 12 })} 排入規劃</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" onclick="closeCourseDetail()">關閉</button>
        `;
    }

    ModalManager.open('courseDetailModal');
}

/**
 * 將資料庫課程轉為 TimeFlow 課程物件共用欄位
 */
/**
 * 課程來源：開課系所、系號-序號、資料來源（本學期開課或歷年課程）
 */
function describeCatalogSource(item) {
    const semester = window.COURSE_CATALOG_META ? window.COURSE_CATALOG_META.semester : '本學期';
    return {
        dept: item.dept || '',
        deptSeq: item.isHistory ? '' : (item.deptSeq || ''),
        source: item.isHistory
            ? `找課・歷年課程${item.lastSemester ? `（最近 ${item.lastSemester} 開課）` : ''}`
            : `找課・${semester} 開課`
    };
}

function buildCourseFromCatalog(item) {
    const notes = [
        item.isHistory ? `時段依 ${item.lastSemester} 開課資料預估，實際以當學期公告為準。` : '',
        item.timeHidden ? '上課時間未公開，請至學校課程查詢頁確認後手動補上。' : '',
        (item.restrictions || []).join('、'),
        item.notes || ''
    ].filter(Boolean).join('\n');

    return {
        code: item.code || '',
        catalogId: item.id,
        ...describeCatalogSource(item),
        name: item.name,
        credits: item.credits,
        type: resolveCatalogType(item),
        teacher: item.teacher || '',
        room: item.room || '',
        url: item.syllabusUrl || '',
        color: '#7c3aed',
        textColor: '#ffffff',
        slots: (item.slots || []).map(s => ({ day: s.day, periods: [...s.periods] })),
        frequency: 'weekly',
        overrides: {},
        notes
    };
}

function addDiscoverToWishlist(catalogId) {
    const item = findCatalogCourse(catalogId);
    if (!item) return;

    if (!appData.wishlist) appData.wishlist = [];

    const existIdx = appData.wishlist.findIndex(w => w.catalogId === item.id);

    if (existIdx !== -1) {
        appData.wishlist.splice(existIdx, 1);
    } else {
        appData.wishlist.push({
            ...buildCourseFromCatalog(item),
            id: Date.now(),
            semester: appData.currentSemester
        });
    }

    saveData();
    renderDiscoverResults();
    if (typeof renderWishlist === 'function') renderWishlist();
}

// ============================================================
// 規劃學期 ↔ 實際學年期（依入學學年換算，例如 114 入學：一上 = 114-1）
// ============================================================

/**
 * 入學學年：大學部 entryYear 存的是「入學學年 + 4」（118 = 114 學年入學），碩士班直接存入學學年
 */
function getEntryAcademicYear() {
    if (typeof isMasterMode === 'function' && isMasterMode(appData)) {
        return parseInt(appData.masterEntryYear, 10) || null;
    }
    const raw = parseInt(appData.entryYear, 10);
    if (!raw) return null;
    return raw >= 100 ? raw - 4 : raw;
}

/**
 * 規劃學期名稱換算為學年期，例如 entry = 114 時「二上」→ { label: '115-1', key: 1151, term: '上' }
 */
function semesterToAcademic(semName, entryYear) {
    const m = String(semName || '').match(/^([一二三四五六七八九十\d]+)(上|下|暑)$/);
    if (!m || !entryYear) return null;
    const numIdx = SEMESTER_NUM_MAP.indexOf(m[1]);
    const yearIdx = numIdx >= 0 ? numIdx : (parseInt(m[1], 10) - 1);
    if (isNaN(yearIdx) || yearIdx < 0) return null;
    const year = entryYear + yearIdx;
    const termNo = m[2] === '上' ? 1 : (m[2] === '下' ? 2 : 3);
    return {
        label: termNo === 3 ? `${year}暑` : `${year}-${termNo}`,
        key: year * 10 + termNo,
        term: m[2]
    };
}

function academicKey(label) {
    const m = String(label || '').match(/^(\d+)-(\d)$/);
    return m ? parseInt(m[1], 10) * 10 + parseInt(m[2], 10) : null;
}

/**
 * 預選排入學期：
 * - 本學期開課的課 → 對應本學期學年期的規劃學期（例如 114 入學、115-1 → 二上）
 * - 歷年課程 → 本學期起，第一個「通常有開這門課」的學期（上／下學期）
 * 無法換算時沿用規劃頁目前所在學期
 */
function pickDefaultTargetSemester(item, order) {
    const fallback = order.includes(appData.currentSemester) ? appData.currentSemester : order[0];
    const entry = getEntryAcademicYear();
    const nowKey = academicKey(window.COURSE_CATALOG_META && window.COURSE_CATALOG_META.semester);
    if (!entry || !nowKey) return fallback;

    const mapped = order.map(sem => ({ sem, acad: semesterToAcademic(sem, entry) })).filter(x => x.acad);

    if (!item.isHistory) {
        const hit = mapped.find(x => x.acad.key === nowKey);
        return hit ? hit.sem : fallback;
    }

    const hit = mapped.find(x => x.acad.term !== '暑' && x.acad.key >= nowKey && item.semester.includes(x.acad.term));
    return hit ? hit.sem : fallback;
}

function openAddToSemesterModal(catalogId) {
    const item = findCatalogCourse(catalogId);
    if (!item) return;

    currentTargetCourseToSemester = item;
    const select = document.getElementById('targetSemesterSelect');
    const info = document.getElementById('addToSemTargetInfo');

    // 醫、牙、藥學系為 6 年、建築五年制為 5 年：確保規劃中有大五、大六學期，才能對應到正確學年期
    const isMaster = typeof isMasterMode === 'function' && isMasterMode(appData);
    if (!isMaster && typeof getDeptStudyYears === 'function' && typeof ensureSemestersForYears === 'function') {
        const before = (appData.semesterOrder || []).length;
        ensureSemestersForYears(appData, getDeptStudyYears(appData.deptName, appData.entryYear));
        if (appData.semesterOrder.length !== before) {
            saveData();
            if (typeof renderSemesterSelect === 'function') renderSemesterSelect();
        }
    }

    const order = appData.semesterOrder || ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
    const entry = getEntryAcademicYear();

    if (info) {
        info.innerText = `課程：${item.name} (${item.credits} 學分 · ${resolveCatalogType(item)})` +
            (entry ? `\n依 ${entry} 學年入學換算學年期，已預選建議的學期` : '');
    }
    if (select) {
        select.innerHTML = '';
        const defaultSem = pickDefaultTargetSemester(item, order);
        order.forEach(sem => {
            const acad = semesterToAcademic(sem, entry);
            const opt = document.createElement('option');
            opt.value = sem;
            opt.innerText = acad ? `${sem}（${acad.label}）` : `${sem} 課表`;
            if (sem === defaultSem) opt.selected = true;
            select.appendChild(opt);
        });
    }

    const btnConfirm = document.getElementById('btnConfirmAddToSem');
    if (btnConfirm) {
        btnConfirm.onclick = confirmAddDiscoverToSemester;
    }

    updateAddToSemesterPrereqPreview();
    ModalManager.open('addToSemesterModal');
}

function updateAddToSemesterOfferAlert(item, targetSem) {
    const offerBox = document.getElementById('addToSemOfferAlert');
    if (!offerBox) return;
    const warning = checkOfferingForSemester(item.code, targetSem);
    offerBox.innerHTML = warning ? `
        <div style="background:var(--tf-status-warning-bg); border:1px solid var(--tf-status-warning-border); border-radius:var(--tf-radius-md); padding:8px 10px; font-size:0.75rem; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; color:var(--tf-text-primary);">開課學期提醒</span>
                <span class="tf-badge tf-badge-warning">${Icons.get('warning', { size: 12 })} 可能不開課</span>
            </div>
            <div style="color:var(--tf-text-secondary); line-height:1.4;">${escapeHTML(warning)}</div>
        </div>
    ` : '';
}

function updateAddToSemesterPrereqPreview() {
    const alertBox = document.getElementById('addToSemPrereqAlert');
    const select = document.getElementById('targetSemesterSelect');
    if (!alertBox || !select || !currentTargetCourseToSemester) return;

    updateAddToSemesterOfferAlert(currentTargetCourseToSemester, select.value);

    const targetSem = select.value;

    if (typeof PrerequisiteEngine === 'undefined') {
        alertBox.innerHTML = '';
        return;
    }

    const item = currentTargetCourseToSemester;
    const pRes = PrerequisiteEngine.check({ code: item.code, name: item.name, catalogId: item.id }, targetSem, appData.semesters, appData.semesterOrder);

    if (!pRes.hasPrerequisite) {
        alertBox.innerHTML = '';
        return;
    }

    let boxBg = 'var(--tf-surface-sunken)';
    let borderCol = 'var(--tf-border-default)';
    let badgeHtml = '';

    if (pRes.overallStatus === 'passed') {
        borderCol = 'var(--tf-status-success-border)';
        boxBg = 'var(--tf-status-success-bg)';
        badgeHtml = `<span class="tf-badge tf-badge-success">${Icons.get('check', { size: 12 })} 先修已符合</span>`;
    } else if (pRes.overallStatus === 'planned') {
        borderCol = 'var(--tf-status-warning-border)';
        boxBg = 'var(--tf-status-warning-bg)';
        badgeHtml = `<span class="tf-badge tf-badge-warning">${Icons.get('warning', { size: 12 })} 預計符合</span>`;
    } else if (pRes.overallStatus === 'blocked') {
        borderCol = 'var(--tf-status-danger-border)';
        boxBg = 'var(--tf-status-danger-bg)';
        badgeHtml = `<span class="tf-badge tf-badge-danger">${Icons.get('close', { size: 12 })} 先修不符合</span>`;
    } else {
        badgeHtml = `<span class="tf-badge tf-badge-neutral">先修待確認</span>`;
    }

    alertBox.innerHTML = `
        <div style="background:${boxBg}; border:1px solid ${borderCol}; border-radius:var(--tf-radius-md); padding:8px 10px; font-size:0.75rem; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; color:var(--tf-text-primary);">排入【${escapeHTML(targetSem)}】先修檢核</span>
                ${badgeHtml}
            </div>
            <div style="color:var(--tf-text-secondary); line-height:1.4;">${escapeHTML(pRes.message)}</div>
        </div>
    `;
}

function closeAddToSemesterModal(e) {
    if (e && e.target && e.target !== e.currentTarget) return;
    ModalManager.close('addToSemesterModal');
    currentTargetCourseToSemester = null;
}

function confirmAddDiscoverToSemester() {
    if (!currentTargetCourseToSemester) return;
    const targetSem = document.getElementById('targetSemesterSelect').value;
    const item = currentTargetCourseToSemester;

    if (typeof isCourseAlreadyInSemester === 'function' && isCourseAlreadyInSemester(item, targetSem)) {
        alert(`⚠️ 課程已存在！\n「${item.name}」已經排在【${targetSem}】，無法重複排入。`);
        return;
    }

    const newCourse = {
        ...buildCourseFromCatalog(item),
        id: Date.now(),
        isTentative: false,
        status: '修讀中',
        score: null,
        passed: true,
        recurring: true
    };

    if (!appData.semesters[targetSem]) appData.semesters[targetSem] = [];
    appData.semesters[targetSem].push(newCourse);

    saveData();
    closeAddToSemesterModal();
    updateAppUI();
    renderDiscoverResults();
    alert(`已成功將「${item.name}」排入【${targetSem}】修課規劃！`);
}

if (typeof window !== 'undefined') {
    window.openDiscoverView = openDiscoverView;
    window.handleDiscoverSearch = handleDiscoverSearch;
    window.clearDiscoverSearch = clearDiscoverSearch;
    window.resetDiscoverFilters = resetDiscoverFilters;
    window.setDiscoverSource = setDiscoverSource;
    window.getOfferingInfo = getOfferingInfo;
    window.describeOffering = describeOffering;
    window.checkOfferingForSemester = checkOfferingForSemester;
    window.showMoreDiscoverResults = showMoreDiscoverResults;
    window.handleTableRowClick = handleTableRowClick;
    window.showDiscoverDetail = showDiscoverDetail;
    window.addDiscoverToWishlist = addDiscoverToWishlist;
    window.openAddToSemesterModal = openAddToSemesterModal;
    window.updateAddToSemesterPrereqPreview = updateAddToSemesterPrereqPreview;
    window.closeAddToSemesterModal = closeAddToSemesterModal;
}
