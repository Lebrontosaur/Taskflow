import { openTaskModal, refreshTasks } from '../app.js';
import { escapeHtml } from '../utils/helpers.js';

let currentDate = new Date();
let currentMode = 'month'; // 'month' | 'week'

export function renderCalendarView(container, state) {
  container.innerHTML = `
    <div class="view-content" style="padding-top: 16px;">
      <div class="calendar-header">
        <div class="calendar-nav">
          <button id="cal-prev" class="btn btn-secondary">&lt;</button>
          <div id="cal-title" class="calendar-nav-title">...</div>
          <button id="cal-next" class="btn btn-secondary">&gt;</button>
          <button id="cal-today" class="btn btn-secondary">Today</button>
        </div>
        <div class="calendar-nav">
          <button id="mode-month" class="btn ${currentMode === 'month' ? 'btn-primary' : 'btn-secondary'}">Month</button>
          <button id="mode-week" class="btn ${currentMode === 'week' ? 'btn-primary' : 'btn-secondary'}">Week</button>
        </div>
      </div>
      <div id="calendar-grid-container"></div>
    </div>
  `;

  const titleEl = container.querySelector('#cal-title');
  const gridContainer = container.querySelector('#calendar-grid-container');

  const updateView = () => {
    if (currentMode === 'month') {
      titleEl.textContent = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      renderMonthGrid(gridContainer, state);
    } else {
      titleEl.textContent = "Week of " + getWeekStart(currentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      renderWeekGrid(gridContainer, state);
    }
  };

  container.querySelector('#cal-prev').addEventListener('click', () => {
    if (currentMode === 'month') currentDate.setMonth(currentDate.getMonth() - 1);
    else currentDate.setDate(currentDate.getDate() - 7);
    updateView();
  });
  
  container.querySelector('#cal-next').addEventListener('click', () => {
    if (currentMode === 'month') currentDate.setMonth(currentDate.getMonth() + 1);
    else currentDate.setDate(currentDate.getDate() + 7);
    updateView();
  });
  
  container.querySelector('#cal-today').addEventListener('click', () => {
    currentDate = new Date();
    updateView();
  });

  container.querySelector('#mode-month').addEventListener('click', (e) => {
    currentMode = 'month';
    e.target.className = 'btn btn-primary';
    container.querySelector('#mode-week').className = 'btn btn-secondary';
    updateView();
  });

  container.querySelector('#mode-week').addEventListener('click', (e) => {
    currentMode = 'week';
    e.target.className = 'btn btn-primary';
    container.querySelector('#mode-month').className = 'btn btn-secondary';
    updateView();
  });

  updateView();
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.setDate(diff));
}

function renderMonthGrid(container, state) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  let startOffset = firstDay.getDay() - 1;
  if (startOffset === -1) startOffset = 6; // Sunday becomes end
  
  const days = [];
  const totalCells = 42; // 6 rows * 7 days
  
  // Previous month padding
  for (let i = startOffset; i > 0; i--) {
    days.push(new Date(year, month, 1 - i));
  }
  
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  // Next month padding
  const remaining = totalCells - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  renderGrid(container, days, state, 'month');
}

function renderWeekGrid(container, state) {
  const start = getWeekStart(currentDate);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  renderGrid(container, days, state, 'week');
}

function renderGrid(container, days, state, mode) {
  const tasks = state.tasks || [];
  const categories = state.categories || [];
  const today = new Date();
  const currentMonth = currentDate.getMonth();

  const daysHtml = days.map(d => {
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const isOtherMonth = mode === 'month' && d.getMonth() !== currentMonth;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayNum}`;
    
    // Find tasks for this day
    const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr));
    const activeTasks = dayTasks.filter(t => !t.done);
    
    let tasksHtml = '';
    const displayTasks = activeTasks.slice(0, 3);
    displayTasks.forEach(t => {
      const catObj = categories.find(c => c.name.toLowerCase() === (t.category || '').toLowerCase());
      const bgColor = catObj ? catObj.color : 'var(--accent-color)';
      tasksHtml += `<div class="calendar-task" style="background-color: ${bgColor}" data-id="${t.id}">${escapeHtml(t.title)}</div>`;
    });
    
    if (activeTasks.length > 3) {
      tasksHtml += `<div class="calendar-more" data-date="${dateStr}">+${activeTasks.length - 3} more</div>`;
    }

    return `
      <div class="calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}" data-task-count="${dayTasks.length}">
        <span class="calendar-day-number">${d.getDate()}</span>
        ${tasksHtml}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="calendar-grid">
      <div class="calendar-day-header">Mon</div>
      <div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div>
      <div class="calendar-day-header">Thu</div>
      <div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
      <div class="calendar-day-header">Sun</div>
      ${daysHtml}
    </div>
  `;

  // Attach events
  container.querySelectorAll('.calendar-task').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const task = tasks.find(t => t.id == el.dataset.id);
      if (task) openTaskModal(task);
    });
  });

  container.querySelectorAll('.calendar-more').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openDayDetailModal(el.dataset.date, state);
    });
  });

  container.querySelectorAll('.calendar-day').forEach(el => {
    el.addEventListener('click', () => {
      const dateStr = el.dataset.date;
      const count = parseInt(el.dataset.taskCount, 10) || 0;
      if (count > 0) {
        openDayDetailModal(dateStr, state);
      } else {
        openTaskModal(null, { prefillDate: dateStr });
      }
    });
  });
}

export function openDayDetailModal(dateStr, state) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = '';
  overlay.classList.remove('hidden');

  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const renderModalContent = () => {
    const dayTasks = (state.tasks || []).filter(t => t.dueDate && t.dueDate.startsWith(dateStr));
    const categories = state.categories || [];

    const tasksHtml = dayTasks.length === 0 ? `
      <div class="empty-state" style="padding: 24px 0;">
        <div class="empty-icon" style="font-size: 36px; height: 36px; margin-bottom: 8px;">🗓️</div>
        <div class="empty-text" style="font-size: 14px;">No tasks scheduled for this day</div>
      </div>
    ` : `
      <div class="day-modal-tasks">
        ${dayTasks.map(t => {
          const catObj = categories.find(c => c.name.toLowerCase() === (t.category || '').toLowerCase());
          const catColor = catObj ? catObj.color : 'var(--accent-color)';
          const catTag = t.category ? `<span class="category-tag" style="background: color-mix(in srgb, ${catColor} 13%, transparent); color: ${catColor}; border: 1px solid color-mix(in srgb, ${catColor} 27%, transparent); font-size: 10px; padding: 1px 6px;">${escapeHtml(t.category)}</span>` : '';
          const timeStr = t.dueTime ? `<span class="day-task-time">⏰ ${t.dueTime}</span>` : '';
          
          return `
            <div class="day-task-row ${t.done ? 'completed' : ''}" data-id="${t.id}">
              <input type="checkbox" class="task-checkbox day-task-check" ${t.done ? 'checked' : ''} data-id="${t.id}">
              <div class="day-task-title">${escapeHtml(t.title)}</div>
              ${catTag}
              ${timeStr}
              <button class="btn-icon btn-day-edit" data-id="${t.id}" title="Edit">✏️</button>
              <button class="btn-icon btn-day-del" data-id="${t.id}" title="Delete">🗑️</button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    overlay.innerHTML = `
      <div class="modal-dialog" style="max-width: 520px;">
        <div class="modal-header">
          <h2 class="modal-title">${formattedDate}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body" style="gap: 16px; padding: 20px;">
          ${tasksHtml}
        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between;">
          <button id="btn-day-add-task" class="btn btn-primary">+ Add Task</button>
          <button class="btn btn-secondary modal-close-btn">Close</button>
        </div>
      </div>
    `;

    // Event listeners
    overlay.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.classList.add('hidden');
      });
    });

    overlay.querySelector('#btn-day-add-task').addEventListener('click', () => {
      overlay.classList.add('hidden');
      openTaskModal(null, { prefillDate: dateStr });
    });

    overlay.querySelectorAll('.day-task-check').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        await window.api.toggleTask(id);
        await refreshTasks();
        renderModalContent();
      });
    });

    overlay.querySelectorAll('.btn-day-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const task = state.tasks.find(t => t.id === id);
        overlay.classList.add('hidden');
        if (task) openTaskModal(task);
      });
    });

    overlay.querySelectorAll('.btn-day-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('Delete task?')) {
          await window.api.deleteTask(id);
          await refreshTasks();
          renderModalContent();
        }
      });
    });
  };

  renderModalContent();
}
