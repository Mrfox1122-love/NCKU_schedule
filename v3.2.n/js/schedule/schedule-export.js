// ============================================================
// 📸 Schedule Export 圖片匯出模組 (跨裝置皆輸出 1200px 寬版專業課表)
// ============================================================

function exportSchedulePNG() {
    const sem = appData.currentSemester || '一上';
    const dept = appData.deptName || '成大電機';
    const activeDays = (typeof getActiveDays === 'function') ? getActiveDays() : [1, 2, 3, 4, 5];
    const activeSlots = (typeof getActiveTimeSlots === 'function') ? getActiveTimeSlots() : [];
    const currentCourses = (appData.semesters && appData.semesters[sem]) || [];

    // 1. 建立離屏 1200px 寬版專用畫布
    const exportNode = document.createElement('div');
    exportNode.id = 'tfDedicatedExportNode';
    exportNode.style.position = 'fixed';
    exportNode.style.left = '-9999px';
    exportNode.style.top = '0';
    exportNode.style.width = '1200px';
    exportNode.style.padding = '28px 32px';
    exportNode.style.background = getComputedStyle(document.documentElement).getPropertyValue('--tf-bg-app').trim() || '#13141f';
    exportNode.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tf-text-primary').trim() || '#e2e8f0';
    exportNode.style.boxSizing = 'border-box';
    exportNode.style.zIndex = '-9999';

    // 2. 標題與學期抬頭
    const headerHtml = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:16px; border-bottom:2px solid var(--tf-border-default); padding-bottom:12px;">
            <div>
                <h1 style="margin:0; font-size:24px; font-weight:bold; color:var(--tf-text-primary);">${dept}</h1>
                <div style="font-size:15px; color:var(--tf-color-primary-light); font-weight:600; margin-top:4px;">【 ${sem} 修課規劃課表 】</div>
            </div>
            <div style="text-align:right; font-size:13px; color:var(--tf-text-muted);">
                產出時間：${new Date().toLocaleDateString('zh-TW')} ｜ TimeFlow 規劃系統
            </div>
        </div>
    `;

    // 3. 建立網格容器
    const colCount = activeDays.length;
    const rowCount = activeSlots.length;
    const gridBoard = document.createElement('div');
    gridBoard.style.display = 'grid';
    gridBoard.style.width = '100%';
    gridBoard.style.gridTemplateColumns = `95px repeat(${colCount}, minmax(0, 1fr))`;
    gridBoard.style.gridTemplateRows = `44px repeat(${rowCount}, minmax(58px, 1fr))`;
    gridBoard.style.background = 'var(--tf-surface-sunken)';
    gridBoard.style.border = '1px solid var(--tf-border-default)';
    gridBoard.style.borderRadius = '8px';
    gridBoard.style.overflow = 'hidden';

    // 頂部表頭
    const corner = document.createElement('div');
    corner.className = 'tf-grid-header tf-grid-corner';
    corner.innerText = '節次 / 時間';
    gridBoard.appendChild(corner);

    activeDays.forEach((day, dIdx) => {
        const h = document.createElement('div');
        h.className = 'tf-grid-header';
        h.style.gridColumn = `${dIdx + 2}`;
        h.style.gridRow = '1';
        h.innerHTML = `<span style="font-weight:bold; font-size:15px;">星期${dayNames[day]}</span>`;
        gridBoard.appendChild(h);
    });

    // 背景格與時間側欄
    activeSlots.forEach((slot, sIdx) => {
        const rowNum = sIdx + 2;
        const t = document.createElement('div');
        t.className = 'tf-grid-time-cell';
        t.style.gridColumn = '1';
        t.style.gridRow = `${rowNum}`;
        t.innerHTML = `<strong>${slot.label}</strong><span class="time-sub">${slot.time}</span>`;
        gridBoard.appendChild(t);

        activeDays.forEach((day, dIdx) => {
            const bgCell = document.createElement('div');
            bgCell.className = 'tf-grid-bg-cell';
            bgCell.style.gridColumn = `${dIdx + 2}`;
            bgCell.style.gridRow = `${rowNum}`;
            gridBoard.appendChild(bgCell);
        });
    });

    // 課程卡片
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

    activeDays.forEach((day, dayIdx) => {
        const dayItems = renderedItems.filter(item => item.dayIdx === dayIdx);
        dayItems.forEach(item => {
            const overlapping = dayItems.filter(other => 
                Math.max(item.startRow, other.startRow) < Math.min(item.endRow, other.endRow)
            );
            const totalCols = overlapping.length;
            const colIndex = overlapping.indexOf(item);
            const course = item.course;

            const firstSlotObj = activeSlots[item.grp[0]];
            const lastSlotObj = activeSlots[item.grp[item.grp.length - 1]];
            const timeRangeStr = (firstSlotObj && lastSlotObj)
                ? `${firstSlotObj.time.split('~')[0]} - ${lastSlotObj.time.split('~')[1]}`
                : '';

            const card = document.createElement('div');
            card.className = 'tf-course-card';
            card.style.gridColumn = `${dayIdx + 2}`;
            card.style.gridRow = `${item.startRow} / ${item.endRow}`;
            card.style.borderLeftColor = course.color || '#2563eb';
            card.style.background = 'var(--tf-surface-overlay)';

            if (totalCols > 1) {
                const widthPercent = (100 / totalCols).toFixed(1);
                const leftPercent = (colIndex * (100 / totalCols)).toFixed(1);
                card.style.width = `calc(${widthPercent}% - 4px)`;
                card.style.marginLeft = `calc(${leftPercent}% + 2px)`;
            }

            card.innerHTML = `
                <div style="font-weight:bold; font-size:14px; color:var(--tf-text-primary); margin-bottom:2px;">${course.name}</div>
                <div style="font-size:11px; color:var(--tf-text-muted);">${timeRangeStr}</div>
                <div style="font-size:11px; color:var(--tf-text-secondary); margin-top:2px;">
                    ${course.room ? `<span>📍 ${course.room}</span> ` : ''}
                    ${course.teacher ? `<span>👤 ${course.teacher}</span>` : ''}
                </div>
            `;
            gridBoard.appendChild(card);
        });
    });

    exportNode.innerHTML = headerHtml;
    exportNode.appendChild(gridBoard);
    document.body.appendChild(exportNode);

    // 4. 擷取並下載
    html2canvas(exportNode, {
        scale: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--tf-bg-app').trim() || '#13141f',
        useCORS: true,
        logging: false
    }).then(canvas => {
        document.body.removeChild(exportNode);
        const fileName = `${dept}_${sem}_修課規劃課表.png`;

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