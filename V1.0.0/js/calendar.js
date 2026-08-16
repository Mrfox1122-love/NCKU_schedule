// ============================================================
// 📅 Calendar 核心資料與狀態管理
// ============================================================

let currentCalendarDate = new Date();
let calendarViewMode = 'month'; // 'month' | 'week'
let selectedCalendarDate = formatDate(new Date());

// 📅 日期工具函式
function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// 📅 CRUD 行程操作
function addCalendarEvent(eventData) {
    if (!appData.calendarEvents) appData.calendarEvents = [];
    const newEvent = {
        id: `event_${Date.now()}`,
        title: eventData.title.trim(),
        date: eventData.date,
        startTime: eventData.startTime || '09:00',
        endTime: eventData.endTime || '10:00',
        category: eventData.category || '個人',
        color: eventData.color || '#2563eb',
        location: eventData.location ? eventData.location.trim() : '',
        notes: eventData.notes ? eventData.notes.trim() : '',
        reminder: eventData.reminder || { enabled: false, offsetMinutes: 30 }
    };
    appData.calendarEvents.push(newEvent);
    saveData();
    renderCalendar();
}

function updateCalendarEvent(id, eventData) {
    const idx = (appData.calendarEvents || []).findIndex(e => String(e.id) === String(id));
    if (idx !== -1) {
        appData.calendarEvents[idx] = {
            ...appData.calendarEvents[idx],
            title: eventData.title.trim(),
            date: eventData.date,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            category: eventData.category,
            color: eventData.color,
            location: eventData.location ? eventData.location.trim() : '',
            notes: eventData.notes ? eventData.notes.trim() : '',
            reminder: eventData.reminder
        };
        saveData();
        renderCalendar();
    }
}

function deleteCalendarEvent(id) {
    if (confirm('確定要刪除此行程嗎？')) {
        appData.calendarEvents = (appData.calendarEvents || []).filter(e => String(e.id) !== String(id));
        saveData();
        renderCalendar();
    }
}