'use strict';
// 轉系／雙主修試算與「套用轉系／復原」：會改動使用者的學系設定與每門課的類別。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

function freshApp() {
    const app = loadApp();
    // 畫面更新在 Node 內沒有 DOM，換成空函式；資料運算仍是真的
    for (const fn of ['updateAppUI', 'renderSemesterSelect', 'renderWhatIf', 'initTable']) app.ctx[fn] = () => {};
    app.ctx.confirm = () => true;
    return app;
}

/** 讓 applyTransfer() 讀得到「目標學系」與「入學學年」兩個輸入框 */
function fakeInputs(app, dept, year) {
    const inputs = { whatIfDeptInput: { value: dept }, whatIfEntryYear: { value: String(year) } };
    app.ctx.document.getElementById = id => inputs[id] || null;
    app.ctx.document.querySelectorAll = () => [];
}

let seq = 0;
const c = (name, type, extra = {}) => ({ id: ++seq, name, credits: 3, type, status: '已取得', score: 80, slots: [], ...extra });

function setCourses(app, sems) {
    app.ctx.__s = sems;
    app.run('appData.semesters = Object.fromEntries(Object.entries(__s).map(([k, v]) => [k, v.map(normalizeCourseData)])); appData.semesterOrder = Object.keys(__s)');
}
const types = app => JSON.parse(app.run('JSON.stringify(Object.values(appData.semesters).flat().map(c => [c.name, c.type]))'));

describe('isSameDepartment', () => {
    const same = (a, b) => { const app = freshApp(); app.ctx.__a = a; app.ctx.__b = b; return app.run('isSameDepartment(__a, __b)'); };
    test('全名、簡稱、附英文縮寫的名稱視為同一系', () => {
        assert.equal(same('電機工程學系', '電機系'), true);
        assert.equal(same('電機工程學系', '電機工程學系 EE'), true);
    });
    test('不同系、空值', () => {
        assert.equal(same('電機工程學系', '資訊工程學系'), false);
        assert.equal(same('', '電機系'), false);
        assert.equal(same(null, null), false);
    });
});

describe('reclassifyCourseForDept（以目標學系重新歸類）', () => {
    const app = freshApp();
    const re = (course, target, data) => {
        app.ctx.__c = course; app.ctx.__t = target; app.ctx.__d = data || { deptName: '電機工程學系', crossMajor: { type: 'none', name: '' } };
        return JSON.parse(app.run('JSON.stringify(reclassifyCourseForDept(__c, __t, __d))'));
    };

    test('通識、國文、英文、體育不受學系影響', () => {
        for (const type of ['通識-人文', '國文', '英文', '體育', '服務學習']) {
            assert.deepEqual(re({ type }, '資訊工程學系'), { type, basis: 'keep' });
        }
    });
    test('他系開的課 → 外系選修（依課程資料）', () => {
        assert.deepEqual(re({ type: '系定必修', dept: '電機系 EE' }, '資訊工程學系'), { type: '選修-外系', basis: 'catalog' });
    });
    test('目標學系開的必修／必選／選修 → 對應類別', () => {
        app.ctx.findCatalogCourse = id => ({ A: { courseType: '必修' }, B: { courseType: '必選' }, C: { courseType: '選修' } })[id];
        for (const [id, expected] of [['A', '系定必修'], ['B', '選修-必選'], ['C', '選修-本系']]) {
            const r = re({ type: '選修-外系', dept: '資訊工程學系', catalogId: id }, '資訊工程學系');
            assert.equal(r.type, expected);
            assert.equal(r.basis, 'catalog');
        }
        delete app.ctx.findCatalogCourse;
    });
    test('手動新增的課（沒有開課系所）：目前學系就是目標 → 維持原樣', () => {
        assert.deepEqual(re({ type: '系定必修' }, '電機工程學系'), { type: '系定必修', basis: 'keep' });
    });
    test('手動新增的課：其他學系 → 推測為外系選修', () => {
        assert.deepEqual(re({ type: '系定必修' }, '資訊工程學系'), { type: '選修-外系', basis: 'guess' });
    });
    test('跨領域課程且目標正是跨領域所屬學系 → 轉為本系', () => {
        const data = { deptName: '電機工程學系', crossMajor: { type: '雙主修', name: '資訊工程學系' } };
        assert.equal(re({ type: '跨領域-必修' }, '資訊工程學系', data).type, '系定必修');
        assert.equal(re({ type: '跨領域-選修' }, '資訊工程學系', data).type, '選修-本系');
    });
});

describe('buildWhatIfData', () => {
    test('不改動原本的資料，並列出類別變化', () => {
        const app = freshApp();
        setCourses(app, { 一上: [c('微積分', '系定必修'), c('英文', '英文')] });
        const before = JSON.stringify(types(app));
        const result = JSON.parse(app.run('JSON.stringify(buildWhatIfData("資訊工程學系").changes.map(x => [x.name, x.from, x.to, x.basis]))'));
        assert.deepEqual(result, [['微積分', '系定必修', '選修-外系', 'guess']]);
        assert.equal(JSON.stringify(types(app)), before, 'appData 不應被修改');
    });
    test('試算用的資料改成目標學系且清掉跨領域設定', () => {
        const app = freshApp();
        setCourses(app, { 一上: [c('微積分', '系定必修')] });
        assert.equal(app.run('buildWhatIfData("資訊工程學系").data.deptName'), '資訊工程學系');
        assert.equal(app.run('buildWhatIfData("資訊工程學系").data.crossMajor.type'), 'none');
    });
    test('用試算資料算畢業檢核：換系後原本的必修變外系選修', () => {
        const app = freshApp();
        setCourses(app, { 一上: [c('微積分', '系定必修'), c('普物', '系定必修')] });
        app.ctx.__t = '資訊工程學系';
        const now = app.run('calculateGraduation(appData)');
        const after = app.run('calculateGraduation(buildWhatIfData(__t).data)');
        assert.equal(now.required.earned, 6);
        assert.equal(after.required.earned, 0);
        assert.equal(after.elective.outElective.raw, 6);
    });
});

describe('getWhatIfDepartments', () => {
    test('只列正式全名、不重複、有排序，且包含電機與資工', () => {
        const app = freshApp();
        const list = Array.from(app.run('getWhatIfDepartments()'));
        assert.ok(list.length > 40);
        assert.equal(new Set(list).size, list.length);
        assert.ok(list.includes('電機工程學系') && list.includes('資訊工程學系'));
        assert.ok(!list.includes('電機系'), '簡稱不應出現');
    });
});

describe('套用轉系與復原', () => {
    function setup() {
        const app = freshApp();
        setCourses(app, {
            一上: [c('微積分', '系定必修'), c('英文', '英文'), c('電機概論', '系定必修', { dept: '電機系 EE' })],
            一下: [c('線代', '選修-本系')]
        });
        app.run('appData.deptName = "電機工程學系"; appData.entryYear = 118; appData.wishlist = []');
        return app;
    }

    test('套用：學系、學年與學分目標改成新系，並留下備份', () => {
        const app = setup();
        fakeInputs(app, '資訊工程學系', 118);
        app.run('applyTransfer()');
        assert.equal(app.run('appData.deptName'), '資訊工程學系');
        assert.equal(app.run('appData.targetCredits'), 130);     // 資工系畢業學分
        assert.equal(app.run('appData.targetRequired'), 60);
        assert.equal(app.run('appData.transferBackup.deptName'), '電機工程學系');
        assert.equal(app.run('appData.transferBackup.toDept'), '資訊工程學系');
    });
    test('套用：他系課程轉為外系選修，通識英文不變', () => {
        const app = setup();
        fakeInputs(app, '資訊工程學系', 118);
        app.run('applyTransfer()');
        const t = Object.fromEntries(types(app));
        assert.equal(t['電機概論'], '選修-外系');
        assert.equal(t['微積分'], '選修-外系');
        assert.equal(t['英文'], '英文');
    });
    test('復原：學系、學年與每門課的類別完全還原，備份清除', () => {
        const app = setup();
        const beforeTypes = JSON.stringify(types(app));
        const beforeTarget = app.run('appData.targetCredits');
        fakeInputs(app, '資訊工程學系', 118);
        app.run('applyTransfer()');
        assert.notEqual(JSON.stringify(types(app)), beforeTypes);
        app.run('undoTransfer()');
        assert.equal(app.run('appData.deptName'), '電機工程學系');
        assert.equal(app.run('appData.entryYear'), 118);
        assert.equal(app.run('appData.targetCredits'), beforeTarget);
        assert.equal(JSON.stringify(types(app)), beforeTypes);
        assert.equal(app.run('appData.transferBackup'), null);
    });
    test('轉系後新增的課程在復原時保留', () => {
        const app = setup();
        fakeInputs(app, '資訊工程學系', 118);
        app.run('applyTransfer()');
        app.run('appData.semesters["一上"].push(normalizeCourseData({ id: 99999, name: "轉系後新增", type: "系定必修" }))');
        app.run('undoTransfer()');
        assert.ok(types(app).some(([n, t]) => n === '轉系後新增' && t === '系定必修'));
    });
    test('勾選「可抵免」的課在套用後算作新系的必修', () => {
        const app = setup();
        const id = app.run('appData.semesters["一上"][0].id');
        fakeInputs(app, '資訊工程學系', 118);
        app.ctx.document.querySelectorAll = () => [{ value: String(id) }];
        app.run('applyTransfer()');
        assert.equal(Object.fromEntries(types(app))['微積分'], '系定必修');
    });
    test('取消確認視窗 → 完全不改動', () => {
        const app = setup();
        fakeInputs(app, '資訊工程學系', 118);
        app.ctx.confirm = () => false;
        const before = app.run('JSON.stringify(appData)');
        app.run('applyTransfer()');
        assert.equal(app.run('JSON.stringify(appData)'), before);
    });
    test('目標學系不存在 → 不改動', () => {
        const app = setup();
        fakeInputs(app, '不存在的學系', 118);
        const before = app.run('JSON.stringify(appData)');
        app.run('applyTransfer()');
        assert.equal(app.run('JSON.stringify(appData)'), before);
    });
    test('沒有備份時復原什麼都不做', () => {
        const app = setup();
        const before = app.run('JSON.stringify(appData)');
        app.run('undoTransfer()');
        assert.equal(app.run('JSON.stringify(appData)'), before);
    });
});
