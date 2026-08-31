// ============================================================
// 🔍 TimeFlow v3.1 - PrerequisiteEngine (先修／擋修純計算引擎)
// ============================================================

const PrerequisiteEngine = {
    /**
     * 標準化課程名稱字串 (去除空白、統一全半形括號)
     */
    normalizeName(name) {
        if (!name || typeof name !== 'string') return '';
        return name
            .replace(/\s+/g, '')
            .replace(/（/g, '(')
            .replace(/）/g, ')')
            .trim()
            .toLowerCase();
    },

    /**
     * 比對兩課程是否相符 (代碼完全比對 > 名稱標準化比對 > 別名表比對)
     */
    isCourseMatch(course, targetCode, targetName) {
        if (!course) return false;

        // 1. 代碼完全比對
        if (targetCode && course.code && course.code.trim().toUpperCase() === targetCode.trim().toUpperCase()) {
            return true;
        }

        // 2. 名稱標準化比對
        const normCourseName = this.normalizeName(course.name);
        const normTargetName = this.normalizeName(targetName);
        if (normCourseName && normTargetName && normCourseName === normTargetName) {
            return true;
        }

        // 3. 別名表比對
        const aliasMap = (typeof COURSE_ALIASES !== 'undefined') ? COURSE_ALIASES : {};
        for (const [canonical, aliases] of Object.entries(aliasMap)) {
            const allVariants = [canonical, ...aliases].map(a => this.normalizeName(a));
            if (allVariants.includes(normCourseName) && allVariants.includes(normTargetName)) {
                return true;
            }
        }

        return false;
    },

    /**
     * 查詢課程對應的先修規則
     */
    getRule(course) {
        if (!course) return null;
        const rules = (typeof PREREQUISITE_RULES !== 'undefined') ? PREREQUISITE_RULES : [];
        return rules.find(r => this.isCourseMatch(course, r.targetCode, r.targetName)) || null;
    },

    /**
     * 在全學期規劃中找出所有符合該先修條件的課程實例
     */
    findPrerequisiteOccurrences(reqSpec, semestersData, semesterOrder) {
        const occurrences = [];
        const semOrder = semesterOrder || Object.keys(semestersData || {});

        semOrder.forEach((sem, semIdx) => {
            const courses = semestersData[sem] || [];
            courses.forEach(c => {
                if (this.isCourseMatch(c, reqSpec.code, reqSpec.name)) {
                    occurrences.push({
                        semester: sem,
                        semesterIndex: semIdx,
                        course: c
                    });
                }
            });
        });

        return occurrences;
    },

    /**
     * 核心檢查函式：評估單門課程在指定學期的先修狀態
     */
    check(course, targetSemester, semestersData = {}, semesterOrder = []) {
        if (!course) {
            return {
                hasPrerequisite: false,
                overallStatus: 'unknown',
                level: 'neutral',
                message: '無效的課程資料',
                targetCourseName: '',
                targetSemester,
                details: []
            };
        }

        const rule = this.getRule(course);
        const targetCourseName = course.name || rule?.targetName || '未知課程';

        // 1. 若無先修規定 (none)
        if (!rule || !rule.required || rule.required.length === 0) {
            return {
                hasPrerequisite: false,
                overallStatus: 'none',
                level: 'neutral',
                message: '本課程無先修條件限制',
                targetCourseName,
                targetSemester,
                details: []
            };
        }

        const semOrder = (semesterOrder && semesterOrder.length > 0)
            ? semesterOrder
            : Object.keys(semestersData);
        const targetSemIdx = semOrder.indexOf(targetSemester);

        // 無法確認目標學期在修程中的先後順序 (unknown)
        if (targetSemIdx === -1) {
            return {
                hasPrerequisite: true,
                overallStatus: 'unknown',
                level: 'neutral',
                message: `無法安全確認目標學期「${targetSemester}」的先後修讀順序`,
                targetCourseName,
                targetSemester,
                details: []
            };
        }

        const details = [];
        let hasBlocked = false;
        let hasPlanned = false;
        let hasUnknown = false;

        // 2. 逐一評估每條先修要求
        rule.required.forEach(reqSpec => {
            // 規則要求 passed 但未提供 minScore 數值 (unknown)
            if (reqSpec.requirement === 'passed' && (typeof reqSpec.minScore !== 'number' || isNaN(reqSpec.minScore))) {
                hasUnknown = true;
                details.push({
                    reqCourseName: reqSpec.name,
                    reqCode: reqSpec.code,
                    requirement: reqSpec.requirement,
                    minScore: null,
                    status: 'unknown',
                    foundSemester: null,
                    isEarlier: false,
                    score: null,
                    courseStatus: null,
                    reason: `先修規則不完整：要求 passed 但未定義具體成績門檻 (minScore)`
                });
                return;
            }

            const occurrences = this.findPrerequisiteOccurrences(reqSpec, semestersData, semOrder);

            const earlierOccs = occurrences.filter(o => o.semesterIndex < targetSemIdx);
            const sameTermOccs = occurrences.filter(o => o.semesterIndex === targetSemIdx);
            const laterOccs = occurrences.filter(o => o.semesterIndex > targetSemIdx);

            let reqStatus = 'missing';
            let bestOccurrence = null;
            let reqReason = '';
            let unknownCandidate = null;

            let fulfilled = false;
            let plannedCandidate = null;

            for (const occ of earlierOccs) {
                const c = occ.course;
                const status = c.status;
                const hasScore = (c.score !== undefined && c.score !== null && !isNaN(parseFloat(c.score)));
                const score = hasScore ? parseFloat(c.score) : null;

                if (reqSpec.requirement === 'passed') {
                    const minScore = reqSpec.minScore;
                    if (score !== null) {
                        if (score >= minScore) {
                            fulfilled = true;
                            bestOccurrence = occ;
                            reqStatus = 'passed';
                            reqReason = `已於 ${occ.semester} 修畢且符合成績門檻 (${score}分 ≥ ${minScore}分)`;
                            break;
                        }
                    } else {
                        // 修畢但無登記成績，無法確認是否達標 (unknown)
                        if ((status === '已取得' || status === '未取得') && !unknownCandidate) {
                            unknownCandidate = {
                                occ,
                                reason: `曾於 ${occ.semester} 修畢課程，但未登記成績，無法確認是否達到 ${minScore} 分門檻`
                            };
                        }
                    }
                } else if (reqSpec.requirement === 'completed') {
                    if (status === '已取得' || status === '未取得') {
                        fulfilled = true;
                        bestOccurrence = occ;
                        reqStatus = 'passed';
                        reqReason = `已於 ${occ.semester} 修畢課程 (滿足曾修讀要求)`;
                        break;
                    }
                }

                if (status === '修讀中' && !plannedCandidate) {
                    plannedCandidate = occ;
                }
            }

            if (!fulfilled) {
                if (unknownCandidate) {
                    reqStatus = 'unknown';
                    bestOccurrence = unknownCandidate.occ;
                    reqReason = unknownCandidate.reason;
                } else if (plannedCandidate) {
                    reqStatus = 'planned';
                    bestOccurrence = plannedCandidate;
                    reqReason = `先修課程已安排於 ${plannedCandidate.semester}，需符合要求後修讀`;
                } else if (sameTermOccs.length > 0) {
                    reqStatus = 'same_term';
                    bestOccurrence = sameTermOccs[0];
                    reqReason = `先修課程與本課安排於同一學期（${sameTermOccs[0].semester}），修讀順序不成立`;
                } else if (laterOccs.length > 0) {
                    reqStatus = 'later_term';
                    bestOccurrence = laterOccs[0];
                    reqReason = `先修課程安排於較晚學期（${laterOccs[0].semester}），修讀順序不成立`;
                } else if (earlierOccs.length > 0) {
                    const lastAttempt = earlierOccs[earlierOccs.length - 1];
                    reqStatus = 'failed';
                    bestOccurrence = lastAttempt;
                    const scoreText = lastAttempt.course.score !== null ? `${lastAttempt.course.score}分` : '不及格';
                    reqReason = `曾於 ${lastAttempt.semester} 修讀但未達門檻 (${scoreText} < ${reqSpec.minScore}分)`;
                } else {
                    reqStatus = 'missing';
                    reqReason = `全學期規劃中尚未排入先修課程「${reqSpec.name}」`;
                }
            }

            if (reqStatus === 'passed') {
                // pass
            } else if (reqStatus === 'planned') {
                hasPlanned = true;
            } else if (reqStatus === 'unknown') {
                hasUnknown = true;
            } else {
                hasBlocked = true;
            }

            details.push({
                reqCourseName: reqSpec.name,
                reqCode: reqSpec.code,
                requirement: reqSpec.requirement,
                minScore: reqSpec.minScore ?? null,
                status: reqStatus,
                foundSemester: bestOccurrence ? bestOccurrence.semester : null,
                isEarlier: bestOccurrence ? (bestOccurrence.semesterIndex < targetSemIdx) : false,
                score: bestOccurrence?.course?.score ?? null,
                courseStatus: bestOccurrence?.course?.status ?? null,
                reason: reqReason
            });
        });

        // 3. 裁定整體狀態
        let overallStatus = 'passed';
        let level = 'success';
        let message = '先修條件已全數符合';

        if (hasBlocked) {
            overallStatus = 'blocked';
            level = 'danger';
            const blockedDetails = details.filter(d => ['missing', 'failed', 'same_term', 'later_term'].includes(d.status));
            message = blockedDetails.map(d => d.reason).join('；');
        } else if (hasUnknown) {
            overallStatus = 'unknown';
            level = 'neutral';
            const unknownDetails = details.filter(d => d.status === 'unknown');
            message = unknownDetails.map(d => d.reason).join('；');
        } else if (hasPlanned) {
            overallStatus = 'planned';
            level = 'warning';
            const plannedDetails = details.filter(d => d.status === 'planned');
            message = plannedDetails.map(d => `先修課程「${d.reqCourseName}」已安排於 ${d.foundSemester}，需符合要求後修讀`).join('；');
        }

        return {
            hasPrerequisite: true,
            overallStatus,
            level,
            message,
            targetCourseName,
            targetSemester,
            details
        };
    },

    /**
     * 批次檢查特定學期內的所有課程
     */
    checkSemester(targetSemester, semestersData = {}, semesterOrder = []) {
        const courses = semestersData[targetSemester] || [];
        return courses.map(course => ({
            courseId: course.id,
            courseName: course.name,
            result: this.check(course, targetSemester, semestersData, semesterOrder)
        }));
    },

    /**
     * 執行完整驗證測試矩陣 (13 項測試)
     */
    runTests() {

        const originalRules = window.PREREQUISITE_RULES || [];
        window.PREREQUISITE_RULES = [
            ...originalRules,
            {
                targetCode: 'SAMPLE_REQUIRED',
                targetName: '某門必選課',
                type: 'completed_before',
                required: [{ code: 'SAMPLE_PREREQ', name: '某門先修課', requirement: 'completed' }],
                description: '測試曾修讀規則'
            },
            {
                targetCode: 'SAMPLE_INVALID_RULE',
                targetName: '缺失門檻之目標課',
                type: 'completed_before',
                required: [{ code: 'EE1001', name: '微積分 (一)', requirement: 'passed' }],
                description: '測試缺失門檻'
            }
        ];

        const semOrder = ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
        const results = [];

        function assert(testName, actual, expectedStatus, expectedLevel) {
            const pass = (actual.overallStatus === expectedStatus && actual.level === expectedLevel);
            results.push({
                testName,
                passed: pass,
                actualStatus: actual.overallStatus,
                expectedStatus,
                actualLevel: actual.level,
                expectedLevel,
                message: actual.message
            });
        }

        // Test 1: 先修已通過 (82分 / 門檻60)
        const semData1 = { "一上": [{ id: 1, code: 'EE1001', name: '微積分 (一)', status: '已取得', score: 82 }] };
        assert("Test 1: 先修 82 分 / 門檻 60", this.check({ code: 'EE1002', name: '微積分 (二)' }, "一下", semData1, semOrder), 'passed', 'success');

        // Test 2 (Test A): 先修 55 分 / 門檻 50
        const semData2 = { "一上": [{ id: 2, code: 'EE2001', name: '電路學 (一)', status: '未取得', score: 55 }] };
        assert("Test 2 (Test A): 先修 55 分 / 門檻 50", this.check({ code: 'EE2002', name: '電子學 (一)' }, "二上", semData2, semOrder), 'passed', 'success');

        // Test 3 (Test B): 先修 55 分 / 門檻 60
        const semData3 = { "一上": [{ id: 3, code: 'EE1001', name: '微積分 (一)', status: '未取得', score: 55 }] };
        assert("Test 3 (Test B): 先修 55 分 / 門檻 60", this.check({ code: 'EE1002', name: '微積分 (二)' }, "一下", semData3, semOrder), 'blocked', 'danger');

        // Test 4 (Test C): requirement = completed，先修 55 分未及格
        const semData4 = { "一上": [{ id: 4, code: 'SAMPLE_PREREQ', name: '某門先修課', status: '未取得', score: 55 }] };
        assert("Test 4 (Test C): requirement = completed，先修 55 分", this.check({ code: 'SAMPLE_REQUIRED', name: '某門必選課' }, "一下", semData4, semOrder), 'passed', 'success');

        // Test 5: 先修安排於前一學期修讀中
        const semData5 = { "二上": [{ id: 5, code: 'EE1002', name: '微積分 (二)', status: '修讀中', score: null }] };
        assert("Test 5: 先修安排於前一學期修讀中", this.check({ code: 'EE2003', name: '工程數學 (一)' }, "二下", semData5, semOrder), 'planned', 'warning');

        // Test 6: 先修與目標同學期
        const semData6 = { "二下": [{ id: 61, code: 'EE1002', name: '微積分 (二)', status: '修讀中' }, { id: 62, code: 'EE2003', name: '工程數學 (一)', status: '修讀中' }] };
        assert("Test 6: 先修與目標同學期", this.check({ code: 'EE2003', name: '工程數學 (一)' }, "二下", semData6, semOrder), 'blocked', 'danger');

        // Test 7: 先修安排在目標之後
        const semData7 = { "二下": [{ id: 71, code: 'EE2003', name: '工程數學 (一)', status: '修讀中' }], "三上": [{ id: 72, code: 'EE1002', name: '微積分 (二)', status: '修讀中' }] };
        assert("Test 7: 先修安排在目標之後", this.check({ code: 'EE2003', name: '工程數學 (一)' }, "二下", semData7, semOrder), 'blocked', 'danger');

        // Test 8: 沒有先修安排
        const semData8 = { "二下": [{ id: 81, code: 'EE2003', name: '工程數學 (一)', status: '修讀中' }] };
        assert("Test 8: 沒有先修安排", this.check({ code: 'EE2003', name: '工程數學 (一)' }, "二下", semData8, semOrder), 'blocked', 'danger');

        // Test 9: 曾不及格 (45分)，後重修通過 (72分)
        const semData9 = { "一上": [{ id: 91, code: 'EE1001', name: '微積分 (一)', status: '未取得', score: 45 }], "二上": [{ id: 92, code: 'EE1001', name: '微積分 (一)', status: '已取得', score: 72 }] };
        assert("Test 9: 曾不及格，重修後通過", this.check({ code: 'EE1002', name: '微積分 (二)' }, "二下", semData9, semOrder), 'passed', 'success');

        // Test 10 (修正 1): 已取得但 score === null
        const semData10 = { "一上": [{ id: 101, code: 'EE1001', name: '微積分 (一)', status: '已取得', score: null }] };
        assert("Test 10: 已取得但未登記分數 (門檻 60)", this.check({ code: 'EE1002', name: '微積分 (二)' }, "一下", semData10, semOrder), 'unknown', 'neutral');

        // Test 11 (修正 2): 規則本身漏填 minScore
        const semData11 = { "一上": [{ id: 111, code: 'EE1001', name: '微積分 (一)', status: '已取得', score: 80 }] };
        assert("Test 11: 規則本身缺失 minScore", this.check({ code: 'SAMPLE_INVALID_RULE', name: '缺失門檻之目標課' }, "一下", semData11, semOrder), 'unknown', 'neutral');

        // Test 12 (本次補齊): 目標學期時序無法確認
        assert("Test 12: 目標學期時序未明", this.check({ code: 'EE1002', name: '微積分 (二)' }, "未知學期", {}, semOrder), 'unknown', 'neutral');

        // Test 13: 無先修規定之課程 (none)
        assert("Test 13: 無先修限制課程", this.check({ name: '任意普通選修課' }, "二下", {}, semOrder), 'none', 'neutral');

        window.PREREQUISITE_RULES = originalRules;
        return results;
    }
};

if (typeof window !== 'undefined') {
    window.PrerequisiteEngine = PrerequisiteEngine;
}