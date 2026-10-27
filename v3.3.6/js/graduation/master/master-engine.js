// ============================================================
// 🎓 TimeFlow v3.3.6 — 碩士班畢業檢核純計算引擎 (master-engine.js)
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

// 課名就是「碩士論文」「博士論文」等，即使類別忘了改也當作學位論文
const THESIS_COURSE_NAMES = ['論文', '碩士論文', '博士論文', '學位論文', '碩士學位論文', '博士學位論文'];
function isThesisCourse(course) {
    return course.type === '論文' || THESIS_COURSE_NAMES.includes(normalizeMasterCourseName(course.name));
}

/**
 * 課名是否符合指定課名：完全相同，或只多了括號註記、組別
 * （例如「研究倫理與論文寫作(英)」「高等生理學A組」符合；「生物技術學特論」不符合「生物技術學」）
 */
function matchesMasterCourseName(courseName, targetName) {
    const norm = normalizeMasterCourseName(courseName);
    const target = normalizeMasterCourseName(targetName);
    if (!norm || !target || !norm.startsWith(target)) return false;
    const rest = norm.slice(target.length);
    return rest === '' || rest.startsWith('(') || /^[a-z甲乙丙丁]組/.test(rest);
}

/**
 * 課名是否為所別規定的必修課
 */
function isMasterRequiredCourse(rule, name) {
    return rule.requiredCourses.some(r => matchesMasterCourseName(name, r));
}

function isSeminarCourse(course) {
    return course.type === '專題討論' || normalizeMasterCourseName(course.name).startsWith('專題討論');
}

/**
 * 碩士班畢業檢核
 * @param {object} data appData
 */
function calculateMasterGraduation(data) {
    const rule = getMasterRule(data.masterProgram, data.masterEntryYear, data.masterCustom);
    const order = data.semesterOrder || Object.keys(data.semesters || {});

    const own = { earned: 0, planned: 0 };
    const ownRequired = { earned: 0, planned: 0 };   // 本所學分中屬於必修課的部分
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
                // 部分所別的專題討論有學分且計入畢業學分（例如交管所每學期 1 學分）
                if (rule.seminarCreditsCount) own[bucket] += credits;
                return;
            }

            if (isThesisCourse(course)) {
                if (progress === 'earned' || thesis.status !== 'earned') {
                    thesis.status = progress;
                    thesis.semester = sem;
                }
                return;
            }

            switch (course.type) {
                case '本所必修':
                case '本所選修':
                    own[bucket] += credits;
                    if (course.type === '本所必修' || isMasterRequiredCourse(rule, course.name)) ownRequired[bucket] += credits;
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
                    uncounted.push({ semester: sem, name: course.name, credits, reason: `類別「${course.type}」不屬於碩士班類別，請改為本所必修、本所選修或外所選修` });
                    return;
            }

            if (course.status === '已抵免') {
                waived.earned += credits;
                waived.courses.push({ semester: sem, name: course.name, credits });
            }
        });
    });

    // ── 學分計算：外所與抵免各有上限（null 表示規章未限制） ──
    const capExternal = value => (rule.maxExternal === null ? value : Math.min(value, rule.maxExternal));
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

    // ── 指定課程：課名相同，或只多了括號註記、組別即算 ──
    const findCourseStatus = (norm, match) => {
        let status = 'missing';
        passedNames.forEach((progress, courseName) => {
            if (!match(courseName, norm)) return;
            if (progress === 'earned') status = 'passed';
            else if (status !== 'passed') status = 'planned';
        });
        return status;
    };
    const requiredCourses = rule.requiredCourses.map(name => ({
        name,
        status: findCourseStatus(name, (courseName, target) => matchesMasterCourseName(courseName, target))
    }));

    // ── 補修：大學已修過（使用者勾選）或已修畢同名課程 ──
    const remedialDone = data.masterRemedialDone || {};
    const remedial = rule.remedial.map(name => {
        if (remedialDone[name]) return { name, status: 'exempt' };
        return { name, status: findCourseStatus(normalizeMasterCourseName(name), (courseName, norm) => courseName.includes(norm)) };
    });

    const ethics = {
        required: rule.ethicsHours,
        hours: parseFloat(data.masterEthicsHours) || 0
    };

    const checks = {
        credits: earnedTotal >= rule.totalCredits,
        // 部分所別規定至少須修本所開授課程若干學分（例如機械所 12 學分）
        ownCredits: rule.minOwnCredits === null || own.earned >= rule.minOwnCredits,
        // 部分所別規定至少須修非本系課程若干學分（例如地科系 6 學分），與大學部融合通識下限同理
        externalMin: rule.minExternal === null || external.earned >= rule.minExternal,
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
            own: {
                earned: own.earned,
                expected: own.earned + own.planned,
                min: rule.minOwnCredits,
                required: { earned: ownRequired.earned, expected: ownRequired.earned + ownRequired.planned },
                elective: { earned: own.earned - ownRequired.earned, expected: own.earned + own.planned - ownRequired.earned - ownRequired.planned }
            },
            external: {
                earned: external.earned,
                expected: external.earned + external.planned,
                countedEarned: externalEarnedCounted,
                countedExpected: externalExpectedCounted,
                cap: rule.maxExternal,
                min: rule.minExternal
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
    window.isMasterRequiredCourse = isMasterRequiredCourse;
}
