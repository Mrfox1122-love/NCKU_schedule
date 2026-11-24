'use strict';
// 本次全專案盤點修復項目的回歸測試
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadApp, listScripts, makeStorage, ROOT } = require('./helpers/load');

describe('prereq-map：先修循環防護', () => {
    test('findLongestPrereqChain 遇到先修環不會無限迴圈', () => {
        const app = loadApp();
        app.run(`
            const a = { key: 'A', depth: 1, preds: new Set(['B']) };
            const b = { key: 'B', depth: 2, preds: new Set(['A']) };
            const c = { key: 'C', depth: 3, preds: new Set(['B']) };
            globalThis.__cycleGraph = { nodes: new Map([['A', a], ['B', b], ['C', c]]) };
        `);
        const chain = Array.from(app.run('findLongestPrereqChain(__cycleGraph).map(n => n.key)'));
        assert.deepEqual(chain, ['A', 'B', 'C']);
    });
});

describe('report-xlsx：每列保留學期名稱以支援自動篩選', () => {
    test('exportReportExcel 產出的成績總表每一列都帶有學期', async () => {
        const app = loadApp();
        let capturedBlob = null;
        const fakeAnchor = {
            href: '',
            download: '',
            click() {},
            remove() {}
        };
        app.ctx.Blob = Blob;
        app.ctx.Uint8Array = Uint8Array;
        app.ctx.TextEncoder = TextEncoder;
        app.ctx.URL = {
            createObjectURL(blob) { capturedBlob = blob; return 'blob:test'; },
            revokeObjectURL() {}
        };
        app.ctx.document.createElement = tag => (tag === 'a' ? fakeAnchor : {});
        app.ctx.document.body.appendChild = () => {};

        app.run(`
            appData.semesterOrder = ['一上'];
            appData.semesters['一上'] = [
                normalizeCourseData({ id: 1, name: '微積分(一)', type: '系定必修', credits: 4, status: '已取得', score: 88 }),
                normalizeCourseData({ id: 2, name: '計算機概論', type: '系定必修', credits: 3, status: '修讀中', score: null })
            ];
            exportReportExcel();
        `);

        assert.ok(capturedBlob, '應產生 Excel Blob');
        const zipText = Buffer.from(await capturedBlob.arrayBuffer()).toString('utf8');
        const semMatches = zipText.match(/<t xml:space="preserve">一上<\/t>/g) || [];
        // 成績總表有 2 門課（應該各自帶有「一上」），加上統計表合計應 >= 3 次
        assert.ok(semMatches.length >= 3, `同一學期第 2 門課不應清空學期欄，實際出現 ${semMatches.length} 次`);
    });
});

describe('modal：單調遞增 z-index 與 closeAll', () => {
    test('重開與交錯關閉後 z-index 維持遞增，closeAll 一次清空', () => {
        const makeOverlay = id => {
            const props = new Map();
            const classes = new Set(['course-detail-overlay']);
            return {
                id,
                classList: {
                    add: c => classes.add(c),
                    remove: c => classes.delete(c),
                    contains: c => classes.has(c)
                },
                style: {
                    setProperty: (k, v) => props.set(k, String(v)),
                    removeProperty: k => props.delete(k),
                    getPropertyValue: k => props.get(k) || ''
                },
                getAttribute: () => null,
                setAttribute() {},
                hasAttribute: () => true,
                querySelector: () => null,
                querySelectorAll: () => [],
                contains: () => false,
                parentElement: null
            };
        };

        const els = { a: makeOverlay('a'), b: makeOverlay('b'), c: makeOverlay('c') };
        let focusCalls = 0;
        const opener = { focus() { focusCalls++; } };

        const ctx = vm.createContext({
            window: null,
            setTimeout: () => 0,
            addEventListener() {},
            getComputedStyle: () => ({ visibility: 'visible' }),
            document: {
                activeElement: opener,
                body: { style: { overflow: '' } },
                documentElement: {},
                getElementById: id => els[id] || null,
                contains: node => node === opener
            }
        });
        ctx.window = ctx;
        vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/core/modal.js'), 'utf8'), ctx);
        const M = ctx.ModalManager;

        M.open('a');
        M.open('b');
        M.open('a');
        M.close('b');
        M.open('c');

        const zA = Number(els.a.style.getPropertyValue('z-index'));
        const zC = Number(els.c.style.getPropertyValue('z-index'));
        assert.ok(zC > zA, `預期後開的 c (${zC}) 應高於先開的 a (${zA})`);

        focusCalls = 0;
        M.closeAll();
        assert.equal(M.activeModals.length, 0);
        assert.equal(focusCalls, 1, 'closeAll 應僅還原一次焦點');
        assert.equal(ctx.document.body.style.overflow, '');
    });
});

describe('data：0 學分門檻與損毀資料防呆', () => {
    test('啟動時保留 0 學分門檻並容忍損毀的 semesters 與 currentSemester', () => {
        const storage = makeStorage();
        storage.setItem('timeflow_data', JSON.stringify({
            deptName: '電機工程學系',
            entryYear: 118,
            targetCredits: 0,
            targetRequired: 0,
            targetElective: 0,
            currentSemester: '不存在的學期',
            semesterOrder: ['一上', '一下'],
            semesters: { 一上: 'bad-not-array', 一下: [{ name: '線代', credits: 3 }] }
        }));
        const app = loadApp({ storage });
        assert.deepEqual(app.errors, []);
        assert.equal(app.run('appData.targetCredits'), 0);
        assert.equal(app.run('appData.targetRequired'), 0);
        assert.equal(app.run('appData.targetElective'), 0);
        assert.equal(app.run('Array.isArray(appData.semesters["一上"])'), true);
        assert.equal(app.run('appData.currentSemester'), '一上');
    });
});

describe('course：編輯保留來源欄位與非常規學分', () => {
    test('編輯從找課排入且為非常規學分（8 學分）的課程時，儲存後不遺失欄位也不歸零學分', () => {
        const els = {};
        let submitHandler = null;
        const makeField = (initial = '') => ({ value: initial, checked: false, style: {}, dataset: {} });

        const customOpts = [];
        const creditSelect = {
            value: '3',
            options: [{ value: '0' }, { value: '3' }, { value: '6' }],
            dataset: {},
            style: {},
            appendChild(opt) { customOpts.push(opt); this.options.push(opt); },
            querySelectorAll(sel) {
                if (sel === 'option[data-custom-credit="1"]') {
                    return customOpts.map(o => ({
                        remove: () => {
                            const i1 = customOpts.indexOf(o);
                            if (i1 !== -1) customOpts.splice(i1, 1);
                            const i2 = creditSelect.options.indexOf(o);
                            if (i2 !== -1) creditSelect.options.splice(i2, 1);
                        }
                    }));
                }
                return [];
            }
        };

        const makeNode = (extra = {}) => ({
            innerText: '', innerHTML: '', value: '', checked: false,
            style: { setProperty() {}, removeProperty() {} },
            dataset: {},
            classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
            getAttribute: () => null,
            setAttribute() {},
            hasAttribute: () => true,
            appendChild() {},
            remove() {},
            focus() {},
            contains: () => false,
            querySelector: () => null,
            querySelectorAll: () => [],
            ...extra
        });

        const detailFooter = makeNode();
        const detailModal = makeNode({
            querySelector: sel => (sel === '.course-detail-footer' ? detailFooter : null)
        });
        const dummy = makeNode();

        Object.assign(els, {
            courseDetailModal: detailModal,
            modalCourseName: makeNode(),
            modalCourseColorBar: makeNode(),
            modalCourseContent: makeNode(),
            btnModalEdit: { onclick: null },
            btnModalDelete: { onclick: null },
            courseForm: {
                addEventListener(ev, fn) { if (ev === 'submit') submitHandler = fn; },
                reset() {}
            },
            sidebarTitle: makeNode(),
            btnSubmit: makeNode(),
            btnCancelEdit: makeNode(),
            courseName: makeField(),
            courseTeacher: makeField(),
            courseRoom: makeField(),
            courseCredits: creditSelect,
            courseType: makeField('系定必修'),
            courseUrl: makeField(),
            courseNotes: makeField(),
            courseTentative: makeField(),
            courseNoSchedule: makeField(),
            courseFrequency: makeField('weekly'),
            courseColor: makeField('#2563eb'),
            courseStatusMode: makeField('修讀中'),
            courseScore: makeField(),
            courseScoreInputGroup: dummy,
            courseFreqGroup: dummy,
            slotItemsList: makeNode(),
            slotInputsArea: dummy,
            advancedFields: dummy,
            colorPalette: dummy
        });

        const app = loadApp({
            scripts: listScripts({ skip: ['js/app.js', 'js/core/boot.js', 'js/core/sw-register.js', 'js/core/inline-styles.js'] })
        });
        app.ctx.setTimeout = () => 0;
        app.ctx.document.getElementById = id => els[id] || null;
        app.ctx.document.createElement = tag => makeNode({ tag });
        app.ctx.toggleSidebar = () => {};
        app.ctx.updateAppUI = () => {};
        app.ctx.renderSemesterSelect = () => {};

        // 注入完假 DOM 後重跑一次 course.js 綁定表單 submit 事件
        vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/course/course.js'), 'utf8'), app.ctx, { filename: 'js/course/course.js' });
        assert.equal(typeof submitHandler, 'function');

        app.run(`
            appData.currentSemester = '一上';
            appData.semesters['一上'] = [normalizeCourseData({
                id: 777,
                code: 'I540100',
                catalogId: '115-1_I5-001',
                dept: '醫學系 MED',
                deptSeq: 'I5-001',
                source: '找課（115-1）',
                name: '內科學臨床實習',
                credits: 8,
                type: '系定必修',
                status: '修讀中',
                slots: []
            })];
            showCourseDetail(777);
        `);

        assert.equal(typeof els.btnModalEdit.onclick, 'function');
        els.btnModalEdit.onclick();
        assert.equal(creditSelect.value, '8', '應為非常規 8 學分自動補上選項並選取');

        // 模擬使用者編輯備註並送出儲存
        els.courseNotes.value = '已確認實習分組';
        submitHandler({ preventDefault() {} });

        const saved = JSON.parse(app.run(`JSON.stringify(appData.semesters['一上'][0])`));
        assert.equal(saved.credits, 8, '非常規學分不得歸零');
        assert.equal(saved.catalogId, '115-1_I5-001');
        assert.equal(saved.dept, '醫學系 MED');
        assert.equal(saved.deptSeq, 'I5-001');
        assert.equal(saved.source, '找課（115-1）');
        assert.equal(saved.notes, '已確認實習分組');
        assert.equal(customOpts.length, 0, '儲存完成 cancelEdit 後應清掉暫時新增的學分選項');
    });
});
