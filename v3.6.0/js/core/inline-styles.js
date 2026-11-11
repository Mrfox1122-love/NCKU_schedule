// ============================================================
// 🎨 TimeFlow v3.6.0 — 行內樣式處理 (inline-styles.js)
// ------------------------------------------------------------
// 為了讓 CSP 的 style-src 可以拿掉 'unsafe-inline'，畫面模板不再寫 style="..."，
// 改寫成 data-style="..."。瀏覽器不會把 data-* 當樣式；這個檔案在元素加入頁面時，
// 用 CSSOM（el.style.setProperty）把它套用上去——CSSOM 不受 style-src 限制。
//
// 套用時機（盡量與原本的 style="..." 一樣「一出現就生效」）：
//   1. 頁面解析時：MutationObserver 在畫面繪製前處理
//   2. innerHTML／outerHTML／insertAdjacentHTML 寫入後立刻同步處理，
//      所以程式緊接著讀取 el.style.xxx 仍然拿得到模板設定的值
// 規則：模板的值只補上「元素還沒有」的屬性，不會蓋掉程式後來用 el.style 設定的值。
// 這個檔案必須放在 <head>，且要在 <body> 解析之前載入。
// ============================================================

const TimeFlowStyles = (function () {
    const ATTR = 'data-style';

    /** 把 "a:1; b:url(x;y); c:2 !important" 拆成宣告，容許括號與引號內的分號 */
    function parseDeclarations(text) {
        const out = [];
        let depth = 0;
        let quote = '';
        let start = 0;
        const flush = end => {
            const decl = text.slice(start, end).trim();
            start = end + 1;
            if (!decl) return;
            const idx = decl.indexOf(':');
            if (idx <= 0) return;
            let name = decl.slice(0, idx).trim();
            let value = decl.slice(idx + 1).trim();
            let priority = '';
            const imp = /\s*!\s*important\s*$/i.exec(value);
            if (imp) { priority = 'important'; value = value.slice(0, imp.index).trim(); }
            if (name && value) out.push([name, value, priority]);
        };
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (quote) { if (ch === quote && text[i - 1] !== '\\') quote = ''; continue; }
            if (ch === '"' || ch === "'") quote = ch;
            else if (ch === '(') depth++;
            else if (ch === ')') depth = Math.max(0, depth - 1);
            else if (ch === ';' && depth === 0) flush(i);
        }
        flush(text.length);
        return out;
    }

    const cache = new Map();

    function applyTo(el) {
        const text = el.getAttribute(ATTR);
        if (text === null || el.__tfStyleApplied === text) return;
        el.__tfStyleApplied = text;
        let decls = cache.get(text);
        if (!decls) {
            decls = parseDeclarations(text);
            if (cache.size < 2000) cache.set(text, decls);
        }
        for (const [name, value, priority] of decls) {
            // 已經有的屬性（例如程式剛設定過）不覆蓋
            if (el.style.getPropertyValue(name)) continue;
            el.style.setProperty(name, value, priority);
        }
    }

    function applyTree(root) {
        if (!root || root.nodeType !== 1 && root.nodeType !== 11 && root.nodeType !== 9) return;
        if (root.nodeType === 1 && root.hasAttribute(ATTR)) applyTo(root);
        if (root.querySelectorAll) root.querySelectorAll('[' + ATTR + ']').forEach(applyTo);
    }

    function init() {
        // 1. 解析頁面與其他 DOM 變更（微任務，早於下一次繪製）
        new MutationObserver(records => {
            for (const r of records) {
                if (r.type === 'attributes') applyTo(r.target);
                else r.addedNodes.forEach(n => { if (n.nodeType === 1) applyTree(n); });
            }
        }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: [ATTR] });

        // 2. 寫入 HTML 字串後同步處理
        const wrap = (proto, prop) => {
            const desc = Object.getOwnPropertyDescriptor(proto, prop);
            if (!desc || !desc.set) return;
            Object.defineProperty(proto, prop, {
                configurable: true,
                enumerable: desc.enumerable,
                get: desc.get,
                set(value) {
                    desc.set.call(this, value);
                    applyTree(prop === 'outerHTML' ? (this.parentNode || this) : this);
                }
            });
        };
        wrap(Element.prototype, 'innerHTML');
        wrap(Element.prototype, 'outerHTML');
        const origInsert = Element.prototype.insertAdjacentHTML;
        Element.prototype.insertAdjacentHTML = function (position, html) {
            origInsert.call(this, position, html);
            applyTree(position === 'beforebegin' || position === 'afterend' ? (this.parentNode || this) : this);
        };
    }

    return { init, applyTree, parseDeclarations };
})();

window.TimeFlowStyles = TimeFlowStyles;
TimeFlowStyles.init();
