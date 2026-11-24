'use strict';
// 行內樣式處理（inline-styles.js）與 style-src CSP：模板用 data-style，由 CSSOM 套用。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./helpers/load');

// 只載入解析函式（其餘需要真正的 DOM），用假的瀏覽器物件讓檔案能執行
function loadStyles() {
    class FakeObserver { observe() {} }
    const proto = { insertAdjacentHTML() {} };
    Object.defineProperty(proto, 'innerHTML', { get() { return ''; }, set() {}, configurable: true });
    Object.defineProperty(proto, 'outerHTML', { get() { return ''; }, set() {}, configurable: true });
    const ctx = vm.createContext({ document: { documentElement: {} }, MutationObserver: FakeObserver, Element: { prototype: proto } });
    ctx.window = ctx;
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/core/inline-styles.js'), 'utf8'), ctx);
    return ctx.TimeFlowStyles;
}
const S = loadStyles();
const parse = s => JSON.parse(JSON.stringify(S.parseDeclarations(s)));

describe('parseDeclarations', () => {
    test('一般宣告', () => {
        assert.deepEqual(parse('color:red; margin: 4px 8px;'), [['color', 'red', ''], ['margin', '4px 8px', '']]);
    });
    test('!important', () => {
        assert.deepEqual(parse('display:none !important'), [['display', 'none', 'important']]);
    });
    test('CSS 變數與 var()', () => {
        assert.deepEqual(parse('--tf-x: 3px; color: var(--tf-color-primary-light)'), [['--tf-x', '3px', ''], ['color', 'var(--tf-color-primary-light)', '']]);
    });
    test('括號與引號內的分號不會被切開', () => {
        assert.deepEqual(parse(`background:url("data:image/svg+xml;utf8,<svg/>"); content:"a;b"`),
            [['background', 'url("data:image/svg+xml;utf8,<svg/>")', ''], ['content', '"a;b"', '']]);
    });
    test('空白、空宣告、缺值的項目被略過', () => {
        assert.deepEqual(parse(';; color:red;; :x; y:; '), [['color', 'red', '']]);
        assert.deepEqual(parse(''), []);
    });
    test('漸層與多值', () => {
        const [d] = parse('background: linear-gradient(90deg, rgba(0,0,0,.5) 0%, #fff 100%)');
        assert.equal(d[1], 'linear-gradient(90deg, rgba(0,0,0,.5) 0%, #fff 100%)');
    });
});

describe('style-src：模板不再使用 style="..."', () => {
    const files = ['index.html'];
    (function walk(dir) {
        for (const name of fs.readdirSync(path.join(ROOT, dir))) {
            const rel = `${dir}/${name}`;
            if (fs.statSync(path.join(ROOT, rel)).isDirectory()) { if (name !== 'libs') walk(rel); }
            else if (name.endsWith('.js') && !/catalog-data|history-data|^inline-styles\.js$/.test(name)) files.push(rel);
        }
    })('js');

    test('沒有 style="..." 屬性（改用 data-style）', () => {
        const bad = [];
        for (const rel of files) {
            const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
            const re = /(?<![\w-])style=["']/g;
            let m;
            while ((m = re.exec(text))) bad.push(`${rel}: ${text.slice(m.index, m.index + 50).replace(/\s+/g, ' ')}`);
        }
        assert.deepEqual(bad, []);
    });
    test('沒有用 setAttribute("style") 設定樣式（CSP 會擋，請用 el.style.xxx）', () => {
        const bad = [];
        for (const rel of files) {
            const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
            if (/setAttribute\(\s*['"]style['"]/.test(text)) bad.push(rel);
        }
        assert.deepEqual(bad, []);
    });
    test('index.html 沒有 <style> 區塊', () => {
        const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
        assert.doesNotMatch(html, /<style[\s>]/i);
    });
    test('data-style 的內容都能解析出至少一個宣告', () => {
        const bad = [];
        for (const rel of files) {
            const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
            const re = /\bdata-style=(?:"([^"]*)"|'([^']*)')/g;
            let m;
            while ((m = re.exec(text))) {
                const raw = (m[1] !== undefined ? m[1] : m[2]).replace(/\$\{[^}]*\}/g, '1');
                if (raw.includes(':') && parse(raw).length === 0) bad.push(`${rel}: ${raw.slice(0, 60)}`);
            }
        }
        assert.deepEqual(bad, []);
    });
});

describe('CSP style-src 與防點擊劫持', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const csp = (html.match(/Content-Security-Policy"\s+content="([^"]*)"/) || [])[1] || '';
    const style = (csp.match(/style-src\s+([^;]*)/) || [])[1] || '';

    test("style-src 只允許 'self'", () => {
        assert.match(style, /'self'/);
        assert.doesNotMatch(style, /unsafe-inline|unsafe-eval|https?:|\*/);
    });
    test('inline-styles.js 在 <head> 且早於所有 css 與內容', () => {
        const head = html.slice(0, html.indexOf('</head>'));
        assert.match(head, /js\/core\/inline-styles\.js/);
        assert.ok(html.indexOf('js/core/inline-styles.js') < html.indexOf('<body'));
    });
    test('防點擊劫持：CSS 預設隱藏 body，boot.js 確認最上層後才加上 tf-top', () => {
        const css = fs.readFileSync(path.join(ROOT, 'css/components.css'), 'utf8');
        assert.match(css, /html:not\(\.tf-top\)\s+body\s*\{[^}]*display:\s*none\s*!important/);
        assert.match(fs.readFileSync(path.join(ROOT, 'js/core/boot.js'), 'utf8'), /classList\.add\('tf-top'\)/);
    });
    test('data-style 不套用外部 url(http/https/協議相對)', () => {
        const applied = [];
        const makeFakeEl = styleText => ({
            nodeType: 1,
            hasAttribute: a => a === 'data-style',
            getAttribute: a => (a === 'data-style' ? styleText : null),
            style: {
                getPropertyValue: () => '',
                setProperty: (k, v) => applied.push([k, v])
            }
        });
        S.applyTree(makeFakeEl('background: url("https://evil.example/track"); color: red'));
        S.applyTree(makeFakeEl('background-image: url(//evil.example/x); font-size: 12px'));
        assert.deepEqual(applied, [['color', 'red'], ['font-size', '12px']]);
    });

    test('data-style 更新可覆寫舊值、清除移除的屬性，但保留程式直接設定的樣式，且 outerHTML 生效', () => {
        const makeStyleBag = (initial = {}) => {
            const map = new Map(Object.entries(initial));
            return {
                getPropertyValue: k => map.get(k) || '',
                setProperty: (k, v) => { map.set(k, v); },
                removeProperty: k => { map.delete(k); },
                _dump: () => Object.fromEntries(map)
            };
        };
        const makeNode = (attrText, initialStyle = {}) => {
            let attr = attrText;
            return {
                nodeType: 1,
                hasAttribute: a => a === 'data-style' && attr !== null,
                getAttribute: a => (a === 'data-style' ? attr : null),
                setDataStyle(next) { attr = next; },
                style: makeStyleBag(initialStyle)
            };
        };

        let observerCb;
        class TestObserver {
            constructor(cb) { observerCb = cb; }
            observe() {}
        }
        const proto = { insertAdjacentHTML() {} };
        Object.defineProperty(proto, 'innerHTML', { get() { return ''; }, set() {}, configurable: true });
        Object.defineProperty(proto, 'outerHTML', {
            get() { return ''; },
            set() {
                // 模擬原生 outerHTML：舊節點脫離 parentNode，parentNode 出現替換後的新子節點
                const parent = this.parentNode;
                this.parentNode = null;
                parent._replacedChild = makeNode('padding: 8px;');
                parent.querySelectorAll = () => [parent._replacedChild];
            },
            configurable: true
        });
        const ctx = vm.createContext({
            document: { documentElement: {} },
            MutationObserver: TestObserver,
            Element: { prototype: proto }
        });
        ctx.window = ctx;
        vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/core/inline-styles.js'), 'utf8'), ctx);

        const el = makeNode('color: red; margin: 4px;', { fontWeight: 'bold' });
        el.style.setProperty('opacity', '0.5'); // 程式直接設定，之後不得被 data-style 覆寫
        ctx.TimeFlowStyles.applyTree(el);
        assert.deepEqual(el.style._dump(), { fontWeight: 'bold', opacity: '0.5', color: 'red', margin: '4px' });

        // 更新 data-style（改變 color、移除 margin、嘗試寫入 opacity）
        el.setDataStyle('color: blue; opacity: 1;');
        observerCb([{ type: 'attributes', target: el }]);
        assert.equal(el.style.getPropertyValue('color'), 'blue');
        assert.equal(el.style.getPropertyValue('margin'), '');
        assert.equal(el.style.getPropertyValue('opacity'), '0.5');

        // outerHTML 寫入後能於 parentNode 上找到並套用新替換節點
        const parent = { nodeType: 1, hasAttribute: () => false, querySelectorAll: () => [] };
        const child = Object.create(proto);
        child.parentNode = parent;
        Object.getOwnPropertyDescriptor(proto, 'outerHTML').set.call(child, '<div data-style="padding: 8px;"></div>');
        assert.equal(parent._replacedChild.style.getPropertyValue('padding'), '8px');
    });
});
