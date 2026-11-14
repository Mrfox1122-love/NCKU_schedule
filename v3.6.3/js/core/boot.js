// ============================================================
// 🚀 TimeFlow v3.6.3 — 啟動腳本 (boot.js)
// ------------------------------------------------------------
// 放在 <head> 同步載入，原本是 index.html 內的行內 <script>。
// 移到外部檔案是為了讓 CSP 的 script-src 不需要 'unsafe-inline'。
// 1. 防點擊劫持：被放進別人的 iframe 時跳出；否則顯示頁面
// 2. 記憶主題即時載入，避免重新整理時閃一下預設色
// ============================================================

// 1. 防點擊劫持（Framebusting）
//    components.css 預設把 body 藏起來（html:not(.tf-top) body）；確定自己是最上層頁面才加上 tf-top。
//    被別人的 iframe 包住時頁面維持隱藏，並嘗試跳出。
if (self === top) {
    document.documentElement.classList.add('tf-top');
} else {
    top.location = self.location;
}

// 2. 主題防閃爍
(function() {
    var savedTheme = 'purple';
    try { savedTheme = localStorage.getItem('timeflow_theme') || 'purple'; } catch (e) {}
    // 「跟隨系統」：深色用夜幕紫、淺色用冰川晴空（app.js 會在系統切換時同步）
    if (savedTheme === 'auto') {
        savedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'glacier' : 'purple';
    }
    document.documentElement.dataset.theme = savedTheme;
})();
