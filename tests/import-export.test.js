'use strict';
// 匯入／匯出備份與資料持久化：這是會直接改動使用者資料的流程，出錯代價最高。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, makeStorage, ROOT } = require('./helpers/load');

/** 每個測試各自建立乾淨的環境；FileReader 以同步的假物件取代，alert 會被記錄下來 */
function freshApp(storage) {
    const app = loadApp({ storage });
    app.alerts = [];
    app.ctx.alert = msg => app.alerts.push(String(msg));
    app.ctx.FileReader = class {
        readAsText(file) { this.onload({ target: { result: file.text } }); }
    };
    // 畫面更新與編輯器在 Node 內沒有 DOM，換成空函式（資料處理仍是真的）
    for (const fn of ['initTable', 'updateAppUI', 'cancelEdit', 'renderSemesterSelect']) app.ctx[fn] = () => {};
    return app;
}

/** 模擬使用者在 <input type=file> 選了一個檔案 */
function importText(app, text, size) {
    const input = { files: [{ text, size: size ?? Buffer.byteLength(text) }], value: 'x' };
    app.ctx.__ev = { target: input };
    app.run('importData(__ev)');
    return input;
}

const course = (name, extra = {}) => ({ id: 1, name, credits: 3, type: '系定必修', status: '已取得', score: 80, slots: [{ day: 1, periods: ['1', '2'] }], ...extra });
const backup = (over = {}) => JSON.stringify({
    deptName: '電機工程學系', entryYear: 118, currentSemester: '一上',
    semesterOrder: ['一上', '一下'], semesters: { 一上: [course('微積分（一）')], 一下: [] }, ...over
});

describe('匯入：成功的情況', () => {
    test('合法備份會載入並寫入 localStorage', () => {
        const storage = makeStorage();
        const app = freshApp(storage);
        const input = importText(app, backup());
        assert.equal(app.run('appData.semesters["一上"][0].name'), '微積分（一）');
        assert.equal(app.run('appData.deptName'), '電機工程學系');
        assert.ok(app.alerts.some(a => a.includes('成功載入')), app.alerts.join('|'));
        assert.equal(input.value, '', '匯入後要清空 input，同一個檔案才能再選一次');
        const saved = JSON.parse(storage.getItem(app.run('STORAGE_KEY')));
        assert.equal(saved.semesters['一上'][0].name, '微積分（一）');
    });
    test('開頭帶 BOM 的檔案也能讀', () => {
        const app = freshApp();
        importText(app, '﻿' + backup());
        assert.equal(app.run('appData.semesters["一上"].length'), 1);
    });
    test('缺少的欄位補上預設值', () => {
        const app = freshApp();
        importText(app, JSON.stringify({ semesters: { 一上: [] } }));
        assert.equal(app.run('appData.deptName'), '電機工程學系');
        assert.equal(app.run('appData.entryYear'), 118);
        assert.equal(app.run('appData.targetCredits'), 138);
        assert.deepEqual(Array.from(app.run('appData.wishlist')), []);
        assert.equal(app.run('appData.currentSemester'), '一上');
    });
    test('匯出的內容再匯入，課程資料維持不變（往返一致）', () => {
        const a = freshApp();
        importText(a, backup({ semesters: { 一上: [course('A', { id: 5 }), course('B', { id: 6, score: 91 })], 一下: [course('C', { id: 7, status: '修讀中', score: null })] } }));
        const exported = a.run('JSON.stringify(appData)');   // exportData() 實際輸出的就是這份
        const b = freshApp();
        importText(b, exported);
        const pick = app => JSON.parse(app.run('JSON.stringify(Object.fromEntries(Object.entries(appData.semesters).map(([k, v]) => [k, v.map(c => [c.id, c.name, c.credits, c.status, c.score, c.type])])))'));
        assert.deepEqual(pick(b), pick(a));
        assert.equal(b.run('appData.semesterOrder.join()'), a.run('appData.semesterOrder.join()'));
    });
    test('學期依一上、一下、二上…排序', () => {
        const app = freshApp();
        importText(app, backup({ semesterOrder: ['二上', '一下', '一上'], semesters: { 二上: [], 一下: [], 一上: [] } }));
        assert.equal(app.run('appData.semesterOrder.join()'), '一上,一下,二上');
    });
    test('currentSemester 不在學期清單時改用第一個學期', () => {
        const app = freshApp();
        importText(app, backup({ currentSemester: '九下' }));
        assert.equal(app.run('appData.currentSemester'), '一上');
    });
});

describe('匯入：拒絕與防護', () => {
    test('不是 JSON → 警告，且原本的資料不變', () => {
        const app = freshApp();
        app.run('appData.deptName = "原本的學系"');
        importText(app, '這不是 json{');
        assert.ok(app.alerts.some(a => a.includes('JSON')));
        assert.equal(app.run('appData.deptName'), '原本的學系');
    });
    test('結構不對（沒有 semesters）→ 警告，資料不變', () => {
        const app = freshApp();
        app.run('appData.deptName = "原本的學系"');
        importText(app, JSON.stringify({ foo: 1 }));
        importText(app, JSON.stringify([1, 2, 3]));
        importText(app, 'null');
        assert.equal(app.alerts.length, 3);
        assert.equal(app.run('appData.deptName'), '原本的學系');
    });
    test('超過 5 MB 的檔案直接拒絕', () => {
        const app = freshApp();
        importText(app, backup(), 6 * 1024 * 1024);
        assert.ok(app.alerts.some(a => a.includes('過大')));
    });
    test('學期超過 16 個 → 拒絕', () => {
        const app = freshApp();
        const semesters = {};
        for (let i = 1; i <= 17; i++) semesters[`${i}上`] = [];
        importText(app, JSON.stringify({ semesters }));
        assert.ok(app.alerts.some(a => a.includes('超過系統上限')));
    });
    test('單學期超過 40 門課只保留前 40 門；候選課最多 60', () => {
        const app = freshApp();
        const many = Array.from({ length: 55 }, (_, i) => course('課' + i, { id: i + 1 }));
        importText(app, backup({ semesters: { 一上: many, 一下: [] }, wishlist: Array.from({ length: 80 }, (_, i) => course('候' + i, { id: i + 1 })) }));
        assert.equal(app.run('appData.semesters["一上"].length'), 40);
        assert.equal(app.run('appData.wishlist.length'), 60);
    });
    test('不合法的學期名稱被丟棄（避免當成物件鍵污染）', () => {
        const app = freshApp();
        importText(app, backup({
            semesterOrder: ['一上', '<img src=x>', '__proto__'],
            semesters: { 一上: [], '<img src=x>': [course('X')], '__proto__': [course('Y')] }
        }));
        assert.equal(app.run('appData.semesterOrder.join()'), '一上');
        assert.deepEqual(Object.keys(JSON.parse(app.run('JSON.stringify(appData.semesters)'))), ['一上']);
    });
    test('學系名稱被截斷到 50 字；非字串改用預設', () => {
        const app = freshApp();
        importText(app, backup({ deptName: 'x'.repeat(200) }));
        assert.equal(app.run('appData.deptName.length'), 50);
        importText(app, backup({ deptName: { a: 1 } }));
        assert.equal(app.run('appData.deptName'), '電機工程學系');
    });
    test('security.json（含 XSS）匯入後：顏色與節次已清洗、連結被擋、文字可安全輸出', () => {
        const app = freshApp();
        importText(app, fs.readFileSync(path.join(__dirname, 'fixtures', 'security.json'), 'utf8'));
        const all = JSON.parse(app.run('JSON.stringify(Object.values(appData.semesters).flat())'));
        assert.ok(all.length > 0);
        for (const c of all) {
            assert.match(c.color, /^#[0-9a-fA-F]{3,8}$/);
            for (const s of c.slots) for (const p of s.periods) assert.match(p, /^[1-9NABCD]$/);
        }
        const unsafe = all.filter(c => c.url && app.run(`sanitizeURL(${JSON.stringify(c.url)})`) !== '');
        assert.deepEqual(unsafe.map(c => c.url).filter(u => /^javascript:/i.test(u)), []);
    });
    test('分數與學分異常值被修正', () => {
        const app = freshApp();
        importText(app, backup({ semesters: { 一上: [course('A', { score: 999, credits: -5 }), course('B', { score: 'abc', credits: 'x' })], 一下: [] } }));
        const [a, b] = JSON.parse(app.run('JSON.stringify(appData.semesters["一上"])'));
        assert.equal(a.score, null);
        assert.equal(a.credits, 0);
        assert.equal(b.score, null);
        assert.equal(b.credits, 0);
    });
});

describe('持久化（localStorage）', () => {
    test('saveData → 重新載入後還在', () => {
        const storage = makeStorage();
        const a = freshApp(storage);
        a.run('appData.deptName = "測試學系"; appData.semesters["一上"].push(normalizeCourseData({ name: "存檔測試", credits: 2 })); saveData()');
        const b = loadApp({ storage });
        assert.equal(b.run('appData.deptName'), '測試學系');
        assert.equal(b.run('appData.semesters["一上"][0].name'), '存檔測試');
    });
    test('localStorage 裡的資料損毀時，回到預設而不當機', () => {
        const storage = makeStorage();
        storage.setItem('mySchedule', '{broken json');
        const app = loadApp({ storage });
        assert.equal(app.errors.length, 0);
        assert.equal(app.run('appData.deptName'), '電機工程學系');
    });
    test('localStorage 裡的惡意課程在載入時就被正規化', () => {
        const storage = makeStorage();
        storage.setItem('mySchedule', JSON.stringify({ semesters: { 一上: [{ name: 'X', color: 'red" onclick="x', slots: [{ day: 99, periods: ['<b>', '1'] }] }] } }));
        const app = loadApp({ storage });
        const c = JSON.parse(app.run('JSON.stringify(appData.semesters["一上"][0])'));
        assert.equal(c.color, '#2563eb');
        assert.deepEqual(c.slots[0].periods, ['1']);
    });
    test('儲存失敗（空間已滿）時回傳 false 並顯示警告列', () => {
        const storage = makeStorage();
        const app = loadApp({ storage });
        const shown = [];
        app.run('TimeFlowNotify').showBanner = (...a) => shown.push(a);
        storage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
        assert.equal(app.run('saveData()'), false);
        assert.equal(shown.length, 1);
        assert.match(shown[0][1], /已滿/);
    });
});

describe('匯入：設定欄位與 localStorage 載入共用同一份正規化', () => {
    const X = '<img src=x onerror=alert(1)>';

    test('轉系備份、課程地圖隱藏清單在匯入當下就被清洗（不必等重新整理）', () => {
        const app = freshApp(makeStorage());
        importText(app, backup({
            transferBackup: { savedAt: 'x'.repeat(500), toDept: 5, deptName: 'D'.repeat(500), entryYear: 118, types: { 'bad key': 'x', 12: 't'.repeat(100) } },
            courseMapHidden: [1, '', 'n'.repeat(500), { a: 1 }]
        }));
        const tb = JSON.parse(app.run('JSON.stringify(appData.transferBackup)'));
        assert.equal(tb.savedAt.length, 30);
        assert.equal(tb.deptName.length, 50);
        assert.equal(tb.toDept, '');
        assert.deepEqual(Object.keys(tb.types), ['12']);
        const hidden = JSON.parse(app.run('JSON.stringify(appData.courseMapHidden)'));
        assert.equal(hidden.length, 1);
        assert.equal(hidden[0].length, 60);
    });
    test('格式不對的轉系備份直接丟棄', () => {
        const app = freshApp(makeStorage());
        importText(app, backup({ transferBackup: [X] }));
        assert.equal(app.run('appData.transferBackup'), null);
    });
    test('跨領域類別只接受選單上的四種', () => {
        const app = freshApp(makeStorage());
        importText(app, backup({ crossMajor: { type: X, name: 'N'.repeat(200), target: 'abc' } }));
        assert.deepEqual(JSON.parse(app.run('JSON.stringify(appData.crossMajor)')), { type: 'none', name: 'N'.repeat(50), target: 40 });
        importText(app, backup({ crossMajor: { type: '輔系', name: '資訊系', target: 20 } }));
        assert.deepEqual(JSON.parse(app.run('JSON.stringify(appData.crossMajor)')), { type: '輔系', name: '資訊系', target: 20 });
    });
    test('課程名稱與類別限制長度，overrides 過大時清空', () => {
        const app = freshApp(makeStorage());
        importText(app, backup({ semesters: { 一上: [
            course('N'.repeat(5000), { type: 'T'.repeat(5000), overrides: { big: 'x'.repeat(5000) } }),
            course('正常', { id: 2, overrides: { '2026-01-01': 'skip' } })
        ], 一下: [] } }));
        const [a, b] = JSON.parse(app.run('JSON.stringify(appData.semesters["一上"])'));
        assert.equal(a.name.length, 120);
        assert.equal(a.type.length, 30);
        assert.deepEqual(a.overrides, {});
        assert.deepEqual(b.overrides, { '2026-01-01': 'skip' });
    });
    test('不認得的欄位只保留簡單的值', () => {
        const app = freshApp(makeStorage());
        importText(app, backup({ futureFlag: true, futureNumber: 3, futureText: 'ok', junkObject: { a: [X] }, junkArray: [X], junkLong: 'x'.repeat(101) }));
        const keys = JSON.parse(app.run('JSON.stringify(Object.keys(appData))'));
        for (const k of ['futureFlag', 'futureNumber', 'futureText']) assert.ok(keys.includes(k), k);
        for (const k of ['junkObject', 'junkArray', 'junkLong']) assert.ok(!keys.includes(k), k);
    });
    test('從 localStorage 載入時套用相同規則', () => {
        const storage = makeStorage();
        storage.setItem('timeflow_data', JSON.stringify({ semesters: { 一上: [] }, crossMajor: { type: X }, junkObject: { a: 1 }, courseMapHidden: 'x' }));
        const app = loadApp({ storage });
        assert.equal(app.errors.length, 0);
        assert.equal(app.run('appData.crossMajor.type'), 'none');
        assert.equal(app.run('"junkObject" in appData'), false);
        assert.deepEqual(JSON.parse(app.run('JSON.stringify(appData.courseMapHidden)')), []);
    });
});

describe('儲存 key 改名（mySchedule → timeflow_data）', () => {
    test('新的 key 帶有 timeflow_ 前綴', () => {
        assert.equal(loadApp({ storage: makeStorage() }).run('STORAGE_KEY'), 'timeflow_data');
    });
    test('舊 key 的資料會搬到新 key，並刪掉舊的', () => {
        const storage = makeStorage();
        storage.setItem('mySchedule', backup({ deptName: '舊資料學系' }));
        const app = loadApp({ storage });
        assert.equal(app.run('appData.deptName'), '舊資料學系');
        assert.equal(storage.getItem('mySchedule'), null);
        assert.equal(JSON.parse(storage.getItem('timeflow_data')).deptName, '舊資料學系');
    });
    test('新舊都有資料時以新的為準，舊的清掉', () => {
        const storage = makeStorage();
        storage.setItem('mySchedule', backup({ deptName: '舊' }));
        storage.setItem('timeflow_data', backup({ deptName: '新' }));
        const app = loadApp({ storage });
        assert.equal(app.run('appData.deptName'), '新');
        assert.equal(storage.getItem('mySchedule'), null);
        assert.equal(JSON.parse(storage.getItem('timeflow_data')).deptName, '新');
    });
    test('寫入新 key 失敗時保留舊資料', () => {
        const storage = makeStorage();
        storage.setItem('mySchedule', backup({ deptName: '舊資料學系' }));
        storage.setItem = () => { throw new Error('quota'); };
        const app = loadApp({ storage });
        assert.equal(app.run('appData.deptName'), '舊資料學系');
        assert.notEqual(storage.getItem('mySchedule'), null);
    });
    test('舊 key 內容損毀時不當機', () => {
        const storage = makeStorage();
        storage.setItem('mySchedule', '{broken');
        const app = loadApp({ storage });
        assert.equal(app.errors.length, 0);
        assert.equal(app.run('appData.deptName'), '電機工程學系');
    });
});
