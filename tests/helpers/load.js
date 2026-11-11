// 在 Node 內載入 TimeFlow 的純計算模組（沿用 index.html 的 script 順序）
// 以 vm 建立單一全域環境，模擬瀏覽器的 window / document / localStorage 最小子集。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 網站根目錄。預設是 tests 的上一層；部署用的 repo 把網站放在版本資料夾（例如 v3.5.3/），
// 可用環境變數 TIMEFLOW_ROOT 指過去，例如：TIMEFLOW_ROOT=v3.5.3 npm test
const ROOT = process.env.TIMEFLOW_ROOT
    ? path.resolve(process.env.TIMEFLOW_ROOT)
    : path.resolve(__dirname, '..', '..');
// 只能在真正的瀏覽器運作的腳本（操作頁面或 Service Worker），測試環境不載入
const BROWSER_ONLY = ['js/app.js', 'js/core/boot.js', 'js/core/sw-register.js', 'js/core/inline-styles.js'];

function makeStorage() {
    const m = new Map();
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: k => { m.delete(k); },
        clear: () => m.clear(),
        key: i => Array.from(m.keys())[i] ?? null,
        get length() { return m.size; }
    };
}

function makeElement() {
    const el = new Proxy(function () {}, {
        get: (t, p) => {
            if (p === 'style' || p === 'classList' || p === 'dataset') return makeElement();
            if (p === 'querySelectorAll' || p === 'children') return () => [];
            if (p === Symbol.toPrimitive) return () => '';
            return makeElement();
        },
        set: () => true,
        apply: () => makeElement()
    });
    return el;
}

/** 讀出 index.html 內 js/ 底下依序載入的腳本（略過 libs 與 UI 入口 app.js） */
function listScripts({ skip = [] } = {}) {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const out = [];
    const re = /<script\s+src="(js\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html))) {
        const src = m[1];
        if (src.startsWith('js/libs/')) continue;
        if (skip.some(s => src.includes(s))) continue;
        out.push(src);
    }
    return out;
}

/**
 * 建立並回傳 { ctx, run, errors }。
 * - ctx.window === ctx，所以 window.X 與全域 X 互通
 * - run(code) 在同一個環境執行，可存取腳本內 const/let 宣告的頂層變數
 */
function loadApp({ scripts, storage } = {}) {
    const ls = storage || makeStorage();
    const sandbox = {
        console,
        localStorage: ls,
        sessionStorage: makeStorage(),
        setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
        requestAnimationFrame: () => 0,
        Date, Math, JSON, URL, Intl,
        navigator: { storage: {}, serviceWorker: undefined, userAgent: 'node' },
        matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
        alert() {}, confirm: () => true, prompt: () => null,
        document: {
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: () => makeElement(),
            addEventListener() {},
            body: makeElement(),
            documentElement: makeElement(),
            readyState: 'complete'
        },
        location: { href: 'http://localhost/', hash: '', search: '', reload() {} },
        addEventListener() {},
        removeEventListener() {},
        Chart: function () {}
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    const ctx = vm.createContext(sandbox);
    const errors = [];
    const list = scripts || listScripts({ skip: BROWSER_ONLY });
    for (const rel of list) {
        const file = path.join(ROOT, rel);
        try {
            vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: rel });
        } catch (e) {
            errors.push({ file: rel, error: e });
        }
    }
    return { ctx, errors, run: code => vm.runInContext(code, ctx) };
}

module.exports = { loadApp, listScripts, makeStorage, ROOT, BROWSER_ONLY };
