const { Notification, nativeImage } = require('electron');
const storage = require('./storage');

const path = require('path');
const fs = require('fs');

let checkInterval = null;
let winRef = null;

const iconPath = path.join(__dirname, 'assets', 'icon.png');
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#4F8CFF" d="M12 24.4l-7.7-7.7 2.1-2.1 5.6 5.6 14.2-14.2 2.1 2.1z"/></svg>`;
const notifIcon = fs.existsSync(iconPath)
  ? nativeImage.createFromPath(iconPath)
  : nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from(iconSvg).toString('base64'));

function fireNotification(task) {
  const notif = new Notification({
    title: 'Taskflow Reminder',
    body: task.title,
    icon: notifIcon
  });
  
  notif.on('click', () => {
    if (winRef && !winRef.isDestroyed()) {
      winRef.show();
      winRef.focus();
      winRef.webContents.send('notification:clicked', task.id);
    }
  });

  notif.show();
}

function checkReminders() {
  const due = storage.getTasksDueForReminder();
  
  due.forEach(({ task, reminder }) => {
    fireNotification(task);
    storage.markReminderSent(task.id, reminder.id);
  });
}

module.exports = {
  start(mainWindow) {
    winRef = mainWindow;
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(checkReminders, 30000);
  },

  stop() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  },

  checkMissedReminders() {
    const due = storage.getTasksDueForReminder();
    const now = Date.now();

    due.forEach(({ task, reminder }) => {
      const timeStr = task.dueTime || '09:00';
      const dueDateTime = new Date(`${task.dueDate}T${timeStr}:00`).getTime();
      const fireTime = dueDateTime - (reminder.leadMinutes || 0) * 60000;

      // If missed in the last 5 minutes, fire it
      if (now - fireTime <= 5 * 60000) {
        fireNotification(task);
      }
      
      // Always mark as sent to prevent old notifications from constantly popping up
      storage.markReminderSent(task.id, reminder.id);
    });
  }
};
