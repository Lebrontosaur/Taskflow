# Taskflow 📋

I made this because I was getting tired of using messy Notepad files to track my daily tasks. I wanted a clean to-do app that actually sends me reminders and notifications, but runs **100% locally on my own devices** without saving my personal info, habits, or data to any external cloud servers.

You can freely use and install either the **laptop (Windows)** version, the **phone (Android)** version, or both!

---

## Laptop (Windows Desktop)

Runs as a native Windows desktop app with desktop notifications and system tray support.

### How to Run:
```bash
npm install
npm start
```

### How to Build Windows Installer (.exe):
```bash
npm run build
```
This generates a standalone installer inside the `build/` folder.

---

## Phone (Android)

Adapted for mobile with bottom navigation, thumb-friendly buttons, and native Android alarm notifications that ring even when your phone is locked or asleep.

### Option 1: Instant Web Preview
You can test the mobile app directly in your browser:
```bash
npx serve android-app/www -p 3000
```
Open `http://localhost:3000` (or open your computer's local IP address on your phone's browser).

### Option 2: Download the Android APK (.apk)
1. Go to the **Actions** tab on this GitHub repository.
2. Click **Build Taskflow Android APK** and hit **Run workflow**.
3. Once finished, download the generated **`app-debug.apk`** file and install it directly on your Android phone!

---

## What It Does

- **100% Local & Private**: No accounts, no telemetry, no cloud sync. All data stays strictly on your machine.
- **Real Reminders & Notifications**: Sends desktop toasts on Windows and native alarms on Android.
- **Smart Views**: Today (with overdue items), Upcoming (grouped by day), All Tasks, and Completed.
- **Calendar Tab**: Month and week grid with category dots and a day detail view.
- **Checklists & Subtasks**: Multi-step subtasks with live progress bars.
- **Recurring Tasks**: Auto-regenerates daily, weekday, weekly, monthly, or custom interval tasks when completed.
- **Dark & Light Modes**: Adapts to your system theme automatically or with manual toggle.
- **Backup & Restore**: Export/import your tasks to a JSON file anytime.
