'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load');

const { ctx } = loadApp();

describe('找課頁：學分學程搜尋與篩選', () => {
    test('extractCourseTags 會拆解以逗號串接的多個學程標籤', () => {
        const tags = ctx.extractCourseTags({
            tags: ['醫療器材與系統學程 ， 人工智慧學分學程', '英語授課, 遠距課程']
        });
        assert.deepEqual(Array.from(tags), [
            '醫療器材與系統學程',
            '人工智慧學分學程',
            '英語授課',
            '遠距課程'
        ]);
    });

    test('buildCourseSearchHaystack 包含 tags 與 classGroup，可用關鍵字搜到學分學程', () => {
        const course = {
            name: 'AI運動科技專題研究（一）',
            teacher: '連震杰',
            code: 'A21H410',
            deptSeq: 'A2-801',
            dept: '體育室 OPE',
            classGroup: '不限年級體育（AI運動科技專長微學程）',
            tags: ['AI 運動科技專長微學程', '人工智慧學分學程']
        };
        const haystack = ctx.buildCourseSearchHaystack(course);
        assert.ok(haystack.includes('人工智慧學分學程'));
        assert.ok(haystack.includes('ai 運動科技專長微學程'));
        assert.ok(haystack.includes('ai運動科技專長微學程'));
    });

    test('matchProgramFilter 依課程 tags、classGroup 篩選', () => {
        const aiCourse = {
            name: '深度學習導論',
            tags: ['醫療器材與系統學程 ， 人工智慧學分學程']
        };
        const peCourse = {
            name: '專項運動技戰術分析與應用',
            classGroup: '不限年級體育（AI運動科技專長微學程）',
            tags: []
        };

        assert.equal(ctx.matchProgramFilter(aiCourse, ''), true);
        assert.equal(ctx.matchProgramFilter(aiCourse, '人工智慧學分學程'), true);
        assert.equal(ctx.matchProgramFilter(aiCourse, '醫療器材'), true);
        assert.equal(ctx.matchProgramFilter(aiCourse, '半導體'), false);
        assert.equal(ctx.matchProgramFilter(peCourse, 'ai運動科技'), true);
    });

    test('matchProgramFilter 也能比對使用者自訂的 appData.programs 科目清單', () => {
        ctx.appData.programs = [{
            id: 'p1',
            name: '自訂跨領域學程',
            kind: '學分學程',
            targetCredits: 15,
            required: ['線性代數（一）'],
            electives: ['資料結構'],
            extraIds: []
        }];

        assert.equal(ctx.matchProgramFilter({ name: '線性代數(一)', tags: [] }, '自訂跨領域'), true);
        assert.equal(ctx.matchProgramFilter({ name: '資料結構', tags: [] }, '自訂跨領域'), true);
        assert.equal(ctx.matchProgramFilter({ name: '微積分', tags: [] }, '自訂跨領域'), false);
    });
});
