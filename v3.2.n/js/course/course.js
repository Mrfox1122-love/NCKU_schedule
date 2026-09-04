// ============================================================
// 📚 Course 現代化課程編輯與彈窗模組 (TimeFlow v3.2 - XSS Secured)
// ============================================================

let currentEditingId = null;

const PRESET_COLORS = [
    '#2563eb', '#3b82f6', '#0284c7', '#06b6d4', '#10b981',
    '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899',
    '#8b5cf6', '#6366f1', '#475569', '#0f172a'
];

let formSlotsState = [
    { id: 'slot_1', day: 1, startPeriod: '1', endPeriod: '2' }
];

function isCourseAlreadyInSemester(course, semester) {
    if (!course || !semester || !appData || !appData.semesters) return false;
    if (course.isTentative) return false;

    const coursesInSem = appData.semesters[semester] || [];
    return coursesInSem.some(existing => {
        if (course.id && existing.id && String(course.id) === String(existing.id)) {
            return false;
        }
        if (existing.isTentative) {
            return false;
        }
        if (course.code && existing.code && course.code.trim().toUpperCase() === existing.code.trim().toUpperCase()) {
            return true;
        }
        const normA = (existing.name || '').replace(/\s+/g, '').replace(/（/g, '(').replace(/）/g, ')').toLowerCase();
        const normB = (course.name || '').replace(/\s+/g, '').replace(/（/g, '(').replace(/）/g, ')').toLowerCase();
        return normA === normB && normA !== '';
    });
}

function getContrastTextColor(hex) {
    if (!hex || typeof hex !== 'string') return '#ffffff';
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? '#0f172a' : '#ffffff';
}

function handleCourseTypeChange(selectedType) {
    const creditsSelect = document.getElementById('courseCredits');
    if (!creditsSelect) return;

    if (selectedType === '服務學習' || selectedType === '軍訓' || selectedType === '全民國防' || selectedType === '體育') {
        creditsSelect.value = '0';
    } else if (creditsSelect.value === '0') {
        creditsSelect.value = '3';
    }
}

function setCourseFrequency(freq) {
    const input = document.getElementById('courseFrequency');
    if (input) input.value = freq;

    document.querySelectorAll('#courseFreqGroup .freq-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.freq === freq);
    });
}

function toggleNoScheduleInput(checked) {
    const slotList = document.getElementById('slotItemsList');
    const slotHeader = document.querySelector('.editor-section-header');
    if (slotList) slotList.style.display = checked ? 'none' : 'flex';
    if (slotHeader) slotHeader.style.display = checked ? 'none' : 'flex';
}

function initColorPalette(selectedHex = '#2563eb') {
    const grid = document.getElementById('colorPaletteGrid');
    if (!grid) return;
    grid.innerHTML = '';

    PRESET_COLORS.forEach(color => {
        const dot = document.createElement('div');
        dot.className = `color-swatch-dot ${color.toLowerCase() === selectedHex.toLowerCase() ? 'active' : ''}`;
        dot.style.backgroundColor = color;
        dot.onclick = () => selectCourseColor(color);
        grid.appendChild(dot);
    });

    const colorInput = document.getElementById('courseColor');
    const textInput = document.getElementById('courseTextColor');
    if (colorInput) colorInput.value = selectedHex;
    if (textInput) textInput.value = getContrastTextColor(selectedHex);
}

function selectCourseColor(hex) {
    const colorInput = document.getElementById('courseColor');
    const textInput = document.getElementById('courseTextColor');
    if (colorInput) colorInput.value = hex;
    if (textInput) textInput.value = getContrastTextColor(hex);
    initColorPalette(hex);
}

function toggleEditorAdvanced() {
    const container = document.querySelector('.editor-accordion-container');
    if (container) {
        container.classList.toggle('open');
    }
}

function renderSlotItemsList() {
    const list = document.getElementById('slotItemsList');
    if (!list) return;
    list.innerHTML = '';

    const activeDays = (typeof getActiveDays === 'function') ? getActiveDays() : [1, 2, 3, 4, 5];
    const activeSlots = (typeof getActiveTimeSlots === 'function') ? getActiveTimeSlots() : [];

    formSlotsState.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'slot-item-card';

        const delBtnHtml = formSlotsState.length > 1 
            ? `<button type="button" class="btn-del-slot-card" onclick="removeSlotItem(${index})" title="刪除此時段">✕</button>` 
            : '';

        let dayPillsHtml = '';
        activeDays.forEach(day => {
            const isWeekend = (day >= 6);
            const isActive = (item.day === day);
            dayPillsHtml += `
                <div class="weekday-pill-btn ${isWeekend ? 'weekend-btn' : ''} ${isActive ? 'active' : ''}" 
                     data-day="${day}"
                     onclick="setSlotItemDay(${index}, ${day})">
                    ${dayNames[day]}
                </div>
            `;
        });

        let startOptions = '';
        let endOptions = '';
        activeSlots.forEach(slot => {
            const timeParts = slot.time ? slot.time.split('~') : ['00:00', '00:00'];
            const safePeriod = escapeHTML(String(slot.period));
            const safeStart = escapeHTML(timeParts[0] || '00:00');
            const safeEnd = escapeHTML(timeParts[1] || '00:00');
            startOptions += `<option value="${safePeriod}" ${String(item.startPeriod) === String(slot.period) ? 'selected' : ''}>第 ${safePeriod} 節 (${safeStart})</option>`;
            endOptions += `<option value="${safePeriod}" ${String(item.endPeriod) === String(slot.period) ? 'selected' : ''}>第 ${safePeriod} 節 (${safeEnd})</option>`;
        });

        card.innerHTML = `
            ${delBtnHtml}
            <div class="weekday-pills-row">
                ${dayPillsHtml}
            </div>
            <div class="slot-time-range-row">
                <select class="modern-select" onchange="setSlotItemPeriod(${index}, 'start', this.value)">
                    ${startOptions}
                </select>
                <span class="range-separator">至</span>
                <select class="modern-select" onchange="setSlotItemPeriod(${index}, 'end', this.value)">
                    ${endOptions}
                </select>
            </div>
        `;

        list.appendChild(card);
    });
}

function addNewSlotItem(defaultSlot = null) {
    if (defaultSlot) {
        formSlotsState.push({
            id: `slot_${Date.now()}`,
            day: defaultSlot.day || 1,
            startPeriod: defaultSlot.periods ? defaultSlot.periods[0] : '1',
            endPeriod: defaultSlot.periods ? defaultSlot.periods[defaultSlot.periods.length - 1] : '2'
        });
    } else {
        formSlotsState.push({
            id: `slot_${Date.now()}`,
            day: 1,
            startPeriod: '1',
            endPeriod: '2'
        });
    }
    renderSlotItemsList();
}

function removeSlotItem(index) {
    if (formSlotsState.length > 1) {
        formSlotsState.splice(index, 1);
        renderSlotItemsList();
    }
}

function setSlotItemDay(index, day) {
    if (formSlotsState[index]) {
        formSlotsState[index].day = day;
        renderSlotItemsList();
    }
}

function setSlotItemPeriod(index, type, val) {
    if (formSlotsState[index]) {
        if (type === 'start') formSlotsState[index].startPeriod = val;
        if (type === 'end') formSlotsState[index].endPeriod = val;
    }
}

function expandPeriods(startP, endP) {
    const activeSlots = (typeof getActiveTimeSlots === 'function') ? getActiveTimeSlots() : [];
    const pKeys = activeSlots.map(s => String(s.period));
    let idx1 = pKeys.indexOf(String(startP));
    let idx2 = pKeys.indexOf(String(endP));
    if (idx1 === -1) idx1 = 0;
    if (idx2 === -1) idx2 = idx1;
    if (idx1 > idx2) { const t = idx1; idx1 = idx2; idx2 = t; }

    return pKeys.slice(idx1, idx2 + 1);
}

const courseFormEl = document.getElementById('courseForm');
if (courseFormEl) {
    courseFormEl.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('courseName').value.trim();
        if (!name) {
            alert('請填寫課程名稱！');
            return;
        }

        const credits = parseFloat(document.getElementById('courseCredits').value) || 0;
        const type = document.getElementById('courseType').value;
        const teacher = document.getElementById('courseTeacher').value.trim();
        const room = document.getElementById('courseRoom').value.trim();
        const color = document.getElementById('courseColor').value || '#2563eb';
        const textColor = getContrastTextColor(color);
        const isTentative = document.getElementById('courseTentative').checked;
        const isNoSchedule = document.getElementById('courseNoSchedule') ? document.getElementById('courseNoSchedule').checked : false;
        const url = document.getElementById('courseUrl').value.trim();
        const notes = document.getElementById('courseNotes').value.trim();
        const statusMode = document.getElementById('courseStatusMode').value;
        const rawScore = document.getElementById('courseScore').value;
        const frequency = document.getElementById('courseFrequency') ? document.getElementById('courseFrequency').value : 'weekly';

        // 🌟 判斷已抵免 vs 已結算 vs 修讀中
        const isWaived = (statusMode === '已抵免');
        const score = (statusMode === '已結算') ? parseFloat(rawScore) : null;
        const isPassed = isWaived ? true : (statusMode === '已結算' ? (score !== null && score >= 60) : true);
        const finalStatus = isWaived ? '已抵免' : (statusMode === '已結算' ? (isPassed ? '已取得' : '未取得') : '修讀中');

        // 若為無固定時間，時段陣列為空
        const finalSlots = isNoSchedule ? [] : formSlotsState.map(item => ({
            day: item.day,
            periods: expandPeriods(item.startPeriod, item.endPeriod)
        }));

        let existingOverrides = {};
        let existingCode = '';
        if (currentEditingId && appData.semesters[appData.currentSemester]) {
            const existingCourse = appData.semesters[appData.currentSemester].find(c => String(c.id) === String(currentEditingId));
            if (existingCourse) {
                existingOverrides = existingCourse.overrides || {};
                existingCode = existingCourse.code || '';
            }
        }

        const courseData = {
            id: currentEditingId || Date.now(),
            code: existingCode,
            name: name,
            credits: credits,
            type: type,
            teacher: teacher,
            room: room,
            color: color,
            textColor: textColor,
            isTentative: isTentative,
            isNoSchedule: isNoSchedule,
            url: url,
            notes: notes,
            status: finalStatus,
            score: isWaived ? null : score,
            passed: isPassed,
            slots: finalSlots,
            recurring: true,
            frequency: frequency,
            overrides: existingOverrides
        };

        if (isCourseAlreadyInSemester(courseData, appData.currentSemester)) {
            alert(`課程已存在！\n「${courseData.name}」已經排在【${appData.currentSemester}】，無法重複加入。`);
            return;
        }

        if (!appData.semesters[appData.currentSemester]) {
            appData.semesters[appData.currentSemester] = [];
        }

        if (currentEditingId) {
            const idx = appData.semesters[appData.currentSemester].findIndex(c => String(c.id) === String(currentEditingId));
            if (idx !== -1) {
                appData.semesters[appData.currentSemester][idx] = courseData;
            }
        } else {
            appData.semesters[appData.currentSemester].push(courseData);
        }

        saveData();
        cancelEdit();
        updateAppUI();

        if (document.body.classList.contains('sidebar-open') && window.innerWidth <= 768) {
            toggleSidebar(false);
        }
    });
}

function editCourse(id) {
    const courses = appData.semesters[appData.currentSemester] || [];
    const course = courses.find(c => String(c.id) === String(id));
    if (!course) return;

    currentEditingId = course.id;
    document.getElementById('sidebarTitle').innerText = '編輯課程';
    document.getElementById('btnSubmit').innerText = '儲存修改';
    
    const btnCancel = document.getElementById('btnCancelEdit');
    if (btnCancel) btnCancel.style.display = 'block';

    document.getElementById('courseName').value = course.name || '';
    document.getElementById('courseTeacher').value = course.teacher || '';
    document.getElementById('courseRoom').value = course.room || '';
    document.getElementById('courseCredits').value = course.credits !== undefined ? course.credits : 3;
    document.getElementById('courseType').value = course.type || '系定必修';
    document.getElementById('courseUrl').value = course.url || '';
    document.getElementById('courseNotes').value = course.notes || '';
    document.getElementById('courseTentative').checked = !!course.isTentative;

    // 處理無固定時間開關
    const isNoSched = !!course.isNoSchedule || (!course.slots || course.slots.length === 0);
    const noSchedCB = document.getElementById('courseNoSchedule');
    if (noSchedCB) {
        noSchedCB.checked = isNoSched;
        toggleNoScheduleInput(isNoSched);
    }

    setCourseFrequency(course.frequency || 'weekly');

    if (course.slots && course.slots.length > 0) {
        formSlotsState = course.slots.map((s, idx) => ({
            id: `slot_${idx}`,
            day: s.day,
            startPeriod: s.periods[0] || '1',
            endPeriod: s.periods[s.periods.length - 1] || s.periods[0] || '1'
        }));
    } else {
        formSlotsState = [{ id: 'slot_1', day: 1, startPeriod: '1', endPeriod: '2' }];
    }
    renderSlotItemsList();

    initColorPalette(course.color || '#2563eb');

    if (course.status === '已抵免') {
        document.getElementById('courseStatusMode').value = '已抵免';
    } else if (course.status === '已取得' || course.status === '未取得' || (course.score !== null && course.score !== undefined)) {
        document.getElementById('courseStatusMode').value = '已結算';
        document.getElementById('courseScore').value = course.score ?? 85;
    } else {
        document.getElementById('courseStatusMode').value = '修讀中';
    }
    toggleScoreInput();

    closeCourseDetail();
    toggleSidebar(true);
}

function cancelEdit() {
    currentEditingId = null;
    const form = document.getElementById('courseForm');
    if (form) form.reset();

    const titleEl = document.getElementById('sidebarTitle');
    if (titleEl) titleEl.innerText = '新增課程';

    const submitBtn = document.getElementById('btnSubmit');
    if (submitBtn) submitBtn.innerText = '加入課表';

    const cancelBtn = document.getElementById('btnCancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'none';

    const noSchedCB = document.getElementById('courseNoSchedule');
    if (noSchedCB) {
        noSchedCB.checked = false;
        toggleNoScheduleInput(false);
    }

    setCourseFrequency('weekly');

    formSlotsState = [{ id: 'slot_1', day: 1, startPeriod: '1', endPeriod: '2' }];
    renderSlotItemsList();
    initColorPalette('#2563eb');
    toggleScoreInput();
}

function openMobileEditor() {
    cancelEdit();
    toggleSidebar(true);
}

function closeSidebarDrawer() {
    toggleSidebar(false);
}

let currentViewingCourseId = null;

function showCourseDetail(id) {
    const courses = appData.semesters[appData.currentSemester] || [];
    const c = courses.find(item => String(item.id) === String(id));
    if (!c) return;

    currentViewingCourseId = c.id;
    const modal = document.getElementById('courseDetailModal');
    if (!modal) return;

    // 原生 innerText 賦值，安全防護
    document.getElementById('modalCourseName').innerText = c.name;
    document.getElementById('modalCourseColorBar').style.backgroundColor = c.color || '#2563eb';

    const baseSlotTexts = (c.slots && c.slots.length > 0)
        ? c.slots.map(s => `週${dayNames[s.day]} 第 ${s.periods.join(',')} 節`).join(' ｜ ')
        : '<span style="color:var(--tf-color-primary-light); font-weight:600;">非同步遠距 / 無固定時間</span>';

    let statusHeaderBadge = '';
    if (c.status === '已抵免') {
        statusHeaderBadge = `<div style="background:var(--tf-color-primary-subtle); border:1px solid var(--tf-color-primary-border); color:var(--tf-color-primary-light); font-size:0.75rem; font-weight:600; padding:4px 8px; border-radius:var(--tf-radius-sm); margin-bottom:6px;">已抵免課程（計入畢業學分，不計入 GPA）</div>`;
    } else if (c.isTentative) {
        statusHeaderBadge = `<div style="background:var(--tf-status-warning-bg); border:1px solid var(--tf-status-warning-border); color:var(--tf-status-warning-light); font-size:0.75rem; font-weight:bold; padding:4px 8px; border-radius:var(--tf-radius-sm); margin-bottom:4px;">此為暫定候補時段（不計入畢業學分）</div>`;
    }

    let scoreHtml = '';
    if (c.status === '已抵免') {
        scoreHtml = `
            <div class="detail-row">
                <span class="detail-label">結算成績：</span>
                <span class="detail-val" style="color:var(--tf-color-primary-light); font-weight:bold;">已抵免 (免計 GPA 分數)</span>
            </div>
        `;
    } else if ((c.status === '已取得' || c.status === '未取得') && c.score !== null) {
        const isPass = c.score >= 60;
        const colorStyle = isPass ? 'var(--tf-status-success-light)' : 'var(--tf-status-danger-light)';
        const passText = isPass ? '及格' : '不及格';
        scoreHtml = `
            <div class="detail-row">
                <span class="detail-label">結算成績：</span>
                <span class="detail-val" style="color:${colorStyle}; font-weight:bold;">${c.score} 分 (${getLetterGrade(c.score)} / GPA: ${getGradePoint(c.score)} - ${passText})</span>
            </div>
        `;
    }

    const safeUrl = sanitizeURL(c.url);
    let urlHtml = safeUrl ? `
    <div class="detail-row">
        <span class="detail-label">相關連結：</span>
        <button type="button" class="detail-url-btn" onclick="safeOpenExternalURL('${safeUrl}')" style="background:none; border:none; padding:0; font:inherit; color:var(--tf-color-primary-light); cursor:pointer; text-decoration:underline;">
            開啟課程網頁 ↗
        </button>
    </div>` : '';
    let notesHtml = c.notes ? `<div class="detail-notes-box">${escapeHTML(c.notes)}</div>` : '';

    const freqLabelMap = { 'weekly': '每週固定', 'odd': '單週', 'even': '雙週' };
    const freqText = freqLabelMap[c.frequency || 'weekly'] || '每週固定';

    const codeHtml = c.code ? `<div class="detail-row"><span class="detail-label">開課代碼：</span><span class="detail-val" style="font-family:var(--tf-font-mono);">${escapeHTML(c.code)}</span></div>` : '';

    document.getElementById('modalCourseContent').innerHTML = `
        ${statusHeaderBadge}
        <div class="detail-row"><span class="detail-label">課程類別：</span><span class="detail-badge">${escapeHTML(c.type)}</span> ｜ <span style="font-weight:bold;">${c.credits} 學分</span> ｜ <span style="color:var(--tf-color-primary-light); font-weight:bold; font-size:0.8rem;">${Icons.get('clock', { size: 12 })} ${freqText}</span></div>
        ${codeHtml}
        <div class="detail-row"><span class="detail-label">排定時間：</span><span class="detail-val">${baseSlotTexts}</span></div>
        <div class="detail-row"><span class="detail-label">上課教室：</span><span class="detail-val">${c.room ? Icons.get('location', { size: 12 }) + ' ' + escapeHTML(c.room) : '未填寫'}</span></div>
        <div class="detail-row"><span class="detail-label">授課教師：</span><span class="detail-val">${c.teacher ? Icons.get('user', { size: 12 }) + ' ' + escapeHTML(c.teacher) : '未填寫'}</span></div>
        ${scoreHtml}
        ${urlHtml}
        ${notesHtml}
    `;

    const moveBox = document.querySelector('.modal-move-semester-box');
    if (moveBox) moveBox.style.display = 'block';

    const moveSelect = document.getElementById('modalMoveSemSelect');
    if (moveSelect) {
        moveSelect.innerHTML = '';
        (appData.semesterOrder || []).forEach(sem => {
            if (sem !== appData.currentSemester) {
                const opt = document.createElement('option');
                opt.value = sem;
                opt.innerText = `${sem} 課表`;
                moveSelect.appendChild(opt);
            }
        });
    }

    const footer = document.querySelector('.course-detail-footer');
    if (footer) {
        let convertBtnHtml = '';
        if (c.isTentative) {
            convertBtnHtml = `<button type="button" class="tf-btn tf-btn-sm tf-btn-warning" id="btnModalConvert" onclick="convertTentativeToOfficial('${c.id}')">轉為正式課程</button>`;
        }

        footer.innerHTML = `
            ${convertBtnHtml}
            <button type="button" class="tf-btn tf-btn-sm tf-btn-secondary" id="btnModalEdit">編輯課程</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-danger" id="btnModalDelete">刪除</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" onclick="closeCourseDetail()">關閉</button>
        `;
        document.getElementById('btnModalEdit').onclick = () => editCourse(c.id);
        document.getElementById('btnModalDelete').onclick = () => deleteCourse(c.id);
    }

    ModalManager.open('courseDetailModal');
}

function convertTentativeToOfficial(id) {
    const curCourses = appData.semesters[appData.currentSemester] || [];
    const course = curCourses.find(c => String(c.id) === String(id));
    if (!course) return;

    course.isTentative = false;

    const otherTentatives = curCourses.filter(other => 
        String(other.id) !== String(id) && 
        other.isTentative && 
        (other.name.trim() === course.name.trim() || (course.code && other.code === course.code))
    );

    if (otherTentatives.length > 0) {
        if (confirm(`已將此時段轉為正式課程！\n\n是否一併清除本學期其他 ${otherTentatives.length} 個同名暫定候補時段？`)) {
            appData.semesters[appData.currentSemester] = curCourses.filter(c => !otherTentatives.some(ot => String(ot.id) === String(c.id)));
        }
    } else {
        alert(`已成功將「${course.name}」轉為正式課程！`);
    }

    saveData();
    closeCourseDetail();
    updateAppUI();
}

function handleMoveCourseSemester() {
    if (!currentViewingCourseId) return;
    const moveSelect = document.getElementById('modalMoveSemSelect');
    const targetSem = moveSelect ? moveSelect.value : null;
    if (!targetSem) return;

    const curCourses = appData.semesters[appData.currentSemester] || [];
    const courseIdx = curCourses.findIndex(c => String(c.id) === String(currentViewingCourseId));
    if (courseIdx === -1) return;

    const courseObj = curCourses[courseIdx];

    if (isCourseAlreadyInSemester(courseObj, targetSem)) {
        alert(`移動失敗！\n「${courseObj.name}」已經排在【${targetSem}】，無法重複排入。`);
        return;
    }

    curCourses.splice(courseIdx, 1);
    if (!appData.semesters[targetSem]) appData.semesters[targetSem] = [];
    appData.semesters[targetSem].push(courseObj);

    saveData();
    closeCourseDetail();
    updateAppUI();
    alert(`已成功將「${courseObj.name}」移至【${targetSem}】！`);
}

function closeCourseDetail() {
    ModalManager.close('courseDetailModal');
    currentViewingCourseId = null;
}

function deleteCourse(id) {
    if (confirm('確定要從此學期課表中刪除這門課程嗎？')) {
        appData.semesters[appData.currentSemester] = (appData.semesters[appData.currentSemester] || []).filter(c => String(c.id) !== String(id));
        saveData();
        closeCourseDetail();
        updateAppUI();
    }
}

if (typeof window !== 'undefined') {
    window.isCourseAlreadyInSemester = isCourseAlreadyInSemester;
    window.convertTentativeToOfficial = convertTentativeToOfficial;
    window.toggleNoScheduleInput = toggleNoScheduleInput;
}

window.addEventListener('DOMContentLoaded', () => {
    renderSlotItemsList();
    initColorPalette('#2563eb');
});