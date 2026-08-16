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