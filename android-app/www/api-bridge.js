// api-bridge.js - Complete Mobile & Android Native Bridge for Taskflow
// Emulates window.api using LocalStorage and Capacitor Native Plugins

const STORAGE_KEY = 'taskflow_data';

const DEFAULT_DATA = {
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
    startMinimized: false,
    notificationsEnabled: true
  }
};

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function hashStringToInt(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647; // 32-bit positive integer for Android notification ID
}

class MobileStorage {
  constructor() {
    this.data = this.load();
    this.eventListeners = {
      notificationClick: [],
      quickAdd: [],
      themeChange: []
    };
    this.initCapacitor();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.tasks && parsed.categories && parsed.settings) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  async initCapacitor() {
    const Cap = window.Capacitor;
    if (Cap && Cap.isNativePlatform()) {
      const LocalNotifications = Cap.Plugins.LocalNotifications;
      if (LocalNotifications) {
        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          const taskId = notification.notification?.extra?.taskId;
          if (taskId) {
            this.eventListeners.notificationClick.forEach(cb => cb(taskId));
          }
        });
      }
    }

    // Listen for OS theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      this.eventListeners.themeChange.forEach(cb => cb(e.matches));
    });
  }

  async requestNotificationPermission() {
    const Cap = window.Capacitor;
    if (Cap && Cap.isNativePlatform()) {
      const LocalNotifications = Cap.Plugins.LocalNotifications;
      if (LocalNotifications) {
        const status = await LocalNotifications.requestPermissions();
        return status.display === 'granted';
      }
    } else if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return false;
  }

  async scheduleNotifications(task) {
    const Cap = window.Capacitor;
    if (!task.reminders || task.reminders.length === 0 || !task.dueDate || task.done) {
      return;
    }

    const timeStr = task.dueTime || '09:00';
    const dueDateTime = new Date(`${task.dueDate}T${timeStr}:00`).getTime();
    if (isNaN(dueDateTime)) return;

    const now = Date.now();

    for (let i = 0; i < task.reminders.length; i++) {
      const reminder = task.reminders[i];
      const fireTime = dueDateTime - (reminder.leadMinutes || 0) * 60000;
      const notifId = hashStringToInt(`${task.id}_${i}`);

      if (fireTime > now) {
        if (Cap && Cap.isNativePlatform()) {
          const LocalNotifications = Cap.Plugins.LocalNotifications;
          if (LocalNotifications) {
            try {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    id: notifId,
                    title: 'Taskflow Reminder',
                    body: task.title,
                    schedule: { at: new Date(fireTime), allowWhileIdle: true },
                    extra: { taskId: task.id },
                    iconColor: '#6C63FF'
                  }
                ]
              });
            } catch (err) {
              console.warn('Error scheduling native notification:', err);
            }
          }
        }
      }
    }
  }

  async cancelNotifications(task) {
    const Cap = window.Capacitor;
    if (Cap && Cap.isNativePlatform() && task.reminders) {
      const LocalNotifications = Cap.Plugins.LocalNotifications;
      if (LocalNotifications) {
        const toCancel = task.reminders.map((_, i) => ({
          id: hashStringToInt(`${task.id}_${i}`)
        }));
        try {
          await LocalNotifications.cancel({ notifications: toCancel });
        } catch (err) {
          console.warn('Error canceling native notifications:', err);
        }
      }
    }
  }
}

const mobileStorage = new MobileStorage();

// Expose window.api exactly matching Electron's preload.js interface
window.api = {
  // Tasks
  getTasks: async () => {
    return mobileStorage.data.tasks;
  },

  createTask: async (taskData) => {
    const nextOrder = mobileStorage.data.tasks.reduce((max, t) => Math.max(max, t.order || 0), -1) + 1;
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
    mobileStorage.data.tasks.push(newTask);
    mobileStorage.save();
    await mobileStorage.scheduleNotifications(newTask);
    return newTask;
  },

  updateTask: async (id, taskData) => {
    const task = mobileStorage.data.tasks.find(t => t.id === id);
    if (task) {
      await mobileStorage.cancelNotifications(task);
      Object.assign(task, taskData);
      task.id = id;
      mobileStorage.save();
      if (!task.done) {
        await mobileStorage.scheduleNotifications(task);
      }
    }
    return task;
  },

  deleteTask: async (id) => {
    const task = mobileStorage.data.tasks.find(t => t.id === id);
    if (task) {
      await mobileStorage.cancelNotifications(task);
      mobileStorage.data.tasks = mobileStorage.data.tasks.filter(t => t.id !== id);
      mobileStorage.save();
    }
  },

  toggleTask: async (id) => {
    const task = mobileStorage.data.tasks.find(t => t.id === id);
    if (!task) return null;

    let newRecurringTask = null;

    if (!task.done) {
      task.done = true;
      task.completedAt = Date.now();
      await mobileStorage.cancelNotifications(task);

      // Handle recurrence
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
          mobileStorage.data.tasks.push(newRecurringTask);
          await mobileStorage.scheduleNotifications(newRecurringTask);
        }
      }
    } else {
      task.done = false;
      task.completedAt = null;
      await mobileStorage.scheduleNotifications(task);
    }

    mobileStorage.save();
    return { task, newRecurringTask };
  },

  reorderTasks: async (orderedIds) => {
    mobileStorage.data.tasks.forEach(task => {
      const idx = orderedIds.indexOf(task.id);
      if (idx !== -1) task.order = idx;
    });
    mobileStorage.save();
  },

  // Subtasks
  createSubtask: async (taskId, text) => {
    const task = mobileStorage.data.tasks.find(t => t.id === taskId);
    if (task) {
      const nextOrder = task.subtasks.reduce((max, s) => Math.max(max, s.order || 0), -1) + 1;
      const subtask = { id: generateId('s'), text, done: false, order: nextOrder };
      task.subtasks.push(subtask);
      mobileStorage.save();
      return subtask;
    }
    return null;
  },

  updateSubtask: async (id, subtaskData) => {
    for (const task of mobileStorage.data.tasks) {
      const subtask = task.subtasks.find(s => s.id === id);
      if (subtask) {
        Object.assign(subtask, subtaskData);
        subtask.id = id;
        mobileStorage.save();
        return subtask;
      }
    }
    return null;
  },

  deleteSubtask: async (id) => {
    for (const task of mobileStorage.data.tasks) {
      const idx = task.subtasks.findIndex(s => s.id === id);
      if (idx !== -1) {
        task.subtasks.splice(idx, 1);
        mobileStorage.save();
        return;
      }
    }
  },

  toggleSubtask: async (id) => {
    for (const task of mobileStorage.data.tasks) {
      const subtask = task.subtasks.find(s => s.id === id);
      if (subtask) {
        subtask.done = !subtask.done;
        mobileStorage.save();
        return subtask;
      }
    }
    return null;
  },

  // Categories
  getCategories: async () => {
    return mobileStorage.data.categories;
  },

  createCategory: async (name, color) => {
    mobileStorage.data.categories.push({ name, color });
    mobileStorage.save();
  },

  updateCategory: async (oldName, newName, color) => {
    const cat = mobileStorage.data.categories.find(c => c.name === oldName);
    if (cat) {
      cat.name = newName;
      cat.color = color;
      mobileStorage.data.tasks.forEach(t => {
        if (t.category === oldName) t.category = newName;
      });
      mobileStorage.save();
    }
  },

  deleteCategory: async (name) => {
    mobileStorage.data.categories = mobileStorage.data.categories.filter(c => c.name !== name);
    mobileStorage.data.tasks.forEach(t => {
      if (t.category === name) t.category = 'Other';
    });
    mobileStorage.save();
  },

  // Settings
  getSettings: async () => {
    return mobileStorage.data.settings;
  },

  setSetting: async (key, value) => {
    mobileStorage.data.settings[key] = value;
    mobileStorage.save();
    return mobileStorage.data.settings;
  },

  getSystemTheme: async () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  },

  // Mobile Import & Export
  exportData: async () => {
    try {
      const dataStr = JSON.stringify(mobileStorage.data, null, 2);
      const filename = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;

      // If Web Share API with files is available (mobile browser or WebView)
      if (navigator.canShare && navigator.canShare({ files: [new File([dataStr], filename, { type: 'application/json' })] })) {
        const file = new File([dataStr], filename, { type: 'application/json' });
        await navigator.share({
          files: [file],
          title: 'Taskflow Backup',
          text: 'Backup file of my Taskflow tasks'
        });
        return { success: true, filePath: 'Shared via Android' };
      }

      // Fallback: direct download link
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, filePath: filename };
    } catch (e) {
      console.error('Export failed:', e);
      return { success: false };
    }
  },

  importData: async () => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve({ success: false });
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const imported = JSON.parse(event.target.result);
            if (imported && Array.isArray(imported.tasks) && Array.isArray(imported.categories) && typeof imported.settings === 'object') {
              mobileStorage.data = imported;
              mobileStorage.save();

              // Reschedule notifications for active imported tasks
              for (const t of imported.tasks) {
                if (!t.done) await mobileStorage.scheduleNotifications(t);
              }

              resolve({ success: true });
            } else {
              resolve({ success: false });
            }
          } catch (err) {
            console.error('Import parse error:', err);
            resolve({ success: false });
          }
        };
        reader.onerror = () => resolve({ success: false });
        reader.readAsText(file);
      };

      document.body.appendChild(input);
      input.click();
      setTimeout(() => document.body.removeChild(input), 1000);
    });
  },

  // Android Native Notification Permission Helper
  requestPermission: async () => {
    return await mobileStorage.requestNotificationPermission();
  },

  quitApp: async () => {
    if (window.Capacitor && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.exitApp();
    }
  },

  // Events
  onNotificationClick: (callback) => {
    mobileStorage.eventListeners.notificationClick.push(callback);
  },
  onQuickAdd: (callback) => {
    mobileStorage.eventListeners.quickAdd.push(callback);
  },
  onThemeChange: (callback) => {
    mobileStorage.eventListeners.themeChange.push(callback);
  }
};
