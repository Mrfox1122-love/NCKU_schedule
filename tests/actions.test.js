'use strict';
// 宣告式事件處理（actions.js）：解析器行為，以及「畫面上每一個 data-on* 都能解析、且呼叫的函式真的存在」。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, listScripts, ROOT } = require('./helpers/load');

// app.js 也要載入（側欄、設定彈窗等函式定義在裡面）；只排除需要真正瀏覽器的 boot / Service Worker 註冊
const app = loadApp({ scripts: listScripts({ skip: ['js/core/boot.js', 'js/core/sw-register.js'] }) });
const A = app.ctx.TimeFlowActions;

// 用假的環境測試解析器，不依賴真實的頁面函式
function run(src, extra = {}) {
    const calls = [];
    const scope = {
        document: { nodeType: 9, getElementById: id => ({ nodeType: 1, id, click() { calls.push(['click', id]); } }), querySelector: () => null },
        window: null,
        JSON,
        rec: (...args) => { calls.push(['rec', ...args]); return extra.ret; },
        Obj: { method: (...args) => calls.push(['method', ...args]) },
        ...extra.scope
    };
    scope.window = { print: () => calls.push(['print']) };
    const event = { stopPropagation() { calls.push(['stop']); }, preventDefault() { calls.push(['prevent']); }, key: 'Enter' };
    const el = { nodeType: 1, value: 'V', checked: true, href: 'http://x/', dataset: { name: 'N', find: '{"a":1}' } };
    const result = A.execute(src, { el, event, scope });
    return { result, calls };
}

describe('TimeFlowActions：可執行的寫法', () => {
    test('呼叫函式並傳入字串、數字、布林', () => {
        assert.deepEqual(run(`rec('a', 2, -1, true, null)`).calls, [['rec', 'a', 2, -1, true, null]]);
    });
    test('雙引號字串與跳脫字元', () => {
        assert.deepEqual(run(`rec("it's", 'it\\'s')`).calls, [['rec', "it's", "it's"]]);
    });
    test('this 與 event 的屬性', () => {
        assert.deepEqual(run('rec(this.value, this.checked, this.href, this.dataset.name, event.key)').calls,
            [['rec', 'V', true, 'http://x/', 'N', 'Enter']]);
    });
    test('JSON.parse(this.dataset.find)', () => {
        const { calls } = run('rec(JSON.parse(this.dataset.find))');
        assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { a: 1 });
    });
    test('物件方法與多個敘述', () => {
        assert.deepEqual(run(`Obj.method('x'); rec(1);`).calls, [['method', 'x'], ['rec', 1]]);
    });
    test('event.stopPropagation() 搭配後續呼叫', () => {
        assert.deepEqual(run(`event.stopPropagation(); rec('x')`).calls, [['stop'], ['rec', 'x']]);
    });
    test('return 回傳函式結果（false 會被事件處理器拿來 preventDefault）', () => {
        assert.equal(run('return rec(event)', { ret: false }).result, false);
    });
    test('document.getElementById(...).click()', () => {
        assert.deepEqual(run(`document.getElementById('fileInput').click()`).calls, [['click', 'fileInput']]);
    });
    test('document.querySelector(...)?.click() 找不到元素時不出錯', () => {
        assert.doesNotThrow(() => run(`document.querySelector('#x')?.click()`));
    });
    test('window.print()', () => {
        assert.deepEqual(run('window.print()').calls, [['print']]);
    });
});

describe('TimeFlowActions：拒絕的寫法（避免變成任意程式碼執行）', () => {
    const rejects = (src, msg) => assert.throws(() => run(src), undefined, msg || src);

    test('eval / Function / setTimeout / location / fetch', () => {
        rejects(`eval('1')`);
        rejects(`Function('return 1')()`);
        rejects(`setTimeout('x', 1)`);
        rejects(`location.href`);
        rejects(`fetch('/x')`);
        rejects(`localStorage.clear()`);
    });
    test('constructor / __proto__ / prototype 鏈', () => {
        rejects(`rec.constructor('return 1')()`);
        rejects(`this.constructor.constructor('return 1')()`);
        rejects(`Obj.__proto__.x()`);
    });
    test('document / window 只開放極少數成員', () => {
        rejects(`document.write('x')`);
        rejects(`document.cookie`);
        rejects(`window.open('x')`);
        rejects(`window.location`);
    });
    test('從 document 取得的節點只能 click / focus 等', () => {
        rejects(`document.getElementById('x').remove()`);
        rejects(`document.getElementById('x').innerHTML`.replace('.innerHTML', '.appendChild()'));
    });
    test('不支援的語法：運算子、指派、陣列、函式、模板字串', () => {
        for (const src of [`a = 1`, `rec(1 + 2)`, `rec([1])`, `rec(() => 1)`, 'rec(`x`)', `if (true) { rec(1) }`, `rec(x ? 1 : 2)`, `rec(1`, ``, `rec('abc)`]) {
            rejects(src);
        }
    });
    test('呼叫未定義的函式會報錯而不是靜默略過', () => {
        rejects(`notExistingFunction()`);
    });
});

describe('畫面中的所有 data-on* 事件', () => {
    const files = ['index.html'];
    (function walk(dir) {
        for (const name of fs.readdirSync(path.join(ROOT, dir))) {
            const rel = `${dir}/${name}`;
            const stat = fs.statSync(path.join(ROOT, rel));
            if (stat.isDirectory()) { if (name !== 'libs') walk(rel); }
            else if (name.endsWith('.js') && !/catalog-data|history-data|^actions.js$/.test(name)) files.push(rel);
        }
    })('js');

    // 取出所有 data-onXXX="..." ；模板字串的 ${...} 以數字 1 代入（放在引號內就是字串 '1'）
    const found = [];
    for (const rel of files) {
        const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        const re = /\bdata-on(click|change|input|keydown)=(?:"([^"]*)"|'([^']*)')/g;
        let m;
        while ((m = re.exec(text))) {
            const raw = m[2] !== undefined ? m[2] : m[3];
            const src = raw.replace(/\$\{[^}]*\}/g, '1')
                .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
            found.push({ rel, type: m[1], src });
        }
    }

    test('找得到兩百個以上的事件綁定', () => {
        assert.ok(found.length >= 200, `只找到 ${found.length} 個`);
    });
    test('每一個都能被解析', () => {
        const bad = [];
        for (const f of found) {
            try { A.parse(f.src); } catch (e) { bad.push(`${f.rel}: ${f.src} → ${e.message}`); }
        }
        assert.deepEqual(bad, []);
    });
    test('每一個呼叫的函式／物件都真的存在於全域（避免改名後事件失效）', () => {
        const missing = new Set();
        for (const f of found) {
            for (const root of A.collectRoots(f.src)) {
                if (!(root in app.ctx)) missing.add(`${root}  ←  ${f.rel}`);
            }
        }
        assert.deepEqual(Array.from(missing), []);
    });
    test('不再有行內事件屬性（onclick= 等），否則會被 CSP 擋下', () => {
        const bad = [];
        for (const rel of files) {
            const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
            const re = /(?<![\w-])on(click|change|input|keydown|keyup|submit|focus|blur|load|error|mouse\w+)=["']/g;
            if (rel.endsWith('actions.js')) continue;
            let m;
            while ((m = re.exec(text))) bad.push(`${rel}: ${text.slice(m.index, m.index + 50).replace(/\s+/g, ' ')}`);
        }
        assert.deepEqual(bad, []);
    });
});

describe('內容安全政策（CSP）', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const csp = (html.match(/Content-Security-Policy"\s+content="([^"]*)"/) || [])[1] || '';
    const directive = name => (csp.match(new RegExp(`${name}\\s+([^;]*)`)) || [])[1] || '';

    test('script-src 只允許自己的檔案，沒有 unsafe-inline / unsafe-eval', () => {
        const v = directive('script-src');
        assert.match(v, /'self'/);
        assert.doesNotMatch(v, /unsafe-inline|unsafe-eval|https?:|\*/);
    });
    test('index.html 沒有行內 <script>', () => {
        const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].filter(m => m[1].trim());
        assert.equal(inline.length, 0);
    });
    test('沒有 javascript: 網址', () => {
        assert.doesNotMatch(html, /href\s*=\s*["']\s*javascript:/i);
    });
    test('其他來源維持最小：object-src none、base-uri self、connect-src self', () => {
        assert.match(directive('object-src'), /'none'/);
        assert.match(directive('base-uri'), /'self'/);
        assert.match(directive('connect-src'), /^'self'\s*$/);
    });
});
