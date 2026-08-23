// ============================================================
// 🎓 Graduation UI 畢業檢核與門檻視覺化模組 (Fixed & Enhanced)
// ============================================================

let selectedGradSemester = null;

// 輔助函式：切換檢核卡片狀態（三態判定：已達標 passed / 規劃與修讀中 planned / 未達標 failed）
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

/**
 * 🌟 獨立計算特定學期的成績統計 (不產生全域副作用)
 */
function updateGradSemesterScoreCard(targetSem, data) {
    const courses = (data.semesters && data.semesters[targetSem]) || [];
    let semGpaCredits = 0, semGpaSum = 0, semWeightedSum = 0;
    let selectedCreds = 0, earnedCreds = 0;

    courses.forEach(c => {
        const cred = parseFloat(c.credits) || 0;
        const isTentative = !!c.isTentative;
        const isPassed = (c.status === '已取得');
        const isInProgress = (c.status === '修讀中');

        if (!isTentative) {
            selectedCreds += cred;
            if (isPassed) earnedCreds += cred;

            if (!isInProgress && c.score !== null && c.score !== undefined && cred > 0) {
                const gp = typeof getGradePoint === 'function' ? getGradePoint(c.score) : 0;
                semGpaCredits += cred;
                semGpaSum += (gp * cred);
                semWeightedSum += (c.score * cred);
            }
        }
    });

    const semGpa = semGpaCredits > 0 ? (semGpaSum / semGpaCredits).toFixed(2) : '0.00';
    const semWeighted = semGpaCredits > 0 ? (semWeightedSum / semGpaCredits).toFixed(1) : '0.0';

    const semGpaEl = document.getElementById('v-sem-gpa');
    const semWeightedEl = document.getElementById('v-sem-weighted');
    const semCreditsEl = document.getElementById('v-sem-credits');

    if (semGpaEl) semGpaEl.innerText = semGpa;
    if (semWeightedEl) semWeightedEl.innerText = `加權: ${semWeighted} 分`;
    if (semCreditsEl) semCreditsEl.innerText = `實得 ${earnedCreds} / 總選 ${selectedCreds} 學分`;
}

function renderGraduationUI(res, data) {
    if (!res) return;

    // 1. 科系名稱與入學級別標題
    const titleEl = document.getElementById('deptNameTitle');
    if (titleEl) {
        const rawName = res.deptName || '成大電機';
        const yearStr = `${res.entryYear || 118} 級`;
    // 若名稱內已包含該級別，則不重複串接
        const displayDept = rawName.includes(yearStr) ? rawName : `${rawName} ${yearStr}`;
        titleEl.innerText = `（ ${displayDept} ）`;
    }

    // 2. 進度條與百分比
    const pBar = document.getElementById('gradProgressBar');
    if (pBar) pBar.style.width = `${res.total.percentage}%`;

    const pPercent = document.getElementById('gradProgressPercent');
    if (pPercent) pPercent.innerText = `${res.total.rawPercent}%`;

    const pText = document.getElementById('gradProgressText');
    if (pText) {
        let crossMajorNote = (res.crossMajor && res.crossMajor.enabled) 
            ? ` ｜ <b>${res.crossMajor.type} (${res.crossMajor.name})</b>: 實得 <span style="color:var(--tf-color-primary-light);">${res.crossMajor.earnedTotal}</span> / 預計 <span style="color:var(--tf-color-primary-light);">${res.crossMajor.expectedTotal}</span> (目標 ${res.crossMajor.target})` 
            : '';
        pText.innerHTML = `實際取得 <b style="color:var(--tf-status-success-light);">${res.total.earned}</b> / 預計取得 <b style="color:var(--tf-color-primary-light);">${res.total.expected}</b> (主系目標 <b>${res.total.target}</b>)${crossMajorNote}`;
    }

    // 3. 必修卡片 (P2: 帶入 expected)
    document.getElementById('e-req').innerText = res.required.expected;
    document.getElementById('v-req').innerText = res.required.earned;
    document.getElementById('t-req').innerText = `目標: ${res.required.target}`;
    updateCheckerCard('card-req', res.required.earned, res.required.expected, res.required.target);

    // 4. 選修卡片 (P2: 帶入 expectedRaw)
    document.getElementById('e-elec').innerText = res.elective.expectedRaw;
    document.getElementById('v-elec').innerText = res.elective.earnedRaw;
    document.getElementById('t-elec').innerText = `目標: ${res.elective.target}`;
    updateCheckerCard('card-elec', res.elective.earnedRaw, res.elective.expectedRaw, res.elective.target, res.elective.isPassed);

    let outWarning = res.elective.outElective.isOver 
        ? `<span class="warning-text">${Icons.get('warning', { size: 12 })} 外系超標，${res.elective.outElective.overflow} 學分不計畢業</span>` 
        : "";
    let reqElecWarning = !res.elective.reqElective.isPassed 
        ? `<span class="warning-text">${Icons.get('warning', { size: 12 })} 必選修尚缺 ${(res.elective.reqElective.target - res.elective.reqElective.earned)} 學分</span>` 
        : "";
    let elecOverflowNote = res.elective.expectedRaw > res.elective.target 
        ? `<span style="color:var(--tf-text-muted); font-size:0.68rem;">(選修超出目標 ${res.elective.expectedRaw - res.elective.target} 學分不計畢業)</span><br>` 
        : "";
    
    document.getElementById('elec-sub-info').innerHTML = `本系選修: ${res.elective.deptEarned}<br>必選修: ${res.elective.reqElective.earned}/${res.elective.reqElective.target} ${reqElecWarning}<br>外系選修: ${res.elective.outElective.raw}/${res.elective.outElective.max} ${outWarning}<br>${elecOverflowNote}`;

    // 5. 跨領域修業卡片與排課選單動態連動
    const crossCard = document.getElementById('card-cross');
    const optCrossReq = document.getElementById('optCrossReq');
    const optCrossElec = document.getElementById('optCrossElec');
    
    const cross = res.crossMajor || {};
    const isCrossActive = !!cross.enabled;
    const crossLabel = isCrossActive ? (cross.name || cross.type || '雙主修') : '跨領域';

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
            crossCard.style.display = 'block';

            const titleEl = document.getElementById('t-cross-title');
            if (titleEl) {
                titleEl.innerText = `${cross.name} (${cross.type})`;
            }

            const eCrossEl = document.getElementById('e-cross');
            if (eCrossEl) eCrossEl.innerText = cross.expectedTotal;

            const vCrossEl = document.getElementById('v-cross');
            if (vCrossEl) vCrossEl.innerText = cross.earnedTotal;

            const tCrossEl = document.getElementById('t-cross-target');
            if (tCrossEl) tCrossEl.innerText = `目標: ${cross.target}`;

            const subInfoEl = document.getElementById('cross-sub-info');
            if (subInfoEl) {
                subInfoEl.innerHTML = `必修: ${cross.reqEarned} (預計:${cross.reqExpected}) ｜ 選修: ${cross.elecEarned} (預計:${cross.elecExpected})`;
            }

            updateCheckerCard('card-cross', cross.earnedTotal, cross.expectedTotal, cross.target, cross.isPassed);
        } else {
            crossCard.style.display = 'none';
        }
    }

    // 6. 通識教育卡片 (P2: 支援三態)
    const combinedCard = document.getElementById('card-gen-combined');
    if (combinedCard) {
        document.getElementById('e-gen-total').innerText = res.generalEducation.effectiveExpected;
        document.getElementById('v-gen-total').innerText = res.generalEducation.effectiveEarned;

        const maxExpEl = document.getElementById('max-gen-expected');
        const maxEarnEl = document.getElementById('max-gen-earned');
        if (maxExpEl) maxExpEl.innerText = res.generalEducation.maxCap;
        if (maxEarnEl) maxEarnEl.innerText = res.generalEducation.maxCap;

        document.getElementById('t-gen-summary').innerText = `基本門檻：領域 ≥ 4 (跨3領域) ｜ 融合 ≥ 1 ｜ 採計上限 ${res.generalEducation.maxCap}`;
        
        if (res.generalEducation.isAllPassed) {
            combinedCard.className = 'checker-card passed-status';
        } else if (res.generalEducation.effectiveExpected >= 5) {
            combinedCard.className = 'checker-card planned-status';
        } else {
            combinedCard.className = 'checker-card failed-status';
        }

        let waivedNotice = res.english.waived > 0 
            ? `<div style="color:var(--tf-color-primary-light); font-weight:var(--tf-weight-medium); font-size:0.75rem; margin-bottom:6px; background:var(--tf-color-primary-subtle); border:1px solid var(--tf-color-primary-border); padding:4px 8px; border-radius:var(--tf-radius-sm); text-align:left;">${Icons.get('info', { size: 13 })} 英文已免修 ${res.english.waived} 學分（可修習第二外語或通識補足畢業學分）</div>` 
            : '';

        const domainPassIco = res.generalEducation.domain.isPassed ? Icons.get('check', { size: 14, className: 'text-success' }) : Icons.get('clock', { size: 14, className: 'text-muted' });
        const rongPassIco = res.generalEducation.rong.isPassed ? Icons.get('check', { size: 14, className: 'text-success' }) : Icons.get('clock', { size: 14, className: 'text-muted' });
        const secondLangText = res.generalEducation.secondLangCredits > 0 ? ` ｜ 二外採計: ${res.generalEducation.secondLangCredits}` : '';

        document.getElementById('gen-combined-details').innerHTML = `
            ${waivedNotice}
            <div style="font-size:0.78rem; display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span><b style="color:var(--tf-text-primary);">領域通識：</b>實得 <b>${res.generalEducation.domain.earned}</b> / ${res.generalEducation.domain.max} 學分 <span style="color:var(--tf-text-muted); font-size:0.72rem;">(跨3領域: ${res.generalEducation.domain.activeDomains}/${res.generalEducation.domain.requiredDomains}${secondLangText})</span></span>
                    <span>${domainPassIco}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span><b style="color:var(--tf-text-primary);">融合通識：</b>實得 <b>${res.generalEducation.rong.capped}</b> / ${res.generalEducation.rong.max} 學分</span>
                    <span>${rongPassIco}</span>
                </div>
            </div>
            
            <div style="color:var(--tf-text-secondary); font-size:0.72rem; background:var(--tf-surface-sunken); border:1px solid var(--tf-border-subtle); padding:6px 10px; border-radius:var(--tf-radius-sm); line-height:1.55; margin-bottom:6px; text-align:left;">
                <div>人文: ${res.generalEducation.domain.details.human} ｜ 社科: ${res.generalEducation.domain.details.social} ｜ 生醫: ${res.generalEducation.domain.details.bio}</div>
                <div>科際: ${res.generalEducation.domain.details.inter} ｜ 自然: ${res.generalEducation.domain.details.nature}</div>
            </div>

            ${res.warnings.length > 0 ? `<div class="warning-text" style="text-align:left; line-height:1.45; font-size:0.74rem;">${res.warnings.join('<br>')}</div>` : `<div style="color:var(--tf-status-success-light); font-weight:bold; font-size:0.75rem; text-align:left; display:flex; align-items:center; gap:4px;">${Icons.get('check', { size: 14 })} 通識修業條件已全數達標</div>`}
        `;
    }

    // 7. 國文、英文、踏溯、體育 (P2: 帶入 expected 並統一三態)
    document.getElementById('e-chinese').innerText = res.chinese.expected; 
    document.getElementById('v-chinese').innerText = res.chinese.earned; 
    updateCheckerCard('card-chinese', res.chinese.earned, res.chinese.expected, res.chinese.target);

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
        const tEngEl = document.getElementById('t-english');
        if (tEngEl) tEngEl.innerHTML = targetText;
    }

    document.getElementById('e-tainan').innerText = res.tainan.expected; 
    document.getElementById('v-tainan').innerText = res.tainan.earned; 
    updateCheckerCard('card-tainan', res.tainan.earned, res.tainan.expected, res.tainan.target);
    
    document.getElementById('e-pe').innerText = res.pe.expected; 
    document.getElementById('v-pe').innerText = res.pe.earned; 
    updateCheckerCard('card-pe', res.pe.earned, res.pe.expected, res.pe.target);

    // 8. 服務學習卡片渲染 (P2: 支援三態)
    const sCard = document.getElementById('card-service');
    if (sCard && res.serviceLearning) {
        const eService = document.getElementById('e-service');
        const vService = document.getElementById('v-service');
        const tExp = document.getElementById('t-service-exp');
        const tAct = document.getElementById('t-service-act');
        const tNote = document.getElementById('t-service-note');

        if (eService) eService.innerText = res.serviceLearning.expected;
        if (vService) vService.innerText = res.serviceLearning.earned;

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

    // 9. 全民國防 (軍訓) 役期折抵 (P2: 支援三態)
    const milCard = document.getElementById('card-military');
    if (milCard && res.military) {
        const eMil = document.getElementById('e-military');
        const vMil = document.getElementById('v-military');
        const tMilDays = document.getElementById('t-military-days');
        
        if (eMil) eMil.innerText = res.military.expectedCount;
        if (vMil) vMil.innerText = res.military.earnedCount;
        if (tMilDays) {
            tMilDays.innerHTML = `可抵兵役 <b style="color:var(--tf-status-success-light); font-size:0.85rem;">${res.military.earnedDays}</b> 天 <span style="font-size:0.68rem; color:var(--tf-text-muted);">(上限 22 天)</span>`;
        }

        if (res.military.earnedCount > 0) {
            milCard.className = 'checker-card passed-status';
        } else if (res.military.expectedCount > 0) {
            milCard.className = 'checker-card planned-status';
        } else {
            milCard.className = 'checker-card';
        }
    }

    // 10. 歷年總平均
    document.getElementById('v-cum-gpa').innerText = res.grades.cumGpa;
    document.getElementById('v-cum-weighted').innerText = `加權: ${res.grades.cumWeighted} 分`;

    // 11. 動態填充學期成績選單與獨立結算單學期 GPA
    const gradSemSelect = document.getElementById('gradSemSelect');
    if (gradSemSelect && data && data.semesterOrder) {
        const currentSelectedSem = selectedGradSemester || data.currentSemester || data.semesterOrder[0];
        gradSemSelect.innerHTML = '';
        const numLabelMap = { 
            "一": "大一", "二": "大二", "三": "大三", "四": "大四", 
            "五": "大五", "六": "大六", "七": "大七", "八": "大八" 
        };
        data.semesterOrder.forEach(sem => {
            const opt = document.createElement('option');
            opt.value = sem;
            const match = sem.match(/^([一二三四五六七八九十\d]+)(上|下)$/);
            if (match) {
                const y = match[1];
                const t = match[2] === '上' ? '上' : '下';
                opt.innerText = `${numLabelMap[y] || y}${t} 平均`;
            } else {
                opt.innerText = `${sem} 平均`;
            }
            gradSemSelect.appendChild(opt);
        });
        gradSemSelect.value = currentSelectedSem;

        // 獨立計算所選學期的單科 GPA
        updateGradSemesterScoreCard(currentSelectedSem, data);
    }

    // 12. 同步表單設定值
    if (data) {
        const entryYearSelect = document.getElementById('entryYearSelect');
        if (entryYearSelect) entryYearSelect.value = String(data.entryYear || 118);

        const reqElecInput = document.getElementById('reqElecTargetInput');
        if (reqElecInput) reqElecInput.value = data.targetReqElective || 0;

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
}

function toggleEnglishThreshold() {
    appData.englishPassed = document.getElementById('englishPassedCB').checked;
    saveData();
    updateAppUI();
}

function updateConfig() {
    appData.deptName = document.getElementById('deptNameInput').value || "電機系";
    appData.entryYear = parseInt(document.getElementById('entryYearSelect').value, 10) || 118;
    appData.targetCredits = parseFloat(document.getElementById('gradTargetInput').value) || 138;
    appData.targetRequired = parseFloat(document.getElementById('reqTargetInput').value) || 59;
    appData.targetReqElective = parseFloat(document.getElementById('reqElecTargetInput').value) || 3;
    appData.targetElective = parseFloat(document.getElementById('elecTargetInput').value) || 51;
    appData.maxOutElective = parseFloat(document.getElementById('outMaxInput').value) || 9;
    appData.englishWaived = parseInt(document.getElementById('englishWaivedSelect').value, 10) || 0;
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

        if (!appData.crossMajor.target || appData.crossMajor.target === 40 || appData.crossMajor.target === 20 || appData.crossMajor.target === 15) {
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

// 🌟 切換 GPA 預覽學期時不修改 appData.currentSemester
function changeGradSemester(sem) {
    selectedGradSemester = sem;
    updateGradSemesterScoreCard(sem, appData);
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
    const isCollapsed = localStorage.getItem('nckuee_grad_config_collapsed');
    const configArea = document.getElementById('gradConfigArea');
    const icon = document.getElementById('configCollapseIcon');
    if (configArea && isCollapsed === '1') {
        configArea.classList.add('collapsed');
        if (icon) icon.style.transform = 'rotate(-90deg)';
    }
});