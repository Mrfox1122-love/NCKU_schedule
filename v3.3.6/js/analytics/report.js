// ============================================================
// 📊 TimeFlow Report 成績單與修業檢核報表模組 (v3.3.6 完整修正版 - XSS Secured)
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
    const isMaster = typeof isMasterMode === 'function' && isMasterMode(appData);

    // 透過畢業計算引擎取得官方核定數據與不承認通識名單（碩士班使用獨立引擎）
    const masterRes = isMaster ? calculateMasterGraduation(appData) : null;
    const gradRes = (!isMaster && typeof calculateGraduation === 'function') ? calculateGraduation(appData) : null;
    const rule = (!isMaster && typeof getDepartmentGraduationRule === 'function')
        ? getDepartmentGraduationRule(appData.deptName, appData.entryYear, appData)
        : null;
    const disallowedList = rule?.disallowedGeneralCourses || [];

    let totalAttempted = 0;
    let totalEarned = isMaster ? masterRes.credits.earned : (gradRes ? gradRes.total.earned : 0);
    let totalTarget = isMaster ? masterRes.credits.target : (gradRes ? gradRes.total.target : '--');
    let totalInProgress = 0;
    
    semOrder.forEach(sem => {
        (appData.semesters[sem] || []).forEach(c => {
            if (!c.isTentative) {
                const cred = parseFloat(c.credits) || 0;
                if (c.status === '已取得' || c.status === '未取得' || c.status === '已抵免') {
                    totalAttempted += cred;
                } else if (c.status === '修讀中') {
                    totalInProgress += cred;
                }
            }
        });
    });

    const reportTitle = isMaster ? masterRes.rule.program.fullName : (appData.deptName || "國立成功大學");
    const reportSubtitle = isMaster ? `${masterRes.rule.program.degree}歷年成績單暨畢業檢核報告（${appData.masterEntryYear} 學年入學）` : '歷年成績單暨修業檢核報告';

    let html = `
        <div class="report-title">${escapeHTML(reportTitle)}</div>
        <div class="report-subtitle">${escapeHTML(reportSubtitle)}</div>
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
                             <h4 style="margin:14px 0 6px 0; color:var(--tf-text-primary); font-size:1rem; font-weight:700;">${escapeHTML(sem)}</h4>
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
                const isTentative = (c.isTentative === true);
                const isWaived = (c.status === '已抵免');
                const isPassed = (c.status === '已取得' || isWaived);
                const isInProgress = (c.status === '修讀中');
                const cred = parseFloat(c.credits) || 0;
                
                let scoreStr = "--";
                if (!isTentative && !isInProgress && !isWaived && c.score !== null && c.score !== undefined) {
                    const letter = typeof getLetterGrade === 'function' ? getLetterGrade(c.score) : '';
                    scoreStr = `${c.score} (${letter})`;
                    
                    if (cred > 0) {
                        const gp = typeof getGradePoint === 'function' ? getGradePoint(c.score) : 0;
                        sumScore += c.score * cred;
                        sumGpaPoints += gp * cred;
                        countScoreCredits += cred;
                    }
                } else if (isWaived) {
                    scoreStr = "抵免 (免計)";
                }
                
                let statusStr = c.status || '修讀中';
                if (isTentative) statusStr = "暫定/候補";
                else if (isWaived) statusStr = "已抵免";
                else if (c.status === '未取得') statusStr = "不及格";
                else if (c.status === '已取得') statusStr = "已取得";
                else if (isInProgress) statusStr = "修讀中";
                
                if (!isTentative && isPassed) semEarned += cred;
                if (!isTentative && (isPassed || isInProgress)) semExpected += cred;
                
                const rowClass = isTentative ? 'class="row-tentative"' : '';
                tableHtml += `<tr ${rowClass}>
                                <td style="text-align:left; font-weight:600;">${escapeHTML(c.name)}</td>
                                <td>${escapeHTML(c.type || '未指定')}</td>
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
    if ((reportFormat === 'all' || reportFormat === 'category') && isMaster) {
        if (reportFormat === 'all') html += `<div class="page-break"></div>`;
        html += buildMasterReportSection(semOrder, masterRes);
    } else if (reportFormat === 'all' || reportFormat === 'category') {
        if (reportFormat === 'all') html += `<div class="page-break"></div>`;
        html += `<div class="report-section"><h3>修課類別檢核清單</h3>`;
        
        const categoryGroups = {
            "系定必修": { courses: [], earned: 0, expected: 0 },
            "選修-本系": { courses: [], earned: 0, expected: 0 },
            "選修-必選": { courses: [], earned: 0, expected: 0 },
            "選修-外系": { courses: [], earned: 0, expected: 0 },
            "自由選修": { courses: [], earned: 0, expected: 0 },
            "專長養成-院必修": { courses: [], earned: 0, expected: 0 },
            "專長養成-院選修": { courses: [], earned: 0, expected: 0 },
            "專長養成-目標輔系": { courses: [], earned: 0, expected: 0 },
            "不分系-自我與職涯探索": { courses: [], earned: 0, expected: 0 },
            "不分系-專題方法論": { courses: [], earned: 0, expected: 0 },
            "不分系-跨領域專題": { courses: [], earned: 0, expected: 0 },
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
                const isWaived = (c.status === '已抵免');
                const isPassed = (c.status === '已取得' || isWaived);
                const isInProgress = (c.status === '修讀中');

                // 檢查是否為系所不承認之通識
                const cleanName = (c.name || '').replace(/[\s\-_—–()（）\[\]【】·・、,，:：]/g, '').toLowerCase();
                const isDisallowed = (typeKey.startsWith('通識') || typeKey === '融通' || typeKey.startsWith('第二外語')) &&
                    disallowedList.some(dc => {
                        const cleanDc = dc.replace(/[\s\-_—–()（）\[\]【】·・、,，:：]/g, '').toLowerCase();
                        return cleanDc && cleanName && (cleanName === cleanDc || cleanName.includes(cleanDc));
                    });

                group.courses.push({ ...c, sem, isDisallowed });
                
                if (isPassed) {
                    if (!isDisallowed) group.earned += cred;
                    if (group.countEarned !== undefined) group.countEarned += 1;
                }
                if (isPassed || isInProgress) {
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
                     <h4 style="margin:20px 0 8px 0; color:var(--tf-text-primary); border-bottom: 1px solid var(--tf-border-default); padding-bottom: 4px; font-weight:700;">
                        ■ ${escapeHTML(cat)} 
                        <span style="font-size:0.85rem; color:var(--tf-text-secondary); font-weight:normal;">(採計實得: ${data.earned} / 採計預計: ${data.expected}${countNote})</span>
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
                const isWaived = (c.status === '已抵免');
                let scoreStr = "--";
                if (!isWaived && (c.status === '已取得' || c.status === '未取得') && c.score !== null && c.score !== undefined) {
                    const letter = typeof getLetterGrade === 'function' ? getLetterGrade(c.score) : '';
                    scoreStr = `${c.score} (${letter})`;
                } else if (isWaived) {
                    scoreStr = "抵免 (免計)";
                }
                
                let statusStr = c.status || '修讀中';
                let trStyle = "";
                
                if (c.isDisallowed) {
                    statusStr = `<span style="color:#ef4444; font-weight:bold;">不採計(系所排除)</span>`;
                    trStyle = "background-color: rgba(239, 68, 68, 0.05);";
                } else if (isWaived) {
                    statusStr = "已抵免";
                } else if (c.status === '修讀中') {
                    statusStr = "修讀中";
                } else if (c.status === '已取得') {
                    statusStr = "及格";
                } else {
                    statusStr = "不及格";
                    trStyle = "color: #ef4444;";
                }
                
                html += `<tr style="${trStyle}">
                            <td>${escapeHTML(c.sem)}</td>
                            <td style="text-align:left; font-weight:600;">${escapeHTML(c.name)}</td>
                            <td>${escapeHTML(c.credits)}</td>
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
            修業總結：歷年累計修讀 <span style="color:#ef4444">${totalAttempted}</span> 學分 (含不及格與抵免) ｜ 
            有效畢業學分 <span style="color:#166534">${totalEarned}</span> / 目標 ${totalTarget} 學分 ｜
            另有 <span style="color:#2563eb">${totalInProgress}</span> 學分修讀中
            ${isMaster ? `<br>論文 ${masterRes.thesis.credits} 學分另計 ｜ 畢業條件：${masterRes.allPassed ? '<span style="color:#166534">全數符合</span>' : '<span style="color:#ef4444">尚未全數符合</span>'}` : ''}
        </div>
    `;

    printArea.innerHTML = html;
}

// --------------------------------------------------------
// 碩士班：畢業條件檢核表 + 依碩班類別分組的修課清單
// --------------------------------------------------------
function buildMasterReportSection(semOrder, res) {
    const okMark = ok => ok
        ? '<span style="color:#166534; font-weight:bold;">✔ 符合</span>'
        : '<span style="color:#ef4444; font-weight:bold;">✘ 未符合</span>';
    const statusText = { passed: '已通過', exempt: '大學已修', planned: '修讀中', missing: '尚未修' };
    const c = res.credits;

    const checkRows = [
        ['畢業學分', `已取得 ${c.earned} / ${c.target} 學分（預計 ${c.expected}）${c.waived.overflow > 0 ? `，抵免超過上限已扣除 ${c.waived.overflow}` : ''}`, res.checks.credits],
        ['本所課程', `已修 ${c.own.expected} 學分（必修 ${c.own.required.expected}、選修 ${c.own.elective.expected}）${c.own.min !== null ? `，至少 ${c.own.min}` : ''}`, res.checks.ownCredits],
        ...(c.external.min !== null ? [['外所下限', `已修 ${c.external.expected} 學分（至少 ${c.external.min}）`, res.checks.externalMin]] : []),
        ['外所選修', c.external.cap === null ? `已修 ${c.external.expected} 學分（規章未限制）` : `已修 ${c.external.expected} 學分，承認 ${c.external.countedExpected} 學分（上限 ${c.external.cap}）`, c.external.cap === null || c.external.expected <= c.external.cap],
        ...(res.seminar.required > 0 ? [['專題討論', `已通過 ${res.seminar.earned} / ${res.seminar.required} 學期（預計 ${res.seminar.expected}）${res.seminar.duration ? `，預計修業 ${res.seminar.duration === '2' ? '2 年以上' : res.seminar.duration + ' 年'}` : ''}`, res.checks.seminar]] : []),
        [res.rule.program.degree === '博士班' ? '博士論文' : '碩士論文', `${res.thesis.credits ? `${res.thesis.credits} 學分另計` : '不另計學分'}｜${res.thesis.status === 'earned' ? '已完成' : (res.thesis.status === 'planned' ? `修讀中（${res.thesis.semester}）` : '尚未排入')}`, res.checks.thesis],
        ...res.requiredCourses.map(r => [`指定課程：${r.name}`, statusText[r.status], r.status === 'passed']),
        ...res.remedial.map(r => [`補修：${r.name}`, statusText[r.status], r.status === 'passed' || r.status === 'exempt']),
        ...(res.ethics.required > 0 ? [['學術倫理', `${res.ethics.hours} / ${res.ethics.required} 小時`, res.checks.ethics]] : [])
    ];

    const rule = res.rule;
    const ruleNote = `<p style="font-size:0.85rem; color:var(--tf-text-secondary); margin:4px 0 8px;">適用規章：${escapeHTML(rule.versionLabel)}${rule.fallbackNote ? `<br>📌 ${escapeHTML(rule.fallbackNote)}` : ''}${rule.uncertain.length ? `<br>⚠️ 規章未明確處（系統處理方式，未經系所確認）：${rule.uncertain.map(escapeHTML).join('　')}` : ''}</p>`;

    let html = `<div class="report-section"><h3>${escapeHTML(rule.program.degree)}畢業條件檢核</h3>
        ${rule.programKey === CUSTOM_MASTER_PROGRAM ? '' : ruleNote}
        <table class="report-table">
            <thead><tr><th width="22%">項目</th><th width="58%">內容</th><th width="20%">結果</th></tr></thead>
            <tbody>
                ${checkRows.map(([item, detail, ok]) => `
                    <tr>
                        <td style="font-weight:600;">${escapeHTML(item)}</td>
                        <td style="text-align:left;">${escapeHTML(detail)}</td>
                        <td>${okMark(ok)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>`;

    // 依碩班類別分組（非碩班類別歸入「其他課程」）
    const groups = {};
    MASTER_COURSE_TYPES.forEach(t => { groups[t.value] = []; });
    groups['其他課程'] = [];
    semOrder.forEach(sem => {
        (appData.semesters[sem] || []).forEach(course => {
            if (course.isTentative) return;
            (groups[course.type] || groups['其他課程']).push({ ...course, sem });
        });
    });

    Object.keys(groups).forEach(cat => {
        const courses = groups[cat];
        if (courses.length === 0) return;
        const earned = courses.filter(x => x.status === '已取得' || x.status === '已抵免').reduce((s, x) => s + (parseFloat(x.credits) || 0), 0);
        html += `<div class="report-block">
            <h4 style="margin:20px 0 8px 0; color:var(--tf-text-primary); border-bottom: 1px solid var(--tf-border-default); padding-bottom: 4px; font-weight:700;">
                ■ ${escapeHTML(cat)} <span style="font-size:0.85rem; color:var(--tf-text-secondary); font-weight:normal;">(已取得 ${earned} 學分)</span>
            </h4>
            <table class="report-table" style="margin-bottom: 0;">
                <thead><tr><th width="15%">學期</th><th width="35%">課程名稱</th><th width="10%">學分</th><th width="20%">分數 (等第)</th><th width="20%">狀態</th></tr></thead>
                <tbody>
                    ${courses.map(x => {
                        const isWaived = x.status === '已抵免';
                        let scoreStr = '--';
                        if (!isWaived && (x.status === '已取得' || x.status === '未取得') && x.score !== null && x.score !== undefined) {
                            scoreStr = `${x.score} (${typeof getLetterGrade === 'function' ? getLetterGrade(x.score) : ''})`;
                        } else if (isWaived) {
                            scoreStr = '抵免 (免計)';
                        }
                        const failed = x.status === '未取得';
                        return `<tr style="${failed ? 'color:#ef4444;' : ''}">
                            <td>${escapeHTML(x.sem)}</td>
                            <td style="text-align:left; font-weight:600;">${escapeHTML(x.name)}</td>
                            <td>${escapeHTML(x.credits)}</td>
                            <td>${escapeHTML(scoreStr)}</td>
                            <td>${escapeHTML(failed ? '不及格' : (x.status || '修讀中'))}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    });

    if (res.uncounted.length > 0) {
        html += `<div class="report-block" style="margin-top:16px; font-size:0.85rem; color:var(--tf-text-secondary);">
            <b>未計入畢業學分：</b>${res.uncounted.map(u => escapeHTML(`${u.semester} ${u.name}（${u.reason}）`)).join('；')}
        </div>`;
    }
    html += `<div class="report-block" style="margin-top:10px; font-size:0.8rem; color:var(--tf-text-muted);">依據：${escapeHTML(res.rule.source)}</div>`;
    html += `</div>`;
    return html;
}