// ============================================================
// 🛡️ Security Utils: XSS 防禦與字串清洗
// ============================================================

/**
 * HTML 字元實體編碼（僅用於字串要插入 HTML 內容或屬性時）
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
 * 安全 URL 驗證（僅回傳乾淨合法的原始 URL，不混用 HTML escape）
 */
function sanitizeURL(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    try {
        const parsed = new URL(trimmed);
        // 嚴格限制僅允許 http: 與 https: 協定
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch (e) {
        return '';
    }
    return '';
}

/**
 * 安全外部跳轉：針對非成大官方網域加入防釣魚確認
 */
function handleExternalLinkClick(e, rawUrl) {
    const safe = sanitizeURL(rawUrl);
    if (!safe) {
        e.preventDefault();
        alert("❌ 無效或不安全的網址連結！");
        return false;
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
                e.preventDefault();
                return false;
            }
        }
    } catch (err) {
        e.preventDefault();
        return false;
    }

    return true;
}

if (typeof window !== 'undefined') {
    window.escapeHTML = escapeHTML;
    window.sanitizeURL = sanitizeURL;
    window.handleExternalLinkClick = handleExternalLinkClick;
}