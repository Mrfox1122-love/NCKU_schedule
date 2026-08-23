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

function toggleScoreInput() {
    const mode = document.getElementById('courseStatusMode').value;
    const group = document.getElementById('scoreInputGroup');
    if (mode === '已結算') {
        group.style.display = 'block';
        previewGrade();
    } else {
        group.style.display = 'none';
    }
}

function previewGrade() {
    const score = parseFloat(document.getElementById('courseScore').value);
    if (isNaN(score) || score < 0 || score > 100) {
        document.getElementById('gradePreview').innerText = "請輸入 0~100 分數";
        return;
    }
    const letter = getLetterGrade(score);
    const gp = getGradePoint(score);
    const passStatus = score >= 60 ? '及格' : '不及格';
    document.getElementById('gradePreview').innerText = `等第: ${letter} | 積分: ${gp} (${passStatus})`;
}

// ============================================================
// 📊 學期成績批次結算模組 (Batch Grade Settlement Engine)
// ============================================================

let currentBatchGradeCache = [];

function openBatchGradeModal() {
    const sem = appData.currentSemester;
    const courses = (appData.semesters[sem] || []).filter(c => !c.isTentative);

    if (courses.length === 0) {
        alert(`【${sem}】目前課表內尚無任何正式課程，無法結算成績！`);
        return;
    }

    const titleEl = document.getElementById('batchGradeSubTitle');
    if (titleEl) titleEl.innerText = `結算學期：【${sem}】（共 ${courses.length} 門課程）`;

    // 複製快取資料以供彈窗內修改
    currentBatchGradeCache = courses.map(c => ({
        id: c.id,
        name: c.name,
        credits: c.credits,
        type: c.type,
        status: c.status,
        score: c.score !== null && c.score !== undefined ? c.score : ''
    }));

    renderBatchGradeRows();
    updateBatchGradeLiveStats();

    if (typeof ModalManager !== 'undefined') {
        ModalManager.open('batchGradeModal');
    }
}

function closeBatchGradeModal() {
    if (typeof ModalManager !== 'undefined') {
        ModalManager.close('batchGradeModal');
    }
    currentBatchGradeCache = [];
}

function renderBatchGradeRows() {
    const container = document.getElementById('batchGradeListContainer');
    if (!container) return;

    container.innerHTML = currentBatchGradeCache.map((item, idx) => {
        const rawScore = item.score;
        let previewText = '<span style="color:var(--tf-text-muted);">修讀中</span>';

        if (rawScore !== '' && !isNaN(parseFloat(rawScore))) {
            const scoreNum = parseFloat(rawScore);
            const isPass = scoreNum >= 60;
            const letter = (typeof getLetterGrade === 'function') ? getLetterGrade(scoreNum) : '';
            const gpa = (typeof getGradePoint === 'function') ? getGradePoint(scoreNum) : '';
            const color = isPass ? 'var(--tf-status-success-light)' : 'var(--tf-status-danger-light)';
            previewText = `<span style="color:${color};">${letter} (${gpa})</span>`;
        }

        return `
            <div class="batch-grade-row-card">
                <div class="batch-course-info">
                    <span class="batch-course-name">${item.name}</span>
                    <span class="batch-course-meta">${item.type} ｜ <b>${item.credits}</b> 學分</span>
                </div>
                <div class="batch-grade-controls">
                    <input type="number" class="batch-score-input" min="0" max="100" placeholder="未結算" 
                           value="${item.score}" 
                           oninput="handleBatchScoreInput(${idx}, this.value)">
                    <div class="batch-preview-tag" id="batchPreviewTag_${idx}">${previewText}</div>
                </div>
            </div>
        `;
    }).join('');
}

function handleBatchScoreInput(index, val) {
    if (!currentBatchGradeCache[index]) return;
    currentBatchGradeCache[index].score = val.trim();

    const tag = document.getElementById(`batchPreviewTag_${index}`);
    if (tag) {
        if (val.trim() === '' || isNaN(parseFloat(val))) {
            tag.innerHTML = '<span style="color:var(--tf-text-muted);">修讀中</span>';
        } else {
            const num = parseFloat(val);
            const isPass = num >= 60;
            const letter = (typeof getLetterGrade === 'function') ? getLetterGrade(num) : '';
            const gpa = (typeof getGradePoint === 'function') ? getGradePoint(num) : '';
            const color = isPass ? 'var(--tf-status-success-light)' : 'var(--tf-status-danger-light)';
            tag.innerHTML = `<span style="color:${color};">${letter} (${gpa})</span>`;
        }
    }

    updateBatchGradeLiveStats();
}

function quickFillAllGrades(defaultScore = 80) {
    currentBatchGradeCache.forEach(item => {
        item.score = String(defaultScore);
    });
    renderBatchGradeRows();
    updateBatchGradeLiveStats();
}

function quickResetAllGrades() {
    currentBatchGradeCache.forEach(item => {
        item.score = '';
    });
    renderBatchGradeRows();
    updateBatchGradeLiveStats();
}

function updateBatchGradeLiveStats() {
    const statsEl = document.getElementById('batchGradeLiveStats');
    if (!statsEl) return;

    let totalPoints = 0;
    let totalScoreWeighted = 0;
    let validCredits = 0;

    currentBatchGradeCache.forEach(item => {
        const cr = parseFloat(item.credits) || 0;
        if (item.score !== '' && !isNaN(parseFloat(item.score)) && cr > 0) {
            const scoreNum = parseFloat(item.score);
            const gp = (typeof getGradePoint === 'function') ? getGradePoint(scoreNum) : 0;
            totalPoints += gp * cr;
            totalScoreWeighted += scoreNum * cr;
            validCredits += cr;
        }
    });

    if (validCredits > 0) {
        const gpa = (totalPoints / validCredits).toFixed(2);
        const avg = (totalScoreWeighted / validCredits).toFixed(1);
        statsEl.innerHTML = `已算學分: <b>${validCredits}</b> ｜ 學期 GPA: <b>${gpa}</b> ｜ 加權平均: <b>${avg} 分</b>`;
    } else {
        statsEl.innerHTML = `尚無已結算之計分課程 (預排中)`;
    }
}

function saveBatchGrades() {
    const sem = appData.currentSemester;
    const courses = appData.semesters[sem] || [];

    currentBatchGradeCache.forEach(cacheItem => {
        const target = courses.find(c => String(c.id) === String(cacheItem.id));
        if (target) {
            if (cacheItem.score !== '' && !isNaN(parseFloat(cacheItem.score))) {
                const finalScore = parseFloat(cacheItem.score);
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
    alert(`🎉 已成功儲存【${sem}】學期成績！`);
}

window.openBatchGradeModal = openBatchGradeModal;
window.closeBatchGradeModal = closeBatchGradeModal;
window.handleBatchScoreInput = handleBatchScoreInput;
window.quickFillAllGrades = quickFillAllGrades;
window.quickResetAllGrades = quickResetAllGrades;
window.saveBatchGrades = saveBatchGrades;