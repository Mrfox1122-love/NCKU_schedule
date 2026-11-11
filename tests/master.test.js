'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

const app = loadApp();
const programs = Array.from(app.run('MASTER_PROGRAM_LIST'));

describe('研究所規則資料完整性', () => {
    test('收錄 100 個以上所別，id 不重複', () => {
        assert.ok(programs.length >= 100, `只有 ${programs.length} 個`);
        assert.equal(new Set(programs.map(p => p.id)).size, programs.length);
    });
    test('每個所別都有學院、學位、至少一個規則版本', () => {
        for (const p of programs) {
            assert.ok(p.college, `${p.id} 缺學院`);
            assert.ok(['碩士班', '碩士在職專班', '博士班'].includes(p.degree), `${p.id} 學位異常：${p.degree}`);
            assert.ok(p.versions.length > 0, `${p.id} 沒有規則版本`);
        }
    });
    test('每個版本的學分欄位合理', () => {
        for (const p of programs) {
            for (const v of p.versions) {
                const tag = `${p.id} / ${v.label}`;
                assert.ok(Number.isFinite(v.totalCredits) && v.totalCredits >= 0 && v.totalCredits <= 120, `${tag} totalCredits=${v.totalCredits}`);
                assert.ok(Number.isFinite(v.thesisCredits) && v.thesisCredits >= 0, `${tag} thesisCredits`);
                assert.ok(v.label && v.source, `${tag} 缺 label / source`);
                assert.ok(v.seminar && ['fixed', 'byDuration'].includes(v.seminar.mode), `${tag} seminar.mode`);
                assert.ok(Number.isFinite(v.fromYear) && v.fromYear >= 0, `${tag} fromYear`);
            }
        }
    });
    test('版本依 fromYear 由新到舊排列', () => {
        for (const p of programs) {
            const years = Array.from(p.versions, v => v.fromYear || 0);
            assert.deepEqual(years, [...years].sort((a, b) => b - a), p.id);
        }
    });
    test('縮寫（aliases）能找回原所別，且不同所別之間沒有衝突', () => {
        const owner = new Map();
        const clashes = [];
        for (const p of programs) {
            for (const a of p.aliases) {
                app.ctx.__k = a;
                const found = app.run('findMasterProgram(__k)');
                if (!found) { clashes.push(`${p.id} 的別名「${a}」找不到任何所別`); continue; }
                if (found.id !== p.id) {
                    // 允許多個所別共用同一縮寫，但至少要找得到
                    owner.set(a, found.id);
                }
            }
        }
        assert.deepEqual(clashes, []);
    });
});

describe('calculateMasterGraduation', () => {
    const PID = programs.find(p => p.versions.every(v => v.fromYear === 0 || v.fromYear <= 114) && p.versions[0].seminar.mode === 'fixed').id;
    let n = 0;
    const calc = (courses, extra = {}) => {
        app.ctx.__d = {
            masterProgram: PID, masterEntryYear: 114, semesterOrder: ['一上', '一下'],
            semesters: { 一上: courses, 一下: [] }, ...extra
        };
        return app.run('calculateMasterGraduation(__d)');
    };
    const c = (type, credits, extra = {}) => ({ name: '課' + (n++), type, credits, status: '已取得', score: 80, ...extra });

    test('空資料：未達標、不丟例外', () => {
        const r = calc([]);
        assert.equal(r.allPassed, false);
        assert.equal(r.credits.earned, 0);
        assert.equal(r.checks.credits, false);
    });
    test('本所課程計入本所學分；外所課程另計', () => {
        const r = calc([c('本所必修', 3), c('本所選修', 2), c('外所選修', 3)]);
        assert.equal(r.credits.own.earned, 5);
        assert.equal(r.credits.external.earned, 3);
        assert.equal(r.credits.earned, 8);
    });
    test('修讀中只算預計', () => {
        const r = calc([c('本所選修', 3, { status: '修讀中', score: null })]);
        assert.equal(r.credits.earned, 0);
        assert.equal(r.credits.expected, 3);
    });
    test('補修與大學部課程不計入畢業學分，但會列在未計入清單', () => {
        const r = calc([c('補修', 3), c('大學部課程', 3)]);
        assert.equal(r.credits.earned, 0);
        assert.equal(r.uncounted.length, 2);
    });
    test('專題討論依學期計次，不計學分', () => {
        const r = calc([c('專題討論', 0, { name: '專題討論' })]);
        assert.equal(r.seminar.earned, 1);
        assert.equal(r.credits.earned, 0);
    });
    test('論文狀態：沒有 → missing；已取得 → earned', () => {
        assert.equal(calc([]).thesis.status, 'missing');
        assert.equal(calc([c('論文', 0, { name: '學位論文' })]).thesis.status, 'earned');
    });
    test('自訂所別可以計算', () => {
        const r = calc([c('本所必修', 3)], { masterProgram: '自訂', masterCustom: { totalCredits: 24 } });
        assert.equal(r.credits.own.earned, 3);
    });
});
