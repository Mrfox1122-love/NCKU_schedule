// ============================================================
// 📸 Schedule Export 圖片匯出模組 (TimeFlow v3.5.1 - Fully XSS Secured)
// ------------------------------------------------------------
// 寬版課表（電腦）與手機桌布兩種格式：
// - 只顯示有課的星期與節次範圍，避免大片空白
// - 課程卡以課程顏色實心填滿，文字顏色依底色自動對比
// - 手機桌布上方保留鎖定畫面時鐘區、下方保留 dock 區
// ============================================================

/**
 * 顏色轉換工具：將 HEX 轉為 RGBA
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

// 兩種格式的尺寸與字級（單位 px，輸出時桌布 1 倍、寬版 2 倍）
const EXPORT_LAYOUTS = {
    desktop: {
        width: 1200, height: null, padding: '36px 40px 28px',
        timeCol: 76, headerRow: 44, rowHeight: 62,
        title: 30, subtitle: 15, dayLabel: 15, periodLabel: 14, periodTime: 11,
        courseName: 15, courseMeta: 12, cardPad: '8px 10px', radius: 10, gap: 3,
        topSafe: 0, bottomSafe: 0, showTeacher: true
    },
    wallpaper: {
        width: 1080, height: 2340, padding: '0 40px',
        timeCol: 92, headerRow: 64, rowHeight: null,
        title: 64, subtitle: 28, dayLabel: 28, periodLabel: 24, periodTime: 18,
        courseName: 30, courseMeta: 21, cardPad: '14px 12px', radius: 18, gap: 5,
        topSafe: 600, bottomSafe: 260, showTeacher: false
    }
};

/**
 * 計算要顯示的星期與節次：只保留有課的範圍（平日一律顯示）
 */
function getExportRange(courses) {
    const allSlots = (typeof timeSlots !== 'undefined') ? timeSlots : [];
    const usedDays = new Set();
    const usedPeriodIdx = [];

    courses.forEach(course => (course.slots || []).forEach(s => {
        usedDays.add(s.day);
        (s.periods || []).forEach(p => {
            const idx = allSlots.findIndex(slot => String(slot.period) === String(p));
            if (idx !== -1) usedPeriodIdx.push(idx);
        });
    }));

    // 平日一律顯示，週末只在有課時顯示
    const days = [1, 2, 3, 4, 5, 6, 7].filter(d => d <= 5 || usedDays.has(d));
    if (!usedPeriodIdx.length) {
        // 沒有課時顯示第 1～8 節的空白課表
        return { days, slots: allSlots.filter(s => /^[1-8]$/.test(s.period)) };
    }
    const first = Math.min(...usedPeriodIdx);
    const last = Math.max(...usedPeriodIdx);
    return { days, slots: allSlots.slice(first, last + 1) };
}

/**
 * 將課程時段依連續節次分組，例如 2、3、4 節合成一張卡
 */
function groupCourseBlocks(courses, days, slots) {
    const periodKeys = slots.map(s => String(s.period));
    const blocks = [];
    courses.forEach(course => {
        (course.slots || []).forEach(slotInfo => {
            const dayIdx = days.indexOf(slotInfo.day);
            if (dayIdx === -1) return;
            const indices = (slotInfo.periods || [])
                .map(p => periodKeys.indexOf(String(p)))
                .filter(idx => idx !== -1)
                .sort((a, b) => a - b);
            let group = [];
            indices.forEach((idx, i) => {
                if (i > 0 && idx !== indices[i - 1] + 1) {
                    blocks.push({ course, dayIdx, start: group[0], end: group[group.length - 1] });
                    group = [];
                }
                group.push(idx);
            });
            if (group.length) blocks.push({ course, dayIdx, start: group[0], end: group[group.length - 1] });
        });
    });
    return blocks;
}

/**
 * 建立匯出用的離屏節點
 */
function buildExportNode(format) {
    const L = EXPORT_LAYOUTS[format] || EXPORT_LAYOUTS.desktop;
    const isWallpaper = format === 'wallpaper';
    const sem = appData.currentSemester || '一上';
    const courses = ((appData.semesters && appData.semesters[sem]) || []).filter(c => !c.isTentative);
    const { days, slots } = getExportRange(courses);
    const blocks = groupCourseBlocks(courses, days, slots);

    const root = getComputedStyle(document.documentElement);
    const cssVar = (name, fallback) => root.getPropertyValue(name).trim() || fallback;
    const bg = cssVar('--tf-bg-app', '#13141f');
    const surface = cssVar('--tf-surface-base', 'rgba(255,255,255,0.03)');
    const border = cssVar('--tf-border-default', 'rgba(255,255,255,0.08)');
    const accent = cssVar('--tf-color-primary-light', '#a78bfa');
    const textPrimary = cssVar('--tf-text-primary', '#f8fafc');
    const textMuted = cssVar('--tf-text-muted', '#94a3b8');

    // 標題：學年期、系所、學分統計
    const entryYear = (typeof getEntryAcademicYear === 'function') ? getEntryAcademicYear() : null;
    const academic = (typeof semesterToAcademic === 'function') ? semesterToAcademic(sem, entryYear) : null;
    const isMaster = typeof isMasterMode === 'function' && isMasterMode(appData);
    const deptName = isMaster && typeof getMasterProgram === 'function'
        ? getMasterProgram(appData.masterProgram, appData.masterCustom).fullName
        : (appData.deptName || '');
    const totalCredits = courses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
    const titleText = academic ? `${academic.label} 課表` : `${sem} 課表`;
    const subParts = [deptName, academic ? sem : '', `${courses.length} 門・${totalCredits} 學分`].filter(Boolean);

    const node = document.createElement('div');
    node.id = 'tfDedicatedExportNode';
    Object.assign(node.style, {
        position: 'fixed', left: '-10000px', top: '0', zIndex: '-9999',
        width: `${L.width}px`, height: L.height ? `${L.height}px` : 'auto',
        padding: L.padding, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        background: bg, color: textPrimary,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", sans-serif',
        webkitFontSmoothing: 'antialiased'
    });

    if (L.topSafe) {
        // 鎖定畫面時鐘區：留白
        const spacer = document.createElement('div');
        spacer.style.height = `${L.topSafe}px`;
        spacer.style.flexShrink = '0';
        node.appendChild(spacer);
    }

    const header = document.createElement('div');
    header.style.cssText = `display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin-bottom:${isWallpaper ? 28 : 20}px; flex-shrink:0;`;
    header.innerHTML = `
        <div style="min-width:0;">
            <div style="font-size:${L.title}px; font-weight:800; letter-spacing:-0.5px; line-height:1.1; color:${textPrimary};">${escapeHTML(titleText)}</div>
            <div style="margin-top:${isWallpaper ? 12 : 6}px; font-size:${L.subtitle}px; color:${textMuted}; font-weight:500;">${subParts.map(escapeHTML).join('<span style="margin:0 8px; opacity:0.5;">·</span>')}</div>
        </div>
        <div style="font-size:${isWallpaper ? 20 : 12}px; font-weight:700; letter-spacing:1px; color:${accent}; white-space:nowrap;">TimeFlow</div>
    `;
    node.appendChild(header);

    // 課表網格：第一列星期、第一欄節次
    const grid = document.createElement('div');
    const rowTemplate = L.rowHeight ? `repeat(${slots.length}, ${L.rowHeight}px)` : `repeat(${slots.length}, minmax(0, 1fr))`;
    grid.style.cssText = `
        display:grid; position:relative;
        grid-template-columns:${L.timeCol}px repeat(${days.length}, minmax(0, 1fr));
        grid-template-rows:${L.headerRow}px ${rowTemplate};
        ${L.rowHeight ? '' : 'flex:1; min-height:0;'}
        background:${surface}; border:1px solid ${border}; border-radius:${L.radius + 4}px; overflow:hidden;
    `;

    const dayNameList = (typeof dayNames !== 'undefined') ? dayNames : {};
    days.forEach((day, i) => {
        const h = document.createElement('div');
        h.style.cssText = `grid-column:${i + 2}; grid-row:1; display:flex; align-items:center; justify-content:center; font-size:${L.dayLabel}px; font-weight:700; color:${textPrimary}; border-bottom:1px solid ${border};`;
        h.textContent = `週${dayNameList[day] || day}`;
        grid.appendChild(h);
    });
    const corner = document.createElement('div');
    corner.style.cssText = `grid-column:1; grid-row:1; border-bottom:1px solid ${border};`;
    grid.appendChild(corner);

    slots.forEach((slot, i) => {
        const row = i + 2;
        const t = document.createElement('div');
        t.style.cssText = `grid-column:1; grid-row:${row}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; border-top:${i ? `1px dashed ${border}` : 'none'};`;
        t.innerHTML = `
            <span style="font-size:${L.periodLabel}px; font-weight:700; color:${textPrimary};">${escapeHTML(slot.period)}</span>
            <span style="font-size:${L.periodTime}px; color:${textMuted};">${escapeHTML((slot.time || '').split('~')[0])}</span>
        `;
        grid.appendChild(t);
        // 背景橫線
        const line = document.createElement('div');
        line.style.cssText = `grid-column:2 / ${days.length + 2}; grid-row:${row}; border-top:${i ? `1px dashed ${border}` : 'none'};`;
        grid.appendChild(line);
    });

    // 課程卡（同時段重疊時並排）
    blocks.forEach(block => {
        const overlapping = blocks.filter(o => o.dayIdx === block.dayIdx && Math.max(o.start, block.start) <= Math.min(o.end, block.end));
        const colCount = overlapping.length;
        const colIdx = overlapping.indexOf(block);
        const course = block.course;
        const rawColor = typeof course.color === 'string' ? course.color.trim() : '';
        const color = /^#[0-9a-fA-F]{6}$/.test(rawColor) || /^#[0-9a-fA-F]{3}$/.test(rawColor) ? rawColor : '#2563eb';
        const textColor = (typeof getContrastTextColor === 'function') ? getContrastTextColor(color) : '#ffffff';
        const span = block.end - block.start + 1;
        const firstSlot = slots[block.start];
        const lastSlot = slots[block.end];
        const timeRange = firstSlot && lastSlot ? `${(firstSlot.time || '').split('~')[0]}–${(lastSlot.time || '').split('~')[1] || ''}` : '';
        const meta = [course.room, L.showTeacher ? course.teacher : ''].filter(Boolean);

        const card = document.createElement('div');
        card.style.cssText = `
            grid-column:${block.dayIdx + 2}; grid-row:${block.start + 2} / ${block.end + 3};
            margin:${L.gap}px; ${colCount > 1 ? `width:calc(${100 / colCount}% - ${L.gap * 2}px); margin-left:calc(${(colIdx * 100) / colCount}% + ${L.gap}px);` : ''}
            background:${color}; color:${textColor}; border-radius:${L.radius}px; padding:${L.cardPad};
            display:flex; flex-direction:column; gap:${isWallpaper ? 6 : 3}px;
        `;
        // 註：卡片不設 overflow:hidden（html2canvas 遇到圓角加 overflow:hidden 會在邊緣畫出色帶）
        card.innerHTML = `
            <div style="font-size:${L.courseName}px; font-weight:700; line-height:1.25; word-break:break-word;">${escapeHTML(course.name)}</div>
            ${span >= 2 || !isWallpaper ? `<div style="font-size:${L.courseMeta}px; opacity:0.85;">${escapeHTML(timeRange)}</div>` : ''}
            ${meta.length ? `<div style="margin-top:auto; font-size:${L.courseMeta}px; opacity:0.85; line-height:1.3; word-break:break-word;">${meta.map(escapeHTML).join(' · ')}</div>` : ''}
        `;
        grid.appendChild(card);
    });

    node.appendChild(grid);

    if (L.bottomSafe) {
        // dock 區：留白，只放小字浮水印
        const footer = document.createElement('div');
        footer.style.cssText = `height:${L.bottomSafe}px; flex-shrink:0; display:flex; align-items:flex-start; justify-content:center; padding-top:20px; font-size:18px; color:${textMuted}; opacity:0.6;`;
        footer.textContent = '由 TimeFlow 產生';
        node.appendChild(footer);
    } else if (!courses.length) {
        const empty = document.createElement('div');
        empty.style.cssText = `margin-top:12px; font-size:13px; color:${textMuted};`;
        empty.textContent = '這學期還沒有排入課程。';
        node.appendChild(empty);
    }

    return { node, bg, sem, deptName };
}

/**
 * 執行圖片生成與下載
 * @param {'desktop' | 'wallpaper'} format 匯出格式
 */
function processExportSchedule(format = 'desktop') {
    ModalManager.close('exportFormatModal');

    const isWallpaper = format === 'wallpaper';
    const { node: exportNode, bg, sem, deptName } = buildExportNode(isWallpaper ? 'wallpaper' : 'desktop');
    document.body.appendChild(exportNode);

    html2canvas(exportNode, {
        scale: isWallpaper ? 1 : 2,
        backgroundColor: bg,
        useCORS: true,
        logging: false
    }).then(canvas => {
        if (document.body.contains(exportNode)) {
            document.body.removeChild(exportNode);
        }
        const typeLabel = isWallpaper ? '手機桌布' : '寬版課表';
        const safeFileDept = (deptName || '成大').replace(/[\/\\:*?"<>|]/g, '_');
        const safeFileSem = (sem || '課表').replace(/[\/\\:*?"<>|]/g, '_');
        const fileName = `${safeFileDept}_${safeFileSem}_${typeLabel}.png`;

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
        if (document.body.contains(exportNode)) {
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
