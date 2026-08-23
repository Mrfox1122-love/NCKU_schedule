// ============================================================
// 📚 Schedule 多學期排課工作台引擎
// ============================================================

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
        const match = sem.match(/^([一二三四五六七八九十\d]+)(上|下)$/);
        if (match) {
            const y = match[1];
            const t = match[2] === '上' ? '上學期' : '下學期';
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
    const nextSem = getNextSemesterName(appData.semesterOrder);
    if (!appData.semesters[nextSem]) appData.semesters[nextSem] = [];
    if (!appData.semesterOrder.includes(nextSem)) appData.semesterOrder.push(nextSem);
    appData.currentSemester = nextSem;
    renderSemesterSelect();
    saveData();
    updateAppUI();
}

function deleteCurrentSemester() {
    const currentSem = appData.currentSemester;
    if (appData.semesterOrder.length <= 8) {
        alert('預設的四年（前 8 個學期）為基本修業架構，無法刪除！');
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

    if (document.getElementById('deptNameInput')) document.getElementById('deptNameInput').value = appData.deptName || "國立成功大學 電機工程學系";
    if (document.getElementById('entryYearSelect')) document.getElementById('entryYearSelect').value = String(appData.entryYear || 118);
    if (document.getElementById('gradTargetInput')) document.getElementById('gradTargetInput').value = appData.targetCredits || 128;
    if (document.getElementById('reqTargetInput')) document.getElementById('reqTargetInput').value = appData.targetRequired || 50;
    if (document.getElementById('reqElecTargetInput')) document.getElementById('reqElecTargetInput').value = appData.targetReqElective || 0;
    if (document.getElementById('elecTargetInput')) document.getElementById('elecTargetInput').value = appData.targetElective || 40;
    if (document.getElementById('outMaxInput')) document.getElementById('outMaxInput').value = appData.maxOutElective || 15;
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

    if (!statCourseCount) return;

    const activeDays = getActiveDays();
    const activeSlots = getActiveTimeSlots();
    const activePeriods = activeSlots.map(s => String(s.period));

    let totalCredits = 0;
    let totalPeriods = 0;
    let validCount = 0;

    (currentCourses || []).forEach(c => {
        if (!c.isTentative) {
            validCount++;
            totalCredits += (parseFloat(c.credits) || 0);
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
}

function checkScheduleConflicts(courses) {
    const banner = document.getElementById('conflictBannerArea');
    if (!banner) return;

    if (typeof ConflictEngine !== 'undefined' && ConflictEngine.detect) {
        const result = ConflictEngine.detect(courses, 'semester');
        if (result.hasHardConflict) {
            const conflictText = result.hardConflicts.map(c => 
                `週${c.dayName} (${c.overlapTimeDisplay})：${c.courses.map(x => x.name).join(' 與 ')}`
            ).join('；');
            banner.style.display = 'block';
            banner.innerHTML = `<div class="tf-conflict-alert">${Icons.get('warning', { size: 15 })} <b>發現衝堂：</b>${conflictText}</div>`;
        } else if (result.hasTentativeWarning) {
            banner.style.display = 'block';
            banner.innerHTML = `<div class="tf-conflict-warn">${Icons.get('info', { size: 15 })} <b>暫定時段提醒：</b>含有多時段候補排課，請留意正式選課結果。</div>`;
        } else {
            banner.style.display = 'none';
        }
    } else {
        banner.style.display = 'none';
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

    if (typeof renderWishlist === 'function') renderWishlist();

    if (currentScheduleViewType === 'list') {
        renderScheduleListView();
    }
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
        h.innerHTML = `<div class="th-content-box"><span class="th-day-name">星期${dayNames[day]}</span></div>`;
        board.appendChild(h);
    });

    activeSlots.forEach((slot, sIdx) => {
        const rowNum = sIdx + 2;

        const t = document.createElement('div');
        t.className = 'tf-grid-time-cell';
        t.style.gridColumn = '1';
        t.style.gridRow = `${rowNum}`;
        t.innerHTML = `<strong>${slot.label}</strong><span class="time-sub">${slot.time}</span>`;
        board.appendChild(t);

        activeDays.forEach((day, dIdx) => {
            const bgCell = document.createElement('div');
            bgCell.className = `tf-grid-bg-cell`;
            bgCell.style.gridColumn = `${dIdx + 2}`;
            bgCell.style.gridRow = `${rowNum}`;
            board.appendChild(bgCell);
        });
    });

    const periodKeys = activeSlots.map(s => String(s.period));

    const renderedItems = [];
    currentCourses.forEach(course => {
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
                renderedItems.push({
                    course,
                    day: slotInfo.day,
                    dayIdx,
                    startRow,
                    endRow,
                    grp
                });
            });
        });
    });

    activeDays.forEach((day, dayIdx) => {
        const dayItems = renderedItems.filter(item => item.dayIdx === dayIdx);
        
        dayItems.forEach((item, i) => {
            const overlapping = dayItems.filter(other => 
                Math.max(item.startRow, other.startRow) < Math.min(item.endRow, other.endRow)
            );

            const totalCols = overlapping.length;
            const colIndex = overlapping.indexOf(item);

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
                const widthPercent = (100 / totalCols).toFixed(1);
                const leftPercent = (colIndex * (100 / totalCols)).toFixed(1);
                card.style.width = `calc(${widthPercent}% - 4px)`;
                card.style.marginLeft = `calc(${leftPercent}% + 2px)`;
                card.style.zIndex = `${colIndex + 3}`;
            }

            card.onclick = () => showCourseDetail(course.id);

            card.innerHTML = `
                <div class="card-name-row" style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="card-name">${course.name}</span>
                    <div style="display:flex; gap:2px; align-items:center;">
                        ${isTentative ? '<span class="tf-card-tag tag-rescheduled">暫定</span>' : ''}
                    </div>
                </div>
                <div class="card-time">${timeRangeStr}</div>
                <div class="card-meta">
                    ${course.room ? `<span>${Icons.get('location', { size: 11 })} ${course.room}</span>` : ''}
                    ${course.teacher ? `<span>${Icons.get('user', { size: 11 })} ${course.teacher}</span>` : ''}
                </div>
            `;

            board.appendChild(card);
        });
    });
}

function renderMobileSchedule(currentCourses, activeDays, activeSlots) {
    const board = document.getElementById('mobileGridBoard');
    if (!board) return;

    const colCount = activeDays.length;
    const rowCount = activeSlots.length;

    board.style.gridTemplateColumns = `28px repeat(${colCount}, minmax(0, 1fr))`;
    board.style.gridTemplateRows = `36px repeat(${rowCount}, minmax(0, 1fr))`;
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
        h.innerHTML = `週${dayNames[day]}`;
        board.appendChild(h);
    });

    activeSlots.forEach((slot, sIdx) => {
        const rowNum = sIdx + 2;

        const t = document.createElement('div');
        t.className = 'mobile-grid-time';
        t.style.gridColumn = '1';
        t.style.gridRow = `${rowNum}`;
        t.innerHTML = `<span>${slot.period}</span>`;
        board.appendChild(t);

        activeDays.forEach((day, dIdx) => {
            const bgCell = document.createElement('div');
            bgCell.className = `mobile-grid-cell`;
            bgCell.style.gridColumn = `${dIdx + 2}`;
            bgCell.style.gridRow = `${rowNum}`;
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

                let roomText = course.room ? `<div class="mobile-course-room">${Icons.get('location', { size: 10 })} ${course.room}</div>` : '';
                let teacherText = (grp.length >= 2 && course.teacher) ? `<div class="mobile-course-teacher">${Icons.get('user', { size: 10 })} ${course.teacher}</div>` : '';

                card.innerHTML = `
                    <div class="mobile-course-name">${course.name}</div>
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
            <div class="list-day-header">星期${dayNames[day]}</div>
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

            const periodsDisplay = Array.isArray(slot.periods) ? slot.periods.join(',') : slot.periods;

            card.innerHTML = `
                <div class="list-card-time-box">
                    <span class="l-time">${timeRangeStr}</span>
                    <span class="l-period">第 ${periodsDisplay} 節</span>
                </div>
                <div class="list-card-main-box">
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span class="l-name">${c.name}</span>
                        <span class="l-type-badge">${c.type || '必修'}</span>
                    </div>
                    <div class="l-meta">
                        ${c.room ? `<span>${Icons.get('location', { size: 12 })} ${c.room}</span>` : ''} 
                        ${c.teacher ? `<span>${Icons.get('user', { size: 12 })} ${c.teacher}</span>` : ''}
                    </div>
                </div>
                <div class="list-card-arrow">${Icons.get('chevronRight', { size: 14 })}</div>
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