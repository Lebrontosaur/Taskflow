const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Tasks
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  createTask: (data) => ipcRenderer.invoke('tasks:create', data),
  updateTask: (id, data) => ipcRenderer.invoke('tasks:update', id, data),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  toggleTask: (id) => ipcRenderer.invoke('tasks:toggle', id),
  reorderTasks: (orderedIds) => ipcRenderer.invoke('tasks:reorder', orderedIds),

  // Subtasks
  createSubtask: (taskId, text) => ipcRenderer.invoke('subtasks:create', taskId, text),
  updateSubtask: (id, data) => ipcRenderer.invoke('subtasks:update', id, data),
  deleteSubtask: (id) => ipcRenderer.invoke('subtasks:delete', id),
  toggleSubtask: (id) => ipcRenderer.invoke('subtasks:toggle', id),

  // Categories
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  createCategory: (name, color) => ipcRenderer.invoke('categories:create', name, color),
  updateCategory: (oldName, newName, color) => ipcRenderer.invoke('categories:update', oldName, newName, color),
  deleteCategory: (name) => ipcRenderer.invoke('categories:delete', name),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getSystemTheme: () => ipcRenderer.invoke('settings:getSystemTheme'),

  // Import/Export
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),

  // App control
  quitApp: () => ipcRenderer.invoke('app:quit'),

  // Events from main process
  onNotificationClick: (callback) => ipcRenderer.on('notification:clicked', (_event, taskId) => callback(taskId)),
  onQuickAdd: (callback) => ipcRenderer.on('tray:quick-add', () => callback()),
  onThemeChange: (callback) => ipcRenderer.on('theme:changed', (_event, isDark) => callback(isDark))
});
