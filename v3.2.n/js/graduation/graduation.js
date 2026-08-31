// ============================================================
// 🎓 TimeFlow v3.2 — 畢業學分純計算核心 Engine (Data-Driven - Fixed)
// ============================================================

function calculateMilitaryDeductionDays(courseCount) {
    if (courseCount >= 5) return 22;
    return Math.floor(courseCount * 4.5);
}

function cleanGeneralCourseTitle(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase()
        .replace(/[\s\-_—–()（）\[\]【】·・、,，:：]/g, '')
        .replace(/介/g, '界');
}

function calculateGraduation(data) {
    if (!data) return null;

    const rawDeptName = data.deptName || "電機工程學系";
    const entryYear = parseInt(data.entryYear || 118, 10);
    const currentSemester = data.currentSemester || "一上";

    const rule = (typeof getDepartmentGraduationRule === 'function') 
        ? getDepartmentGraduationRule(rawDeptName, entryYear, data) 
        : null;

    if (!rule || !rule.ruleFound) {
        return {
            ruleFound: false,
            deptName: rawDeptName,
            entryYear: entryYear,
            statusMessage: `尚未建立「${rawDeptName}（${entryYear} 級）」的畢業審查規則`,
            warnings: [{ type: 'danger', text: `尚未建立此科系／入學年度的畢業規則，請確認科系與入學年份是否正確。` }]
        };
    }

    const isInterdisciplinary = !!rule.isInterdisciplinary;
    const targetCredits = rule.targetCredits;
    const targetRequired = rule.requiredCredits;
    const targetReqElective = rule.requiredElectiveCredits;
    const targetElective = rule.electiveCredits;
    const maxOutElective = rule.maxOutsideDeptElective;
    const excludedDomains = rule.excludedGeneralDomains || [];
    const diversityExcludedDomains = rule.diversityExcludedDomains || [];
    const domainCaps = rule.generalDomainCaps || {};
    const disallowedCourses = rule.disallowedGeneralCourses || [];

    let gReq = 0, gRong = 0, gChinese = 0, gEnglish = 0, gTainan = 0, gPe = 0;
    let gGenHuman = 0, gGenSocial = 0, gGenBio = 0, gGenInter = 0, gGenNature = 0; 
    let gSecondLangGen = 0;
    let gElecDept = 0, gElecReq = 0, gElecOutRaw = 0; 
    let gCrossReq = 0, gCrossElec = 0;
    let gMilCount = 0;
    let gServiceCount = 0;

    let eReq = 0, eRong = 0, eChinese = 0, eEnglish = 0, eTainan = 0, ePe = 0;
    let eGenHuman = 0, eGenSocial = 0, eGenBio = 0, eGenInter = 0, eGenNature = 0; 
    let eSecondLangGen = 0;
    let eElecDept = 0, eElecReq = 0, eElecOutRaw = 0; 
    let eCrossReq = 0, eCrossElec = 0;
    let eMilCount = 0;
    let eServiceCount = 0;
    
    // 不分系專屬累計變數
    let ccepCareerEarned = 0, ccepCareerExp = 0;
    let ccepMethodologyCount = 0, ccepMethodologyCreds = 0, ccepMethodologyExp = 0;
    let ccepProjectCreds = 0, ccepProjectExp = 0;
    let ccepFacultyCreds = 0, ccepFacultyExp = 0;
    let ccepFreeEarned = 0, ccepFreeExp = 0;

    const methodologyList = rule.coreStructure?.methodologyList || [
        '服務設計方法論', '場域觀察和現象發掘方法', '資料科學方法與實作',
        '文本跨閱與思辨方法', '人類行為的演化方法', '社會事件之觀察與省思方法',
        '科技人必備的歷史思維與批判方法', '人機互動設計與應用方法論', '商業模式解析與價值導向創新'
    ];

    let currentSemSelectedCredits = 0; 
    let currentSemEarnedCredits = 0; 
    let semGpaCredits = 0, semGpaSum = 0, semWeightedSum = 0;
    let cumGpaCredits = 0, cumGpaSum = 0, cumWeightedSum = 0;

    let disallowedCourseWarnings = [];

    const semesters = data.semesters || {};
    Object.keys(semesters).forEach(sem => {
        const isCurrentSem = (sem === currentSemester);
        (semesters[sem] || []).forEach(course => {
            const credits = parseFloat(course.credits) || 0;
            const isTentative = course.isTentative === true;
            
            const rawCourseName = (course.name || course.title || course.courseName || course.cname || '').trim();
            const cleanTitle = cleanGeneralCourseTitle(rawCourseName);

            const isPassed = (course.status === '已取得' || (course.status === undefined && course.passed !== false));
            const isInProgress = (course.status === '修讀中');

            if (isCurrentSem && !isTentative) {
                currentSemSelectedCredits += credits;
                if (isPassed) currentSemEarnedCredits += credits;
            }

            const score = (course.score !== undefined && course.score !== null) ? parseFloat(course.score) : null;
            if (!isInProgress && !isTentative && score !== null && credits > 0) {
                const gp = typeof getGradePoint === 'function' ? getGradePoint(score) : 0;
                cumGpaCredits += credits;
                cumGpaSum += (gp * credits);
                cumWeightedSum += (score * credits);

                if (isCurrentSem) {
                    semGpaCredits += credits;
                    semGpaSum += (gp * credits);
                    semWeightedSum += (score * credits);
                }
            }

            // 🌟 修正：精準比對排除過度模糊匹配誤殺
            const isDisallowedGeneral = disallowedCourses.length > 0 && 
                (course.type && (course.type.startsWith('通識') || course.type === '融通' || course.type.startsWith('第二外語'))) &&
                disallowedCourses.some(dc => {
                    const cleanDc = cleanGeneralCourseTitle(dc);
                    return cleanDc && cleanTitle && (cleanTitle === cleanDc || cleanTitle.includes(cleanDc));
                });

            if (isDisallowedGeneral && (isPassed || isInProgress) && !isTentative) {
                if (!disallowedCourseWarnings.includes(rawCourseName)) {
                    disallowedCourseWarnings.push(rawCourseName);
                }
            }

            if ((isPassed || isInProgress) && !isTentative) {
                if (isInterdisciplinary) {
                    if (course.type === '不分系-自我與職涯探索' || rawCourseName.includes('自我與職涯探索')) {
                        ccepCareerExp += credits;
                        if (isPassed) ccepCareerEarned += credits;
                    } else if (course.type === '不分系-專題方法論' || methodologyList.some(m => rawCourseName.includes(m))) {
                        ccepMethodologyExp += credits;
                        if (isPassed) {
                            ccepMethodologyCreds += credits;
                            ccepMethodologyCount += 1;
                        }
                    } else if (course.type === '不分系-跨領域專題' || rawCourseName.includes('跨領域問題導向專題') || rawCourseName.includes('跨領域專題')) {
                        ccepProjectExp += credits;
                        if (isPassed) ccepProjectCreds += credits;
                    } else if (['專長養成-院必修', '專長養成-院選修', '專長養成-目標輔系', '系定必修', '選修-本系'].includes(course.type)) {
                        ccepFacultyExp += credits;
                        if (isPassed) ccepFacultyCreds += credits;
                    } else if (['自由選修', '選修-外系', '第二外語-選修'].includes(course.type)) {
                        ccepFreeExp += credits;
                        if (isPassed) ccepFreeEarned += credits;
                    }
                }

                switch (course.type) {
                    case '系定必修':
                    case '專長養成-院必修':
                    case '不分系-自我與職涯探索': eReq += credits; break;
                    case '融通': if (!isDisallowedGeneral) eRong += credits; break;
                    case '國文': eChinese += credits; break;
                    case '英文': eEnglish += credits; break;
                    case '踏溯台南': eTainan += credits; break;
                    case '體育': ePe += 1; break;
                    case '服務學習': eServiceCount += 1; break;
                    case '軍訓':
                    case '全民國防': eMilCount += 1; break;
                    case '第二外語-通識':
                    case '第二外語': if (!isDisallowedGeneral) eSecondLangGen += credits; break;
                    case '第二外語-選修':
                    case '自由選修': eElecOutRaw += credits; break;
                    case '通識-人文': if (!isDisallowedGeneral) eGenHuman += credits; break;
                    case '通識-社科': if (!isDisallowedGeneral) eGenSocial += credits; break;
                    case '通識-生醫': if (!isDisallowedGeneral) eGenBio += credits; break;
                    case '通識-科際': if (!isDisallowedGeneral) eGenInter += credits; break;
                    case '通識-自然': if (!isDisallowedGeneral) eGenNature += credits; break; 
                    case '選修-本系':
                    case '專長養成-院選修':
                    case '不分系-專題方法論':
                    case '不分系-跨領域專題': eElecDept += credits; break;
                    case '選修-必選':
                    case '專長養成-目標輔系': eElecReq += credits; break;
                    case '選修-外系': eElecOutRaw += credits; break;
                    case '跨領域-必修': eCrossReq += credits; break;
                    case '跨領域-選修': eCrossElec += credits; break;
                }

                if (isPassed) {
                    switch (course.type) {
                        case '系定必修':
                        case '專長養成-院必修':
                        case '不分系-自我與職涯探索': gReq += credits; break;
                        case '融通': if (!isDisallowedGeneral) gRong += credits; break;
                        case '國文': gChinese += credits; break;
                        case '英文': gEnglish += credits; break;
                        case '踏溯台南': gTainan += credits; break;
                        case '體育': gPe += 1; break;
                        case '服務學習': gServiceCount += 1; break;
                        case '軍訓':
                        case '全民國防': gMilCount += 1; break;
                        case '第二外語-通識':
                        case '第二外語': if (!isDisallowedGeneral) gSecondLangGen += credits; break;
                        case '第二外語-選修':
                        case '自由選修': gElecOutRaw += credits; break;
                        case '通識-人文': if (!isDisallowedGeneral) gGenHuman += credits; break;
                        case '通識-社科': if (!isDisallowedGeneral) gGenSocial += credits; break;
                        case '通識-生醫': if (!isDisallowedGeneral) gGenBio += credits; break;
                        case '通識-科際': if (!isDisallowedGeneral) gGenInter += credits; break;
                        case '通識-自然': if (!isDisallowedGeneral) gGenNature += credits; break; 
                        case '選修-本系':
                        case '專長養成-院選修':
                        case '不分系-專題方法論':
                        case '不分系-跨領域專題': gElecDept += credits; break;
                        case '選修-必選':
                        case '專長養成-目標輔系': gElecReq += credits; break;
                        case '選修-外系': gElecOutRaw += credits; break;
                        case '跨領域-必修': gCrossReq += credits; break;
                        case '跨領域-選修': gCrossElec += credits; break;
                    }
                }
            }
        });
    });

    let gElecOut = gElecOutRaw > maxOutElective ? maxOutElective : gElecOutRaw;
    let eElecOut = eElecOutRaw > maxOutElective ? maxOutElective : eElecOutRaw;
    let isOutOverflow = eElecOutRaw > maxOutElective;
    let outOverflowCredits = isOutOverflow ? (eElecOutRaw - maxOutElective) : 0;

    const engRule = getEnglishRule(data.englishWaived, entryYear);
    const genRule = getGeneralEducationLimits(data.englishWaived, entryYear);
    const genTarget = genRule.maxCombinedGen;
    const requiredDomainsCount = rule.requiredGeneralDomainsCount || genRule.domainCountMin;

    function resolveDomainCap(aliasKeys) {
        for (const k of aliasKeys) {
            if (domainCaps[k] !== undefined) return parseFloat(domainCaps[k]);
            if (excludedDomains.includes(k)) return 0;
        }
        return genRule.domainMax;
    }

    const capHuman  = resolveDomainCap(['human', '人文', '人文學']);
    const capSocial = resolveDomainCap(['social', '社科', '社會科學']);
    const capNature = resolveDomainCap(['nature', '自然', '自然與工程', '自然與工程科學']);
    const capBio    = resolveDomainCap(['bio', '生醫', '生命與健康', '生命科學與健康']);
    const capInter  = resolveDomainCap(['inter', '科際', '科際整合']);

    let effectiveGGenHuman  = Math.min(gGenHuman, capHuman);
    let effectiveEGenHuman  = Math.min(eGenHuman, capHuman);
    let effectiveGGenSocial = Math.min(gGenSocial, capSocial);
    let effectiveEGenSocial = Math.min(eGenSocial, capSocial);
    let effectiveGGenNature = Math.min(gGenNature, capNature);
    let effectiveEGenNature = Math.min(eGenNature, capNature);
    let effectiveGGenBio    = Math.min(gGenBio, capBio);
    let effectiveEGenBio    = Math.min(eGenBio, capBio);
    let effectiveGGenInter  = Math.min(gGenInter, capInter);
    let effectiveEGenInter  = Math.min(eGenInter, capInter);

    let totalGenCreditsRaw = effectiveGGenHuman + effectiveGGenSocial + effectiveGGenBio + effectiveGGenInter + effectiveGGenNature + gSecondLangGen;
    let totalGenExpectedRaw = effectiveEGenHuman + effectiveEGenSocial + effectiveEGenBio + effectiveEGenInter + effectiveEGenNature + eSecondLangGen;
    
    let gGen = Math.min(totalGenCreditsRaw, genRule.domainMax);
    let eGen = Math.min(totalGenExpectedRaw, genRule.domainMax);

    let gRongCapped = Math.min(gRong, genRule.rongMax);
    let eRongCapped = Math.min(eRong, genRule.rongMax);

    let combinedGenEarned = gGen + gRongCapped;
    let effectiveCombinedGenEarned = Math.min(genRule.maxCombinedGen, combinedGenEarned);

    let combinedGenExpected = eGen + eRongCapped;
    let effectiveCombinedGenExpected = Math.min(genRule.maxCombinedGen, combinedGenExpected);

    const domainDefList = [
        { key: 'human', name: '人文學', aliases: ['human', '人文', '人文學'], cap: capHuman, earned: effectiveGGenHuman, exp: effectiveEGenHuman, rawExp: eGenHuman, rawEarned: gGenHuman },
        { key: 'social', name: '社會科學', aliases: ['social', '社科', '社會科學'], cap: capSocial, earned: effectiveGGenSocial, exp: effectiveEGenSocial, rawExp: eGenSocial, rawEarned: gGenSocial },
        { key: 'nature', name: '自然與工程科學', aliases: ['nature', '自然', '自然與工程', '自然與工程科學'], cap: capNature, earned: effectiveGGenNature, exp: effectiveEGenNature, rawExp: eGenNature, rawEarned: gGenNature },
        { key: 'bio', name: '生命科學與健康', aliases: ['bio', '生醫', '生命與健康', '生命科學與健康'], cap: capBio, earned: effectiveGGenBio, exp: effectiveEGenBio, rawExp: eGenBio, rawEarned: gGenBio },
        { key: 'inter', name: '科際整合', aliases: ['inter', '科際', '科際整合'], cap: capInter, earned: effectiveGGenInter, exp: effectiveEGenInter, rawExp: eGenInter, rawEarned: gGenInter }
    ];

    let activeDomainsEarned = 0;
    let activeDomainsExpected = 0;

    domainDefList.forEach(d => {
        const isExcluded = excludedDomains.some(ex => d.aliases.includes(ex));
        const isDiversityExcluded = diversityExcludedDomains.some(ex => d.aliases.includes(ex));
        
        if (!isExcluded && !isDiversityExcluded) {
            if (d.earned > 0) activeDomainsEarned++;
            if (d.exp > 0) activeDomainsExpected++;
        }
    });

    let isDomainPassed = (gGen >= genRule.domainMin && activeDomainsEarned >= requiredDomainsCount);
    let isRongPassed = (gRong >= genRule.rongMin);
    let isGenTotalEarnedPassed = (effectiveCombinedGenEarned >= genTarget);
    let isAllGenPassed = isDomainPassed && isRongPassed && isGenTotalEarnedPassed;

    let isDomainExpectedPassed = (eGen >= genRule.domainMin && activeDomainsExpected >= requiredDomainsCount);
    let isRongExpectedPassed = (eRong >= genRule.rongMin);
    let isGenTotalExpectedPassed = (effectiveCombinedGenExpected >= genTarget);
    let isAllGenExpectedPassed = isDomainExpectedPassed && isRongExpectedPassed && isGenTotalExpectedPassed;

    let genWarnings = [];

    disallowedCourseWarnings.forEach(cName => {
        genWarnings.push({ type: 'warning', text: `本系修業規定不承認通識「${cName}」（與專業相近，不計入通識與畢業學分）` });
    });

    domainDefList.forEach(item => {
        if (item.rawExp > item.cap) {
            const countText = (item.rawExp === item.rawEarned) ? `已修讀 ${item.rawEarned}` : `預計修讀 ${item.rawExp}`;
            if (item.cap === 0) {
                genWarnings.push({ type: 'warning', text: `本系修業規定不採計「${item.name}」領域通識（${countText} 學分不計入通識門檻）` });
            } else {
                genWarnings.push({ type: 'warning', text: `本系修業規定「${item.name}」領域通識至多採計 ${item.cap} 學分（${countText} 學分，超出 ${item.rawExp - item.cap} 學分不計入畢業）` });
            }
        }
    });

    if (diversityExcludedDomains.length > 0) {
        domainDefList.forEach(d => {
            const isDivEx = diversityExcludedDomains.some(ex => d.aliases.includes(ex));
            if (isDivEx && d.rawExp > 0 && activeDomainsExpected < requiredDomainsCount) {
                genWarnings.push({
                    type: 'warning',
                    text: `本系修業規定：「${d.name}」不計入「跨 ${requiredDomainsCount} 領域」跨度計算（目前其餘領域僅跨 ${activeDomainsExpected}/${requiredDomainsCount} 個）。`
                });
            }
        });
    }

    if (combinedGenExpected > genRule.maxCombinedGen) {
        genWarnings.push({ type: 'warning', text: `通識總和預計超過 ${genRule.maxCombinedGen} 學分採計上限，溢出 ${combinedGenExpected - genRule.maxCombinedGen} 學分不計入畢業` });
    }
    if (totalGenExpectedRaw > genRule.domainMax) {
        genWarnings.push({ type: 'warning', text: `領域/二外通識預計達單項 ${genRule.domainMax} 學分上限，溢出學分不採計` });
    }

    if (effectiveCombinedGenExpected < genTarget) {
        genWarnings.push({ type: 'danger', text: `通識（領域＋融合）尚缺 ${genTarget - effectiveCombinedGenExpected} 學分達畢業門檻（預計 ${effectiveCombinedGenExpected} / 目標 ${genTarget} 學分）` });
    }
    if (eGen > 0 && activeDomainsExpected < requiredDomainsCount) {
        genWarnings.push({ type: 'danger', text: `領域尚缺 ${requiredDomainsCount - activeDomainsExpected} 個不同領域 (畢業需跨至少 ${requiredDomainsCount} 領域)` });
    }
    if (eGen < genRule.domainMin) {
        genWarnings.push({ type: 'danger', text: `領域通識尚缺 ${genRule.domainMin - eGen} 學分達基本門檻 (預計 ${eGen} / 低標 ${genRule.domainMin} 學分)` });
    }
    if (eRong < genRule.rongMin) {
        genWarnings.push({ type: 'danger', text: `融合通識尚缺 ${genRule.rongMin - eRong} 學分達基本門檻 (預計 ${eRong} / 低標 ${genRule.rongMin} 學分)` });
    }

    const effectiveReqTarget = isInterdisciplinary ? 50 : targetRequired;
    let effectiveReqEarned = Math.min(effectiveReqTarget, isInterdisciplinary ? ccepFacultyCreds : gReq);
    let effectiveReqExpected = Math.min(effectiveReqTarget, isInterdisciplinary ? ccepFacultyExp : eReq);

    let totalCoreEarnedRaw = isInterdisciplinary ? (ccepCareerEarned + ccepMethodologyCreds + ccepProjectCreds) : gElecDept;
    let totalCoreExpRaw = isInterdisciplinary ? (ccepCareerExp + ccepMethodologyExp + ccepProjectExp) : eElecDept;

    let totalElectivesEarnedRaw = isInterdisciplinary ? ccepFreeEarned : (gElecDept + gElecReq + gElecOut);
    let totalElectivesExpectedRaw = isInterdisciplinary ? ccepFreeExp : (eElecDept + eElecReq + eElecOut);

    let effectiveElectivesEarned = isInterdisciplinary ? Math.min(18, totalCoreEarnedRaw) : Math.min(targetElective, totalElectivesEarnedRaw);
    let effectiveElectivesExpected = isInterdisciplinary ? Math.min(18, totalCoreExpRaw) : Math.min(targetElective, totalElectivesExpectedRaw);

    let effectiveChineseEarned = Math.min(UNIVERSITY_GRADUATION_RULES.CHINESE_TARGET, gChinese);
    let effectiveChineseExpected = Math.min(UNIVERSITY_GRADUATION_RULES.CHINESE_TARGET, eChinese);

    let effectiveEnglishEarned = Math.min(engRule.targetEnglish, gEnglish) + engRule.waivedCreditsCredited;
    let effectiveEnglishExpected = Math.min(engRule.targetEnglish, eEnglish) + engRule.waivedCreditsCredited;

    let effectiveTainanEarned = Math.min(UNIVERSITY_GRADUATION_RULES.TAINAN_TARGET, gTainan);
    let effectiveTainanExpected = Math.min(UNIVERSITY_GRADUATION_RULES.TAINAN_TARGET, eTainan);

    let totalGradEarned = isInterdisciplinary 
        ? (effectiveReqEarned + Math.min(18, totalCoreEarnedRaw) + Math.min(32, ccepFreeEarned) + effectiveCombinedGenEarned + effectiveChineseEarned + effectiveEnglishEarned + effectiveTainanEarned)
        : (effectiveReqEarned + effectiveElectivesEarned + effectiveCombinedGenEarned + effectiveChineseEarned + effectiveEnglishEarned + effectiveTainanEarned);
    
    let totalGradExpected = isInterdisciplinary
        ? (effectiveReqExpected + Math.min(18, totalCoreExpRaw) + Math.min(32, ccepFreeExp) + effectiveCombinedGenExpected + effectiveChineseExpected + effectiveEnglishExpected + effectiveTainanExpected)
        : (effectiveReqExpected + effectiveElectivesExpected + effectiveCombinedGenExpected + effectiveChineseExpected + effectiveEnglishExpected + effectiveTainanExpected);

    let percentage = (totalGradEarned / targetCredits) * 100;
    let rawPercent = percentage.toFixed(1);
    if (percentage > 100) percentage = 100;

    let semGpa = semGpaCredits > 0 ? (semGpaSum / semGpaCredits).toFixed(2) : '0.00';
    let semWeighted = semGpaCredits > 0 ? (semWeightedSum / semGpaCredits).toFixed(1) : '0.0';
    let cumGpa = cumGpaCredits > 0 ? (cumGpaSum / cumGpaCredits).toFixed(2) : '0.00';
    let cumWeighted = cumGpaCredits > 0 ? (cumWeightedSum / cumGpaCredits).toFixed(1) : '0.0';

    const crossMajorConfig = data.crossMajor || { type: 'none', name: '', target: 40 };
    const crossMajorEarnedTotal = gCrossReq + gCrossElec;
    const crossMajorExpectedTotal = eCrossReq + eCrossElec;
    const crossMajorTarget = parseFloat(crossMajorConfig.target) || getCrossMajorDefaultTarget(crossMajorConfig.type);
    const isCrossMajorPassed = crossMajorEarnedTotal >= crossMajorTarget;

    const isServiceLearningRequired = (entryYear <= 117);
    const serviceTarget = isServiceLearningRequired ? 3 : 0;
    const isServicePassed = isServiceLearningRequired ? (gServiceCount >= 3) : true;

    const domainCanonicalMap = {
        'human': '人文學', '人文': '人文學', '人文學': '人文學',
        'social': '社會科學', '社科': '社會科學', '社會科學': '社會科學',
        'nature': '自然與工程科學', '自然': '自然與工程科學', '自然與工程': '自然與工程科學', '自然與工程科學': '自然與工程科學',
        'bio': '生命科學與健康', '生醫': '生命科學與健康', '生命與健康': '生命科學與健康', '生命科學與健康': '生命科學與健康',
        'inter': '科際整合', '科際': '科際整合', '科際整合': '科際整合'
    };

    let deptRuleNotices = [];
    if (rule.warningNote) deptRuleNotices.push(rule.warningNote);
    if (rule.studyYears && rule.studyYears > 4) deptRuleNotices.push(`本系修業年限為 ${rule.studyYears} 年制學程。`);
    if (maxOutElective === 0 && !isInterdisciplinary) deptRuleNotices.push(`本系修業規定外系選修採計上限為 0 學分（選修須全修本系專業）。`);
    if (rule.requiredGeneralDomainsCount && rule.requiredGeneralDomainsCount > 3) deptRuleNotices.push(`本系通識規定須跨滿 ${rule.requiredGeneralDomainsCount} 個不同領域。`);
    
    if (excludedDomains.length > 0) {
        const canonicalExcluded = [...new Set(excludedDomains.map(d => domainCanonicalMap[d] || d))];
        deptRuleNotices.push(`本系不採計「${canonicalExcluded.join('、')}」領域通識。`);
    }

    if (capBio < genRule.domainMax && capBio > 0) {
        deptRuleNotices.push(`生命科學與健康領域通識至多採計 ${Math.floor(capBio / 2)} 門（${capBio} 學分）。`);
    }
    if (capNature < genRule.domainMax && capNature > 0) {
        deptRuleNotices.push(`自然與工程領域通識至多採計 ${Math.floor(capNature / 2)} 門（${capNature} 學分）。`);
    }
    if (capHuman < genRule.domainMax && capHuman > 0) {
        deptRuleNotices.push(`人文學領域通識至多採計 ${Math.floor(capHuman / 2)} 門（${capHuman} 學分）。`);
    }
    if (capSocial < genRule.domainMax && capSocial > 0) {
        deptRuleNotices.push(`社會科學領域通識至多採計 ${Math.floor(capSocial / 2)} 門（${capSocial} 學分）。`);
    }
    if (capInter < genRule.domainMax && capInter > 0) {
        deptRuleNotices.push(`科際整合領域通識至多採計 ${Math.floor(capInter / 2)} 門（${capInter} 學分）。`);
    }

    if (diversityExcludedDomains.length > 0) {
        const canonicalDivEx = [...new Set(diversityExcludedDomains.map(d => domainCanonicalMap[d] || d))];
        deptRuleNotices.push(`「${canonicalDivEx.join('、')}」通識不計入「跨領域」跨度計算。`);
    }
    if (rule.chineseNote) deptRuleNotices.push(`國文修課規定：${rule.chineseNote}。`);
    if (rule.englishNote) deptRuleNotices.push(`英文修課規定：${rule.englishNote}。`);

    deptRuleNotices = [...new Set(deptRuleNotices)];

    return {
        ruleFound: true,
        isCustom: !!rule.isCustom,
        deptName: rule.department,
        entryYear: rule.entryYear,
        studyYears: rule.studyYears || 4,
        isInterdisciplinary: isInterdisciplinary,
        deptRuleNotices: deptRuleNotices,
        ccepData: isInterdisciplinary ? {
            careerEarned: ccepCareerEarned,
            careerExp: ccepCareerExp,
            methodologyCount: ccepMethodologyCount,
            methodologyCreds: ccepMethodologyCreds,
            methodologyExp: ccepMethodologyExp,
            projectCreds: ccepProjectCreds,
            projectExp: ccepProjectExp,
            facultyCreds: ccepFacultyCreds,
            facultyExp: ccepFacultyExp,
            freeEarned: ccepFreeEarned,
            freeExp: ccepFreeExp
        } : null,
        currentSemSummary: {
            selectedCredits: currentSemSelectedCredits,
            earnedCredits: currentSemEarnedCredits
        },
        grades: {
            semGpa, semWeighted,
            cumGpa, cumWeighted
        },
        required: {
            expected: isInterdisciplinary ? ccepFacultyExp : eReq,
            earned: isInterdisciplinary ? ccepFacultyCreds : gReq,
            target: effectiveReqTarget,
            effectiveEarned: effectiveReqEarned,
            effectiveExpected: effectiveReqExpected,
            isPassed: (isInterdisciplinary ? ccepFacultyCreds : gReq) >= effectiveReqTarget
        },
        elective: {
            expectedRaw: isInterdisciplinary ? totalCoreExpRaw : totalElectivesExpectedRaw,
            earnedRaw: isInterdisciplinary ? totalCoreEarnedRaw : totalElectivesEarnedRaw,
            target: isInterdisciplinary ? 18 : targetElective,
            effectiveEarned: effectiveElectivesEarned,
            effectiveExpected: effectiveElectivesExpected,
            deptEarned: gElecDept,
            reqElective: {
                earned: gElecReq,
                target: targetReqElective,
                isPassed: gElecReq >= targetReqElective
            },
            outElective: {
                raw: isInterdisciplinary ? ccepFreeExp : gElecOutRaw,
                capped: isInterdisciplinary ? Math.min(32, ccepFreeEarned) : gElecOut,
                max: isInterdisciplinary ? 32 : maxOutElective,
                isOver: isOutOverflow,
                overflow: outOverflowCredits
            },
            isPassed: isInterdisciplinary ? (totalCoreEarnedRaw >= 18) : (effectiveElectivesEarned >= targetElective && gElecReq >= targetReqElective)
        },
        generalEducation: {
            target: genTarget,
            expectedRaw: totalGenExpectedRaw,
            earnedRaw: totalGenCreditsRaw,
            effectiveExpected: effectiveCombinedGenExpected,
            effectiveEarned: effectiveCombinedGenEarned,
            maxCap: genRule.maxCombinedGen,
            isAllPassed: isAllGenPassed,
            isAllExpectedPassed: isAllGenExpectedPassed,
            secondLangCredits: gSecondLangGen,
            domain: {
                earned: gGen,
                expected: eGen,
                max: genRule.domainMax,
                isPassed: isDomainPassed,
                activeDomains: activeDomainsEarned,
                activeDomainsExpected: activeDomainsExpected,
                requiredDomains: requiredDomainsCount,
                details: {
                    human: gGenHuman,
                    humanExp: eGenHuman,
                    humanCap: capHuman,
                    social: gGenSocial,
                    socialExp: eGenSocial,
                    socialCap: capSocial,
                    bio: gGenBio,
                    bioExp: eGenBio,
                    bioCap: capBio,
                    inter: gGenInter,
                    interExp: eGenInter,
                    interCap: capInter,
                    nature: gGenNature,
                    natureExp: eGenNature,
                    natureCap: capNature
                }
            },
            rong: {
                earned: gRong,
                expected: eRongCapped,
                capped: gRongCapped,
                max: genRule.rongMax,
                isPassed: isRongPassed
            }
        },
        chinese: {
            expected: eChinese,
            earned: gChinese,
            target: UNIVERSITY_GRADUATION_RULES.CHINESE_TARGET,
            note: rule.chineseNote || '',
            isPassed: gChinese >= UNIVERSITY_GRADUATION_RULES.CHINESE_TARGET
        },
        english: {
            expected: eEnglish,
            earned: gEnglish,
            target: engRule.targetEnglish,
            effectiveEarned: effectiveEnglishEarned,
            effectiveExpected: effectiveEnglishExpected,
            waived: engRule.waived,
            requiresSubstitution: engRule.requiresSubstitution,
            isEnglishThresholdPassed: data.englishPassed === true,
            note: rule.englishNote || '',
            isPassed: gEnglish >= engRule.targetEnglish
        },
        tainan: {
            expected: eTainan,
            earned: gTainan,
            target: UNIVERSITY_GRADUATION_RULES.TAINAN_TARGET,
            isPassed: gTainan >= UNIVERSITY_GRADUATION_RULES.TAINAN_TARGET
        },
        pe: {
            expected: ePe,
            earned: gPe,
            target: UNIVERSITY_GRADUATION_RULES.PE_TARGET_TERMS,
            isPassed: gPe >= UNIVERSITY_GRADUATION_RULES.PE_TARGET_TERMS
        },
        serviceLearning: {
            expected: eServiceCount,
            earned: gServiceCount,
            target: serviceTarget,
            required: isServiceLearningRequired,
            isPassed: isServicePassed
        },
        military: {
            earnedCount: gMilCount,
            expectedCount: eMilCount,
            earnedDays: calculateMilitaryDeductionDays(gMilCount),
            expectedDays: calculateMilitaryDeductionDays(eMilCount)
        },
        crossMajor: {
            enabled: crossMajorConfig.type !== 'none',
            type: crossMajorConfig.type,
            name: crossMajorConfig.name || crossMajorConfig.type,
            target: crossMajorTarget,
            earnedTotal: crossMajorEarnedTotal,
            expectedTotal: crossMajorExpectedTotal,
            reqEarned: gCrossReq,
            reqExpected: eCrossReq,
            elecEarned: gCrossElec,
            elecExpected: eCrossElec,
            isPassed: isCrossMajorPassed
        },
        total: {
            target: targetCredits,
            earned: totalGradEarned,
            expected: totalGradExpected,
            percentage: percentage,
            rawPercent: rawPercent
        },
        warnings: genWarnings
    };
}