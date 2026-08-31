// ============================================================
// 🔍 TimeFlow Discover 模組 (TimeFlow v3.2 - Fixed)
// ============================================================

let currentTargetCourseToSemester = null;

// 🌟 強化：完整支援 Object 與 String 比對
function isCourseInWishlist(targetCourse) {
    if (!targetCourse || !appData.wishlist) return false;
    const targetCode = (typeof targetCourse === 'object' && targetCourse.code) ? targetCourse.code.trim().toUpperCase() : '';
    const targetName = typeof targetCourse === 'object' ? (targetCourse.name || '') : String(targetCourse);
    const normTargetName = targetName.replace(/\s+/g, '').toLowerCase();

    return appData.wishlist.some(w => {
        if (targetCode && w.code && w.code.trim().toUpperCase() === targetCode) {
            return true;
        }
        const normWName = (w.name || '').replace(/\s+/g, '').toLowerCase();
        return normWName === normTargetName && normTargetName !== '';
    });
}

function handleDiscoverSearch() {
    const keyword = (document.getElementById('discoverSearchInput').value || '').trim().toLowerCase();
    const typeFilter = document.getElementById('filterDiscoverType').value;
    const semFilter = document.getElementById('filterDiscoverSem').value;
    const creditFilter = document.getElementById('filterDiscoverCredits').value;

    const results = (typeof SAMPLE_COURSE_CATALOG !== 'undefined' ? SAMPLE_COURSE_CATALOG : []).filter(c => {
        if (keyword) {
            const matchName = c.name.toLowerCase().includes(keyword);
            const matchTeacher = (c.teacher || '').toLowerCase().includes(keyword);
            const matchCode = (c.code || '').toLowerCase().includes(keyword);
            const matchDept = (c.dept || '').toLowerCase().includes(keyword);
            if (!matchName && !matchTeacher && !matchCode && !matchDept) return false;
        }

        if (typeFilter !== 'all') {
            if (typeFilter === '通識') {
                if (!c.type.startsWith('通識') && c.type !== '融通' && c.type !== '第二外語-通識') return false;
            } else if (typeFilter === '國文/英文/踏溯/體育') {
                if (!['國文', '英文', '踏溯台南', '體育', '服務學習'].includes(c.type)) return false;
            } else if (typeFilter === '第二外語') {
                if (!c.type.startsWith('第二外語')) return false;
            } else if (c.type !== typeFilter) {
                return false;
            }
        }

        if (semFilter !== 'all') {
            if (c.semester !== '全年' && c.semester !== semFilter) return false;
        }

        if (creditFilter !== 'all') {
            const cr = parseFloat(c.credits) || 0;
            if (creditFilter === '4' && cr < 4) return false;
            if (creditFilter !== '4' && cr !== parseFloat(creditFilter)) return false;
        }

        return true;
    });

    renderDiscoverResults(results);
}

function clearDiscoverSearch() {
    document.getElementById('discoverSearchInput').value = '';
    handleDiscoverSearch();
}

function renderDiscoverResults(list) {
    const container = document.getElementById('discoverCourseList');
    const countBadge = document.getElementById('discoverResultCount');
    const wishBadge = document.getElementById('discoverWishlistCount');
    if (!container) return;

    if (countBadge) countBadge.innerText = `共 ${list.length} 門課程`;
    if (wishBadge) {
        const wishCount = (appData.wishlist || []).length;
        wishBadge.innerHTML = `${Icons.get('star', { size: 12 })} 已候選 ${wishCount} 門`;
    }

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="tf-empty-state-box">
                <div class="tf-empty-icon-wrap">${Icons.get('search', { size: 32 })}</div>
                <div class="tf-empty-title">查無符合條件的課程</div>
                <div class="tf-empty-desc">請嘗試更換搜尋關鍵字，或放寬類別與學分篩選條件。</div>
            </div>
        `;
        return;
    }

    let tableRowsHtml = list.map(c => {
        const slotText = (c.slots || []).map(s => `(${dayNames[s.day]})${s.periods.join(',')}`).join(' ');
        const assessmentText = c.assessment || '-';
        const isWish = isCourseInWishlist(c);
        const wishBtnClass = isWish ? 'tf-btn tf-btn-sm btn-act-wish is-active' : 'tf-btn tf-btn-sm tf-btn-ghost btn-act-wish';
        const wishBtnText = isWish ? `${Icons.get('star', { size: 12 })} 已候選` : `${Icons.get('star', { size: 12 })} 候選`;

        const semDisplay = c.semester === '全年' ? '全年' : (c.semester ? `${c.semester}學期` : '');
        const deptBase = [c.dept, c.grade, semDisplay].filter(Boolean).join(' · ');
        const patternText = c.pattern ? `<span class="table-history-sub" title="歷年開課：${(c.history || []).join(', ')}">${c.pattern}</span>` : '';

        let prereqTagHtml = '';
        if (typeof PrerequisiteEngine !== 'undefined') {
            const rule = PrerequisiteEngine.getRule(c);
            if (rule && rule.required && rule.required.length > 0) {
                const reqNames = rule.required.map(r => r.name).join('、');
                prereqTagHtml = `<span style="font-size:0.68rem; color:var(--tf-text-muted); display:inline-flex; align-items:center; gap:2px; margin-top:2px;" title="${rule.description}">${Icons.get('info', { size: 11 })} 需先修：${reqNames}</span>`;
            }
        }

        return `
            <tr class="tf-table-row" onclick="handleTableRowClick(event, '${c.id}')">
                <td class="col-name">
                    <div class="table-course-name-wrap">
                        <span class="table-course-name">${c.name}</span>
                        <span class="table-course-code">${c.code || ''}</span>
                        <span class="l-type-badge">${c.type}</span>
                    </div>
                    ${prereqTagHtml}
                </td>
                <td class="col-dept">
                    <div class="table-dept-wrap">
                        <span>${deptBase || '-'}</span>
                        ${patternText}
                    </div>
                </td>
                <td class="col-credit"><b>${c.credits}</b></td>
                <td class="col-teacher">${c.teacher || '-'}</td>
                <td class="col-time">
                    <div class="table-time-wrap">
                        <span>${slotText || '未定'}</span>
                        ${c.room ? `<span class="table-room-sub">${c.room}</span>` : ''}
                    </div>
                </td>
                <td class="col-assess" title="${assessmentText}">${assessmentText}</td>
                <td class="col-actions" onclick="event.stopPropagation()">
                    <div class="table-action-btns">
                        <button type="button" class="${wishBtnClass}" onclick="addDiscoverToWishlist('${c.id}')">${wishBtnText}</button>
                        <button type="button" class="tf-btn tf-btn-sm tf-btn-primary btn-act-plan" onclick="openAddToSemesterModal('${c.id}')">${Icons.get('plus', { size: 12 })} 排入</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    let mobileListHtml = list.map(c => {
        const slotText = (c.slots || []).map(s => `(${dayNames[s.day]})${s.periods.join(',')}`).join(' ');
        // 🌟 修正：傳入完整物件 c 進行精準判斷
        const isWish = isCourseInWishlist(c);
        const wishBtnClass = isWish ? 'tf-btn tf-btn-sm btn-act-wish is-active' : 'tf-btn tf-btn-sm tf-btn-secondary';
        const wishBtnText = isWish ? `${Icons.get('star', { size: 12 })} 已候選` : `${Icons.get('star', { size: 12 })} 候選`;
        
        const semDisplay = c.semester === '全年' ? '全年' : (c.semester ? `${c.semester}學期` : '');
        const metaText = [c.dept, c.grade, semDisplay].filter(Boolean).join(' · ');

        let mobilePrereqHtml = '';
        if (typeof PrerequisiteEngine !== 'undefined') {
            const rule = PrerequisiteEngine.getRule(c);
            if (rule && rule.required && rule.required.length > 0) {
                const reqNames = rule.required.map(r => r.name).join('、');
                mobilePrereqHtml = ` · <span style="color:var(--tf-text-muted);">需先修：${reqNames}</span>`;
            }
        }

        return `
            <div class="tf-discover-mobile-row" onclick="showDiscoverDetail('${c.id}')">
                <div class="m-row-top">
                    <div class="m-row-title-wrap">
                        <span class="m-row-title">${c.name}</span>
                        <span class="l-type-badge">${c.type}</span>
                    </div>
                </div>
                <div class="m-row-meta">
                    <span>${metaText}</span> · 
                    <span><b>${c.credits}</b> 學分</span> · 
                    <span>${c.teacher || '教師未定'}</span>
                    ${c.pattern ? ` · <span style="color:var(--tf-text-muted);">${c.pattern}</span>` : ''}
                    ${mobilePrereqHtml}
                </div>
                <div class="m-row-time">
                    <span>${Icons.get('clock', { size: 11 })} ${slotText || '時段未定'}</span>
                    ${c.room ? `<span> · ${Icons.get('location', { size: 11 })} ${c.room}</span>` : ''}
                </div>
                <div class="m-row-actions" onclick="event.stopPropagation()">
                    <button type="button" class="${wishBtnClass}" onclick="addDiscoverToWishlist('${c.id}')">${wishBtnText}</button>
                    <button type="button" class="tf-btn tf-btn-sm tf-btn-primary" onclick="openAddToSemesterModal('${c.id}')">${Icons.get('plus', { size: 12 })} 排入規劃</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="tf-table-responsive-wrapper">
            <table class="tf-data-table">
                <thead>
                    <tr>
                        <th class="col-name">課程名稱</th>
                        <th class="col-dept">系所 / 年級 / 學期</th>
                        <th class="col-credit">學分</th>
                        <th class="col-teacher">教師</th>
                        <th class="col-time">時間 / 教室</th>
                        <th class="col-assess">主要評量</th>
                        <th class="col-actions">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>
        </div>
        <div class="tf-discover-mobile-list">
            ${mobileListHtml}
        </div>
    `;
}

function handleTableRowClick(e, catalogId) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    showDiscoverDetail(catalogId);
}

function showDiscoverDetail(catalogId) {
    const c = SAMPLE_COURSE_CATALOG.find(item => item.id === catalogId);
    if (!c) return;

    const modal = document.getElementById('courseDetailModal');
    if (!modal) return;

    document.getElementById('modalCourseName').innerText = c.name;
    document.getElementById('modalCourseColorBar').style.backgroundColor = '#7c3aed';

    const baseSlotTexts = (c.slots || []).map(s => `週${dayNames[s.day]} 第 ${s.periods.join(',')} 節`).join(' ｜ ');
    const syllabusUrl = c.syllabusUrl || 'https://course.ncku.edu.tw/index.php?c=qry_all';
    const isWish = isCourseInWishlist(c);
    const semDisplay = c.semester === '全年' ? '全年開課' : (c.semester ? `${c.semester}學期開課` : '');

    const historyPills = (c.history || []).map(h => `<span class="detail-badge" style="background:var(--tf-surface-sunken); border:1px solid var(--tf-border-default);">${h}</span>`).join(' ');
    const historyHtml = c.history && c.history.length > 0 ? `
        <div class="detail-row">
            <span class="detail-label">歷年開課：</span>
            <div class="detail-val" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                ${historyPills}
                <span style="font-size:0.75rem; color:var(--tf-color-primary-light); font-weight:500;">(${c.pattern || '常態開課'})</span>
            </div>
        </div>
    ` : '';

    let prereqHtml = '';
    if (typeof PrerequisiteEngine !== 'undefined') {
        const pRes = PrerequisiteEngine.check(c, appData.currentSemester, appData.semesters, appData.semesterOrder);
        if (pRes.hasPrerequisite) {
            let badgeClass = pRes.overallStatus === 'passed' ? 'tf-badge-success' : (pRes.overallStatus === 'planned' ? 'tf-badge-warning' : (pRes.overallStatus === 'blocked' ? 'tf-badge-danger' : 'tf-badge-neutral'));
            let statusTagText = pRes.overallStatus === 'passed' ? '已符合' : (pRes.overallStatus === 'planned' ? '預計符合' : (pRes.overallStatus === 'blocked' ? '不符合' : '未明'));
            
            prereqHtml = `
                <div style="background:var(--tf-surface-sunken); border:1px solid var(--tf-border-default); border-radius:var(--tf-radius-md); padding:8px 10px; margin-top:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:600; font-size:0.8rem; color:var(--tf-text-primary);">先修條件</span>
                        <span class="tf-badge ${badgeClass}">${statusTagText} (${appData.currentSemester}基準)</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--tf-text-muted); margin-top:3px;">${pRes.message}</div>
                </div>
            `;
        }
    }

    document.getElementById('modalCourseContent').innerHTML = `
        <div class="detail-row">
            <span class="detail-label">課程類別：</span>
            <span class="detail-badge">${c.type}</span> ｜ 
            <span style="font-weight:bold;">${c.credits} 學分</span> ｜ 
            <span style="color:var(--tf-text-secondary); font-size:0.8rem;">${[c.dept, c.grade, semDisplay].filter(Boolean).join(' · ')}</span>
        </div>
        <div class="detail-row"><span class="detail-label">開課代碼：</span><span class="detail-val">${c.code || '無代碼'}</span></div>
        <div class="detail-row"><span class="detail-label">授課教師：</span><span class="detail-val">${c.teacher ? c.teacher : '未填寫'}</span></div>
        <div class="detail-row"><span class="detail-label">上課時段：</span><span class="detail-val">${baseSlotTexts || '未指定'}</span></div>
        <div class="detail-row"><span class="detail-label">上課教室：</span><span class="detail-val">${c.room ? c.room : '未指定'}</span></div>
        <div class="detail-row"><span class="detail-label">評量方式：</span><span class="detail-val">${c.assessment || '依授課計畫'}</span></div>
        ${prereqHtml}
        ${historyHtml}
        <div class="detail-row" style="margin-top:4px;">
            <span class="detail-label">課程大綱：</span>
            <a href="${syllabusUrl}" target="_blank" rel="noopener noreferrer" class="tf-btn tf-btn-sm tf-btn-secondary detail-url-btn">
                ${Icons.get('info', { size: 13 })} 查看課程大綱 ↗
            </a>
        </div>
        ${c.notes ? `<div class="detail-notes-box">${c.notes}</div>` : ''}
    `;

    const moveBox = document.querySelector('.modal-move-semester-box');
    if (moveBox) moveBox.style.display = 'none';

    const wishBtnText = isWish ? '取消候選' : '存入候選庫';
    const wishBtnClass = isWish ? 'tf-btn tf-btn-sm btn-act-wish is-active' : 'tf-btn tf-btn-sm tf-btn-secondary';

    const footer = document.querySelector('.course-detail-footer');
    if (footer) {
        footer.innerHTML = `
            <button type="button" class="${wishBtnClass}" onclick="addDiscoverToWishlist('${c.id}'); showDiscoverDetail('${c.id}');">${Icons.get('star', { size: 12 })} ${wishBtnText}</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-primary" onclick="closeCourseDetail(); openAddToSemesterModal('${c.id}');">${Icons.get('plus', { size: 12 })} 排入規劃</button>
            <button type="button" class="tf-btn tf-btn-sm tf-btn-ghost" onclick="closeCourseDetail()">關閉</button>
        `;
    }

    ModalManager.open('courseDetailModal');
}

function addDiscoverToWishlist(catalogId) {
    const item = SAMPLE_COURSE_CATALOG.find(c => c.id === catalogId);
    if (!item) return;

    if (!appData.wishlist) appData.wishlist = [];
    
    const itemCode = (item.code || '').trim().toUpperCase();
    const existIdx = appData.wishlist.findIndex(w => {
        if (itemCode && w.code && w.code.trim().toUpperCase() === itemCode) {
            return true;
        }
        return w.name === item.name;
    });

    if (existIdx !== -1) {
        appData.wishlist.splice(existIdx, 1);
    } else {
        const wishItem = {
            id: Date.now(),
            code: item.code || '',
            name: item.name,
            credits: item.credits,
            type: item.type,
            teacher: item.teacher || '',
            room: item.room || '',
            color: '#7c3aed',
            textColor: '#ffffff',
            slots: item.slots || [],
            notes: item.notes || '',
            semester: appData.currentSemester,
            frequency: 'weekly',
            overrides: {}
        };
        appData.wishlist.push(wishItem);
    }

    saveData();
    handleDiscoverSearch();
    if (typeof renderWishlist === 'function') renderWishlist();
}

function openAddToSemesterModal(catalogId) {
    const item = SAMPLE_COURSE_CATALOG.find(c => c.id === catalogId);
    if (!item) return;

    currentTargetCourseToSemester = item;
    const select = document.getElementById('targetSemesterSelect');
    const info = document.getElementById('addToSemTargetInfo');

    info.innerText = `課程：${item.name} (${item.credits} 學分 · ${item.type})`;
    select.innerHTML = '';

    (appData.semesterOrder || ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"]).forEach(sem => {
        const opt = document.createElement('option');
        opt.value = sem;
        opt.innerText = `${sem} 課表`;
        if (sem === appData.currentSemester) opt.selected = true;
        select.appendChild(opt);
    });

    document.getElementById('btnConfirmAddToSem').onclick = confirmAddDiscoverToSemester;

    updateAddToSemesterPrereqPreview();

    ModalManager.open('addToSemesterModal');
}

function updateAddToSemesterPrereqPreview() {
    const alertBox = document.getElementById('addToSemPrereqAlert');
    const select = document.getElementById('targetSemesterSelect');
    if (!alertBox || !select || !currentTargetCourseToSemester) return;

    const targetSem = select.value;

    if (typeof PrerequisiteEngine === 'undefined') {
        alertBox.innerHTML = '';
        return;
    }

    const pRes = PrerequisiteEngine.check(currentTargetCourseToSemester, targetSem, appData.semesters, appData.semesterOrder);

    if (!pRes.hasPrerequisite) {
        alertBox.innerHTML = '';
        return;
    }

    let boxBg = 'var(--tf-surface-sunken)';
    let borderCol = 'var(--tf-border-default)';
    let badgeHtml = '';

    if (pRes.overallStatus === 'passed') {
        borderCol = 'var(--tf-status-success-border)';
        boxBg = 'var(--tf-status-success-bg)';
        badgeHtml = `<span class="tf-badge tf-badge-success">${Icons.get('check', { size: 12 })} 先修已符合</span>`;
    } else if (pRes.overallStatus === 'planned') {
        borderCol = 'var(--tf-status-warning-border)';
        boxBg = 'var(--tf-status-warning-bg)';
        badgeHtml = `<span class="tf-badge tf-badge-warning">${Icons.get('warning', { size: 12 })} 預計符合</span>`;
    } else if (pRes.overallStatus === 'blocked') {
        borderCol = 'var(--tf-status-danger-border)';
        boxBg = 'var(--tf-status-danger-bg)';
        badgeHtml = `<span class="tf-badge tf-badge-danger">${Icons.get('close', { size: 12 })} 先修不符合</span>`;
    } else {
        badgeHtml = `<span class="tf-badge tf-badge-neutral">先修待確認</span>`;
    }

    alertBox.innerHTML = `
        <div style="background:${boxBg}; border:1px solid ${borderCol}; border-radius:var(--tf-radius-md); padding:8px 10px; font-size:0.75rem; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; color:var(--tf-text-primary);">排入【${targetSem}】先修檢核</span>
                ${badgeHtml}
            </div>
            <div style="color:var(--tf-text-secondary); line-height:1.4;">${pRes.message}</div>
        </div>
    `;
}

function closeAddToSemesterModal() {
    ModalManager.close('addToSemesterModal');
    currentTargetCourseToSemester = null;
}

function confirmAddDiscoverToSemester() {
    if (!currentTargetCourseToSemester) return;
    const targetSem = document.getElementById('targetSemesterSelect').value;
    const item = currentTargetCourseToSemester;

    if (typeof isCourseAlreadyInSemester === 'function' && isCourseAlreadyInSemester(item, targetSem)) {
        alert(`⚠️ 課程已存在！\n「${item.name}」已經排在【${targetSem}】，無法重複排入。`);
        return;
    }

    const newCourse = {
        id: Date.now(),
        code: item.code || '',
        name: item.name,
        credits: item.credits,
        type: item.type,
        teacher: item.teacher || '',
        room: item.room || '',
        color: '#7c3aed',
        textColor: '#ffffff',
        isTentative: false,
        status: '修讀中',
        score: null,
        passed: true,
        slots: item.slots || [],
        recurring: true,
        frequency: 'weekly',
        overrides: {},
        notes: item.notes || ''
    };

    if (!appData.semesters[targetSem]) appData.semesters[targetSem] = [];
    appData.semesters[targetSem].push(newCourse);

    saveData();
    closeAddToSemesterModal();
    updateAppUI();
    alert(`已成功將「${item.name}」排入【${targetSem}】修課規劃！`);
}

window.addEventListener('DOMContentLoaded', () => {
    handleDiscoverSearch();
});