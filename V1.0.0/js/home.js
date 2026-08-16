// ============================================================
// 🏠 Home View 今日生活入口引擎
// ============================================================

// 判斷目前是否在學期進行期間 (開學日 <= 今天 <= 結業日)
function getSemesterStatus(now) {
    if (!appData.semesterDates || !appData.semesterDates[appData.currentSemester]) {
        return { isActive: true, message: null };
    }
    const { startDate, totalWeeks, endDate } = appData.semesterDates[appData.currentSemester];
    if (!startDate) return { isActive: true, message: null };

    const start = new Date(startDate + 'T00:00:00');
    const end = endDate 
        ? new Date(endDate + 'T23:59:59') 
        : new Date(start.getTime() + ((totalWeeks || 18) * 7 - 1) * 24 * 60 * 60 * 1000);

    if (now < start) {
        const daysToStart = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
        return { 
            isActive: false, 
            isBeforeStart: true,
            daysToStart: daysToStart,
            message: `距離開學還有 ${daysToStart} 天` 
        };
    }
    if (now > end) {
        return { 
            isActive: false, 
            isBeforeStart: false,
            message: `已結業 / 寒暑假期間` 
        };
    }

    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7) + 1;
    return { 
        isActive: true, 
        currentWeek: currentWeek,
        totalWeeks: totalWeeks || 18,
        message: `第 ${currentWeek} 週 (共 ${totalWeeks || 18} 週)` 
    };
}

function renderHomeView() {
    const now = new Date();
    const todayStr = (typeof formatDate === 'function') ? formatDate(now) : now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const dayNamesList = typeof dayNames !== 'undefined' ? dayNames : { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "日" };

    // 1. 檢查學期狀態
    const semStatus = getSemesterStatus(now);

    // 2. 更新問候語、日期與週次標籤 (🌟 兩行式膠囊排版)
    const greetingEl = document.getElementById('homeGreetingText');
    const dateEl = document.getElementById('homeDateText');
    if (greetingEl) {
        const hour = now.getHours();
        let greeting = '👋 你好！';
        if (hour < 12) greeting = '🌅 早安！';
        else if (hour < 18) greeting = '☀️ 午安！';
        else greeting = '🌙 晚安！';
        greetingEl.innerText = greeting;
    }
    if (dateEl) {
        const m = now.getMonth() + 1;
        const d = now.getDate();
        const dayStr = `週${dayNamesList[dayOfWeek]}`;

        // 學期名稱美化 (例如 "二上" -> "大二 上學期")
        let semName = appData.currentSemester || '';
        const match = semName.match(/^([一二三四五六七八九十\d]+)(上|下)$/);
        const numLabelMap = { "一": "大一", "二": "大二", "三": "大三", "四": "大四", "五": "大五", "六": "大六", "七": "大七", "八": "大八" };
        if (match) {
            const y = match[1];
            const t = match[2] === '上' ? '上學期' : '下學期';
            semName = `${numLabelMap[y] || y} ${t}`;
        }

        const semBadge = semName ? `<span class="home-badge">${semName}</span>` : '';
        const statusBadge = semStatus.message ? `<span class="home-badge highlight">📖 ${semStatus.message}</span>` : '';

        dateEl.innerHTML = `
            <div class="home-date-line">今天是 <b>${m} 月 ${d} 日</b> (${dayStr})</div>
            <div class="home-badges-row">
                ${semBadge}
                ${statusBadge}
            </div>
        `;
    }

    // 3. 獲取今日課程 (🌟 只有在學期進行中才載入每週固定課堂)
    const currentCourses = (appData.semesters && appData.semesters[appData.currentSemester]) || [];
    let todayCourses = [];
    const pOrder = typeof periodOrder !== 'undefined' ? periodOrder : ['1','2','3','4','N','5','6','7','8','9','A','B','C','D'];
    const tSlots = typeof timeSlots !== 'undefined' ? timeSlots : [];

    if (semStatus.isActive) {
        currentCourses.forEach(course => {
            (course.slots || []).forEach(slot => {
                if (slot.day === dayOfWeek) {
                    const sortedPeriods = [...slot.periods].sort((a, b) => pOrder.indexOf(String(a)) - pOrder.indexOf(String(b)));
                    const firstPeriod = sortedPeriods[0];
                    const slotConfig = tSlots.find(ts => String(ts.period) === String(firstPeriod));
                    const startTime = slotConfig ? slotConfig.time.split('~')[0] : '時段未定';

                    todayCourses.push({
                        id: course.id,
                        name: course.name,
                        room: course.room,
                        teacher: course.teacher,
                        color: course.color || '#2563eb',
                        periods: sortedPeriods.join(','),
                        startTime: startTime
                    });
                }
            });
        });
        todayCourses.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }

    // 4. 獲取今日行程 (Calendar 個人行程不受學期限制)
    const allEvents = appData.calendarEvents || [];
    let todayEvents = allEvents.filter(ev => ev.date === todayStr);
    todayEvents.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    // 5. 渲染今日課程清單
    const courseListEl = document.getElementById('homeCourseList');
    if (courseListEl) {
        if (!semStatus.isActive) {
            const holidayNotice = semStatus.isBeforeStart
                ? `🏖️ 尚未開學（距開學日還有 ${semStatus.daysToStart} 天），目前無排定課堂！`
                : `🏁 本學期已結業，目前為寒暑假期間，無排定課堂！`;
            courseListEl.innerHTML = `<div class="home-empty-msg">${holidayNotice}</div>`;
        } else if (todayCourses.length === 0) {
            courseListEl.innerHTML = `<div class="home-empty-msg">🎉 今天沒有排定的課程，享受你的充實一天！</div>`;
        } else {
            courseListEl.innerHTML = todayCourses.map(c => `
                <div class="home-item-card" style="border-left-color: ${c.color};" onclick="showCourseDetail(${c.id})">
                    <div class="home-item-time">第 ${c.periods} 節<br><small>${c.startTime}</small></div>
                    <div class="home-item-main">
                        <div class="home-item-title">${c.name}</div>
                        <div class="home-item-sub">${c.room ? '📍 ' + c.room : ''} ${c.teacher ? '👤 ' + c.teacher : ''}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 6. 渲染今日行程清單
    const eventListEl = document.getElementById('homeEventList');
    if (eventListEl) {
        if (todayEvents.length === 0) {
            eventListEl.innerHTML = `<div class="home-empty-msg">📝 今天沒有額外行程<br><button type="button" class="btn-home-quick" onclick="openEventEditor(null, '${todayStr}')">➕ 新增今日行程</button></div>`;
        } else {
            eventListEl.innerHTML = todayEvents.map(e => `
                <div class="home-item-card" style="border-left-color: ${e.color || '#2563eb'};" onclick="showEventDetail('${e.id}')">
                    <div class="home-item-time">${e.startTime}<br><small>~ ${e.endTime}</small></div>
                    <div class="home-item-main">
                        <div class="home-item-title">${e.title}</div>
                        <div class="home-item-sub">🏷️ ${e.category} ${e.location ? '｜ 📍 ' + e.location : ''}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 7. 渲染「🔔 接下來」
    const upcomingListEl = document.getElementById('homeUpcomingList');
    if (upcomingListEl) {
        const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        let upcomingItems = [];

        todayCourses.forEach(c => {
            if (c.startTime >= currentHourMin) {
                upcomingItems.push({
                    title: c.name,
                    time: c.startTime,
                    desc: `${c.room ? '📍 ' + c.room : '課堂'} ｜ 第 ${c.periods} 節`,
                    color: c.color
                });
            }
        });

        todayEvents.forEach(e => {
            if (e.startTime >= currentHourMin) {
                upcomingItems.push({
                    title: e.title,
                    time: e.startTime,
                    desc: `📅 ${e.category} ${e.location ? '📍 ' + e.location : ''}`,
                    color: e.color || '#2563eb'
                });
            }
        });

        upcomingItems.sort((a, b) => a.time.localeCompare(b.time));

        if (upcomingItems.length === 0) {
            upcomingListEl.innerHTML = `<div class="home-empty-msg">✨ 今天接下來沒有其他預定事項囉！</div>`;
        } else {
            upcomingListEl.innerHTML = upcomingItems.slice(0, 2).map(item => `
                <div class="home-upcoming-pill" style="border-left-color: ${item.color};">
                    <div style="font-weight:800; color:var(--accent); font-size:1.1rem; min-width:55px;">${item.time}</div>
                    <div>
                        <div style="font-weight:bold; color:#0f172a;">${item.title}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${item.desc}</div>
                    </div>
                </div>
            `).join('');
        }
    }
}