// ============================================================
// 🪟 ModalManager 統一彈窗與抽屜控制器
// ============================================================

const ModalManager = {
    activeModals: [],

    /**
     * 開啟指定彈窗或抽屜
     * @param {string} modalId 元素 ID
     * @param {string} activeClass 啟用類別（預設 'show'，如果是抽屜可傳 'open'）
     */
    open(modalId, activeClass = 'show') {
        const el = document.getElementById(modalId);
        if (!el) return;

        el.classList.add(activeClass);
        // 疊開的彈窗（例如從課程地圖開找課、再開排入）依開啟順序堆疊，後開的在上層
        if (el.classList.contains('course-detail-overlay')) {
            el.style.setProperty('z-index', String(10000 + this.activeModals.length), 'important');
        }
        this.activeModals = this.activeModals.filter(m => m.id !== modalId);
        this.activeModals.push({ id: modalId, activeClass });
        document.body.style.overflow = 'hidden'; // 鎖定背景滾動
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
            }
        } else {
            const idx = this.activeModals.findIndex(m => m.id === modalId);
            if (idx !== -1) {
                const target = this.activeModals.splice(idx, 1)[0];
                const el = document.getElementById(target.id);
                if (el) {
                    el.classList.remove(target.activeClass);
                    el.style.removeProperty('z-index');
                }
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
        
    },

    /**
     * 關閉所有開啟中的彈窗（例如從彈窗跳到其他頁面時）
     */
    closeAll() {
        while (this.activeModals.length) this.close();
    },

    /**
     * 初始化全域事件（監聽 ESC 鍵與點擊遮罩關閉）
     */
    init() {
        // 監聽 ESC 鍵關閉最上層彈窗
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                this.close();
            }
        });
    }
};

window.ModalManager = ModalManager;
window.addEventListener('DOMContentLoaded', () => ModalManager.init());