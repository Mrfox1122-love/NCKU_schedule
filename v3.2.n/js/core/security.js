// ============================================================
// 🛡️ Security Utils: XSS 防禦與字串清洗
// ============================================================

/**
 * HTML 字元實體編碼（防止 HTML Injection / XSS）
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 安全 URL 驗證（僅允許 http:// 與 https://，阻擋 javascript: 與 data: 偽協定）
 */
function sanitizeURL(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    // 嚴格限制僅能以 http:// 或 https:// 開頭
    if (/^https?:\/\//i.test(trimmed)) {
        return escapeHTML(trimmed);
    }
    return ''; // 若包含 javascript: 等不安全協定則直接抹除
}

/**
 * 安全外部跳轉：針對非成大官方網域加入防釣魚確認
 */
function safeOpenExternalURL(url) {
    const safe = sanitizeURL(url);
    if (!safe) {
        alert("❌ 無效或不安全的網址連結！");
        return;
    }

    try {
        const parsed = new URL(safe);
        const host = parsed.hostname.toLowerCase();
        const isNckuDomain = host === 'ncku.edu.tw' || host.endsWith('.ncku.edu.tw');

        // 若非成大官方網域，彈出安全警告
        if (!isNckuDomain) {
            const warningMsg = `⚠️【安全外跳提醒】\n\n` +
                               `您即將前往非成大官方網域的外部網站：\n${safe}\n\n` +
                               `• 請留意該網頁是否為仿冒網站。\n` +
                               `• 切勿在不明外部網站輸入成大成功入口、Portal 或 Moodle 的帳號密碼。\n\n` +
                               `確定要繼續前往嗎？`;

            if (!confirm(warningMsg)) {
                return;
            }
        }

        window.open(safe, '_blank', 'noopener,noreferrer');
    } catch (e) {
        window.open(safe, '_blank', 'noopener,noreferrer');
    }
}

if (typeof window !== 'undefined') {
    window.safeOpenExternalURL = safeOpenExternalURL;
}