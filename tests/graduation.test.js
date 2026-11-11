'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

const app = loadApp();
let seq = 0;
const c = (name, credits, type, extra = {}) => ({ name: name + (seq++), credits, type, status: '已取得', score: 80, ...extra });

const grad = (courses, over = {}) => {
    app.ctx.__d = {
        deptName: '電機工程學系', entryYear: 118, currentSemester: '一上',
        semesters: { 一上: courses }, ...over
    };
    return app.run('calculateGraduation(__d)');
};

describe('getDepartmentGraduationRule', () => {
    const rule = (d, y) => { app.ctx.__a = d; app.ctx.__y = y; return app.run('getDepartmentGraduationRule(__a, __y)'); };

    test('已收錄的學系與學年 → 官方規則', () => {
        const r = rule('電機工程學系', 118);
        assert.equal(r.ruleFound, true);
        assert.equal(r.isCustom, false);
        assert.equal(r.targetCredits, 138);
        assert.equal(r.requiredCredits, 59);
    });
    test('簡稱與別名會正規化（電機系 = 電機工程學系）', () => {
        assert.equal(rule('電機系', 118).targetCredits, 138);
        assert.equal(rule('成大電機工程學系', 118).targetCredits, 138);
    });
    test('未收錄的學系 → 自訂模式（有預設值）', () => {
        const r = rule('不存在的學系', 118);
        assert.equal(r.isCustom, true);
        assert.equal(r.targetCredits, 128);
    });
    test('不同入學年規則不同（117 = 144 學分，118 = 138）', () => {
        assert.equal(rule('電機工程學系', 117).targetCredits, 144);
        assert.equal(rule('電機工程學系', 118).targetCredits, 138);
    });
});

describe('calculateGraduation：學分歸類', () => {
    test('空資料不當機', () => {
        const r = grad([]);
        assert.equal(r.ruleFound, true);
        assert.equal(r.total.earned, 0);
        assert.equal(r.total.target, 138);
    });
    test('系定必修只累計已取得；修讀中算「預計」不算「已取得」', () => {
        const r = grad([c('必修A', 3, '系定必修'), c('必修B', 3, '系定必修', { status: '修讀中', score: null })]);
        assert.equal(r.required.earned, 3);
        assert.equal(r.required.expected, 6);
        assert.equal(r.required.target, 59);
    });
    test('未取得（不及格）的課不計入已取得', () => {
        const r = grad([c('必修A', 3, '系定必修', { status: '未取得', score: 40 })]);
        assert.equal(r.required.earned, 0);
    });
    test('已抵免視為通過並計入學分', () => {
        const r = grad([c('必修A', 3, '系定必修', { status: '已抵免', score: null })]);
        assert.equal(r.required.earned, 3);
    });
    test('暫定課程不計入預計學分', () => {
        const r = grad([c('必修A', 3, '系定必修', { isTentative: true, status: '修讀中', score: null })]);
        assert.equal(r.required.expected, 0);
    });
    test('外系選修超過上限會被封頂，並標示溢出', () => {
        // 電機系 118：外系選修最多承認 9 學分
        const r = grad([c('外系甲', 6, '選修-外系'), c('外系乙', 6, '選修-外系')]);
        assert.equal(r.elective.outElective.raw, 12);
        assert.equal(r.elective.outElective.max, 9);
        assert.equal(r.elective.outElective.capped, 9);
        assert.equal(r.elective.outElective.isOver, true);
        assert.equal(r.elective.outElective.overflow, 3);
    });
    test('總學分百分比 = 已取得 / 目標', () => {
        const r = grad([c('必修A', 3, '系定必修'), c('必修B', 3, '系定必修')]);
        assert.equal(r.total.earned, 6);
        assert.ok(Math.abs(r.total.percentage - (6 / 138) * 100) < 1e-9);
    });
    test('未達標時產生警告；空課表至少有通識警告', () => {
        const r = grad([]);
        assert.ok(r.warnings.length > 0);
        assert.ok(r.warnings.every(w => w.type && w.text));
    });
    test('找不到規則的科系不丟例外（自訂模式也要能算）', () => {
        const r = grad([c('X', 3, '系定必修')], { deptName: '自創科系' });
        assert.equal(r.ruleFound, true);
        assert.equal(r.isCustom, true);
        assert.equal(r.required.earned, 3);
    });
    test('data 為 null → 回傳 null', () => {
        assert.equal(app.run('calculateGraduation(null)'), null);
    });
});

describe('輔助函式', () => {
    test('calculateMilitaryDeductionDays：每門 4.5 天，滿 5 門 22 天', () => {
        assert.equal(app.run('calculateMilitaryDeductionDays(0)'), 0);
        assert.equal(app.run('calculateMilitaryDeductionDays(1)'), 4);
        assert.equal(app.run('calculateMilitaryDeductionDays(2)'), 9);
        assert.equal(app.run('calculateMilitaryDeductionDays(5)'), 22);
        assert.equal(app.run('calculateMilitaryDeductionDays(8)'), 22);
    });
    test('cleanGeneralCourseTitle 統一標點與「介／界」寫法', () => {
        assert.equal(
            app.run('cleanGeneralCourseTitle("界面化學的生活應用")'),
            app.run('cleanGeneralCourseTitle("介面化學的生活應用")'));
        assert.equal(app.run('cleanGeneralCourseTitle("拍出跨域資訊應用首部曲--Python")'),
            app.run('cleanGeneralCourseTitle("拍出跨域資訊應用首部曲-python")').replace('python', 'python'));
        assert.equal(app.run('cleanGeneralCourseTitle(null)'), '');
    });
});

describe('getRequiredCourseList（必修科目表版本選擇）', () => {
    const get = (d, y) => { app.ctx.__a = d; app.ctx.__y = y; return app.run('getRequiredCourseList(__a, __y)'); };

    test('依入學學年挑選 fromYear ≤ 入學學年的最新版本', () => {
        assert.equal(get('電機工程學系', 114).fromYear, 114);
        assert.equal(get('電機工程學系', 113).fromYear, 112);
        assert.equal(get('電機工程學系', 120).fromYear, 114);
    });
    test('早於所有版本 → 用最早版本並附說明', () => {
        const r = get('電機工程學系', 90);
        assert.ok(r.fallbackNote.length > 0);
    });
    test('沒有收錄的學系 → null', () => {
        assert.equal(get('不存在系', 114), null);
    });
});
