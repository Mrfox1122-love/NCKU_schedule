/**
 * 役期折抵換算函式 (1門 4.5天，3門 13天，5門上限 22天)
 */
function calculateMilitaryDeductionDays(courseCount) {
    if (courseCount >= 5) return 22;
    return Math.floor(courseCount * 4.5);
}

/**
 * 畢業學分與修業門檻純計算核心 (無 DOM 依賴)
 * @param {Object} data 傳入的學期與使用者設定資料 (如 appData)
 * @returns {Object} 結構化 GraduationResult
 */
function calculateGraduation(data) {
    if (!data) return null;

    const deptName = data.deptName || "電機系";
    const entryYear = parseInt(data.entryYear || 118, 10); // 預設 118 級
    const targetCredits = parseFloat(data.targetCredits) || 128;
    const targetRequired = parseFloat(data.targetRequired) || 50;
    const targetReqElective = parseFloat(data.targetReqElective) || 0;
    const targetElective = parseFloat(data.targetElective) || 40;
    const maxOutElective = parseFloat(data.maxOutElective) || 0;
    const currentSemester = data.currentSemester || "一上";

    let gReq = 0, gRong = 0, gChinese = 0, gEnglish = 0, gTainan = 0, gPe = 0;
    let gGenHuman = 0, gGenSocial = 0, gGenBio = 0, gGenInter = 0, gGenNature = 0; 
    let gSecondLangGen = 0;
    let gElecDept = 0, gElecReq = 0, gElecOutRaw = 0; 
    let gCrossReq = 0, gCrossElec = 0;
    let gMilCount = 0;
    let gServiceCount = 0; // 🌟 實得服務學習門數

    let eReq = 0, eRong = 0, eChinese = 0, eEnglish = 0, eTainan = 0, ePe = 0;
    let eGenHuman = 0, eGenSocial = 0, eGenBio = 0, eGenInter = 0, eGenNature = 0; 
    let eSecondLangGen = 0;
    let eElecDept = 0, eElecReq = 0, eElecOutRaw = 0; 
    let eCrossReq = 0, eCrossElec = 0;
    let eMilCount = 0;
    let eServiceCount = 0; // 🌟 預計服務學習門數
    
    let currentSemSelectedCredits = 0; 
    let currentSemEarnedCredits = 0; 
    let semGpaCredits = 0, semGpaSum = 0, semWeightedSum = 0;
    let cumGpaCredits = 0, cumGpaSum = 0, cumWeightedSum = 0;

    const semesters = data.semesters || {};
    Object.keys(semesters).forEach(sem => {
        const isCurrentSem = (sem === currentSemester);
        (semesters[sem] || []).forEach(course => {
            const credits = parseFloat(course.credits) || 0;
            const isTentative = course.isTentative === true;

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

            if ((isPassed || isInProgress) && !isTentative) {
                switch (course.type) {
                    case '系定必修': eReq += credits; break;
                    case '融通': eRong += credits; break;
                    case '國文': eChinese += credits; break;
                    case '英文': eEnglish += credits; break;
                    case '踏溯台南': eTainan += credits; break;
                    case '體育': ePe += 1; break;
                    case '服務學習': eServiceCount += 1; break;
                    case '軍訓':
                    case '全民國防': eMilCount += 1; break;
                    case '第二外語-通識':
                    case '第二外語': eSecondLangGen += credits; break;
                    case '第二外語-選修': eElecOutRaw += credits; break;
                    case '通識-人文': eGenHuman += credits; break;
                    case '通識-社科': eGenSocial += credits; break;
                    case '通識-生醫': eGenBio += credits; break;
                    case '通識-科際': eGenInter += credits; break;
                    case '通識-自然': eGenNature += credits; break; 
                    case '選修-本系': eElecDept += credits; break;
                    case '選修-必選': eElecReq += credits; break;
                    case '選修-外系': eElecOutRaw += credits; break;
                    case '跨領域-必修': eCrossReq += credits; break;
                    case '跨領域-選修': eCrossElec += credits; break;
                }

                if (isPassed) {
                    switch (course.type) {
                        case '系定必修': gReq += credits; break;
                        case '融通': gRong += credits; break;
                        case '國文': gChinese += credits; break;
                        case '英文': gEnglish += credits; break;
                        case '踏溯台南': gTainan += credits; break;
                        case '體育': gPe += 1; break;
                        case '服務學習': gServiceCount += 1; break;
                        case '軍訓':
                        case '全民國防': gMilCount += 1; break;
                        case '第二外語-通識':
                        case '第二外語': gSecondLangGen += credits; break;
                        case '第二外語-選修': gElecOutRaw += credits; break;
                        case '通識-人文': gGenHuman += credits; break;
                        case '通識-社科': gGenSocial += credits; break;
                        case '通識-生醫': gGenBio += credits; break;
                        case '通識-科際': gGenInter += credits; break;
                        case '通識-自然': gGenNature += credits; break; 
                        case '選修-本系': gElecDept += credits; break;
                        case '選修-必選': gElecReq += credits; break;
                        case '選修-外系': gElecOutRaw += credits; break;
                        case '跨領域-必修': gCrossReq += credits; break;
                        case '跨領域-選修': gCrossElec += credits; break;
                    }
                }
            }
        });
    });

    // 1. 外系選修上限檢查
    let gElecOut = gElecOutRaw > maxOutElective ? maxOutElective : gElecOutRaw;
    let eElecOut = eElecOutRaw > maxOutElective ? maxOutElective : eElecOutRaw;
    let isOutOverflow = gElecOutRaw > maxOutElective;
    let outOverflowCredits = isOutOverflow ? (gElecOutRaw - maxOutElective) : 0;

    // 2. 英文免修與通識擴充上限聯動
    const engRule = getEnglishRule(data.englishWaived);
    const genRule = getGeneralEducationLimits(data.englishWaived);

    let totalGenCreditsRaw = gGenHuman + gGenSocial + gGenBio + gGenInter + gGenNature + gSecondLangGen;
    let totalGenExpectedRaw = eGenHuman + eGenSocial + eGenBio + eGenInter + eGenNature + eSecondLangGen;
    let gGen = totalGenCreditsRaw > genRule.domainMax ? genRule.domainMax : totalGenCreditsRaw;
    let eGen = totalGenExpectedRaw > genRule.domainMax ? genRule.domainMax : totalGenExpectedRaw;

    let gRongCapped = gRong > genRule.rongMax ? genRule.rongMax : gRong;
    let eRongCapped = eRong > genRule.rongMax ? genRule.rongMax : eRong;

    let combinedGenEarned = gGen + gRongCapped;
    let effectiveCombinedGenEarned = Math.min(genRule.maxCombinedGen, combinedGenEarned);

    let combinedGenExpected = eGen + eRongCapped;
    let effectiveCombinedGenExpected = Math.min(genRule.maxCombinedGen, combinedGenExpected);

    let activeDomains = (gGenHuman > 0 ? 1 : 0) + (gGenSocial > 0 ? 1 : 0) + (gGenBio > 0 ? 1 : 0) + (gGenInter > 0 ? 1 : 0) + (gGenNature > 0 ? 1 : 0);
    let isDomainPassed = (gGen >= genRule.domainMin && activeDomains >= genRule.domainCountMin);
    let isRongPassed = (gRong >= genRule.rongMin);
    let isAllGenPassed = isDomainPassed && isRongPassed;

    let warnings = [];
    if (combinedGenEarned > genRule.maxCombinedGen) {
        warnings.push(`⚠️ 通識總和已超過 ${genRule.maxCombinedGen} 學分採計上限，溢出 ${combinedGenEarned - genRule.maxCombinedGen} 學分不計入畢業`);
    }
    if (totalGenCreditsRaw > genRule.domainMax) {
        warnings.push(`⚠️ 領域/二外通識已達單項 ${genRule.domainMax} 學分上限，溢出學分不採計`);
    }
    if (gGen > 0 && activeDomains < genRule.domainCountMin) {
        warnings.push(`⚠️ 領域尚缺 ${genRule.domainCountMin - activeDomains} 個不同領域 (畢業需跨至少 ${genRule.domainCountMin} 領域)`);
    }
    if (gGen < genRule.domainMin) {
        warnings.push(`⚠️ 領域通識尚缺 ${genRule.domainMin - gGen} 學分達基本門檻 (基本低標 ${genRule.domainMin} 學分)`);
    }
    if (gRong < genRule.rongMin) {
        warnings.push(`⚠️ 融合通識尚缺 ${genRule.rongMin - gRong} 學分達基本門檻 (基本低標 ${genRule.rongMin} 學分)`);
    }

    // 3. 各向度有效畢業學分審核與封頂
    let effectiveReqEarned = Math.min(targetRequired, gReq);
    let effectiveReqExpected = Math.min(targetRequired, eReq);

    let totalElectivesEarnedRaw = gElecDept + gElecReq + gElecOut;
    let totalElectivesExpectedRaw = eElecDept + eElecReq + eElecOut;
    let effectiveElectivesEarned = Math.min(targetElective, totalElectivesEarnedRaw);
    let effectiveElectivesExpected = Math.min(targetElective, totalElectivesExpectedRaw);

    let effectiveChineseEarned = Math.min(GRADUATION_RULES.CHINESE_TARGET, gChinese);
    let effectiveChineseExpected = Math.min(GRADUATION_RULES.CHINESE_TARGET, eChinese);

    let effectiveEnglishEarned = Math.min(engRule.targetEnglish, gEnglish);
    let effectiveEnglishExpected = Math.min(engRule.targetEnglish, eEnglish);

    let effectiveTainanEarned = Math.min(GRADUATION_RULES.TAINAN_TARGET, gTainan);
    let effectiveTainanExpected = Math.min(GRADUATION_RULES.TAINAN_TARGET, eTainan);

    let totalGradEarned = effectiveReqEarned + effectiveElectivesEarned + effectiveCombinedGenEarned + effectiveChineseEarned + effectiveEnglishEarned + effectiveTainanEarned;
    let totalGradExpected = effectiveReqExpected + effectiveElectivesExpected + effectiveCombinedGenExpected + effectiveChineseExpected + effectiveEnglishExpected + effectiveTainanExpected;

    let percentage = (totalGradEarned / targetCredits) * 100;
    let rawPercent = percentage.toFixed(1);
    if (percentage > 100) percentage = 100;

    // 4. 成績計算字串
    let semGpa = semGpaCredits > 0 ? (semGpaSum / semGpaCredits).toFixed(2) : '0.00';
    let semWeighted = semGpaCredits > 0 ? (semWeightedSum / semGpaCredits).toFixed(1) : '0.0';
    let cumGpa = cumGpaCredits > 0 ? (cumGpaSum / cumGpaCredits).toFixed(2) : '0.00';
    let cumWeighted = cumGpaCredits > 0 ? (cumWeightedSum / cumGpaCredits).toFixed(1) : '0.0';

    // 5. 跨領域修業狀態
    const crossMajorConfig = data.crossMajor || { type: 'none', name: '', target: 40 };
    const crossMajorEarnedTotal = gCrossReq + gCrossElec;
    const crossMajorExpectedTotal = eCrossReq + eCrossElec;
    const crossMajorTarget = parseFloat(crossMajorConfig.target) || getCrossMajorDefaultTarget(crossMajorConfig.type);
    const isCrossMajorPassed = crossMajorEarnedTotal >= crossMajorTarget;

    // 🌟 6. 服務學習門檻判定 (117 級以前需 3 門，118 級以後免修)
    const isServiceLearningRequired = (entryYear <= 117);
    const serviceTarget = isServiceLearningRequired ? 3 : 0;
    const isServicePassed = isServiceLearningRequired ? (gServiceCount >= 3) : true;

    return {
        deptName,
        entryYear,
        currentSemSummary: {
            selectedCredits: currentSemSelectedCredits,
            earnedCredits: currentSemEarnedCredits
        },
        grades: {
            semGpa, semWeighted,
            cumGpa, cumWeighted
        },
        required: {
            expected: eReq,
            earned: gReq,
            target: targetRequired,
            effectiveEarned: effectiveReqEarned,
            effectiveExpected: effectiveReqExpected,
            isPassed: gReq >= targetRequired
        },
        elective: {
            expectedRaw: totalElectivesExpectedRaw,
            earnedRaw: totalElectivesEarnedRaw,
            target: targetElective,
            effectiveEarned: effectiveElectivesEarned,
            effectiveExpected: effectiveElectivesExpected,
            deptEarned: gElecDept,
            reqElective: {
                earned: gElecReq,
                target: targetReqElective,
                isPassed: gElecReq >= targetReqElective
            },
            outElective: {
                raw: gElecOutRaw,
                capped: gElecOut,
                max: maxOutElective,
                isOver: isOutOverflow,
                overflow: outOverflowCredits
            },
            isPassed: totalElectivesEarnedRaw >= targetElective && !isOutOverflow && gElecReq >= targetReqElective
        },
        generalEducation: {
            expectedRaw: totalGenExpectedRaw,
            earnedRaw: totalGenCreditsRaw,
            effectiveExpected: effectiveCombinedGenExpected,
            effectiveEarned: effectiveCombinedGenEarned,
            maxCap: genRule.maxCombinedGen,
            isAllPassed: isAllGenPassed,
            secondLangCredits: gSecondLangGen,
            domain: {
                earned: gGen,
                max: genRule.domainMax,
                isPassed: isDomainPassed,
                activeDomains: activeDomains,
                requiredDomains: genRule.domainCountMin,
                details: {
                    human: gGenHuman,
                    social: gGenSocial,
                    bio: gGenBio,
                    inter: gGenInter,
                    nature: gGenNature
                }
            },
            rong: {
                earned: gRong,
                capped: gRongCapped,
                max: genRule.rongMax,
                isPassed: isRongPassed
            }
        },
        chinese: {
            expected: eChinese,
            earned: gChinese,
            target: GRADUATION_RULES.CHINESE_TARGET,
            isPassed: gChinese >= GRADUATION_RULES.CHINESE_TARGET
        },
        english: {
            expected: eEnglish,
            earned: gEnglish,
            target: engRule.targetEnglish,
            effectiveEarned: effectiveEnglishEarned,
            effectiveExpected: effectiveEnglishExpected,
            waived: engRule.waived,
            isEnglishThresholdPassed: data.englishPassed === true,
            isPassed: gEnglish >= engRule.targetEnglish
        },
        tainan: {
            expected: eTainan,
            earned: gTainan,
            target: GRADUATION_RULES.TAINAN_TARGET,
            isPassed: gTainan >= GRADUATION_RULES.TAINAN_TARGET
        },
        pe: {
            expected: ePe,
            earned: gPe,
            target: GRADUATION_RULES.PE_TARGET_TERMS,
            isPassed: gPe >= GRADUATION_RULES.PE_TARGET_TERMS
        },
        // 🌟 服務學習回傳
        serviceLearning: {
            expected: eServiceCount,
            earned: gServiceCount,
            target: serviceTarget,
            required: isServiceLearningRequired,
            isPassed: isServicePassed
        },
        // 全民國防/軍訓役期折抵回傳
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
        warnings
    };
}