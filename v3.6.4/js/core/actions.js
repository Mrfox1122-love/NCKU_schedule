// ============================================================
// 🧭 TimeFlow v3.6.4 — 宣告式事件處理 (actions.js)
// ------------------------------------------------------------
// 為了讓內容安全政策（CSP）可以拿掉 script-src 的 'unsafe-inline'，
// 畫面不再使用 onclick="..." 這類行內事件屬性，改寫成 data-onclick="..."。
// 瀏覽器不會把 data-* 當成程式碼執行；這個檔案在 document 上做事件委派，
// 用一個很小的語法解析器讀取 data-on* 的內容並呼叫對應的函式——
// 全程不使用 eval / new Function，所以不需要 'unsafe-eval'。
//
// 支援的寫法（涵蓋目前所有用法）：
//   fn(args)                      呼叫白名單內的全域函式
//   Obj.method(args)              呼叫白名單內的物件方法（例如 ModalManager.close('x')）
//   a(); b()                      多個敘述以分號分隔
//   return fn(event, this.href)   回傳 false 代表 preventDefault
//   event.stopPropagation()       / event.preventDefault()
//   document.getElementById('x').click()、document.querySelector('x')?.click()
//   window.print()
// 參數可以是：字串、數字、true / false / null、this、event、this.value / this.checked /
//   this.href、this.dataset.xxx、event.key、JSON.parse(...) 與其他白名單函式的呼叫結果。
// 其他寫法一律拒絕並在主控台報錯，不會被執行。
//
// 🛡️ 採「白名單」而非黑名單：只有 ALLOWED_CALLS 列出的函式可以被呼叫，
// 也只能讀取上面列出的那幾個屬性。即使將來某處漏了 escapeHTML 而被注入 HTML，
// 注入的 data-on* 也無法讀取資料、改寫屬性或呼叫名單外的函式。
// 新增事件處理函式時要把名稱加進 ALLOWED_CALLS（tests/actions.test.js 會檢查有沒有漏）。
// ============================================================

const TimeFlowActions = (function () {
    const EVENTS = ['click', 'change', 'input', 'keydown'];
    const BLOCKED_PROPS = new Set(['constructor', '__proto__', 'prototype', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__']);
    // 可以從 data-on* 呼叫的函式（依字母排序）
    const ALLOWED_CALLS = new Set([
        'DeptCombobox.selectCustom', 'DeptCombobox.selectDept', 'DeptCombobox.toggle', 'ModalManager.close',
        'addDiscoverToWishlist', 'addEnrollGroup', 'addEnrollOption', 'addGeToWishlist',
        'addNewSemester', 'addNewSlotItem', 'addWishlistToSchedule', 'applyEnrollCombo',
        'applyTransfer', 'autoGroupEnroll', 'calculateWhatIfTarget', 'cancelEdit',
        'clearAll', 'clearDiscoverSearch', 'clearQuickFindType', 'closeAddToSemesterModal',
        'closeBatchGradeModal', 'closeCourseDetail', 'closeCourseMap', 'closeDataSourceModal',
        'closeEnrollSim', 'closeExportFormatModal', 'closeFaqModal', 'closeGeRecommend',
        'closePrereqMap', 'closeProgramEditor', 'closeQuickFind', 'closeReport',
        'closeSettingsModal', 'closeSidebarDrawer', 'closeTermsModal', 'closeWhatIf',
        'closeWishlistCompare', 'compareAddToSchedule', 'convertTentativeToOfficial', 'deleteCurrentSemester',
        'deleteProgramFromEditor', 'deleteWishlistItem', 'exportData', 'exportReportExcel', 'exportSchedulePNG',
        'filterMasterProgramPicker', 'findCoursesFor', 'generateReportContent', 'handleBatchScoreInput',
        'handleCourseTypeChange', 'handleDiscoverSearch', 'handleExternalLinkClick', 'handleMoveCourseSemester',
        'handleTableRowClick', 'ignorePrereqFromButton', 'importData', 'moveEnrollOption',
        'navigateSemester', 'onCCEPCollegeChange', 'onCCEPTargetDeptChange', 'onMasterProgramSearchKey',
        'onQuickFindInput', 'openAddToSemesterModal', 'openBatchGradeModal', 'openCourseMap',
        'openDataSourceModal', 'openEnrollSim', 'openFaqModal', 'openGeRecommend',
        'openMobileEditor', 'openPrereqMap', 'openProgramEditor', 'openQuickFindInDiscover',
        'openReport', 'openSettingsModal', 'openTermsModal', 'openWhatIf',
        'openWhatIfModal', 'openWishlistCompare', 'pickMasterProgram', 'previewGrade',
        'processExportSchedule', 'quickFillAllGrades', 'quickResetAllGrades', 'removeEnrollGroup',
        'removeEnrollOption', 'removeSlotItem', 'renameEnrollGroup', 'renderWhatIf',
        'resetAllAppData', 'resetDiscoverFilters', 'resetEnrollExclude', 'restorePrereqFromButton',
        'saveBatchGrades', 'saveProgramEditor', 'saveToWishlistFromForm', 'selectPrereqNode',
        'setAppTheme', 'setCourseFrequency', 'setDegree', 'setDiscoverSource',
        'setGeFilter', 'setHidePrereqCheck', 'setQuickFindSource', 'setScheduleViewType',
        'setSlotItemDay', 'setSlotItemPeriod', 'setWhatIfMode', 'setWishlistFilter',
        'showCourseDetail', 'showDiscoverDetail', 'showMoreDiscoverResults', 'showMoreQuickFind',
        'showWishlistDetail', 'switchSemester', 'switchView', 'toggleChartDrawer',
        'toggleCompareItem', 'toggleCourseMapHidden', 'toggleEditorAdvanced', 'toggleEnglishThreshold',
        'toggleEnrollExclude', 'toggleEnrollOptional', 'toggleFaqAccordion', 'toggleGeConflicts',
        'toggleGradConfig', 'toggleMasterProgramPicker', 'toggleMasterRemedial', 'toggleNoScheduleInput',
        'togglePrivacyMode', 'toggleScoreInput', 'toggleSidebar', 'toggleThemeAccordion',
        'toggleViewOption', 'undoTransfer', 'updateAddToSemesterPrereqPreview', 'updateConfig',
        'updateCrossConfig', 'updateMasterConfig', 'updateMasterCustom'
    ]);
    // 觸發事件的元素（this）只能讀這幾個屬性，另外可讀 this.dataset.xxx
    const ELEMENT_PROPS = new Set(['value', 'checked', 'href']);
    const EVENT_PROPS = new Set(['key']);
    const EVENT_METHODS = new Set(['stopPropagation', 'preventDefault']);
    const DOCUMENT_LOOKUPS = new Set(['getElementById', 'querySelector']);
    // 從 document 取得的節點只允許這幾個方法（讓「點一下另一個元素」之類的寫法可用）
    const NODE_METHODS = new Set(['click', 'focus', 'select', 'blur']);

    const cache = new Map();

    // ---------- 詞法分析 ----------
    function tokenize(src) {
        const tokens = [];
        let i = 0;
        while (i < src.length) {
            const ch = src[i];
            if (/\s/.test(ch)) { i++; continue; }
            if (ch === '"' || ch === "'") {
                let j = i + 1;
                let value = '';
                while (j < src.length && src[j] !== ch) {
                    if (src[j] === '\\' && j + 1 < src.length) {
                        const next = src[j + 1];
                        value += ({ n: '\n', t: '\t', r: '\r' })[next] || next;
                        j += 2;
                    } else {
                        value += src[j++];
                    }
                }
                if (j >= src.length) throw new SyntaxError('字串沒有結尾');
                tokens.push({ type: 'str', value });
                i = j + 1;
                continue;
            }
            if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
                const m = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(src.slice(i));
                tokens.push({ type: 'num', value: parseFloat(m[0]) });
                i += m[0].length;
                continue;
            }
            if (/[A-Za-z_$]/.test(ch)) {
                const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
                tokens.push({ type: 'id', value: m[0] });
                i += m[0].length;
                continue;
            }
            if (src.startsWith('?.', i)) { tokens.push({ type: 'op', value: '?.' }); i += 2; continue; }
            if ('().,;-'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
            throw new SyntaxError(`不支援的字元「${ch}」`);
        }
        return tokens;
    }

    // ---------- 語法分析 ----------
    function parse(src) {
        if (cache.has(src)) return cache.get(src);
        const tokens = tokenize(src);
        let pos = 0;
        const peek = () => tokens[pos];
        const isOp = v => peek() && peek().type === 'op' && peek().value === v;
        const expectOp = v => {
            if (!isOp(v)) throw new SyntaxError(`預期「${v}」`);
            pos++;
        };

        function parseArgs() {
            const args = [];
            if (isOp(')')) { pos++; return args; }
            for (;;) {
                args.push(parseExpr());
                if (isOp(',')) { pos++; continue; }
                expectOp(')');
                return args;
            }
        }

        function parseExpr() {
            const t = peek();
            if (!t) throw new SyntaxError('運算式不完整');
            if (t.type === 'op' && t.value === '-') {
                pos++;
                const n = peek();
                if (!n || n.type !== 'num') throw new SyntaxError('負號後面只能接數字');
                pos++;
                return { kind: 'lit', value: -n.value };
            }
            if (t.type === 'str' || t.type === 'num') { pos++; return { kind: 'lit', value: t.value }; }
            if (t.type === 'id') {
                pos++;
                if (t.value === 'true') return { kind: 'lit', value: true };
                if (t.value === 'false') return { kind: 'lit', value: false };
                if (t.value === 'null') return { kind: 'lit', value: null };
                if (t.value === 'undefined') return { kind: 'lit', value: undefined };
                let node = { kind: 'id', name: t.value };
                for (;;) {
                    if (isOp('.') || isOp('?.')) {
                        const optional = peek().value === '?.';
                        pos++;
                        const name = peek();
                        if (!name || name.type !== 'id') throw new SyntaxError('「.」後面要接名稱');
                        pos++;
                        node = { kind: 'member', object: node, prop: name.value, optional };
                    } else if (isOp('(')) {
                        pos++;
                        node = { kind: 'call', callee: node, args: parseArgs() };
                    } else {
                        return node;
                    }
                }
            }
            throw new SyntaxError(`無法解析「${t.value}」`);
        }

        function parseStatement() {
            if (peek() && peek().type === 'id' && peek().value === 'return') {
                pos++;
                return { kind: 'return', expr: parseExpr() };
            }
            return { kind: 'expr', expr: parseExpr() };
        }

        const statements = [];
        while (pos < tokens.length) {
            if (isOp(';')) { pos++; continue; }
            statements.push(parseStatement());
            if (pos < tokens.length && !isOp(';')) throw new SyntaxError(`多餘的內容「${peek().value}」`);
        }
        if (statements.length === 0) throw new SyntaxError('內容是空的');
        cache.set(src, statements);
        return statements;
    }

    // ---------- 執行 ----------
    const isId = (node, name) => node && node.kind === 'id' && node.name === name;
    const deny = what => { throw new ReferenceError(`不允許使用 ${what}`); };

    function evalNode(node, ctx) {
        switch (node.kind) {
            case 'lit':
                return node.value;
            case 'id':
                if (node.name === 'this') return ctx.el;
                if (node.name === 'event') return ctx.event;
                return deny(node.name);
            case 'member':
                return readMember(node, ctx);
            case 'call':
                return callNode(node, ctx);
            default:
                throw new SyntaxError('未知的運算式');
        }
    }

    // 只允許：this.value / this.checked / this.href / this.dataset.xxx / event.key
    function readMember(node, ctx) {
        const { object, prop } = node;
        if (BLOCKED_PROPS.has(prop)) deny(prop);
        if (isId(object, 'this') && ELEMENT_PROPS.has(prop)) {
            return ctx.el == null ? undefined : ctx.el[prop];
        }
        if (object.kind === 'member' && isId(object.object, 'this') && object.prop === 'dataset') {
            const data = ctx.el && ctx.el.dataset;
            const value = data ? data[prop] : undefined;
            return typeof value === 'string' ? value : undefined;
        }
        if (isId(object, 'event') && EVENT_PROPS.has(prop)) {
            return ctx.event == null ? undefined : ctx.event[prop];
        }
        return deny(`.${prop}`);
    }

    function callNode(node, ctx) {
        const callee = node.callee;
        const evalArgs = () => node.args.map(a => evalNode(a, ctx));

        // fn(args)
        if (callee.kind === 'id') {
            if (!ctx.allow.has(callee.name)) deny(`${callee.name}()`);
            const fn = ctx.scope[callee.name];
            if (typeof fn !== 'function') throw new TypeError(`${callee.name} 不是函式`);
            return fn.apply(ctx.scope, evalArgs());
        }
        if (callee.kind !== 'member') throw new SyntaxError('不支援的呼叫方式');
        const { object, prop } = callee;
        if (BLOCKED_PROPS.has(prop)) deny(prop);

        if (object.kind === 'id') {
            // event.stopPropagation() / event.preventDefault()
            if (object.name === 'event') {
                if (!EVENT_METHODS.has(prop)) deny(`event.${prop}()`);
                return ctx.event[prop]();
            }
            // window.print()
            if (object.name === 'window') {
                if (prop !== 'print') deny(`window.${prop}()`);
                return ctx.scope.window.print();
            }
            // JSON.parse(字串)
            if (object.name === 'JSON') {
                if (prop !== 'parse' || node.args.length !== 1) deny(`JSON.${prop}()`);
                return JSON.parse(String(evalArgs()[0]));
            }
            if (object.name === 'this' || object.name === 'document') deny(`${object.name}.${prop}()`);
            // Obj.method(args)
            const name = `${object.name}.${prop}`;
            if (!ctx.allow.has(name)) deny(`${name}()`);
            const obj = ctx.scope[object.name];
            const fn = obj == null ? undefined : obj[prop];
            if (typeof fn !== 'function') throw new TypeError(`${name} 不是函式`);
            return fn.apply(obj, evalArgs());
        }

        // document.getElementById('x').click() / document.querySelector('x')?.click()
        if (object.kind === 'call' && object.callee.kind === 'member' && isId(object.callee.object, 'document')
            && DOCUMENT_LOOKUPS.has(object.callee.prop) && object.args.length === 1) {
            if (!NODE_METHODS.has(prop) || node.args.length !== 0) deny(`.${prop}()`);
            const selector = evalNode(object.args[0], ctx);
            if (typeof selector !== 'string') throw new TypeError('選擇器必須是字串');
            const target = ctx.scope.document[object.callee.prop](selector);
            if (target === null || target === undefined) {
                if (callee.optional) return undefined;
                throw new TypeError(`找不到元素，無法呼叫 ${prop}`);
            }
            return target[prop]();
        }
        return deny(`.${prop}()`);
    }

    /**
     * 執行一段 data-on* 內容，回傳 return 敘述的值；語法或執行錯誤會丟出例外。
     * @param {string} src
     * @param {{ el?: any, event?: any, scope?: object, allow?: Set<string> }} ctx allow 只供測試替換白名單
     */
    function execute(src, ctx) {
        const statements = parse(src);
        const context = { el: ctx.el, event: ctx.event, scope: ctx.scope || window, allow: ctx.allow || ALLOWED_CALLS };
        let returned;
        for (const st of statements) {
            const value = evalNode(st.expr, context);
            if (st.kind === 'return') { returned = value; break; }
        }
        return returned;
    }

    /** 列出內容中呼叫到的函式名稱（fn 或 Obj.method），供測試比對白名單 */
    function collectCalls(src) {
        const special = new Set(['this', 'event', 'document', 'window', 'JSON']);
        const calls = new Set();
        const walk = n => {
            if (!n) return;
            if (n.kind === 'member') walk(n.object);
            else if (n.kind === 'call') {
                const c = n.callee;
                if (c.kind === 'id') calls.add(c.name);
                else if (c.kind === 'member' && c.object.kind === 'id' && !special.has(c.object.name)) calls.add(`${c.object.name}.${c.prop}`);
                else walk(c);
                n.args.forEach(walk);
            }
        };
        parse(src).forEach(st => walk(st.expr));
        return Array.from(calls);
    }

    /** 列出內容中用到的最外層名稱（this／event 除外），供測試確認每個名稱都真的存在 */
    function collectRoots(src) {
        const roots = new Set();
        const walk = n => {
            if (!n) return;
            if (n.kind === 'id') { if (n.name !== 'this' && n.name !== 'event') roots.add(n.name); }
            else if (n.kind === 'member') walk(n.object);
            else if (n.kind === 'call') { walk(n.callee); n.args.forEach(walk); }
        };
        parse(src).forEach(st => walk(st.expr));
        return Array.from(roots);
    }

    // ---------- 事件委派 ----------
    function handle(event) {
        const attr = 'data-on' + event.type;
        // 先記下事件路徑，處理過程中即使畫面重繪也不影響
        const path = [];
        for (let el = event.target; el && el.nodeType === 1; el = el.parentElement) {
            if (el.hasAttribute(attr)) path.push(el);
        }
        for (const el of path) {
            try {
                const result = execute(el.getAttribute(attr), { el, event, scope: window });
                if (result === false) event.preventDefault();
            } catch (err) {
                console.error(`[TimeFlow] ${attr}="${el.getAttribute(attr)}" 執行失敗：`, err);
            }
            // 與原生行為一致：處理器呼叫 event.stopPropagation() 後，外層元素的處理器不再執行
            if (event.cancelBubble) break;
        }
    }

    function init() {
        EVENTS.forEach(type => document.addEventListener(type, handle));
    }

    return { init, parse, execute, collectRoots, collectCalls, EVENTS, ALLOWED_CALLS: Array.from(ALLOWED_CALLS) };
})();

window.TimeFlowActions = TimeFlowActions;
TimeFlowActions.init();
