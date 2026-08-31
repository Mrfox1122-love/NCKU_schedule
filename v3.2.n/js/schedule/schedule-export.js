// ============================================================
// 📸 Schedule Export 圖片匯出模組 (極簡無 Emoji、清晰銳利字體版)
// ============================================================

/**
 * 顏色轉換工具：將 HEX 轉為高對比 RGBA 柔光底色
 */
function hexToRgba(hex, alpha = 0.22) {
    if (!hex || typeof hex !== 'string') return `rgba(99, 102, 241, ${alpha})`;
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 開啟圖片匯出格式選擇彈窗
 */
function exportSchedulePNG() {
    ModalManager.open('exportFormatModal');
}

/**
 * 關閉匯出格式彈窗
 */
function closeExportFormatModal(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) {
        return;
    }
    ModalManager.close('exportFormatModal');
}

/**
 * 執行圖片生成與下載
 * @param {'desktop' | 'wallpaper'} format 匯出格式
 */
function processExportSchedule(format = 'desktop') {
    ModalManager.close('exportFormatModal');

    const sem = appData.currentSemester || '一上';
    const dept = appData.deptName || '成大電機';
    const activeDays = (typeof getActiveDays === 'function') ? getActiveDays() : [1, 2, 3, 4, 5];
    const activeSlots = (typeof getActiveTimeSlots === 'function') ? getActiveTimeSlots() : [];
    const currentCourses = (appData.semesters && appData.semesters[sem]) || [];

    const isWallpaper = (format === 'wallpaper');
    const appBgColor = getComputedStyle(document.documentElement).getPropertyValue('--tf-bg-app').trim() || '#13141f';
    const currentTheme = document.documentElement.dataset.theme || 'purple';
    const isLightTheme = ['glacier', 'mist', 'latte', 'macaron', 'sakura', 'white'].includes(currentTheme);

    // 1. 建立離屏容器 (加入抗鋸齒與平滑字體設定)
    const exportNode = document.createElement('div');
    exportNode.id = 'tfDedicatedExportNode';
    exportNode.style.position = 'fixed';
    exportNode.style.left = '-9999px';
    exportNode.style.top = '0';
    exportNode.style.background = appBgColor;
    exportNode.style.color = isLightTheme ? '#0f172a' : '#f8fafc';
    exportNode.style.boxSizing = 'border-box';
    exportNode.style.zIndex = '-9999';
    exportNode.style.display = 'flex';
    exportNode.style.flexDirection = 'column';
    exportNode.style.webkitFontSmoothing = 'antialiased';
    exportNode.style.mozOsxFontSmoothing = 'grayscale';
    exportNode.style.textRendering = 'optimizeLegibility';
    exportNode.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif';

    if (isWallpaper) {
        // 📱 手機直式滿版桌布 (1080 x 2340)
        exportNode.style.width = '1080px';
        exportNode.style.minHeight = '2340px';
        exportNode.style.height = '2340px';
        exportNode.style.padding = '24px 20px 20px 20px';
    } else {
        // 💻 電腦寬版 (1200px)
        exportNode.style.width = '1200px';
        exportNode.style.minHeight = 'auto';
        exportNode.style.padding = '28px 32px';
    }

    // 2. 頂部抬頭 (無 Emoji，字體清晰)
    const headerHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${isWallpaper ? '16px' : '16px'}; border-bottom:${isWallpaper ? '2px' : '2px'} solid var(--tf-border-default); padding-bottom:${isWallpaper ? '12px' : '12px'};">
            <div style="display:flex; align-items:baseline; gap:${isWallpaper ? '14px' : '8px'};">
                <h1 style="margin:0; font-size:${isWallpaper ? '30px' : '24px'}; font-weight:700; color:${isLightTheme ? '#0f172a' : '#f8fafc'}; letter-spacing:-0.3px;">${dept}</h1>
                <span style="font-size:${isWallpaper ? '20px' : '15px'}; color:var(--tf-color-primary-light); font-weight:600;">【 ${sem} 修課課表 】</span>
            </div>
            <div style="text-align:right; font-size:${isWallpaper ? '15px' : '12px'}; font-weight:500; color:${isLightTheme ? '#64748b' : '#94a3b8'};">
                TimeFlow
            </div>
        </div>
    `;

    // 3. 建立課表網格
    const colCount = activeDays.length;
    const rowCount = activeSlots.length;
    const gridBoard = document.createElement('div');
    gridBoard.style.display = 'grid';
    gridBoard.style.width = '100%';
    gridBoard.style.flex = '1';
    gridBoard.style.gridTemplateColumns = isWallpaper 
        ? `100px repeat(${colCount}, minmax(0, 1fr))` 
        : `95px repeat(${colCount}, minmax(0, 1fr))`;
    gridBoard.style.gridTemplateRows = isWallpaper 
        ? `54px repeat(${rowCount}, minmax(0, 1fr))` 
        : `44px repeat(${rowCount}, minmax(58px, 1fr))`;
    gridBoard.style.background = 'var(--tf-surface-sunken)';
    gridBoard.style.border = '1px solid var(--tf-border-default)';
    gridBoard.style.borderRadius = '10px';
    gridBoard.style.overflow = 'hidden';

    // 網格表頭：星期
    const corner = document.createElement('div');
    corner.className = 'tf-grid-header tf-grid-corner';
    corner.innerText = '節次';
    corner.style.fontSize = isWallpaper ? '16px' : '13px';
    corner.style.fontWeight = '600';
    gridBoard.appendChild(corner);

    activeDays.forEach((day, dIdx) => {
        const h = document.createElement('div');
        h.className = 'tf-grid-header';
        h.style.gridColumn = `${dIdx + 2}`;
        h.style.gridRow = '1';
        h.innerHTML = `<span style="font-weight:600; font-size:${isWallpaper ? '22px' : '15px'}; color:${isLightTheme ? '#0f172a' : '#f8fafc'};">週${dayNames[day]}</span>`;
        gridBoard.appendChild(h);
    });

    // 時間欄與背景格 (調降粗細，改善字體邊緣)
    activeSlots.forEach((slot, sIdx) => {
        const rowNum = sIdx + 2;
        const t = document.createElement('div');
        t.className = 'tf-grid-time-cell';
        t.style.gridColumn = '1';
        t.style.gridRow = `${rowNum}`;
        t.style.padding = isWallpaper ? '4px' : '4px';
        
        const slotLabelColor = isLightTheme ? '#0f172a' : '#f8fafc';
        const slotTimeColor = isLightTheme ? '#64748b' : '#94a3b8';

        t.innerHTML = `
            <strong style="font-size:${isWallpaper ? '18px' : '13px'}; font-weight:600; color:${slotLabelColor};">${slot.label}</strong>
            <span class="time-sub" style="font-size:${isWallpaper ? '14px' : '11px'}; font-weight:400; color:${slotTimeColor}; margin-top:2px;">${slot.time.split('~')[0]}</span>
        `;
        gridBoard.appendChild(t);

        activeDays.forEach((day, dIdx) => {
            const bgCell = document.createElement('div');
            bgCell.className = 'tf-grid-bg-cell';
            bgCell.style.gridColumn = `${dIdx + 2}`;
            bgCell.style.gridRow = `${rowNum}`;
            gridBoard.appendChild(bgCell);
        });
    });

    // 計算課程區塊
    const periodKeys = activeSlots.map(s => String(s.period));
    const renderedItems = [];
    currentCourses.forEach(course => {
        (course.slots || []).forEach(slotInfo => {
            const dayIdx = activeDays.indexOf(slotInfo.day);
            if (dayIdx === -1) return;

            const periodIndices = (slotInfo.periods || [])
                .map(p => periodKeys.indexOf(String(p)))
                .filter(idx => idx !== -1)
                .sort((a, b) => a - b);

            if (periodIndices.length === 0) return;

            let groups = [];
            let currentGroup = [periodIndices[0]];
            for (let i = 1; i < periodIndices.length; i++) {
                if (periodIndices[i] === periodIndices[i - 1] + 1) {
                    currentGroup.push(periodIndices[i]);
                } else {
                    groups.push(currentGroup);
                    currentGroup = [periodIndices[i]];
                }
            }
            groups.push(currentGroup);

            groups.forEach(grp => {
                renderedItems.push({
                    course,
                    day: slotInfo.day,
                    dayIdx,
                    startRow: grp[0] + 2,
                    endRow: grp[grp.length - 1] + 3,
                    grp
                });
            });
        });
    });

    // 渲染課程卡片（無 Emoji、字體銳利清晰）
    activeDays.forEach((day, dayIdx) => {
        const dayItems = renderedItems.filter(item => item.dayIdx === dayIdx);
        dayItems.forEach(item => {
            const overlapping = dayItems.filter(other => 
                Math.max(item.startRow, other.startRow) < Math.min(item.endRow, other.endRow)
            );
            const totalCols = overlapping.length;
            const colIndex = overlapping.indexOf(item);
            const course = item.course;
            const color = course.color || '#2563eb';

            const firstSlotObj = activeSlots[item.grp[0]];
            const lastSlotObj = activeSlots[item.grp[item.grp.length - 1]];
            const timeRangeStr = (firstSlotObj && lastSlotObj)
                ? `${firstSlotObj.time.split('~')[0]} - ${lastSlotObj.time.split('~')[1]}`
                : '';

            const card = document.createElement('div');
            card.className = 'tf-course-card';
            card.style.gridColumn = `${dayIdx + 2}`;
            card.style.gridRow = `${item.startRow} / ${item.endRow}`;
            
            // 背景色與左側邊條適度收斂
            const bgAlpha = isLightTheme ? 0.22 : 0.32;
            const borderAlpha = isLightTheme ? 0.55 : 0.65;
            card.style.backgroundColor = hexToRgba(color, bgAlpha);
            card.style.border = `1px solid ${hexToRgba(color, borderAlpha)}`;
            card.style.borderLeft = `${isWallpaper ? '6px' : '4px'} solid ${color}`;
            card.style.borderRadius = '8px';
            card.style.padding = isWallpaper ? '12px 10px' : '6px 8px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'flex-start';
            card.style.gap = isWallpaper ? '6px' : '2px';
            card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';

            if (totalCols > 1) {
                const widthPercent = (100 / totalCols).toFixed(1);
                const leftPercent = (colIndex * (100 / totalCols)).toFixed(1);
                card.style.width = `calc(${widthPercent}% - 4px)`;
                card.style.marginLeft = `calc(${leftPercent}% + 2px)`;
            }

            // 文字顏色設定 (對比高但不過黑/過曝)
            const titleColor = isLightTheme ? '#0f172a' : '#ffffff';
            const timeColor = isLightTheme ? '#334155' : '#e2e8f0';
            const metaColor = isLightTheme ? '#475569' : '#cbd5e1';

            const isMultiPeriod = item.grp.length >= 2;
            const courseTitleSize = isWallpaper ? (isMultiPeriod ? '24px' : '20px') : '14px';
            const courseTimeSize = isWallpaper ? '15px' : '11px';
            const courseMetaSize = isWallpaper ? '14px' : '11px';

            // 乾淨組合地點與教師資訊（無 Emoji）
            let metaList = [];
            if (course.room) metaList.push(course.room);
            if (course.teacher) metaList.push(course.teacher);
            const metaHtml = metaList.length > 0 
                ? `<div style="font-size:${courseMetaSize}; color:${metaColor}; font-weight:400; line-height:1.35; margin-top:auto;">${metaList.join(' ｜ ')}</div>` 
                : '';

            card.innerHTML = `
                <div style="font-weight:600; font-size:${courseTitleSize}; color:${titleColor}; line-height:1.25; word-break:break-all; letter-spacing:-0.2px;">${course.name}</div>
                <div style="font-size:${courseTimeSize}; color:${timeColor}; font-weight:400; letter-spacing:0.2px;">${timeRangeStr}</div>
                ${metaHtml}
            `;
            gridBoard.appendChild(card);
        });
    });

    const mainContentWrap = document.createElement('div');
    mainContentWrap.style.display = 'flex';
    mainContentWrap.style.flexDirection = 'column';
    mainContentWrap.style.flex = '1';
    mainContentWrap.style.height = '100%';
    mainContentWrap.innerHTML = headerHtml;
    mainContentWrap.appendChild(gridBoard);

    exportNode.appendChild(mainContentWrap);
    document.body.appendChild(exportNode);

    // 4. 擷取輸出
    html2canvas(exportNode, {
        scale: isWallpaper ? 1 : 2,
        backgroundColor: appBgColor,
        useCORS: true,
        logging: false
    }).then(canvas => {
        document.body.removeChild(exportNode);
        const typeLabel = isWallpaper ? '手機滿版桌布' : '寬版課表';
        const fileName = `${dept}_${sem}_${typeLabel}.png`;

        if (canvas.toBlob) {
            canvas.toBlob(blob => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    link.remove();
                    URL.revokeObjectURL(url);
                }, 1000);
            }, 'image/png');
        }
    }).catch(err => {
        if (document.getElementById('tfDedicatedExportNode')) {
            document.body.removeChild(exportNode);
        }
        console.error('[Export PNG Error]', err);
        alert('匯出圖片失敗，請重試！');
    });
}

if (typeof window !== 'undefined') {
    window.exportSchedulePNG = exportSchedulePNG;
    window.processExportSchedule = processExportSchedule;
    window.closeExportFormatModal = closeExportFormatModal;
}