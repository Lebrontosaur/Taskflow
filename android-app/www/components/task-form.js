import { escapeHtml } from '../utils/helpers.js';

export function renderTaskModal(task, categories, settings, callbacks, container, options = {}) {
  const isEdit = !!task;
  const defaultLead = settings && settings.defaultReminderLead !== undefined ? settings.defaultReminderLead : 15;
  const prefillDate = options.prefillDate || null;
  const t = task || {
    title: '', notes: '', category: 'Personal', priority: 'med', 
    dueDate: prefillDate, dueTime: null, recurrence: { type: 'none', interval: 1, endDate: null },
    subtasks: [], reminders: defaultLead >= 0 ? [{ id: 'r_' + Date.now().toString(36), leadMinutes: defaultLead, sent: false }] : []
  };

  let subtasks = [...(t.subtasks || [])];
  let reminders = [...(t.reminders || [])];
  
  const html = `
    <div class="modal-dialog mobile-sheet">
      <div class="modal-header">
        <h2 class="modal-title">${isEdit ? 'Edit Task' : 'New Task'}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <!-- Title -->
        <div class="form-group">
          <input type="text" id="task-title" class="form-control form-control-large" placeholder="What needs to be done?" value="${escapeHtml(t.title)}" required autofocus>
        </div>
        
        <div class="form-row">
          <!-- Due Date -->
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="task-date" class="form-control" value="${t.dueDate ? t.dueDate.split('T')[0] : ''}">
          </div>
          <!-- Due Time -->
          <div class="form-group">
            <label class="form-label">Time (optional)</label>
            <input type="time" id="task-time" class="form-control" value="${t.dueTime || ''}">
          </div>
        </div>

        <div class="form-row">
          <!-- Priority -->
          <div class="form-group">
            <label class="form-label">Priority</label>
            <div class="priority-selector">
              <button type="button" class="priority-btn ${t.priority === 'low' ? 'active' : ''}" data-priority="low"><span class="priority-dot priority-low"></span> Low</button>
              <button type="button" class="priority-btn ${t.priority === 'med' ? 'active' : ''}" data-priority="med"><span class="priority-dot priority-med"></span> Med</button>
              <button type="button" class="priority-btn ${t.priority === 'high' ? 'active' : ''}" data-priority="high"><span class="priority-dot priority-high"></span> High</button>
            </div>
          </div>
          <!-- Category -->
          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="task-category" class="form-control">
              <option value="none">None</option>
              ${categories.map(c => `<option value="${c.name}" ${t.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="task-notes" class="form-control" placeholder="Add notes, details, links...">${escapeHtml(t.notes)}</textarea>
        </div>

        <!-- Recurrence -->
        <div class="form-group">
          <label class="form-label">Recurrence</label>
          <div class="form-row">
            <select id="task-recurrence" class="form-control">
              <option value="none" ${t.recurrence && t.recurrence.type === 'none' ? 'selected' : ''}>Does not repeat</option>
              <option value="daily" ${t.recurrence && t.recurrence.type === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekday" ${t.recurrence && t.recurrence.type === 'weekday' ? 'selected' : ''}>Every Weekday (Mon–Fri)</option>
              <option value="weekly" ${t.recurrence && t.recurrence.type === 'weekly' ? 'selected' : ''}>Weekly</option>
              <option value="monthly" ${t.recurrence && t.recurrence.type === 'monthly' ? 'selected' : ''}>Monthly</option>
              <option value="custom" ${t.recurrence && t.recurrence.type === 'custom' ? 'selected' : ''}>Custom interval</option>
            </select>
            <div id="custom-recurrence-row" style="display: ${t.recurrence && t.recurrence.type === 'custom' ? 'flex' : 'none'}; align-items: center; gap: 8px;">
              <span>Every</span>
              <input type="number" id="recurrence-interval" class="form-control" style="width: 70px;" value="${t.recurrence && t.recurrence.interval ? t.recurrence.interval : 2}" min="1">
              <span>days</span>
            </div>
          </div>
        </div>

        <!-- Reminders -->
        <div class="form-group">
          <label class="form-label">Reminders (Android Notifications)</label>
          <div id="reminders-list-container" class="subtask-list"></div>
          <div style="display: flex; gap: 8px; margin-top: 6px;">
            <select id="add-reminder-select" class="form-control" style="flex: 1;">
              <option value="0">At due time</option>
              <option value="5">5 minutes before</option>
              <option value="15" selected>15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </select>
            <button type="button" id="btn-add-reminder" class="btn btn-secondary">+ Add</button>
          </div>
        </div>

        <!-- Subtasks -->
        <div class="form-group">
          <label class="form-label">Subtasks / Checklist</label>
          <div class="subtask-list" id="subtask-list-container"></div>
          <input type="text" id="new-subtask-input" class="form-control" placeholder="+ Add a subtask (press Enter)">
        </div>
      </div>

      <div class="modal-footer">
        ${isEdit ? `<button id="btn-modal-delete" class="btn btn-danger modal-footer-left">Delete</button>` : ''}
        <button id="btn-modal-cancel" class="btn btn-secondary">Cancel</button>
        <button id="btn-modal-save" class="btn btn-primary">Save Task</button>
      </div>
    </div>
  `;
  container.innerHTML = html;

  // Setup DOM elements
  const titleInput = container.querySelector('#task-title');
  const dateInput = container.querySelector('#task-date');
  const timeInput = container.querySelector('#task-time');
  const notesInput = container.querySelector('#task-notes');
  const categorySelect = container.querySelector('#task-category');
  const recurrenceSelect = container.querySelector('#task-recurrence');
  const customRecurrenceRow = container.querySelector('#custom-recurrence-row');
  const recurrenceInterval = container.querySelector('#recurrence-interval');
  const remindersContainer = container.querySelector('#reminders-list-container');
  const addReminderSelect = container.querySelector('#add-reminder-select');
  const btnAddReminder = container.querySelector('#btn-add-reminder');
  const subtaskListContainer = container.querySelector('#subtask-list-container');
  const newSubtaskInput = container.querySelector('#new-subtask-input');
  
  recurrenceSelect.addEventListener('change', () => {
    customRecurrenceRow.style.display = recurrenceSelect.value === 'custom' ? 'flex' : 'none';
  });

  let currentPriority = t.priority;
  container.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPriority = btn.dataset.priority;
    });
  });

  // Render Reminders
  const formatReminderLead = (mins) => {
    if (mins === 0) return 'At due time';
    if (mins === 5) return '5 minutes before';
    if (mins === 15) return '15 minutes before';
    if (mins === 30) return '30 minutes before';
    if (mins === 60) return '1 hour before';
    if (mins === 1440) return '1 day before';
    if (mins >= 1440) return `${Math.round(mins / 1440)} days before`;
    if (mins >= 60) return `${Math.round(mins / 60)} hours before`;
    return `${mins} minutes before`;
  };

  const renderReminders = () => {
    if (reminders.length === 0) {
      remindersContainer.innerHTML = '<span class="text-dim text-small">No reminders set</span>';
      return;
    }
    remindersContainer.innerHTML = reminders.map((r, index) => `
      <div class="subtask-item" style="padding: 6px 10px; background: var(--surface-raised); border-radius: 4px;">
        <span style="font-size: 14px;">🔔</span>
        <span style="flex: 1; font-size: 13px;">${formatReminderLead(r.leadMinutes)}</span>
        <button type="button" class="btn-icon delete-reminder" data-index="${index}" title="Remove reminder">✕</button>
      </div>
    `).join('');

    remindersContainer.querySelectorAll('.delete-reminder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        reminders.splice(parseInt(e.target.dataset.index, 10), 1);
        renderReminders();
      });
    });
  };
  renderReminders();

  btnAddReminder.addEventListener('click', async () => {
    // Request permission if needed
    if (window.api && window.api.requestPermission) {
      await window.api.requestPermission();
    }
    const mins = parseInt(addReminderSelect.value, 10);
    if (!reminders.some(r => r.leadMinutes === mins)) {
      reminders.push({ id: 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), leadMinutes: mins, sent: false });
      renderReminders();
    }
  });

  // Render Subtasks
  const renderSubtasks = () => {
    subtaskListContainer.innerHTML = subtasks.map((st, index) => `
      <div class="subtask-item">
        <input type="checkbox" class="task-checkbox" ${st.done ? 'checked' : ''} data-index="${index}">
        <input type="text" class="subtask-input ${st.done ? 'completed' : ''}" value="${escapeHtml(st.text)}" data-index="${index}">
        <button type="button" class="btn-icon delete-subtask" data-index="${index}">🗑️</button>
      </div>
    `).join('');

    subtaskListContainer.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        subtasks[e.target.dataset.index].done = e.target.checked;
        renderSubtasks();
      });
    });

    subtaskListContainer.querySelectorAll('.subtask-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        subtasks[e.target.dataset.index].text = e.target.value;
      });
    });

    subtaskListContainer.querySelectorAll('.delete-subtask').forEach(btn => {
      btn.addEventListener('click', (e) => {
        subtasks.splice(e.target.dataset.index, 1);
        renderSubtasks();
      });
    });
  };
  renderSubtasks();

  newSubtaskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && newSubtaskInput.value.trim() !== '') {
      e.preventDefault();
      subtasks.push({ text: newSubtaskInput.value.trim(), done: false });
      newSubtaskInput.value = '';
      renderSubtasks();
    }
  });

  // Actions
  container.querySelector('.modal-close').addEventListener('click', callbacks.onClose);
  container.querySelector('#btn-modal-cancel').addEventListener('click', callbacks.onClose);
  
  if (isEdit) {
    container.querySelector('#btn-modal-delete').addEventListener('click', () => {
      callbacks.onDelete(t.id);
    });
  }

  container.querySelector('#btn-modal-save').addEventListener('click', async () => {
    if (!titleInput.value.trim()) {
      titleInput.focus();
      return;
    }

    if (reminders.length > 0 && window.api && window.api.requestPermission) {
      await window.api.requestPermission();
    }

    const recType = recurrenceSelect.value;
    const intervalVal = recType === 'custom' ? Math.max(1, parseInt(recurrenceInterval.value, 10) || 1) : 1;

    const taskData = {
      title: titleInput.value.trim(),
      notes: notesInput.value.trim(),
      dueDate: dateInput.value || null,
      dueTime: timeInput.value || null,
      priority: currentPriority,
      category: categorySelect.value === 'none' ? 'Other' : categorySelect.value,
      recurrence: { type: recType, interval: intervalVal, endDate: null },
      reminders: reminders,
      subtasks: subtasks.filter(s => s.text.trim() !== '')
    };

    callbacks.onSave(taskData);
  });
}
