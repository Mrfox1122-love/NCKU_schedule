// 輔助函式：切換檢核卡片狀態
function updateCheckerCard(cardId, currentVal, targetVal, minCondition = true) {
    const card = document.getElementById(cardId);
    if (!card) return;
    if (targetVal !== undefined && targetVal !== null && !isNaN(targetVal)) {
        if (currentVal >= targetVal && minCondition) {
            card.className = 'checker-card passed-status';
        } else {
            card.className = 'checker-card failed-status';
        }
    }
}

// 🌟 純 DOM 渲染函式：接收 GraduationResult 並更新 UI
function renderGraduationUI(res, data) {
    if (!res) return;

    // 1. 科系名稱與學期小結
    const titleEl = document.getElementById('deptNameTitle');
    if (titleEl) titleEl.innerText = res.deptName;

    const semSummaryEl = document.getElementById('currentSemSummary');
    if (semSummaryEl) {
        semSummaryEl.innerText = `(本學期學分：已得 ${res.currentSemSummary.earnedCredits} / 總選 ${res.currentSemSummary.selectedCredits})`;
    }

    // 2. 進度條與百分比
    const pBar = document.getElementById('gradProgressBar');
    if (pBar) pBar.style.width = `${res.total.percentage}%`;

    const pPercent = document.getElementById('gradProgressPercent');
    if (pPercent) pPercent.innerText = `${res.total.rawPercent}%`;

    const pText = document.getElementById('gradProgressText');
    if (pText) {
        let crossMajorNote = res.crossMajor.enabled 
            ? ` ｜ 🎖️ <b>${res.crossMajor.type} (${res.crossMajor.name})</b>: 實得 <span style="color:#0284c7;">${res.crossMajor.earnedTotal}</span> / 預計 <span style="color:#0369a1;">${res.crossMajor.expectedTotal}</span> (目標 ${res.crossMajor.target})` 
            : '';
        pText.innerHTML = `實際取得 <b style="color:#166534;">${res.total.earned}</b> / 預計取得 <b style="color:#2563eb;">${res.total.expected}</b> (主系目標 <b>${res.total.target}</b>)${crossMajorNote}`;
    }

    // 3. 必修卡片
    document.getElementById('e-req').innerText = res.required.expected;
    document.getElementById('v-req').innerText = res.required.earned;
    document.getElementById('t-req').innerText = `目標: ${res.required.target}`;
    updateCheckerCard('card-req', res.required.earned, res.required.target);

    // 4. 選修卡片
    document.getElementById('e-elec').innerText = res.elective.expectedRaw;
    document.getElementById('v-elec').innerText = res.elective.earnedRaw;
    document.getElementById('t-elec').innerText = `目標: ${res.elective.target}`;
    updateCheckerCard('card-elec', res.elective.earnedRaw, res.elective.target, res.elective.isPassed);

    let outWarning = res.elective.outElective.isOver 
        ? `<span class="warning-text">⚠️ 外系超標，${res.elective.outElective.overflow} 學分不計畢業</span>` 
        : "";
    let reqElecWarning = !res.elective.reqElective.isPassed 
        ? `<span class="warning-text">⚠️ 必選修尚缺 ${(res.elective.reqElective.target - res.elective.reqElective.earned)} 學分</span>` 
        : "";
    let elecOverflowNote = res.elective.expectedRaw > res.elective.target 
        ? `<span style="color:#0891b2; font-size:0.65rem;">(選修超出目標 ${res.elective.expectedRaw - res.elective.target} 學分不計畢業)</span><br>` 
        : "";
    
    document.getElementById('elec-sub-info').innerHTML = `本系選修:${res.elective.deptEarned}<br>必選修:${res.elective.reqElective.earned}/${res.elective.reqElective.target} ${reqElecWarning}<br>外系選修:${res.elective.outElective.raw}/${res.elective.outElective.max} ${outWarning}<br>${elecOverflowNote}`;

    // 5. 跨領域修業卡片
    const crossCard = document.getElementById('card-cross');
    if (crossCard) {
        if (res.crossMajor.enabled) {
            crossCard.style.display = 'block';
            document.getElementById('t-cross-title').innerText = `🎖️ ${res.crossMajor.name} (${res.crossMajor.type})`;
            document.getElementById('e-cross').innerText = res.crossMajor.expectedTotal;
            document.getElementById('v-cross').innerText = res.crossMajor.earnedTotal;
            document.getElementById('t-cross-target').innerText = `目標: ${res.crossMajor.target} 學分 (額外加修)`;
            crossCard.className = res.crossMajor.isPassed ? 'checker-card passed-status' : 'checker-card failed-status';

            document.getElementById('cross-sub-info').innerHTML = `
                必修: <b>${res.crossMajor.reqEarned}</b> (預計:${res.crossMajor.reqExpected})<br>
                選修: <b>${res.crossMajor.elecEarned}</b> (預計:${res.crossMajor.elecExpected})
            `;
        } else {
            crossCard.style.display = 'none';
        }
    }

    // 6. 通識教育卡片
    const combinedCard = document.getElementById('card-gen-combined');
    if (combinedCard) {
        document.getElementById('e-gen-total').innerText = res.generalEducation.effectiveExpected;
        document.getElementById('v-gen-total').innerText = res.generalEducation.effectiveEarned;

        const maxExpEl = document.getElementById('max-gen-expected');
        const maxEarnEl = document.getElementById('max-gen-earned');
        if (maxExpEl) maxExpEl.innerText = res.generalEducation.maxCap;
        if (maxEarnEl) maxEarnEl.innerText = res.generalEducation.maxCap;

        document.getElementById('t-gen-summary').innerText = `基本門檻：領域 ≥ 4 (跨3領域) ｜ 融合 ≥ 1 ｜ 採計上限 ${res.generalEducation.maxCap}`;
        combinedCard.className = res.generalEducation.isAllPassed ? 'checker-card passed-status' : 'checker-card failed-status';

        let waivedNotice = res.english.waived > 0 
            ? `<div style="color:#1e40af; font-weight:bold; font-size:0.72rem; margin-bottom:6px; background:#eff6ff; padding:4px 8px; border-radius:4px; text-align:left;">ℹ️ 英文已免修 ${res.english.waived} 學分</div>` 
            : '';

        document.getElementById('gen-combined-details').innerHTML = `
            ${waivedNotice}
            <div style="font-size:0.76rem; display:flex; flex-direction:column; gap:5px; margin-bottom:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>📚 <b>領域通識：</b>實得 <b>${res.generalEducation.domain.earned}</b> / ${res.generalEducation.domain.max} 學分 <span style="color:var(--text-light); font-size:0.7rem;">(跨3領域: ${res.generalEducation.domain.activeDomains}/${res.generalEducation.domain.requiredDomains})</span></span>
                    <span>${res.generalEducation.domain.isPassed ? '✅' : '⏳'}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>🧩 <b>融合通識：</b>實得 <b>${res.generalEducation.rong.capped}</b> / ${res.generalEducation.rong.max} 學分</span>
                    <span>${res.generalEducation.rong.isPassed ? '✅' : '⏳'}</span>
                </div>
            </div>
            
            <div style="color:var(--text-light); font-size:0.68rem; background: rgba(0,0,0,0.03); padding: 5px 8px; border-radius: 5px; line-height: 1.45; margin-bottom: 6px; text-align: left;">
                <div>人文: ${res.generalEducation.domain.details.human} ｜ 社科: ${res.generalEducation.domain.details.social} ｜ 生醫: ${res.generalEducation.domain.details.bio}</div>
                <div>科際: ${res.generalEducation.domain.details.inter} ｜ 自然: ${res.generalEducation.domain.details.nature}</div>
            </div>

            ${res.warnings.length > 0 ? `<div class="warning-text" style="text-align:left; line-height:1.4; font-size:0.7rem;">${res.warnings.join('<br>')}</div>` : '<div style="color:#166534; font-weight:bold; font-size:0.72rem; text-align:left;">✓ 通識修業條件已全數達標</div>'}
        `;
    }

    // 7. 國文、英文、踏溯、體育
    document.getElementById('e-chinese').innerText = res.chinese.expected; 
    document.getElementById('v-chinese').innerText = res.chinese.earned; 
    updateCheckerCard('card-chinese', res.chinese.earned, res.chinese.target);

    document.getElementById('e-english').innerText = res.english.expected; 
    document.getElementById('v-english').innerText = res.english.earned; 
    const engCard = document.getElementById('card-english');
    if (engCard) {
        engCard.className = res.english.isPassed ? 'checker-card passed-status' : 'checker-card failed-status';
        let targetText = `目標: ${res.english.target}`;
        if (res.english.waived === 4) targetText = '目標: 0 (全免修)';
        else if (res.english.waived === 2) targetText = '目標: 2 (免修2學分)';

        if (res.english.isEnglishThresholdPassed) {
            targetText += ' ｜ ✓ 英檢達標';
        }
        const tEngEl = document.getElementById('t-english');
        if (tEngEl) tEngEl.innerText = targetText;
    }

    document.getElementById('e-tainan').innerText = res.tainan.expected; 
    document.getElementById('v-tainan').innerText = res.tainan.earned; 
    updateCheckerCard('card-tainan', res.tainan.earned, res.tainan.target);
    
    document.getElementById('e-pe').innerText = res.pe.expected; 
    document.getElementById('v-pe').innerText = res.pe.earned;
    if (res.pe.isPassed) document.getElementById('card-pe').className = 'checker-card passed-status'; 
    else document.getElementById('card-pe').className = 'checker-card';

    // 8. 成績總計卡片
    document.getElementById('v-sem-gpa').innerText = res.grades.semGpa;
    document.getElementById('v-sem-weighted').innerText = `加權: ${res.grades.semWeighted} 分`;
    document.getElementById('v-cum-gpa').innerText = res.grades.cumGpa;
    document.getElementById('v-cum-weighted').innerText = `加權: ${res.grades.cumWeighted} 分`;

    // 🌟 動態同步「畢業檢核頁」的學期下拉選單
    const gradSemSelect = document.getElementById('gradSemSelect');
    if (gradSemSelect && data && data.semesterOrder) {
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
        gradSemSelect.value = data.currentSemester;
    }

    // 🌟 顯示當前選定學期的修課學分小結
    const vSemCredits = document.getElementById('v-sem-credits');
    if (vSemCredits) {
        vSemCredits.innerText = `實得 ${res.currentSemSummary.earnedCredits} / 總選 ${res.currentSemSummary.selectedCredits} 學分`;
    }

    // 9. 同步表單設定值
    if (data) {
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

    // 🌟 10. 動態控制「課程類別選單」中的跨領域選項顯示狀態
    const isCrossEnabled = data && data.crossMajor && data.crossMajor.type !== 'none';
    const optCrossReq = document.getElementById('optCrossReq') || document.querySelector('#courseType option[value="跨領域-必修"]');
    const optCrossElec = document.getElementById('optCrossElec') || document.querySelector('#courseType option[value="跨領域-選修"]');
    const courseTypeSelect = document.getElementById('courseType');

    if (optCrossReq) {
        optCrossReq.style.display = isCrossEnabled ? 'block' : 'none';
        if (isCrossEnabled && data.crossMajor.name) {
            optCrossReq.innerText = `🎖️ ${data.crossMajor.name}-必修 (${data.crossMajor.type})`;
        } else {
            optCrossReq.innerText = '🎖️ 跨領域-必修 (雙主/輔/學程)';
        }
    }
    if (optCrossElec) {
        optCrossElec.style.display = isCrossEnabled ? 'block' : 'none';
        if (isCrossEnabled && data.crossMajor.name) {
            optCrossElec.innerText = `🎖️ ${data.crossMajor.name}-選修 (${data.crossMajor.type})`;
        } else {
            optCrossElec.innerText = '🎖️ 跨領域-選修 (雙主/輔/學程)';
        }
    }

    if (!isCrossEnabled && courseTypeSelect && (courseTypeSelect.value === '跨領域-必修' || courseTypeSelect.value === '跨領域-選修')) {
        courseTypeSelect.value = '系定必修';
    }
}

// -------------------------------------------------------------
// 🌟 事件處理函式 (修改 appData 並觸發存檔與重新計算)
// -------------------------------------------------------------

function toggleGradChecker() {
    const board = document.querySelector('.grad-checker-board');
    if (board) {
        board.classList.toggle('collapsed');
        localStorage.setItem('nckuee_grad_collapsed', board.classList.contains('collapsed') ? '1' : '0');
    }
}

function toggleEnglishThreshold() {
    appData.englishPassed = document.getElementById('englishPassedCB').checked;
    saveData();
    updateAppUI();
}

function updateConfig() {
    appData.deptName = document.getElementById('deptNameInput').value || "未知名科系";
    appData.targetCredits = parseFloat(document.getElementById('gradTargetInput').value) || 128;
    appData.targetRequired = parseFloat(document.getElementById('reqTargetInput').value) || 50;
    appData.targetReqElective = parseFloat(document.getElementById('reqElecTargetInput').value) || 0;
    appData.targetElective = parseFloat(document.getElementById('elecTargetInput').value) || 40;
    appData.maxOutElective = parseFloat(document.getElementById('outMaxInput').value) || 0;
    appData.englishWaived = parseInt(document.getElementById('englishWaivedSelect').value) || 0;
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

// 🌟 畢業檢核頁專屬學期切換
function changeGradSemester(sem) {
    appData.currentSemester = sem;
    saveData();
    renderSemesterSelect(); // 同步課表頁的選單
    updateAppUI();
}

// 🌟 畢業檢核設定列收合 / 展開
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

// 頁面載入時讀取上次的收合狀態
window.addEventListener('DOMContentLoaded', () => {
    const isCollapsed = localStorage.getItem('nckuee_grad_config_collapsed');
    const configArea = document.getElementById('gradConfigArea');
    const icon = document.getElementById('configCollapseIcon');
    if (configArea && isCollapsed === '1') {
        configArea.classList.add('collapsed');
        if (icon) icon.style.transform = 'rotate(-90deg)';
    }
});