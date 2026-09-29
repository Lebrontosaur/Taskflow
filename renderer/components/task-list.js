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

  // Filter out invalid nulls if any
  const validTasks = tasks.filter(t => t);

  if (groupByDate) {
    // Group tasks
    const groups = {};
    validTasks.forEach(task => {
      let groupKey = 'No Date';
      if (task.dueDate) {
        groupKey = formatRelativeDate(task.dueDate);
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(task);
    });

    // Generate HTML for groups
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
    // Flat list
    container.innerHTML = `
      <div class="task-list">
        ${validTasks.map(t => createTaskCardHtml(t, showCategory, showDueDate, categories)).join('')}
      </div>
    `;
  }

  // Attach event listeners
  const taskCards = container.querySelectorAll('.task-card');
  taskCards.forEach(card => {
    const taskId = parseInt(card.dataset.id, 10) || card.dataset.id; // handle string or int ID
    
    // Checkbox toggle
    const checkbox = card.querySelector('.task-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
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

    // Edit on body click
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.task-checkbox-container') && !e.target.closest('.task-actions')) {
        if (onEdit) onEdit(taskId);
      }
    });

    // Drag and drop events
    setupDragAndDrop(card);
  });
}

function createTaskCardHtml(task, showCategory, showDueDate, categories = []) {
  const doneClass = task.done ? 'completed' : '';
  const checked = task.done ? 'checked' : '';
  
  // Category logic with user-defined colors
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
    <div class="task-card ${doneClass}" data-id="${task.id}" draggable="true">
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
      <div class="task-actions">
        <button class="btn-icon btn-edit" title="Edit">✏️</button>
        <button class="btn-icon btn-delete" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}




let draggedCard = null;

function setupDragAndDrop(card) {
  card.addEventListener('dragstart', (e) => {
    draggedCard = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedCard = null;
    document.querySelectorAll('.task-card').forEach(c => {
      c.classList.remove('drop-target-before', 'drop-target-after');
    });
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (card === draggedCard) return;
    
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    if (e.clientY < midY) {
      card.classList.add('drop-target-before');
      card.classList.remove('drop-target-after');
    } else {
      card.classList.add('drop-target-after');
      card.classList.remove('drop-target-before');
    }
  });

  card.addEventListener('dragleave', () => {
    card.classList.remove('drop-target-before', 'drop-target-after');
  });

  card.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (card === draggedCard) return;
    
    card.classList.remove('drop-target-before', 'drop-target-after');
    
    const isBefore = e.clientY < (card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2);
    const taskList = card.parentNode;
    
    if (isBefore) {
      taskList.insertBefore(draggedCard, card);
    } else {
      taskList.insertBefore(draggedCard, card.nextSibling);
    }
    
    // Get new order
    const orderedIds = Array.from(taskList.querySelectorAll('.task-card')).map(c => c.dataset.id);
    
    // Fire reorder API
    try {
      if (window.api && window.api.reorderTasks) {
        await window.api.reorderTasks(orderedIds);
      }
    } catch (err) {
      console.error('Failed to reorder', err);
    }
  });
}
