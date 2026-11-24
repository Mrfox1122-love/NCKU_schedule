'use strict';
// 分享課表連結（share.js）與手機版「今天的課」（mobile.js）
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

function freshApp() {
    const app = loadApp();
    for (const fn of ['updateAppUI', 'renderSemesterSelect', 'initTable']) app.ctx[fn] = () => {};
    // 測試環境沒有這些瀏覽器 API，借用 Node 內建的實作
    Object.assign(app.ctx, {
        btoa, atob, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream, Uint8Array
    });
    return app;
}

const course = (id, name, slots, extra = {}) => ({
    id, name, credits: 3, type: '系定必修', status: '已取得', score: 91, color: '#16a34a',
    teacher: '王老師', room: '92177', notes: '私人備註', slots, ...extra
});

function setSem(app, sem, courses) {
    app.ctx.__c = courses;
    app.run(`appData.semesters[${JSON.stringify(sem)}] = __c.map(normalizeCourseData);
             if (!appData.semesterOrder.includes(${JSON.stringify(sem)})) appData.semesterOrder.push(${JSON.stringify(sem)});`);
}

describe('分享連結：打包與解析', () => {
    test('來回轉換保留課名、時段、教師、教室、學分、顏色與單雙週', () => {
        const app = freshApp();
        setSem(app, '一上', [
            course(1, '微積分(一)', [{ day: 1, periods: ['2', '3', '4'] }]),
            course(2, '實驗', [{ day: 3, periods: ['A', 'B'] }], { frequency: 'odd', isTentative: true })
        ]);
        const share = app.run(`parseSharePayload(JSON.parse(JSON.stringify(buildSharePayload('一上'))))`);
        assert.equal(share.semester, '一上');
        assert.equal(share.courses.length, 2);
        const [a, b] = share.courses;
        assert.equal(a.name, '微積分(一)');
        assert.deepEqual(JSON.parse(JSON.stringify(a.slots)), [{ day: 1, periods: ['2', '3', '4'] }]);
        assert.equal(a.teacher, '王老師');
        assert.equal(a.room, '92177');
        assert.equal(a.credits, 3);
        assert.equal(a.color, '#16a34a');
        assert.equal(b.frequency, 'odd');
        assert.equal(b.isTentative, true);
    });

    test('不帶成績、修課狀態與備註；匯入後一律是「修讀中」', () => {
        const app = freshApp();
        setSem(app, '一上', [course(1, '微積分(一)', [{ day: 1, periods: ['2'] }])]);
        const json = app.run(`JSON.stringify(buildSharePayload('一上'))`);
        assert.doesNotMatch(json, /91|私人備註|已取得/);
        const share = app.run(`parseSharePayload(JSON.parse(${JSON.stringify(json)}))`);
        assert.equal(share.courses[0].status, '修讀中');
        assert.equal(share.courses[0].score, null);
        assert.equal(share.courses[0].notes, '');
    });

    test('惡意或格式錯誤的內容：過濾不合法節次、丟掉壞資料、版本不符就拒絕', () => {
        const app = freshApp();
        const share = app.run(`parseSharePayload({ v: 1, s: '一上', c: [
            ['<img src=x onerror=alert(1)>', 3, '', 'zzz', '', '', '9:1Q;2:2'],
            [123, 3], null, ['']
        ] })`);
        assert.equal(share.courses.length, 1);
        const c = share.courses[0];
        assert.equal(c.color, '#2563eb', '不合法的顏色換成預設色');
        assert.deepEqual(JSON.parse(JSON.stringify(c.slots)), [{ day: 1, periods: ['1'] }, { day: 2, periods: ['2'] }]);
        assert.throws(() => app.run(`parseSharePayload({ v: 99, c: [] })`), /分享連結/);
        assert.throws(() => app.run(`parseSharePayload({ v: 1, c: [] })`), /沒有課程/);
    });

    test('編碼成網址字串再解碼（壓縮）', async () => {
        const app = freshApp();
        setSem(app, '一上', [course(1, '微積分(一)', [{ day: 1, periods: ['2', '3'] }])]);
        const text = await app.run(`encodeShare(buildSharePayload('一上'))`);
        assert.match(text, /^z[A-Za-z0-9_-]+$/);
        const share = await app.run(`decodeShare(${JSON.stringify(text)})`);
        assert.equal(share.courses[0].name, '微積分(一)');
        await assert.rejects(app.run(`decodeShare('z<script>')`), /不允許的字元/);
        await assert.rejects(app.run(`decodeShare('z' + 'A'.repeat(9000))`), /太長/);
    });

    test('拒絕超過 64 KB 的高壓縮比 payload（串流提前中止）', async () => {
        const app = freshApp();
        const huge = new Uint8Array(90 * 1024).fill(65); // 高壓縮比重複位元組，壓縮後遠小於 8000 字元
        const compressed = Buffer.from(await new Response(new Blob([huge]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
        const encoded = 'z' + compressed.toString('base64url');
        assert.ok(encoded.length < 2000, `壓縮後僅 ${encoded.length} 字元，可通過字數上限但解壓超過 64KB`);
        await assert.rejects(app.run(`decodeShare(${JSON.stringify(encoded)})`), /分享內容太大/);
    });

    test('匯入：同學期已有的同一門課略過，其餘加入', () => {
        const app = freshApp();
        setSem(app, '一上', [course(1, '微積分(一)', [{ day: 1, periods: ['2', '3'] }])]);
        setSem(app, '一下', [course(5, '微積分(一)', [{ day: 1, periods: ['2', '3'] }], { status: '修讀中', score: null })]);
        const share = app.run(`parseSharePayload(buildSharePayload('一上'))`);
        app.ctx.__share = share;
        setSem(app, '一上', [course(7, '普通物理', [{ day: 2, periods: ['1'] }])]);
        app.ctx.__share.courses.push(app.run(`unpackCourse(['普通物理', 3, '', '', '', '', '2:1'])`));
        const res = app.run(`importShareInto(__share, '一下')`);
        assert.deepEqual(JSON.parse(JSON.stringify(res)), { added: 1, skipped: 1 });
        assert.equal(app.run(`appData.semesters['一下'].length`), 2);
        assert.equal(app.run(`new Set(appData.semesters['一下'].map(c => c.id)).size`), 2, 'id 不重複');
    });
});

describe('今天的課', () => {
    const sched = [
        course(1, '微積分', [{ day: 3, periods: ['2', '3', '4'] }]),
        course(2, '計概', [{ day: 3, periods: ['6', '7'] }]),
        course(3, '跳節', [{ day: 3, periods: ['9', 'B'] }]),
        course(4, '暫定', [{ day: 3, periods: ['1'] }], { isTentative: true }),
        course(5, '週五課', [{ day: 5, periods: ['1'] }])
    ];

    test('依時間排序、不連續節次拆段、暫定課不列入', () => {
        const app = freshApp();
        app.ctx.__c = sched.map(c => app.ctx.normalizeCourseData(c));
        const items = JSON.parse(app.run(`JSON.stringify(getClassesOnDay(__c, 3).map(i => [i.course.name, i.periods.join('')]))`));
        assert.deepEqual(items, [['微積分', '234'], ['計概', '67'], ['跳節', '9'], ['跳節', 'B']]);
    });

    test('上課中、下一堂、已結束', () => {
        const app = freshApp();
        app.ctx.__c = sched.map(c => app.ctx.normalizeCourseData(c));
        // 2026-11-18 是星期三
        const states = JSON.parse(app.run(`JSON.stringify(getTodaySummary(__c, new Date(2026, 10, 18, 10, 30)).items.map(i => i.state))`));
        assert.deepEqual(states, ['now', 'next', 'later', 'later']);
        const late = JSON.parse(app.run(`JSON.stringify(getTodaySummary(__c, new Date(2026, 10, 18, 22, 0)))`));
        assert.ok(late.items.every(i => i.state === 'done'));
        assert.equal(late.nextDay.day, 5, '今天上完後找下一個有課的日子');
        assert.equal(late.nextDay.first.course.name, '週五課');
    });

    test('全部課程皆已結算（無修讀中）時隱藏今日卡片', () => {
        const app = freshApp();
        const box = { hidden: false, innerHTML: 'old' };
        app.ctx.document.getElementById = id => (id === 'todayCard' ? box : null);
        setSem(app, '一上', [course(1, '微積分', [{ day: 3, periods: ['2', '3'] }], { status: '已取得', score: 85 })]);
        app.run(`appData.currentSemester = '一上'; renderTodayCard();`);
        assert.equal(box.hidden, true);
        assert.equal(box.innerHTML, '');

        setSem(app, '一下', [course(2, '線代', [{ day: 3, periods: ['4', '5'] }], { status: '修讀中', score: null })]);
        app.run(`appData.currentSemester = '一下'; renderTodayCard();`);
        assert.equal(box.hidden, false);
        assert.match(box.innerHTML, /線代/);
    });
});
