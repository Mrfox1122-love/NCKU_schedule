'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

const app = loadApp();
const ORDER = ['一上', '一下'];

// 以測試專用規則取代全域規則：微積分（二）需先修微積分（一）60 分
app.ctx.PREREQUISITE_RULES = [{
    targetCode: 'EE1002',
    targetName: '微積分 (二)',
    type: 'completed_before',
    required: [{ code: 'EE1001', name: '微積分 (一)', requirement: 'passed', minScore: 60 }]
}, {
    targetCode: 'EE3001',
    targetName: '某選修',
    type: 'completed_before',
    required: [{ code: 'EE2001', name: '電路學', requirement: 'completed' }]
}];

const check = (course, semesters, target = '一下') => {
    app.ctx.__c = course;
    app.ctx.__s = semesters;
    app.ctx.__o = ORDER;
    app.ctx.__t = target;
    return app.run('PrerequisiteEngine.check(__c, __t, __s, __o)');
};
const calc2 = { code: 'EE1002', name: '微積分 (二)' };
const calc1 = (extra = {}) => ({ code: 'EE1001', name: '微積分 (一)', status: '已取得', score: 82, ...extra });

describe('PrerequisiteEngine.check', () => {
    test('無規則的課程 → none', () => {
        const r = check({ code: 'ZZ0000', name: '沒有先修' }, { 一上: [], 一下: [] });
        assert.equal(r.overallStatus, 'none');
        assert.equal(r.hasPrerequisite, false);
    });
    test('先修已通過且分數達標 → passed', () => {
        const r = check(calc2, { 一上: [calc1()], 一下: [] });
        assert.equal(r.overallStatus, 'passed');
        assert.equal(r.level, 'success');
    });
    test('分數剛好等於門檻 → passed', () => {
        assert.equal(check(calc2, { 一上: [calc1({ score: 60 })], 一下: [] }).overallStatus, 'passed');
    });
    test('分數低於門檻 → blocked', () => {
        const r = check(calc2, { 一上: [calc1({ score: 59 })], 一下: [] });
        assert.equal(r.overallStatus, 'blocked');
        assert.equal(r.details[0].status, 'failed');
    });
    test('完全沒排先修 → blocked / missing', () => {
        const r = check(calc2, { 一上: [], 一下: [] });
        assert.equal(r.overallStatus, 'blocked');
        assert.equal(r.details[0].status, 'missing');
    });
    test('先修還在修讀中 → planned（警告）', () => {
        const r = check(calc2, { 一上: [calc1({ status: '修讀中', score: null })], 一下: [] });
        assert.equal(r.overallStatus, 'planned');
        assert.equal(r.level, 'warning');
    });
    test('先修與本課同一學期 → blocked / same_term', () => {
        const r = check(calc2, { 一上: [], 一下: [calc1()] });
        assert.equal(r.overallStatus, 'blocked');
        assert.equal(r.details[0].status, 'same_term');
    });
    test('全形括號與空白不影響名稱比對', () => {
        const r = check(calc2, { 一上: [{ name: '微積分（一）', status: '已取得', score: 70 }], 一下: [] });
        assert.equal(r.overallStatus, 'passed');
    });
    test('「修過即可」的規則不看分數', () => {
        const r = check({ code: 'EE3001', name: '某選修' },
            { 一上: [{ code: 'EE2001', name: '電路學', status: '已取得', score: 10 }], 一下: [] });
        assert.equal(r.overallStatus, 'passed');
    });
    test('null 課程不丟例外', () => {
        assert.equal(check(null, {}).overallStatus, 'unknown');
    });
});

describe('PrerequisiteEngine 工具', () => {
    test('normalizeName 去空白、統一括號、轉小寫', () => {
        assert.equal(app.run('PrerequisiteEngine.normalizeName(" 微積分 （一） ABC ")'), '微積分(一)abc');
    });
    test('isCourseMatch：代碼優先，其次名稱', () => {
        assert.equal(app.run('PrerequisiteEngine.isCourseMatch({code:"ee1001",name:"x"},"EE1001","y")'), true);
        assert.equal(app.run('PrerequisiteEngine.isCourseMatch({code:"A",name:"線性代數"},"B","線性代數")'), true);
        assert.equal(app.run('PrerequisiteEngine.isCourseMatch({code:"A",name:"國文"},"B","英文")'), false);
    });
    test('內建 runTests() 全數通過', () => {
        const results = app.run('PrerequisiteEngine.runTests()');
        assert.ok(results.length >= 10);
        const failed = Array.from(results).filter(t => !t.passed).map(t => t.testName);
        assert.deepEqual(failed, []);
    });
});

describe('buildPrerequisiteRulesFromCatalog', () => {
    const build = cat => { app.ctx.__cat = cat; return app.run('buildPrerequisiteRulesFromCatalog(__cat)'); };

    test('沒有先修的課不產生規則', () => {
        assert.equal(build([{ id: 'a', code: 'A1', name: 'A', prerequisites: [] }]).length, 0);
    });
    test('同代碼且條件相同的班別共用一條規則', () => {
        const pre = [{ name: '微積分(一)', requirement: 'passed', minScore: 60 }];
        const rules = build([
            { id: 'a-1', code: 'A1', name: 'A', prerequisites: pre },
            { id: 'a-2', code: 'A1', name: 'A', prerequisites: pre },
            { id: 'b-1', code: 'B1', name: 'B', prerequisites: [{ name: 'X', requirement: 'completed' }] }
        ]);
        assert.equal(rules.length, 2);
        const a = rules.find(r => r.targetCode === 'A1');
        assert.deepEqual(Array.from(a.catalogIds), ['a-1', 'a-2']);
        assert.equal(a.required[0].minScore, 60);
    });
});
