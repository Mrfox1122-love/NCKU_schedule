'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

const app = loadApp();
const gp = s => { app.ctx.__s = s; return app.run('getGradePoint(__s)'); };
const lg = s => { app.ctx.__s = s; return app.run('getLetterGrade(__s)'); };

// 成大 4.3 制：[分數, 等第, 績點]
const BANDS = [
    [100, 'A+', 4.3], [90, 'A+', 4.3], [89.99, 'A', 4.0], [85, 'A', 4.0],
    [84, 'A-', 3.7], [80, 'A-', 3.7], [79, 'B+', 3.3], [77, 'B+', 3.3],
    [76, 'B', 3.0], [73, 'B', 3.0], [72, 'B-', 2.7], [70, 'B-', 2.7],
    [69, 'C+', 2.3], [67, 'C+', 2.3], [66, 'C', 2.0], [63, 'C', 2.0],
    [62, 'C-', 1.7], [60, 'C-', 1.7], [59.9, 'F', 0], [0, 'F', 0]
];

describe('等第與績點對照（含邊界值）', () => {
    for (const [score, letter, point] of BANDS) {
        test(`${score} 分 → ${letter} / ${point}`, () => {
            assert.equal(lg(score), letter);
            assert.equal(gp(score), point);
        });
    }
});

describe('學期 GPA 與加權平均（經 calculateGraduation）', () => {
    let n = 0;
    const c = (credits, score, extra = {}) => ({ name: 'c' + (n++), credits, type: '系定必修', status: '已取得', score, ...extra });
    const calc = (courses, current = '一上', semesters = null) => {
        app.ctx.__d = { deptName: '電機工程學系', entryYear: 118, currentSemester: current, semesters: semesters || { '一上': courses } };
        return app.run('calculateGraduation(__d)');
    };

    test('以學分加權', () => {
        const r = calc([c(3, 90), c(2, 60)]); // (4.3*3 + 1.7*2)/5 = 3.26
        assert.equal(r.grades.semGpa, '3.26');
        assert.equal(r.grades.semWeighted, '78.0');
    });
    test('修讀中、暫定、已抵免、0 學分都不進 GPA', () => {
        const r = calc([
            c(3, 80),
            c(3, 100, { status: '修讀中' }),
            c(3, 100, { isTentative: true }),
            c(3, 100, { status: '已抵免' }),
            c(0, 100)
        ]);
        assert.equal(r.grades.semGpa, '3.70');
        assert.equal(r.grades.semWeighted, '80.0');
    });
    test('沒有任何成績時 GPA 為 0', () => {
        const r = calc([c(3, null, { status: '修讀中' })]);
        assert.equal(Number(r.grades.semGpa), 0);
    });
    test('歷年累計包含非當前學期', () => {
        const r = calc(null, '一下', { '一上': [c(3, 90)], '一下': [c(3, 70)] });
        assert.equal(r.grades.semGpa, '2.70');
        assert.equal(r.grades.cumGpa, '3.50'); // (4.3 + 2.7) / 2
    });
});
