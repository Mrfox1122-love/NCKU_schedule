'use strict';
// 模組相依性檢查：index.html 以 <script defer> 依序載入、模組間靠全域名稱連接，
// 這些測試把「隱性依賴」變成明確規則，搬動 script 順序或新增模組時能立刻發現問題。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, listScripts, ROOT } = require('./helpers/load');
const { analyze, lineOf } = require('./helpers/globals');

const scripts = listScripts();
const { files, owner } = analyze(ROOT, scripts);
const byRel = new Map(files.map(f => [f.rel, f]));

// 共用核心：只依賴瀏覽器與彼此（依載入順序），不可引用任何功能模組
const CORE = [
    'js/core/boot.js', 'js/core/inline-styles.js', 'js/core/sw-register.js',
    'js/core/security.js', 'js/core/actions.js', 'js/core/store.js', 'js/core/modal.js', 'js/core/a11y.js',
    'js/core/notify.js', 'js/core/icons.js', 'js/core/config.js', 'js/core/data.js'
];
// 以 window.X = window.X || {} 方式累加註冊的共用資料表，允許多個檔案宣告
const SHARED_REGISTRIES = new Set(['DEPARTMENT_GRADUATION_RULES', 'PREREQUISITE_RULES']);

const where = (f, u) => `${f.rel}:${lineOf(f.src, u.pos)}`;
// 連同 app.js 一起載入（只排除需要真正瀏覽器的 boot / Service Worker 註冊）
const loadAll = () => loadApp({ scripts: listScripts({ skip: ['js/core/boot.js', 'js/core/sw-register.js'] }) });
// vm 內的陣列與測試端不同 realm，以 JSON 比較內容
const val = (app, expr) => JSON.parse(app.run(`JSON.stringify(${expr})`));

describe('載入順序', () => {
    test('index.html 的腳本都找得到並完成分析', () => {
        assert.ok(files.length >= 70, `只分析到 ${files.length} 支腳本`);
        for (const c of CORE) assert.ok(byRel.has(c), `index.html 沒有載入 ${c}`);
    });

    test('載入當下執行的程式碼，不引用之後才載入的腳本', () => {
        const bad = [];
        for (const f of files) {
            for (const u of f.uses) {
                if (u.inFunction || u.typeofGuard) continue;
                const o = owner.get(u.name);
                if (o && o !== f && !f.declared.has(u.name) && o.index > f.index) {
                    bad.push(`${where(f, u)} 載入時就用到 ${u.name}，但它在之後的 ${o.rel} 才定義`);
                }
            }
        }
        assert.deepEqual(bad, []);
    });

    test('每個腳本依序載入都不丟例外', () => {
        const app = loadApp();
        assert.deepEqual(app.errors.map(e => `${e.file}: ${e.error.message}`), []);
    });
});

describe('分層', () => {
    test('共用核心不引用功能模組（功能模組應改為訂閱 TimeFlowStore 事件）', () => {
        const coreSet = new Set(CORE);
        const bad = [];
        for (const rel of CORE) {
            const f = byRel.get(rel);
            for (const u of f.uses) {
                const o = owner.get(u.name);
                if (o && !coreSet.has(o.rel) && !f.declared.has(u.name)) {
                    bad.push(`${where(f, u)} 引用了功能模組 ${o.rel} 的 ${u.name}`);
                }
            }
        }
        assert.deepEqual([...new Set(bad)], []);
    });

    test('畫面重繪一律透過 TimeFlowStore，只有 app.js 直接使用 updateAppUI', () => {
        const bad = [];
        for (const f of files) {
            if (f.rel === 'js/app.js') continue;
            for (const u of f.uses) if (u.name === 'updateAppUI') bad.push(where(f, u));
        }
        assert.deepEqual(bad, [], '請改用 TimeFlowStore.commit()（存檔＋重繪）或 TimeFlowStore.refresh()（只重繪）');
    });

    test('存檔一律透過 TimeFlowStore，只有 data.js 直接呼叫 saveData', () => {
        const bad = [];
        for (const f of files) {
            if (f.rel === 'js/core/data.js') continue;
            for (const u of f.uses) if (u.name === 'saveData') bad.push(where(f, u));
        }
        assert.deepEqual(bad, [], '請改用 TimeFlowStore.save() 或 TimeFlowStore.commit()');
    });
});

describe('全域名稱', () => {
    test('功能模組包在 IIFE 內，不在頂層宣告全域（公開的名稱請放進 TimeFlow.expose）', () => {
        const bad = [];
        for (const f of files) {
            if (CORE.includes(f.rel)) continue;
            for (const t of f.tokens) {
                if (t.depth === 0 && t.type === 'id' && ['function', 'class', 'const', 'let', 'var'].includes(t.value)) {
                    bad.push(`${f.rel}:${lineOf(f.src, t.pos)}`);
                    break;
                }
            }
        }
        assert.deepEqual(bad, []);
    });

    test('同一個全域名稱只由一個檔案定義（避免後載入的檔案靜默覆蓋）', () => {
        const seen = new Map();
        const bad = [];
        for (const f of files) {
            for (const n of f.declared) {
                if (SHARED_REGISTRIES.has(n)) continue;
                if (seen.has(n)) bad.push(`${n}：${seen.get(n)} 與 ${f.rel}`);
                else seen.set(n, f.rel);
            }
        }
        assert.deepEqual(bad, []);
    });

    test('之後才載入的模組提供的名稱，執行時都真的存在（函式內的延後引用）', () => {
        const app = loadAll();
        const missing = [];
        for (const f of files) {
            for (const u of f.uses) {
                const o = owner.get(u.name);
                if (!o || o === f || f.declared.has(u.name)) continue;
                if (!app.run(`typeof ${u.name} !== 'undefined'`)) missing.push(`${where(f, u)} ${u.name}（${o.rel}）`);
            }
        }
        assert.deepEqual([...new Set(missing)], []);
    });
});

describe('TimeFlow.expose', () => {
    const app = loadAll();

    test('每個公開的名稱都同時掛在 TimeFlow.<模組> 與 window 上', () => {
        const modules = app.run('TimeFlow.modules');
        assert.ok(Object.keys(modules).length >= 25, `只有 ${Object.keys(modules).length} 個模組`);
        const bad = [];
        for (const [mod, api] of Object.entries(modules)) {
            for (const key of Object.keys(api)) {
                if (app.ctx[key] !== api[key]) bad.push(`${mod}.${key}`);
            }
        }
        assert.deepEqual(bad, []);
    });

    test('模組內部的輔助函式不再外洩成全域', () => {
        // 抽樣：這些名稱只在各自模組內使用
        for (const name of ['buildPrereqGraph', 'renderDesktopGridSchedule', 'getDiscoverPool', 'formatSlotList', 'renderEnrollResults']) {
            assert.equal(app.run(`typeof ${name}`), 'undefined', name);
        }
    });

    test('formatCourseSlots 是候選課比較的版本（接收課程物件），不會被排程檢查的同名函式覆蓋', () => {
        const text = app.run('formatCourseSlots({ slots: [{ day: 1, periods: ["3", "4"] }] })');
        assert.match(text, /3,4/);
    });

    test('exposeState 讓外部讀寫模組內的 let 變數', () => {
        app.run('enrollLastResults = [{ marker: 1 }]');
        assert.equal(app.run('TimeFlow.enrollSim.enrollLastResults[0].marker'), 1);
        assert.equal(app.run('Array.isArray(formSlotsState)'), true);
    });
});

describe('TimeFlowStore', () => {
    const fresh = () => {
        const app = loadApp({ scripts: ['js/core/store.js'] });
        app.run(`
            var __log = [];
            var __state = { n: 0 };
            TimeFlowStore.setPersister(() => { __log.push('save'); return true; });
            TimeFlowStore.setStateGetter(() => __state);
            TimeFlowStore.on('change', s => __log.push('change:' + s.n));
        `);
        return app;
    };

    test('commit() 先存檔再通知重繪', () => {
        const app = fresh();
        assert.equal(app.run('TimeFlowStore.commit()'), true);
        assert.deepEqual(val(app, '__log'), ['save', 'change:0']);
    });

    test('refresh() 只重繪不存檔；save() 只存檔不重繪', () => {
        const app = fresh();
        app.run('TimeFlowStore.refresh(); TimeFlowStore.save()');
        assert.deepEqual(val(app, '__log'), ['change:0', 'save']);
    });

    test('mutate() 修改後自動 commit；回傳 false 代表沒有變更', () => {
        const app = fresh();
        app.run('TimeFlowStore.mutate(s => { s.n = 5; })');
        app.run('TimeFlowStore.mutate(() => false)');
        assert.deepEqual(val(app, '__log'), ['save', 'change:5']);
    });

    test('updateCourse() 找到課程才更新並 commit', () => {
        const app = fresh();
        app.run(`__state = { n: 1, semesters: { '一上': [{ id: 7, name: 'A' }] } }`);
        assert.equal(app.run(`TimeFlowStore.updateCourse('一上', '7', c => { c.name = 'B'; })`), true);
        assert.equal(app.run(`TimeFlowStore.updateCourse('一上', 'x', () => {})`), false);
        assert.equal(app.run(`__state.semesters['一上'][0].name`), 'B');
        assert.deepEqual(val(app, '__log'), ['save', 'change:1']);
    });

    test('單一訂閱者出錯不影響其他訂閱者；on() 回傳取消訂閱函式', () => {
        const app = fresh();
        app.run(`
            const origError = console.error; console.error = () => {};
            TimeFlowStore.on('change', () => { throw new Error('boom'); });
            const off = TimeFlowStore.on('change', () => __log.push('second'));
            TimeFlowStore.refresh();
            off();
            TimeFlowStore.refresh();
            console.error = origError;
        `);
        assert.deepEqual(val(app, '__log'), ['change:0', 'second', 'change:0']);
    });

    test('沒有註冊存檔方式時 save() 回傳 false', () => {
        const app = loadApp({ scripts: ['js/core/store.js'] });
        assert.equal(app.run('TimeFlowStore.save()'), false);
    });

    test('data.js 載入後已註冊存檔與狀態', () => {
        const app = loadApp();
        assert.equal(app.run('TimeFlowStore.getState() === appData'), true);
        app.run('appData.__probe = 1; TimeFlowStore.save()');
        assert.match(app.ctx.localStorage.getItem(app.run('STORAGE_KEY')), /"__probe":1/);
    });
});
