// ============================================================
// 📚 Course 現代化課程管理模組 (Modern Card Editor)
// ============================================================

let currentEditingId = null;
let currentWishlistFilter = 'current';

// 現代精選調色盤
const PRESET_COLORS = [
    '#2563eb', '#3b82f6', '#0284c7', '#06b6d4', '#10b981',
    '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899',
    '#8b5cf6', '#6366f1', '#475569', '#0f172a'
];

// 當前表單中的時段資料列表
let formSlotsState = [
    { id: 'slot_1', day: 1, startPeriod: '1', endPeriod: '2' }
];

// 初始化調色盤
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

    document.getElementById('courseColor').value = selectedHex;
    if (typeof getContrastTextColor === 'function') {
        document.getElementById('courseTextColor').value = getContrastTextColor(selectedHex);
    }
}

function selectCourseColor(hex) {
    document.getElementById('courseColor').value = hex;
    if (typeof getContrastTextColor === 'function') {
        document.getElementById('courseTextColor').value = getContrastTextColor(hex);
    }
    initColorPalette(hex);
}

// 展開 / 收合進階設定
function toggleEditorAdvanced() {
    const container = document.querySelector('.editor-accordion-container');
    if (container) {
        container.classList.toggle('open');
    }
}

// 🌟 渲染時段卡片清單
function renderSlotItemsList() {
    const list = document.getElementById('slotItemsList');
    if (!list) return;
    list.innerHTML = '';

    const activeDays = (typeof getActiveDays === 'function') ? getActiveDays() : [1,2,3,4,5];
    const activeSlots = (typeof getActiveTimeSlots === 'function') ? getActiveTimeSlots() : [];
    const pKeys = activeSlots.map(s => String(s.period));

    formSlotsState.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'slot-item-card';

        // 刪除按鈕 (時段數 > 1 時顯示)
        const delBtnHtml = formSlotsState.length > 1 
            ? `<button type="button" class="btn-del-slot-card" onclick="removeSlotItem(${index})" title="刪除此時段">✕</button>` 
            : '';

        // 星期膠囊按鈕
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

        // 節次選項 (起 ~ 訖)
        let startOptions = '';
        let endOptions = '';
        activeSlots.forEach(slot => {
            startOptions += `<option value="${slot.period}" ${String(item.startPeriod) === String(slot.period) ? 'selected' : ''}>第 ${slot.period} 節 (${slot.time.split('~')[0]})</option>`;
            endOptions += `<option value="${slot.period}" ${String(item.endPeriod) === String(slot.period) ? 'selected' : ''}>第 ${slot.period} 節 (${slot.time.split('~')[1]})</option>`;
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

// 根據起訖節次計算期間的所有節次陣列
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

// 📝 提交課程表單
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
        const textColor = document.getElementById('courseTextColor').value || '#ffffff';
        const isTentative = document.getElementById('courseTentative').checked;
        const url = document.getElementById('courseUrl').value.trim();
        const notes = document.getElementById('courseNotes').value.trim();
        const statusMode = document.getElementById('courseStatusMode').value;
        const score = statusMode === '已結算' ? parseFloat(document.getElementById('courseScore').value) : null;
        const reminderEnabled = document.getElementById('courseReminderEnabled').checked;
        const reminderOffset = parseInt(document.getElementById('courseReminderOffset').value, 10) || 30;

        // 組裝 slots 陣列
        const finalSlots = formSlotsState.map(item => ({
            day: item.day,
            periods: expandPeriods(item.startPeriod, item.endPeriod)
        }));

        const courseData = {
            id: currentEditingId || Date.now(),
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
            status: statusMode === '已結算' ? '已取得' : '修讀中',
            score: score,
            passed: statusMode === '已結算' ? (score >= 60) : true,
            slots: finalSlots,
            recurring: true,
            reminder: {
                enabled: reminderEnabled,
                offsetMinutes: reminderOffset,
                type: 'before_class'
            }
        };

        if (!appData.semesters[appData.currentSemester]) {
            appData.semesters[appData.currentSemester] = [];
        }

        if (currentEditingId) {
            const idx = appData.semesters[appData.currentSemester].findIndex(c => c.id === currentEditingId);
            if (idx !== -1) {
                appData.semesters[appData.currentSemester][idx] = courseData;
            }
        } else {
            appData.semesters[appData.currentSemester].push(courseData);
        }

        saveData();
        cancelEdit();
        updateAppUI();

        // 手機版提交後自動關閉抽屜
        if (document.body.classList.contains('sidebar-open') && window.innerWidth <= 768) {
            toggleSidebar(false);
        }
    });
}

// ✏️ 進入課程編輯狀態
function editCourse(id) {
    const courses = appData.semesters[appData.currentSemester] || [];
    const course = courses.find(c => c.id === id);
    if (!course) return;

    currentEditingId = id;
    document.getElementById('sidebarTitle').innerText = '✏️ 編輯課程';
    document.getElementById('btnSubmit').innerText = '💾 儲存修改';
    document.getElementById('btnCancelEdit').style.display = 'block';

    document.getElementById('courseName').value = course.name;
    document.getElementById('courseTeacher').value = course.teacher || '';
    document.getElementById('courseRoom').value = course.room || '';
    document.getElementById('courseCredits').value = course.credits;
    document.getElementById('courseType').value = course.type;
    document.getElementById('courseUrl').value = course.url || '';
    document.getElementById('courseNotes').value = course.notes || '';
    document.getElementById('courseTentative').checked = !!course.isTentative;

    // 時段還原
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

    // 顏色還原
    initColorPalette(course.color || '#2563eb');

    // 成績還原
    if (course.status === '已結算' || course.score !== null) {
        document.getElementById('courseStatusMode').value = '已結算';
        document.getElementById('courseScore').value = course.score || 85;
    } else {
        document.getElementById('courseStatusMode').value = '修讀中';
    }
    toggleScoreInput();

    // 提醒還原
    document.getElementById('courseReminderEnabled').checked = !!(course.reminder && course.reminder.enabled);
    if (course.reminder && course.reminder.offsetMinutes) {
        document.getElementById('courseReminderOffset').value = String(course.reminder.offsetMinutes);
    }
    toggleReminderOffsetUI();

    // 開啟抽屜
    toggleSidebar(true);
}

// ❌ 取消編輯 / 重置表單
function cancelEdit() {
    currentEditingId = null;
    document.getElementById('courseForm').reset();
    document.getElementById('sidebarTitle').innerText = '➕ 新增課程';
    document.getElementById('btnSubmit').innerText = '🚀 加入課表';
    document.getElementById('btnCancelEdit').style.display = 'none';

    formSlotsState = [{ id: 'slot_1', day: 1, startPeriod: '1', endPeriod: '2' }];
    renderSlotItemsList();
    initColorPalette('#2563eb');
    toggleScoreInput();
    toggleReminderOffsetUI();
}

function openMobileEditor() {
    cancelEdit();
    toggleSidebar(true);
}

function closeSidebarDrawer() {
    toggleSidebar(false);
}

function toggleReminderOffsetUI() {
    const cb = document.getElementById('courseReminderEnabled');
    const wrap = document.getElementById('reminderOffsetWrapper');
    if (cb && wrap) {
        wrap.style.display = cb.checked ? 'block' : 'none';
    }
}

// 🔍 課程詳細彈窗
function showCourseDetail(id) {
    const courses = appData.semesters[appData.currentSemester] || [];
    const c = courses.find(item => item.id === id);
    if (!c) return;

    const modal = document.getElementById('courseDetailModal');
    document.getElementById('modalCourseName').innerText = c.name;
    document.getElementById('modalCourseColorBar').style.backgroundColor = c.color || '#2563eb';

    const slotTexts = (c.slots || []).map(s => `週${dayNames[s.day]} 第 ${s.periods.join(',')} 節`).join(' ｜ ');

    let scoreHtml = '';
    if (c.status === '已結算' && c.score !== null) {
        scoreHtml = `
            <div class="detail-row">
                <span class="detail-label">結算成績：</span>
                <span class="detail-val" style="color:#166534; font-weight:bold;">${c.score} 分 (${getLetterGrade(c.score)} / GPA: ${getGradePoint(c.score)})</span>
            </div>
        `;
    }

    let urlHtml = c.url ? `<div class="detail-row"><span class="detail-label">相關連結：</span><a href="${c.url}" target="_blank" class="detail-url-btn">🌐 開啟課程網頁</a></div>` : '';
    let notesHtml = c.notes ? `<div class="detail-notes-box">${c.notes}</div>` : '';

    document.getElementById('modalCourseContent').innerHTML = `
        <div class="detail-row"><span class="detail-label">課程類別：</span><span class="detail-badge">${c.type}</span> ｜ <span style="font-weight:bold;">${c.credits} 學分</span></div>
        <div class="detail-row"><span class="detail-label">授課時間：</span><span class="detail-val">${slotTexts || '未指定'}</span></div>
        <div class="detail-row"><span class="detail-label">上課教室：</span><span class="detail-val">${c.room ? '📍 ' + c.room : '未填寫'}</span></div>
        <div class="detail-row"><span class="detail-label">授課教師：</span><span class="detail-val">${c.teacher ? '👤 ' + c.teacher : '未填寫'}</span></div>
        ${scoreHtml}
        ${urlHtml}
        ${notesHtml}
    `;

    document.getElementById('btnModalEdit').onclick = () => { closeCourseDetail(); editCourse(c.id); };
    document.getElementById('btnModalDelete').onclick = () => { closeCourseDetail(); deleteCourse(c.id); };

    modal.classList.add('show');
}

function closeCourseDetail(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn') && !e.target.classList.contains('btn-detail-close')) return;
    const modal = document.getElementById('courseDetailModal');
    if (modal) modal.classList.remove('show');
}

function deleteCourse(id) {
    if (confirm('確定要從課表中刪除這門課程嗎？')) {
        appData.semesters[appData.currentSemester] = (appData.semesters[appData.currentSemester] || []).filter(c => c.id !== id);
        saveData();
        updateAppUI();
    }
}

// ⭐ 候選庫操作
function saveToWishlistFromForm() {
    const name = document.getElementById('courseName').value.trim();
    if (!name) {
        alert('請先填寫課程名稱再存入候選庫！');
        return;
    }

    const credits = parseFloat(document.getElementById('courseCredits').value) || 0;
    const type = document.getElementById('courseType').value;
    const teacher = document.getElementById('courseTeacher').value.trim();
    const room = document.getElementById('courseRoom').value.trim();
    const color = document.getElementById('courseColor').value || '#2563eb';
    const notes = document.getElementById('courseNotes').value.trim();

    const finalSlots = formSlotsState.map(item => ({
        day: item.day,
        periods: expandPeriods(item.startPeriod, item.endPeriod)
    }));

    const wishItem = {
        id: Date.now(),
        name: name,
        credits: credits,
        type: type,
        teacher: teacher,
        room: room,
        color: color,
        textColor: '#ffffff',
        slots: finalSlots,
        notes: notes,
        semester: appData.currentSemester
    };

    if (!appData.wishlist) appData.wishlist = [];
    appData.wishlist.push(wishItem);
    saveData();
    cancelEdit();
    renderWishlist();
    alert('⭐ 已成功加入課程候選庫！');
}

function renderWishlist() {
    const container = document.getElementById('wishlistContainer');
    const countBadge = document.getElementById('wishlistCount');
    if (!container) return;

    let list = appData.wishlist || [];
    if (countBadge) countBadge.innerText = list.length;

    if (currentWishlistFilter === 'current') {
        list = list.filter(w => !w.semester || w.semester === appData.currentSemester);
    }

    if (list.length === 0) {
        container.innerHTML = `<div class="wishlist-empty">尚無候選課程，可填妥表單點選「存候選」保留比較</div>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const slotText = (item.slots || []).map(s => `週${dayNames[s.day]} 第${s.periods.join(',')}節`).join(' ');
        return `
            <div class="wishlist-card">
                <div class="wishlist-card-title">
                    <span>${item.name} (${item.credits}學分)</span>
                    <span class="wishlist-sem-tag">${item.semester || '通用'}</span>
                </div>
                <div class="wishlist-card-info">${item.type} ｜ ${slotText || '未排時段'}</div>
                <div class="wishlist-card-actions">
                    <button type="button" class="btn-wishlist-add" onclick="addWishlistToSchedule(${item.id})">➕ 加入課表</button>
                    <button type="button" class="btn-wishlist-del" onclick="deleteWishlistItem(${item.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function setWishlistFilter(mode) {
    currentWishlistFilter = mode;
    document.getElementById('btnFilterCurrent').classList.toggle('active', mode === 'current');
    document.getElementById('btnFilterAll').classList.toggle('active', mode === 'all');
    renderWishlist();
}

function addWishlistToSchedule(id) {
    const idx = (appData.wishlist || []).findIndex(w => w.id === id);
    if (idx === -1) return;
    const item = appData.wishlist[idx];

    const newCourse = {
        ...item,
        id: Date.now(),
        status: '修讀中',
        score: null,
        passed: true,
        isTentative: false,
        recurring: true
    };

    if (!appData.semesters[appData.currentSemester]) {
        appData.semesters[appData.currentSemester] = [];
    }
    appData.semesters[appData.currentSemester].push(newCourse);
    appData.wishlist.splice(idx, 1);
    saveData();
    updateAppUI();
}

function deleteWishlistItem(id) {
    if (confirm('確定要從候選庫移除此課程嗎？')) {
        appData.wishlist = (appData.wishlist || []).filter(w => w.id !== id);
        saveData();
        renderWishlist();
    }
}

// 頁面初次載入時初始化時段卡片與調色盤
window.addEventListener('DOMContentLoaded', () => {
    renderSlotItemsList();
    initColorPalette('#2563eb');
});