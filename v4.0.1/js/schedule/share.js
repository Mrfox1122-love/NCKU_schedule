// ============================================================
// 🔗 TimeFlow v4.0.1 — 分享課表連結與 QR code (share.js)
// ------------------------------------------------------------
// 把一個學期的課表壓縮後放進網址的 #share=...，不經過任何伺服器。
// 對方開啟連結時先看預覽，再自己選擇要不要匯入、匯入到哪個學期。
// 分享內容只有課名、時段、教師、教室、學分與類別；不含成績、修課狀態與備註。
// ============================================================

(function () {
const SHARE_VERSION = 1;
const SHARE_HASH_PREFIX = '#share=';
const MAX_SHARE_COURSES = 40;
const MAX_SHARE_TEXT = 8000;      // 解碼前的字串長度上限，避免惡意的超長連結
const QR_MAX_URL = 2200;          // 超過這個長度的網址 QR code 太密，手機不好掃
const FREQ_FLAG = { odd: 4, even: 8 };

let pendingShare = null;          // 預覽中的分享內容 { semester, dept, courses }

// ── 課程 ↔ 精簡陣列 ─────────────────────────────────────────

/** 時段 [{day:1, periods:['2','3']}] → "1:23;3:56" */
function packSlots(slots) {
    return (slots || [])
        .filter(s => s && s.day && Array.isArray(s.periods) && s.periods.length)
        .map(s => `${s.day}:${s.periods.join('')}`)
        .join(';');
}

/** "1:23;3:56" → [{day:1, periods:['2','3']}, ...]；非法字元交給 normalizeCourseData 過濾 */
function unpackSlots(text) {
    if (typeof text !== 'string' || !text) return [];
    return text.split(';').slice(0, 14).map(part => {
        const [day, periods] = part.split(':');
        return { day: parseInt(day, 10), periods: String(periods || '').slice(0, 14).split('') };
    });
}

/**
 * 一門課 → 精簡陣列（欄位順序固定，結尾的空值會被截掉以縮短網址）
 * [名稱, 學分, 類別, 顏色(去掉#), 教師, 教室, 時段, 旗標, 課號, 開課系所, 系號-序號, 課程資料id]
 */
function packCourse(c) {
    let flags = 0;
    if (c.isTentative) flags |= 1;
    if (c.isNoSchedule) flags |= 2;
    if (FREQ_FLAG[c.frequency]) flags |= FREQ_FLAG[c.frequency];
    const row = [
        c.name || '', Number(c.credits) || 0, c.type || '', String(c.color || '').replace(/^#/, ''),
        c.teacher || '', c.room || '', packSlots(c.slots), flags,
        c.code || '', c.dept || '', c.deptSeq || '', c.catalogId || ''
    ];
    while (row.length > 7 && (row[row.length - 1] === '' || row[row.length - 1] === 0)) row.pop();
    return row;
}

/** 精簡陣列 → 經過 normalizeCourseData 清洗的課程；格式不對回傳 null */
function unpackCourse(row) {
    if (!Array.isArray(row) || typeof row[0] !== 'string' || !row[0].trim()) return null;
    const str = v => (typeof v === 'string' ? v : '');
    const flags = Number.isInteger(row[7]) ? row[7] : 0;
    const course = normalizeCourseData({
        name: row[0],
        credits: row[1],
        type: str(row[2]),
        color: str(row[3]) ? `#${str(row[3])}` : '',
        teacher: str(row[4]),
        room: str(row[5]),
        slots: unpackSlots(row[6]),
        isTentative: !!(flags & 1),
        isNoSchedule: !!(flags & 2),
        frequency: (flags & 4) ? 'odd' : ((flags & 8) ? 'even' : 'weekly'),
        code: str(row[8]),
        dept: str(row[9]),
        deptSeq: str(row[10]),
        catalogId: str(row[11]),
        status: '修讀中',
        score: null
    });
    return course;
}

/** 某學期 → 分享用的物件 */
function buildSharePayload(semester, data) {
    const src = data || appData;
    const courses = (src.semesters && src.semesters[semester]) || [];
    return {
        v: SHARE_VERSION,
        s: String(semester || ''),
        d: typeof src.deptName === 'string' ? src.deptName.slice(0, 40) : '',
        c: courses.slice(0, MAX_SHARE_COURSES).map(packCourse)
    };
}

/** 分享物件 → { semester, dept, courses }；格式不對丟出錯誤 */
function parseSharePayload(obj) {
    if (!obj || typeof obj !== 'object' || obj.v !== SHARE_VERSION || !Array.isArray(obj.c)) {
        throw new Error('這不是 TimeFlow 的分享連結，或是由較新的版本產生。');
    }
    const courses = obj.c.slice(0, MAX_SHARE_COURSES).map(unpackCourse).filter(Boolean);
    if (!courses.length) throw new Error('分享的課表裡沒有課程。');
    return {
        semester: typeof obj.s === 'string' ? obj.s.slice(0, 10) : '',
        dept: typeof obj.d === 'string' ? obj.d.slice(0, 40) : '',
        courses
    };
}

// ── 字串編碼（base64url + 壓縮）──────────────────────────────

function bytesToBase64Url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text) {
    if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('連結內容有不允許的字元。');
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function pipeThrough(bytes, stream, maxBytes = Infinity) {
    const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
    const chunks = [];
    let total = 0;
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!value || !value.byteLength) continue;
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel().catch(() => {});
                throw new Error('分享內容太大。');
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
        out.set(c, offset);
        offset += c.byteLength;
    }
    return out;
}

function hasCompression() {
    return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
}

/** 物件 → 網址用字串。z 開頭是 deflate 壓縮，j 開頭是未壓縮（舊瀏覽器） */
async function encodeShare(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (hasCompression()) {
        return 'z' + bytesToBase64Url(await pipeThrough(raw, new CompressionStream('deflate-raw')));
    }
    return 'j' + bytesToBase64Url(raw);
}

async function decodeShare(text) {
    if (typeof text !== 'string' || text.length < 2 || text.length > MAX_SHARE_TEXT) {
        throw new Error('連結不完整或太長，請確認有複製到整段網址。');
    }
    let bytes = base64UrlToBytes(text.slice(1));
    if (text[0] === 'z') {
        if (!hasCompression()) throw new Error('這個瀏覽器太舊，無法開啟分享連結，請改用新版瀏覽器。');
        bytes = await pipeThrough(bytes, new DecompressionStream('deflate-raw'), 64 * 1024);
    } else if (text[0] !== 'j') {
        throw new Error('無法辨識的分享連結格式。');
    }
    let obj;
    try {
        obj = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
        throw new Error('連結內容損毀，請確認有複製到整段網址。');
    }
    return parseSharePayload(obj);
}

function getBaseUrl() {
    return location.href.split('#')[0];
}

// ── 分享彈窗（產生連結與 QR code）────────────────────────────

async function openShareModal() {
    const sem = appData.currentSemester;
    const courses = (appData.semesters[sem] || []);
    if (!courses.length) {
        showToast(`【${sem}】還沒有課程，排好課再分享。`, { type: 'warning' });
        return;
    }
    const body = document.getElementById('shareModalBody');
    document.getElementById('shareModalTitle').textContent = `分享【${sem}】課表`;
    body.innerHTML = '<div class="master-muted">產生連結中…</div>';
    ModalManager.open('shareModal');

    let url;
    try {
        url = getBaseUrl() + SHARE_HASH_PREFIX + await encodeShare(buildSharePayload(sem));
    } catch (e) {
        body.innerHTML = `<div class="master-callout warning">無法產生分享連結：${escapeHTML(e.message || String(e))}</div>`;
        return;
    }

    let qrHtml = '';
    if (url.length <= QR_MAX_URL && typeof qrcode === 'function') {
        try {
            const qr = qrcode(0, 'L');
            qr.addData(url);
            qr.make();
            qrHtml = `<div class="tf-share-qr" role="img" aria-label="分享連結的 QR code">${qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true })}</div>`;
        } catch (e) {
            qrHtml = '';
        }
    }
    if (!qrHtml) {
        qrHtml = '<div class="master-callout info">這學期的課比較多，連結太長放不進 QR code，請直接傳連結。</div>';
    }

    const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    body.innerHTML = `
        ${qrHtml}
        <p class="tf-share-note">對方用手機掃描或開啟連結，會先看到課表預覽，再自己決定要不要匯入。分享內容是 ${courses.length > MAX_SHARE_COURSES ? MAX_SHARE_COURSES : courses.length} 門課的課名、時段、教師、教室與學分，<b>不含成績與備註</b>。資料直接放在網址裡，不會上傳到任何伺服器。</p>
        <div class="tf-share-link-row">
            <input type="text" id="shareLinkInput" class="modern-input" readonly value="${escapeHTML(url)}" aria-label="分享連結">
        </div>
        <div class="tf-share-actions">
            <button type="button" class="tf-btn tf-btn-primary" data-onclick="copyShareLink()">複製連結</button>
            ${canNativeShare ? '<button type="button" class="tf-btn tf-btn-secondary" data-onclick="nativeShareLink()">傳送到其他 App</button>' : ''}
        </div>`;
}

function closeShareModal(e) {
    if (e && e.target !== e.currentTarget) return;
    ModalManager.close('shareModal');
}

async function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    if (!input) return;
    try {
        await navigator.clipboard.writeText(input.value);
        showToast('已複製分享連結', { type: 'success' });
    } catch (e) {
        input.focus();
        input.select();
        showToast('無法自動複製，連結已選取，請手動複製。', { type: 'warning' });
    }
}

async function nativeShareLink() {
    const input = document.getElementById('shareLinkInput');
    if (!input || typeof navigator.share !== 'function') return;
    try {
        await navigator.share({ title: `TimeFlow 課表：${appData.currentSemester}`, url: input.value });
    } catch (e) {
        // 使用者取消分享，不需處理
    }
}

// ── 開啟分享連結：預覽與匯入 ─────────────────────────────────

function formatSlots(course) {
    if (course.isNoSchedule || !course.slots.length) return '無固定時間';
    const freq = course.frequency === 'odd' ? '（單週）' : (course.frequency === 'even' ? '（雙週）' : '');
    return course.slots.map(s => `週${dayNames[s.day]} ${s.periods.join('')}`).join('、') + freq;
}

function renderSharePreview(share) {
    const rows = share.courses.map(c => `
        <li class="tf-share-row">
            <span class="tf-share-dot" data-style="background:${escapeHTML(c.color)};"></span>
            <div class="tf-share-row-main">
                <b>${escapeHTML(c.name)}</b>${c.isTentative ? ' <span class="tf-badge tf-badge-neutral">暫定</span>' : ''}
                <span class="master-muted">${escapeHTML(formatSlots(c))} · ${c.credits} 學分${c.teacher ? ' · ' + escapeHTML(c.teacher) : ''}${c.room ? ' · ' + escapeHTML(c.room) : ''}</span>
            </div>
        </li>`).join('');

    const order = appData.semesterOrder || Object.keys(appData.semesters || {});
    const defaultSem = order.includes(share.semester) ? share.semester : appData.currentSemester;
    const options = order.map(s => `<option value="${escapeHTML(s)}"${s === defaultSem ? ' selected' : ''}>${escapeHTML(s)}</option>`).join('');
    const totalCredits = share.courses.filter(c => !c.isTentative).reduce((sum, c) => sum + (Number(c.credits) || 0), 0);

    document.getElementById('sharePreviewTitle').textContent = `收到分享的課表${share.semester ? '：' + share.semester : ''}`;
    document.getElementById('sharePreviewBody').innerHTML = `
        <p class="tf-share-note">${share.dept ? escapeHTML(share.dept) + ' · ' : ''}${share.courses.length} 門課 · 共 ${totalCredits} 學分。匯入前不會改動你的課表。</p>
        <ul class="tf-share-list">${rows}</ul>
        <div class="tf-share-import-row">
            <label for="shareTargetSem">匯入到</label>
            <select id="shareTargetSem" class="modern-select">${options}</select>
        </div>
        <p class="tf-share-note">已經排在該學期的同一門課會略過。課程類別沿用分享者的分類，匯入後可以點課程修改。</p>`;
}

function openSharePreview(share) {
    pendingShare = share;
    renderSharePreview(share);
    ModalManager.open('sharePreviewModal');
}

function clearShareHash() {
    if (location.hash.startsWith(SHARE_HASH_PREFIX) && history.replaceState) {
        history.replaceState(null, '', getBaseUrl());
    }
}

function closeSharePreview(e) {
    if (e && e.target !== e.currentTarget) return;
    ModalManager.close('sharePreviewModal');
    pendingShare = null;
    clearShareHash();
}

/** 把分享的課加入指定學期，回傳 { added, skipped } */
function importShareInto(share, targetSem) {
    if (!appData.semesters[targetSem]) appData.semesters[targetSem] = [];
    if (!appData.semesterOrder.includes(targetSem)) appData.semesterOrder.push(targetSem);
    const list = appData.semesters[targetSem];
    let added = 0;
    let skipped = 0;
    let seq = 0;
    share.courses.forEach(c => {
        const dup = typeof isCourseAlreadyInSemester === 'function'
            ? isCourseAlreadyInSemester(c, targetSem)
            : list.some(x => x.name === c.name && packSlots(x.slots) === packSlots(c.slots));
        if (dup) { skipped++; return; }
        list.push({ ...c, id: Date.now() * 100 + (seq++) });
        added++;
    });
    return { added, skipped };
}

function confirmShareImport() {
    if (!pendingShare) return;
    const select = document.getElementById('shareTargetSem');
    const targetSem = select ? select.value : appData.currentSemester;
    if (!targetSem) return;
    const before = (appData.semesters[targetSem] || []).map(c => c.id);
    const { added, skipped } = importShareInto(pendingShare, targetSem);
    appData.currentSemester = targetSem;
    ModalManager.close('sharePreviewModal');
    pendingShare = null;
    clearShareHash();
    TimeFlowStore.commit();
    if (typeof switchView === 'function') switchView('plan');

    const msg = `已匯入 ${added} 門課到【${targetSem}】` + (skipped ? `，${skipped} 門已存在所以略過` : '');
    showToast(msg, {
        type: 'success',
        actionLabel: added ? '復原' : undefined,
        onAction: added ? () => {
            const keep = new Set(before);
            appData.semesters[targetSem] = appData.semesters[targetSem].filter(c => keep.has(c.id));
            TimeFlowStore.commit();
        } : undefined
    });
}

/** 網址帶有 #share= 時開啟預覽 */
async function checkShareHash() {
    if (typeof location === 'undefined' || !location.hash || !location.hash.startsWith(SHARE_HASH_PREFIX)) return;
    try {
        const share = await decodeShare(location.hash.slice(SHARE_HASH_PREFIX.length));
        // 等新手引導等其他彈窗先開好，預覽疊在最上層
        setTimeout(() => openSharePreview(share), 300);
    } catch (e) {
        clearShareHash();
        showToast(`無法開啟分享連結：${e.message || e}`, { type: 'danger' });
    }
}

document.addEventListener('DOMContentLoaded', () => { checkShareHash(); });
if (typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', () => { checkShareHash(); });
}

// ── 對外公開（其他模組、HTML data-action、測試使用）；其餘名稱只在本模組內可見 ──
TimeFlow.expose('share', {
    packCourse, unpackCourse, packSlots, unpackSlots, buildSharePayload, parseSharePayload,
    encodeShare, decodeShare, importShareInto,
    openShareModal, closeShareModal, copyShareLink, nativeShareLink,
    closeSharePreview, confirmShareImport, checkShareHash
});
})();
