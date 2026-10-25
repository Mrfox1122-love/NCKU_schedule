// ============================================================
// 🎓 TimeFlow v3.3.2 — 碩士班畢業檢核純計算引擎 (master-engine.js)
// ------------------------------------------------------------
// 只讀取資料、回傳結果，不操作畫面；規則來自 master-rules.js。
// ============================================================

function normalizeMasterCourseName(name) {
    return String(name || '')
        .replace(/\s+/g, '')
        .replace(/（/g, '(')
        .replace(/）/g, ')')
        .toLowerCase();
}

/**
 * 依修課狀態分類：已取得 → earned；修讀中 → planned；其餘（未取得、暫定）不計
 */
function getMasterCourseProgress(course) {
    if (course.isTentative) return null;
    if (course.status === '已取得' || course.status === '已抵免') return 'earned';
    if (course.status === '修讀中') return 'planned';
    return null;
}

function isSeminarCourse(course) {
    return course.type === '專題討論' || normalizeMasterCourseName(course.name).startsWith('專題討論');
}

/**
 * 碩士班畢業檢核
 * @param {object} data appData
 */
function calculateMasterGraduation(data) {
    const rule = getMasterRule(data.masterProgram, data.masterEntryYear);
    const order = data.semesterOrder || Object.keys(data.semesters || {});

    const own = { earned: 0, planned: 0 };
    const external = { earned: 0, planned: 0 };
    const waived = { earned: 0, courses: [] };
    const seminarSems = { earned: new Set(), planned: new Set() };
    const thesis = { status: 'missing', semester: null };
    const uncounted = [];
    const passedNames = new Map();   // 標準化名稱 → 'earned' | 'planned'

    order.forEach(sem => {
        (data.semesters[sem] || []).forEach(course => {
            const progress = getMasterCourseProgress(course);
            if (!progress) return;

            const norm = normalizeMasterCourseName(course.name);
            if (passedNames.get(norm) !== 'earned') passedNames.set(norm, progress);

            const credits = parseFloat(course.credits) || 0;
            const bucket = progress === 'earned' ? 'earned' : 'planned';

            if (isSeminarCourse(course)) {
                seminarSems[bucket].add(sem);
                return;
            }

            switch (course.type) {
                case '論文':
                    if (progress === 'earned' || thesis.status !== 'earned') {
                        thesis.status = progress;
                        thesis.semester = sem;
                    }
                    return;
                case '本所選修':
                    own[bucket] += credits;
                    break;
                case '外所選修':
                    external[bucket] += credits;
                    break;
                case '大學部課程':
                case '補修':
                    uncounted.push({ semester: sem, name: course.name, credits, reason: course.type === '補修' ? '補修' : '大學部課程不列入畢業學分' });
                    return;
                default:
                    // 大學部類別（系定必修、通識等）在碩士班模式下無法判定本所或外所
                    uncounted.push({ semester: sem, name: course.name, credits, reason: `類別「${course.type}」不屬於碩士班類別，請改為本所選修或外所選修` });
                    return;
            }

            if (course.status === '已抵免') {
                waived.earned += credits;
                waived.courses.push({ semester: sem, name: course.name, credits });
            }
        });
    });

    // ── 學分計算：外所與抵免各有上限 ──
    const capExternal = value => Math.min(value, rule.maxExternal);
    const waivedOverflow = rule.maxWaived === null ? 0 : Math.max(0, waived.earned - rule.maxWaived);

    const externalEarnedCounted = capExternal(external.earned);
    const externalExpectedCounted = capExternal(external.earned + external.planned);
    const earnedTotal = Math.max(0, own.earned + externalEarnedCounted - waivedOverflow);
    const expectedTotal = Math.max(0, own.earned + own.planned + externalExpectedCounted - waivedOverflow);

    // ── 專題討論 ──
    let seminarRequired = 0;
    if (rule.seminar.mode === 'fixed') {
        seminarRequired = rule.seminar.count;
    } else {
        const duration = String(data.masterDuration || '2');
        seminarRequired = rule.seminar.byDuration[duration] ?? rule.seminar.byDuration['2'];
    }
    const seminarPlannedOnly = [...seminarSems.planned].filter(s => !seminarSems.earned.has(s));
    const seminar = {
        required: seminarRequired,
        earned: seminarSems.earned.size,
        expected: seminarSems.earned.size + seminarPlannedOnly.length,
        mode: rule.seminar.mode,
        duration: rule.seminar.mode === 'byDuration' ? String(data.masterDuration || '2') : null
    };

    // ── 指定課程 ──
    const requiredCourses = rule.requiredCourses.map(name => {
        const status = passedNames.get(normalizeMasterCourseName(name));
        return { name, status: status === 'earned' ? 'passed' : (status === 'planned' ? 'planned' : 'missing') };
    });

    // ── 補修：大學已修過（使用者勾選）或已修畢同名課程 ──
    const remedialDone = data.masterRemedialDone || {};
    const remedial = rule.remedial.map(name => {
        if (remedialDone[name]) return { name, status: 'exempt' };
        const norm = normalizeMasterCourseName(name);
        let status = 'missing';
        passedNames.forEach((progress, courseName) => {
            if (!courseName.includes(norm)) return;
            if (progress === 'earned') status = 'passed';
            else if (status !== 'passed') status = 'planned';
        });
        return { name, status };
    });

    const ethics = {
        required: rule.ethicsHours,
        hours: parseFloat(data.masterEthicsHours) || 0
    };

    const checks = {
        credits: earnedTotal >= rule.totalCredits,
        seminar: seminar.earned >= seminar.required,
        thesis: thesis.status === 'earned',
        requiredCourses: requiredCourses.every(r => r.status === 'passed'),
        remedial: remedial.every(r => r.status === 'passed' || r.status === 'exempt'),
        ethics: ethics.required === 0 || ethics.hours >= ethics.required
    };

    return {
        rule,
        credits: {
            target: rule.totalCredits,
            earned: earnedTotal,
            expected: expectedTotal,
            own: { earned: own.earned, expected: own.earned + own.planned },
            external: {
                earned: external.earned,
                expected: external.earned + external.planned,
                countedEarned: externalEarnedCounted,
                countedExpected: externalExpectedCounted,
                cap: rule.maxExternal
            },
            waived: { earned: waived.earned, cap: rule.maxWaived, overflow: waivedOverflow, courses: waived.courses }
        },
        seminar,
        thesis: { ...thesis, credits: rule.thesisCredits },
        requiredCourses,
        remedial,
        ethics,
        uncounted,
        checks,
        allPassed: Object.values(checks).every(Boolean)
    };
}

if (typeof window !== 'undefined') {
    window.calculateMasterGraduation = calculateMasterGraduation;
    window.normalizeMasterCourseName = normalizeMasterCourseName;
}
