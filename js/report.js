function openReport() {
    document.getElementById('reportOverlay').classList.add('show');
    generateReportContent();
}

function closeReport() {
    document.getElementById('reportOverlay').classList.remove('show');
}

function generateReportContent() {
    const reportFormat = document.getElementById('reportFormatSelect').value;
    const semOrder = appData.semesterOrder || ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
    
    let totalAttempted = 0;
    let totalEarned = 0;
    let totalInProgress = 0;
    
    semOrder.forEach(sem => {
        (appData.semesters[sem] || []).forEach(c => {
            if (!c.isTentative) {
                const cred = parseFloat(c.credits) || 0;
                if (c.status === '已取得') {
                    totalEarned += cred;
                    totalAttempted += cred;
                } else if (c.status === '未取得') {
                    totalAttempted += cred;
                } else if (c.status === '修讀中') {
                    totalInProgress += cred;
                }
            }
        });
    });

    let html = `
        <div class="report-title">${appData.deptName || "未知名科系"}</div>
        <div class="report-subtitle">歷年成績單暨修業檢核報告</div>
        <div class="student-info">
            <span>學號：__________________</span>
            <span>姓名：__________________</span>
            <span>列印時間：${new Date().toLocaleDateString('zh-TW')}</span>
        </div>
    `;
    
    if (reportFormat === 'all' || reportFormat === 'semester') {
        html += `<div class="report-section"><h3>📊 歷年修課與成績紀錄</h3>`;
        let hasAnyCourse = false;

        semOrder.forEach(sem => {
            const courses = appData.semesters[sem] || [];
            if(courses.length === 0) return;
            hasAnyCourse = true;
            
            let semEarned = 0, semExpected = 0;
            let sumScore = 0, sumGpaPoints = 0, countScoreCredits = 0;
            
            let tableHtml = `<h4 style="margin:10px 0 5px 0;">${sem}</h4>
                             <table class="report-table">
                             <thead><tr><th width="30%">課程名稱</th><th width="20%">類別</th><th width="10%">學分</th><th width="20%">分數 (等第)</th><th width="20%">狀態</th></tr></thead>
                             <tbody>`;
                             
            courses.forEach(c => {
                const isTentative = c.isTentative === true;
                const isPassed = c.status === '已取得';
                const isInProgress = c.status === '修讀中';
                
                let scoreStr = "--";
                if (!isTentative && !isInProgress && c.score !== null) {
                    let letter = getLetterGrade(c.score);
                    scoreStr = `${c.score} (${letter})`;
                    
                    if (c.credits > 0) {
                        sumScore += c.score * c.credits;
                        sumGpaPoints += getGradePoint(c.score) * c.credits;
                        countScoreCredits += c.credits;
                    }
                }
                
                let statusStr = c.status;
                if(isTentative) statusStr = "暫定/候補";
                else if(c.status === '未取得') statusStr = "✕ 不及格";
                else if(isPassed) statusStr = "✓ 已取得";
                else if(isInProgress) statusStr = "⏳ 修讀中";
                
                if(!isTentative && isPassed) semEarned += c.credits;
                if(!isTentative && (isPassed || isInProgress)) semExpected += c.credits;
                
                let rowClass = isTentative ? 'class="row-tentative"' : '';
                tableHtml += `<tr ${rowClass}>
                                <td>${c.name}</td>
                                <td>${c.type}</td>
                                <td>${c.credits}</td>
                                <td>${scoreStr}</td>
                                <td>${statusStr}</td>
                              </tr>`;
            });
            
            let semWeightedStr = countScoreCredits > 0 ? (sumScore / countScoreCredits).toFixed(2) : "0.00";
            let semGpaStr = countScoreCredits > 0 ? (sumGpaPoints / countScoreCredits).toFixed(2) : "0.00";
            
            tableHtml += `</tbody></table>
                          <div class="table-summary">學期實得學分：${semEarned} | 預計學分：${semExpected} | 學期加權平均：${semWeightedStr} | 學期GPA：${semGpaStr}</div>`;
            html += tableHtml;
        });
        
        if(!hasAnyCourse) html += `<div style="text-align:center; padding: 20px; color:#64748b;">尚未新增任何課程紀錄</div>`;
        html += `</div>`;
    }
    
    if (reportFormat === 'all' || reportFormat === 'category') {
        if (reportFormat === 'all') html += `<div class="page-break"></div>`;
        html += `<div class="report-section"><h3>📑 修課類別檢核清單</h3>`;
        
        const categoryGroups = {
            "系定必修": { courses: [], earned: 0, expected: 0 },
            "選修-本系": { courses: [], earned: 0, expected: 0 },
            "選修-必選": { courses: [], earned: 0, expected: 0 },
            "選修-外系": { courses: [], earned: 0, expected: 0 },
            "跨領域-必修": { courses: [], earned: 0, expected: 0 }, // 🌟 跨領域必修
            "跨領域-選修": { courses: [], earned: 0, expected: 0 }, // 🌟 跨領域選修
            "通識-人文": { courses: [], earned: 0, expected: 0 },
            "通識-社科": { courses: [], earned: 0, expected: 0 },
            "通識-生醫": { courses: [], earned: 0, expected: 0 },
            "通識-科際": { courses: [], earned: 0, expected: 0 },
            "通識-自然": { courses: [], earned: 0, expected: 0 },
            "融通": { courses: [], earned: 0, expected: 0 },
            "國文": { courses: [], earned: 0, expected: 0 },
            "英文": { courses: [], earned: 0, expected: 0 },
            "踏溯台南": { courses: [], earned: 0, expected: 0 },
            "體育": { courses: [], earned: 0, expected: 0 } 
        };
        
        semOrder.forEach(sem => {
            (appData.semesters[sem] || []).forEach(c => {
                if (c.isTentative) return;
                const group = categoryGroups[c.type];
                if (group) {
                    group.courses.push({ ...c, sem });
                    if(c.status === '已取得') group.earned += c.credits;
                    if(c.status === '已取得' || c.status === '修讀中') group.expected += c.credits;
                }
            });
        });
        
        let hasCategoryData = false;
        Object.keys(categoryGroups).forEach(cat => {
            const data = categoryGroups[cat];
            if(data.courses.length === 0) return;
            hasCategoryData = true;
            
            html += `<h4 style="margin:20px 0 8px 0; color:#0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">■ ${cat} <span style="font-size:0.9rem; color:#475569; font-weight:normal;">(實得學分: ${data.earned} / 預計總得: ${data.expected})</span></h4>`;
            html += `<table class="report-table" style="margin-bottom: 0;">
                        <thead><tr><th width="15%">學期</th><th width="35%">課程名稱</th><th width="10%">學分</th><th width="20%">分數 (等第)</th><th width="20%">狀態</th></tr></thead>
                        <tbody>`;
            data.courses.forEach(c => {
                let scoreStr = "--";
                if ((c.status === '已取得' || c.status === '未取得') && c.score !== null) {
                    let letter = getLetterGrade(c.score);
                    scoreStr = `${c.score} (${letter})`;
                }
                
                let statusStr = c.status;
                let trStyle = "";
                
                if (c.status === '修讀中') {
                    statusStr = "⏳ 修讀中";
                } else if (c.status === '已取得') {
                    statusStr = "✓ 及格";
                } else {
                    statusStr = "✕ 不及格";
                    trStyle = "color: #64748b;";
                }
                
                html += `<tr style="${trStyle}"><td>${c.sem}</td><td>${c.name}</td><td>${c.credits}</td><td>${scoreStr}</td><td>${statusStr}</td></tr>`;
            });
            html += `</tbody></table>`;
        });
        
        if(!hasCategoryData) html += `<div style="text-align:center; padding: 20px; color:#64748b;">尚未新增任何正式課程</div>`;
        html += `</div>`;
    }

    html += `
        <div style="margin-top: 30px; padding: 15px; border: 2px solid #0f172a; border-radius: 8px; background-color: #f8fafc; font-size: 1.05rem; font-weight: bold; text-align: center; color: #1e293b;">
            📌 修業總結：歷年累計修讀 <span style="color:#ef4444">${totalAttempted}</span> 學分 (含不及格) ｜ 
            實際已取得 <span style="color:#166534">${totalEarned}</span> 學分 ｜ 
            另有 <span style="color:#3b82f6">${totalInProgress}</span> 學分修讀中
        </div>
    `;
    
    document.getElementById('reportPrintArea').innerHTML = html;
}