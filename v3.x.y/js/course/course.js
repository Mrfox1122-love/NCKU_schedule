// ============================================================
// 📚 Course 課程編輯與彈窗模組
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
    const coursesInSem = appData.semesters[semester] || [];
    return coursesInSem.some(existing => {
        if (course.id && existing.id && String(course.id) === String(existing.id)) {
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
                     onclick="setSlotItemDay(${index}, ${day})">
                    ${dayNames[day]}
                </div>
            `;
        });

        let startOptions = '';
        let endOptions = '';
        activeSlots.forEach(slot => {
            const timeParts = slot.time ? slot.time.split('~') : ['00:00', '00:00'];
            startOptions += `<option value="${slot.period}" ${String(item.startPeriod) === String(slot.period) ? 'selected' : ''}>第 ${slot.period} 節 (${timeParts[0]})</option>`;
            endOptions += `<option value="${slot.period}" ${String(item.endPeriod) === String(slot.period) ? 'selected' : ''}>第 ${slot.period} 節 (${timeParts[1]})</option>`;
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

function addNewSlotItem() {
    formSlotsState.push({
        id: `slot_${Date.now()}`,
        day: 1,
        startPeriod: '1',
        endPeriod: '2'
    });
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
        const url = document.getElementById('courseUrl').value.trim();
        const notes = document.getElementById('courseNotes').value.trim();
        const statusMode = document.getElementById('courseStatusMode').value;
        const rawScore = document.getElementById('courseScore').value;
        const score = statusMode === '已結算' ? parseFloat(rawScore) : null;
        const frequency = document.getElementById('courseFrequency') ? document.getElementById('courseFrequency').value : 'weekly';

        const isPassed = statusMode === '已結算' ? (score !== null && score >= 60) : true;
        const finalStatus = statusMode === '已結算' ? (isPassed ? '已取得' : '未取得') : '修讀中';

        const finalSlots = formSlotsState.map(item => ({
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
            url: url,
            notes: notes,
            status: finalStatus,
            score: score,
            passed: isPassed,
            slots: finalSlots,
            recurring: true,
            frequency: frequency,
            overrides: existingOverrides
        };

        if (isCourseAlreadyInSemester(courseData, appData.currentSemester)) {
            alert(`⚠️ 課程已存在！\n「${courseData.name}」已經排在【${appData.currentSemester}】，無法重複加入。`);
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

    if (course.status === '已取得' || course.status === '未取得' || (course.score !== null && course.score !== undefined)) {
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

    document.getElementById('modalCourseName').innerText = c.name;
    document.getElementById('modalCourseColorBar').style.backgroundColor = c.color || '#2563eb';

    const baseSlotTexts = (c.slots || []).map(s => `週${dayNames[s.day]} 第 ${s.periods.join(',')} 節`).join(' ｜ ');

    let scoreHtml = '';
    if ((c.status === '已取得' || c.status === '未取得') && c.score !== null) {
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

    let urlHtml = c.url ? `<div class="detail-row"><span class="detail-label">相關連結：</span><a href="${c.url}" target="_blank" class="detail-url-btn">開啟課程網頁 ↗</a></div>` : '';
    let notesHtml = c.notes ? `<div class="detail-notes-box">${c.notes}</div>` : '';

    const freqLabelMap = { 'weekly': '每週固定', 'odd': '單週', 'even': '雙週' };
    const freqText = freqLabelMap[c.frequency || 'weekly'] || '每週固定';

    const codeHtml = c.code ? `<div class="detail-row"><span class="detail-label">開課代碼：</span><span class="detail-val" style="font-family:var(--tf-font-mono);">${c.code}</span></div>` : '';

    document.getElementById('modalCourseContent').innerHTML = `
        <div class="detail-row"><span class="detail-label">課程類別：</span><span class="detail-badge">${c.type}</span> ｜ <span style="font-weight:bold;">${c.credits} 學分</span> ｜ <span style="color:var(--tf-color-primary-light); font-weight:bold; font-size:0.8rem;">${Icons.get('clock', { size: 12 })} ${freqText}</span></div>
        ${codeHtml}
        <div class="detail-row"><span class="detail-label">排定時間：</span><span class="detail-val">${baseSlotTexts || '未指定'}</span></div>
        <div class="detail-row"><span class="detail-label">上課教室：</span><span class="detail-val">${c.room ? Icons.get('location', { size: 12 }) + ' ' + c.room : '未填寫'}</span></div>
        <div class="detail-row"><span class="detail-label">授課教師：</span><span class="detail-val">${c.teacher ? Icons.get('user', { size: 12 }) + ' ' + c.teacher : '未填寫'}</span></div>
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
        footer.innerHTML = `
            <button type="button" class="tf-btn tf-btn-sm tf-btn-secondary" id="btnModalEdit">編輯課程</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-danger" id="btnModalDelete">刪除</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" onclick="closeCourseDetail()">關閉</button>
        `;
        document.getElementById('btnModalEdit').onclick = () => editCourse(c.id);
        document.getElementById('btnModalDelete').onclick = () => deleteCourse(c.id);
    }

    ModalManager.open('courseDetailModal');
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
        alert(`⚠️ 移動失敗！\n「${courseObj.name}」已經排在【${targetSem}】，無法重複排入。`);
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
}

window.addEventListener('DOMContentLoaded', () => {
    renderSlotItemsList();
    initColorPalette('#2563eb');
});