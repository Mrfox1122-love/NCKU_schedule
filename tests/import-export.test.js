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
        importText(app, fs.readFileSync(path.join(ROOT, 'security.json'), 'utf8'));
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
