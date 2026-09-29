const { app, BrowserWindow, Tray, Menu, nativeImage, nativeTheme, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const storage = require('./storage');
const notifications = require('./notifications');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const iconPath = path.join(__dirname, 'assets', 'icon.png');
const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');

function createWindow(startMinimized = false) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 500,
    show: !startMinimized,
    title: 'Taskflow',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const rendererPath = path.join(__dirname, 'renderer', 'index.html');
  if (fs.existsSync(rendererPath)) {
    mainWindow.loadFile(rendererPath);
  } else {
    mainWindow.loadURL('data:text/html;charset=utf-8,<html><body><h1>Taskflow App Running</h1></body></html>');
  }

  if (!startMinimized) {
    mainWindow.show();
    mainWindow.focus();
  }

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function updateTrayTooltip() {
  if (!tray) return;
  try {
    const tasks = storage.getAllTasks() || [];
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dueTodayOrOverdue = tasks.filter(t => !t.done && t.dueDate && (t.dueDate <= todayStr)).length;
    if (dueTodayOrOverdue > 0) {
      tray.setToolTip(`Taskflow — ${dueTodayOrOverdue} task${dueTodayOrOverdue > 1 ? 's' : ''} to do`);
    } else {
      tray.setToolTip('Taskflow — All caught up!');
    }
  } catch (e) {
    tray.setToolTip('Taskflow');
  }
}

function createTray() {
  const icon = fs.existsSync(trayIconPath) ? nativeImage.createFromPath(trayIconPath) : nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#ffffff" d="M12 24.4l-7.7-7.7 2.1-2.1 5.6 5.6 14.2-14.2 2.1 2.1z"/></svg>`).toString('base64'));
  tray = new Tray(icon);
  updateTrayTooltip();
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Taskflow', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: 'Quick Add Task', click: () => {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('tray:quick-add');
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => {
      isQuitting = true;
      app.quit();
    }}
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.taskflow.app');
  }
  
  storage.init();
  
  const settings = storage.getSettings();
  
  if (settings.autoLaunch) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  createWindow(!!settings.startMinimized);
  createTray();

  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors);
    }
  });

  notifications.start(mainWindow);
  notifications.checkMissedReminders();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Don't quit — tray should keep the app alive for notifications.
  // Quitting is handled explicitly via tray menu or settings button.
  if (isQuitting) {
    app.quit();
  }
});

// IPC Handlers mapping to storage
ipcMain.handle('tasks:getAll', () => storage.getAllTasks());
ipcMain.handle('tasks:create', (_, data) => {
  const result = storage.createTask(data);
  updateTrayTooltip();
  return result;
});
ipcMain.handle('tasks:update', (_, id, data) => {
  const result = storage.updateTask(id, data);
  updateTrayTooltip();
  return result;
});
ipcMain.handle('tasks:delete', (_, id) => {
  const result = storage.deleteTask(id);
  updateTrayTooltip();
  return result;
});
ipcMain.handle('tasks:toggle', (_, id) => {
  const result = storage.toggleTask(id);
  updateTrayTooltip();
  return result;
});
ipcMain.handle('tasks:reorder', (_, orderedIds) => storage.reorderTasks(orderedIds));

ipcMain.handle('subtasks:create', (_, taskId, text) => storage.createSubtask(taskId, text));
ipcMain.handle('subtasks:update', (_, id, data) => storage.updateSubtask(id, data));
ipcMain.handle('subtasks:delete', (_, id) => storage.deleteSubtask(id));
ipcMain.handle('subtasks:toggle', (_, id) => storage.toggleSubtask(id));

ipcMain.handle('categories:getAll', () => storage.getCategories());
ipcMain.handle('categories:create', (_, name, color) => storage.createCategory(name, color));
ipcMain.handle('categories:update', (_, oldName, newName, color) => storage.updateCategory(oldName, newName, color));
ipcMain.handle('categories:delete', (_, name) => storage.deleteCategory(name));

ipcMain.handle('settings:getAll', () => storage.getSettings());
ipcMain.handle('settings:set', (_, key, value) => {
  if (key === 'autoLaunch') {
    app.setLoginItemSettings({ openAtLogin: value });
  }
  return storage.setSetting(key, value);
});
ipcMain.handle('settings:getSystemTheme', () => nativeTheme.shouldUseDarkColors);

ipcMain.handle('data:export', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Taskflow Data',
    defaultPath: 'taskflow-data.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (!canceled && filePath) {
    try {
      const data = storage.exportData();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true, filePath };
    } catch (e) {
      console.error('Export failed:', e);
      return { success: false };
    }
  }
  return { success: false };
});

ipcMain.handle('data:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Taskflow Data',
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const fileData = fs.readFileSync(filePaths[0], 'utf8');
      const result = storage.importData(JSON.parse(fileData));
      return { success: result };
    } catch (e) {
      console.error('Import failed:', e);
      return { success: false };
    }
  }
  return { success: false };
});

ipcMain.handle('app:quit', () => {
  isQuitting = true;
  app.quit();
});
