'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, ROOT } = require('./helpers/load');

const app = loadApp();
const call = (expr, vars = {}) => {
    Object.assign(app.ctx, vars);
    return app.run(expr);
};

describe('載入環境', () => {
    test('所有腳本都能在 Node 載入且無例外', () => {
        assert.deepEqual(app.errors.map(e => `${e.file}: ${e.error.message}`), []);
    });
});

describe('escapeHTML', () => {
    test('跳脫五個危險字元', () => {
        const input = `<a href="x" onclick='y'>&</a>`;
        assert.equal(call('escapeHTML(__s)', { __s: input }),
            '&lt;a href=&quot;x&quot; onclick=&#039;y&#039;&gt;&amp;&lt;/a&gt;');
    });
    test('null / undefined 回傳空字串，數字轉字串', () => {
        assert.equal(call('escapeHTML(null)'), '');
        assert.equal(call('escapeHTML(undefined)'), '');
        assert.equal(call('escapeHTML(3.5)'), '3.5');
    });
});

describe('sanitizeURL', () => {
    test('只放行 http / https', () => {
        assert.equal(call('sanitizeURL("https://www.ncku.edu.tw/a?b=1")'), 'https://www.ncku.edu.tw/a?b=1');
        assert.equal(call('sanitizeURL("http://example.com")'), 'http://example.com/');
    });
    test('拒絕 javascript: / data: / 無協定 / 非字串', () => {
        for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'ftp://x.com', 'not a url', '']) {
            assert.equal(call('sanitizeURL(__u)', { __u: bad }), '', bad);
        }
        assert.equal(call('sanitizeURL(123)'), '');
        assert.equal(call('sanitizeURL(null)'), '');
    });
});

describe('normalizeCourseData（匯入資料清洗）', () => {
    const norm = c => call('normalizeCourseData(__in)', { __in: c });

    test('非物件回傳 null', () => {
        assert.equal(norm(null), null);
        assert.equal(norm('x'), null);
    });
    test('缺欄位時給預設值', () => {
        const c = norm({});
        assert.equal(c.name, '未命名課程');
        assert.equal(c.credits, 0);
        assert.equal(c.status, '已取得');
        assert.equal(c.frequency, 'weekly');
        assert.equal(c.color, '#2563eb');
        assert.equal(typeof c.id, 'number');
    });
    test('節次白名單：丟掉不合法的節次、修正日期範圍', () => {
        const c = norm({ slots: [{ day: 9, periods: ['1', 'x', '<b>', 'a', 'N'] }, { day: '3', periods: ['D'] }] });
        assert.deepEqual(c.slots[0].periods, ['1', 'A', 'N']);
        assert.equal(c.slots[0].day, 1);
        assert.deepEqual(c.slots[1].periods, ['D']);
        assert.equal(c.slots[1].day, 3);
    });
    test('分數超出 0~100 視為無分數；已抵免不保留分數', () => {
        assert.equal(norm({ score: 101 }).score, null);
        assert.equal(norm({ score: -1 }).score, null);
        assert.equal(norm({ score: '88' }).score, 88);
        const w = norm({ status: '已抵免', score: 90 });
        assert.equal(w.score, null);
        assert.equal(w.passed, true);
    });
    test('顏色必須是 hex，否則退回預設', () => {
        assert.equal(norm({ color: '#abc' }).color, '#abc');
        assert.equal(norm({ color: 'red" onclick="x' }).color, '#2563eb');
    });
    test('頻率只接受 weekly / odd / even', () => {
        assert.equal(norm({ frequency: 'even' }).frequency, 'even');
        assert.equal(norm({ frequency: 'daily' }).frequency, 'weekly');
    });
    test('欄位長度被截斷', () => {
        assert.equal(norm({ notes: 'x'.repeat(900) }).notes.length, 500);
        assert.equal(norm({ url: 'x'.repeat(900) }).url.length, 300);
    });

    test('security.json 的惡意資料：顏色與節次被清洗，輸出端跳脫後不含可執行標籤', () => {
        const evil = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'security.json'), 'utf8'));
        const courses = Object.values(evil.semesters).flat();
        assert.ok(courses.length > 0);
        for (const raw of courses) {
            const c = norm(raw);
            assert.ok(c, '應能正規化');
            assert.match(c.color, /^#[0-9a-fA-F]{3,8}$/, '顏色必須是安全的 hex');
            for (const s of c.slots) {
                assert.ok(s.day >= 1 && s.day <= 7);
                for (const p of s.periods) assert.match(p, /^[1-9NABCD]$/);
            }
            for (const f of ['name', 'type', 'teacher', 'room', 'notes']) {
                const html = call('escapeHTML(__v)', { __v: c[f] });
                assert.doesNotMatch(html, /<\s*(script|img|b)\b/i, `${f} 未被跳脫`);
            }
            assert.equal(call('sanitizeURL(__u)', { __u: c.url }), '', 'javascript: 連結必須被擋下');
        }
    });
});

describe('學期排序', () => {
    test('sortSemesterOrder 依年級與上下學期排序', () => {
        const r = call('sortSemesterOrder(["二下","一上","三上","一下","二上"])');
        assert.deepEqual(Array.from(r), ['一上', '一下', '二上', '二下', '三上']);
    });
    test('getNextSemesterName 接續最後一學期', () => {
        assert.equal(call('getNextSemesterName(["一上","一下"])'), '二上');
        assert.equal(call('getNextSemesterName(["一上"])'), '一下');
    });
});
