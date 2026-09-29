import { renderTaskList } from '../components/task-list.js';
import { isOverdue, isToday } from '../utils/date-utils.js';
import { refreshTasks, openTaskModal, showToast } from '../app.js';
import { filterTasks, createTaskHandlers } from '../utils/helpers.js';

export function renderTodayView(container, state) {
  let tasks = state.tasks.filter(t => !t.done);
  tasks = filterTasks(tasks, state);

  const overdue = tasks.filter(t => isOverdue(t.dueDate, t.dueTime));
  const today = tasks.filter(t => isToday(t.dueDate) && !isOverdue(t.dueDate, t.dueTime));
  const noDate = tasks.filter(t => !t.dueDate);

  // Sorting
  const sortTasks = (arr) => arr.sort((a, b) => {
    if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
    if (a.dueTime) return -1;
    if (b.dueTime) return 1;
    const pVal = { high: 3, med: 2, low: 1 };
    return (pVal[b.priority] || 0) - (pVal[a.priority] || 0);
  });

  sortTasks(today);
  
  const { handleToggle, handleEdit, handleDelete } = createTaskHandlers(state, refreshTasks, openTaskModal, showToast);
  const options = { onToggle: handleToggle, onEdit: handleEdit, onDelete: handleDelete, categories: state.categories };

  // Header Date
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  let html = `<div class="view-header">
    <h2>Today <span class="text-dim text-small" style="font-weight: normal; margin-left: 8px;">${dateStr}</span></h2>
  </div>
  <div class="view-content">`;

  if (overdue.length === 0 && today.length === 0 && noDate.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon" style="font-size: 48px;">🎉</div>
        <div class="empty-text">Nothing due today — enjoy your day!</div>
      </div>
    `;
  } else {
    html += `<div id="lists-container"></div>`;
  }
  
  html += `</div>`;
  container.innerHTML = html;

  if (overdue.length > 0 || today.length > 0 || noDate.length > 0) {
    const listsContainer = container.querySelector('#lists-container');
    
    if (overdue.length > 0) {
      const g = document.createElement('div');
      g.className = 'task-group overdue';
      g.innerHTML = `<div class="task-group-header">Overdue</div><div id="overdue-list"></div>`;
      listsContainer.appendChild(g);
      renderTaskList(listsContainer.querySelector('#overdue-list'), overdue, options);
    }

    if (today.length > 0) {
      const g = document.createElement('div');
      g.className = 'task-group';
      g.innerHTML = `<div class="task-group-header">Today</div><div id="today-list"></div>`;
      listsContainer.appendChild(g);
      renderTaskList(listsContainer.querySelector('#today-list'), today, options);
    }

    if (noDate.length > 0) {
      const g = document.createElement('div');
      g.className = 'task-group';
      g.innerHTML = `<div class="task-group-header">No due date</div><div id="nodate-list"></div>`;
      listsContainer.appendChild(g);
      renderTaskList(listsContainer.querySelector('#nodate-list'), noDate, options);
    }
  }
}
