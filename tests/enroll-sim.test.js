'use strict';
// 選課志願序模擬：排名引擎（含與暴力列舉對照的隨機測試）、資料驗證、與畫面無關的操作流程。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, listScripts } = require('./helpers/load');

const app = loadApp({ scripts: listScripts({ skip: ['js/core/boot.js', 'js/core/sw-register.js', 'js/core/inline-styles.js'] }) });
const E = app.ctx.EnrollSim;

let seq = 0;
const course = (name, day, periods, extra = {}) => ({ id: ++seq, name, credits: 3, slots: periods.length ? [{ day, periods }] : [], ...extra });
const group = (name, options, extra = {}) => ({ id: name, name, optional: false, options, ...extra });
const plain = x => JSON.parse(JSON.stringify(x));

describe('slotKeys / coursesConflict', () => {
    test('每週課同時佔單週與雙週', () => {
        const keys = Array.from(E.slotKeys(course('A', 1, ['1'])));
        assert.deepEqual(keys.sort(), ['1-1-e', '1-1-o']);
    });
    test('同一節的單週課與雙週課不衝堂', () => {
        const odd = course('A', 1, ['1'], { frequency: 'odd' });
        const even = course('B', 1, ['1'], { frequency: 'even' });
        assert.equal(E.coursesConflict(odd, even), false);
    });
    test('每週課與單週課同一節 → 衝堂', () => {
        assert.equal(E.coursesConflict(course('A', 1, ['1']), course('B', 1, ['1'], { frequency: 'odd' })), true);
    });
    test('不同日或不同節 → 不衝堂；沒有時段的課永遠不衝堂', () => {
        assert.equal(E.coursesConflict(course('A', 1, ['1']), course('B', 2, ['1'])), false);
        assert.equal(E.coursesConflict(course('A', 1, ['1']), course('B', 1, ['2'])), false);
        assert.equal(E.coursesConflict(course('A', 1, ['1']), course('C', 1, [])), false);
    });
});

describe('EnrollSim.enumerate：排名', () => {
    test('沒有任何衝堂 → 全部第一志願，積分 0', () => {
        const a1 = course('微積分A班', 1, ['1']), a2 = course('微積分B班', 2, ['1']);
        const b1 = course('物理A班', 3, ['1']);
        const r = E.enumerate({ groups: [group('微積分', [a1, a2]), group('物理', [b1])] });
        assert.equal(r.results[0].cost, 0);
        assert.deepEqual(Array.from(r.results[0].picks, p => p.course.id), [a1.id, b1.id]);
        assert.equal(r.results[0].credits, 6);
        assert.equal(r.exhaustive, true);
        assert.equal(r.diagnosis, null);
    });
    test('第一志願互相衝堂 → 其中一組退到備案，且選志願較高的那組保留第一志願', () => {
        const a1 = course('A1', 1, ['1']), a2 = course('A2', 1, ['5']);
        const b1 = course('B1', 1, ['1']), b2 = course('B2', 1, ['6']);
        const r = E.enumerate({ groups: [group('A', [a1, a2]), group('B', [b1, b2])] });
        const best = r.results[0];
        assert.equal(best.cost, 1);                       // 一組第一志願、一組第二志願
        assert.equal(r.results.length, 3);                // (A1,B2) (A2,B1) (A2,B2)
        assert.deepEqual(Array.from(r.results, x => x.cost), [1, 1, 2]);
    });
    test('積分相同時學分較多的排前面', () => {
        const a1 = course('A1', 1, ['1'], { credits: 2 }), a2 = course('A2', 2, ['1'], { credits: 3 });
        const r = E.enumerate({ groups: [group('A', [a1, a2])] });
        assert.equal(r.results[0].cost, 0);
        const r2 = E.enumerate({ groups: [group('X', [course('x1', 1, ['1'], { credits: 2 })]), group('Y', [course('y1', 2, ['1'], { credits: 3 })])] });
        assert.equal(r2.results[0].credits, 5);
    });
    test('學分包含已排課程', () => {
        const fixed = [course('已排', 5, ['1'], { credits: 4 })];
        const r = E.enumerate({ fixed, groups: [group('A', [course('A1', 1, ['1'])])] });
        assert.equal(r.results[0].credits, 7);
    });
    test('與已排課程衝堂的選項被剔除', () => {
        const fixed = [course('已排', 1, ['1'])];
        const a1 = course('A1', 1, ['1']), a2 = course('A2', 2, ['1']);
        const r = E.enumerate({ fixed, groups: [group('A', [a1, a2])] });
        assert.equal(r.results.length, 1);
        assert.equal(r.results[0].picks[0].course.id, a2.id);
        assert.equal(r.results[0].picks[0].rank, 1);
    });
    test('「可以不修」的組在無解時被略過，且代價比任何志願都高', () => {
        const a1 = course('A1', 1, ['1']);
        const b1 = course('B1', 1, ['1']);
        const r = E.enumerate({ groups: [group('A', [a1]), group('B', [b1], { optional: true })] });
        assert.equal(r.results.length, 1);
        assert.equal(r.results[0].picks[1].course, null);
        assert.equal(r.results[0].picks[1].rank, 1);       // 略過 = options.length
        assert.deepEqual(Array.from(r.results[0].courses, c => c.id), [a1.id]);
    });
    test('可選的組有可行選項時，仍優先選課而不是不修', () => {
        const r = E.enumerate({ groups: [group('A', [course('A1', 1, ['1'])], { optional: true })] });
        assert.ok(r.results[0].picks[0].course);
        assert.equal(r.results[0].cost, 0);
    });
    test('假設某班沒選上 → 重新排備案', () => {
        const a1 = course('A1', 1, ['1']), a2 = course('A2', 2, ['1']);
        const r = E.enumerate({ groups: [group('A', [a1, a2])], excludeIds: [a1.id] });
        assert.equal(r.results.length, 1);
        assert.equal(r.results[0].picks[0].course.id, a2.id);
        assert.equal(r.results[0].cost, 1);
    });
    test('maxResults 限制回傳數量', () => {
        const opts = [1, 2, 3, 4].map(d => course('A' + d, d, ['1']));
        const r = E.enumerate({ groups: [group('A', opts)], maxResults: 2 });
        assert.equal(r.results.length, 2);
        assert.deepEqual(Array.from(r.results, x => x.cost), [0, 1]);
    });
    test('搜尋節點超過上限 → exhaustive 為 false，但仍回傳已找到的結果', () => {
        const groups = Array.from({ length: 8 }, (_, g) => group('G' + g, Array.from({ length: 6 }, (_, o) => course(`c${g}-${o}`, (g % 5) + 1, [String(o + 1)]))));
        const r = E.enumerate({ groups, nodeLimit: 50 });
        assert.equal(r.exhaustive, false);
    });
    test('沒有志願組 → 一個空組合（只有已排課程）', () => {
        const r = E.enumerate({ fixed: [course('已排', 1, ['1'])], groups: [] });
        assert.equal(r.results.length, 1);
        assert.equal(r.results[0].credits, 3);
    });
});

describe('EnrollSim.enumerate：無解時的診斷', () => {
    test('指出被已排課程擋住的選項', () => {
        const fixed = [course('必修課', 1, ['1'])];
        const a1 = course('A1', 1, ['1']);
        const r = E.enumerate({ fixed, groups: [group('A', [a1])] });
        assert.equal(r.results.length, 0);
        assert.equal(r.diagnosis.blocked[0].name, 'A1');
        assert.deepEqual(plain(r.diagnosis.blocked[0].by), ['必修課']);
        assert.equal(r.diagnosis.emptyGroups[0].groupName, 'A');
    });
    test('指出兩組所有選項兩兩衝堂，以及放棄哪一組就有解', () => {
        const a1 = course('A1', 1, ['1']), b1 = course('B1', 1, ['1']);
        const r = E.enumerate({ groups: [group('A', [a1]), group('B', [b1])] });
        assert.equal(r.results.length, 0);
        assert.deepEqual(plain(r.diagnosis.clashPairs), [{ a: 'A', b: 'B' }]);
        assert.deepEqual(Array.from(r.diagnosis.relaxations, x => x.groupName).sort(), ['A', 'B']);
    });
    test('withDiagnosis:false 不做分析（避免遞迴）', () => {
        const a1 = course('A1', 1, ['1']), b1 = course('B1', 1, ['1']);
        const r = E.enumerate({ groups: [group('A', [a1]), group('B', [b1])], withDiagnosis: false });
        assert.equal(r.diagnosis, null);
    });
});

describe('EnrollSim.enumerate：與暴力列舉對照（隨機）', () => {
    // 簡單的可重現亂數
    function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

    function brute(fixed, groups, excluded) {
        const keysOf = c => E.slotKeys(c);
        const taken = new Set();
        fixed.forEach(c => keysOf(c).forEach(k => taken.add(k)));
        const fixedCredits = fixed.reduce((s, c) => s + c.credits, 0);
        const all = [];
        (function go(i, used, cost, cr) {
            if (i === groups.length) { all.push({ cost, credits: fixedCredits + cr }); return; }
            const g = groups[i];
            g.options.forEach((c, rank) => {
                if (excluded.has(String(c.id))) return;
                const k = keysOf(c);
                if ([...k].some(x => used.has(x))) return;
                go(i + 1, new Set([...used, ...k]), cost + rank, cr + c.credits);
            });
            if (g.optional) go(i + 1, used, cost + g.options.length, cr);
        })(0, taken, 0, 0);
        all.sort((a, b) => a.cost - b.cost || b.credits - a.credits);
        return all;
    }

    test('200 組隨機情境：前幾名的（積分, 學分）與暴力列舉完全相同', () => {
        const rand = rng(20261111);
        for (let t = 0; t < 200; t++) {
            const nGroups = 1 + Math.floor(rand() * 4);
            const mk = (name) => {
                const freqs = ['weekly', 'weekly', 'odd', 'even'];
                const slots = [{ day: 1 + Math.floor(rand() * 3), periods: [String(1 + Math.floor(rand() * 3))] }];
                return { id: ++seq, name, credits: 1 + Math.floor(rand() * 3), slots, frequency: freqs[Math.floor(rand() * 4)] };
            };
            const groups = Array.from({ length: nGroups }, (_, g) => group('G' + g,
                Array.from({ length: 1 + Math.floor(rand() * 4) }, (_, o) => mk(`g${g}o${o}`)), { optional: rand() < 0.3 }));
            const fixed = rand() < 0.5 ? [mk('fixed')] : [];
            const excluded = new Set(rand() < 0.4 ? [String(groups[0].options[0].id)] : []);

            const expected = brute(fixed, groups, excluded);
            const got = E.enumerate({ fixed, groups, maxResults: 5, excludeIds: excluded, withDiagnosis: false });
            const top = expected.slice(0, 5).map(x => [x.cost, x.credits]);
            assert.deepEqual(Array.from(got.results, x => [x.cost, x.credits]), top, `第 ${t} 組不一致`);
            assert.equal(got.exhaustive, true);
        }
    });
});

describe('normalizeEnrollPlans（資料驗證）', () => {
    const norm = raw => plain(app.ctx.normalizeEnrollPlans(raw));

    test('非物件、陣列、null → 空物件', () => {
        assert.deepEqual(norm(null), {});
        assert.deepEqual(norm([1, 2]), {});
        assert.deepEqual(norm('x'), {});
    });
    test('保留合法的志願組', () => {
        const r = norm({ 二上: { groups: [{ id: 'g1', name: '微積分', optional: true, options: ['5', 6, '5'] }] } });
        assert.deepEqual(r, { 二上: { groups: [{ id: 'g1', name: '微積分', optional: true, options: ['5', '6'] }] } });
    });
    test('丟掉不合法的學期名稱，避免當成物件鍵', () => {
        const r = norm({ '__proto__': { groups: [{ options: [] }] }, '<b>': { groups: [{ options: [] }] }, 一上: { groups: [{ options: [] }] } });
        assert.deepEqual(Object.keys(r), ['一上']);
    });
    test('組數與志願數有上限，名稱被截斷，重複的組 id 被改名', () => {
        const groups = Array.from({ length: 20 }, () => ({ id: 'same', name: 'x'.repeat(100), options: Array.from({ length: 20 }, (_, i) => String(i)) }));
        const g = norm({ 一上: { groups } }).一上.groups;
        assert.equal(g.length, 12);
        assert.equal(new Set(g.map(x => x.id)).size, 12);
        assert.equal(g[0].name.length, 40);
        assert.equal(g[0].options.length, 8);
    });
    test('不合法的組 id 與缺少的名稱改用預設', () => {
        const g = norm({ 一上: { groups: [{ id: '<img onerror=x>', options: [] }] } }).一上.groups[0];
        assert.match(g.id, /^[\w-]+$/);
        assert.equal(g.name, '志願組 1');
    });
    test('匯入備份時 enrollPlans 一併驗證；匯出再匯入保持一致', () => {
        const a = loadApp();
        a.alerts = [];
        a.ctx.alert = () => {};
        a.ctx.FileReader = class { readAsText(f) { this.onload({ target: { result: f.text } }); } };
        for (const fn of ['initTable', 'updateAppUI', 'cancelEdit']) a.ctx[fn] = () => {};
        const text = JSON.stringify({
            semesters: { 一上: [] },
            enrollPlans: { 一上: { groups: [{ id: 'g1', name: '甲', options: ['1', '2'] }, { name: 7 }] }, '壞': { groups: [] } }
        });
        a.ctx.__ev = { target: { files: [{ text, size: text.length }], value: 'x' } };
        a.run('importData(__ev)');
        const plans = JSON.parse(a.run('JSON.stringify(appData.enrollPlans)'));
        assert.deepEqual(Object.keys(plans), ['一上']);
        assert.equal(plans.一上.groups.length, 2);
        assert.equal(plans.一上.groups[1].name, '志願組 2');
    });
});

describe('操作流程（不需要畫面）', () => {
    function setup() {
        const a = loadApp({ scripts: listScripts({ skip: ['js/core/boot.js', 'js/core/sw-register.js', 'js/core/inline-styles.js'] }) });
        a.ctx.alert = () => {};
        a.ctx.confirm = () => true;
        for (const fn of ['updateAppUI', 'renderEnrollSim', 'initTable']) a.ctx[fn] = () => {};
        a.run('appData.currentSemester = "二上"; appData.semesterOrder = ["二上"]; appData.semesters = { "二上": [] }; appData.wishlist = []; appData.enrollPlans = {};');
        return a;
    }
    const wish = (a, items) => { a.ctx.__w = items; a.run('appData.wishlist = __w'); };

    test('自動分組：同名課程（含不同課號、全形半形括號、空白差異）放同一組', () => {
        const a = setup();
        wish(a, [
            { id: 1, code: 'A111', name: '微積分', classCode: '1', credits: 3, slots: [] },
            { id: 2, code: 'A222', name: '微積分', classCode: '2', credits: 3, slots: [] },
            { id: 3, code: '', name: '自訂 課程', credits: 2, slots: [] },
            { id: 4, code: '', name: '自訂課程', credits: 2, slots: [] },
            { id: 5, code: 'B222', name: '物理', credits: 3, slots: [] }
        ]);
        a.run('autoGroupEnroll(true)');
        const groups = JSON.parse(a.run('JSON.stringify(appData.enrollPlans["二上"].groups)'));
        assert.equal(groups.length, 3);
        assert.deepEqual(groups.map(g => g.options), [['1', '2'], ['3', '4'], ['5']]);
    });
    test('同一門候選課只能在一個志願組；移動志願順序；移除', () => {
        const a = setup();
        wish(a, [{ id: 1, name: 'A', credits: 3, slots: [] }, { id: 2, name: 'B', credits: 3, slots: [] }]);
        a.run('addEnrollGroup(); addEnrollGroup();');
        a.run('addEnrollOption("g1", "1"); addEnrollOption("g1", "2"); addEnrollOption("g2", "1")');
        const opts = () => JSON.parse(a.run('JSON.stringify(appData.enrollPlans["二上"].groups.map(g => g.options))'));
        assert.deepEqual(opts(), [['2'], ['1']]);
        a.run('addEnrollOption("g1", "1")');
        a.run('moveEnrollOption("g1", "1", -1)');
        assert.deepEqual(opts(), [['1', '2'], []]);
        a.run('removeEnrollOption("g1", "1")');
        assert.deepEqual(opts(), [['2'], []]);
    });
    test('每組志願數與組數有上限', () => {
        const a = setup();
        wish(a, Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: 'C' + i, credits: 1, slots: [] })));
        for (let i = 0; i < 15; i++) a.run('addEnrollGroup()');
        assert.equal(a.run('appData.enrollPlans["二上"].groups.length'), 12);
        for (let i = 1; i <= 10; i++) a.run(`addEnrollOption("g1", "${i}")`);
        assert.equal(a.run('appData.enrollPlans["二上"].groups[0].options.length'), 8);
    });
    test('候選課被刪除後，志願組會自動清掉對應的項目', () => {
        const a = setup();
        wish(a, [{ id: 1, name: 'A', credits: 3, slots: [] }, { id: 2, name: 'B', credits: 3, slots: [] }]);
        a.run('addEnrollGroup(); addEnrollOption("g1", "1"); addEnrollOption("g1", "2");');
        a.run('appData.wishlist = appData.wishlist.filter(w => w.id !== 1); pruneEnrollPlan();');
        assert.deepEqual(JSON.parse(a.run('JSON.stringify(appData.enrollPlans["二上"].groups[0].options)')), ['2']);
    });
    test('排入組合：課程進入本學期、從候選庫移除、其餘候選保留', () => {
        const a = setup();
        wish(a, [
            { id: 1, code: 'A1', name: '微積分', classCode: '1', credits: 3, type: '系定必修', slots: [{ day: 1, periods: ['1'] }] },
            { id: 2, code: 'A1', name: '微積分', classCode: '2', credits: 3, type: '系定必修', slots: [{ day: 2, periods: ['1'] }] },
            { id: 3, code: 'B1', name: '物理', credits: 3, type: '系定必修', slots: [{ day: 1, periods: ['1'] }] },
            { id: 4, code: 'B1', name: '物理', classCode: '2', credits: 3, type: '系定必修', slots: [{ day: 3, periods: ['1'] }] }
        ]);
        a.run('autoGroupEnroll(true)');
        // 手動模擬 renderEnrollSim 的計算，取得第一名組合後套用
        const sim = a.run(`EnrollSim.enumerate({ fixed: [], groups: appData.enrollPlans["二上"].groups.map(g => ({ ...g, options: g.options.map(id => appData.wishlist.find(w => String(w.id) === id)) })), maxResults: 3 })`);
        assert.equal(sim.results[0].cost, 1);   // 兩組第一志願同一節 → 其中一組退到第二志願
        a.ctx.__r = sim.results;
        a.run('enrollLastResults = __r');
        a.run('applyEnrollCombo(0)');
        const scheduled = JSON.parse(a.run('JSON.stringify(appData.semesters["二上"].map(c => c.name))'));
        assert.deepEqual(scheduled.sort(), ['微積分', '物理']);
        assert.equal(a.run('appData.wishlist.length'), 2);
        assert.ok(JSON.parse(a.run('JSON.stringify(appData.semesters["二上"].every(c => c.status === "修讀中" && c.isTentative === false))')));
        // 志願組中已排入的課被清掉
        const left = JSON.parse(a.run('JSON.stringify(appData.enrollPlans["二上"].groups.map(g => g.options))'));
        assert.equal(left.flat().length, 2);
    });
    test('取消確認 → 不排入', () => {
        const a = setup();
        wish(a, [{ id: 1, name: 'A', credits: 3, slots: [{ day: 1, periods: ['1'] }] }]);
        a.run('autoGroupEnroll(true)');
        const sim = a.run(`EnrollSim.enumerate({ groups: appData.enrollPlans["二上"].groups.map(g => ({ ...g, options: g.options.map(id => appData.wishlist.find(w => String(w.id) === id)) })) })`);
        a.ctx.__r = sim.results;
        a.run('enrollLastResults = __r');
        a.ctx.confirm = () => false;
        a.run('applyEnrollCombo(0)');
        assert.equal(a.run('appData.semesters["二上"].length'), 0);
        assert.equal(a.run('appData.wishlist.length'), 1);
    });
});
