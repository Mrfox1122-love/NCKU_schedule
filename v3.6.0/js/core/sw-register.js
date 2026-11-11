// ============================================================
// 📲 TimeFlow v3.6.0 — Service Worker 註冊與更新提示 (sw-register.js)
// ------------------------------------------------------------
// 原本是 index.html 內的行內 <script>，為了讓 CSP 不需要 'unsafe-inline' 而獨立成檔。
// ============================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 已有舊版 Service Worker 控制頁面時，新版接手代表有更新（第一次安裝不提示）
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hadController || !window.TimeFlowNotify) return;
            TimeFlowNotify.showBanner('sw-update', 'TimeFlow 已更新到新版本，重新整理後即可使用。', {
                type: 'success',
                actionLabel: '重新整理',
                onAction: () => location.reload()
            });
        });

        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('TimeFlow PWA Ready:', reg.scope);
                // 長時間開著的分頁每小時檢查一次新版
                setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
            })
            .catch(err => console.warn('PWA registration failed:', err));
    });
}
