// ============================================================
// 🔍 TimeFlow Schedule Conflict Detection Engine (Pure Calculation)
// ============================================================

const ConflictEngine = {
    /**
     * 將 "HH:MM" 轉為當日分鐘數 (00:00 = 0)
     */
    timeToMinutes(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    },

    /**
     * 將分鐘數轉回 "HH:MM"
     */
    minutesToTime(minutes) {
        const h = String(Math.floor(minutes / 60)).padStart(2, '0');
        const m = String(minutes % 60).padStart(2, '0');
        return `${h}:${m}`;
    },

    /**
     * 核心衝突計算主函式
     * @param {Array} rawCourses 當前學期的原始課程陣列 (appData.semesters[currentSemester])
     * @param {string} mode 檢視模式 ('weekly' | 'semester')
     * @param {number} targetWeek 目標週次 (預設 1)
     * @returns {Object} 結構化衝突計算結果 (ConflictResult)
     */
    detect(rawCourses = [], mode = 'weekly', targetWeek = 1) {
        // 1. 唯一來源：獲取當前情境下所有有效課程
        const effectiveCourses = (typeof getEffectiveCoursesForContext === 'function')
            ? getEffectiveCoursesForContext(rawCourses, mode, targetWeek)
            : rawCourses;

        const dayNamesList = (typeof dayNames !== 'undefined') ? dayNames : ["", "一", "二", "三", "四", "五", "六", "日"];
        const tSlots = (typeof timeSlots !== 'undefined') ? timeSlots : [];

        // 2. 攤平為時段發生實例 (Occurrences)
        const occurrencesByDay = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

        effectiveCourses.forEach(course => {
            (course.slots || []).forEach(slot => {
                const day = parseInt(slot.day, 10);
                if (!occurrencesByDay[day]) return;

                (slot.periods || []).forEach(p => {
                    const pStr = String(p);
                    const slotMeta = tSlots.find(ts => String(ts.period) === pStr);
                    if (!slotMeta || !slotMeta.time) return;

                    const [sTime, eTime] = slotMeta.time.split('~');
                    occurrencesByDay[day].push({
                        courseId: course.id,
                        courseName: course.name,
                        isTentative: !!course.isTentative,
                        frequency: course.frequency || 'weekly',
                        teacher: course.teacher || '',
                        room: course.room || '',
                        day: day,
                        period: pStr,
                        periodLabel: slotMeta.label || `第 ${pStr} 節`,
                        startTime: sTime,
                        endTime: eTime,
                        startMin: this.timeToMinutes(sTime),
                        endMin: this.timeToMinutes(eTime),
                        state: slot.state || 'normal',
                        isOverride: !!course.isOverride
                    });
                });
            });
        });

        const hardConflicts = [];
        const tentativeWarnings = [];
        const conflictedCourseIdSet = new Set();

        // 3. 逐日進行時間區間重疊比對與群組化
        Object.keys(occurrencesByDay).forEach(dKey => {
            const day = parseInt(dKey, 10);
            const occs = occurrencesByDay[day];
            if (occs.length < 2) return;

            // 取得當天所有不重複的時間斷點 (Time Boundaries)
            const timePointsSet = new Set();
            occs.forEach(o => {
                timePointsSet.add(o.startMin);
                timePointsSet.add(o.endMin);
            });
            const timePoints = Array.from(timePointsSet).sort((a, b) => a - b);

            const rawIntervalConflicts = [];

            // 逐一檢查每個基本時間微區間 [subStart, subEnd]
            for (let i = 0; i < timePoints.length - 1; i++) {
                const subStart = timePoints[i];
                const subEnd = timePoints[i + 1];
                if (subStart >= subEnd) continue;

                // 找出涵蓋此微區間的所有課程實例
                const coveringOccs = occs.filter(o => o.startMin <= subStart && o.endMin >= subEnd);
                if (coveringOccs.length < 2) continue;

                if (mode === 'semester') {
                    // 學期模式：依頻率共存關係拆分（每週固定 / 奇數週 / 偶數週）
                    const isAllWeekly = coveringOccs.every(o => (o.frequency || 'weekly') === 'weekly');

                    if (isAllWeekly) {
                        rawIntervalConflicts.push({
                            subStart,
                            subEnd,
                            scope: 'all',
                            occs: coveringOccs
                        });
                    } else {
                        // 1. 奇數週共存池 (weekly + odd)
                        const oddOccs = coveringOccs.filter(o => o.frequency !== 'even');
                        if (oddOccs.length >= 2) {
                            rawIntervalConflicts.push({
                                subStart,
                                subEnd,
                                scope: 'odd',
                                occs: oddOccs
                            });
                        }

                        // 2. 偶數週共存池 (weekly + even)
                        const evenOccs = coveringOccs.filter(o => o.frequency !== 'odd');
                        if (evenOccs.length >= 2) {
                            rawIntervalConflicts.push({
                                subStart,
                                subEnd,
                                scope: 'even',
                                occs: evenOccs
                            });
                        }
                    }
                } else {
                    // 週次模式：當週有效課程已由 getEffectiveCoursesForContext 預先過濾
                    rawIntervalConflicts.push({
                        subStart,
                        subEnd,
                        scope: 'all',
                        occs: coveringOccs
                    });
                }
            }

            if (rawIntervalConflicts.length === 0) return;

            // 4. 連續時間區間與相同衝突組合整併 (Merge contiguous intervals)
            let currentGroup = null;

            rawIntervalConflicts.forEach(item => {
                const courseIdsKey = `${item.scope}_${item.occs.map(o => String(o.courseId)).sort().join('_')}`;

                if (currentGroup && currentGroup.courseIdsKey === courseIdsKey && currentGroup.endMin === item.subStart) {
                    currentGroup.endMin = item.subEnd;
                    item.occs.forEach(o => {
                        if (!currentGroup.periods.includes(o.period)) currentGroup.periods.push(o.period);
                        if (!currentGroup.allOccs.includes(o)) currentGroup.allOccs.push(o);
                    });
                } else {
                    if (currentGroup) {
                        finalizeConflictGroup(currentGroup);
                    }
                    currentGroup = {
                        day,
                        startMin: item.subStart,
                        endMin: item.subEnd,
                        scope: item.scope,
                        courseIdsKey,
                        periods: Array.from(new Set(item.occs.map(o => o.period))),
                        allOccs: [...item.occs]
                    };
                }
            });

            if (currentGroup) {
                finalizeConflictGroup(currentGroup);
            }
        });

        // 結算單一衝突群組並判斷嚴重度
        function finalizeConflictGroup(grp) {
            const uniqueCourseMap = new Map();
            let hasOverride = false;
            const statesSet = new Set();

            grp.allOccs.forEach(o => {
                if (!uniqueCourseMap.has(o.courseId)) {
                    uniqueCourseMap.set(o.courseId, {
                        id: o.courseId,
                        name: o.courseName,
                        isTentative: o.isTentative,
                        frequency: o.frequency,
                        teacher: o.teacher,
                        room: o.room,
                        state: o.state,
                        isOverride: o.isOverride
                    });
                }
                if (o.isOverride) hasOverride = true;
                statesSet.add(o.state);
            });

            const coursesInConflict = Array.from(uniqueCourseMap.values());
            coursesInConflict.forEach(c => conflictedCourseIdSet.add(c.id));

            // 嚴重度判定規則：正式課程 >= 2 門即為 hard
            const regularCount = coursesInConflict.filter(c => !c.isTentative).length;
            const tentativeCount = coursesInConflict.filter(c => c.isTentative).length;
            const severity = (regularCount >= 2) ? 'hard' : 'tentative';

            const startTimeStr = ConflictEngine.minutesToTime(grp.startMin);
            const endTimeStr = ConflictEngine.minutesToTime(grp.endMin);

            const conflictItem = {
                id: `conflict_${grp.day}_${grp.startMin}_${grp.endMin}_${grp.courseIdsKey}`,
                day: grp.day,
                dayName: dayNamesList[grp.day] || String(grp.day),
                periods: grp.periods,
                startTime: startTimeStr,
                endTime: endTimeStr,
                overlapTimeDisplay: `${startTimeStr}~${endTimeStr}`,
                frequencyScope: grp.scope, // 'all' | 'odd' | 'even'
                severity: severity,
                regularCount: regularCount,
                tentativeCount: tentativeCount,
                hasOverride: hasOverride,
                states: Array.from(statesSet),
                courses: coursesInConflict
            };

            if (severity === 'hard') {
                hardConflicts.push(conflictItem);
            } else {
                tentativeWarnings.push(conflictItem);
            }
        }

        const allConflicts = [...hardConflicts, ...tentativeWarnings];

        return {
            hasConflict: allConflicts.length > 0,
            hasHardConflict: hardConflicts.length > 0,
            hasTentativeWarning: tentativeWarnings.length > 0,
            conflictedCourseIds: Array.from(conflictedCourseIdSet),
            hardConflicts,
            tentativeWarnings,
            allConflicts,
            summary: {
                totalConflicts: allConflicts.length,
                hardCount: hardConflicts.length,
                tentativeCount: tentativeWarnings.length,
                affectedCoursesCount: conflictedCourseIdSet.size
            }
        };
    }
};

window.ConflictEngine = ConflictEngine;