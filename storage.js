const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let dataPath = null;
let data = {
  tasks: [],
  categories: [
    { name: "Work", color: "#4F8CFF" },
    { name: "Personal", color: "#8B5CF6" },
    { name: "Errands", color: "#F59E0B" },
    { name: "Health", color: "#10B981" },
    { name: "Other", color: "#6B7280" }
  ],
  settings: {
    theme: "system",
    defaultReminderLead: 15,
    autoLaunch: false,
    startMinimized: false
  }
};

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const storage = {
  init() {
    dataPath = path.join(app.getPath('userData'), 'taskflow-data.json');
    try {
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.tasks && parsed.categories && parsed.settings) {
          data = parsed;
        }
      } else {
        this.save();
      }
    } catch (error) {
      console.error('Failed to init storage, using defaults:', error);
      this.save();
    }
  },

  save() {
    if (!dataPath) return;
    try {
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  },

  getAllTasks() {
    return data.tasks;
  },

  createTask(taskData) {
    const nextOrder = data.tasks.reduce((max, t) => Math.max(max, t.order || 0), -1) + 1;
    const newTask = {
      id: generateId('t'),
      title: taskData.title || '',
      notes: taskData.notes || '',
      category: taskData.category || 'Other',
      priority: taskData.priority || 'med',
      dueDate: taskData.dueDate || null,
      dueTime: taskData.dueTime || null,
      recurrence: taskData.recurrence || { type: 'none', interval: 1, endDate: null },
      subtasks: taskData.subtasks || [],
      reminders: taskData.reminders || [],
      done: false,
      completedAt: null,
      createdAt: Date.now(),
      order: nextOrder
    };
    data.tasks.push(newTask);
    this.save();
    return newTask;
  },

  updateTask(id, taskData) {
    const task = data.tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, taskData);
      task.id = id; // prevent id overwrite
      if (!task.createdAt) task.createdAt = Date.now();
      this.save();
    }
    return task;
  },

  deleteTask(id) {
    data.tasks = data.tasks.filter(t => t.id !== id);
    this.save();
  },

  toggleTask(id) {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return null;

    let newRecurringTask = null;

    if (!task.done) {
      task.done = true;
      task.completedAt = Date.now();

      if (task.recurrence && task.recurrence.type !== 'none' && task.dueDate) {
        const d = new Date(`${task.dueDate}T${task.dueTime || '00:00'}:00`);
        const type = task.recurrence.type;
        const interval = task.recurrence.interval || 1;

        if (type === 'daily') d.setDate(d.getDate() + interval);
        else if (type === 'weekly') d.setDate(d.getDate() + interval * 7);
        else if (type === 'monthly') d.setMonth(d.getMonth() + interval);
        else if (type === 'weekday') {
          d.setDate(d.getDate() + 1);
          while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
        }
        else if (type === 'custom') d.setDate(d.getDate() + interval);

        const nextDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        
        let shouldCreate = true;
        if (task.recurrence.endDate && nextDateStr > task.recurrence.endDate) {
          shouldCreate = false;
        }

        if (shouldCreate) {
          newRecurringTask = JSON.parse(JSON.stringify(task));
          newRecurringTask.id = generateId('t');
          newRecurringTask.dueDate = nextDateStr;
          newRecurringTask.done = false;
          newRecurringTask.completedAt = null;
          newRecurringTask.reminders.forEach(r => r.sent = false);
          data.tasks.push(newRecurringTask);
        }
      }
    } else {
      task.done = false;
      task.completedAt = null;
    }

    this.save();
    return { task, newRecurringTask };
  },

  reorderTasks(orderedIds) {
    data.tasks.forEach(task => {
      const idx = orderedIds.indexOf(task.id);
      if (idx !== -1) task.order = idx;
    });
    this.save();
  },

  createSubtask(taskId, text) {
    const task = data.tasks.find(t => t.id === taskId);
    if (task) {
      const nextOrder = task.subtasks.reduce((max, s) => Math.max(max, s.order || 0), -1) + 1;
      const subtask = { id: generateId('s'), text, done: false, order: nextOrder };
      task.subtasks.push(subtask);
      this.save();
      return subtask;
    }
    return null;
  },

  updateSubtask(id, subtaskData) {
    for (const task of data.tasks) {
      const subtask = task.subtasks.find(s => s.id === id);
      if (subtask) {
        Object.assign(subtask, subtaskData);
        subtask.id = id;
        this.save();
        return subtask;
      }
    }
    return null;
  },

  deleteSubtask(id) {
    for (const task of data.tasks) {
      const idx = task.subtasks.findIndex(s => s.id === id);
      if (idx !== -1) {
        task.subtasks.splice(idx, 1);
        this.save();
        return;
      }
    }
  },

  toggleSubtask(id) {
    for (const task of data.tasks) {
      const subtask = task.subtasks.find(s => s.id === id);
      if (subtask) {
        subtask.done = !subtask.done;
        this.save();
        return subtask;
      }
    }
    return null;
  },

  getCategories() {
    return data.categories;
  },

  createCategory(name, color) {
    data.categories.push({ name, color });
    this.save();
  },

  updateCategory(oldName, newName, color) {
    const cat = data.categories.find(c => c.name === oldName);
    if (cat) {
      cat.name = newName;
      cat.color = color;
      data.tasks.forEach(t => {
        if (t.category === oldName) t.category = newName;
      });
      this.save();
    }
  },

  deleteCategory(name) {
    data.categories = data.categories.filter(c => c.name !== name);
    data.tasks.forEach(t => {
      if (t.category === name) t.category = 'Other';
    });
    this.save();
  },

  getSettings() {
    return data.settings;
  },

  setSetting(key, value) {
    data.settings[key] = value;
    this.save();
    return data.settings;
  },

  exportData() {
    return JSON.parse(JSON.stringify(data));
  },

  importData(imported) {
    if (imported && Array.isArray(imported.tasks) && Array.isArray(imported.categories) && typeof imported.settings === 'object') {
      data = imported;
      this.save();
      return true;
    }
    return false;
  },

  getTasksDueForReminder() {
    const results = [];
    const now = Date.now();

    data.tasks.forEach(task => {
      if (!task.done && task.dueDate) {
        const timeStr = task.dueTime || '09:00';
        const dueDateTime = new Date(`${task.dueDate}T${timeStr}:00`).getTime();
        
        if (!isNaN(dueDateTime)) {
          (task.reminders || []).forEach(reminder => {
            if (!reminder.sent) {
              const fireTime = dueDateTime - (reminder.leadMinutes || 0) * 60000;
              if (now >= fireTime) {
                results.push({ task, reminder });
              }
            }
          });
        }
      }
    });

    return results;
  },

  markReminderSent(taskId, reminderId) {
    const task = data.tasks.find(t => t.id === taskId);
    if (task) {
      const reminder = (task.reminders || []).find(r => r.id === reminderId);
      if (reminder) {
        reminder.sent = true;
        this.save();
      }
    }
  }
};

module.exports = storage;
