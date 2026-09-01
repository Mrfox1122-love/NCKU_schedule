// ============================================================
// 📚 Schedule 多學期排課工作台引擎 (TimeFlow v3.2.5 - AddEventListener & Safe Escaped)
// ============================================================

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function safeGetIcon(name, options = {}) {
    if (typeof Icons !== 'undefined' && Icons && Icons.get) {
        return Icons.get(name, options);
    }
    if (typeof window.Icons !== 'undefined' && window.Icons && window.Icons.get) {
        return window.Icons.get(name, options);
    }
    return '';
}

let currentScheduleViewType = 'grid';

function getActiveTimeSlots() {
    return timeSlots.filter(slot => {
        if (slot.period === 'N' && !appData.showNoon) return false;
        if (['A', 'B', 'C', 'D'].includes(slot.period) && !appData.showNight) return false;
        return true;
    });
}

function getActiveDays() {
    return appData.showWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
}

function toggleViewOption(key) {
    const cbMap = {
        showNoon: 'toggleNoonCB',
        showNight: 'toggleNightCB',
        showWeekend: 'toggleWeekendCB'
    };
    const cb = document.getElementById(cbMap[key]);
    if (cb) {
        appData[key] = cb.checked;
        saveData();
        initTable();
        updateAppUI();
    }
}

function renderSemesterSelect() {
    const semSelect = document.getElementById('semSelect');
    if (!semSelect) return;
    semSelect.innerHTML = '';
    
    const numLabelMap = { 
        "一": "大一", "二": "大二", "三": "大三", "四": "大四", 
        "五": "大五", "六": "大六", "七": "大七", "八": "大八" 
    };
    
    const order = appData.semesterOrder || [];
    order.forEach(sem => {
        const opt = document.createElement('option');
        opt.value = sem;
        const match = sem.match(/^([一二三四五六七八九十\d]+)(上|下|暑)$/);
        if (match) {
            const y = match[1];
            const t = match[2] === '上' ? '上學期' : (match[2] === '下' ? '下學期' : '暑修');
            const prefix = numLabelMap[y] || `第${y}年`;
            opt.innerText = `${prefix} ${t}`;
        } else {
            opt.innerText = sem;
        }
        semSelect.appendChild(opt);
    });

    if (!order.includes(appData.currentSemester)) {
        appData.currentSemester = order[0] || "一上";
    }
    semSelect.value = appData.currentSemester;

    const currentIdx = order.indexOf(appData.currentSemester);
    const btnPrev = document.getElementById('btnPrevSem');
    const btnNext = document.getElementById('btnNextSem');
    if (btnPrev) btnPrev.disabled = (currentIdx <= 0);
    if (btnNext) btnNext.disabled = (currentIdx >= order.length - 1);
}

function addNewSemester() {
    const curSem = appData.currentSemester || '一上';
    const match = curSem.match(/^([一二三四五六七八九十\d]+)/);
    const currentYearNum = match ? match[1] : '一';
    const summerSemName = `${currentYearNum}暑`;

    let targetSem = '';

    if (!appData.semesterOrder.includes(summerSemName)) {
        const wantSummer = confirm(`是否要為【大${currentYearNum}】新增【${summerSemName}】(暑修)？\n\n• 點擊「確定」：新增【${summerSemName}】\n• 點擊「取消」：依序新增下一常規學期`);
        if (wantSummer) {
            targetSem = summerSemName;
        }
    }

    if (!targetSem) {
        targetSem = (typeof getNextSemesterName === 'function') 
            ? getNextSemesterName(appData.semesterOrder) 
            : '五上';
    }

    if (!appData.semesters[targetSem]) appData.semesters[targetSem] = [];
    if (!appData.semesterOrder.includes(targetSem)) {
        appData.semesterOrder.push(targetSem);
        if (typeof sortSemesterOrder === 'function') {
            sortSemesterOrder(appData.semesterOrder);
        }
    }

    appData.currentSemester = targetSem;
    renderSemesterSelect();
    saveData();
    updateAppUI();
}

function deleteCurrentSemester() {
    const currentSem = appData.currentSemester;
    const baseSems = ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
    
    if (baseSems.includes(currentSem)) {
        alert(`「${currentSem}」為大一至大四之基本修業學期，無法刪除！\n若為暑修（如一暑）或大五加修學期方可刪除。`);
        return;
    }

    const coursesInSem = appData.semesters[currentSem] || [];
    if (coursesInSem.length > 0) {
        if (!confirm(`「${currentSem}」內尚有 ${coursesInSem.length} 門課程，刪除後課程資料將一併清除，確定要刪除嗎？`)) return;
    } else {
        if (!confirm(`確定要刪除「${currentSem}」嗎？`)) return;
    }

    delete appData.semesters[currentSem];
    appData.semesterOrder = appData.semesterOrder.filter(s => s !== currentSem);
    appData.currentSemester = appData.semesterOrder[appData.semesterOrder.length - 1] || "一上";
    
    if (typeof cancelEdit === 'function') cancelEdit();
    renderSemesterSelect();
    saveData();
    updateAppUI();
}

function initTable() {
    renderSemesterSelect();

    const cbNoon = document.getElementById('toggleNoonCB');
    if (cbNoon) cbNoon.checked = appData.showNoon !== false;

    const cbNight = document.getElementById('toggleNightCB');
    if (cbNight) cbNight.checked = !!appData.showNight;

    const cbWeekend = document.getElementById('toggleWeekendCB');
    if (cbWeekend) cbWeekend.checked = !!appData.showWeekend;

    const deptInput = document.getElementById('deptComboboxInput') || document.getElementById('deptNameInput');
    if (deptInput) deptInput.value = appData.deptName || "電機系";

    if (document.getElementById('entryYearSelect')) document.getElementById('entryYearSelect').value = String(appData.entryYear || 118);
    if (document.getElementById('gradTargetInput')) document.getElementById('gradTargetInput').value = appData.targetCredits || 138;
    if (document.getElementById('reqTargetInput')) document.getElementById('reqTargetInput').value = appData.targetRequired || 59;
    if (document.getElementById('reqElecTargetInput')) document.getElementById('reqElecTargetInput').value = appData.targetReqElective || 3;
    if (document.getElementById('elecTargetInput')) document.getElementById('elecTargetInput').value = appData.targetElective || 51;
    if (document.getElementById('outMaxInput')) document.getElementById('outMaxInput').value = appData.maxOutElective || 9;
    if (document.getElementById('englishWaivedSelect')) document.getElementById('englishWaivedSelect').value = String(appData.englishWaived || 0);
    if (document.getElementById('englishPassedCB')) document.getElementById('englishPassedCB').checked = !!appData.englishPassed;
    if (document.getElementById('crossTypeSelect')) document.getElementById('crossTypeSelect').value = (appData.crossMajor && appData.crossMajor.type) || "none";
}

function getEffectiveCoursesForContext(courses) {
    return courses || [];
}

function updateScheduleStats(currentCourses) {
    const statCourseCount = document.getElementById('statCourseCount');
    const statTotalCredits = document.getElementById('statTotalCredits');
    const statTotalPeriods = document.getElementById('statTotalPeriods');
    const statSemGpa = document.getElementById('statSemGpa');
    const statSemWeighted = document.getElementById('statSemWeighted');

    if (!statCourseCount) return;

    const activeDays = getActiveDays();
    const activeSlots = getActiveTimeSlots();
    const activePeriods = activeSlots.map(s => String(s.period));

    let totalCredits = 0;
    let totalPeriods = 0;
    let validCount = 0;

    let semGpaCredits = 0;
    let semGpaSum = 0;
    let semWeightedSum = 0;

    (currentCourses || []).forEach(c => {
        const cred = parseFloat(c.credits) || 0;
        const isTentative = !!c.isTentative;
        const isInProgress = (c.status === '修讀中');
        const isWaived = (c.status === '已抵免');

        if (!isTentative) {
            validCount++;
            totalCredits += cred;

            if (!isInProgress && !isWaived && c.score !== null && c.score !== undefined && cred > 0) {
                const courseScore = parseFloat(c.score) || 0;
                const gp = (typeof getGradePoint === 'function') ? getGradePoint(courseScore) : 0;
                semGpaCredits += cred;
                semGpaSum += (gp * cred);
                semWeightedSum += (courseScore * cred);
            }
        }

        (c.slots || []).forEach(s => {
            if (activeDays.includes(s.day)) {
                (s.periods || []).forEach(p => {
                    if (activePeriods.includes(String(p))) totalPeriods++;
                });
            }
        });
    });

    statCourseCount.innerText = `${validCount} 門`;
    statTotalCredits.innerText = `${totalCredits} 學分`;
    statTotalPeriods.innerText = `${totalPeriods} 節`;

    if (statSemGpa) {
        statSemGpa.innerText = semGpaCredits > 0 ? (semGpaSum / semGpaCredits).toFixed(2) : '0.00';
    }
    if (statSemWeighted) {
        statSemWeighted.innerText = semGpaCredits > 0 ? `${(semWeightedSum / semGpaCredits).toFixed(1)} 分` : '0.0 分';
    }
}

function checkScheduleConflicts(courses) {
    const banner = document.getElementById('conflictBannerArea');
    if (!banner) return;

    if (typeof ConflictEngine !== 'undefined' && ConflictEngine.detect) {
        const result = ConflictEngine.detect(courses, 'semester');
        if (result.hasHardConflict) {
            const conflictText = result.hardConflicts.map(c => 
                `週${escapeHTML(c.dayName)} (${escapeHTML(c.overlapTimeDisplay)})：${c.courses.map(x => escapeHTML(x.name)).join(' 與 ')}`
            ).join('；');
            banner.style.display = 'block';
            banner.innerHTML = `<div class="tf-conflict-alert">${safeGetIcon('warning', { size: 15 })} <b>發現衝堂：</b>${conflictText}</div>`;
        } else if (result.hasTentativeWarning) {
            banner.style.display = 'block';
            banner.innerHTML = `<div class="tf-conflict-warn">${safeGetIcon('info', { size: 15 })} <b>暫定時段提醒：</b>含有多時段候補排課，請留意正式選課結果。</div>`;
        } else {
            banner.style.display = 'none';
        }
    } else {
        banner.style.display = 'none';
    }
}

function openQuickAddSlot(day, period) {
    if (typeof cancelEdit === 'function') {
        cancelEdit();
    }

    if (typeof toggleSidebar === 'function') {
        toggleSidebar(true);
    }

    const targetDay = parseInt(day, 10) || 1;
    const targetP = String(period).trim();

    if (typeof formSlotsState !== 'undefined') {
        formSlotsState.length = 0;
        formSlotsState.push({
            id: `slot_${Date.now()}`,
            day: targetDay,
            startPeriod: targetP,
            endPeriod: targetP
        });

        if (typeof renderSlotItemsList === 'function') {
            renderSlotItemsList();
        }
    }

    const nameInput = document.getElementById('courseName');
    if (nameInput) {
        nameInput.value = '';
        nameInput.focus();
    }
}

function renderSchedule() {
    renderSemesterSelect();

    const activeDays = getActiveDays();
    const activeSlots = getActiveTimeSlots();
    const rawCourses = appData.semesters[appData.currentSemester] || [];
    const currentCourses = getEffectiveCoursesForContext(rawCourses);

    checkScheduleConflicts(currentCourses);
    updateScheduleStats(currentCourses);

    renderDesktopGridSchedule(currentCourses, activeDays, activeSlots);
    renderMobileSchedule(currentCourses, activeDays, activeSlots);
    renderAsyncCourseStrip(currentCourses);

    if (typeof renderWishlist === 'function') renderWishlist();

    if (currentScheduleViewType === 'list') {
        renderScheduleListView();
    }
}

function renderAsyncCourseStrip(currentCourses) {
    const container = document.getElementById('asyncCourseContainer');
    if (!container) return;

    const asyncCourses = (currentCourses || []).filter(c => c.isNoSchedule || !c.slots || c.slots.length === 0);

    if (asyncCourses.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'block';

    const pillsHtml = asyncCourses.map(c => {
        const isTentative = !!c.isTentative;
        const isWaived = (c.status === '已抵免');
        const borderColor = c.color || '#2563eb';

        let statusBadge = '';
        if (isWaived) {
            statusBadge = '<span style="color:var(--tf-color-primary-light); font-size:0.68rem; font-weight:600;">[已抵免]</span>';
        } else if (c.status === '已取得') {
            statusBadge = `<span style="color:var(--tf-status-success-light); font-size:0.68rem; font-weight:600;">[${c.score}分]</span>`;
        } else if (c.status === '未取得') {
            statusBadge = `<span style="color:var(--tf-status-danger-light); font-size:0.68rem; font-weight:600;">[${c.score}分 不及格]</span>`;
        } else if (isTentative) {
            statusBadge = '<span style="color:var(--tf-status-warning-light); font-size:0.68rem; font-weight:600;">[暫定]</span>';
        }

        return `
            <div style="background:var(--tf-surface-base); border:1px solid var(--tf-border-subtle); border-left:3px solid ${borderColor}; padding:4px 10px; border-radius:var(--tf-radius-sm); font-size:0.75rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:background var(--tf-transition-fast);" 
                 onclick="showCourseDetail('${c.id}')" title="點擊查看詳細資訊">
                <span style="font-weight:600; color:var(--tf-text-primary); font-size:0.75rem;">${escapeHTML(c.name)}</span>
                <span style="color:var(--tf-text-muted); font-size:0.7rem;">${c.credits}學分 ｜ ${escapeHTML(c.type)}</span>
                ${statusBadge}
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="background:var(--tf-surface-sunken); border:1px solid var(--tf-border-default); border-radius:var(--tf-radius-md); padding:8px 12px; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:600; color:var(--tf-text-secondary);">
                <span>非同步遠距 / 無固定時間 / 抵免課程 (${asyncCourses.length} 門)</span>
                <span style="font-size:0.68rem; color:var(--tf-text-muted);">正常計入本學期與畢業學分</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${pillsHtml}
            </div>
        </div>
    `;
}

function renderDesktopGridSchedule(currentCourses, activeDays, activeSlots) {
    const board = document.getElementById('desktopGridBoard');
    if (!board) return;

    const colCount = activeDays.length;
    const rowCount = activeSlots.length;

    board.style.gridTemplateColumns = `95px repeat(${colCount}, minmax(0, 1fr))`;
    board.style.gridTemplateRows = `46px repeat(${rowCount}, minmax(56px, 1fr))`;
    board.innerHTML = '';

    const corner = document.createElement('div');
    corner.className = 'tf-grid-header tf-grid-corner';
    corner.innerText = '節次 / 時間';
    board.appendChild(corner);

    activeDays.forEach((day, dIdx) => {
        const h = document.createElement('div');
        h.className = `tf-grid-header ${day >= 6 ? 'weekend' : ''}`;
        h.style.gridColumn = `${dIdx + 2}`;
        h.style.gridRow = '1';
        h.innerHTML = `<div class="th-content-box"><span class="th-day-name">星期${escapeHTML(dayNames[day])}</span></div>`;
        board.appendChild(h);
    });

    activeSlots.forEach((slot, sIdx) => {
        const rowNum = sIdx + 2;

        const t = document.createElement('div');
        t.className = 'tf-grid-time-cell';
        t.style.gridColumn = '1';
        t.style.gridRow = `${rowNum}`;
        t.innerHTML = `<strong>${escapeHTML(slot.label)}</strong><span class="time-sub">${escapeHTML(slot.time)}</span>`;
        board.appendChild(t);

        activeDays.forEach((day, dIdx) => {
            const bgCell = document.createElement('div');
            bgCell.className = `tf-grid-bg-cell`;
            bgCell.style.gridColumn = `${dIdx + 2}`;
            bgCell.style.gridRow = `${rowNum}`;
            bgCell.style.cursor = 'pointer';
            bgCell.title = `點擊快速排入：星期${dayNames[day]} 第 ${slot.period} 節（亦可拖曳課程至此）`;
            
            // 🛡️ 改為原生事件監聽，杜絕 JS 字串注入
            bgCell.onclick = () => openQuickAddSlot(day, slot.period);
            bgCell.addEventListener('dragover', handleCellDragOver);
            bgCell.addEventListener('dragleave', handleCellDragLeave);
            bgCell.addEventListener('drop', (e) => handleCellDrop(e, day, slot.period));

            board.appendChild(bgCell);
        });
    });

    const periodKeys = activeSlots.map(s => String(s.period));
    const renderedItems = [];

    currentCourses.forEach(course => {
        (course.slots || []).forEach((slotInfo, slotIdx) => {
            const dayIdx = activeDays.indexOf(slotInfo.day);
            if (dayIdx === -1) return;

            const periodIndices = (slotInfo.periods || [])
                .map(p => periodKeys.indexOf(String(p)))
                .filter(idx => idx !== -1)
                .sort((a, b) => a - b);

            if (periodIndices.length === 0) return;

            let groups = [];
            let currentGroup = [periodIndices[0]];

            for (let i = 1; i < periodIndices.length; i++) {
                if (periodIndices[i] === periodIndices[i - 1] + 1) {
                    currentGroup.push(periodIndices[i]);
                } else {
                    groups.push(currentGroup);
                    currentGroup = [periodIndices[i]];
                }
            }
            groups.push(currentGroup);

            groups.forEach(grp => {
                const startRow = grp[0] + 2;
                const endRow = grp[grp.length - 1] + 3;
                renderedItems.push({
                    course,
                    slotIdx,
                    day: slotInfo.day,
                    dayIdx,
                    startRow,
                    endRow,
                    grp,
                    duration: grp.length
                });
            });
        });
    });

    activeDays.forEach((day, dayIdx) => {
        const dayItems = renderedItems.filter(item => item.dayIdx === dayIdx);
        if (dayItems.length === 0) return;

        dayItems.sort((a, b) => a.startRow - b.startRow || (b.endRow - b.startRow) - (a.endRow - a.startRow));

        const clusters = [];
        let currentCluster = [];
        let clusterMaxEnd = -1;

        dayItems.forEach(item => {
            if (currentCluster.length === 0) {
                currentCluster.push(item);
                clusterMaxEnd = item.endRow;
            } else {
                if (item.startRow < clusterMaxEnd) {
                    currentCluster.push(item);
                    clusterMaxEnd = Math.max(clusterMaxEnd, item.endRow);
                } else {
                    clusters.push(currentCluster);
                    currentCluster = [item];
                    clusterMaxEnd = item.endRow;
                }
            }
        });
        if (currentCluster.length > 0) clusters.push(currentCluster);

        clusters.forEach(cluster => {
            const columns = [];

            cluster.forEach(item => {
                let placed = false;
                for (let i = 0; i < columns.length; i++) {
                    if (columns[i] <= item.startRow) {
                        item.colIndex = i;
                        columns[i] = item.endRow;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    item.colIndex = columns.length;
                    columns.push(item.endRow);
                }
            });

            const totalCols = columns.length;

            cluster.forEach(item => {
                const course = item.course;
                const isTentative = course.isTentative === true;
                const isFailed = (course.status === '未取得');
                const borderColor = course.color || '#2563eb';

                const firstSlotObj = activeSlots[item.grp[0]];
                const lastSlotObj = activeSlots[item.grp[item.grp.length - 1]];
                const timeRangeStr = (firstSlotObj && lastSlotObj)
                    ? `${firstSlotObj.time.split('~')[0]} - ${lastSlotObj.time.split('~')[1]}`
                    : '';

                const card = document.createElement('div');
                card.className = `tf-course-card ${isTentative ? 'tentative' : ''} ${isFailed ? 'failed' : ''}`;
                card.style.gridColumn = `${dayIdx + 2}`;
                card.style.gridRow = `${item.startRow} / ${item.endRow}`;
                card.style.borderLeftColor = borderColor;

                if (totalCols > 1) {
                    const widthPercent = (100 / totalCols).toFixed(2);
                    const leftPercent = (item.colIndex * (100 / totalCols)).toFixed(2);
                    card.style.width = `calc(${widthPercent}% - 4px)`;
                    card.style.marginLeft = `calc(${leftPercent}% + 2px)`;
                    card.style.zIndex = `${item.colIndex + 3}`;
                }

                // 🛡️ 拖曳改為原生監聽事件
                card.setAttribute('draggable', 'true');
                card.addEventListener('dragstart', (e) => handleCardDragStart(e, course.id, item.slotIdx, item.duration));
                card.addEventListener('dragend', handleCardDragEnd);
                card.onclick = () => showCourseDetail(course.id);

                const roomHtml = course.room ? `<span>${safeGetIcon('location', { size: 11 })} ${escapeHTML(course.room)}</span>` : '';
                const teacherHtml = course.teacher ? `<span>${safeGetIcon('user', { size: 11 })} ${escapeHTML(course.teacher)}</span>` : '';

                card.innerHTML = `
                    <div class="card-name-row" style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="card-name">${escapeHTML(course.name)}</span>
                        <div style="display:flex; gap:2px; align-items:center;">
                            ${isTentative ? '<span class="tf-card-tag tag-tentative">暫定</span>' : ''}
                        </div>
                    </div>
                    <div class="card-time">${escapeHTML(timeRangeStr)}</div>
                    <div class="card-meta">
                        ${roomHtml}
                        ${teacherHtml}
                    </div>
                `;

                board.appendChild(card);
            });
        });
    });
}

function renderMobileSchedule(currentCourses, activeDays, activeSlots) {
    const board = document.getElementById('mobileGridBoard');
    if (!board) return;

    const colCount = activeDays.length;
    const rowCount = activeSlots.length;

    board.style.gridTemplateColumns = `28px repeat(${colCount}, minmax(0, 1fr))`;
    board.style.gridTemplateRows = `32px repeat(${rowCount}, minmax(46px, 1fr))`;
    board.innerHTML = '';

    const corner = document.createElement('div');
    corner.className = 'mobile-grid-header';
    corner.innerText = '節';
    board.appendChild(corner);

    activeDays.forEach((day, dIdx) => {
        const h = document.createElement('div');
        h.className = `mobile-grid-header ${day >= 6 ? 'weekend' : ''}`;
        h.style.gridColumn = `${dIdx + 2}`;
        h.style.gridRow = '1';
        h.innerHTML = `週${escapeHTML(dayNames[day])}`;
        board.appendChild(h);
    });

    activeSlots.forEach((slot, sIdx) => {
        const rowNum = sIdx + 2;

        const t = document.createElement('div');
        t.className = 'mobile-grid-time';
        t.style.gridColumn = '1';
        t.style.gridRow = `${rowNum}`;
        t.innerHTML = `<span>${escapeHTML(slot.period)}</span>`;
        board.appendChild(t);

        activeDays.forEach((day, dIdx) => {
            const bgCell = document.createElement('div');
            bgCell.className = `mobile-grid-cell`;
            bgCell.style.gridColumn = `${dIdx + 2}`;
            bgCell.style.gridRow = `${rowNum}`;
            bgCell.style.cursor = 'pointer';
            bgCell.onclick = () => openQuickAddSlot(day, slot.period);
            board.appendChild(bgCell);
        });
    });

    const periodKeys = activeSlots.map(s => String(s.period));

    currentCourses.forEach(course => {
        const isTentative = course.isTentative === true;
        const bgColor = course.color || '#2563eb';

        (course.slots || []).forEach(slotInfo => {
            const dayIdx = activeDays.indexOf(slotInfo.day);
            if (dayIdx === -1) return;

            const periodIndices = (slotInfo.periods || [])
                .map(p => periodKeys.indexOf(String(p)))
                .filter(idx => idx !== -1)
                .sort((a, b) => a - b);

            if (periodIndices.length === 0) return;

            let groups = [];
            let currentGroup = [periodIndices[0]];

            for (let i = 1; i < periodIndices.length; i++) {
                if (periodIndices[i] === periodIndices[i - 1] + 1) {
                    currentGroup.push(periodIndices[i]);
                } else {
                    groups.push(currentGroup);
                    currentGroup = [periodIndices[i]];
                }
            }
            groups.push(currentGroup);

            groups.forEach(grp => {
                const startRow = grp[0] + 2;
                const endRow = grp[grp.length - 1] + 3;

                const card = document.createElement('div');
                card.className = `mobile-course-card ${isTentative ? 'tentative' : ''}`;
                card.style.gridColumn = `${dayIdx + 2}`;
                card.style.gridRow = `${startRow} / ${endRow}`;
                card.style.borderLeftColor = bgColor;

                card.onclick = () => showCourseDetail(course.id);

                let roomText = course.room ? `<div class="mobile-course-room">${safeGetIcon('location', { size: 10 })} ${escapeHTML(course.room)}</div>` : '';
                let teacherText = (grp.length >= 2 && course.teacher) ? `<div class="mobile-course-teacher">${safeGetIcon('user', { size: 10 })} ${escapeHTML(course.teacher)}</div>` : '';
                let tentativeTag = isTentative ? `<span class="tf-card-tag tag-tentative" style="font-size:0.55rem; padding:0 3px;">暫定</span>` : '';

                card.innerHTML = `
                    <div class="mobile-course-name">${escapeHTML(course.name)} ${tentativeTag}</div>
                    ${roomText}
                    ${teacherText}
                `;

                board.appendChild(card);
            });
        });
    });
}

function renderScheduleListView() {
    const container = document.getElementById('listViewContainer');
    if (!container) return;
    container.innerHTML = '';

    const activeDays = getActiveDays().map(Number);
    const activeSlots = getActiveTimeSlots();
    const rawCourses = appData.semesters[appData.currentSemester] || [];
    const currentCourses = getEffectiveCoursesForContext(rawCourses);

    const dayClassesMap = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

    currentCourses.forEach(course => {
        (course.slots || []).forEach(slotInfo => {
            const d = parseInt(slotInfo.day, 10);
            if (activeDays.includes(d) && dayClassesMap[d]) {
                const startP = (slotInfo.periods && slotInfo.periods[0]) || '1';
                const matchedSlot = activeSlots.find(s => String(s.period) === String(startP));
                const startTimeStr = matchedSlot ? matchedSlot.time.split('~')[0] : '00:00';

                dayClassesMap[d].push({
                    course: course,
                    slotInfo: slotInfo,
                    startTimeStr: startTimeStr
                });
            }
        });
    });

    let hasAnyClass = false;

    activeDays.forEach(day => {
        const classesInDay = dayClassesMap[day] || [];
        if (classesInDay.length === 0) return;
        hasAnyClass = true;

        classesInDay.sort((a, b) => {
            const pA = activeSlots.findIndex(s => String(s.period) === String(a.slotInfo.periods[0]));
            const pB = activeSlots.findIndex(s => String(s.period) === String(b.slotInfo.periods[0]));
            return pA - pB;
        });

        const daySection = document.createElement('div');
        daySection.className = 'list-day-section';

        daySection.innerHTML = `
            <div class="list-day-header">星期${escapeHTML(dayNames[day])}</div>
            <div class="list-cards-group"></div>
        `;
        
        const cardsGroup = daySection.querySelector('.list-cards-group');

        classesInDay.forEach(item => {
            const c = item.course;
            const slot = item.slotInfo;
            
            const firstP = (slot.periods && slot.periods[0]) || '1';
            const lastP = (slot.periods && slot.periods[slot.periods.length - 1]) || firstP;
            const startSlot = activeSlots.find(s => String(s.period) === String(firstP));
            const endSlot = activeSlots.find(s => String(s.period) === String(lastP));
            
            const startTime = startSlot ? startSlot.time.split('~')[0] : '08:00';
            const endTime = endSlot ? endSlot.time.split('~')[1] : (startSlot ? startSlot.time.split('~')[1] : '09:00');
            const timeRangeStr = `${startTime} - ${endTime}`;

            const card = document.createElement('div');
            card.className = 'list-course-row-card';
            card.style.borderLeftColor = c.color || '#2563eb';
            card.onclick = () => showCourseDetail(c.id);

            const periodsDisplay = Array.isArray(slot.periods) ? slot.periods.map(escapeHTML).join(',') : escapeHTML(String(slot.periods));

            card.innerHTML = `
                <div class="list-card-time-box">
                    <span class="l-time">${escapeHTML(timeRangeStr)}</span>
                    <span class="l-period">第 ${periodsDisplay} 節</span>
                </div>
                <div class="list-card-main-box">
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span class="l-name">${escapeHTML(c.name)}</span>
                        <span class="l-type-badge">${escapeHTML(c.type || '必修')}</span>
                    </div>
                    <div class="l-meta">
                        ${c.room ? `<span>${safeGetIcon('location', { size: 12 })} ${escapeHTML(c.room)}</span>` : ''} 
                        ${c.teacher ? `<span>${safeGetIcon('user', { size: 12 })} ${escapeHTML(c.teacher)}</span>` : ''}
                    </div>
                </div>
                <div class="list-card-arrow">${safeGetIcon('chevronRight', { size: 14 })}</div>
            `;
            if (cardsGroup) {
                cardsGroup.appendChild(card);
            }
        });

        container.appendChild(daySection);
    });

    if (!hasAnyClass) {
        container.innerHTML = `<div style="text-align:center; padding:50px 0; color:#64748b; font-size:0.9rem; font-weight:bold;">本學期此時段尚未排入任何課程。</div>`;
    }
}

function setScheduleViewType(type) {
    currentScheduleViewType = type;
    
    const btnGrid = document.getElementById('btnViewGrid');
    const btnList = document.getElementById('btnViewList');
    if (btnGrid) btnGrid.classList.toggle('active', type === 'grid');
    if (btnList) btnList.classList.toggle('active', type === 'list');

    const desktopGrid = document.getElementById('scheduleCaptureArea');
    const mobileGrid = document.getElementById('mobileScheduleArea');
    const listView = document.getElementById('scheduleListViewArea');

    if (type === 'list') {
        if (desktopGrid) desktopGrid.style.display = 'none';
        if (mobileGrid) mobileGrid.style.display = 'none';
        if (listView) listView.style.display = 'block';
        renderScheduleListView();
    } else {
        if (desktopGrid) desktopGrid.style.display = window.innerWidth > 768 ? 'block' : 'none';
        if (mobileGrid) mobileGrid.style.display = window.innerWidth <= 768 ? 'block' : 'none';
        if (listView) listView.style.display = 'none';
    }
}

function navigateSemester(direction) {
    const order = appData.semesterOrder || [];
    if (order.length === 0) return;
    const currentIndex = order.indexOf(appData.currentSemester);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < order.length) {
        appData.currentSemester = order[nextIndex];
        if (typeof cancelEdit === 'function') cancelEdit();
        saveData();
        renderSemesterSelect();
        updateAppUI();
    }
}

let resizeDebounceTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
        if (currentScheduleViewType === 'grid') {
            const desktopGrid = document.getElementById('scheduleCaptureArea');
            const mobileGrid = document.getElementById('mobileScheduleArea');
            if (desktopGrid && mobileGrid) {
                desktopGrid.style.display = window.innerWidth > 768 ? 'block' : 'none';
                mobileGrid.style.display = window.innerWidth <= 768 ? 'block' : 'none';
            }
        }
    }, 150);
});

let draggedCourseContext = null;

function handleCardDragStart(e, courseId, slotIndex, duration) {
    const curSem = appData.currentSemester;
    const courses = appData.semesters[curSem] || [];
    const course = courses.find(c => String(c.id) === String(courseId));
    if (!course) return;

    const targetSlot = (course.slots && course.slots[slotIndex]) ? course.slots[slotIndex] : null;
    const actualDuration = duration || (targetSlot ? targetSlot.periods.length : 1);

    draggedCourseContext = {
        courseId: course.id,
        slotIndex: slotIndex,
        slotCount: actualDuration
    };

    e.dataTransfer.setData('text/plain', course.id);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
}

function handleCardDragEnd(e) {
    e.target.style.opacity = '1';
    draggedCourseContext = null;
    document.querySelectorAll('.tf-grid-bg-cell.drag-hover').forEach(el => el.classList.remove('drag-hover'));
}

function handleCellDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-hover');
}

function handleCellDragLeave(e) {
    e.currentTarget.classList.remove('drag-hover');
}

function handleCellDrop(e, targetDay, startPeriod) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-hover');

    if (!draggedCourseContext) return;

    const curSem = appData.currentSemester;
    const courses = appData.semesters[curSem] || [];
    const course = courses.find(c => String(c.id) === String(draggedCourseContext.courseId));
    if (!course) return;

    const activeSlots = getActiveTimeSlots();
    const periodKeys = activeSlots.map(s => String(s.period));
    let startIdx = periodKeys.indexOf(String(startPeriod));
    if (startIdx === -1) return;

    const duration = draggedCourseContext.slotCount || 1;

    if (startIdx + duration > periodKeys.length) {
        startIdx = Math.max(0, periodKeys.length - duration);
    }

    const newPeriods = periodKeys.slice(startIdx, startIdx + duration);
    const targetDayNum = parseInt(targetDay, 10);

    if (!Array.isArray(course.slots)) {
        course.slots = [];
    }

    const sIdx = draggedCourseContext.slotIndex;
    if (sIdx !== undefined && sIdx >= 0 && sIdx < course.slots.length) {
        course.slots[sIdx] = {
            day: targetDayNum,
            periods: newPeriods
        };
    } else {
        course.slots = [{
            day: targetDayNum,
            periods: newPeriods
        }];
    }

    if (typeof TimeFlowStore !== 'undefined' && TimeFlowStore.commit) {
        TimeFlowStore.commit();
    } else {
        saveData();
        updateAppUI();
    }
}