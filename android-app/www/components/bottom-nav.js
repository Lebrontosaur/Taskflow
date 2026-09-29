import { isOverdue, isToday, getDaysUntil } from '../utils/date-utils.js';

const icons = {
  today: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  upcoming: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
  all: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
};

export function renderBottomNav(container, state, onNavigate) {
  const tasks = state.tasks || [];
  const incomplete = tasks.filter(t => !t.done);
  const todayCount = incomplete.filter(t => isToday(t.dueDate) || isOverdue(t.dueDate, t.dueTime)).length;
  const upcomingCount = incomplete.filter(t => t.dueDate && getDaysUntil(t.dueDate) > 0).length;
  const allCount = incomplete.length;

  const navItems = [
    { id: 'today', label: 'Today', icon: icons.today, count: todayCount },
    { id: 'upcoming', label: 'Upcoming', icon: icons.upcoming, count: upcomingCount },
    { id: 'calendar', label: 'Calendar', icon: icons.calendar },
    { id: 'all', label: 'All Tasks', icon: icons.all, count: allCount },
    { id: 'settings', label: 'Settings', icon: icons.settings }
  ];

  container.innerHTML = `
    <div class="bottom-nav-inner">
      ${navItems.map(item => `
        <button class="bottom-nav-item ${state.currentView === item.id ? 'active' : ''}" data-view="${item.id}">
          <div class="bottom-nav-icon-wrapper">
            <span class="bottom-nav-icon">${item.icon}</span>
            ${item.count !== undefined && item.count > 0 ? `<span class="bottom-nav-badge">${item.count}</span>` : ''}
          </div>
          <span class="bottom-nav-label">${item.label}</span>
        </button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.bottom-nav-item').forEach(el => {
    el.addEventListener('click', () => onNavigate(el.dataset.view));
  });
}
