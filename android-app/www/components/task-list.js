import { isOverdue, isToday, formatRelativeDate, formatDate } from '../utils/date-utils.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderTaskList(container, tasks, options = {}) {
  const { onToggle, onEdit, onDelete, showCategory = true, showDueDate = true, emptyMessage = "No tasks", emptyIcon = "☀️", groupByDate = false, categories = [] } = options;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="font-size: 48px;">${emptyIcon}</div>
        <div class="empty-text">${emptyMessage}</div>
      </div>
    `;
    return;
  }

  const validTasks = tasks.filter(t => t);

  if (groupByDate) {
    const groups = {};
    validTasks.forEach(task => {
      let groupKey = 'No Date';
      if (task.dueDate) {
        groupKey = formatRelativeDate(task.dueDate);
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(task);
    });

    let html = '';
    for (const [dateLabel, groupTasks] of Object.entries(groups)) {
      html += `
        <div class="task-group">
          <div class="task-group-header">${dateLabel}</div>
          <div class="task-list" data-group="${dateLabel}">
            ${groupTasks.map(t => createTaskCardHtml(t, showCategory, showDueDate, categories)).join('')}
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  } else {
    container.innerHTML = `
      <div class="task-list">
        ${validTasks.map(t => createTaskCardHtml(t, showCategory, showDueDate, categories)).join('')}
      </div>
    `;
  }

  // Attach event listeners
  const taskCards = container.querySelectorAll('.task-card');
  taskCards.forEach(card => {
    const taskId = card.dataset.id;
    
    // Checkbox toggle
    const checkbox = card.querySelector('.task-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        if (onToggle) onToggle(taskId);
      });
    }

    // Actions
    const editBtn = card.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onEdit) onEdit(taskId);
      });
    }

    const delBtn = card.querySelector('.btn-delete');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onDelete) onDelete(taskId);
      });
    }

    // Tap card body to edit
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.task-checkbox-container') && !e.target.closest('.task-actions')) {
        if (onEdit) onEdit(taskId);
      }
    });
  });
}

function createTaskCardHtml(task, showCategory, showDueDate, categories = []) {
  const doneClass = task.done ? 'completed' : '';
  const checked = task.done ? 'checked' : '';
  
  // Category badge
  let catTag = '';
  if (task.category && showCategory) {
    const catObj = categories.find(c => c.name.toLowerCase() === task.category.toLowerCase());
    const catColor = catObj ? catObj.color : 'var(--accent-color)';
    catTag = `<span class="category-tag" style="background: color-mix(in srgb, ${catColor} 13%, transparent); color: ${catColor}; border: 1px solid color-mix(in srgb, ${catColor} 27%, transparent);">${escapeHtml(task.category)}</span>`;
  }
  
  const prioDot = task.priority ? `<span class="priority-dot priority-${task.priority}"></span>` : '';
  
  // Due date styling
  let dateHtml = '';
  if (task.dueDate && showDueDate) {
    let dateClass = 'date-later';
    if (isOverdue(task.dueDate, task.dueTime) && !task.done) dateClass = 'date-overdue';
    else if (isToday(task.dueDate) && !task.done) dateClass = 'date-today';
    
    let timeStr = task.dueTime ? ` ${task.dueTime}` : '';
    let recurrenceIcon = task.recurrence && task.recurrence.type !== 'none' ? ' 🔄' : '';
    dateHtml = `<span class="${dateClass}">📅 ${formatRelativeDate(task.dueDate)}${timeStr}${recurrenceIcon}</span>`;
  }

  // Subtasks progress
  let subtaskHtml = '';
  if (task.subtasks && task.subtasks.length > 0) {
    const completedCount = task.subtasks.filter(s => s.done).length;
    const total = task.subtasks.length;
    const percent = (completedCount / total) * 100;
    subtaskHtml = `
      <div class="subtask-progress">
        <span>${completedCount}/${total}</span>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="task-card ${doneClass}" data-id="${task.id}">
      <div class="task-checkbox-container">
        <input type="checkbox" class="task-checkbox" ${checked}>
      </div>
      <div class="task-content">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.notes ? `<div class="task-notes-preview">${escapeHtml(task.notes.split('\n')[0])}</div>` : ''}
        <div class="task-meta">
          ${catTag}
          ${prioDot ? `<div class="meta-item">${prioDot} ${task.priority}</div>` : ''}
          ${dateHtml ? `<div class="meta-item">${dateHtml}</div>` : ''}
          ${subtaskHtml}
        </div>
      </div>
      <div class="task-actions mobile-actions">
        <button class="btn-icon btn-edit" title="Edit">✏️</button>
        <button class="btn-icon btn-delete" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}
