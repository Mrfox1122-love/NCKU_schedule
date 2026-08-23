// ============================================================
// 🌟 Wishlist 課程候選庫管理模組
// ============================================================

let currentWishlistFilter = 'current';

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
    const textColor = (typeof getContrastTextColor === 'function') ? getContrastTextColor(color) : '#ffffff';
    const notes = document.getElementById('courseNotes').value.trim();
    const frequency = document.getElementById('courseFrequency') ? document.getElementById('courseFrequency').value : 'weekly';

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
        textColor: textColor,
        slots: finalSlots,
        notes: notes,
        semester: appData.currentSemester,
        frequency: frequency,
        overrides: {}
    };

    if (!appData.wishlist) appData.wishlist = [];
    appData.wishlist.push(wishItem);
    saveData();
    cancelEdit();
    renderWishlist();
    alert('已成功加入課程候選庫！');
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
        container.innerHTML = `<div class="wishlist-empty" style="text-align:center; padding:18px 8px; color:var(--tf-text-muted); font-size:0.8rem;">尚無候選課程<br><span style="font-size:0.7rem; color:var(--tf-text-disabled);">可於表單點「存候選」保留多時段比較</span></div>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const slotText = (item.slots || []).map(s => `週${dayNames[s.day]} ${s.periods.join('-')}`).join('、');
        const semTag = item.semester || '通用';

        return `
            <div class="tf-wishlist-card" onclick="showWishlistDetail('${item.id}')" style="cursor:pointer;" title="點擊查看詳細資訊">
                <div class="wishlist-top-row">
                    <span class="wishlist-course-name">${item.name}</span>
                    <button type="button" class="btn-wishlist-add-mini" onclick="event.stopPropagation(); addWishlistToSchedule('${item.id}')">${Icons.get('plus', { size: 11 })} 排入課表</button>
                </div>
                <div class="wishlist-meta-text" style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                    ${item.teacher ? `<span>${item.teacher}</span> · ` : ''}
                    <span>${item.type}</span> · <b>${item.credits}學分</b>
                </div>
                <div class="wishlist-sub-row">
                    <span class="wishlist-time-badge">${semTag}${slotText ? `, ${slotText}` : ''}</span>
                    ${item.room ? `<span class="wishlist-room">${Icons.get('location', { size: 11 })} ${item.room}</span>` : ''}
                    <button type="button" class="btn-wishlist-del-icon" onclick="event.stopPropagation(); deleteWishlistItem('${item.id}')" title="移除候選">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function showWishlistDetail(id) {
    const list = appData.wishlist || [];
    const item = list.find(w => String(w.id) === String(id));
    if (!item) return;

    const modal = document.getElementById('courseDetailModal');
    if (!modal) return;

    document.getElementById('modalCourseName').innerText = item.name;
    document.getElementById('modalCourseColorBar').style.backgroundColor = item.color || '#2563eb';

    const baseSlotTexts = (item.slots || []).map(s => `週${dayNames[s.day]} 第 ${s.periods.join(',')} 節`).join(' ｜ ');

    const freqLabelMap = { 'weekly': '每週固定', 'odd': '單週', 'even': '雙週' };
    const freqText = freqLabelMap[item.frequency || 'weekly'] || '每週固定';

    document.getElementById('modalCourseContent').innerHTML = `
        <div class="detail-row"><span class="detail-label">課程類別：</span><span class="detail-badge">${item.type}</span> ｜ <span style="font-weight:bold;">${item.credits} 學分</span> ｜ <span style="color:var(--tf-color-primary-light); font-weight:bold; font-size:0.8rem;">${Icons.get('clock', { size: 12 })} ${freqText}</span></div>
        <div class="detail-row"><span class="detail-label">排定時間：</span><span class="detail-val">${baseSlotTexts || '未指定'}</span></div>
        <div class="detail-row"><span class="detail-label">上課教室：</span><span class="detail-val">${item.room ? Icons.get('location', { size: 12 }) + ' ' + item.room : '未填寫'}</span></div>
        <div class="detail-row"><span class="detail-label">授課教師：</span><span class="detail-val">${item.teacher ? Icons.get('user', { size: 12 }) + ' ' + item.teacher : '未填寫'}</span></div>
        ${item.notes ? `<div class="detail-notes-box">${item.notes}</div>` : ''}
    `;

    const moveBox = document.querySelector('.modal-move-semester-box');
    if (moveBox) moveBox.style.display = 'none';

    const footer = document.querySelector('.course-detail-footer');
    if (footer) {
        footer.innerHTML = `
            <button type="button" class="tf-btn tf-btn-sm tf-btn-danger" id="btnWishlistModalDelete">移除候選</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-primary" id="btnWishlistModalAdd">${Icons.get('plus', { size: 12 })} 排入課表</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" onclick="ModalManager.close('courseDetailModal')">關閉</button>
        `;

        document.getElementById('btnWishlistModalDelete').onclick = () => {
            deleteWishlistItem(item.id);
            ModalManager.close('courseDetailModal');
        };

        document.getElementById('btnWishlistModalAdd').onclick = () => {
            addWishlistToSchedule(item.id);
        };
    }

    ModalManager.open('courseDetailModal');
}

function setWishlistFilter(mode) {
    currentWishlistFilter = mode;
    const btnCurrent = document.getElementById('btnFilterCurrent');
    const btnAll = document.getElementById('btnFilterAll');
    if (btnCurrent) btnCurrent.classList.toggle('active', mode === 'current');
    if (btnAll) btnAll.classList.toggle('active', mode === 'all');
    renderWishlist();
}

function addWishlistToSchedule(id) {
    const list = appData.wishlist || [];
    const idx = list.findIndex(w => String(w.id) === String(id));
    if (idx === -1) {
        alert('找不到該候選課程！');
        return;
    }

    const item = list[idx];
    const targetSem = appData.currentSemester;

    if (typeof isCourseAlreadyInSemester === 'function' && isCourseAlreadyInSemester(item, targetSem)) {
        alert(`⚠️ 課程已存在！\n「${item.name}」已經排在【${targetSem}】，無法重複排入。`);
        return;
    }

    const newCourse = {
        ...item,
        code: item.code || '',
        id: Date.now(),
        status: '修讀中',
        score: null,
        passed: true,
        isTentative: false,
        recurring: true,
        frequency: item.frequency || 'weekly',
        overrides: {}
    };

    if (!appData.semesters[targetSem]) {
        appData.semesters[targetSem] = [];
    }
    appData.semesters[targetSem].push(newCourse);
    appData.wishlist.splice(idx, 1);

    saveData();
    updateAppUI();

    if (typeof ModalManager !== 'undefined') {
        ModalManager.close('courseDetailModal');
    }

    alert(`🎉 已成功將「${item.name}」排入【${targetSem}】課表！`);
}

function deleteWishlistItem(id) {
    if (confirm('確定要從候選庫移除此課程嗎？')) {
        appData.wishlist = (appData.wishlist || []).filter(w => String(w.id) !== String(id));
        saveData();
        renderWishlist();
        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('courseDetailModal');
        }
    }
}

if (typeof window !== 'undefined') {
    window.addWishlistToSchedule = addWishlistToSchedule;
    window.deleteWishlistItem = deleteWishlistItem;
    window.showWishlistDetail = showWishlistDetail;
}