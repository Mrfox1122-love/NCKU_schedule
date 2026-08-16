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

// ⚠️ 衝堂檢查與 3 行卡片渲染引擎
function renderSchedule() {
    const activeDays = getActiveDays();
    const activeSlots = getActiveTimeSlots();

    // 1. 清空格子
    activeDays.forEach(day => {
        activeSlots.forEach(slot => {
            const cell = document.getElementById(`cell-${day}-${slot.period}`);
            if (cell) {
                cell.innerHTML = '';
                cell.className = '';
            }
        });
    });

    const currentCourses = appData.semesters[appData.currentSemester] || [];
    updateScheduleStats(currentCourses);

    // 2. 收集各格子的課程分佈，計算衝堂
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
                    if (cellCourseMap[key]) {
                        cellCourseMap[key].push(course);
                    }
                });
            }
        });
    });

    // 3. 統計衝堂並生成警示資訊
    let hardConflicts = [];
    let tentativeConflicts = [];

    Object.keys(cellCourseMap).forEach(key => {
        const courses = cellCourseMap[key];
        if (courses.length > 1) {
            const [dayStr, period] = key.split('-');
            const day = parseInt(dayStr);
            const cell = document.getElementById(`cell-${day}-${period}`);

            const officialCourses = courses.filter(c => !c.isTentative);
            const hasTentative = courses.some(c => c.isTentative);

            if (officialCourses.length >= 2) {
                // 🔴 正式衝堂
                if (cell) cell.classList.add('cell-conflict-hard');
                const names = officialCourses.map(c => `<b>${c.name}</b>`).join(' ↔ ');
                hardConflicts.push(`週${dayNames[day]} 第 ${period} 節：${names}`);
            } else if (hasTentative) {
                // 🟡 暫定衝堂
                if (cell) cell.classList.add('cell-conflict-tentative');
                const names = courses.map(c => `<b>${c.name}</b>${c.isTentative ? '(暫定)' : ''}`).join(' ↔ ');
                tentativeConflicts.push(`週${dayNames[day]} 第 ${period} 節：${names}`);
            }
        }
    });

    // 4. 更新頂部衝堂橫幅
    const bannerArea = document.getElementById('conflictBannerArea');
    if (bannerArea) {
        if (hardConflicts.length > 0 || tentativeConflicts.length > 0) {
            bannerArea.style.display = 'block';
            let bannerHTML = '';
            if (hardConflicts.length > 0) {
                bannerHTML += `
                    <div class="conflict-banner conflict-banner-hard">
                        🚨 <b>發現正式課程衝堂！</b>（將影響修課與學分）<br>
                        ${hardConflicts.map(c => `• ${c}`).join('<br>')}
                    </div>
                `;
            }
            if (tentativeConflicts.length > 0) {
                bannerHTML += `
                    <div class="conflict-banner conflict-banner-tentative">
                        🟡 <b>發現暫定／候補課程衝堂提示：</b><br>
                        ${tentativeConflicts.map(c => `• ${c}`).join('<br>')}
                    </div>
                `;
            }
            bannerArea.innerHTML = bannerHTML;
        } else {
            bannerArea.style.display = 'none';
            bannerArea.innerHTML = '';
        }
    }

    // 5. 渲染課程卡片 (3 行核心資訊：名稱、教室、老師)
    currentCourses.forEach(course => {
        const isTentative = course.isTentative === true;
        const isFailed = (course.status === '未取得');

        (course.slots || []).forEach(slotInfo => {
            if (activeDays.includes(slotInfo.day)) {
                (slotInfo.periods || []).forEach(p => {
                    const cell = document.getElementById(`cell-${slotInfo.day}-${p}`);
                    if (cell) {
                        const card = document.createElement('div');
                        let cardClass = 'course-card';
                        if (isTentative) cardClass += ' tentative-card';
                        if (isFailed) cardClass += ' failed-card';
                        
                        card.className = cardClass;
                        card.style.backgroundColor = course.color || '#2563eb';
                        card.style.color = course.textColor || '#ffffff';
                        
                        if (course.notes) {
                            card.title = `📝 備註：${course.notes}`;
                        }

                        let safeUrl = '';
                        if (course.url && /^https?:\/\//i.test(course.url.trim())) {
                            safeUrl = course.url.trim();
                        }

                        let roomHtml = course.room ? `<div class="course-card-room" title="教室: ${course.room}">📍 ${course.room}</div>` : '';
                        let teacherHtml = course.teacher ? `<div class="course-card-teacher" title="教師: ${course.teacher}">👤 ${course.teacher}</div>` : '';
                        let tentativeBadge = isTentative ? `<span class="tentative-badge">❓ 暫定</span>` : '';
                        let linkIcon = safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="course-card-link" title="開啟課程連結" onclick="event.stopPropagation()">🔗</a>` : '';

                        card.innerHTML = `
                            ${linkIcon}
                            <div class="course-card-name" title="${course.name}">${course.name}</div>
                            ${roomHtml}
                            ${teacherHtml}
                            ${tentativeBadge}
                        `;
                        
                        const overlay = document.createElement('div');
                        overlay.className = 'course-overlay';
                        overlay.style.color = '#ffffff'; 
                        
                        if (isTentative) {
                            const confirmBtn = document.createElement('button');
                            confirmBtn.className = 'action-btn confirm';
                            confirmBtn.innerText = '✅ 轉正';
                            confirmBtn.onclick = (e) => { e.stopPropagation(); confirmTentativeCourse(course.id, course.name); };
                            overlay.appendChild(confirmBtn);
                        }
                        
                        const editBtn = document.createElement('button');
                        editBtn.className = 'action-btn edit';
                        editBtn.innerText = '✏️ 編輯';
                        editBtn.onclick = (e) => { e.stopPropagation(); startEdit(course.id); };
                        
                        const delBtn = document.createElement('button');
                        delBtn.className = 'action-btn delete';
                        delBtn.innerText = '🗑️ 刪除';
                        delBtn.onclick = (e) => { e.stopPropagation(); deleteCourse(course.id); };
                        
                        overlay.appendChild(editBtn);
                        overlay.appendChild(delBtn);
                        card.appendChild(overlay);
                        cell.appendChild(card);
                    }
                });
            }
        });
    });

    // 6. 渲染候選清單
    if (typeof renderWishlist === 'function') {
        renderWishlist();
    }
}

function exportSchedulePNG() {
    const target = document.getElementById('scheduleCaptureArea');
    if (!target) return;

    const originalOverflow = target.style.overflow;
    target.style.overflow = 'visible';

    html2canvas(target, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
    }).then(canvas => {
        target.style.overflow = originalOverflow;
        const link = document.createElement('a');
        link.download = `${appData.deptName}_${appData.currentSemester}_課表.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        target.style.overflow = originalOverflow;
        alert('匯出圖片失敗，請重試！');
    });
}