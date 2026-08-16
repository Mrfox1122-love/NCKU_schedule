let tempSlots = []; 
let editingCourseId = null; 
let wishlistFilterMode = 'current';

document.getElementById('btnAddSlot').addEventListener('click', () => { addCurrentSelectionToTemp(); });

function toggleReminderOffsetUI() {
    const cb = document.getElementById('courseReminderEnabled');
    const wrapper = document.getElementById('reminderOffsetWrapper');
    if (cb && wrapper) {
        wrapper.style.display = cb.checked ? 'block' : 'none';
    }
}

function addCurrentSelectionToTemp() {
    const day = parseInt(document.getElementById('courseDay').value);
    const selectedCheckboxes = document.querySelectorAll('.hidden-cb:checked');
    const selectedPeriods = Array.from(selectedCheckboxes).map(cb => String(cb.value));
    
    if (selectedPeriods.length === 0) {
        alert('請至少勾選一節課！');
        return false;
    }

    const existingSlot = tempSlots.find(s => s.day === day);
    if (existingSlot) {
        existingSlot.periods = [...new Set([...existingSlot.periods.map(String), ...selectedPeriods])].sort((a, b) => {
            return periodOrder.indexOf(String(a)) - periodOrder.indexOf(String(b));
        });
    } else {
        selectedPeriods.sort((a, b) => periodOrder.indexOf(String(a)) - periodOrder.indexOf(String(b)));
        tempSlots.push({ day, periods: selectedPeriods });
    }
    
    selectedCheckboxes.forEach(cb => cb.checked = false);
    renderTempSlots();
    return true;
}

function renderTempSlots() {
    const container = document.getElementById('slotContainer');
    container.innerHTML = '';
    tempSlots.sort((a,b) => a.day - b.day).forEach((slot, index) => {
        const tag = document.createElement('div');
        tag.className = 'slot-tag';
        tag.innerHTML = `週${dayNames[slot.day]} 第${slot.periods.join(',')}節 <span onclick="removeTempSlot(${index})">×</span>`;
        container.appendChild(tag);
    });
}

window.removeTempSlot = function(index) {
    tempSlots.splice(index, 1);
    renderTempSlots();
}

function startEdit(id) {
    const currentCourses = appData.semesters[appData.currentSemester] || [];
    const course = currentCourses.find(c => c.id === id);
    if (!course) return;

    editingCourseId = id;
    
    document.getElementById('sidebarPanel').className = 'sidebar editing-state';
    toggleSidebar(true);
    document.getElementById('sidebarTitle').innerText = '📝 編輯課程資訊';
    document.getElementById('btnSubmit').innerText = '💾 儲存修改';
    document.getElementById('btnCancelEdit').style.display = 'block';

    document.getElementById('courseName').value = course.name;
    document.getElementById('courseCredits').value = course.credits;
    document.getElementById('courseType').value = course.type;
    
    if (course.status === '修讀中') {
        document.getElementById('courseStatusMode').value = '修讀中';
        document.getElementById('courseScore').value = '85';
    } else {
        document.getElementById('courseStatusMode').value = '已結算';
        document.getElementById('courseScore').value = course.score !== undefined ? course.score : 80;
    }
    toggleScoreInput();
    
    // 🌟 回填新欄位
    document.getElementById('courseTeacher').value = course.teacher || '';
    document.getElementById('courseRoom').value = course.room || '';
    document.getElementById('courseUrl').value = course.url || '';
    document.getElementById('courseNotes').value = course.notes || '';
    
    const reminder = course.reminder || { enabled: false, offsetMinutes: 30 };
    document.getElementById('courseReminderEnabled').checked = !!reminder.enabled;
    document.getElementById('courseReminderOffset').value = String(reminder.offsetMinutes || 30);
    toggleReminderOffsetUI();

    document.getElementById('courseColor').value = course.color || '#2563eb';
    document.getElementById('courseTextColor').value = course.textColor || '#ffffff';
    document.getElementById('courseRecurring').checked = course.recurring !== false;
    document.getElementById('courseTentative').checked = course.isTentative === true;
    
    tempSlots = JSON.parse(JSON.stringify(course.slots || []));
    renderTempSlots();
    document.getElementById('sidebarPanel').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    editingCourseId = null;
    document.getElementById('sidebarPanel').className = 'sidebar';
    document.getElementById('sidebarTitle').innerText = '狐狸出品';
    document.getElementById('btnSubmit').innerText = '🚀 加入課表';
    document.getElementById('btnCancelEdit').style.display = 'none';

    document.getElementById('courseName').value = '';
    document.getElementById('courseCredits').value = '3';
    document.getElementById('courseType').value = '系定必修';
    document.getElementById('courseStatusMode').value = '修讀中'; 
    toggleScoreInput();
    
    // 🌟 清空新欄位
    document.getElementById('courseTeacher').value = '';
    document.getElementById('courseRoom').value = '';
    document.getElementById('courseUrl').value = '';
    document.getElementById('courseNotes').value = '';
    document.getElementById('courseReminderEnabled').checked = false;
    document.getElementById('courseReminderOffset').value = '30';
    toggleReminderOffsetUI();

    document.getElementById('courseColor').value = '#2563eb';
    document.getElementById('courseTextColor').value = '#ffffff';
    document.getElementById('courseTentative').checked = false;
    tempSlots = [];
    renderTempSlots();
}

function confirmTentativeCourse(id, courseName) {
    if(!confirm(`確定要將此時段選定為正式修讀嗎？\n(系統將會自動刪除其他同名為「${courseName}」的暫定排課)`)) return;
    
    const semCourses = appData.semesters[appData.currentSemester];
    const targetCourse = semCourses.find(c => c.id === id);
    if(targetCourse) targetCourse.isTentative = false;
    
    appData.semesters[appData.currentSemester] = semCourses.filter(c => {
        if (c.id !== id && c.name === courseName && c.isTentative) return false;
        return true;
    });
    
    saveData();
    updateAppUI();
}

function deleteCourse(id) {
    if(confirm('確定要刪除這堂課嗎？')) {
        if (id === editingCourseId) cancelEdit();
        appData.semesters[appData.currentSemester] = appData.semesters[appData.currentSemester].filter(c => c.id !== id);
        saveData();
        updateAppUI();
    }
}

function clearAll() {
    if(confirm('警告：這將會清空當前學期的所有資料！')) {
        cancelEdit();
        appData.semesters[appData.currentSemester] = [];
        saveData();
        updateAppUI();
    }
}

function setWishlistFilter(mode) {
    wishlistFilterMode = mode;
    const btnCur = document.getElementById('btnFilterCurrent');
    const btnAll = document.getElementById('btnFilterAll');
    if (btnCur && btnAll) {
        if (mode === 'current') {
            btnCur.classList.add('active');
            btnAll.classList.remove('active');
        } else {
            btnCur.classList.remove('active');
            btnAll.classList.add('active');
        }
    }
    renderWishlist();
}

function renderWishlist() {
    const container = document.getElementById('wishlistContainer');
    const countEl = document.getElementById('wishlistCount');
    if (!container || !countEl) return;

    const fullWishlist = appData.wishlist || [];
    const displayList = wishlistFilterMode === 'current'
        ? fullWishlist.filter(item => item.semester === appData.currentSemester || !item.semester)
        : fullWishlist;

    countEl.innerText = `${displayList.length}/${fullWishlist.length}`;

    if (displayList.length === 0) {
        container.innerHTML = wishlistFilterMode === 'current'
            ? `<div class="wishlist-empty">「${appData.currentSemester}」尚無候選課<br><span style="font-size:0.7rem; color:#b45309; cursor:pointer;" onclick="setWishlistFilter('all')">👉 點此查看其他學期全部收藏</span></div>`
            : `<div class="wishlist-empty">尚無任何候選課程，可填妥表單點選「存候選」保留比較</div>`;
        return;
    }

    container.innerHTML = '';
    displayList.forEach(item => {
        const slotText = (item.slots || []).map(s => `週${dayNames[s.day]} ${s.periods.join(',')}`).join(' ｜ ');
        const semBadge = item.semester ? `<span class="wishlist-sem-tag">${item.semester}</span>` : '';
        const roomTeacherInfo = (item.room || item.teacher) ? ` ｜ ${item.room} ${item.teacher}` : '';

        const card = document.createElement('div');
        card.className = 'wishlist-card';
        card.innerHTML = `
            <div class="wishlist-card-title">
                <span>${semBadge}${item.name}</span>
                <span style="color:var(--accent);">${item.credits}學分</span>
            </div>
            <div class="wishlist-card-info">
                <span>🏷️ ${item.type}${roomTeacherInfo} ｜ ⏰ ${slotText || '未定時段'}</span>
            </div>
            <div class="wishlist-card-actions">
                <button type="button" class="btn-wishlist-add" onclick="addWishlistToSchedule(${item.id})">➕ 排入 ${appData.currentSemester}</button>
                <button type="button" class="btn-wishlist-del" onclick="deleteWishlistItem(${item.id})">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function saveToWishlistFromForm() {
    const hasChecked = document.querySelectorAll('.hidden-cb:checked').length > 0;
    if (hasChecked) addCurrentSelectionToTemp();

    const name = document.getElementById('courseName').value.trim();
    if (!name) {
        alert('請先輸入課程名稱！');
        return;
    }

    const item = {
        id: Date.now(),
        name: name,
        credits: parseFloat(document.getElementById('courseCredits').value) || 0,
        type: document.getElementById('courseType').value,
        semester: appData.currentSemester,
        color: document.getElementById('courseColor').value,
        textColor: document.getElementById('courseTextColor').value,
        slots: JSON.parse(JSON.stringify(tempSlots)),
        recurring: document.getElementById('courseRecurring').checked,
        // 🌟 保存新欄位
        teacher: document.getElementById('courseTeacher').value.trim(),
        room: document.getElementById('courseRoom').value.trim(),
        url: document.getElementById('courseUrl').value.trim(),
        notes: document.getElementById('courseNotes').value.trim(),
        reminder: {
            enabled: document.getElementById('courseReminderEnabled').checked,
            offsetMinutes: parseInt(document.getElementById('courseReminderOffset').value) || 30,
            type: "before_class"
        }
    };

    if (!appData.wishlist) appData.wishlist = [];
    appData.wishlist.push(item);
    saveData();
    renderWishlist();

    cancelEdit();
    alert(`⭐ 已將「${name}」存入【${appData.currentSemester}】候選庫！`);
}

function addWishlistToSchedule(id) {
    const item = (appData.wishlist || []).find(w => w.id === id);
    if (!item) return;

    const newCourse = {
        id: Date.now(),
        name: item.name,
        credits: item.credits,
        type: item.type,
        status: '修讀中',
        score: null,
        passed: false,
        isTentative: false,
        slots: JSON.parse(JSON.stringify(item.slots || [])),
        color: item.color || '#2563eb',
        textColor: item.textColor || '#ffffff',
        recurring: item.recurring !== false,
        // 🌟 帶入新欄位
        teacher: item.teacher || "",
        room: item.room || "",
        url: item.url || "",
        notes: item.notes || "",
        reminder: item.reminder || { enabled: false, offsetMinutes: 30, type: "before_class" }
    };

    if (!appData.semesters[appData.currentSemester]) {
        appData.semesters[appData.currentSemester] = [];
    }

    appData.semesters[appData.currentSemester].push(newCourse);
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

// 表單提交
document.getElementById('courseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const hasChecked = document.querySelectorAll('.hidden-cb:checked').length > 0;
    if (hasChecked) addCurrentSelectionToTemp();

    if (tempSlots.length === 0) {
        alert('請至少鎖定一個上課時段！');
        return;
    }

    const mode = document.getElementById('courseStatusMode').value;
    let finalStatus = '修讀中';
    let finalScore = null;

    if (mode === '已結算') {
        finalScore = parseFloat(document.getElementById('courseScore').value);
        if (isNaN(finalScore) || finalScore < 0 || finalScore > 100) {
            alert('請輸入正確的 0~100 分數！');
            return;
        }
        finalStatus = finalScore >= 60 ? '已取得' : '未取得';
    }

    const isTentative = document.getElementById('courseTentative').checked;
    const currentCourses = appData.semesters[appData.currentSemester] || [];

    const teacher = document.getElementById('courseTeacher').value.trim();
    const room = document.getElementById('courseRoom').value.trim();
    const url = document.getElementById('courseUrl').value.trim();
    const notes = document.getElementById('courseNotes').value.trim();
    const reminder = {
        enabled: document.getElementById('courseReminderEnabled').checked,
        offsetMinutes: parseInt(document.getElementById('courseReminderOffset').value) || 30,
        type: "before_class"
    };

    if (editingCourseId !== null) {
        const courseIndex = currentCourses.findIndex(c => c.id === editingCourseId);
        if (courseIndex !== -1) {
            currentCourses[courseIndex].name = document.getElementById('courseName').value;
            currentCourses[courseIndex].credits = parseFloat(document.getElementById('courseCredits').value) || 0;
            currentCourses[courseIndex].type = document.getElementById('courseType').value;
            currentCourses[courseIndex].status = finalStatus;
            currentCourses[courseIndex].score = finalScore;
            currentCourses[courseIndex].passed = (finalStatus === '已取得'); 
            currentCourses[courseIndex].color = document.getElementById('courseColor').value;
            currentCourses[courseIndex].textColor = document.getElementById('courseTextColor').value;
            currentCourses[courseIndex].recurring = document.getElementById('courseRecurring').checked;
            currentCourses[courseIndex].isTentative = isTentative;
            currentCourses[courseIndex].slots = JSON.parse(JSON.stringify(tempSlots));
            // 🌟 更新新欄位
            currentCourses[courseIndex].teacher = teacher;
            currentCourses[courseIndex].room = room;
            currentCourses[courseIndex].url = url;
            currentCourses[courseIndex].notes = notes;
            currentCourses[courseIndex].reminder = reminder;
        }
        cancelEdit();
    } else {
        const newCourse = {
            id: Date.now(), 
            name: document.getElementById('courseName').value,
            credits: parseFloat(document.getElementById('courseCredits').value) || 0,
            type: document.getElementById('courseType').value,
            status: finalStatus,
            score: finalScore,
            passed: (finalStatus === '已取得'),
            isTentative: isTentative,
            slots: JSON.parse(JSON.stringify(tempSlots)), 
            color: document.getElementById('courseColor').value,
            textColor: document.getElementById('courseTextColor').value,
            recurring: document.getElementById('courseRecurring').checked,
            // 🌟 寫入新欄位
            teacher: teacher,
            room: room,
            url: url,
            notes: notes,
            reminder: reminder
        };
        currentCourses.push(newCourse);
        cancelEdit();
    }
    saveData();
    updateAppUI();
});

// 🔍 顯示課程詳細資訊 Modal
function showCourseDetail(id) {
    const currentCourses = appData.semesters[appData.currentSemester] || [];
    const course = currentCourses.find(c => c.id === id);
    if (!course) return;

    document.getElementById('modalCourseName').innerText = course.name;
    document.getElementById('modalCourseColorBar').style.backgroundColor = course.color || '#2563eb';

    const slotText = (course.slots || []).map(s => `週${dayNames[s.day]} 第 ${s.periods.join(', ')} 節`).join(' ｜ ');
    
    let safeUrl = '';
    if (course.url && /^https?:\/\//i.test(course.url.trim())) {
        safeUrl = course.url.trim();
    }

    let statusText = course.status === '已取得' 
        ? `✓ 已取得 (${course.score}分 · GP ${getGradePoint(course.score)})`
        : (course.status === '未取得' ? `✕ 不及格 (${course.score}分)` : '⏳ 修讀中 / 預排');

    let reminderText = (course.reminder && course.reminder.enabled) 
        ? `🔔 上課前 ${course.reminder.offsetMinutes || 30} 分鐘` 
        : '🔕 未啟用提醒';

    let contentHtml = `
        <div class="detail-row">
            <span class="detail-label">修業類別</span>
            <span class="detail-val">
                <span class="detail-badge">${course.type}</span>
                <span class="detail-badge" style="background:#eff6ff; color:#1d4ed8;">${course.credits} 學分</span>
                ${course.isTentative ? '<span class="detail-badge" style="background:#fef3c7; color:#b45309;">暫定時段</span>' : ''}
            </span>
        </div>
        <div class="detail-row">
            <span class="detail-label">上課時段</span>
            <span class="detail-val" style="font-weight:600; color:#0f172a;">⏰ ${slotText || '未定時段'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">教室 / 老師</span>
            <span class="detail-val">
                ${course.room ? `📍 <b>${course.room}</b>` : '<span style="color:#94a3b8;">未填教室</span>'}
                ${course.teacher ? ` ｜ 👤 <b>${course.teacher}</b>` : ''}
            </span>
        </div>
        <div class="detail-row">
            <span class="detail-label">成績狀態</span>
            <span class="detail-val">${statusText}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">提醒設定</span>
            <span class="detail-val" style="font-size:0.88rem; color:#475569;">${reminderText}</span>
        </div>
    `;

    if (safeUrl) {
        contentHtml += `
            <div class="detail-row">
                <span class="detail-label">課程連結</span>
                <span class="detail-val">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="detail-url-btn">🔗 開啟課程網址</a>
                </span>
            </div>
        `;
    }

    if (course.notes) {
        contentHtml += `
            <div class="detail-row" style="flex-direction:column; gap:4px;">
                <span class="detail-label">📝 備註事項：</span>
                <div class="detail-notes-box">${course.notes}</div>
            </div>
        `;
    }

    document.getElementById('modalCourseContent').innerHTML = contentHtml;

    // 🌟 動態生成彈窗底部的操作按鈕 (轉正 / 編輯 / 刪除 / 關閉)
    const footerEl = document.querySelector('.course-detail-footer');
    footerEl.innerHTML = '';

    if (course.isTentative) {
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.style.cssText = 'background:#10b981; color:white; border:none; padding:8px 14px; border-radius:6px; font-weight:bold; cursor:pointer; margin-right:auto;';
        confirmBtn.innerText = '✅ 確認轉正';
        confirmBtn.onclick = () => {
            closeCourseDetail();
            confirmTentativeCourse(course.id, course.name);
        };
        footerEl.appendChild(confirmBtn);
    }

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-detail-edit';
    editBtn.innerText = '✏️ 編輯課程';
    editBtn.onclick = () => {
        closeCourseDetail();
        startEdit(course.id);
    };
    footerEl.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-detail-del';
    delBtn.innerText = '🗑️ 刪除';
    delBtn.onclick = () => {
        closeCourseDetail();
        deleteCourse(course.id);
    };
    footerEl.appendChild(delBtn);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-detail-close';
    closeBtn.innerText = '關閉';
    closeBtn.onclick = closeCourseDetail;
    footerEl.appendChild(closeBtn);

    document.getElementById('courseDetailModal').classList.add('show');
}

function closeCourseDetail() {
    const modal = document.getElementById('courseDetailModal');
    if (modal) modal.classList.remove('show');
}