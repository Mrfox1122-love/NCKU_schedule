// ============================================================
// 🚌 TimeFlow 命名空間、事件匯流排與狀態提交 (js/core/store.js)
// ============================================================
//
// 這支檔案在共用核心中很早載入，只依賴瀏覽器本身，不引用任何其他模組。
//
// 1. TimeFlow.expose(name, api)：功能模組在檔案最後宣告自己對外公開的函式。
//    公開的函式會放在 TimeFlow.<name>，並同時掛到 window 上，
//    讓 HTML 的 data-action 與尚未改寫的呼叫端照常運作。
//    沒有列在 expose 裡的函式與變數只在該模組內可見。
//
// 2. TimeFlowStore：資料變動後的唯一出口。
//    - commit()：存檔並通知畫面重繪（取代「saveData(); updateAppUI();」）
//    - refresh()：只通知畫面重繪，不存檔（取代單獨的 updateAppUI()）
//    - mutate(fn)：在 fn 內修改 appData，完成後自動 commit()
//    存檔方式由 data.js 透過 setPersister() 註冊、畫面重繪由 app.js 以 on('change') 訂閱，
//    因此功能模組不必再直接依賴最後才載入的 app.js。

const TimeFlow = (function () {
    const modules = {};

    return {
        modules,
        /**
         * 註冊模組的公開 API
         * @param {string} name 模組名稱，例如 'schedule'
         * @param {Object} api 公開的函式／物件
         */
        expose(name, api) {
            const target = modules[name] || (modules[name] = {});
            Object.keys(api).forEach(key => {
                target[key] = api[key];
                window[key] = api[key];
            });
            this[name] = target;
            return target;
        },

        /**
         * 公開模組內會被重新指派的變數（let），以 getter／setter 讓外部永遠讀到最新值
         * @param {string} name 模組名稱
         * @param {Object<string, {get: Function, set?: Function}>} props
         */
        exposeState(name, props) {
            const target = modules[name] || (modules[name] = {});
            Object.keys(props).forEach(key => {
                const desc = { get: props[key].get, set: props[key].set, configurable: true, enumerable: true };
                Object.defineProperty(target, key, desc);
                Object.defineProperty(window, key, desc);
            });
            this[name] = target;
            return target;
        }
    };
})();

const TimeFlowStore = (function () {
    const listeners = {};
    let persister = null;
    let stateGetter = () => null; // data.js 載入時以 setStateGetter() 註冊

    function emit(event, data) {
        (listeners[event] || []).slice().forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                // 單一訂閱者出錯不影響其他畫面更新
                console.error(`[TimeFlowStore] "${event}" 訂閱者發生錯誤:`, e);
            }
        });
    }

    return {
        /** 訂閱事件；回傳取消訂閱的函式 */
        on(event, callback) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(callback);
            return () => this.off(event, callback);
        },

        off(event, callback) {
            const list = listeners[event];
            if (!list) return;
            const idx = list.indexOf(callback);
            if (idx >= 0) list.splice(idx, 1);
        },

        emit,

        hasListeners(event) {
            return !!(listeners[event] && listeners[event].length);
        },

        /** data.js 註冊存檔函式 */
        setPersister(fn) {
            persister = fn;
        },

        /** data.js 註冊取得目前狀態的方式（appData 匯入時會整個換掉） */
        setStateGetter(fn) {
            stateGetter = fn;
        },

        getState() {
            return stateGetter();
        },

        /** 只存檔，不重繪；回傳是否成功 */
        save() {
            return persister ? persister() !== false : false;
        },

        /** 通知畫面依目前狀態重繪，不存檔 */
        refresh() {
            emit('change', stateGetter());
        },

        /** 存檔並通知畫面重繪；回傳存檔是否成功 */
        commit(saveToStorage = true) {
            const saved = saveToStorage ? this.save() : true;
            this.refresh();
            return saved;
        },

        /** 在 fn 內修改狀態，完成後自動 commit()；fn 回傳 false 代表沒有變更 */
        mutate(fn) {
            const result = fn(stateGetter());
            if (result === false) return false;
            this.commit();
            return result;
        },

        /** 更新指定學期的一門課程 */
        updateCourse(semester, courseId, updateFn) {
            const state = stateGetter();
            const courses = (state.semesters && state.semesters[semester]) || [];
            const target = courses.find(c => String(c.id) === String(courseId));
            if (!target) return false;
            updateFn(target);
            this.commit();
            return true;
        }
    };
})();

TimeFlow.store = TimeFlowStore;
window.TimeFlow = TimeFlow;
window.TimeFlowStore = TimeFlowStore;
