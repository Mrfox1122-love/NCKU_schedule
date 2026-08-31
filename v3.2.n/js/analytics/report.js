// ============================================================
// 📊 TimeFlow Report 成績單與修業檢核報表模組 (Fixed & Enhanced)
// ============================================================

function openReport() {
    ModalManager.open('reportOverlay');
    generateReportContent();
}

function closeReport() {
    ModalManager.close('reportOverlay');
}

function generateReportContent() {
    const printArea = document.getElementById('reportPrintArea');
    const formatSelect = document.getElementById('reportFormatSelect');
    if (!printArea) return;

    const reportFormat = formatSelect ? formatSelect.value : 'all';
    const semOrder = appData.semesterOrder || ["一上", "一下", "二上", "二下", "三上", "三下", "四上", "四下"];
    
    // 🌟 透過畢業計算引擎取得官方核定數據與不承認通識名單
    const gradRes = (typeof calculateGraduation === 'function') ? calculateGraduation(appData) : null;
    const rule = (typeof getDepartmentGraduationRule === 'function')
        ? getDepartmentGraduationRule(appData.deptName, appData.entryYear, appData)
        : null;
    const disallowedList = rule?.disallowedGeneralCourses || [];

    let totalAttempted = 0;
    let totalEarned = gradRes ? gradRes.total.earned : 0;
    let totalInProgress = 0;
    
    semOrder.forEach(sem => {
        (appData.semesters[sem] || []).forEach(c => {
            if (!c.isTentative) {
                const cred = parseFloat(c.credits) || 0;
                if (c.status === '已取得' || c.status === '未取得') {
                    totalAttempted += cred;
                } else if (c.status === '修讀中') {
                    totalInProgress += cred;
                }
            }
        });
    });

    let html = `
        <div class="report-title">${appData.deptName || "國立成功大學"}</div>
        <div class="report-subtitle">歷年成績單暨修業檢核報告</div>
        <div class="student-info">
            <span>學號：__________________</span>
            <span>姓名：__________________</span>
            <span>列印時間：${new Date().toLocaleDateString('zh-TW')}</span>
        </div>
    `;
    
    // --------------------------------------------------------
    // 1. 歷年學期成績單 (Semester-based)
    // --------------------------------------------------------
    if (reportFormat === 'all' || reportFormat === 'semester') {
        html += `<div class="report-section"><h3>歷年修課與成績紀錄</h3>`;
        let hasAnyCourse = false;

        semOrder.forEach(sem => {
            const courses = appData.semesters[sem] || [];
            if (courses.length === 0) return;
            hasAnyCourse = true;
            
            let semEarned = 0, semExpected = 0;
            let sumScore = 0, sumGpaPoints = 0, countScoreCredits = 0;
            
            let tableHtml = `<div class="report-block">
                             <h4 style="margin:12px 0 6px 0; color:var(--tf-text-primary); font-size:1rem;">${sem}</h4>
                             <table class="report-table">
                             <thead>
                                <tr>
                                    <th width="32%">課程名稱</th>
                                    <th width="18%">類別</th>
                                    <th width="10%">學分</th>
                                    <th width="20%">分數 (等第)</th>
                                    <th width="20%">狀態</th>
                                </tr>
                             </thead>
                             <tbody>`;
                             
            courses.forEach(c => {
                const isTentative = c.isTentative === true;
                const isPassed = (c.status === '已取得');
                const isInProgress = (c.status === '修讀中');
                const cred = parseFloat(c.credits) || 0;
                
                let scoreStr = "--";
                if (!isTentative && !isInProgress && c.score !== null && c.score !== undefined) {
                    const letter = typeof getLetterGrade === 'function' ? getLetterGrade(c.score) : '';
                    scoreStr = `${c.score} (${letter})`;
                    
                    if (cred > 0) {
                        const gp = typeof getGradePoint === 'function' ? getGradePoint(c.score) : 0;
                        sumScore += c.score * cred;
                        sumGpaPoints += gp * cred;
                        countScoreCredits += cred;
                    }
                }
                
                let statusStr = c.status || '修讀中';
                if (isTentative) statusStr = "暫定/候補";
                else if (c.status === '未取得') statusStr = "不及格";
                else if (isPassed) statusStr = "已取得";
                else if (isInProgress) statusStr = "修讀中";
                
                if (!isTentative && isPassed) semEarned += cred;
                if (!isTentative && (isPassed || isInProgress)) semExpected += cred;
                
                const rowClass = isTentative ? 'class="row-tentative"' : '';
                tableHtml += `<tr ${rowClass}>
                                <td style="text-align:left; font-weight:600;">${c.name}</td>
                                <td>${c.type || '未指定'}</td>
                                <td>${cred}</td>
                                <td>${scoreStr}</td>
                                <td>${statusStr}</td>
                              </tr>`;
            });
            
            const semWeightedStr = countScoreCredits > 0 ? (sumScore / countScoreCredits).toFixed(2) : "0.00";
            const semGpaStr = countScoreCredits > 0 ? (sumGpaPoints / countScoreCredits).toFixed(2) : "0.00";
            
            tableHtml += `</tbody></table>
                          <div class="table-summary">學期實得學分：${semEarned} ｜ 預計學分：${semExpected} ｜ 學期加權平均：${semWeightedStr} ｜ 學期 GPA：${semGpaStr}</div>
                          </div>`;
            html += tableHtml;
        });
        
        if (!hasAnyCourse) {
            html += `<div style="text-align:center; padding: 20px; color:#64748b;">尚未新增任何課程紀錄</div>`;
        }
        html += `</div>`;
    }
    
    // --------------------------------------------------------
    // 2. 修課類別檢核清單 (Category-based)
    // --------------------------------------------------------
    if (reportFormat === 'all' || reportFormat === 'category') {
        if (reportFormat === 'all') html += `<div class="page-break"></div>`;
        html += `<div class="report-section"><h3>修課類別檢核清單</h3>`;
        
        const categoryGroups = {
            "系定必修": { courses: [], earned: 0, expected: 0 },
            "選修-本系": { courses: [], earned: 0, expected: 0 },
            "選修-必選": { courses: [], earned: 0, expected: 0 },
            "選修-外系": { courses: [], earned: 0, expected: 0 },
            "跨領域-必修": { courses: [], earned: 0, expected: 0 },
            "跨領域-選修": { courses: [], earned: 0, expected: 0 },
            "第二外語-通識": { courses: [], earned: 0, expected: 0 },
            "第二外語-選修": { courses: [], earned: 0, expected: 0 },
            "通識-人文": { courses: [], earned: 0, expected: 0 },
            "通識-社科": { courses: [], earned: 0, expected: 0 },
            "通識-生醫": { courses: [], earned: 0, expected: 0 },
            "通識-科際": { courses: [], earned: 0, expected: 0 },
            "通識-自然": { courses: [], earned: 0, expected: 0 },
            "融通": { courses: [], earned: 0, expected: 0 },
            "國文": { courses: [], earned: 0, expected: 0 },
            "英文": { courses: [], earned: 0, expected: 0 },
            "踏溯台南": { courses: [], earned: 0, expected: 0 },
            "體育": { courses: [], earned: 0, expected: 0, countEarned: 0, countExpected: 0 },
            "服務學習": { courses: [], earned: 0, expected: 0, countEarned: 0, countExpected: 0 },
            "軍訓": { courses: [], earned: 0, expected: 0, countEarned: 0, countExpected: 0 },
            "其他課程": { courses: [], earned: 0, expected: 0 }
        };
        
        semOrder.forEach(sem => {
            (appData.semesters[sem] || []).forEach(c => {
                if (c.isTentative) return;
                
                let typeKey = c.type;
                if (typeKey === '全民國防') typeKey = '軍訓';
                if (typeKey === '第二外語') typeKey = '第二外語-通識';

                const group = categoryGroups[typeKey] || categoryGroups["其他課程"];
                const cred = parseFloat(c.credits) || 0;

                // 檢查是否為系所不承認之通識
                const cleanName = (c.name || '').replace(/[\s\-_—–()（）\[\]【】·・、,，:：]/g, '').toLowerCase();
                const isDisallowed = (typeKey.startsWith('通識') || typeKey === '融通' || typeKey.startsWith('第二外語')) &&
                    disallowedList.some(dc => {
                        const cleanDc = dc.replace(/[\s\-_—–()（）\[\]【】·・、,，:：]/g, '').toLowerCase();
                        return cleanDc && cleanName && (cleanName === cleanDc || cleanName.includes(cleanDc));
                    });

                group.courses.push({ ...c, sem, isDisallowed });
                if (c.status === '已取得') {
                    if (!isDisallowed) group.earned += cred;
                    if (group.countEarned !== undefined) group.countEarned += 1;
                }
                if (c.status === '已取得' || c.status === '修讀中') {
                    if (!isDisallowed) group.expected += cred;
                    if (group.countExpected !== undefined) group.countExpected += 1;
                }
            });
        });
        
        let hasCategoryData = false;
        Object.keys(categoryGroups).forEach(cat => {
            const data = categoryGroups[cat];
            if (data.courses.length === 0) return;
            hasCategoryData = true;
            
            let countNote = '';
            if (['體育', '服務學習', '軍訓'].includes(cat)) {
                countNote = ` ｜ 實得: ${data.countEarned} 門 / 預計: ${data.countExpected} 門`;
            }

            html += `<div class="report-block">
                     <h4 style="margin:20px 0 8px 0; color:#0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                        ■ ${cat} 
                        <span style="font-size:0.85rem; color:#475569; font-weight:normal;">(採計實得: ${data.earned} / 採計預計: ${data.expected}${countNote})</span>
                     </h4>
                     <table class="report-table" style="margin-bottom: 0;">
                        <thead>
                            <tr>
                                <th width="15%">學期</th>
                                <th width="35%">課程名稱</th>
                                <th width="10%">學分</th>
                                <th width="20%">分數 (等第)</th>
                                <th width="20%">狀態</th>
                            </tr>
                        </thead>
                        <tbody>`;
            
            data.courses.forEach(c => {
                let scoreStr = "--";
                if ((c.status === '已取得' || c.status === '未取得') && c.score !== null && c.score !== undefined) {
                    const letter = typeof getLetterGrade === 'function' ? getLetterGrade(c.score) : '';
                    scoreStr = `${c.score} (${letter})`;
                }
                
                let statusStr = c.status || '修讀中';
                let trStyle = "";
                
                if (c.isDisallowed) {
                    statusStr = `<span style="color:#ef4444; font-weight:bold;">不採計(系所排除)</span>`;
                    trStyle = "background-color: rgba(239, 68, 68, 0.05);";
                } else if (c.status === '修讀中') {
                    statusStr = "修讀中";
                } else if (c.status === '已取得') {
                    statusStr = "及格";
                } else {
                    statusStr = "不及格";
                    trStyle = "color: #ef4444;";
                }
                
                html += `<tr style="${trStyle}">
                            <td>${c.sem}</td>
                            <td style="text-align:left; font-weight:600;">${c.name}</td>
                            <td>${c.credits}</td>
                            <td>${scoreStr}</td>
                            <td>${statusStr}</td>
                         </tr>`;
            });
            html += `</tbody></table></div>`;
        });
        
        if (!hasCategoryData) {
            html += `<div style="text-align:center; padding: 20px; color:#64748b;">尚未新增任何正式課程</div>`;
        }
        html += `</div>`;
    }

    // --------------------------------------------------------
    // 3. 總結框
    // --------------------------------------------------------
    html += `
        <div class="report-summary-box" style="margin-top: 30px; padding: 15px; border: 2px solid #0f172a; border-radius: 8px; background-color: #f8fafc; font-size: 1.02rem; font-weight: bold; text-align: center; color: #1e293b;">
            修業總結：歷年累計修讀 <span style="color:#ef4444">${totalAttempted}</span> 學分 (含不及格) ｜ 
            有效畢業學分 <span style="color:#166534">${totalEarned}</span> / 目標 ${gradRes ? gradRes.total.target : '--'} 學分 ｜ 
            另有 <span style="color:#2563eb">${totalInProgress}</span> 學分修讀中
        </div>
    `;
    
    printArea.innerHTML = html;
}