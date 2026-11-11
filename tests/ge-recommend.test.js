'use strict';
// 通識選課推薦：缺口計算、排除規則、排序，以及用真實課程資料的整合測試。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, listScripts } = require('./helpers/load');

const app = loadApp({
    scripts: [...listScripts({ skip: ['js/core/boot.js', 'js/core/sw-register.js', 'js/core/inline-styles.js'] }), 'js/discover/catalog-data.js', 'js/discover/history-data.js']
});
const G = app.ctx.GeRecommend;
const plain = x => JSON.parse(JSON.stringify(x));

let seq = 0;
const ge = (name, baseType, day, periods, extra = {}) => ({ id: `T${++seq}`, code: `X${seq}`, name, credits: 2, baseType, slots: periods.length ? [{ day, periods }] : [], ...extra });

function needsFor(courses, dept = '電機工程學系') {
    app.ctx.__d = { deptName: dept, entryYear: 118, currentSemester: '一上', semesters: { 一上: courses } };
    const result = app.run('calculateGraduation(__d)');
    const limits = app.run('getGeneralEducationLimits(0, 118)');
    const rule = app.run('getDepartmentGraduationRule(__d.deptName, 118, __d)');
    return { result, needs: plain(G.computeNeeds(result, limits, rule)), rule };
}
const taken = (name, type, credits = 2) => ({ name, type, credits, status: '已取得', score: 80, slots: [] });

describe('computeNeeds：通識缺口', () => {
    test('空課表：還缺 3 個領域、領域低標 4 學分、融合低標 1 學分、總共 19 學分', () => {
        const { needs } = needsFor([]);
        assert.equal(needs.neededNewDomains, 3);
        assert.equal(needs.domainShort, 4);
        assert.equal(needs.rongShort, 1);
        assert.equal(needs.remaining, 19);
        assert.equal(needs.domains.length, 5);
    });
    test('修了人文與社科各 2 學分 → 還缺 1 個領域，領域低標已達', () => {
        const { needs } = needsFor([taken('甲', '通識-人文'), taken('乙', '通識-社科')]);
        assert.equal(needs.activeDomains, 2);
        assert.equal(needs.neededNewDomains, 1);
        assert.equal(needs.domainShort, 0);
        assert.equal(needs.remaining, 15);
        assert.equal(needs.domains.find(d => d.key === 'human').expected, 2);
    });
    test('融合通識修過 → 不再缺低標', () => {
        const { needs } = needsFor([taken('融', '融通', 3)]);
        assert.equal(needs.rongShort, 0);
        assert.equal(needs.rongExpected, 3);
    });
    test('歷史系人文最多採計 2 學分：修滿後該領域視為已滿', () => {
        const { needs } = needsFor([taken('甲', '通識-人文')], '歷史學系');
        const human = needs.domains.find(d => d.key === 'human');
        assert.equal(human.cap, 2);
        assert.equal(human.full, true);
    });
});

describe('recommend：排除與排序', () => {
    const base = () => needsFor([]).needs;

    test('只推薦通識課；非通識（專業課）被忽略', () => {
        const pool = [ge('人文課', '通識-人文', 1, ['1']), { id: 'X', code: 'E1', name: '電子學', credits: 3, baseType: '', slots: [] }];
        const r = G.recommend({ needs: base(), pool });
        assert.deepEqual(Array.from(r.candidates, c => c.course.name), ['人文課']);
    });
    test('缺新領域時，尚未修過的領域排在已修過的領域前面', () => {
        const needs = needsFor([taken('甲', '通識-人文')]).needs;
        const pool = [ge('又一門人文', '通識-人文', 1, ['1']), ge('社科課', '通識-社科', 2, ['1'])];
        const r = G.recommend({ needs, pool });
        assert.equal(r.candidates[0].course.name, '社科課');
        assert.match(r.candidates[0].reasons.join(' '), /新領域/);
    });
    test('融合通識未達低標時優先推薦融合通識', () => {
        const needs = needsFor([taken('甲', '通識-人文'), taken('乙', '通識-社科'), taken('丙', '通識-自然')]).needs;
        const pool = [ge('人文課', '通識-人文', 1, ['1']), ge('融合課', '融通', 2, ['1'])];
        const r = G.recommend({ needs, pool });
        assert.equal(r.candidates[0].course.name, '融合課');
    });
    test('已修或已排的同名課不再推薦（含全形括號與空白差異）', () => {
        const pool = [ge('音樂 文化導引（一）', '通識-人文', 1, ['1'])];
        const r = G.recommend({ needs: base(), pool, taken: [{ name: '音樂文化導引(一)', code: 'ZZ' }] });
        assert.equal(r.candidates.length, 0);
    });
    test('已修的同課號也排除', () => {
        const c = ge('甲', '通識-人文', 1, ['1'], { code: 'A92F300' });
        const r = G.recommend({ needs: base(), pool: [c], taken: [{ name: '別的名字', code: 'a92f300' }] });
        assert.equal(r.candidates.length, 0);
    });
    test('本系不承認的通識被排除（比對時忽略「介／界」與標點）', () => {
        const pool = [ge('界面化學的生活應用', '通識-自然', 1, ['1']), ge('其他自然課', '通識-自然', 2, ['1'])];
        const r = G.recommend({ needs: base(), pool, disallowed: ['介面化學的生活應用'] });
        assert.deepEqual(Array.from(r.candidates, c => c.course.name), ['其他自然課']);
    });
    test('領域已滿或本系不採計 → 該領域不推薦', () => {
        const { needs } = needsFor([taken('甲', '通識-人文')], '歷史學系');
        const pool = [ge('人文課', '通識-人文', 1, ['1']), ge('社科課', '通識-社科', 2, ['1'])];
        const r = G.recommend({ needs, pool });
        assert.deepEqual(Array.from(r.candidates, c => c.domainKey), ['social']);
    });
    test('與已排課程衝堂：預設隱藏並計數，勾選後列出並標明衝堂的課', () => {
        const fixed = [{ name: '必修課', slots: [{ day: 1, periods: ['1', '2'] }] }];
        const pool = [ge('衝堂課', '通識-人文', 1, ['2']), ge('不衝堂課', '通識-社科', 3, ['1'])];
        const r = G.recommend({ needs: base(), pool, fixed });
        assert.deepEqual(Array.from(r.candidates, c => c.course.name), ['不衝堂課']);
        assert.equal(r.hiddenConflicts, 1);
        const r2 = G.recommend({ needs: base(), pool, fixed, includeConflicts: true });
        assert.equal(r2.candidates.length, 2);
        assert.deepEqual(plain(r2.candidates.find(c => c.course.name === '衝堂課').conflicts), ['必修課']);
    });
    test('單雙週互補的課不算衝堂', () => {
        const fixed = [{ name: '單週課', frequency: 'odd', slots: [{ day: 1, periods: ['1'] }] }];
        const pool = [ge('雙週通識', '通識-人文', 1, ['1'], { frequency: 'even' })];
        assert.equal(G.recommend({ needs: base(), pool, fixed }).candidates.length, 1);
    });
    test('同課號同時段的重複班別只列一次', () => {
        const a = ge('甲', '通識-人文', 1, ['1'], { code: 'S1' }), b = ge('甲', '通識-人文', 1, ['1'], { code: 'S1', id: 'T-dup' });
        assert.equal(G.recommend({ needs: base(), pool: [a, b] }).candidates.length, 1);
    });
    test('已在候選庫的課標示 inWishlist', () => {
        const c = ge('甲', '通識-人文', 1, ['1']);
        const r = G.recommend({ needs: base(), pool: [c], wishlistIds: [c.id] });
        assert.equal(r.candidates[0].inWishlist, true);
    });
    test('通識全部達標時仍可列出，但標明已達標', () => {
        const done = {
            domains: G.DOMAINS.map(d => ({ ...d, earned: 4, expected: 4, cap: 18, excluded: false, full: false, noDiversity: false })),
            requiredDomains: 3, activeDomains: 5, neededNewDomains: 0, domainShort: 0, rongExpected: 3, rongShort: 0, rongFull: false, remaining: 0, target: 19
        };
        const r = G.recommend({ needs: done, pool: [ge('甲', '通識-人文', 1, ['1'])] });
        assert.equal(r.allDone, true);
        assert.match(r.candidates[0].reasons.join(' '), /已達標/);
    });
    test('limit 限制回傳數量，total 仍為符合總數', () => {
        const pool = Array.from({ length: 10 }, (_, i) => ge('課' + i, '通識-人文', 1 + (i % 5), [String(i % 9 + 1)]));
        const r = G.recommend({ needs: base(), pool, limit: 3 });
        assert.equal(r.candidates.length, 3);
        assert.equal(r.total, 10);
    });
    test('資料來自歷年開課時，推薦結果標示「待確認」', () => {
        const r = G.recommend({ needs: base(), pool: [ge('甲', '通識-人文', 1, ['1'])], uncertain: true });
        assert.equal(r.candidates[0].uncertain, true);
    });
});

describe('用真實課程資料的整合測試', () => {
    function setup(sem) {
        const a = loadApp({
            scripts: [...listScripts({ skip: ['js/core/boot.js', 'js/core/sw-register.js', 'js/core/inline-styles.js'] }), 'js/discover/catalog-data.js', 'js/discover/history-data.js']
        });
        a.run(`appData.deptName = "電機工程學系"; appData.entryYear = 118; appData.degree = "bachelor"; appData.currentSemester = ${JSON.stringify(sem)}; appData.semesterOrder = [${JSON.stringify(sem)}]; appData.semesters = { ${JSON.stringify(sem)}: [] }; appData.wishlist = [];`);
        return a;
    }

    test('本學期為上學期 → 使用本學期開課資料（確定有開）', () => {
        const a = setup('一上');
        const src = a.run('pickGePool("上")');
        assert.equal(src.kind, 'catalog');
        assert.equal(src.uncertain, false);
        assert.ok(src.pool.length > 100);
        assert.ok(src.pool.every(c => a.ctx.GeRecommend.isGeneralEducation(c)));
    });
    test('下學期沒有本學期資料 → 改用歷年開課並標示待確認', () => {
        const a = setup('一下');
        const src = a.run('pickGePool("下")');
        assert.equal(src.kind, 'history');
        assert.equal(src.uncertain, true);
        assert.ok(src.pool.length > 20);
    });
    test('完整流程：推薦出至少 10 門通識，且都不衝堂、不含本系不承認的課', () => {
        const a = setup('一上');
        // 已排一門週一 2、3 節的必修
        a.run('appData.semesters["一上"].push(normalizeCourseData({ name: "微積分（一）", credits: 4, type: "系定必修", status: "修讀中", slots: [{ day: 1, periods: ["2", "3"] }] }))');
        const data = a.run('buildGeRecommendation()');
        assert.ok(data.rec.candidates.length >= 10, `只有 ${data.rec.candidates.length} 門`);
        for (const c of data.rec.candidates) {
            assert.equal(c.conflicts.length, 0);
            const monday23 = (c.course.slots || []).some(s => s.day === 1 && s.periods.some(p => p === '2' || p === '3'));
            assert.equal(monday23, false, `${c.course.name} 與已排課程衝堂卻被推薦`);
        }
        const bad = new Set(plain(a.run('getDepartmentGraduationRule("電機工程學系", 118, appData).disallowedGeneralCourses')).map(n => G.normName(n)));
        assert.deepEqual(plain(data.rec.candidates.filter(c => bad.has(G.normName(c.course.name))).map(c => c.course.name)), []);
        assert.equal(data.needs.neededNewDomains, 3);
    });
    test('排入一門人文課後，人文領域已有學分、推薦會偏向其他領域', () => {
        const a = setup('一上');
        const first = a.run('buildGeRecommendation()').rec.candidates.find(c => c.domainKey === 'human');
        assert.ok(first);
        a.ctx.__c = { name: first.course.name, credits: first.course.credits, type: '通識-人文', status: '修讀中', slots: first.course.slots };
        a.run('appData.semesters["一上"].push(normalizeCourseData(__c))');
        const after = a.run('buildGeRecommendation()');
        assert.equal(after.needs.neededNewDomains, 2);
        assert.notEqual(after.rec.candidates[0].domainKey, 'human');
        assert.ok(!after.rec.candidates.some(c => c.course.name === first.course.name), '已排的課不應再推薦');
    });
});
