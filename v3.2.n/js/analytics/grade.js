// ============================================================
// 📊 TimeFlow v3.2 — 成績等第運算與學期快速結算模組 (grade.js)
// ============================================================

/**
 * 成功大學標準百分制轉等第績點 (GPA 4.3 制)
 */
function getGradePoint(score) {
    if (score >= 90) return 4.3;
    if (score >= 85) return 4.0;
    if (score >= 80) return 3.7;
    if (score >= 77) return 3.3;
    if (score >= 73) return 3.0;
    if (score >= 70) return 2.7;
    if (score >= 67) return 2.3;
    if (score >= 63) return 2.0;
    if (score >= 60) return 1.7;
    return 0.0;
}

/**
 * 成功大學標準百分制轉等第代碼
 */
function getLetterGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 77) return 'B+';
    if (score >= 73) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 67) return 'C+';
    if (score >= 63) return 'C';
    if (score >= 60) return 'C-';
    return 'F';
}

/**
 * 課程編輯器內「修讀中 / 已結算 / 已抵免」狀態切換
 */
function toggleScoreInput() {
    const mode = document.getElementById('courseStatusMode')?.value;
    const group = document.getElementById('scoreInputGroup');
    if (!group) return;

    if (mode === '已結算') {
        group.style.display = 'block';
        previewGrade();
    } else {
        group.style.display = 'none';
    }
}

/**
 * 課程編輯器單科成績即時預覽
 */
function previewGrade() {
    const previewEl = document.getElementById('gradePreview');
    const scoreInput = document.getElementById('courseScore');
    if (!previewEl || !scoreInput) return;

    const score = parseFloat(scoreInput.value);
    if (isNaN(score) || score < 0 || score > 100) {
        previewEl.innerText = "請輸入 0~100 分數";
        return;
    }
    const letter = getLetterGrade(score);
    const gp = getGradePoint(score);
    const passStatus = score >= 60 ? '及格' : '不及格';
    previewEl.innerText = `等第: ${letter} ｜ 績點: ${gp} (${passStatus})`;
}

// ============================================================
// 📊 學期成績批次結算模組 (Batch Grade Settlement Engine)
// ============================================================

let currentBatchGradeCache = [];

/**
 * 等第績點動態 Badge 生成輔助函式
 */
function formatBatchGradeBadge(scoreVal, status) {
    if (status === '已抵免') {
        return `<span class="batch-gp-badge gp-muted" style="color:var(--tf-color-primary-light); font-weight:600;">已抵免 (不計GPA)</span>`;
    }

    if (scoreVal === '' || scoreVal === null || isNaN(parseFloat(scoreVal))) {
        return `<span class="batch-gp-badge gp-muted">修讀中</span>`;
    }

    const score = parseFloat(scoreVal);
    const gp = getGradePoint(score);
    const letter = getLetterGrade(score);

    let statusClass = 'gp-success';
    if (score < 60) {
        statusClass = 'gp-danger';
    } else if (score < 75) {
        statusClass = 'gp-warning';
    }

    return `<span class="batch-gp-badge ${statusClass}">${letter} ｜ ${gp.toFixed(1)}</span>`;
}

/**
 * 開啟學期快速結算彈窗
 */
function openBatchGradeModal() {
    const sem = appData.currentSemester || '一上';
    const courses = (appData.semesters[sem] || []).filter(c => !c.isTentative);

    if (courses.length === 0) {
        alert(`【${sem}】目前課表內尚無任何正式課程，無法結算成績！`);
        return;
    }

    const titleEl = document.getElementById('batchGradeSubTitle');
    if (titleEl) {
        titleEl.innerText = `結算學期：【${sem}】（共 ${courses.length} 門課程）`;
    }

    // 建立快取資料
    currentBatchGradeCache = courses.map(c => ({
        id: c.id,
        name: c.name,
        credits: c.credits,
        type: c.type || '系定必修',
        color: c.color || 'var(--tf-color-primary)',
        status: c.status,
        score: (c.status === '已抵免') ? '' : ((c.score !== null && c.score !== undefined && c.status !== '修讀中') ? String(c.score) : '')
    }));

    renderBatchGradeRows();
    updateBatchGradeLiveStats();

    const modal = document.getElementById('batchGradeModal');
    if (modal) {
        modal.classList.add('show');
    }
    if (typeof ModalManager !== 'undefined' && ModalManager.open) {
        ModalManager.open('batchGradeModal');
    }
}

/**
 * 關閉學期快速結算彈窗
 */
function closeBatchGradeModal(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) {
        return;
    }

    const modal = document.getElementById('batchGradeModal');
    if (modal) {
        modal.classList.remove('show');
    }
    if (typeof ModalManager !== 'undefined' && ModalManager.close) {
        ModalManager.close('batchGradeModal');
    }
    currentBatchGradeCache = [];
}

/**
 * 渲染結算清單
 */
function renderBatchGradeRows() {
    const container = document.getElementById('batchGradeListContainer');
    if (!container) return;

    if (currentBatchGradeCache.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--tf-text-muted); font-size:0.85rem;">本學期尚未排入任何課程</div>`;
        return;
    }

    container.innerHTML = currentBatchGradeCache.map((item, idx) => {
        const credNum = parseFloat(item.credits) || 0;
        const isWaived = (item.status === '已抵免');
        const credText = isWaived ? `${credNum} 學分 (已抵免)` : (credNum === 0 ? '0 學分 (不計績點)' : `${credNum} 學分`);
        const badgeHtml = formatBatchGradeBadge(item.score, item.status);

        const inputHtml = isWaived
            ? `<input type="text" class="batch-score-input" value="抵免" disabled style="opacity:0.6; cursor:not-allowed;">`
            : `<input type="number" class="batch-score-input" min="0" max="100" placeholder="未結算" 
                      value="${item.score}" 
                      oninput="handleBatchScoreInput(${idx}, this.value)">`;

        return `
            <div class="batch-grade-row-card" style="border-left-color: ${item.color} !important;">
                <div class="batch-course-info">
                    <span class="batch-course-name" title="${item.name}">${item.name}</span>
                    <div class="batch-course-meta-row">
                        <span class="batch-type-pill">${item.type}</span>
                        <span>${credText}</span>
                    </div>
                </div>
                <div class="batch-grade-controls">
                    ${inputHtml}
                    <div id="batchPreviewTag_${idx}">
                        ${badgeHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 單科分數即時輸入監聽
 */
function handleBatchScoreInput(index, val) {
    if (!currentBatchGradeCache[index]) return;

    const trimmedVal = val.trim();
    currentBatchGradeCache[index].score = trimmedVal;

    const tagEl = document.getElementById(`batchPreviewTag_${index}`);
    if (tagEl) {
        tagEl.innerHTML = formatBatchGradeBadge(trimmedVal, currentBatchGradeCache[index].status);
    }

    updateBatchGradeLiveStats();
}

/**
 * 快捷功能：全部填入 80 分（及格）
 */
function quickFillAllGrades(defaultScore = 80) {
    currentBatchGradeCache.forEach(item => {
        if (item.status !== '已抵免') {
            item.score = String(defaultScore);
        }
    });
    renderBatchGradeRows();
    updateBatchGradeLiveStats();
}

/**
 * 快捷功能：全部重設為修讀中
 */
function quickResetAllGrades() {
    currentBatchGradeCache.forEach(item => {
        if (item.status !== '已抵免') {
            item.score = '';
        }
    });
    renderBatchGradeRows();
    updateBatchGradeLiveStats();
}

/**
 * 即時計算彈窗底部學期 GPA 與加權統計（排除已抵免）
 */
function updateBatchGradeLiveStats() {
    const statsEl = document.getElementById('batchGradeLiveStats');
    if (!statsEl) return;

    let totalPoints = 0;
    let totalScoreWeighted = 0;
    let validCredits = 0;
    let totalCredits = 0;

    currentBatchGradeCache.forEach(item => {
        const cr = parseFloat(item.credits) || 0;
        totalCredits += cr;

        // 🌟 已抵免課程不納入 GPA 點數與分母計算
        if (item.status === '已抵免') {
            return;
        }

        if (item.score !== '' && !isNaN(parseFloat(item.score)) && cr > 0) {
            const scoreNum = Math.min(100, Math.max(0, parseFloat(item.score)));
            const gp = getGradePoint(scoreNum);
            totalPoints += gp * cr;
            totalScoreWeighted += scoreNum * cr;
            validCredits += cr;
        }
    });

    if (validCredits > 0) {
        const gpa = (totalPoints / validCredits).toFixed(2);
        const avg = (totalScoreWeighted / validCredits).toFixed(1);
        statsEl.innerHTML = `已算學分: <b>${validCredits}</b> / ${totalCredits} ｜ 學期 GPA: <b>${gpa}</b> ｜ 加權平均: <b>${avg} 分</b>`;
    } else {
        statsEl.innerHTML = `已算學分: <b>0</b> / ${totalCredits} ｜ 學期 GPA: <b>--</b> ｜ 加權平均: <b>--</b>`;
    }
}

/**
 * 儲存結算成績回全域資料庫
 */
function saveBatchGrades() {
    const sem = appData.currentSemester || '一上';
    const courses = appData.semesters[sem] || [];

    currentBatchGradeCache.forEach(cacheItem => {
        const target = courses.find(c => String(c.id) === String(cacheItem.id));
        if (target) {
            if (target.status === '已抵免') {
                target.score = null;
                target.passed = true;
                return;
            }

            if (cacheItem.score !== '' && !isNaN(parseFloat(cacheItem.score))) {
                const finalScore = Math.min(100, Math.max(0, parseFloat(cacheItem.score)));
                const isPass = finalScore >= 60;
                target.score = finalScore;
                target.passed = isPass;
                target.status = isPass ? '已取得' : '未取得';
            } else {
                target.score = null;
                target.passed = true;
                target.status = '修讀中';
            }
        }
    });

    saveData();
    closeBatchGradeModal();
    updateAppUI();
}

// 掛載至全域 Window 物件
if (typeof window !== 'undefined') {
    window.getGradePoint = getGradePoint;
    window.getLetterGrade = getLetterGrade;
    window.toggleScoreInput = toggleScoreInput;
    window.previewGrade = previewGrade;
    window.openBatchGradeModal = openBatchGradeModal;
    window.closeBatchGradeModal = closeBatchGradeModal;
    window.handleBatchScoreInput = handleBatchScoreInput;
    window.quickFillAllGrades = quickFillAllGrades;
    window.quickResetAllGrades = quickResetAllGrades;
    window.saveBatchGrades = saveBatchGrades;
}

// ============================================================
// 🙈 成績隱私模式控制器 (Privacy Mode)
// ============================================================

function togglePrivacyMode() {
    const isPrivate = document.body.classList.toggle('tf-privacy-mode');
    localStorage.setItem('timeflow_privacy_mode', isPrivate ? '1' : '0');
    updatePrivacyIcon(isPrivate);
}

function updatePrivacyIcon(isPrivate) {
    const iconEl = document.getElementById('privacyToggleBtn');
    if (iconEl) {
        iconEl.innerHTML = isPrivate 
            ? Icons.get('cancel', { size: 14 }) + ' 顯示成績' 
            : Icons.get('info', { size: 14 }) + ' 隱私模式';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedPrivate = localStorage.getItem('timeflow_privacy_mode') === '1';
    if (savedPrivate) {
        document.body.classList.add('tf-privacy-mode');
    }
    updatePrivacyIcon(savedPrivate);
});

// ============================================================
// 🎯 What-If 目標 GPA 倒推模擬演算法 (排除抵免)
// ============================================================

function openWhatIfModal() {
    const modal = document.getElementById('whatIfModal');
    if (!modal) return;

    let currentGpaCredits = 0;
    let currentGpaSum = 0;

    (appData.semesterOrder || []).forEach(sem => {
        (appData.semesters[sem] || []).forEach(c => {
            const cred = parseFloat(c.credits) || 0;
            if (!c.isTentative && c.status !== '已抵免' && (c.status === '已取得' || c.status === '未取得') && c.score !== null && cred > 0) {
                const gp = getGradePoint(c.score);
                currentGpaCredits += cred;
                currentGpaSum += (gp * cred);
            }
        });
    });

    const curGpa = currentGpaCredits > 0 ? (currentGpaSum / currentGpaCredits).toFixed(2) : '0.00';
    document.getElementById('whatIfCurCredits').innerText = `${currentGpaCredits} 學分`;
    document.getElementById('whatIfCurGpa').innerText = curGpa;

    const remainingCredits = Math.max(0, (appData.targetCredits || 128) - currentGpaCredits);
    document.getElementById('whatIfRemainCredits').value = remainingCredits;

    calculateWhatIfTarget();
    ModalManager.open('whatIfModal');
}

function calculateWhatIfTarget() {
    const targetGpa = parseFloat(document.getElementById('whatIfTargetGpaInput').value) || 3.8;
    const remainCredits = parseFloat(document.getElementById('whatIfRemainCredits').value) || 0;
    const resultBox = document.getElementById('whatIfResultBox');

    let currentCredits = 0;
    let currentGpaSum = 0;

    (appData.semesterOrder || []).forEach(sem => {
        (appData.semesters[sem] || []).forEach(c => {
            const cred = parseFloat(c.credits) || 0;
            if (!c.isTentative && c.status !== '已抵免' && (c.status === '已取得' || c.status === '未取得') && c.score !== null && cred > 0) {
                const gp = getGradePoint(c.score);
                currentCredits += cred;
                currentGpaSum += (gp * cred);
            }
        });
    });

    if (remainCredits <= 0) {
        resultBox.innerHTML = `<span style="color:var(--tf-text-muted);">剩餘學分為 0，無法進行未來模擬。</span>`;
        return;
    }

    const totalCredits = currentCredits + remainCredits;
    const totalGpaPointsNeeded = targetGpa * totalCredits;
    const neededGpaPointsInFuture = totalGpaPointsNeeded - currentGpaSum;
    const requiredAvgGpa = (neededGpaPointsInFuture / remainCredits);

    if (requiredAvgGpa > 4.3) {
        resultBox.innerHTML = `
            <div style="color:var(--tf-status-danger-light); font-weight:bold;">⚠️ 理論上無法達成</div>
            <div style="font-size:0.78rem; color:var(--tf-text-secondary); margin-top:2px;">剩餘學分全拿 A+ (4.3) 最高僅能達到 <b>${((currentGpaSum + remainCredits * 4.3) / totalCredits).toFixed(2)}</b></div>
        `;
    } else if (requiredAvgGpa <= 0) {
        resultBox.innerHTML = `
            <div style="color:var(--tf-status-success-light); font-weight:bold;">🎉 恭喜！目標已提前達成</div>
            <div style="font-size:0.78rem; color:var(--tf-text-secondary); margin-top:2px;">未來只要順利及格通過即可維持在 ${targetGpa} 以上。</div>
        `;
    } else {
        let letterGuide = 'A+ (90分以上)';
        if (requiredAvgGpa <= 1.7) letterGuide = 'C- (60分及格)';
        else if (requiredAvgGpa <= 2.0) letterGuide = 'C (63~66分)';
        else if (requiredAvgGpa <= 2.7) letterGuide = 'B- (70~72分)';
        else if (requiredAvgGpa <= 3.3) letterGuide = 'B+ (77~79分)';
        else if (requiredAvgGpa <= 3.7) letterGuide = 'A- (80~84分)';
        else if (requiredAvgGpa <= 4.0) letterGuide = 'A (85~89分)';

        resultBox.innerHTML = `
            <div style="color:var(--tf-color-primary-light); font-size:1.1rem; font-weight:bold;">平均需達 GPA: ${requiredAvgGpa.toFixed(2)}</div>
            <div style="font-size:0.78rem; color:var(--tf-text-secondary); margin-top:3px;">未來每門課平均成績需維持在 <b>${letterGuide}</b></div>
        `;
    }
}