// ============================================================
// 🎯 TimeFlow v3.6.1 — 選課志願序模擬 (enroll-sim.js)
// ------------------------------------------------------------
// 選課時常要排志願、備案：「A 班第一志願，沒選上換 B 班，再不行換 C 班」。
// 這裡把候選課分成幾個「志願組」（每組想修的是同一件事，例如同一門課的不同班），
// 組內由上而下排志願。系統會列舉所有可能的組合，排除與已排課程或彼此衝堂的，
// 依志願序由好到壞排出前幾名，並可假設「某班沒選上」重新計算備案。
//
// 上半部 EnrollSim 是純計算（不碰畫面，有自動化測試）；下半部是畫面。
// ============================================================

const EnrollSim = (function () {
    const MAX_GROUPS = 12;
    const MAX_OPTIONS = 8;

    /**
     * 課程佔用的時段鍵：星期-節次-週別。每週課同時佔 o（單週）與 e（雙週）；
     * 單週課只佔 o、雙週課只佔 e，所以單雙週互補的兩門課不算衝堂。
     */
    function slotKeys(course) {
        const keys = new Set();
        const freq = course.frequency === 'odd' ? ['o'] : (course.frequency === 'even' ? ['e'] : ['o', 'e']);
        (course.slots || []).forEach(s => (s.periods || []).forEach(p => freq.forEach(f => keys.add(`${s.day}-${p}-${f}`))));
        return keys;
    }

    function intersects(a, b) {
        const [small, big] = a.size <= b.size ? [a, b] : [b, a];
        for (const k of small) if (big.has(k)) return true;
        return false;
    }

    function coursesConflict(a, b) {
        return intersects(slotKeys(a), slotKeys(b));
    }

    function credits(course) {
        return parseFloat(course.credits) || 0;
    }

    /**
     * 列舉並排名所有可行的組合
     * @param {object} input
     * @param {Array} input.fixed      已確定要修的課程（本學期已排、非暫定）
     * @param {Array} input.groups     [{ id, name, optional, options: [course, ...] }]，options 依志願由高到低
     * @param {number} [input.maxResults=8]  最多回傳幾組
     * @param {Iterable} [input.excludeIds]   假設沒選上的課程 id
     * @param {number} [input.nodeLimit=300000]  搜尋節點上限（避免組合爆炸卡死畫面）
     * @param {boolean} [input.withDiagnosis=true]  沒有可行組合時是否附上原因分析
     * @returns {{ results: Array, exhaustive: boolean, diagnosis: object|null }}
     */
    function enumerate({ fixed = [], groups = [], maxResults = 8, excludeIds = [], nodeLimit = 300000, withDiagnosis = true }) {
        const excluded = new Set(Array.from(excludeIds, String));
        const fixedKeys = new Set();
        fixed.forEach(c => slotKeys(c).forEach(k => fixedKeys.add(k)));
        const fixedCredits = fixed.reduce((s, c) => s + credits(c), 0);

        // 每組可用的選項：未被排除、不與已排課程衝堂
        const prepared = groups.map(g => {
            const opts = (g.options || []).map((course, rank) => ({ course, rank, keys: slotKeys(course), id: String(course.id) }));
            const usable = opts.filter(o => !excluded.has(o.id) && !intersects(o.keys, fixedKeys));
            const skipRank = opts.length;
            return { group: g, opts, usable, skipRank, optional: !!g.optional };
        });

        // 最少選項的組先搜尋（失敗得早、剪枝多）；輸出時再還原成原本順序
        const order = prepared.map((p, i) => i).sort((a, b) => {
            const na = prepared[a].usable.length + (prepared[a].optional ? 1 : 0);
            const nb = prepared[b].usable.length + (prepared[b].optional ? 1 : 0);
            return na - nb || a - b;
        });

        // 每組最低可能代價（用來剪枝）
        const minCost = order.map(i => {
            const p = prepared[i];
            const best = p.usable.length ? p.usable[0].rank : Infinity;
            return p.optional ? Math.min(best, p.skipRank) : best;
        });
        const remainingMin = new Array(order.length + 1).fill(0);
        for (let i = order.length - 1; i >= 0; i--) remainingMin[i] = remainingMin[i + 1] + minCost[i];

        const top = [];
        let nodes = 0;
        let exhaustive = true;

        const better = (a, b) => a.cost !== b.cost ? a.cost < b.cost
            : (a.credits !== b.credits ? a.credits > b.credits : a.signature < b.signature);

        function offer(result) {
            let idx = top.findIndex(r => better(result, r));
            if (idx === -1) idx = top.length;
            if (idx >= maxResults) return;
            top.splice(idx, 0, result);
            if (top.length > maxResults) top.pop();
        }

        const chosen = new Array(order.length);
        function dfs(depth, used, cost, creditSum) {
            if (!exhaustive) return;
            if (++nodes > nodeLimit) { exhaustive = false; return; }
            if (top.length >= maxResults && cost + remainingMin[depth] > top[top.length - 1].cost) return;

            if (depth === order.length) {
                const picks = prepared.map((p, i) => {
                    const pos = order.indexOf(i);
                    const pick = chosen[pos];
                    return { groupId: p.group.id, groupName: p.group.name, course: pick ? pick.course : null, rank: pick ? pick.rank : p.skipRank };
                });
                offer({
                    cost,
                    credits: fixedCredits + creditSum,
                    picks,
                    courses: picks.filter(p => p.course).map(p => p.course),
                    signature: picks.map(p => p.rank).join(',')
                });
                return;
            }

            const p = prepared[order[depth]];
            for (const opt of p.usable) {
                if (intersects(opt.keys, used)) continue;
                const next = new Set(used);
                opt.keys.forEach(k => next.add(k));
                chosen[depth] = opt;
                dfs(depth + 1, next, cost + opt.rank, creditSum + credits(opt.course));
            }
            if (p.optional) {
                chosen[depth] = null;
                dfs(depth + 1, used, cost + p.skipRank, creditSum);
            }
        }
        dfs(0, new Set(), 0, 0);

        const results = top.map(({ signature, ...rest }) => rest);
        return {
            results,
            exhaustive,
            diagnosis: (results.length || !withDiagnosis) ? null : diagnose({ fixed, groups, prepared, excluded, fixedKeys, maxResults, nodeLimit })
        };
    }

    /**
     * 沒有任何可行組合時，說明卡在哪裡：
     * - 哪些選項被已排課程擋住
     * - 哪些組的所有選項互相衝堂
     * - 若放棄哪一組（改成可不修）就有解
     */
    function diagnose({ fixed, groups, prepared, excluded, fixedKeys, nodeLimit }) {
        const blocked = [];
        prepared.forEach(p => p.opts.forEach(o => {
            if (excluded.has(o.id)) return;
            if (intersects(o.keys, fixedKeys)) {
                blocked.push({
                    groupId: p.group.id, groupName: p.group.name, optionId: o.id, name: o.course.name,
                    by: fixed.filter(c => coursesConflict(c, o.course)).map(c => c.name)
                });
            }
        }));

        const emptyGroups = prepared.filter(p => !p.optional && p.usable.length === 0).map(p => ({ groupId: p.group.id, groupName: p.group.name }));

        const clashPairs = [];
        for (let i = 0; i < prepared.length; i++) {
            for (let j = i + 1; j < prepared.length; j++) {
                const a = prepared[i].usable, b = prepared[j].usable;
                if (!a.length || !b.length) continue;
                if (prepared[i].optional || prepared[j].optional) continue;
                if (a.every(x => b.every(y => intersects(x.keys, y.keys)))) {
                    clashPairs.push({ a: prepared[i].group.name, b: prepared[j].group.name });
                }
            }
        }

        const relaxations = [];
        groups.forEach(g => {
            if (g.optional) return;
            const relaxed = groups.map(x => x === g ? { ...x, optional: true } : x);
            const r = enumerate({ fixed, groups: relaxed, maxResults: 1, excludeIds: excluded, nodeLimit: Math.min(nodeLimit, 50000), withDiagnosis: false });
            if (r.results.length) relaxations.push({ groupId: g.id, groupName: g.name });
        });

        return { blocked, emptyGroups, clashPairs, relaxations };
    }

    return { MAX_GROUPS, MAX_OPTIONS, slotKeys, coursesConflict, enumerate };
})();

if (typeof window !== 'undefined') window.EnrollSim = EnrollSim;

// ============================================================
// 畫面
// ============================================================

let enrollExcluded = new Set();   // 假設「沒選上」的候選課 id（只在這次開啟期間有效）
let enrollLastResults = [];

function getEnrollPlan() {
    const sem = appData.currentSemester;
    if (!appData.enrollPlans) appData.enrollPlans = {};
    if (!appData.enrollPlans[sem]) appData.enrollPlans[sem] = { groups: [] };
    return appData.enrollPlans[sem];
}

function enrollWishlistById(id) {
    return (appData.wishlist || []).find(w => String(w.id) === String(id)) || null;
}

/** 候選課被刪除或已排入後，志願組裡對應的項目要清掉 */
function pruneEnrollPlan() {
    const plan = getEnrollPlan();
    plan.groups.forEach(g => { g.options = g.options.filter(id => enrollWishlistById(id)); });
}

function getEnrollFixed() {
    return ((appData.semesters && appData.semesters[appData.currentSemester]) || []).filter(c => !c.isTentative);
}

function enrollSave() {
    if (typeof saveData === 'function') saveData();
}

function openEnrollSim() {
    const wl = (appData.wishlist || []).filter(w => !w.semester || w.semester === appData.currentSemester);
    if (!wl.length) {
        alert('候選清單是空的，先從找課加入幾門候選課，再來排志願序吧！');
        return;
    }
    enrollExcluded = new Set();
    pruneEnrollPlan();
    if (!getEnrollPlan().groups.length) autoGroupEnroll(true);
    renderEnrollSim();
    ModalManager.open('enrollSimModal');
}

function closeEnrollSim(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
    ModalManager.close('enrollSimModal');
}

/** 依課名把候選課自動分組：同名課程（不同班、不同系所開的同一門課）放同一組 */
function autoGroupEnroll(silent) {
    const plan = getEnrollPlan();
    if (!silent && plan.groups.length && !confirm('要重新自動分組嗎？目前的志願組設定會被取代。')) return;
    const wl = (appData.wishlist || []).filter(w => !w.semester || w.semester === appData.currentSemester);
    const byKey = new Map();
    wl.forEach(w => {
        const nameKey = String(w.name || '').replace(/\s+/g, '').replace(/（/g, '(').replace(/）/g, ')').toLowerCase();
        const key = nameKey ? `n:${nameKey}` : `c:${String(w.code || w.id).trim().toUpperCase()}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(w);
    });
    plan.groups = Array.from(byKey.values()).slice(0, EnrollSim.MAX_GROUPS).map((items, i) => ({
        id: `g${i + 1}`,
        name: items[0].name.slice(0, 40),
        optional: false,
        options: Array.from(new Set(items.map(w => String(w.id)))).slice(0, EnrollSim.MAX_OPTIONS)
    }));
    enrollSave();
    if (!silent) renderEnrollSim();
}

function addEnrollGroup() {
    const plan = getEnrollPlan();
    if (plan.groups.length >= EnrollSim.MAX_GROUPS) { alert(`最多 ${EnrollSim.MAX_GROUPS} 個志願組。`); return; }
    let n = plan.groups.length + 1;
    while (plan.groups.some(g => g.id === `g${n}`)) n++;
    plan.groups.push({ id: `g${n}`, name: `志願組 ${plan.groups.length + 1}`, optional: false, options: [] });
    enrollSave();
    renderEnrollSim();
}

function findEnrollGroup(gid) {
    return getEnrollPlan().groups.find(g => g.id === gid) || null;
}

function removeEnrollGroup(gid) {
    const plan = getEnrollPlan();
    plan.groups = plan.groups.filter(g => g.id !== gid);
    enrollSave();
    renderEnrollSim();
}

function renameEnrollGroup(gid, value) {
    const g = findEnrollGroup(gid);
    if (!g) return;
    g.name = String(value || '').trim().slice(0, 40) || g.name;
    enrollSave();
    renderEnrollSim();
}

function toggleEnrollOptional(gid, checked) {
    const g = findEnrollGroup(gid);
    if (!g) return;
    g.optional = !!checked;
    enrollSave();
    renderEnrollSim();
}

function addEnrollOption(gid, wishId) {
    const g = findEnrollGroup(gid);
    if (!g || !wishId) { renderEnrollSim(); return; }
    if (g.options.length >= EnrollSim.MAX_OPTIONS) { alert(`每組最多 ${EnrollSim.MAX_OPTIONS} 個志願。`); renderEnrollSim(); return; }
    // 同一門候選課只能出現在一個志願組
    getEnrollPlan().groups.forEach(x => { x.options = x.options.filter(id => String(id) !== String(wishId)); });
    g.options.push(String(wishId));
    enrollSave();
    renderEnrollSim();
}

function removeEnrollOption(gid, wishId) {
    const g = findEnrollGroup(gid);
    if (!g) return;
    g.options = g.options.filter(id => String(id) !== String(wishId));
    enrollExcluded.delete(String(wishId));
    enrollSave();
    renderEnrollSim();
}

function moveEnrollOption(gid, wishId, delta) {
    const g = findEnrollGroup(gid);
    if (!g) return;
    const i = g.options.findIndex(id => String(id) === String(wishId));
    const j = i + delta;
    if (i === -1 || j < 0 || j >= g.options.length) return;
    [g.options[i], g.options[j]] = [g.options[j], g.options[i]];
    enrollSave();
    renderEnrollSim();
}

function toggleEnrollExclude(wishId, checked) {
    if (checked) enrollExcluded.add(String(wishId));
    else enrollExcluded.delete(String(wishId));
    renderEnrollSim();
}

function resetEnrollExclude() {
    enrollExcluded = new Set();
    renderEnrollSim();
}

/** 把選定的組合排入本學期，並從候選庫移除 */
function applyEnrollCombo(index) {
    const combo = enrollLastResults[index];
    if (!combo) return;
    const sem = appData.currentSemester;
    const names = combo.courses.map(c => c.name).join('、') || '（沒有課程）';
    if (!confirm(`確定把這組排入【${sem}】嗎？\n${names}`)) return;

    if (!appData.semesters[sem]) appData.semesters[sem] = [];
    let added = 0;
    combo.courses.forEach((item, i) => {
        if (typeof isCourseAlreadyInSemester === 'function' && isCourseAlreadyInSemester(item, sem)) return;
        appData.semesters[sem].push({
            ...item,
            id: Date.now() + i,
            status: '修讀中', score: null, passed: true, isTentative: false, recurring: true,
            frequency: item.frequency || 'weekly', overrides: {}
        });
        added++;
        const idx = appData.wishlist.findIndex(w => String(w.id) === String(item.id));
        if (idx !== -1) appData.wishlist.splice(idx, 1);
    });
    pruneEnrollPlan();
    enrollSave();
    if (typeof updateAppUI === 'function') updateAppUI();
    renderEnrollSim();
    alert(`已把 ${added} 門課排入【${sem}】。`);
}

function enrollCourseLine(c) {
    const slots = typeof formatCourseSlots === 'function' ? formatCourseSlots(c) : '';
    return `${escapeHTML(c.credits)} 學分${slots ? `・${escapeHTML(slots)}` : ''}${c.teacher ? `・${escapeHTML(c.teacher)}` : ''}`;
}

function renderEnrollSim() {
    const body = document.getElementById('enrollSimBody');
    if (!body) return;
    const sem = appData.currentSemester;
    pruneEnrollPlan();
    const plan = getEnrollPlan();
    const fixed = getEnrollFixed();
    const fixedCredits = fixed.reduce((s, c) => s + (parseFloat(c.credits) || 0), 0);

    const used = new Set(plan.groups.flatMap(g => g.options.map(String)));
    const free = (appData.wishlist || []).filter(w => (!w.semester || w.semester === sem) && !used.has(String(w.id)));

    const groups = plan.groups.map(g => ({
        id: g.id, name: g.name, optional: g.optional,
        options: g.options.map(enrollWishlistById).filter(Boolean)
    }));
    const sim = EnrollSim.enumerate({ fixed, groups, maxResults: 6, excludeIds: enrollExcluded });
    enrollLastResults = sim.results;

    const groupHtml = plan.groups.map(g => {
        const gid = escapeHTML(g.id);
        const options = g.options.map(enrollWishlistById).filter(Boolean);
        const optionRows = options.map((c, i) => {
            const wid = escapeHTML(String(c.id));
            const clashFixed = fixed.filter(f => EnrollSim.coursesConflict(f, c)).map(f => f.name);
            const off = enrollExcluded.has(String(c.id));
            return `
                <div class="enroll-option ${off ? 'off' : ''}">
                    <span class="enroll-rank">${i + 1}</span>
                    <div class="enroll-option-main">
                        <b>${escapeHTML(c.name)}</b>${c.classCode ? ` <span class="master-muted">${escapeHTML(c.classCode)} 班</span>` : ''}
                        <div class="master-muted">${enrollCourseLine(c)}</div>
                        ${clashFixed.length ? `<span class="tf-badge tf-badge-danger">與已排衝堂：${escapeHTML(clashFixed.join('、'))}</span>` : ''}
                    </div>
                    <label class="enroll-assume" title="假設這一個沒選上，看看備案">
                        <input type="checkbox" ${off ? 'checked' : ''} data-onchange="toggleEnrollExclude('${wid}', this.checked)"> 沒選上
                    </label>
                    <button type="button" class="enroll-icon-btn" aria-label="志願往前" data-onclick="moveEnrollOption('${gid}', '${wid}', -1)" ${i === 0 ? 'disabled' : ''}>▲</button>
                    <button type="button" class="enroll-icon-btn" aria-label="志願往後" data-onclick="moveEnrollOption('${gid}', '${wid}', 1)" ${i === options.length - 1 ? 'disabled' : ''}>▼</button>
                    <button type="button" class="enroll-icon-btn" aria-label="移出這一組" data-onclick="removeEnrollOption('${gid}', '${wid}')">✕</button>
                </div>`;
        }).join('');
        const addOptions = free.map(w => `<option value="${escapeHTML(String(w.id))}">${escapeHTML(w.name)}${w.classCode ? `（${escapeHTML(w.classCode)} 班）` : ''}・${escapeHTML(typeof formatCourseSlots === 'function' ? formatCourseSlots(w) : '')}</option>`).join('');
        return `
            <div class="enroll-group">
                <div class="enroll-group-head">
                    <input type="text" class="modern-input enroll-group-name" value="${escapeHTML(g.name)}" maxlength="40" aria-label="志願組名稱" data-onchange="renameEnrollGroup('${gid}', this.value)">
                    <label class="enroll-assume"><input type="checkbox" ${g.optional ? 'checked' : ''} data-onchange="toggleEnrollOptional('${gid}', this.checked)"> 可以不修</label>
                    <button type="button" class="enroll-icon-btn" aria-label="刪除這個志願組" data-onclick="removeEnrollGroup('${gid}')">🗑</button>
                </div>
                ${optionRows || '<div class="master-muted">這組還沒有志願，從下方選一門候選課加進來。</div>'}
                ${free.length && options.length < EnrollSim.MAX_OPTIONS ? `
                    <select class="modern-select enroll-add" aria-label="加入候選課到這一組" data-onchange="addEnrollOption('${gid}', this.value)">
                        <option value="">＋ 加入候選課…</option>${addOptions}
                    </select>` : ''}
            </div>`;
    }).join('');

    body.innerHTML = `
        <div class="compare-summary">
            <span>學期：<b>${escapeHTML(sem)}</b>・已排 <b>${escapeHTML(fixed.length)}</b> 門 <b>${escapeHTML(fixedCredits)}</b> 學分（固定）</span>
            ${enrollExcluded.size ? `<span class="tf-badge tf-badge-warning">假設 ${escapeHTML(enrollExcluded.size)} 門沒選上 <button type="button" class="enroll-link" data-onclick="resetEnrollExclude()">全部還原</button></span>` : ''}
        </div>
        <div class="master-callout info">同一件事想修的班放同一組，由上而下排志願；沒選上時系統會幫你找衝堂最少、志願最高的備案組合。勾「沒選上」可假設某一班落選。</div>
        <div class="enroll-toolbar">
            <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" data-onclick="addEnrollGroup()">＋ 新增志願組</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" data-onclick="autoGroupEnroll()">自動分組（同名課程）</button>
        </div>
        <div class="enroll-groups">${groupHtml || '<div class="master-muted">還沒有志願組。</div>'}</div>
        <div class="master-section-title">推薦組合</div>
        ${renderEnrollResults(sim, plan)}
    `;
}

function renderEnrollResults(sim, plan) {
    if (!plan.groups.length) return '<div class="master-muted">先建立志願組。</div>';
    if (!sim.results.length) {
        const d = sim.diagnosis || { blocked: [], emptyGroups: [], clashPairs: [], relaxations: [] };
        const lines = [];
        d.emptyGroups.forEach(x => lines.push(`「${escapeHTML(x.groupName)}」沒有任何可選的班（全部衝堂、被假設落選或還沒加入）`));
        d.blocked.slice(0, 6).forEach(x => lines.push(`「${escapeHTML(x.name)}」與已排的 ${escapeHTML(x.by.join('、'))} 衝堂`));
        d.clashPairs.forEach(x => lines.push(`「${escapeHTML(x.a)}」與「${escapeHTML(x.b)}」的所有選擇兩兩衝堂`));
        const relax = d.relaxations.length
            ? `<div>若把 ${d.relaxations.map(r => `「${escapeHTML(r.groupName)}」`).join('、')} 改成「可以不修」就能排出組合。</div>`
            : '';
        return `<div class="master-callout warn"><b>找不到不衝堂的組合。</b><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>${relax}</div>`;
    }
    const sem = appData.currentSemester;
    const cards = sim.results.map((r, i) => {
        const warnings = [];
        r.courses.forEach(c => {
            if (!window.PrerequisiteEngine) return;
            const res = PrerequisiteEngine.check(c, sem, appData.semesters, appData.semesterOrder);
            if (res.hasPrerequisite && res.overallStatus !== 'passed') warnings.push(`${c.name}：${res.message}`);
        });
        const rows = r.picks.map(p => p.course
            ? `<li><b>${escapeHTML(p.groupName)}</b>：${escapeHTML(p.course.name)}${p.course.classCode ? `（${escapeHTML(p.course.classCode)} 班）` : ''} <span class="tf-badge ${p.rank === 0 ? 'tf-badge-success' : 'tf-badge-warning'}">第 ${p.rank + 1} 志願</span> <span class="master-muted">${enrollCourseLine(p.course)}</span></li>`
            : `<li><b>${escapeHTML(p.groupName)}</b>：<span class="master-muted">不修</span></li>`).join('');
        return `
            <div class="enroll-combo ${i === 0 ? 'best' : ''}">
                <div class="enroll-combo-head">
                    <span>${i === 0 ? '<span class="tf-badge tf-badge-success">最佳</span>' : `<b>方案 ${i + 1}</b>`}・總學分 <b>${escapeHTML(r.credits)}</b>・志願序積分 ${escapeHTML(r.cost)}（越低越好）</span>
                    <button type="button" class="btn-wishlist-add-mini" data-onclick="applyEnrollCombo(${i})">＋ 排入此組合</button>
                </div>
                <ul class="enroll-combo-list">${rows}</ul>
                ${warnings.length ? `<div class="compare-row-flags">${warnings.slice(0, 4).map(w => `<span class="tf-badge tf-badge-warning" title="${escapeHTML(w)}">先修：${escapeHTML(w)}</span>`).join('')}</div>` : ''}
            </div>`;
    }).join('');
    return `${cards}${sim.exhaustive ? '' : '<div class="master-muted">組合太多，只搜尋了一部分；結果可能不是最佳。可以減少志願組或每組的志願數。</div>'}`;
}

if (typeof window !== 'undefined') {
    Object.assign(window, {
        openEnrollSim, closeEnrollSim, autoGroupEnroll, addEnrollGroup, removeEnrollGroup, renameEnrollGroup,
        toggleEnrollOptional, addEnrollOption, removeEnrollOption, moveEnrollOption, toggleEnrollExclude,
        resetEnrollExclude, applyEnrollCombo, renderEnrollSim
    });
}
