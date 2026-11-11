'use strict';
// 先修預警可手動關閉：名稱相近造成誤判時，可以忽略單一課程，或整個關閉排程檢查裡的先修順序。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

const plain = x => JSON.parse(JSON.stringify(x));

function freshApp() {
    const app = loadApp();
    app.ctx.alert = () => {};
    // 畫面更新換成「只重畫排程檢查面板」，其餘不需要
    app.ctx.updateAppUI = () => app.ctx.renderScheduleCheck();
    app.panel = { innerHTML: '' };
    const realGet = app.ctx.document.getElementById;
    app.ctx.document.getElementById = id => (id === 'scheduleCheckPanel' ? app.panel : realGet(id));
    // 測試專用規則：微積分（二）需先修微積分（一）60 分
    app.ctx.PREREQUISITE_RULES = [{
        targetCode: 'EE1002', targetName: '微積分（二）', type: 'completed_before',
        required: [{ code: 'EE1001', name: '微積分（一）', requirement: 'passed', minScore: 60 }]
    }];
    app.run('appData.semesterOrder = ["一上", "一下"]; appData.semesters = { "一上": [], "一下": [] }; appData.ignoredPrereqs = []; appData.hidePrereqCheck = false;');
    return app;
}
const addCourse = (app, sem, c) => {
    app.ctx.__c = c;
    app.run(`appData.semesters[${JSON.stringify(sem)}].push(normalizeCourseData(__c))`);
};
// 「微積分（二）」排在一下，卻沒有排任何先修 → 先修順序被擋下
const blockedCalc2 = { code: 'EE1002', name: '微積分（二）', credits: 3, type: '系定必修', status: '修讀中' };
const issues = app => plain(app.run('collectScheduleIssues(appData)'));

describe('課程識別鍵', () => {
    const key = (app, c) => { app.ctx.__c = c; return app.run('PrerequisiteEngine.courseKey(__c)'); };
    test('有課號用課號（不分大小寫、去空白）', () => {
        const app = freshApp();
        assert.equal(key(app, { code: ' ee1002 ', name: 'x' }), 'code:EE1002');
    });
    test('沒有課號用標準化名稱（忽略空白、全形括號、大小寫）', () => {
        const app = freshApp();
        assert.equal(key(app, { name: ' 微積分（二） ' }), 'name:微積分(二)');
        assert.equal(key(app, null), '');
    });
});

describe('PrerequisiteEngine.check 與忽略清單', () => {
    const check = (app, c) => { app.ctx.__c = c; return plain(app.run('PrerequisiteEngine.check(__c, "一下", appData.semesters, appData.semesterOrder)')); };

    test('沒忽略時：缺先修 → blocked', () => {
        const app = freshApp();
        assert.equal(check(app, blockedCalc2).overallStatus, 'blocked');
    });
    test('忽略後：回報沒有先修限制，並標記 ignored', () => {
        const app = freshApp();
        app.run('ignorePrereqCourse("code:EE1002", "微積分（二）")');
        const r = check(app, blockedCalc2);
        assert.equal(r.overallStatus, 'none');
        assert.equal(r.hasPrerequisite, false);
        assert.equal(r.ignored, true);
    });
    test('只影響被忽略的那一門，其他課不受影響', () => {
        const app = freshApp();
        app.ctx.PREREQUISITE_RULES.push({ targetCode: 'EE2002', targetName: '電子學（二）', type: 'completed_before', required: [{ code: 'EE2001', name: '電子學（一）', requirement: 'passed', minScore: 60 }] });
        app.run('ignorePrereqCourse("code:EE1002", "微積分（二）")');
        assert.equal(check(app, { code: 'EE2002', name: '電子學（二）' }).overallStatus, 'blocked');
    });
    test('沒有課號的課用名稱忽略；名稱相近但不同的課不被誤傷', () => {
        const app = freshApp();
        app.run('ignorePrereqCourse("name:工程數學(二)", "工程數學（二）")');
        const ignored = c => { app.ctx.__c = c; return app.run('PrerequisiteEngine.isIgnored(__c)'); };
        assert.equal(ignored({ name: '工程數學（二）' }), true);
        assert.equal(ignored({ name: ' 工程數學 (二) ' }), true);
        assert.equal(ignored({ name: '工程數學（三）' }), false);
        assert.equal(ignored({ name: '工程數學（一）' }), false);
        // 有課號的課不會因為名稱相同而被忽略（兩邊的鍵不同）
        assert.equal(ignored({ code: 'ME2001', name: '工程數學（二）' }), false);
    });
});

describe('排程檢查（collectScheduleIssues）', () => {
    test('先修順序的問題附上可忽略用的 key', () => {
        const app = freshApp();
        addCourse(app, '一下', blockedCalc2);
        const list = issues(app).filter(i => i.kind === '先修順序');
        assert.equal(list.length, 1);
        assert.equal(list[0].key, 'code:EE1002');
    });
    test('忽略後這項不再出現；還原後回來', () => {
        const app = freshApp();
        addCourse(app, '一下', blockedCalc2);
        app.run('ignorePrereqCourse("code:EE1002", "微積分（二）")');
        assert.equal(issues(app).filter(i => i.kind === '先修順序').length, 0);
        app.ctx.__b = { dataset: { key: 'code:EE1002' } };
        app.run('restorePrereqFromButton(__b)');
        assert.equal(issues(app).filter(i => i.kind === '先修順序').length, 1);
    });
    test('整個關閉先修順序檢查：不報先修，但開課學期檢查照舊', () => {
        const app = freshApp();
        addCourse(app, '一下', blockedCalc2);
        app.run('setHidePrereqCheck(true)');
        assert.equal(app.run('appData.hidePrereqCheck'), true);
        assert.equal(issues(app).filter(i => i.kind === '先修順序').length, 0);
        app.run('setHidePrereqCheck(false)');
        assert.equal(issues(app).filter(i => i.kind === '先修順序').length, 1);
    });
    test('已取得的課程本來就不檢查', () => {
        const app = freshApp();
        addCourse(app, '一下', { ...blockedCalc2, status: '已取得', score: 80 });
        assert.equal(issues(app).length, 0);
    });
});

describe('排程檢查面板', () => {
    test('先修順序的項目有「這是誤判」按鈕，且資料屬性經過跳脫', () => {
        const app = freshApp();
        addCourse(app, '一下', { ...blockedCalc2, name: '微積分（二）"><img src=x>' });
        app.ctx.PREREQUISITE_RULES = [{ targetCode: 'EE1002', targetName: 'x', type: 'completed_before', required: [{ code: 'EE1001', name: 'y', requirement: 'passed', minScore: 60 }] }];
        app.run('renderScheduleCheck()');
        const html = app.panel.innerHTML;
        assert.match(html, /data-onclick="ignorePrereqFromButton\(this\)"/);
        assert.match(html, /data-key="code:EE1002"/);
        assert.doesNotMatch(html, /<img src=x>/);
    });
    test('忽略後面板出現「已忽略」清單與還原按鈕', () => {
        const app = freshApp();
        addCourse(app, '一下', blockedCalc2);
        app.run('ignorePrereqCourse("code:EE1002", "微積分（二）")');
        const html = app.panel.innerHTML;
        assert.match(html, /已忽略先修檢查的課程（1）/);
        assert.match(html, /restorePrereqFromButton\(this\)/);
        assert.doesNotMatch(html, /ignorePrereqFromButton/);
    });
    test('總開關的勾選狀態反映 hidePrereqCheck', () => {
        const app = freshApp();
        app.run('renderScheduleCheck()');
        assert.doesNotMatch(app.panel.innerHTML, /type="checkbox" checked data-onchange="setHidePrereqCheck/);
        app.run('setHidePrereqCheck(true)');
        assert.match(app.panel.innerHTML, /type="checkbox" checked data-onchange="setHidePrereqCheck/);
    });
});

describe('資料驗證與匯入', () => {
    test('normalizeIgnoredPrereqs：去重、過濾格式錯誤、截斷、最多 100 筆', () => {
        const app = freshApp();
        app.ctx.__raw = [
            { key: 'code:A1', name: '甲' }, { key: 'code:A1', name: '重複' },
            { key: 'bad', name: 'x' }, { key: 5 }, null, 'x',
            { key: 'name:' + 'x'.repeat(200), name: 'n'.repeat(200) },
            ...Array.from({ length: 150 }, (_, i) => ({ key: `code:C${i}`, name: 'c' }))
        ];
        const r = plain(app.run('normalizeIgnoredPrereqs(__raw)'));
        assert.equal(r.length, 100);
        assert.deepEqual(r[0], { key: 'code:A1', name: '甲' });
        assert.ok(r.every(x => x.key.length <= 80 && x.name.length <= 60));
        assert.deepEqual(plain(app.run('normalizeIgnoredPrereqs("x")')), []);
    });
    test('匯入備份時一併驗證；匯出再匯入保持一致', () => {
        const app = freshApp();
        app.ctx.FileReader = class { readAsText(f) { this.onload({ target: { result: f.text } }); } };
        for (const fn of ['initTable', 'cancelEdit']) app.ctx[fn] = () => {};
        const text = JSON.stringify({ semesters: { 一上: [] }, hidePrereqCheck: true, ignoredPrereqs: [{ key: 'code:EE1002', name: '微積分（二）' }, { key: '壞的', name: 'x' }] });
        app.ctx.__ev = { target: { files: [{ text, size: text.length }], value: 'x' } };
        app.run('importData(__ev)');
        assert.equal(app.run('appData.hidePrereqCheck'), true);
        assert.deepEqual(plain(app.run('appData.ignoredPrereqs')), [{ key: 'code:EE1002', name: '微積分（二）' }]);
    });
    test('忽略清單與總開關會存進 localStorage', () => {
        const app = freshApp();
        app.run('ignorePrereqCourse("code:EE1002", "微積分（二）"); setHidePrereqCheck(true);');
        const saved = JSON.parse(app.ctx.localStorage.getItem(app.run('STORAGE_KEY')));
        assert.deepEqual(saved.ignoredPrereqs, [{ key: 'code:EE1002', name: '微積分（二）' }]);
        assert.equal(saved.hidePrereqCheck, true);
    });
});
