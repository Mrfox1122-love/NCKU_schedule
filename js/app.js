function updateAppUI() {
    renderSchedule();
    const gradResult = calculateGraduation(appData);
    renderGraduationUI(gradResult, appData);
}

function previewGrade() {
    const score = parseFloat(document.getElementById('courseScore').value);
    const previewEl = document.getElementById('gradePreview');
    if (!isNaN(score) && score >= 0 && score <= 100) {
        previewEl.innerText = `等第: ${getLetterGrade(score)} ｜ GPA: ${getGradePoint(score)}`;
    } else {
        previewEl.innerText = '';
    }
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

function toggleSidebar(forceState) {
    const body = document.body;
    if (forceState !== undefined) {
        body.classList.toggle('sidebar-open', forceState);
    } else {
        body.classList.toggle('sidebar-open');
    }
}

function switchSemester() {
    appData.currentSemester = document.getElementById('semSelect').value;
    cancelEdit();
    saveData();
    updateAppUI();
}

window.addEventListener('DOMContentLoaded', () => {
    // 讀取上次的收合狀態 (預設為收合 '1')
    const isCollapsed = localStorage.getItem('nckuee_grad_collapsed');
    const board = document.querySelector('.grad-checker-board');
    if (board) {
        board.classList.toggle('collapsed', isCollapsed !== '0');
    }

    initTable();
    updateAppUI();
});