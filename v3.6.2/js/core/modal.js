// ============================================================
// 🪟 ModalManager 統一彈窗與抽屜控制器
// ============================================================

const MODAL_FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const MODAL_CLOSE_BTN = '.modal-close-btn, .close-drawer-btn';
let modalTitleSeq = 0;

const ModalManager = {
    activeModals: [],

    /** 目前畫面上看得到、可用鍵盤聚焦的元素 */
    getFocusable(root) {
        return Array.from(root.querySelectorAll(MODAL_FOCUSABLE))
            .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
    },

    /** 補上對話框語意：role=dialog、aria-modal、以標題命名 */
    setupDialog(el) {
        if (!el.getAttribute('role')) el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
            const title = el.querySelector('.modal-title, .settings-modal-title, h3, h2');
            if (title) {
                if (!title.id) title.id = `modalTitle${++modalTitleSeq}`;
                el.setAttribute('aria-labelledby', title.id);
            }
        }
    },

    /** 把鍵盤焦點移進對話框：優先第一個表單／操作元素，沒有才落在關閉鈕 */
    focusInside(el) {
        const items = this.getFocusable(el);
        const target = items.find(n => !n.matches(MODAL_CLOSE_BTN)) || items[0];
        if (target) {
            target.focus({ preventScroll: true });
        } else {
            el.setAttribute('tabindex', '-1');
            el.focus({ preventScroll: true });
        }
    },

    /**
     * 彈窗開啟時，把背景設成 inert：滑鼠以外的操作（Tab、螢幕閱讀器瀏覽）都碰不到背後的頁面。
     * 做法：從最上層彈窗往上走，把沿途每一層的「其他子元素」設成 inert；
     * 提示列（可能有「復原」按鈕）保持可用。
     */
    updateInert() {
        (this._inerted || []).forEach(n => n.removeAttribute('inert'));
        this._inerted = [];
        const top = this.activeModals[this.activeModals.length - 1];
        const el = top && document.getElementById(top.id);
        if (!el) return;
        for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
            const parent = node.parentElement;
            if (!parent) break;
            Array.from(parent.children).forEach(sib => {
                if (sib === node || sib.id === 'tfNotifyHost' || sib.tagName === 'SCRIPT' || sib.tagName === 'STYLE') return;
                if (!sib.hasAttribute('inert')) {
                    sib.setAttribute('inert', '');
                    this._inerted.push(sib);
                }
            });
        }
    },

    /** 關閉後把焦點還給開啟它的按鈕 */
    restoreFocus(entry) {
        this.updateInert(); // 先解除背景的 inert，焦點才回得去
        const opener = entry && entry.opener;
        if (opener && document.contains(opener) && typeof opener.focus === 'function') {
            opener.focus({ preventScroll: true });
        }
    },

    /**
     * 開啟指定彈窗或抽屜
     * @param {string} modalId 元素 ID
     * @param {string} activeClass 啟用類別（預設 'show'，如果是抽屜可傳 'open'）
     */
    open(modalId, activeClass = 'show') {
        const el = document.getElementById(modalId);
        if (!el) return;

        const opener = document.activeElement;
        el.classList.add(activeClass);
        this.setupDialog(el);
        // 疊開的彈窗（例如從課程地圖開找課、再開排入）依開啟順序堆疊，後開的在上層
        if (el.classList.contains('course-detail-overlay')) {
            el.style.setProperty('z-index', String(10000 + this.activeModals.length), 'important');
        }
        this.activeModals = this.activeModals.filter(m => m.id !== modalId);
        this.activeModals.push({ id: modalId, activeClass, opener: opener && opener !== document.body ? opener : null });
        document.body.style.overflow = 'hidden'; // 鎖定背景滾動
        this.updateInert();
        setTimeout(() => {
            // 只在這個彈窗仍是最上層時才搶焦點
            const top = this.activeModals[this.activeModals.length - 1];
            if (top && top.id === modalId && !el.contains(document.activeElement)) this.focusInside(el);
        }, 0);
    },

    /**
     * 關閉指定彈窗或關閉最上層彈窗
     * @param {string} [modalId] 若不傳則關閉最新開啟的彈窗
     */
    close(modalId) {
        if (!modalId) {
            const top = this.activeModals.pop();
            if (top) {
                const el = document.getElementById(top.id);
                if (el) {
                    el.classList.remove(top.activeClass);
                    el.style.removeProperty('z-index');
                }
                this.restoreFocus(top);
            }
        } else {
            const idx = this.activeModals.findIndex(m => m.id === modalId);
            if (idx !== -1) {
                const wasTop = idx === this.activeModals.length - 1;
                const target = this.activeModals.splice(idx, 1)[0];
                const el = document.getElementById(target.id);
                if (el) {
                    el.classList.remove(target.activeClass);
                    el.style.removeProperty('z-index');
                }
                if (wasTop) this.restoreFocus(target);
            } else {
                const el = document.getElementById(modalId);
                if (el) {
                    el.classList.remove('show', 'open');
                    el.style.removeProperty('z-index');
                }
            }
        }

        const drawerOverlay = document.getElementById('drawerOverlay');
        if (drawerOverlay && (!modalId || modalId === 'chartDrawer')) {
            drawerOverlay.classList.remove('show');
        }

        if (this.activeModals.length === 0) {
            document.body.style.overflow = ''; // 恢復背景滾動
        }
        this.updateInert();
        
    },

    /**
     * 關閉所有開啟中的彈窗（例如從彈窗跳到其他頁面時）
     */
    closeAll() {
        // 一路關到底，焦點只需回到最先開啟的那個按鈕
        const first = this.activeModals[0];
        while (this.activeModals.length) this.close();
        this.restoreFocus(first);
    },

    /**
     * 初始化全域事件（監聽 ESC 鍵與點擊遮罩關閉）
     */
    init() {
        // 監聽 ESC 鍵關閉最上層彈窗
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                this.close();
                return;
            }
            // Tab 焦點限制在最上層彈窗內循環，不會跑到背後的頁面
            if (e.key === 'Tab' && this.activeModals.length > 0) {
                const top = this.activeModals[this.activeModals.length - 1];
                const el = document.getElementById(top.id);
                if (!el) return;
                const items = this.getFocusable(el);
                if (items.length === 0) {
                    e.preventDefault();
                    return;
                }
                const first = items[0];
                const last = items[items.length - 1];
                const active = document.activeElement;
                if (!el.contains(active)) {
                    e.preventDefault();
                    first.focus();
                } else if (e.shiftKey && (active === first || active === el)) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }
};

window.ModalManager = ModalManager;
window.addEventListener('DOMContentLoaded', () => ModalManager.init());