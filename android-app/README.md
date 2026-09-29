# Taskflow for Android (Capacitor)

A clean, modern offline personal task manager adapted for Android devices.

---

## 📱 Mobile Highlights & Native Features

1. **Native Android Alarm Notifications**:
   - Uses `@capacitor/local-notifications` to pre-schedule reminders directly with Android's AlarmManager.
   - Reminders fire reliably even when the app is swiped away or phone is locked/asleep.
   - Supports Android 13+ runtime notification permissions.

2. **Mobile-First UX**:
   - Ergonomic **Bottom Navigation Bar** (`Today`, `Upcoming`, `Calendar`, `All`, `Settings`).
   - Floating Action Button (**FAB**) for 1-tap task creation.
   - Mobile sheet dialogs that slide up from the bottom with full keyboard support.
   - **Calendar Category Dots** replacing cramped text pills on smaller screens.
   - 44px+ touch targets for effortless thumb interaction.

3. **Backup & Share**:
   - **Share / Export**: Uses Android's native share sheet (`navigator.share`) to back up tasks to Google Drive, WhatsApp, Files, etc.
   - **Import**: Restores your JSON backups directly from phone storage.

---

## 🚀 How to Run & Build

### Method 1: Instant Local Preview (Phone or PC Browser)
You can test the mobile app immediately in your phone's browser or desktop browser:

```bash
# In the project root or android-app folder:
npx serve android-app/www -p 3000
```
Then open `http://localhost:3000` (or `http://<your-pc-ip>:3000` on your phone connected to the same Wi-Fi!).

---

### Method 2: Build the `.apk` in the Cloud (Zero Local Setup)
A GitHub Actions workflow is pre-configured in `.github/workflows/build-apk.yml`.
1. Push this project to your GitHub repository (public or private).
2. Go to the **Actions** tab on GitHub.
3. Select **Build Taskflow Android APK** and click **Run workflow**.
4. Once completed (typically ~2-3 minutes), download the generated **`taskflow-android-debug-apk`** zip file containing `app-debug.apk`.
5. Transfer `app-debug.apk` to your Android phone and tap to install!

---

### Method 3: Build Locally with Android Studio
If you have Android Studio installed on your computer:

```bash
cd android-app
npm install
npx cap add android
npx cap sync android
npx cap open android
```
In Android Studio:
- Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- Locate the output `.apk` file and install it on your device.
