// ============================================================
// 📅 Calendar UI 渲染引擎
// ============================================================

let editingEventId = null;

function renderCalendar() {
    renderCalendarHeader();
    renderDesktopCalendar();
    renderMobileCalendar();
}

function renderCalendarHeader() {
    const titleEl = document.getElementById('calDisplayTitle');
    if (!titleEl) return;

    const y = currentCalendarDate.getFullYear();
    const m = currentCalendarDate.getMonth() + 1;
    titleEl.innerText = `${y} 年 ${m} 月`;

    // 同步按鈕 Active 狀態
    const btnMonth = document.getElementById('btnCalMonthView');
    const btnWeek = document.getElementById('btnCalWeekView');
    if (btnMonth && btnWeek) {
        btnMonth.classList.toggle('active', calendarViewMode === 'month');
        btnWeek.classList.toggle('active', calendarViewMode === 'week');
    }
}

function stepCalendar(dir) {
    if (calendarViewMode === 'month') {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + dir);
    } else {
        currentCalendarDate.setDate(currentCalendarDate.getDate() + (dir * 7));
    }
    renderCalendar();
}

function resetCalendarToday() {
    currentCalendarDate = new Date();
    selectedCalendarDate = formatDate(new Date());
    renderCalendar();
}

function setCalendarView(mode) {
    calendarViewMode = mode;
    renderCalendar();
}

// 🖥️ 桌面版月曆渲染
function renderDesktopCalendar() {
    const grid = document.getElementById('desktopCalGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 是週日
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDate(new Date());

    // 星期標題
    const dayLabels = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    dayLabels.forEach((label, i) => {
        const h = document.createElement('div');
        h.className = `cal-grid-header ${i === 0 || i === 6 ? 'weekend' : ''}`;
        h.innerText = label;
        grid.appendChild(h);
    });

    // 填充 1 號之前的空白格
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day-cell cal-day-empty';
        grid.appendChild(emptyCell);
    }

    // 填充該月每一天
    for (let day = 1; day <= daysInMonth; day++) {
        const dObj = new Date(year, month, day);
        const dateStr = formatDate(dObj);
        const cell = document.createElement('div');
        cell.className = `cal-day-cell ${dateStr === todayStr ? 'is-today' : ''} ${dateStr === selectedCalendarDate ? 'is-selected' : ''}`;

        cell.innerHTML = `<div class="cal-day-number">${day}</div><div class="cal-day-events" id="d-events-${dateStr}"></div>`;
        cell.onclick = (e) => {
            if (e.target.closest('.cal-event-pill')) return;
            openEventEditor(null, dateStr);
        };

        grid.appendChild(cell);

        // 放入行程膠囊
        const dayEvents = (appData.calendarEvents || []).filter(ev => ev.date === dateStr);
        dayEvents.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        const evContainer = cell.querySelector(`#d-events-${dateStr}`);
        dayEvents.slice(0, 3).forEach(ev => {
            const pill = document.createElement('div');
            pill.className = 'cal-event-pill';
            pill.style.backgroundColor = ev.color || '#2563eb';
            pill.innerText = `${ev.startTime ? ev.startTime + ' ' : ''}${ev.title}`;
            pill.onclick = () => showEventDetail(ev.id);
            evContainer.appendChild(pill);
        });

        if (dayEvents.length > 3) {
            const more = document.createElement('div');
            more.className = 'cal-event-more';
            more.innerText = `+${dayEvents.length - 3} 項`;
            evContainer.appendChild(more);
        }
    }
}

// 📱 手機版月曆渲染（上方輕量月曆 + 下方選中日行程清單）
function renderMobileCalendar() {
    const miniGrid = document.getElementById('mobileMiniCalGrid');
    const agendaList = document.getElementById('mobileAgendaList');
    const agendaDateLabel = document.getElementById('mobileAgendaDateLabel');
    if (!miniGrid || !agendaList) return;

    miniGrid.innerHTML = '';
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDate(new Date());

    // 星期 Header
    ['日', '一', '二', '三', '四', '五', '六'].forEach((l, i) => {
        const h = document.createElement('div');
        h.className = `mobile-mini-header ${i === 0 || i === 6 ? 'weekend' : ''}`;
        h.innerText = l;
        miniGrid.appendChild(h);
    });

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'mobile-mini-cell empty';
        miniGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(new Date(year, month, day));
        const hasEvents = (appData.calendarEvents || []).some(ev => ev.date === dateStr);
        const cell = document.createElement('div');
        cell.className = `mobile-mini-cell ${dateStr === todayStr ? 'is-today' : ''} ${dateStr === selectedCalendarDate ? 'is-selected' : ''}`;
        cell.innerHTML = `<span>${day}</span>${hasEvents ? '<div class="mobile-dot"></div>' : ''}`;

        cell.onclick = () => {
            selectedCalendarDate = dateStr;
            renderCalendar();
        };
        miniGrid.appendChild(cell);
    }

    // 渲染下方行程清單
    if (agendaDateLabel) agendaDateLabel.innerText = `📅 ${selectedCalendarDate} 的行程`;
    const selectedEvents = (appData.calendarEvents || []).filter(ev => ev.date === selectedCalendarDate);
    selectedEvents.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    agendaList.innerHTML = '';
    if (selectedEvents.length === 0) {
        agendaList.innerHTML = `<div class="agenda-empty">這天沒有排定行程<br><button type="button" class="btn-agenda-add" onclick="openEventEditor(null, '${selectedCalendarDate}')">➕ 新增這天的行程</button></div>`;
        return;
    }

    selectedEvents.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'agenda-card';
        item.style.borderLeftColor = ev.color || '#2563eb';
        item.onclick = () => showEventDetail(ev.id);
        item.innerHTML = `
            <div class="agenda-time">${ev.startTime} - ${ev.endTime}</div>
            <div class="agenda-content">
                <div class="agenda-title">${ev.title}</div>
                <div class="agenda-sub">${ev.category}${ev.location ? ' ｜ 📍 ' + ev.location : ''}</div>
            </div>
        `;
        agendaList.appendChild(item);
    });
}

// ✏️ 行程編輯 / 新增彈窗
function openEventEditor(id = null, defaultDate = null) {
    editingEventId = id;
    const modal = document.getElementById('eventEditModal');
    const form = document.getElementById('eventForm');
    if (!modal || !form) return;

    if (id) {
        const ev = (appData.calendarEvents || []).find(e => String(e.id) === String(id));
        if (!ev) return;
        document.getElementById('eventModalTitle').innerText = '✏️ 編輯行程';
        document.getElementById('eventTitle').value = ev.title;
        document.getElementById('eventDate').value = ev.date;
        document.getElementById('eventStartTime').value = ev.startTime;
        document.getElementById('eventEndTime').value = ev.endTime;
        document.getElementById('eventCategory').value = ev.category;
        document.getElementById('eventColor').value = ev.color || '#2563eb';
        document.getElementById('eventLocation').value = ev.location || '';
        document.getElementById('eventNotes').value = ev.notes || '';
    } else {
        document.getElementById('eventModalTitle').innerText = '➕ 新增行程';
        form.reset();
        document.getElementById('eventDate').value = defaultDate || selectedCalendarDate || formatDate(new Date());
        document.getElementById('eventStartTime').value = '09:00';
        document.getElementById('eventEndTime').value = '10:00';
        document.getElementById('eventColor').value = '#2563eb';
    }

    modal.classList.add('show');
}

function closeEventEditor() {
    const modal = document.getElementById('eventEditModal');
    if (modal) modal.classList.remove('show');
    editingEventId = null;
}

// 🔍 行程詳細彈窗
function showEventDetail(id) {
    const ev = (appData.calendarEvents || []).find(e => String(e.id) === String(id));
    if (!ev) return;

    document.getElementById('detailEventTitle').innerText = ev.title;
    document.getElementById('detailEventBar').style.backgroundColor = ev.color || '#2563eb';
    document.getElementById('detailEventDate').innerText = `📅 ${ev.date} ⏰ ${ev.startTime} - ${ev.endTime}`;
    document.getElementById('detailEventCat').innerText = `🏷️ 分類: ${ev.category}`;
    document.getElementById('detailEventLoc').innerText = ev.location ? `📍 地點: ${ev.location}` : '📍 未指定地點';
    document.getElementById('detailEventNotes').innerText = ev.notes ? `📝 備註: ${ev.notes}` : '';

    const btnEdit = document.getElementById('btnDetailEventEdit');
    const btnDel = document.getElementById('btnDetailEventDel');
    if (btnEdit) btnEdit.onclick = () => { closeEventDetail(); openEventEditor(ev.id); };
    if (btnDel) btnDel.onclick = () => { closeEventDetail(); deleteCalendarEvent(ev.id); };

    document.getElementById('eventDetailModal').classList.add('show');
}

function closeEventDetail() {
    const modal = document.getElementById('eventDetailModal');
    if (modal) modal.classList.remove('show');
}