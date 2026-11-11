// ============================================================
// 🌿 TimeFlow v3.6.1 — 通識選課推薦 (ge-recommend.js)
// ------------------------------------------------------------
// 依畢業檢核還缺哪些通識，從課程資料裡推薦本學期可以修的通識課：
// - 還缺幾個領域、哪個領域已修滿、融合通識是否達低標、總學分還差多少
// - 排除：本系不承認的通識、領域已達上限或不採計、已修／已排的課、與已排課程衝堂的課
// 上半部 GeRecommend 是純計算（有自動化測試）；下半部是彈窗畫面。大學部專用。
// ============================================================

const GeRecommend = (function () {
    // 課程資料的 baseType ↔ 檢核結果的領域鍵
    const DOMAINS = [
        { key: 'human', name: '人文學', baseType: '通識-人文', aliases: ['human', '人文', '人文學'] },
        { key: 'social', name: '社會科學', baseType: '通識-社科', aliases: ['social', '社科', '社會科學'] },
        { key: 'nature', name: '自然與工程科學', baseType: '通識-自然', aliases: ['nature', '自然', '自然與工程', '自然與工程科學'] },
        { key: 'bio', name: '生命科學與健康', baseType: '通識-生醫', aliases: ['bio', '生醫', '生命與健康', '生命科學與健康'] },
        { key: 'inter', name: '科際整合', baseType: '通識-科際', aliases: ['inter', '科際', '科際整合'] }
    ];
    const RONG = { key: 'rong', name: '融合通識', baseType: '融通' };
    const BASE_TYPES = new Set([...DOMAINS.map(d => d.baseType), RONG.baseType]);

    function isGeneralEducation(course) {
        return BASE_TYPES.has(course.baseType);
    }

    /** 名稱比對用：去空白與標點、統一「介／界」與括號 */
    function normName(name) {
        return String(name || '').toLowerCase()
            .replace(/[\s\-_—–()（）\[\]【】·・、,，:：]/g, '')
            .replace(/介/g, '界');
    }

    function slotKeys(course) {
        const keys = new Set();
        const freq = course.frequency === 'odd' ? ['o'] : (course.frequency === 'even' ? ['e'] : ['o', 'e']);
        (course.slots || []).forEach(s => (s.periods || []).forEach(p => freq.forEach(f => keys.add(`${s.day}-${p}-${f}`))));
        return keys;
    }

    function overlaps(a, b) {
        const ka = slotKeys(a);
        return [...slotKeys(b)].some(k => ka.has(k));
    }

    /**
     * 整理目前通識的缺口
     * @param {object} result  calculateGraduation() 的結果
     * @param {{ domainMin: number, rongMin: number }} limits  getGeneralEducationLimits()
     * @param {object} [rule]  學系規則（不採計的領域用）
     */
    function computeNeeds(result, limits, rule = {}) {
        const ge = result.generalEducation;
        const d = ge.domain;
        const details = d.details || {};
        const diversityExcluded = rule.diversityExcludedDomains || [];
        const domains = DOMAINS.map(def => {
            const cap = details[`${def.key}Cap`] !== undefined ? details[`${def.key}Cap`] : d.max;
            const exp = details[`${def.key}Exp`] || 0;
            return {
                ...def,
                earned: details[def.key] || 0,
                expected: exp,
                cap,
                excluded: cap === 0,
                full: cap > 0 && exp >= cap,
                noDiversity: diversityExcluded.some(x => def.aliases.includes(x))
            };
        });
        const required = d.requiredDomains || limits.domainCountMin || 3;
        return {
            domains,
            requiredDomains: required,
            activeDomains: d.activeDomainsExpected || 0,
            neededNewDomains: Math.max(0, required - (d.activeDomainsExpected || 0)),
            domainShort: Math.max(0, (limits.domainMin || 0) - (d.expected || 0)),
            rongExpected: ge.rong ? ge.rong.expected : 0,
            rongShort: Math.max(0, (limits.rongMin || 0) - (ge.rong ? ge.rong.expected : 0)),
            rongFull: !!ge.rong && ge.rong.expected >= ge.rong.max,
            remaining: Math.max(0, (ge.target || 0) - (ge.effectiveExpected || 0)),
            target: ge.target || 0
        };
    }

    /**
     * 推薦通識課
     * @param {object} input
     * @param {object} input.needs      computeNeeds() 的結果
     * @param {Array}  input.pool       候選課程（課程資料庫的通識課）
     * @param {Array}  input.fixed      本學期已排、非暫定的課程（用來判斷衝堂）
     * @param {Array}  input.taken      已修／已排的所有課程（避免重複推薦）
     * @param {Array}  [input.disallowed]  本系不承認的通識課名
     * @param {Iterable} [input.wishlistIds] 已在候選庫的課程 id
     * @param {boolean} [input.includeConflicts=false] 是否也列出與已排課程衝堂的課
     * @param {boolean} [input.uncertain=false]   資料來自歷年開課（本學期是否開課待確認）
     * @param {number} [input.limit=60]
     */
    function recommend({ needs, pool, fixed = [], taken = [], disallowed = [], wishlistIds = [], includeConflicts = false, uncertain = false, limit = 60 }) {
        const byKey = new Map([...needs.domains.map(d => [d.baseType, d]), [RONG.baseType, { ...RONG, expected: needs.rongExpected, full: needs.rongFull, excluded: false }]]);
        const disallowedSet = new Set(disallowed.map(normName));
        const takenNames = new Set(taken.map(c => normName(c.name)));
        const takenCodes = new Set(taken.map(c => String(c.code || '').toUpperCase()).filter(Boolean));
        const wish = new Set(Array.from(wishlistIds, String));

        const allDone = needs.neededNewDomains === 0 && needs.domainShort === 0 && needs.rongShort === 0 && needs.remaining === 0;
        let hiddenConflicts = 0;
        const seen = new Set();
        const out = [];

        for (const course of pool) {
            if (!isGeneralEducation(course)) continue;
            const domain = byKey.get(course.baseType);
            if (!domain || domain.excluded || domain.full) continue;
            const nameKey = normName(course.name);
            if (disallowedSet.has(nameKey)) continue;
            if (takenNames.has(nameKey) || (course.code && takenCodes.has(String(course.code).toUpperCase()))) continue;
            const dupKey = `${course.code || nameKey}|${(course.slots || []).map(s => s.day + s.periods.join('')).join(',')}`;
            if (seen.has(dupKey)) continue;
            seen.add(dupKey);

            const conflicts = fixed.filter(f => overlaps(f, course)).map(f => f.name);
            if (conflicts.length && !includeConflicts) { hiddenConflicts++; continue; }

            let score = 10;
            const reasons = [];
            const isRong = domain.key === 'rong';
            if (!isRong && domain.expected === 0 && !domain.noDiversity && needs.neededNewDomains > 0) {
                score += 60;
                reasons.push(`新領域：還缺 ${needs.neededNewDomains} 個領域才符合至少 ${needs.requiredDomains} 個領域`);
            }
            if (!isRong && needs.domainShort > 0) {
                score += 20;
                reasons.push(`領域通識還缺 ${needs.domainShort} 學分達低標`);
            }
            if (isRong && needs.rongShort > 0) {
                score += 50;
                reasons.push(`融合通識還缺 ${needs.rongShort} 學分達低標`);
            }
            if (needs.remaining > 0) {
                score += 15;
                reasons.push(`通識總學分還差 ${needs.remaining}`);
                if ((parseFloat(course.credits) || 0) <= needs.remaining) score += 5;
            }
            if (allDone) reasons.push('通識已達標（可當作額外選修參考）');
            if (!isRong && domain.expected > 0) reasons.push(`${domain.name}目前 ${domain.expected} 學分`);

            out.push({
                course, domainKey: domain.key, domainName: domain.name, score, reasons, conflicts,
                inWishlist: wish.has(String(course.id)), uncertain
            });
        }

        out.sort((a, b) => b.score - a.score || (a.conflicts.length - b.conflicts.length) || String(a.course.name).localeCompare(String(b.course.name), 'zh-Hant'));
        return { candidates: out.slice(0, limit), total: out.length, hiddenConflicts, allDone };
    }

    return { DOMAINS, RONG, isGeneralEducation, normName, computeNeeds, recommend };
})();

if (typeof window !== 'undefined') window.GeRecommend = GeRecommend;

// ============================================================
// 畫面
// ============================================================

let geState = { filter: 'all', includeConflicts: false, data: null };

function termOfSemesterName(sem) {
    const m = /(上|下|暑)$/.exec(String(sem || ''));
    return m ? m[1] : '上';
}

/** 依目標學期是上學期或下學期，決定用本學期課程資料，還是歷年開課推測 */
function pickGePool(term) {
    const catalogMeta = window.COURSE_CATALOG_META || {};
    const catalogTerm = String(catalogMeta.semester || '').endsWith('-1') ? '上' : (String(catalogMeta.semester || '').endsWith('-2') ? '下' : '');
    if (catalogTerm === term && window.COURSE_CATALOG) {
        return { kind: 'catalog', label: `${catalogMeta.semester} 開課資料`, pool: window.COURSE_CATALOG.filter(GeRecommend.isGeneralEducation), uncertain: false };
    }
    const meta = window.COURSE_HISTORY_META || {};
    const digit = term === '上' ? '1' : '2';
    const years = (meta.years || []).slice(-2);
    const pool = (window.COURSE_HISTORY || []).filter(c => GeRecommend.isGeneralEducation(c)
        && (c.offered || []).some(s => s.endsWith(`-${digit}`) && years.includes(s.split('-')[0])));
    return { kind: 'history', label: `歷年開課（${years.join('、')} 學年的${term}學期）`, pool, uncertain: true };
}

function buildGeRecommendation() {
    const result = calculateGraduation(appData);
    if (!result || !result.generalEducation) return null;
    const rule = getDepartmentGraduationRule(appData.deptName, appData.entryYear, appData) || {};
    const limits = getGeneralEducationLimits(appData.englishWaived, appData.entryYear);
    const needs = GeRecommend.computeNeeds(result, limits, rule);
    const sem = appData.currentSemester;
    const source = pickGePool(termOfSemesterName(sem));
    const fixed = ((appData.semesters && appData.semesters[sem]) || []).filter(c => !c.isTentative);
    const taken = Object.values(appData.semesters || {}).flat().filter(c => c.status !== '未取得');
    const rec = GeRecommend.recommend({
        needs, pool: source.pool, fixed, taken,
        disallowed: rule.disallowedGeneralCourses || [],
        wishlistIds: (appData.wishlist || []).map(w => w.id),
        includeConflicts: geState.includeConflicts,
        uncertain: source.uncertain,
        limit: 200
    });
    return { needs, source, rec, sem };
}

function openGeRecommend() {
    if (appData.degree === 'master') {
        alert('通識選課推薦只適用於大學部。');
        return;
    }
    geState = { filter: 'all', includeConflicts: false, data: null };
    const body = document.getElementById('geRecommendBody');
    if (body) body.innerHTML = '<div class="master-muted">正在載入課程資料…</div>';
    ModalManager.open('geRecommendModal');
    loadCourseCatalog().then(renderGeRecommend).catch(() => {
        if (body) body.innerHTML = '<div class="master-callout warn">課程資料載入失敗，請檢查網路後重試。</div>';
    });
}

function closeGeRecommend(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
    ModalManager.close('geRecommendModal');
}

function setGeFilter(key) {
    geState.filter = key;
    renderGeRecommend();
}

function toggleGeConflicts(checked) {
    geState.includeConflicts = !!checked;
    renderGeRecommend();
}

function addGeToWishlist(id) {
    if (typeof addDiscoverToWishlist === 'function') addDiscoverToWishlist(id);
    renderGeRecommend();
}

/** 多位教師的課（例如通識講座）只列前三位 */
function shortTeachers(text) {
    const names = String(text).split(/[、,，]/).map(t => t.trim()).filter(Boolean);
    return names.length > 3 ? `${names.slice(0, 3).join('、')} 等 ${names.length} 位` : names.join('、');
}

function renderGeRecommend() {
    const body = document.getElementById('geRecommendBody');
    if (!body) return;
    const data = buildGeRecommendation();
    if (!data) { body.innerHTML = '<div class="master-callout warn">無法計算通識缺口。</div>'; return; }
    geState.data = data;
    const { needs, source, rec, sem } = data;

    const chips = needs.domains.map(d => {
        const cls = d.excluded ? 'tf-badge-warning' : (d.expected > 0 ? 'tf-badge-success' : 'tf-badge-neutral');
        const text = d.excluded ? '本系不採計' : `${d.expected} / ${d.cap}`;
        return `<span class="tf-badge ${cls}">${escapeHTML(d.name)} ${escapeHTML(text)}</span>`;
    }).join('');
    const rongChip = `<span class="tf-badge ${needs.rongShort > 0 ? 'tf-badge-warning' : 'tf-badge-success'}">融合通識 ${escapeHTML(needs.rongExpected)} 學分</span>`;

    const gaps = [];
    if (needs.neededNewDomains > 0) gaps.push(`還缺 <b>${escapeHTML(needs.neededNewDomains)}</b> 個領域（至少 ${escapeHTML(needs.requiredDomains)} 個）`);
    if (needs.domainShort > 0) gaps.push(`領域通識還缺 <b>${escapeHTML(needs.domainShort)}</b> 學分達低標`);
    if (needs.rongShort > 0) gaps.push(`融合通識還缺 <b>${escapeHTML(needs.rongShort)}</b> 學分達低標`);
    if (needs.remaining > 0) gaps.push(`通識總學分還差 <b>${escapeHTML(needs.remaining)}</b> 學分（目標 ${escapeHTML(needs.target)}）`);

    const filters = [{ key: 'all', name: '全部' }, ...needs.domains.filter(d => !d.excluded).map(d => ({ key: d.key, name: d.name })), { key: 'rong', name: '融合通識' }];
    const filterHtml = filters.map(f => `<button type="button" class="btn-filter-icon ${geState.filter === f.key ? 'active' : ''}" data-onclick="setGeFilter('${f.key}')">${escapeHTML(f.name)}</button>`).join('');

    const shown = rec.candidates.filter(c => geState.filter === 'all' || c.domainKey === geState.filter).slice(0, 40);
    const dayNamesRef = (typeof dayNames !== 'undefined') ? dayNames : {};
    const rows = shown.map(item => {
        const c = item.course;
        const id = escapeHTML(String(c.id));
        const slotText = (c.slots || []).filter(s => (s.periods || []).length).map(s => `(${dayNamesRef[s.day] || s.day})${s.periods.join(',')}`).join(' ') || '未排時段';
        return `
            <div class="compare-row">
                <div class="compare-row-main">
                    <div class="compare-row-title"><b>${escapeHTML(c.name)}</b>
                        <span class="master-muted">${escapeHTML(c.credits)} 學分・${escapeHTML(item.domainName)}${c.teacher ? `・${escapeHTML(shortTeachers(c.teacher))}` : ''}</span></div>
                    <div class="master-muted">${escapeHTML(slotText)}</div>
                    <div class="compare-row-flags">
                        ${item.conflicts.length ? `<span class="tf-badge tf-badge-danger">與已排衝堂：${escapeHTML(item.conflicts.join('、'))}</span>` : '<span class="tf-badge tf-badge-success">不衝堂</span>'}
                        ${item.uncertain ? '<span class="tf-badge tf-badge-warning" title="依歷年開課推測，實際是否開課請以選課系統為準">本學期是否開課待確認</span>' : ''}
                        ${item.reasons.slice(0, 2).map(r => `<span class="tf-badge tf-badge-accent">${escapeHTML(r)}</span>`).join('')}
                    </div>
                </div>
                <div class="ge-actions">
                    <button type="button" class="btn-wishlist-add-mini" data-onclick="showDiscoverDetail('${id}')">詳情</button>
                    ${item.inWishlist
                        ? '<span class="tf-badge tf-badge-success">已候選</span>'
                        : `<button type="button" class="btn-wishlist-add-mini" data-onclick="addGeToWishlist('${id}')">＋ 候選</button>`}
                </div>
            </div>`;
    }).join('');

    body.innerHTML = `
        <div class="compare-summary"><span>推薦學期：<b>${escapeHTML(sem)}</b>・資料來源：${escapeHTML(source.label)}</span></div>
        <div class="compare-row-flags">${chips}${rongChip}</div>
        ${gaps.length ? `<div class="master-callout info">${gaps.join('；')}。</div>` : '<div class="master-callout info">通識已達畢業門檻，以下僅供當作額外選修參考。</div>'}
        ${source.uncertain ? '<div class="master-callout warn">本學期的開課資料不是目前這個學期（只有另一學期的資料），以下依歷年開課推測，選課前請再確認。</div>' : ''}
        <div class="header-filters">${filterHtml}</div>
        <label class="enroll-assume"><input type="checkbox" ${geState.includeConflicts ? 'checked' : ''} data-onchange="toggleGeConflicts(this.checked)"> 也列出與已排課程衝堂的課${rec.hiddenConflicts ? `（已隱藏 ${escapeHTML(rec.hiddenConflicts)} 門）` : ''}</label>
        <div class="compare-list">${rows || '<div class="master-muted">目前沒有符合條件的推薦。可以勾選「也列出衝堂的課」，或換一個領域看看。</div>'}</div>
        ${rec.total > shown.length ? `<div class="master-muted">共 ${escapeHTML(rec.total)} 門符合，這裡只列前 ${escapeHTML(shown.length)} 門。</div>` : ''}
    `;
}

if (typeof window !== 'undefined') {
    Object.assign(window, { openGeRecommend, closeGeRecommend, setGeFilter, toggleGeConflicts, addGeToWishlist, renderGeRecommend });
}
