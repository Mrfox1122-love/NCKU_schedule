// ============================================================
// 🔔 TimeFlow v3.5.1 — 畫面底部提示列 (notify.js)
// ------------------------------------------------------------
// showToast：短暫訊息，可附一個動作按鈕（例如「復原」）
// showBanner：常駐訊息，需使用者按下按鈕或關閉（例如新版本、儲存失敗）
// ============================================================

const TimeFlowNotify = (function() {
    let toastTimer = null;

    function getHost() {
        let host = document.getElementById('tfNotifyHost');
        if (!host) {
            host = document.createElement('div');
            host.id = 'tfNotifyHost';
            host.className = 'tf-notify-host';
            host.setAttribute('role', 'status');
            host.setAttribute('aria-live', 'polite');
            document.body.appendChild(host);
        }
        return host;
    }

    function build(message, opts, closeFn) {
        const el = document.createElement('div');
        el.className = `tf-notify tf-notify-${opts.type || 'info'}`;

        const text = document.createElement('span');
        text.className = 'tf-notify-text';
        text.textContent = message;
        el.appendChild(text);

        if (opts.actionLabel && typeof opts.onAction === 'function') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tf-notify-action';
            btn.textContent = opts.actionLabel;
            btn.addEventListener('click', () => {
                closeFn();
                opts.onAction();
            });
            el.appendChild(btn);
        }

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'tf-notify-close';
        close.setAttribute('aria-label', '關閉');
        close.textContent = '✕';
        close.addEventListener('click', closeFn);
        el.appendChild(close);
        return el;
    }

    /**
     * 短暫提示；同時只顯示一則，新的會取代舊的
     * @param {string} message
     * @param {{ type?: 'info'|'success'|'warning'|'danger', actionLabel?: string, onAction?: Function, duration?: number }} opts
     */
    function showToast(message, opts = {}) {
        const host = getHost();
        host.querySelectorAll('.tf-notify-toast').forEach(n => n.remove());
        clearTimeout(toastTimer);

        const closeFn = () => { clearTimeout(toastTimer); el.remove(); };
        const el = build(message, opts, closeFn);
        el.classList.add('tf-notify-toast');
        host.appendChild(el);
        toastTimer = setTimeout(closeFn, opts.duration || 5000);
    }

    /**
     * 常駐提示；相同 key 只會顯示一則
     * @param {string} key
     * @param {string} message
     * @param {{ type?: string, actionLabel?: string, onAction?: Function }} opts
     */
    function showBanner(key, message, opts = {}) {
        const host = getHost();
        if (host.querySelector(`[data-banner="${key}"]`)) return;
        const closeFn = () => el.remove();
        const el = build(message, opts, closeFn);
        el.dataset.banner = key;
        host.prepend(el);
    }

    return { showToast, showBanner };
})();

window.TimeFlowNotify = TimeFlowNotify;
window.showToast = TimeFlowNotify.showToast;
