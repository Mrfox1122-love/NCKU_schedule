// ============================================================
// ♿ TimeFlow v3.6.2 — 無障礙輔助 (a11y.js)
// ------------------------------------------------------------
// 1. 讓用 div / span / td 做的「可點擊元素」也能用鍵盤操作（Tab 聚焦、Enter／空白鍵觸發）
//    並補上 role="button"，螢幕閱讀器才會當成按鈕唸出來。
//    舊程式碼大量使用 onclick，這裡集中處理，不必逐一改動各模組的畫面模板。
// 2. 目前所在的頁面（側欄）標上 aria-current。
// 3. 只有符號的按鈕補上 aria-label（模板動態產生的也會處理）。
// 彈窗的焦點管理與 Tab 循環在 modal.js。
// ============================================================

const TimeFlowA11y = (function () {
    // 原生就能鍵盤操作的元素，不需處理
    const NATIVE = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|OPTION)$/;
    // 背景遮罩這類「點一下關閉」的容器不應該被 Tab 聚焦
    const SKIP_CLASS = /overlay|backdrop/i;

    function isClickable(el) {
        if (NATIVE.test(el.tagName)) return false;
        if (!el.hasAttribute('data-onclick')) return false;
        if (SKIP_CLASS.test(el.getAttribute('class') || '')) return false;
        // 只負責擋住事件冒泡的容器（例如彈窗卡片）不是按鈕
        if (/^\s*event\.stopPropagation\(\)\s*;?\s*$/.test(el.getAttribute('data-onclick'))) return false;
        return true;
    }

    function enhance(el) {
        if (el.dataset.a11y === '1') return;
        el.dataset.a11y = '1';
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    }

    function labelIconButtons(root) {
        root.querySelectorAll('button:not([aria-label])').forEach(btn => {
            const text = (btn.textContent || '').trim();
            if (btn.title) {
                btn.setAttribute('aria-label', btn.title);
            } else if (/^[✕×✖]$/.test(text)) {
                btn.setAttribute('aria-label', '關閉');
            }
        });
    }

    function scan(root) {
        const base = root && root.querySelectorAll ? root : document;
        base.querySelectorAll('[data-onclick]').forEach(el => {
            if (isClickable(el)) enhance(el);
        });
        labelIconButtons(base);
        syncAccordions(base);
        markCurrentPage();
    }

    // 手風琴（可展開收合的標題）：標題的展開狀態由另一個元素的 class 決定，這裡同步成 aria-expanded
    const ACCORDIONS = [
        { header: '.tf-accordion-item', state: h => h, expanded: s => s.classList.contains('open') },
        { header: '.editor-accordion-header', state: () => document.querySelector('.editor-accordion-container'), expanded: s => s.classList.contains('open') },
        { header: '.config-toggle-header', state: () => document.getElementById('gradConfigArea'), expanded: s => !s.classList.contains('collapsed') },
        { header: '.settings-accordion-header', state: () => document.getElementById('themeAccordionBody'), expanded: s => !s.classList.contains('collapsed') }
    ];

    function syncAccordions(root) {
        ACCORDIONS.forEach(acc => {
            root.querySelectorAll(acc.header).forEach(h => {
                const stateEl = acc.state(h);
                if (!stateEl) return;
                h.setAttribute('aria-expanded', acc.expanded(stateEl) ? 'true' : 'false');
            });
        });
    }

    function markCurrentPage() {
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.classList.contains('active')) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
        });
    }

    function onKeydown(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target;
        if (!el || el.dataset === undefined || el.dataset.a11y !== '1') return;
        // 輸入框內的空白鍵不攔截
        if (el.isContentEditable) return;
        e.preventDefault();
        el.click();
    }

    let scheduled = false;
    function scheduleScan() {
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => {
            scheduled = false;
            scan(document);
        }, 0);
    }

    function init() {
        scan(document);
        document.addEventListener('keydown', onKeydown);
        // 畫面是由 JS 動態渲染的，內容或 class 改變後重新掃描（以 rAF 合併）
        new MutationObserver(scheduleScan).observe(document.body, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['class']
        });
    }

    /**
     * 把以 JS 指派 onclick 的元素（課表格子、課程卡片）變成可用鍵盤操作的按鈕
     */
    function makeButton(el, label) {
        enhance(el);
        if (label) el.setAttribute('aria-label', label);
        return el;
    }

    return { init, scan, isClickable, makeButton, syncAccordions };
})();

window.TimeFlowA11y = TimeFlowA11y;
window.addEventListener('DOMContentLoaded', () => TimeFlowA11y.init());
