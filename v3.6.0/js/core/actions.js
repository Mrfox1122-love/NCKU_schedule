// ============================================================
// 🧭 TimeFlow v3.6.0 — 宣告式事件處理 (actions.js)
// ------------------------------------------------------------
// 為了讓內容安全政策（CSP）可以拿掉 script-src 的 'unsafe-inline'，
// 畫面不再使用 onclick="..." 這類行內事件屬性，改寫成 data-onclick="..."。
// 瀏覽器不會把 data-* 當成程式碼執行；這個檔案在 document 上做事件委派，
// 用一個很小的語法解析器讀取 data-on* 的內容並呼叫對應的函式——
// 全程不使用 eval / new Function，所以不需要 'unsafe-eval'。
//
// 支援的寫法（涵蓋目前所有用法）：
//   fn(args)                      呼叫全域函式
//   Obj.method(args)              呼叫全域物件的方法（例如 ModalManager.close('x')）
//   a(); b()                      多個敘述以分號分隔
//   return fn(event, this.href)   回傳 false 代表 preventDefault
//   event.stopPropagation()       / event.preventDefault()
//   document.getElementById('x').click()、document.querySelector('x')?.click()
//   window.print()
// 參數可以是：字串、數字、true / false / null、this、event、this.value、
//   this.dataset.xxx、JSON.parse(...) 與其他函式呼叫結果。
// 其他寫法一律拒絕並在主控台報錯，不會被執行。
// ============================================================

const TimeFlowActions = (function () {
    const EVENTS = ['click', 'change', 'input', 'keydown'];
    const BLOCKED_PROPS = new Set(['constructor', '__proto__', 'prototype', '__defineGetter__', '__defineSetter__', '__lookupGetter__']);
    const BLOCKED_ROOTS = new Set([
        'eval', 'Function', 'setTimeout', 'setInterval', 'setImmediate', 'location', 'history', 'fetch',
        'XMLHttpRequest', 'localStorage', 'sessionStorage', 'indexedDB', 'importScripts', 'open', 'close',
        'globalThis', 'self', 'top', 'parent', 'frames', 'navigator', 'Reflect', 'Proxy', 'Object', 'Array'
    ]);
    // DOM 節點只允許這幾個方法（讓「點一下另一個元素」之類的寫法可用）
    const NODE_METHODS = new Set(['click', 'focus', 'select', 'blur']);

    const cache = new Map();

    // ---------- 詞法分析 ----------
    function tokenize(src) {
        const tokens = [];
        let i = 0;
        while (i < src.length) {
            const ch = src[i];
            if (/\s/.test(ch)) { i++; continue; }
            if (ch === '"' || ch === "'") {
                let j = i + 1;
                let value = '';
                while (j < src.length && src[j] !== ch) {
                    if (src[j] === '\\' && j + 1 < src.length) {
                        const next = src[j + 1];
                        value += ({ n: '\n', t: '\t', r: '\r' })[next] || next;
                        j += 2;
                    } else {
                        value += src[j++];
                    }
                }
                if (j >= src.length) throw new SyntaxError('字串沒有結尾');
                tokens.push({ type: 'str', value });
                i = j + 1;
                continue;
            }
            if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
                const m = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(src.slice(i));
                tokens.push({ type: 'num', value: parseFloat(m[0]) });
                i += m[0].length;
                continue;
            }
            if (/[A-Za-z_$]/.test(ch)) {
                const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
                tokens.push({ type: 'id', value: m[0] });
                i += m[0].length;
                continue;
            }
            if (src.startsWith('?.', i)) { tokens.push({ type: 'op', value: '?.' }); i += 2; continue; }
            if ('().,;-'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
            throw new SyntaxError(`不支援的字元「${ch}」`);
        }
        return tokens;
    }

    // ---------- 語法分析 ----------
    function parse(src) {
        if (cache.has(src)) return cache.get(src);
        const tokens = tokenize(src);
        let pos = 0;
        const peek = () => tokens[pos];
        const isOp = v => peek() && peek().type === 'op' && peek().value === v;
        const expectOp = v => {
            if (!isOp(v)) throw new SyntaxError(`預期「${v}」`);
            pos++;
        };

        function parseArgs() {
            const args = [];
            if (isOp(')')) { pos++; return args; }
            for (;;) {
                args.push(parseExpr());
                if (isOp(',')) { pos++; continue; }
                expectOp(')');
                return args;
            }
        }

        function parseExpr() {
            const t = peek();
            if (!t) throw new SyntaxError('運算式不完整');
            if (t.type === 'op' && t.value === '-') {
                pos++;
                const n = peek();
                if (!n || n.type !== 'num') throw new SyntaxError('負號後面只能接數字');
                pos++;
                return { kind: 'lit', value: -n.value };
            }
            if (t.type === 'str' || t.type === 'num') { pos++; return { kind: 'lit', value: t.value }; }
            if (t.type === 'id') {
                pos++;
                if (t.value === 'true') return { kind: 'lit', value: true };
                if (t.value === 'false') return { kind: 'lit', value: false };
                if (t.value === 'null') return { kind: 'lit', value: null };
                if (t.value === 'undefined') return { kind: 'lit', value: undefined };
                let node = { kind: 'id', name: t.value };
                for (;;) {
                    if (isOp('.') || isOp('?.')) {
                        const optional = peek().value === '?.';
                        pos++;
                        const name = peek();
                        if (!name || name.type !== 'id') throw new SyntaxError('「.」後面要接名稱');
                        pos++;
                        node = { kind: 'member', object: node, prop: name.value, optional };
                    } else if (isOp('(')) {
                        pos++;
                        node = { kind: 'call', callee: node, args: parseArgs() };
                    } else {
                        return node;
                    }
                }
            }
            throw new SyntaxError(`無法解析「${t.value}」`);
        }

        function parseStatement() {
            if (peek() && peek().type === 'id' && peek().value === 'return') {
                pos++;
                return { kind: 'return', expr: parseExpr() };
            }
            return { kind: 'expr', expr: parseExpr() };
        }

        const statements = [];
        while (pos < tokens.length) {
            if (isOp(';')) { pos++; continue; }
            statements.push(parseStatement());
            if (pos < tokens.length && !isOp(';')) throw new SyntaxError(`多餘的內容「${peek().value}」`);
        }
        if (statements.length === 0) throw new SyntaxError('內容是空的');
        cache.set(src, statements);
        return statements;
    }

    // ---------- 執行 ----------
    function isNode(v) {
        return v && typeof v === 'object' && typeof v.nodeType === 'number';
    }

    function evalNode(node, ctx) {
        switch (node.kind) {
            case 'lit':
                return node.value;
            case 'id':
                if (node.name === 'this') return ctx.el;
                if (node.name === 'event') return ctx.event;
                if (BLOCKED_ROOTS.has(node.name)) throw new ReferenceError(`不允許使用 ${node.name}`);
                if (!(node.name in ctx.scope)) throw new ReferenceError(`${node.name} 未定義`);
                return ctx.scope[node.name];
            case 'member': {
                const obj = evalNode(node.object, ctx);
                if (obj === null || obj === undefined) {
                    if (node.optional) return undefined;
                    throw new TypeError(`無法讀取 ${node.prop}`);
                }
                return readProp(obj, node.prop, node.object, ctx);
            }
            case 'call': {
                let thisArg;
                let fn;
                if (node.callee.kind === 'member') {
                    thisArg = evalNode(node.callee.object, ctx);
                    if ((thisArg === null || thisArg === undefined) && node.callee.optional) return undefined;
                    if (thisArg === null || thisArg === undefined) throw new TypeError(`無法呼叫 ${node.callee.prop}`);
                    fn = readProp(thisArg, node.callee.prop, node.callee.object, ctx);
                } else {
                    fn = evalNode(node.callee, ctx);
                    thisArg = ctx.scope;
                }
                if (typeof fn !== 'function') throw new TypeError('這不是函式');
                const args = node.args.map(a => evalNode(a, ctx));
                return fn.apply(thisArg, args);
            }
            default:
                throw new SyntaxError('未知的運算式');
        }
    }

    function readProp(obj, prop, objNode, ctx) {
        if (BLOCKED_PROPS.has(prop)) throw new ReferenceError(`不允許讀取 ${prop}`);
        if (isNode(obj)) {
            const rootIsEl = objNode.kind === 'id' && (objNode.name === 'this');
            // 元素本身可以讀 value / checked / href / dataset / key 等屬性；
            // 從 document 取得的節點則只能呼叫 click / focus 等方法
            if (obj === ctx.scope.document) {
                if (prop !== 'getElementById' && prop !== 'querySelector') throw new ReferenceError(`不允許使用 document.${prop}`);
            } else if (!rootIsEl && typeof obj[prop] === 'function' && !NODE_METHODS.has(prop)) {
                throw new ReferenceError(`不允許呼叫 ${prop}`);
            }
        }
        if (obj === ctx.scope.window && prop !== 'print') {
            throw new ReferenceError(`不允許使用 window.${prop}`);
        }
        return obj[prop];
    }

    /**
     * 執行一段 data-on* 內容。回傳 { ok, returned }；語法或執行錯誤會丟出例外。
     * @param {string} src
     * @param {{ el?: any, event?: any, scope?: object }} ctx
     */
    function execute(src, ctx) {
        const statements = parse(src);
        const context = { el: ctx.el, event: ctx.event, scope: ctx.scope || window };
        let returned;
        for (const st of statements) {
            const value = evalNode(st.expr, context);
            if (st.kind === 'return') { returned = value; break; }
        }
        return returned;
    }

    /** 列出內容中用到的最外層名稱（this／event 除外），供測試確認每個名稱都真的存在 */
    function collectRoots(src) {
        const roots = new Set();
        const walk = n => {
            if (!n) return;
            if (n.kind === 'id') { if (n.name !== 'this' && n.name !== 'event') roots.add(n.name); }
            else if (n.kind === 'member') walk(n.object);
            else if (n.kind === 'call') { walk(n.callee); n.args.forEach(walk); }
        };
        parse(src).forEach(st => walk(st.expr));
        return Array.from(roots);
    }

    // ---------- 事件委派 ----------
    function handle(event) {
        const attr = 'data-on' + event.type;
        // 先記下事件路徑，處理過程中即使畫面重繪也不影響
        const path = [];
        for (let el = event.target; el && el.nodeType === 1; el = el.parentElement) {
            if (el.hasAttribute(attr)) path.push(el);
        }
        for (const el of path) {
            try {
                const result = execute(el.getAttribute(attr), { el, event, scope: window });
                if (result === false) event.preventDefault();
            } catch (err) {
                console.error(`[TimeFlow] ${attr}="${el.getAttribute(attr)}" 執行失敗：`, err);
            }
            // 與原生行為一致：處理器呼叫 event.stopPropagation() 後，外層元素的處理器不再執行
            if (event.cancelBubble) break;
        }
    }

    function init() {
        EVENTS.forEach(type => document.addEventListener(type, handle));
    }

    return { init, parse, execute, collectRoots, EVENTS };
})();

window.TimeFlowActions = TimeFlowActions;
TimeFlowActions.init();
