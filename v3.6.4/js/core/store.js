// ============================================================
// 🚌 TimeFlow Event Bus & State Store (js/core/store.js)
// ============================================================

const TimeFlowStore = (function() {
    const listeners = {};

    return {
        /**
         * 訂閱事件
         */
        on(event, callback) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(callback);
        },

        /**
         * 發布事件
         */
        emit(event, data) {
            if (listeners[event]) {
                listeners[event].forEach(cb => cb(data));
            }
        },

        /**
         * 統一寫入 LocalStorage 並觸發全域 UI 重新渲染
         */
        commit(saveToStorage = true) {
            if (saveToStorage && typeof saveData === 'function') {
                saveData();
            }
            if (typeof updateAppUI === 'function') {
                updateAppUI();
            }
            this.emit('STATE_CHANGED', appData);
        },

        /**
         * 更新單一學期的特定課程
         */
        updateCourse(semester, courseId, updateFn) {
            const courses = appData.semesters[semester] || [];
            const target = courses.find(c => String(c.id) === String(courseId));
            if (target) {
                updateFn(target);
                this.commit();
            }
        }
    };
})();

window.TimeFlowStore = TimeFlowStore;