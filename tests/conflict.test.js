'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

const app = loadApp();
const detect = (courses, mode = 'semester') => {
    app.ctx.__c = courses;
    app.ctx.__m = mode;
    return app.run('ConflictEngine.detect(__c, __m)');
};
const course = (id, day, periods, extra = {}) => ({ id, name: 'C' + id, slots: [{ day, periods }], ...extra });

describe('ConflictEngine.detect', () => {
    test('沒有課程 → 無衝突', () => {
        const r = detect([]);
        assert.equal(r.hasConflict, false);
        assert.equal(r.hardConflicts.length, 0);
    });
    test('不同日、同節次 → 不衝突', () => {
        assert.equal(detect([course(1, 1, ['1', '2']), course(2, 2, ['1', '2'])]).hasConflict, false);
    });
    test('同日相鄰但不重疊的節次 → 不衝突', () => {
        assert.equal(detect([course(1, 1, ['1']), course(2, 1, ['2'])]).hasConflict, false);
    });
    test('同日重疊節次 → 硬衝突，並標出重疊的節次', () => {
        const r = detect([course(1, 1, ['1', '2']), course(2, 1, ['2', '3'])]);
        assert.equal(r.hasHardConflict, true);
        assert.equal(r.hardConflicts.length, 1);
        assert.deepEqual(Array.from(r.hardConflicts[0].periods), ['2']);
        assert.deepEqual(Array.from(r.conflictedCourseIds).sort(), [1, 2]);
        assert.equal(r.hardConflicts[0].dayName, '一');
    });
    test('連續多節重疊（中間只隔下課）合併成一大段', () => {
        const r = detect([course(1, 3, ['3', '4', 'N']), course(2, 3, ['3', '4', 'N'])]);
        assert.equal(r.hardConflicts.length, 1);
        const h = r.hardConflicts[0];
        assert.deepEqual(Array.from(h.periods), ['3', '4', 'N']);
        assert.equal(h.startTime, '10:10');
        assert.equal(h.endTime, '13:00');
        assert.equal(h.courses.length, 2);
    });
    test('中間隔著一整節沒撞的課，仍分成兩段', () => {
        // 兩門課都有第 3、5 節，但第 4 節只有課 1 → 3 與 5 不連續
        const r = detect([
            { id: 1, name: 'C1', slots: [{ day: 2, periods: ['3', '4', '5'] }] },
            { id: 2, name: 'C2', slots: [{ day: 2, periods: ['3', '5'] }] }
        ]);
        assert.equal(r.hardConflicts.length, 2);
        assert.deepEqual(Array.from(r.hardConflicts, h => h.periods.join()), ['3', '5']);
    });
    test('不同日的衝突不會互相合併', () => {
        const r = detect([
            { id: 1, name: 'C1', slots: [{ day: 1, periods: ['1'] }, { day: 2, periods: ['2'] }] },
            { id: 2, name: 'C2', slots: [{ day: 1, periods: ['1'] }, { day: 2, periods: ['2'] }] }
        ]);
        assert.equal(r.hardConflicts.length, 2);
    });
    test('暫定課程互撞 → 只算暫定警告，不算硬衝突', () => {
        const r = detect([course(1, 1, ['1']), course(2, 1, ['1'], { isTentative: true })]);
        assert.equal(r.hasHardConflict, false);
        assert.equal(r.hasTentativeWarning, true);
        assert.equal(r.tentativeWarnings.length, 1);
    });
    test('單雙週：奇數週與偶數週的課不互撞', () => {
        const r = detect([course(1, 1, ['1'], { frequency: 'odd' }), course(2, 1, ['1'], { frequency: 'even' })]);
        assert.equal(r.hasConflict, false);
    });
    test('單雙週：每週課與奇數週課重疊 → 衝突', () => {
        const r = detect([course(1, 1, ['1']), course(2, 1, ['1'], { frequency: 'odd' })]);
        assert.equal(r.hasHardConflict, true);
        assert.equal(r.hardConflicts[0].frequencyScope, 'odd');
    });
    test('同一門課自己的多個時段不會和自己衝突', () => {
        const c = { id: 1, name: 'A', slots: [{ day: 1, periods: ['1', '2'] }, { day: 1, periods: ['3'] }] };
        assert.equal(detect([c]).hasConflict, false);
    });
    test('未知節次與非法日期被忽略而不丟例外', () => {
        const r = detect([course(1, 1, ['Z']), course(2, 9, ['1']), course(3, 1, ['Z'])]);
        assert.equal(r.hasConflict, false);
    });
    test('三門課同時重疊 → 一個衝突區段含三門課', () => {
        const r = detect([course(1, 5, ['6']), course(2, 5, ['6']), course(3, 5, ['6'])]);
        assert.equal(r.hardConflicts.length, 1);
        assert.equal(r.hardConflicts[0].courses.length, 3);
    });
    test('時間換算：timeToMinutes / minutesToTime 互為反函式', () => {
        assert.equal(app.run('ConflictEngine.timeToMinutes("08:10")'), 490);
        assert.equal(app.run('ConflictEngine.minutesToTime(490)'), '08:10');
        assert.equal(app.run('ConflictEngine.timeToMinutes("")'), 0);
    });
});
