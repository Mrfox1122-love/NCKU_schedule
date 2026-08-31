// ============================================================
// 🎓 Graduation UI 畢業檢核與門檻視覺化模組 (TimeFlow v3.2 - Clean)
// ============================================================

const NCKU_DEPARTMENTS_CATALOG = [
    { college: '電機資訊學院', depts: ['電機工程學系', '資訊工程學系'] },
    { college: '工學院', depts: ['機械工程學系', '化學工程學系', '土木工程學系', '材料科學與工程學系', '水利及海洋工程學系', '工程科學系', '系統及船舶機電工程學系', '航空太空工程學系', '資源工程學系', '環境工程學系', '生物醫學工程學系', '測量及空間資訊學系', '能源工程國際學士學位學程'] },
    { college: '理學院', depts: ['數學系', '物理學系', '化學學系', '地球科學系', '光電科學與工程學系'] },
    { college: '醫學院', depts: ['醫學系', '牙醫學系', '藥學系', '護理學系', '物理治療學系', '職能治療學系', '醫學檢驗生物技術學系', '公共衛生學系'] },
    { college: '管理學院', depts: ['工業與資訊管理學系', '交通管理科學系', '企業管理學系', '統計與資料科學學系', '會計學系'] },
    { college: '社會科學院', depts: ['政治學系', '經濟學系', '法律學系', '心理學系'] },
    { college: '規劃與設計學院', depts: ['建築學系 (五年制)', '建築學系 (四年制)', '都市計劃學系', '工業設計學系'] },
    { college: '文學院', depts: ['中國文學系', '外國語文學系', '歷史學系', '台灣文學系'] },
    { college: '生物科學與科技學院', depts: ['生命科學系', '生物科技與產業科學學系'] },
    { college: '跨領域學位學程', depts: ['全校不分系學士學位學程'] }
];

const CCEP_EXCLUDED_DEPTS = [
    '醫學系', '牙醫學系', '牙醫系', '藥學系',
    '護理學系', '護理系', '物理治療學系', '物治系',
    '職能治療學系', '職治系', '醫學檢驗生物技術學系', '醫技系',
    '建築學系', '建築系', '建築學系 (五年制)', '建築學系 (四年制)',
    '法律學系', '法律系'
];

/**
 * 依入學學年度與科系修業年限，精準計算畢業級數 (Class of Year)
 */
function getGraduationClassYear(entryYearVal, studyYears = 4) {
    const rawVal = parseInt(entryYearVal, 10) || 118;
    const entryAcademicYear = rawVal >= 100 ? (rawVal - 4) : rawVal;
    return entryAcademicYear + (parseInt(studyYears, 10) || 4);
}

function ensureSemestersForYears(data, targetYears = 4) {
    if (!data) return;
    data.semesters = data.semesters || {};
    data.semesterOrder = data.semesterOrder || [];

    const numMap = ['一', '二', '三', '四', '五', '六', '七', '八'];
    const requiredSems = [];

    for (let y = 0; y < targetYears; y++) {
        const prefix = numMap[y] || String(y + 1);
        requiredSems.push(`${prefix}上`);
        requiredSems.push(`${prefix}下`);
    }

    requiredSems.forEach(sem => {
        if (!data.semesterOrder.includes(sem)) {
            data.semesterOrder.push(sem);
        }
        if (!data.semesters[sem]) {
            data.semesters[sem] = [];
        }
    });

    const semOrderIndex = s => {
        const m = s.match(/^([一二三四五六七八九十\d]+)(上|下)$/);
        if (!m) return 999;
        const yIdx = numMap.indexOf(m[1]);
        const termIdx = m[2] === '上' ? 0 : 1;
        return (yIdx >= 0 ? yIdx : 10) * 2 + termIdx;
    };

    data.semesterOrder.sort((a, b) => semOrderIndex(a) - semOrderIndex(b));
}

function updateCourseTypeOptions(isCCEP = false) {
    const select = document.getElementById('courseType');
    if (!select) return;

    const currentVal = select.value;

    if (isCCEP) {
        select.innerHTML = `
            <optgroup label="不分系核心 (18學分)">
                <option value="不分系-自我與職涯探索">不分系-自我與職涯探索 (1學分)</option>
                <option value="不分系-專題方法論">不分系-專題方法論 (必選3門)</option>
                <option value="不分系-跨領域專題">不分系-跨領域專題 (一~三)</option>
            </optgroup>
            <optgroup label="專長養成 (單一學院50學分)">
                <option value="專長養成-院必修">專長養成-院必修</option>
                <option value="專長養成-院選修">專長養成-院選修</option>
                <option value="專長養成-目標輔系">專長養成-目標輔系必修/選修</option>
            </optgroup>
            <optgroup label="自主與自由選修 (32學分)">
                <option value="自由選修">自由選修 (跨院/Coursera/外系)</option>
                <option value="第二外語-選修">第二外語 (採計一般選修)</option>
            </optgroup>
            <optgroup label="領域通識 (五大領域)">
                <option value="通識-人文">通識-人文學</option>
                <option value="通識-社科">通識-社會科學</option>
                <option value="通識-生醫">通識-生命與健康</option>
                <option value="通識-科際">通識-科際整合</option>
                <option value="通識-自然">通識-自然與工程科學</option>
                <option value="第二外語-通識">第二外語 (採計領域通識)</option>
            </optgroup>
            <optgroup label="融合通識">
                <option value="融通">融合通識 (講座/實踐/總整)</option>
            </optgroup>
            <optgroup label="校定共同必修">
                <option value="國文">大學國文</option>
                <option value="英文">外國語言 (英文)</option>
                <option value="踏溯台南">踏溯台南</option>
                <option value="體育">體育必修</option>
                <option value="服務學習">服務學習</option>
            </optgroup>
            <optgroup label="兵役選修">
                <option value="軍訓">全民國防 (軍訓役期折抵)</option>
            </optgroup>
        `;
    } else {
        select.innerHTML = `
            <optgroup label="本系專業課程">
                <option value="系定必修">系定必修</option>
                <option value="選修-本系">選修-本系</option>
                <option value="選修-必選">選修-必選</option>
                <option value="選修-外系">選修-外系</option>
                <option value="跨領域-必修" id="optCrossReq" style="display:none;">跨領域-必修</option>
                <option value="跨領域-選修" id="optCrossElec" style="display:none;">跨領域-選修</option>
            </optgroup>
            <optgroup label="領域通識 (五大領域)">
                <option value="通識-人文">通識-人文學</option>
                <option value="通識-社科">通識-社會科學</option>
                <option value="通識-生醫">通識-生命與健康</option>
                <option value="通識-科際">通識-科際整合</option>
                <option value="通識-自然">通識-自然與工程科學</option>
                <option value="第二外語-通識">第二外語 (採計領域通識)</option>
            </optgroup>
            <optgroup label="融合通識">
                <option value="融通">融合通識 (講座/實踐/總整)</option>
            </optgroup>
            <optgroup label="校定共同必修">
                <option value="國文">大學國文</option>
                <option value="英文">外國語言 (英文)</option>
                <option value="踏溯台南">踏溯台南</option>
                <option value="體育">體育必修</option>
                <option value="服務學習">服務學習</option>
            </optgroup>
            <optgroup label="兵役與其他選修">
                <option value="第二外語-選修">第二外語 (採計一般外系選修)</option>
                <option value="軍訓">全民國防 (軍訓役期折抵)</option>
            </optgroup>
        `;
    }

    if ([...select.options].some(o => o.value === currentVal)) {
        select.value = currentVal;
    }
}

function onCCEPCollegeChange() {
    const colSelect = document.getElementById('ccepCollegeSelect');
    const deptSelect = document.getElementById('ccepTargetDeptSelect');
    if (!colSelect || !deptSelect) return;

    const colName = colSelect.value;
    const matched = NCKU_DEPARTMENTS_CATALOG.find(c => c.college === colName);
    const depts = matched ? matched.depts : [];

    deptSelect.innerHTML = depts.map(d => `<option value="${d}">${d}</option>`).join('');

    appData.ccepCollege = colName;
    appData.ccepTargetDept = deptSelect.value;

    onCCEPTargetDeptChange();
}

function onCCEPTargetDeptChange() {
    const deptSelect = document.getElementById('ccepTargetDeptSelect');
    const alertEl = document.getElementById('ccepExcludedDegreeAlert');
    if (!deptSelect) return;

    const selectedDept = deptSelect.value;
    appData.ccepTargetDept = selectedDept;

    const isExcluded = CCEP_EXCLUDED_DEPTS.some(ex => selectedDept.includes(ex));
    if (alertEl) {
        alertEl.style.display = isExcluded ? 'inline-flex' : 'none';
    }

    saveData();
    updateAppUI();
}

const DeptCombobox = {
    init() {
        const input = document.getElementById('deptComboboxInput');
        const wrap = document.getElementById('deptComboboxWrap');
        if (!input || !wrap) return;

        input.addEventListener('focus', () => {
            wrap.classList.add('open');
            this.renderList(input.value.trim());
        });

        input.addEventListener('input', (e) => {
            wrap.classList.add('open');
            this.renderList(e.target.value.trim());
            updateConfig();
        });

        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) {
                wrap.classList.remove('open');
            }
        });
    },

    toggle() {
        const wrap = document.getElementById('deptComboboxWrap');
        const input = document.getElementById('deptComboboxInput');
        if (!wrap || !input) return;
        wrap.classList.toggle('open');
        if (wrap.classList.contains('open')) {
            this.renderList(input.value.trim());
            input.focus();
        }
    },

    renderList(keyword = '') {
        const dropdown = document.getElementById('deptComboboxDropdown');
        if (!dropdown) return;

        const lowKey = keyword.toLowerCase().trim();
        let html = '';
        let matchCount = 0;

        const aliasesMap = (typeof DEPARTMENT_ALIASES !== 'undefined') ? DEPARTMENT_ALIASES : {};

        NCKU_DEPARTMENTS_CATALOG.forEach(group => {
            const matchedDepts = group.depts.filter(d => {
                if (!lowKey) return true;
                if (d.toLowerCase().includes(lowKey)) return true;
                if (d.replace(/學系|系|學士學位學程|\s|\(|\)|（|）/g, '').toLowerCase().includes(lowKey)) return true;
                const aliases = aliasesMap[d] || [];
                return aliases.some(alias => alias.toLowerCase().includes(lowKey) || lowKey.includes(alias.toLowerCase()));
            });

            if (matchedDepts.length > 0) {
                html += `<div class="tf-combobox-group-title">${group.college}</div>`;
                matchedDepts.forEach(d => {
                    matchCount++;
                    html += `<div class="tf-combobox-item" onclick="DeptCombobox.selectDept('${d}')">${d}</div>`;
                });
            }
        });

        if (matchCount === 0) {
            html += `<div style="padding:6px 8px; font-size:0.72rem; color:var(--tf-text-muted);">查無官方科系，將採自訂規則</div>`;
        }

        html += `<div class="tf-combobox-item custom-opt" onclick="DeptCombobox.selectCustom()">＋ 自訂其他科系／組別</div>`;
        dropdown.innerHTML = html;
    },

    selectDept(name) {
        const input = document.getElementById('deptComboboxInput');
        const wrap = document.getElementById('deptComboboxWrap');
        if (input) input.value = name;
        if (wrap) wrap.classList.remove('open');
        updateConfig();
    },

    selectCustom() {
        const input = document.getElementById('deptComboboxInput');
        const wrap = document.getElementById('deptComboboxWrap');
        if (input) {
            input.value = '自訂科系';
            input.focus();
            input.select();
        }
        if (wrap) wrap.classList.remove('open');
        updateConfig();
    }
};

function updateCheckerCard(cardId, earnedVal, expectedVal, targetVal, isPassedCondition = true) {
    const card = document.getElementById(cardId);
    if (!card) return;

    if (targetVal !== undefined && targetVal !== null && !isNaN(targetVal)) {
        if (earnedVal >= targetVal && isPassedCondition) {
            card.className = 'checker-card passed-status';
        } else if (expectedVal >= targetVal && isPassedCondition) {
            card.className = 'checker-card planned-status';
        } else {
            card.className = 'checker-card failed-status';
        }
    }
}

function updatePlanSemesterGradeStats(data) {
    if (!data) return;
    const currentSem = data.currentSemester || '一上';
    const courses = (data.semesters && data.semesters[currentSem]) || [];
    let semGpaCredits = 0, semGpaSum = 0, semWeightedSum = 0;

    courses.forEach(c => {
        const cred = parseFloat(c.credits) || 0;
        const isTentative = !!c.isTentative;
        const isInProgress = (c.status === '修讀中');

        if (!isTentative && !isInProgress && c.score !== null && c.score !== undefined && cred > 0) {
            const courseScore = parseFloat(c.score) || 0;
            const gp = (typeof getGradePoint === 'function') ? getGradePoint(courseScore) : 0;
            semGpaCredits += cred;
            semGpaSum += (gp * cred);
            semWeightedSum += (courseScore * cred);
        }
    });

    const semGpa = semGpaCredits > 0 ? (semGpaSum / semGpaCredits).toFixed(2) : '0.00';
    const semWeighted = semGpaCredits > 0 ? (semWeightedSum / semGpaCredits).toFixed(1) : '0.0';

    const statGpaEl = document.getElementById('statSemGpa');
    const statWeightedEl = document.getElementById('statSemWeighted');
    if (statGpaEl) statGpaEl.innerText = semGpa;
    if (statWeightedEl) statWeightedEl.innerText = `${semWeighted} 分`;
}

function renderGraduationUI(res, data) {
    if (!res) return;

    const isCCEP = !!res.isInterdisciplinary;
    updateCourseTypeOptions(isCCEP);

    const ccepWrap = document.getElementById('ccepSpecializationWrap');
    if (ccepWrap) {
        ccepWrap.style.display = isCCEP ? 'flex' : 'none';
        if (isCCEP) {
            const colSel = document.getElementById('ccepCollegeSelect');
            const deptSel = document.getElementById('ccepTargetDeptSelect');
            if (colSel && !colSel.value) {
                colSel.value = appData.ccepCollege || '工學院';
                onCCEPCollegeChange();
            }
            if (deptSel && appData.ccepTargetDept) {
                deptSel.value = appData.ccepTargetDept;
            }
        }
    }

    // 依據修業年限（4/5/6 年）動態計算並展示精準級數
    const titleEl = document.getElementById('deptNameTitle');
    if (titleEl) {
        const rawName = res.deptName || '自訂科系';
        const studyYears = res.studyYears || 4;
        const classYear = getGraduationClassYear(res.entryYear || 118, studyYears);
        const yearStr = `${classYear} 級`;
        const displayDept = rawName.includes(yearStr) ? rawName : `${rawName} ${yearStr}`;
        titleEl.innerText = `（ ${displayDept} ）`;
    }

    const pBar = document.getElementById('gradProgressBar');
    if (pBar) pBar.style.width = `${res.total.percentage}%`;

    const pPercent = document.getElementById('gradProgressPercent');
    if (pPercent) pPercent.innerText = `${res.total.rawPercent}%`;

    const cumGpaBadge = document.getElementById('gradCumGpaBadge');
    if (cumGpaBadge && res.grades) {
        cumGpaBadge.innerHTML = `歷年 GPA: <b>${res.grades.cumGpa}</b> ｜ 加權 <b>${res.grades.cumWeighted}</b> 分`;
    }

    // 🌟 修正進度文字：結構化 span 保護，不被擠壓換行
    const pText = document.getElementById('gradProgressText');
    if (pText) {
        pText.innerHTML = `
            <span class="prog-stat-item">實得 <b style="color:var(--tf-status-success-light);">${res.total.earned}</b></span>
            <span class="prog-stat-divider">/</span>
            <span class="prog-stat-item">預計 <b style="color:var(--tf-color-primary-light);">${res.total.expected}</b></span>
            <span class="prog-stat-divider">/</span>
            <span class="prog-stat-item">主系目標 <b>${res.total.target}</b></span>
        `;
    }

    const reqCard = document.getElementById('card-req');
    const elecCard = document.getElementById('card-elec');
    const ccepFreeCard = document.getElementById('card-ccep-free');
    const crossCard = document.getElementById('card-cross');
    const secTitle = document.getElementById('sectionCoreTitle');

    if (isCCEP && res.ccepData) {
        const c = res.ccepData;
        if (secTitle) secTitle.innerText = '專業學分與專長養成 (全校不分系)';

        if (reqCard) {
            reqCard.querySelector('#t-req-title').innerText = '專長養成 (院核心/輔系)';
            document.getElementById('e-req').innerText = c.facultyExp;
            document.getElementById('v-req').innerText = c.facultyCreds;
            document.getElementById('t-req').innerText = `目標: 50 學分 (${appData.ccepCollege || '單一學院'})`;
            updateCheckerCard('card-req', c.facultyCreds, c.facultyExp, 50);
        }

        if (elecCard) {
            elecCard.querySelector('#t-elec-title').innerText = '不分系核心課程';
            const coreTotal = c.careerEarned + c.methodologyCreds + c.projectCreds;
            const coreExp = c.careerExp + c.methodologyExp + c.projectExp;
            document.getElementById('e-elec').innerText = coreExp;
            document.getElementById('v-elec').innerText = coreTotal;
            document.getElementById('t-elec').innerText = `核心目標: 18 學分`;
            document.getElementById('elec-sub-info').innerHTML = `
                自我職涯探索: ${c.careerEarned}/1 學分<br>
                專題方法論: ${c.methodologyCount}/3門 (${c.methodologyCreds}/8學分)<br>
                跨領域專題: ${c.projectCreds}/9 學分 (一~三)
            `;
            updateCheckerCard('card-elec', coreTotal, coreExp, 18, (c.careerEarned >= 1 && c.methodologyCount >= 3 && c.projectCreds >= 9));
        }

        if (ccepFreeCard) {
            ccepFreeCard.style.display = 'flex';
            document.getElementById('e-ccep-free').innerText = c.freeExp;
            document.getElementById('v-ccep-free').innerText = c.freeEarned;
            updateCheckerCard('card-ccep-free', c.freeEarned, c.freeExp, 32);
        }
        if (crossCard) crossCard.style.display = 'none';

    } else {
        if (secTitle) secTitle.innerText = '專業學分與修業門檻';
        if (ccepFreeCard) ccepFreeCard.style.display = 'none';

        if (reqCard) {
            reqCard.querySelector('#t-req-title').innerText = '系定必修學分';
            document.getElementById('e-req').innerText = res.required.expected;
            document.getElementById('v-req').innerText = res.required.earned;
            document.getElementById('t-req').innerText = `目標: ${res.required.target}`;
            updateCheckerCard('card-req', res.required.earned, res.required.expected, res.required.target);
        }

        if (elecCard) {
            elecCard.querySelector('#t-elec-title').innerText = '系定選修學分';
            document.getElementById('e-elec').innerText = res.elective.expectedRaw;
            document.getElementById('v-elec').innerText = res.elective.earnedRaw;
            document.getElementById('t-elec').innerText = `目標: ${res.elective.target}`;
            updateCheckerCard('card-elec', res.elective.earnedRaw, res.elective.expectedRaw, res.elective.target, res.elective.isPassed);

            let outWarning = res.elective.outElective.isOver 
                ? `<span style="color:var(--tf-status-warning-light, #f59e0b); font-size:0.7rem; font-weight:600;">(外系超標 ${res.elective.outElective.overflow} 學分不計)</span>` 
                : "";
            let reqElecWarning = !res.elective.reqElective.isPassed 
                ? `<span style="color:var(--tf-status-danger-light, #ef4444); font-size:0.7rem; font-weight:600;">${Icons.get('warning', { size: 12 })} 必選修尚缺 ${(res.elective.reqElective.target - res.elective.reqElective.earned)} 學分</span>` 
                : "";
            
            document.getElementById('elec-sub-info').innerHTML = `本系選修: ${res.elective.deptEarned}<br>必選修: ${res.elective.reqElective.earned}/${res.elective.reqElective.target} ${reqElecWarning}<br>外系選修: ${res.elective.outElective.raw}/${res.elective.outElective.max} ${outWarning}`;
        }

        const cross = res.crossMajor || {};
        const isCrossActive = !!cross.enabled;
        const crossLabel = isCrossActive ? (cross.name || cross.type || '雙主修') : '跨領域';

        const optCrossReq = document.getElementById('optCrossReq');
        const optCrossElec = document.getElementById('optCrossElec');
        if (optCrossReq) {
            optCrossReq.style.display = isCrossActive ? '' : 'none';
            optCrossReq.innerText = `${crossLabel}-必修`;
        }
        if (optCrossElec) {
            optCrossElec.style.display = isCrossActive ? '' : 'none';
            optCrossElec.innerText = `${crossLabel}-選修`;
        }

        if (crossCard) {
            if (isCrossActive) {
                crossCard.style.display = 'flex';
                const titleEl = document.getElementById('t-cross-title');
                if (titleEl) titleEl.innerText = `${cross.name} (${cross.type})`;
                document.getElementById('e-cross').innerText = cross.expectedTotal;
                document.getElementById('v-cross').innerText = cross.earnedTotal;
                document.getElementById('t-cross-target').innerText = `目標: ${cross.target}`;
                document.getElementById('cross-sub-info').innerHTML = `必修: ${cross.reqEarned} (預計:${cross.reqExpected}) ｜ 選修: ${cross.elecEarned} (預計:${cross.elecExpected})`;
                updateCheckerCard('card-cross', cross.earnedTotal, cross.expectedTotal, cross.target, cross.isPassed);
            } else {
                crossCard.style.display = 'none';
            }
        }
    }

    // 免責卡提示文字
    const noteBody = document.getElementById('deptWarningNoteBody');
    if (noteBody) {
        if (res.deptRuleNotices && res.deptRuleNotices.length > 0) {
            noteBody.innerHTML = res.deptRuleNotices.map(n => `<div style="margin-bottom:4px; line-height:1.45;">• ${n}</div>`).join('');
        } else {
            const studyYears = res.studyYears || 4;
            const classYear = getGraduationClassYear(res.entryYear || 118, studyYears);
            noteBody.innerHTML = `已套用 <b>${res.deptName}（${classYear} 級）</b> 最新官方標準規章，請依修課手冊指引完成選課。`;
        }
    }

    // 通識教育卡片
    const combinedCard = document.getElementById('card-gen-combined');
    if (combinedCard) {
        document.getElementById('e-gen-total').innerText = res.generalEducation.effectiveExpected;
        document.getElementById('v-gen-total').innerText = res.generalEducation.effectiveEarned;

        const maxExpEl = document.getElementById('max-gen-expected');
        const maxEarnEl = document.getElementById('max-gen-earned');
        if (maxExpEl) maxExpEl.innerText = res.generalEducation.target;
        if (maxEarnEl) maxEarnEl.innerText = res.generalEducation.target;

        const reqDomCount = res.generalEducation.domain.requiredDomains || 3;
        document.getElementById('t-gen-summary').innerText = `基本門檻：領域 ≥ 4 (跨${reqDomCount}領域) ｜ 融合 ≥ 1 ｜ 總目標 19 學分`;
        
        if (res.generalEducation.isAllPassed) {
            combinedCard.className = 'checker-card passed-status';
        } else if (res.generalEducation.isAllExpectedPassed) {
            combinedCard.className = 'checker-card planned-status';
        } else {
            combinedCard.className = 'checker-card failed-status';
        }

        let waivedNotice = '';
        if (res.english.waived > 0) {
            if (res.english.requiresSubstitution) {
                waivedNotice = `<div style="color:var(--tf-color-primary-light); font-weight:var(--tf-weight-medium); font-size:0.75rem; margin-bottom:6px; background:var(--tf-color-primary-subtle); border:1px solid var(--tf-color-primary-border); padding:4px 8px; border-radius:var(--tf-radius-sm); text-align:left;">${Icons.get('info', { size: 13 })} 英文已免修 ${res.english.waived} 學分（通識修讀目標增至 ${res.generalEducation.target} 學分）</div>`;
            } else {
                waivedNotice = `<div style="color:var(--tf-status-success-light); font-weight:var(--tf-weight-medium); font-size:0.75rem; margin-bottom:6px; background:var(--tf-status-success-bg); border:1px solid var(--tf-status-success-border); padding:4px 8px; border-radius:var(--tf-radius-sm); text-align:left;">${Icons.get('check', { size: 13 })} 英文已抵免 ${res.english.waived} 學分</div>`;
            }
        }

        const domainPlanned = (res.generalEducation.domain.expected >= 4 && res.generalEducation.domain.activeDomainsExpected >= reqDomCount);
        const domainPassIco = res.generalEducation.domain.isPassed 
            ? Icons.get('check', { size: 14, className: 'text-success' }) 
            : (domainPlanned ? Icons.get('clock', { size: 14, style: 'color:var(--tf-color-primary-light);' }) : Icons.get('clock', { size: 14, className: 'text-muted' }));

        const rongPlanned = (res.generalEducation.rong.expected >= 1);
        const rongPassIco = res.generalEducation.rong.isPassed 
            ? Icons.get('check', { size: 14, className: 'text-success' }) 
            : (rongPlanned ? Icons.get('clock', { size: 14, style: 'color:var(--tf-color-primary-light);' }) : Icons.get('clock', { size: 14, className: 'text-muted' }));

        const secondLangText = res.generalEducation.secondLangCredits > 0 ? ` ｜ 二外: ${res.generalEducation.secondLangCredits}` : '';

        function formatDomainPill(rawEarned, rawExp, cap) {
            const exp = rawExp ?? rawEarned ?? 0;
            const earned = rawEarned ?? 0;

            if (cap === 0 && exp > 0) {
                return `<span style="text-decoration:line-through; color:var(--tf-text-disabled);" title="本系不採計">${exp} (不採計)</span>`;
            }
            if (exp > cap) {
                return `${Math.min(earned, cap)} <span style="color:var(--tf-status-warning-light, #f59e0b); font-weight:600; font-size:0.7rem;" title="預計修讀 ${exp} 學分，採計上限 ${cap}">(${exp}超標)</span>`;
            }
            if (exp > earned) {
                return `${earned} <span style="color:var(--tf-color-primary-light); font-weight:600; font-size:0.7rem;" title="實得 ${earned}，預計 ${exp}">(${exp})</span>`;
            }
            return `${earned}`;
        }

        const dDet = res.generalEducation.domain.details;
        const humanText  = formatDomainPill(dDet.human, dDet.humanExp, dDet.humanCap);
        const socialText = formatDomainPill(dDet.social, dDet.socialExp, dDet.socialCap);
        const bioText    = formatDomainPill(dDet.bio, dDet.bioExp, dDet.bioCap);
        const interText  = formatDomainPill(dDet.inter, dDet.interExp, dDet.interCap);
        const natureText = formatDomainPill(dDet.nature, dDet.natureExp, dDet.natureCap);

        const domainExpText = (res.generalEducation.domain.expected > res.generalEducation.domain.earned) 
            ? ` <span style="color:var(--tf-color-primary-light); font-weight:600;">(預計 ${res.generalEducation.domain.expected})</span>` 
            : '';
        const domainActiveExpText = (res.generalEducation.domain.activeDomainsExpected > res.generalEducation.domain.activeDomains)
            ? `(預計 ${res.generalEducation.domain.activeDomainsExpected})`
            : '';

        const rongExpText = (res.generalEducation.rong.expected > res.generalEducation.rong.capped)
            ? ` <span style="color:var(--tf-color-primary-light); font-weight:600;">(預計 ${res.generalEducation.rong.expected})</span>`
            : '';

        let warningsHtml = '';
        if (res.warnings && res.warnings.length > 0) {
            warningsHtml = res.warnings.map(w => {
                const isWarning = (typeof w === 'object' && w.type === 'warning');
                const text = typeof w === 'object' ? w.text : w;
                const color = isWarning ? 'var(--tf-status-warning-light, #f59e0b)' : 'var(--tf-status-danger-light, #ef4444)';
                return `<div style="color:${color}; display:flex; align-items:flex-start; gap:4px; font-size:0.74rem; line-height:1.45; text-align:left;">
                    <span>•</span>
                    <span>${text}</span>
                </div>`;
            }).join('');
        }

        let passNotice = '';
        if (res.generalEducation.isAllPassed) {
            passNotice = `<div style="color:var(--tf-status-success-light); font-weight:bold; font-size:0.75rem; text-align:left; display:flex; align-items:center; gap:4px; margin-top:6px;">${Icons.get('check', { size: 14 })} 通識修業條件已全數達標</div>`;
        } else if (res.generalEducation.isAllExpectedPassed) {
            passNotice = `<div style="color:var(--tf-color-primary-light); font-weight:bold; font-size:0.75rem; text-align:left; display:flex; align-items:center; gap:4px; margin-top:6px;">${Icons.get('clock', { size: 14 })} 通識修業條件預計達標</div>`;
        }

        const warningsDisplay = warningsHtml 
            ? `<div style="display:flex; flex-direction:column; gap:3px; margin-top:6px;">${warningsHtml}</div>` 
            : passNotice;

        document.getElementById('gen-combined-details').innerHTML = `
            ${waivedNotice}
            <div style="font-size:0.78rem; display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span><b style="color:var(--tf-text-primary);">領域通識：</b>實得 <b>${res.generalEducation.domain.earned}</b>${domainExpText} / ${res.generalEducation.domain.max} 學分 <span style="color:var(--tf-text-muted); font-size:0.72rem;">(跨${reqDomCount}領域: ${res.generalEducation.domain.activeDomains}${domainActiveExpText}/${reqDomCount}${secondLangText})</span></span>
                    <span>${domainPassIco}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span><b style="color:var(--tf-text-primary);">融合通識：</b>實得 <b>${res.generalEducation.rong.capped}</b>${rongExpText} / ${res.generalEducation.rong.max} 學分</span>
                    <span>${rongPassIco}</span>
                </div>
            </div>
            
            <div style="color:var(--tf-text-secondary); font-size:0.72rem; background:var(--tf-surface-sunken); border:1px solid var(--tf-border-subtle); padding:6px 10px; border-radius:var(--tf-radius-sm); line-height:1.55; margin-bottom:6px; text-align:left;">
                <div>人文: ${humanText} ｜ 社科: ${socialText} ｜ 生醫: ${bioText}</div>
                <div>科際: ${interText} ｜ 自然: ${natureText}</div>
            </div>

            ${warningsDisplay}
        `;

        // 🌟 自動繪製通識五角平衡雷達圖
        if (typeof renderGenRadarChart === 'function' && res.generalEducation?.domain?.details) {
            renderGenRadarChart(res.generalEducation.domain.details, res.generalEducation.domain.details);
        }
    }

    // 8. 國文、英文、踏溯、體育
    document.getElementById('e-chinese').innerText = res.chinese.expected; 
    document.getElementById('v-chinese').innerText = res.chinese.earned; 
    updateCheckerCard('card-chinese', res.chinese.earned, res.chinese.expected, res.chinese.target);

    const chineseCard = document.getElementById('card-chinese');
    if (chineseCard) {
        let cNoteEl = document.getElementById('chinese-sub-note');
        if (!cNoteEl) {
            cNoteEl = document.createElement('div');
            cNoteEl.id = 'chinese-sub-note';
            cNoteEl.style.cssText = 'font-size:0.65rem; color:var(--tf-color-primary-light); margin-top:4px; line-height:1.3; text-align:center;';
            chineseCard.appendChild(cNoteEl);
        }
        cNoteEl.innerText = res.chinese.note || '';
        cNoteEl.style.display = res.chinese.note ? 'block' : 'none';
    }

    document.getElementById('e-english').innerText = res.english.expected; 
    document.getElementById('v-english').innerText = res.english.earned; 
    const engCard = document.getElementById('card-english');
    if (engCard) {
        if (res.english.isPassed) {
            engCard.className = 'checker-card passed-status';
        } else if (res.english.expected >= res.english.target) {
            engCard.className = 'checker-card planned-status';
        } else {
            engCard.className = 'checker-card failed-status';
        }

        let targetText = `目標: ${res.english.target}`;
        if (res.english.waived === 4) targetText = '目標: 0 (全免修)';
        else if (res.english.waived === 2) targetText = '目標: 2 (免修2學分)';

        if (res.english.isEnglishThresholdPassed) {
            targetText += ` ｜ ${Icons.get('check', { size: 12, className: 'text-success' })} 英檢達標`;
        }
        document.getElementById('t-english').innerHTML = targetText;

        let eNoteEl = document.getElementById('english-sub-note');
        if (!eNoteEl) {
            eNoteEl = document.createElement('div');
            eNoteEl.id = 'english-sub-note';
            eNoteEl.style.cssText = 'font-size:0.65rem; color:var(--tf-color-primary-light); margin-top:4px; line-height:1.3; text-align:center;';
            engCard.appendChild(eNoteEl);
        }
        eNoteEl.innerText = res.english.note || '';
        eNoteEl.style.display = res.english.note ? 'block' : 'none';
    }

    document.getElementById('e-tainan').innerText = res.tainan.expected; 
    document.getElementById('v-tainan').innerText = res.tainan.earned; 
    updateCheckerCard('card-tainan', res.tainan.earned, res.tainan.expected, res.tainan.target);
    
    document.getElementById('e-pe').innerText = res.pe.expected; 
    document.getElementById('v-pe').innerText = res.pe.earned; 
    updateCheckerCard('card-pe', res.pe.earned, res.pe.expected, res.pe.target);

    // 9. 服務學習
    const sCard = document.getElementById('card-service');
    if (sCard && res.serviceLearning) {
        document.getElementById('e-service').innerText = res.serviceLearning.expected;
        document.getElementById('v-service').innerText = res.serviceLearning.earned;
        const tExp = document.getElementById('t-service-exp');
        const tAct = document.getElementById('t-service-act');
        const tNote = document.getElementById('t-service-note');

        if (res.serviceLearning.required) {
            if (tExp) tExp.innerText = '3';
            if (tAct) tAct.innerText = '3';
            if (tNote) tNote.innerText = '目標: 3 門 (一~三)';
            
            if (res.serviceLearning.isPassed) {
                sCard.className = 'checker-card passed-status';
            } else if (res.serviceLearning.expected >= res.serviceLearning.target) {
                sCard.className = 'checker-card planned-status';
            } else {
                sCard.className = 'checker-card failed-status';
            }
        } else {
            if (tExp) tExp.innerText = '0';
            if (tAct) tAct.innerText = '0';
            if (tNote) tNote.innerText = '118級起免修 (已廢除門檻)';
            sCard.className = 'checker-card passed-status';
        }
    }

    // 10. 全民國防 (軍訓)
    const milCard = document.getElementById('card-military');
    if (milCard && res.military) {
        document.getElementById('e-military').innerText = res.military.expectedCount;
        document.getElementById('v-military').innerText = res.military.earnedCount;
        document.getElementById('t-military-days').innerHTML = `可抵兵役 <b style="color:var(--tf-status-success-light); font-size:0.85rem;">${res.military.earnedDays}</b> 天 <span style="font-size:0.68rem; color:var(--tf-text-muted);">(上限 22 天)</span>`;

        if (res.military.earnedCount > 0) {
            milCard.className = 'checker-card passed-status';
        } else if (res.military.expectedCount > 0) {
            milCard.className = 'checker-card planned-status';
        } else {
            milCard.className = 'checker-card';
        }
    }

    updatePlanSemesterGradeStats(data);
    syncConfigFormInputs(data, res);
}

function updateConfig() {
    const input = document.getElementById('deptComboboxInput');
    const deptName = (input ? input.value.trim() : '') || '電機工程學系';
    const selectedYear = parseInt(document.getElementById('entryYearSelect').value, 10) || 118;

    appData.deptName = deptName;
    appData.entryYear = selectedYear;

    const rule = (typeof getDepartmentGraduationRule === 'function')
        ? getDepartmentGraduationRule(deptName, selectedYear, appData)
        : null;

    let studyYears = 4;
    if (rule && rule.studyYears) {
        studyYears = rule.studyYears;
    } else if (deptName.includes('醫學系') || deptName.includes('牙醫') || deptName.includes('藥學')) {
        studyYears = 6;
    } else if (deptName.includes('五年制')) {
        studyYears = 5;
    }

    ensureSemestersForYears(appData, studyYears);

    if (rule && !rule.isCustom) {
        appData.targetCredits = rule.targetCredits;
        appData.targetRequired = rule.requiredCredits;
        appData.targetReqElective = rule.requiredElectiveCredits;
        appData.targetElective = rule.electiveCredits;
        appData.maxOutElective = rule.maxOutsideDeptElective;
    } else {
        appData.targetCredits = parseFloat(document.getElementById('gradTargetInput').value) || 128;
        appData.targetRequired = parseFloat(document.getElementById('reqTargetInput').value) || 60;
        appData.targetReqElective = parseFloat(document.getElementById('reqElecTargetInput').value) || 0;
        appData.targetElective = parseFloat(document.getElementById('elecTargetInput').value) || 40;
        appData.maxOutElective = parseFloat(document.getElementById('outMaxInput').value) || 0;
    }

    appData.englishWaived = parseInt(document.getElementById('englishWaivedSelect').value, 10) || 0;
    saveData();
    
    if (typeof renderSemesterSelect === 'function') {
        renderSemesterSelect();
    }
    updateAppUI();
}

function syncConfigFormInputs(data, res) {
    if (!data) return;

    const isCustom = res ? !!res.isCustom : false;
    
    const input = document.getElementById('deptComboboxInput');
    if (input && document.activeElement !== input) {
        input.value = data.deptName || '電機工程學系';
    }

    const entryYearSelect = document.getElementById('entryYearSelect');
    if (entryYearSelect) entryYearSelect.value = String(data.entryYear || 118);

    const targetFields = [
        { id: 'gradTargetInput', val: res?.total?.target ?? data.targetCredits },
        { id: 'reqTargetInput', val: res?.required?.target ?? data.targetRequired },
        { id: 'reqElecTargetInput', val: res?.elective?.reqElective?.target ?? data.targetReqElective },
        { id: 'elecTargetInput', val: res?.elective?.target ?? data.targetElective },
        { id: 'outMaxInput', val: res?.elective?.outElective?.max ?? data.maxOutElective }
    ];

    targetFields.forEach(f => {
        const fieldEl = document.getElementById(f.id);
        if (fieldEl) {
            if (document.activeElement !== fieldEl) {
                fieldEl.value = f.val ?? 0;
            }
            fieldEl.disabled = !isCustom;
            fieldEl.style.opacity = !isCustom ? '0.85' : '1';
            fieldEl.style.cursor = !isCustom ? 'not-allowed' : 'text';
            fieldEl.title = !isCustom ? '官方規則自動帶入（唯讀）' : '點擊自訂學分門檻';
        }
    });

    const waivedSelect = document.getElementById('englishWaivedSelect');
    if (waivedSelect) waivedSelect.value = String(data.englishWaived || 0);

    if (data.crossMajor) {
        const cTypeSel = document.getElementById('crossTypeSelect');
        const cNameIn = document.getElementById('crossNameInput');
        const cTargetIn = document.getElementById('crossTargetInput');
        if (cTypeSel) cTypeSel.value = data.crossMajor.type || 'none';
        if (cNameIn) {
            cNameIn.value = data.crossMajor.name || '';
            cNameIn.style.display = data.crossMajor.type !== 'none' ? 'inline-block' : 'none';
        }
        if (cTargetIn) {
            cTargetIn.value = data.crossMajor.target || getCrossMajorDefaultTarget(data.crossMajor.type);
            cTargetIn.style.display = data.crossMajor.type !== 'none' ? 'inline-block' : 'none';
        }
    }
}

function toggleEnglishThreshold() {
    appData.englishPassed = document.getElementById('englishPassedCB').checked;
    saveData();
    updateAppUI();
}

function updateCrossConfig() {
    const crossType = document.getElementById('crossTypeSelect').value;
    const nameInput = document.getElementById('crossNameInput');
    const targetInput = document.getElementById('crossTargetInput');

    appData.crossMajor.type = crossType;
    
    if (crossType !== 'none') {
        nameInput.style.display = 'inline-block';
        targetInput.style.display = 'inline-block';

        if (!appData.crossMajor.target || [40, 20, 15].includes(appData.crossMajor.target)) {
            appData.crossMajor.target = getCrossMajorDefaultTarget(crossType);
        }

        appData.crossMajor.name = nameInput.value || (crossType === '雙主修' ? '加修學系' : '輔修學系');
        appData.crossMajor.target = parseFloat(targetInput.value) || appData.crossMajor.target;
    } else {
        nameInput.style.display = 'none';
        targetInput.style.display = 'none';
    }

    saveData();
    updateAppUI();
}

function toggleGradConfig() {
    const configArea = document.getElementById('gradConfigArea');
    const icon = document.getElementById('configCollapseIcon');
    if (configArea) {
        configArea.classList.toggle('collapsed');
        const isCollapsed = configArea.classList.contains('collapsed');
        if (icon) {
            icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        }
        localStorage.setItem('nckuee_grad_config_collapsed', isCollapsed ? '1' : '0');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    DeptCombobox.init();

    const isCollapsed = localStorage.getItem('nckuee_grad_config_collapsed');
    const configArea = document.getElementById('gradConfigArea');
    const icon = document.getElementById('configCollapseIcon');
    if (configArea && isCollapsed === '1') {
        configArea.classList.add('collapsed');
        if (icon) icon.style.transform = 'rotate(-90deg)';
    }
});