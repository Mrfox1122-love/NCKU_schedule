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

function updateSidebarSelectors() {
    const wN = document.getElementById('wrapper-pN');
    if (wN) wN.style.display = appData.showNoon ? 'contents' : 'none';

    const wNight = document.getElementById('wrapper-pNight');
    if (wNight) wNight.style.display = appData.showNight ? 'contents' : 'none';

    const opt6 = document.getElementById('optDay6');
    const opt7 = document.getElementById('optDay7');
    if (opt6) opt6.style.display = appData.showWeekend ? 'block' : 'none';
    if (opt7) opt7.style.display = appData.showWeekend ? 'block' : 'none';
}

function renderSemesterSelect() {
    const semSelect = document.getElementById('semSelect');
    if (!semSelect) return;
    semSelect.innerHTML = '';
    
    const numLabelMap = { 
        "一": "大一", "二": "大二", "三": "大三", "四": "大四", 
        "五": "大五", "六": "大六", "七": "大七", "八": "大八", "九": "大九", "十": "大十" 
    };
    
    appData.semesterOrder.forEach(sem => {
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

    if (!appData.semesterOrder.includes(appData.currentSemester)) {
        appData.currentSemester = appData.semesterOrder[0] || "一上";
    }
    semSelect.value = appData.currentSemester;

    // 🌟 更新 ◀ ▶ 按鈕禁用狀態
    const currentIndex = appData.semesterOrder.indexOf(appData.currentSemester);
    const btnPrev = document.getElementById('btnSemPrev');
    const btnNext = document.getElementById('btnSemNext');
    if (btnPrev) btnPrev.disabled = (currentIndex <= 0);
    if (btnNext) btnNext.disabled = (currentIndex >= appData.semesterOrder.length - 1);

    syncSemesterDatesUI();
}

// 🌟 快速學期步進 (上一學期 / 下一學期)
function stepSemester(direction) {
    const currentIndex = appData.semesterOrder.indexOf(appData.currentSemester);
    const targetIndex = currentIndex + direction;
    if (targetIndex >= 0 && targetIndex < appData.semesterOrder.length) {
        appData.currentSemester = appData.semesterOrder[targetIndex];
        cancelEdit();
        renderSemesterSelect();
        saveData();
        updateAppUI();
    }
}

function addNewSemester() {
    const nextSem = getNextSemesterName(appData.semesterOrder);
    if (!appData.semesters[nextSem]) {
        appData.semesters[nextSem] = [];
    }
    if (!appData.semesterOrder.includes(nextSem)) {
        appData.semesterOrder.push(nextSem);
    }
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
        if (!confirm(`⚠️「${currentSem}」內尚有 ${coursesInSem.length} 門課程，刪除後課程資料將一併清除，確定要刪除嗎？`)) {
            return;
        }
    } else {
        if (!confirm(`確定要刪除「${currentSem}」嗎？`)) {
            return;
        }
    }

    delete appData.semesters[currentSem];
    appData.semesterOrder = appData.semesterOrder.filter(s => s !== currentSem);
    appData.currentSemester = appData.semesterOrder[appData.semesterOrder.length - 1] || "一上";
    
    cancelEdit();
    renderSemesterSelect();
    saveData();
    updateAppUI();
}

function initTable() {
    const activeSlots = getActiveTimeSlots();
    const activeDays = getActiveDays();

    const theadRow = document.getElementById('scheduleTheadRow');
    theadRow.innerHTML = '<th class="time-col">時間 / 節次</th>';
    activeDays.forEach(day => {
        const th = document.createElement('th');
        th.innerText = `星期${dayNames[day]}`;
        if (day === 6) th.style.color = '#b45309';
        if (day === 7) th.style.color = '#dc2626';
        theadRow.appendChild(th);
    });

    const tbody = document.querySelector('#scheduleTable tbody');
    tbody.innerHTML = '';
    
    activeSlots.forEach(slot => {
        const tr = document.createElement('tr');
        const tdTime = document.createElement('td');
        tdTime.className = 'time-col';
        tdTime.innerHTML = `<strong>${slot.label}</strong><br><span class="time-text">${slot.time}</span>`;
        tr.appendChild(tdTime);

        activeDays.forEach(day => {
            const td = document.createElement('td');
            td.id = `cell-${day}-${slot.period}`;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    renderSemesterSelect();
    updateSidebarSelectors();

    const cbNoon = document.getElementById('toggleNoonCB');
    if (cbNoon) cbNoon.checked = appData.showNoon !== false;

    const cbNight = document.getElementById('toggleNightCB');
    if (cbNight) cbNight.checked = !!appData.showNight;

    const cbWeekend = document.getElementById('toggleWeekendCB');
    if (cbWeekend) cbWeekend.checked = !!appData.showWeekend;

    document.getElementById('englishPassedCB').checked = appData.englishPassed || false;
    document.getElementById('deptNameInput').value = appData.deptName;
    document.getElementById('gradTargetInput').value = appData.targetCredits;
    document.getElementById('reqTargetInput').value = appData.targetRequired;

    if (document.getElementById('reqElecTargetInput')) {
        document.getElementById('reqElecTargetInput').value = appData.targetReqElective || 0;
    }

    document.getElementById('elecTargetInput').value = appData.targetElective;
    document.getElementById('outMaxInput').value = appData.maxOutElective;

    const waivedSelect = document.getElementById('englishWaivedSelect');
    if (waivedSelect) waivedSelect.value = String(appData.englishWaived || 0);

    toggleScoreInput();
    syncSemesterDatesUI();
}

function updateScheduleStats(currentCourses) {
    const statFreeTime = document.getElementById('statFreeTime');
    if (!statFreeTime) return;

    const activeDays = getActiveDays();
    const activeSlots = getActiveTimeSlots();
    const activePeriods = activeSlots.map(s => String(s.period));

    let totalClassPeriods = 0;
    let totalFreePeriods = 0;

    activeDays.forEach(day => {
        let occupiedIndices = [];

        currentCourses.forEach(course => {
            (course.slots || []).forEach(slot => {
                if (slot.day === day) {
                    slot.periods.forEach(p => {
                        const pStr = String(p);
                        const idx = activePeriods.indexOf(pStr);
                        if (idx !== -1) {
                            occupiedIndices.push(idx);
                            totalClassPeriods++;
                        }
                    });
                }
            });
        });

        if (occupiedIndices.length > 1) {
            occupiedIndices = [...new Set(occupiedIndices)].sort((a, b) => a - b);
            const minIdx = occupiedIndices[0];
            const maxIdx = occupiedIndices[occupiedIndices.length - 1];
            const daySpan = (maxIdx - minIdx + 1);
            const freeInDay = daySpan - occupiedIndices.length;
            if (freeInDay > 0) {
                totalFreePeriods += freeInDay;
            }
        }
    });

    statFreeTime.innerHTML = `📚 本週上課: <b>${totalClassPeriods}</b> 節 ｜ ☕ 空堂時間: <b>${totalFreePeriods}</b> 節`;
}

// 🎨 智慧背景亮度偵測演算法：自動決定配黑字還是白字
function getContrastTextColor(hex) {
    if (!hex) return '#ffffff';
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substr(0, 2), 16) || 0;
    const g = parseInt(c.substr(2, 2), 16) || 0;
    const b = parseInt(c.substr(4, 2), 16) || 0;
    // YIQ 亮度感知公式
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 145) ? '#0f172a' : '#ffffff';
}

// 📱 手機版 CSS Grid 課表渲染核心
function renderMobileSchedule(currentCourses, activeDays, activeSlots) {
    const board = document.getElementById('mobileGridBoard');
    if (!board) return;

    const colCount = activeDays.length;
    const rowCount = activeSlots.length;

    // 🌟 時間欄縮為 26px，其餘 5 天 (或 7 天) 均分 100% 寬度
    board.style.gridTemplateColumns = `26px repeat(${colCount}, minmax(0, 1fr))`;
    board.style.gridTemplateRows = `28px repeat(${rowCount}, minmax(0, 1fr))`;
    board.innerHTML = '';

    // 1. 左上角標籤
    const corner = document.createElement('div');
    corner.className = 'mobile-grid-header';
    corner.innerText = '節';
    board.appendChild(corner);

    // 2. 頂部星期 Header
    activeDays.forEach((day, dIdx) => {
        const h = document.createElement('div');
        h.className = `mobile-grid-header ${day >= 6 ? 'weekend' : ''}`;
        h.style.gridColumn = `${dIdx + 2}`;
        h.style.gridRow = '1';
        h.innerText = `週${dayNames[day]}`;
        board.appendChild(h);
    });

    // 3. 左側節次時間欄與背景網格
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
            bgCell.className = 'mobile-grid-cell';
            bgCell.style.gridColumn = `${dIdx + 2}`;
            bgCell.style.gridRow = `${rowNum}`;
            board.appendChild(bgCell);
        });
    });

    // 4. 放置課程卡片（自動合併連續節次 + 智慧高對比文字）
    const periodKeys = activeSlots.map(s => String(s.period));

    currentCourses.forEach(course => {
        const isTentative = course.isTentative === true;
        const bgColor = course.color || '#2563eb';
        // 🌟 自動計算最高對比文字顏色 (即使是亮黃色也會配深黑字，超清晰)
        const textColor = getContrastTextColor(bgColor);

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
                card.style.backgroundColor = bgColor;
                card.style.color = textColor;

                card.onclick = () => showCourseDetail(course.id);

                let roomText = course.room ? `<div class="mobile-course-room">📍${course.room}</div>` : '';
                let teacherText = (grp.length >= 2 && course.teacher) ? `<div class="mobile-course-teacher">👤${course.teacher}</div>` : '';

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

// ⚠️ 主排課渲染入口 (同時更新 Desktop & Mobile)
function renderSchedule() {
    const activeDays = getActiveDays();
    const activeSlots = getActiveTimeSlots();
    const currentCourses = appData.semesters[appData.currentSemester] || [];

    // 1. 更新空堂統計
    updateScheduleStats(currentCourses);

    // 2. 渲染 Desktop 課表
    activeDays.forEach(day => {
        activeSlots.forEach(slot => {
            const cell = document.getElementById(`cell-${day}-${slot.period}`);
            if (cell) {
                cell.innerHTML = '';
                cell.className = '';
            }
        });
    });

    const cellCourseMap = {};
    activeDays.forEach(day => {
        activeSlots.forEach(slot => {
            cellCourseMap[`${day}-${slot.period}`] = [];
        });
    });

    currentCourses.forEach(course => {
        (course.slots || []).forEach(slotInfo => {
            if (activeDays.includes(slotInfo.day)) {
                (slotInfo.periods || []).forEach(p => {
                    const key = `${slotInfo.day}-${p}`;
                    if (cellCourseMap[key]) cellCourseMap[key].push(course);
                });
            }
        });
    });

    // 衝堂檢查
    let hardConflicts = [];
    let tentativeConflicts = [];
    Object.keys(cellCourseMap).forEach(key => {
        const courses = cellCourseMap[key];
        if (courses.length > 1) {
            const [dayStr, period] = key.split('-');
            const day = parseInt(dayStr);
            const cell = document.getElementById(`cell-${day}-${period}`);
            const officialCourses = courses.filter(c => !c.isTentative);

            if (officialCourses.length >= 2) {
                if (cell) cell.classList.add('cell-conflict-hard');
                hardConflicts.push(`週${dayNames[day]} 第 ${period} 節：${officialCourses.map(c => `<b>${c.name}</b>`).join(' ↔ ')}`);
            } else {
                if (cell) cell.classList.add('cell-conflict-tentative');
                tentativeConflicts.push(`週${dayNames[day]} 第 ${period} 節：${courses.map(c => `<b>${c.name}</b>`).join(' ↔ ')}`);
            }
        }
    });

    // 衝堂橫幅
    const bannerArea = document.getElementById('conflictBannerArea');
    const mobileBanner = document.getElementById('mobileConflictBanner');
    const bannerHTML = (hardConflicts.length > 0 ? `<div class="conflict-banner conflict-banner-hard">🚨 <b>衝堂：</b>${hardConflicts.join(' ｜ ')}</div>` : '') +
                       (tentativeConflicts.length > 0 ? `<div class="conflict-banner conflict-banner-tentative">🟡 <b>候補提醒：</b>${tentativeConflicts.join(' ｜ ')}</div>` : '');

    if (bannerArea) {
        bannerArea.style.display = (hardConflicts.length || tentativeConflicts.length) ? 'block' : 'none';
        bannerArea.innerHTML = bannerHTML;
    }
    if (mobileBanner) {
        mobileBanner.style.display = (hardConflicts.length || tentativeConflicts.length) ? 'block' : 'none';
        mobileBanner.innerHTML = bannerHTML;
    }

    // 渲染 Desktop 卡片
    currentCourses.forEach(course => {
        const isTentative = course.isTentative === true;
        const isFailed = (course.status === '未取得');

        (course.slots || []).forEach(slotInfo => {
            if (activeDays.includes(slotInfo.day)) {
                (slotInfo.periods || []).forEach(p => {
                    const cell = document.getElementById(`cell-${slotInfo.day}-${p}`);
                    if (cell) {
                        const card = document.createElement('div');
                        card.className = `course-card ${isTentative ? 'tentative-card' : ''} ${isFailed ? 'failed-card' : ''}`;
                        card.style.backgroundColor = course.color || '#2563eb';
                        card.style.color = course.textColor || '#ffffff';
                        card.style.cursor = 'pointer';
                        card.onclick = () => showCourseDetail(course.id);

                        let safeUrl = (course.url && /^https?:\/\//i.test(course.url.trim())) ? course.url.trim() : '';
                        let roomHtml = course.room ? `<div class="course-card-room">📍 ${course.room}</div>` : '';
                        let teacherHtml = course.teacher ? `<div class="course-card-teacher">👤 ${course.teacher}</div>` : '';
                        let tentativeBadge = isTentative ? `<span class="tentative-badge">❓ 暫定</span>` : '';
                        let linkIcon = safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="course-card-link" onclick="event.stopPropagation()">🔗</a>` : '';

                        card.innerHTML = `${linkIcon}<div class="course-card-name">${course.name}</div>${roomHtml}${teacherHtml}${tentativeBadge}`;
                        cell.appendChild(card);
                    }
                });
            }
        });
    });

    // 3. 渲染 Mobile Grid 課表
    renderMobileSchedule(currentCourses, activeDays, activeSlots);

    // 4. 渲染候選清單
    if (typeof renderWishlist === 'function') renderWishlist();
}

// 🖼️ 升級版課表圖片匯出 (自動適配 Desktop Table / Mobile Grid / List View)
function exportSchedulePNG() {
    // 🌟 1. 智慧判定當前畫面上正在顯示的課表區域
    let target = document.getElementById('scheduleCaptureArea');
    
    if (currentScheduleViewType === 'list') {
        target = document.getElementById('scheduleListViewArea');
    } else if (window.innerWidth <= 768 || (target && window.getComputedStyle(target).display === 'none')) {
        target = document.getElementById('mobileScheduleArea');
    }

    if (!target) {
        alert('找不到可匯出的課表區塊！');
        return;
    }

    // 🌟 2. 加上純淨截圖樣式濾鏡 (暫時隱藏警告標籤與多餘按鈕)
    target.classList.add('clean-png-capture');

    // 🌟 3. html2canvas 加入手機防位移 (scrollX/scrollY: 0) 設定
    html2canvas(target, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        logging: false
    }).then(canvas => {
        target.classList.remove('clean-png-capture');

        const fileName = `${appData.deptName || '課表'}_${appData.currentSemester}_${currentScheduleViewMode === 'semester' ? '學期規劃' : `第${currentScheduleViewWeek}週`}_課表.png`;

        // 🌟 4. 手機與電腦通用的安全下載機制 (Blob + ObjectURL)
        if (canvas.toBlob) {
            canvas.toBlob(blob => {
                if (!blob) {
                    fallbackDownload(canvas.toDataURL('image/png'), fileName);
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    link.remove();
                    URL.revokeObjectURL(url);
                }, 1000);
            }, 'image/png');
        } else {
            fallbackDownload(canvas.toDataURL('image/png'), fileName);
        }
    }).catch(err => {
        target.classList.remove('clean-png-capture');
        console.error('[Export PNG Error]', err);
        alert('匯出圖片失敗，請重試！');
    });
}

function fallbackDownload(dataUrl, fileName) {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

// 📅 自動推算結業日 (開學日 + 週數 * 7 - 1 天)
function computeEndDate(startDateStr, weeks) {
    if (!startDateStr || !weeks) return '';
    const start = new Date(startDateStr + 'T00:00:00');
    const totalDays = (parseInt(weeks, 10) * 7) - 1;
    const end = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 🌟 當使用者在課表頁修改開學日或週數時觸發
function onSemesterDatesChange() {
    if (!appData.semesterDates) appData.semesterDates = {};
    const startDate = document.getElementById('semStartDateInput').value;
    const totalWeeks = parseInt(document.getElementById('semWeeksInput').value, 10) || 18;
    const endDate = computeEndDate(startDate, totalWeeks);

    appData.semesterDates[appData.currentSemester] = {
        startDate: startDate,
        totalWeeks: totalWeeks,
        endDate: endDate
    };

    saveData();
    syncSemesterDatesUI();
    updateAppUI();
}

// 🌟 同步學期時程輸入框數值
function syncSemesterDatesUI() {
    const startInput = document.getElementById('semStartDateInput');
    const weeksInput = document.getElementById('semWeeksInput');
    const endBadge = document.getElementById('semEndDateText');
    if (!startInput || !weeksInput || !endBadge) return;

    const currentDates = (appData.semesterDates && appData.semesterDates[appData.currentSemester]) || {};
    startInput.value = currentDates.startDate || '';
    weeksInput.value = currentDates.totalWeeks || 18;

    if (currentDates.startDate) {
        const endDate = currentDates.endDate || computeEndDate(currentDates.startDate, currentDates.totalWeeks || 18);
        endBadge.innerText = `🏁 結業日：${endDate}`;
    } else {
        endBadge.innerText = `🏁 結業日：未設定`;
    }
}

// 🌟 手機版學期時程收合切換
function toggleSemDatesCollapse() {
    const container = document.getElementById('semDatesContainer');
    if (container) {
        container.classList.toggle('open');
    }
}

// 🌟 同步學期時程輸入框數值與摘要標籤
function syncSemesterDatesUI() {
    const startInput = document.getElementById('semStartDateInput');
    const weeksInput = document.getElementById('semWeeksInput');
    const endBadge = document.getElementById('semEndDateText');
    const endSummary = document.getElementById('semEndDateSummary');
    if (!startInput || !weeksInput || !endBadge) return;

    const currentDates = (appData.semesterDates && appData.semesterDates[appData.currentSemester]) || {};
    startInput.value = currentDates.startDate || '';
    weeksInput.value = currentDates.totalWeeks || 18;

    if (currentDates.startDate) {
        const endDate = currentDates.endDate || computeEndDate(currentDates.startDate, currentDates.totalWeeks || 18);
        endBadge.innerText = `🏁 結業日：${endDate}`;
        if (endSummary) endSummary.innerText = `結業: ${endDate}`;
    } else {
        endBadge.innerText = `🏁 結業日：未設定`;
        if (endSummary) endSummary.innerText = `未設定`;
    }
}