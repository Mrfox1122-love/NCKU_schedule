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