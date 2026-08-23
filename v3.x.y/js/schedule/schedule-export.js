// ============================================================
// 📸 Schedule Export 圖片匯出模組 (HTML2Canvas Integration)
// ============================================================

function exportSchedulePNG() {
    let target = document.getElementById('scheduleCaptureArea');
    
    if (typeof currentScheduleViewType !== 'undefined' && currentScheduleViewType === 'list') {
        target = document.getElementById('scheduleListViewArea');
    } else if (window.innerWidth <= 768 || (target && window.getComputedStyle(target).display === 'none')) {
        target = document.getElementById('mobileScheduleArea');
    }

    if (!target) {
        alert('找不到可匯出的課表區塊！');
        return;
    }

    const computedBg = getComputedStyle(document.documentElement).getPropertyValue('--tf-bg-app').trim() || '#070a13';

    target.classList.add('clean-png-capture');

    html2canvas(target, {
        scale: 2.5,
        backgroundColor: computedBg,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        logging: false
    }).then(canvas => {
        target.classList.remove('clean-png-capture');

        const fileName = `${appData.deptName || '課表'}_${appData.currentSemester}_修課規劃.png`;

        if (canvas.toBlob) {
            canvas.toBlob(blob => {
                if (!blob) {
                    fallbackDownload(canvas.toDataURL('image/png'), fileName);
                    return;
                }
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
        } else {
            fallbackDownload(canvas.toDataURL('image/png'), fileName);
        }
    }).catch(err => {
        target.classList.remove('clean-png-capture');
        console.error('[Export PNG Error]', err);
        alert('匯出圖片失敗，請重試！');
    });
}

function fallbackDownload(dataUrl, fileName) {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
}