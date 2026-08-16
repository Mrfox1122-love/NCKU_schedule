let trendChartInstance = null; 

function toggleChartDrawer(open) {
    const drawer = document.getElementById('chartDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (open) {
        overlay.classList.add('show');
        drawer.classList.add('open');
        buildTrendChart(); 
    } else {
        overlay.classList.remove('show');
        drawer.classList.remove('open');
    }
}

function buildTrendChart() {
    const semOrder = appData.semesterOrder || ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
    const labels = [];
    const gpaData = [];
    const weightedData = [];

    semOrder.forEach(sem => {
        let semGpaCredits = 0, semGpaSum = 0, semWeightedSum = 0;
        const coursesInSem = appData.semesters[sem] || [];
        
        coursesInSem.forEach(course => {
            const credits = parseFloat(course.credits) || 0;
            if (course.status !== '修讀中' && !course.isTentative && course.score !== undefined && course.score !== null && credits > 0) {
                const gp = getGradePoint(course.score);
                semGpaCredits += credits;
                semGpaSum += (gp * credits);
                semWeightedSum += (course.score * credits);
            }
        });

        if (semGpaCredits > 0) {
            labels.push(sem);
            gpaData.push((semGpaSum / semGpaCredits).toFixed(2));
            weightedData.push((semWeightedSum / semGpaCredits).toFixed(1));
        }
    });

    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    if (labels.length === 0) {
        ctx.clearRect(0, 0, 400, 400);
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.fillText("🔍 尚未輸入任何已結算的成績資料", 220, 180);
        return;
    }

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '學期 GPA',
                    data: gpaData,
                    borderColor: '#4f46e5', 
                    backgroundColor: 'rgba(79, 70, 229, 0.05)',
                    borderWidth: 3.5,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1.5,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    yAxisID: 'y-gpa',
                    tension: 0.15
                },
                {
                    label: '加權平均分',
                    data: weightedData,
                    borderColor: '#0d9488', 
                    backgroundColor: 'rgba(13, 148, 136, 0.05)',
                    borderWidth: 3.5,
                    pointBackgroundColor: '#0d9488',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1.5,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    yAxisID: 'y-weighted',
                    tension: 0.15
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, font: { size: 12, weight: 'bold' } } },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 13 }, padding: 12, borderRadius: 8, boxPadding: 6 }
            },
            scales: {
                'y-gpa': { type: 'linear', position: 'left', min: 0, max: 4.3, ticks: { font: { weight: 'bold', size: 11 } }, grid: { color: 'rgba(0, 0, 0, 0.04)' }, title: { display: true, text: 'GPA 積分', font: { weight: 'bold', size: 12 } } },
                'y-weighted': { type: 'linear', position: 'right', min: 0, max: 100, ticks: { font: { weight: 'bold', size: 11 } }, grid: { drawOnChartArea: false }, title: { display: true, text: '百分制加權平均', font: { weight: 'bold', size: 12 } } },
                x: { ticks: { font: { weight: 'bold', size: 12 } }, grid: { color: 'rgba(0, 0, 0, 0.04)' } }
            }
        }
    });
}