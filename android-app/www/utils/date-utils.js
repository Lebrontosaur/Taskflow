// Date utility functions

// Helper to parse 'YYYY-MM-DD' as local Date object (00:00:00 local time)
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

export function isToday(dateStr) {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

export function isTomorrow(dateStr) {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  return d.getDate() === tmrw.getDate() &&
         d.getMonth() === tmrw.getMonth() &&
         d.getFullYear() === tmrw.getFullYear();
}

export function isOverdue(dateStr, timeStr) {
  if (!dateStr) return false;
  const now = new Date();
  const d = parseLocalDate(dateStr);
  if (timeStr) {
    const [h, m] = timeStr.split(':');
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return d < now;
  } else {
    // If no time, overdue only if the day is strictly before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  if (isToday(dateStr)) return 'Today';
  if (isTomorrow(dateStr)) return 'Tomorrow';
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  if (diffDays > 1 && diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return formatDate(dateStr);
}

export function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

export function getWeekDates(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const start = new Date(d.setDate(diff));
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    week.push(current);
  }
  return week;
}
