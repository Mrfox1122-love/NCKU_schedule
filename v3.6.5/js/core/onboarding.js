// ============================================================
// 👋 TimeFlow v3.6.5 — 新手引導 (onboarding.js)
// ------------------------------------------------------------
// 第一次使用（還沒有任何課程）時顯示：
//   1. 選學制 → 2. 選科系與入學學年 → 3. 一鍵排入必修 → 4. 完成，帶去看畢業進度
// 只自動顯示一次（appData.onboardingDone）；設定頁可以重新開啟。
// ============================================================

const onboardingState = { step: 'welcome', added: 0, requiredCount: null, loading: false, error: false };

function hasAnyPlannedCourse() {
    const sems = Object.values(appData.semesters || {});
    return sems.some(list => list && list.length > 0) || (appData.wishlist || []).length > 0;
}

function shouldShowOnboarding() {
    return appData.onboardingDone !== true && !hasAnyPlannedCourse();
}

function openOnboarding() {
    Object.assign(onboardingState, { step: 'welcome', added: 0, requiredCount: null, loading: false, error: false });
    // 開過一次就不再自動跳出（按 Esc 或點外面關掉也算）
    appData.onboardingDone = true;
    saveData();
    if (typeof closeSettingsModal === 'function' && document.getElementById('settingsModal')?.classList.contains('show')) {
        closeSettingsModal();
    }
    renderOnboarding();
    ModalManager.open('onboardingModal');
}

function closeOnboarding(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
    ModalManager.close('onboardingModal');
}

function onboardingStepDots(current) {
    const steps = ['welcome', 'dept', 'required', 'done'];
    const idx = steps.indexOf(current);
    return `<div class="onboarding-dots" aria-label="第 ${idx + 1} 步，共 ${steps.length} 步">${steps.map((_, i) =>
        `<span class="onboarding-dot${i === idx ? ' active' : (i < idx ? ' passed' : '')}"></span>`).join('')}</div>`;
}

function onboardingDeptOptions() {
    const current = appData.deptName || '';
    const catalog = typeof NCKU_DEPARTMENTS_CATALOG !== 'undefined' ? NCKU_DEPARTMENTS_CATALOG : [];
    let found = false;
    const groups = catalog.map(group => `<optgroup label="${escapeHTML(group.college)}">${group.depts.map(d => {
        const sel = d === current;
        if (sel) found = true;
        return `<option value="${escapeHTML(d)}"${sel ? ' selected' : ''}>${escapeHTML(d)}</option>`;
    }).join('')}</optgroup>`).join('');
    const custom = !found && current ? `<option value="${escapeHTML(current)}" selected>${escapeHTML(current)}</option>` : '';
    return custom + groups;
}

function onboardingYearOptions() {
    const source = document.getElementById('entryYearSelect');
    const current = String(appData.entryYear || '');
    const options = source ? [...source.options].map(o => [o.value, o.textContent]) : [['118', '114學年']];
    return options.map(([value, label]) => `<option value="${escapeHTML(value)}"${value === current ? ' selected' : ''}>${escapeHTML(label)}入學</option>`).join('');
}

function renderOnboarding() {
    const body = document.getElementById('onboardingBody');
    if (!body) return;
    const s = onboardingState;
    let html = '';

    if (s.step === 'welcome') {
        html = `
            <h3 class="onboarding-title">歡迎使用 TimeFlow 👋</h3>
            <p class="onboarding-text">花一分鐘設定好，就能幫你排好四年的必修，並隨時看到離畢業還差多少。</p>
            <ul class="onboarding-list">
                <li>📅 規劃每學期課表、檢查衝堂</li>
                <li>🎓 依你的科系與入學年檢核畢業學分</li>
                <li>🔍 從開課資料找課，一鍵排入課表</li>
            </ul>
            <p class="onboarding-text">你目前是：</p>
            <div class="onboarding-choice">
                <button type="button" class="tf-btn tf-btn-primary" data-onclick="onboardingChooseDegree('bachelor')">大學部</button>
                <button type="button" class="tf-btn tf-btn-ghost" data-onclick="onboardingChooseDegree('master')">研究所（碩／博）</button>
            </div>`;
    } else if (s.step === 'dept') {
        html = `
            <h3 class="onboarding-title">你的科系與入學學年</h3>
            <p class="onboarding-text">用來帶入畢業學分門檻與該屆的必修課程。之後可以在「畢業」頁的設定修改。</p>
            <label class="onboarding-field">
                <span>科系</span>
                <select id="onboardingDept" class="tf-select">${onboardingDeptOptions()}</select>
            </label>
            <label class="onboarding-field">
                <span>入學學年</span>
                <select id="onboardingYear" class="tf-select">${onboardingYearOptions()}</select>
            </label>
            <div class="onboarding-actions">
                <button type="button" class="tf-btn tf-btn-ghost" data-onclick="onboardingGo('welcome')">上一步</button>
                <button type="button" class="tf-btn tf-btn-primary" data-onclick="onboardingSaveDept()">下一步</button>
            </div>`;
    } else if (s.step === 'required') {
        const count = s.requiredCount;
        const status = s.loading ? '<p class="onboarding-text">正在載入課程資料…</p>'
            : s.error ? '<p class="onboarding-text">課程資料載入失敗，請確認網路連線，或先略過、之後到「畢業 → 課程地圖」再排。</p>'
            : count ? `<p class="onboarding-text">依 <b>${escapeHTML(appData.deptName)}</b> 的課程地圖，找到 <b>${count}</b> 門還沒排的必修。要幫你排進各自的建議學期嗎？</p>
                <p class="onboarding-hint">本學期的課用實際開課時段，其他學期依最近一年的時段預估；排完都可以再調整或刪除。</p>`
            : '<p class="onboarding-text">課程資料中找不到這個科系的必修課，可以之後從「找課」自己加入。</p>';
        html = `
            <h3 class="onboarding-title">把必修排進課表</h3>
            ${status}
            <div class="onboarding-actions">
                <button type="button" class="tf-btn tf-btn-ghost" data-onclick="onboardingGo('dept')">上一步</button>
                ${count ? `<button type="button" class="tf-btn tf-btn-ghost" data-onclick="onboardingGo('done')">先不用</button>` : ''}
                ${count ? `<button type="button" class="tf-btn tf-btn-primary" data-onclick="onboardingAddRequired()">幫我排入 ${count} 門必修</button>`
                    : (s.loading ? '' : `<button type="button" class="tf-btn tf-btn-primary" data-onclick="onboardingGo('done')">下一步</button>`)}
            </div>`;
    } else {
        const isMaster = typeof isMasterMode === 'function' && isMasterMode(appData);
        const summary = isMaster
            ? '研究所的所別、入學學年與修業年限，請在「畢業」頁上方的設定選擇，課程地圖會依所別列出必修。'
            : s.added
                ? `已把 <b>${s.added}</b> 門必修排進課表。${s.past ? `其中 ${s.past} 門在已經過去的學期，先標成「修讀中」，請到成績登記改成已取得並填上成績。` : '每學期的時段可以到規劃頁確認，有衝堂時再換班。'}`
                : '設定完成！';
        html = `
            <h3 class="onboarding-title">完成 🎉</h3>
            <p class="onboarding-text">${summary}</p>
            <ul class="onboarding-list">
                <li><b>規劃</b>：每學期的課表，點課程可以編輯或填成績</li>
                <li><b>畢業</b>：學分進度、課程地圖、GPA</li>
                <li><b>找課</b>：搜尋通識與選修，排入課表</li>
            </ul>
            <div class="onboarding-actions">
                <button type="button" class="tf-btn tf-btn-ghost" data-onclick="onboardingFinish('plan')">看課表</button>
                <button type="button" class="tf-btn tf-btn-primary" data-onclick="onboardingFinish('graduation')">看畢業進度</button>
            </div>`;
    }

    const skip = s.step !== 'done' ? `<button type="button" class="onboarding-skip" data-onclick="onboardingFinish('plan')">略過，我自己來</button>` : '';
    body.innerHTML = `${onboardingStepDots(s.step)}${html}${skip}`;
}

function onboardingGo(step) {
    onboardingState.step = step;
    renderOnboarding();
}

function onboardingChooseDegree(degree) {
    if (typeof setDegree === 'function') setDegree(degree);
    else appData.degree = degree;
    onboardingGo(degree === 'master' ? 'done' : 'dept');
}

function onboardingSaveDept() {
    const dept = document.getElementById('onboardingDept')?.value || appData.deptName;
    const year = parseInt(document.getElementById('onboardingYear')?.value, 10) || appData.entryYear;
    if (typeof applyDepartmentSettings === 'function') applyDepartmentSettings(dept, year);
    else Object.assign(appData, { deptName: dept, entryYear: year });
    saveData();
    if (typeof renderSemesterSelect === 'function') renderSemesterSelect();
    updateAppUI();

    Object.assign(onboardingState, { step: 'required', loading: true, error: false, requiredCount: null });
    renderOnboarding();
    loadCourseCatalog().then(() => {
        onboardingState.requiredCount = getUnscheduledRequiredCourses().length;
    }).catch(() => {
        onboardingState.error = true;
    }).finally(() => {
        onboardingState.loading = false;
        if (onboardingState.step === 'required') renderOnboarding();
    });
}

function onboardingAddRequired() {
    onboardingState.past = 0;
    onboardingState.added = addAllRequiredToPlan({
        skipConfirm: true,
        silent: true,
        onAdded: result => { onboardingState.past = result.past; },
        onUndo: () => {
            onboardingState.added = 0;
            if (document.getElementById('onboardingModal')?.classList.contains('show')) renderOnboarding();
        }
    }) || 0;
    onboardingGo('done');
}

function onboardingFinish(view) {
    ModalManager.close('onboardingModal');
    if (typeof switchView === 'function') switchView(view === 'graduation' ? 'graduation' : 'plan');
}

if (typeof window !== 'undefined') {
    window.openOnboarding = openOnboarding;
    window.closeOnboarding = closeOnboarding;
    window.addEventListener('DOMContentLoaded', () => {
        // 等 app.js 完成初始畫面後再顯示
        setTimeout(() => { if (shouldShowOnboarding()) openOnboarding(); }, 0);
    });
}
