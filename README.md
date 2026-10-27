# ContestPulse — Competitive Programming Contest Tracker

> A modern Manifest V3 Chrome Extension that tracks competitive programming contests across **Codeforces**, **LeetCode**, **CodeChef**, and **AtCoder**, and delivers native desktop reminders before contests begin.

---

## 🚀 Quick Install on Another Computer (End Users)

**No Node.js, npm, or build tools are required on the receiving computer.** The extension is pre-compiled and ready to run.

### Step-by-Step Installation:

1. **Extract the ZIP file**:
   - Right-click `ContestPulse-v0.1.0.zip` and select **Extract All...** (or your unzipper tool).
   - This creates an extracted folder containing `manifest.json` right at its root.

2. **Open Chrome Extensions**:
   - In Google Chrome (or Brave, Edge, Opera, or Chromium), open a new tab and go to:
     ```
     chrome://extensions
     ```
   - Alternatively, click the **puzzle icon** in your toolbar and select **Manage extensions**.

3. **Enable Developer Mode**:
   - In the top-right corner of the Extensions page, toggle the **Developer mode** switch to **ON**.

4. **Load the Extension**:
   - Click the **Load unpacked** button in the top-left toolbar.
   - In the folder selector dialog, select the extracted folder (the folder containing `manifest.json`).
   - Click **Select Folder**.

5. **Pin to Toolbar**:
   - Click the Chrome extensions (puzzle) icon in your browser toolbar.
   - Click the **pin icon** next to **ContestPulse** to keep it readily accessible.

---

### ❓ Troubleshooting "Manifest file is missing or unreadable"
If Chrome displays an error saying *“Manifest file is missing or unreadable”*, this means the folder you selected was one level too high or too low.
- Open the extracted folder in your file explorer.
- Confirm that you see `manifest.json`, `background.js`, and `popup/` directly inside it.
- In Chrome, click **Load unpacked** and select that exact folder.

---

## ✨ Features

- **Multi-Platform Contest Tracking**: Real-time contest schedules for **Codeforces**, **LeetCode**, **CodeChef**, and **AtCoder**.
- **Interactive Time Filtering**: Filter contests by `All`, `Ongoing`, `Next 24h`, and `Next 7d`.
- **Platform Filtering & Search**: Toggle specific platforms on/off or type to search contest titles instantly.
- **Native OS Reminders**: One-click quick alerts at `30m`, `15m`, `10m` before contest start, or set a custom minute offset.
- **Service Worker Reliability**: Runs on Chrome's Manifest V3 background service worker using `chrome.alarms` to trigger alerts even after the browser restarts.
- **Fault-Isolated Network Sync**: Uses `Promise.allSettled` so if one platform API is temporarily down, the other platforms continue updating without interruption.
- **Instant Offline Access**: Contests are cached in `chrome.storage.local` for instant popup rendering with zero latency.
- **Theme Support**: Seamless Dark mode, Light mode, and System preference synchronization.

---

## 🛠️ Developer Setup & Build Instructions

If you want to modify the source code or rebuild styles:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### 1. Install Dependencies
```bash
npm install
```

### 2. Build or Watch Styles
Tailwind CSS compiles `./src/input.css` into the standalone runtime bundle `./assets/styles.css`:

```bash
# One-time production minified build
npm run build:css

# Live rebuild during design development
npm run watch:css
```

### 3. Package Distribution ZIP
To create a clean, portable distribution ZIP excluding `node_modules`, `.git`, and development files:

```bash
npm run package
```
This generates `ContestPulse-v0.1.0.zip` ready to be shared and loaded on any computer.

---

## 📁 Project Structure

```
contestpulse/
├── manifest.json            # Manifest V3 extension configuration
├── background.js            # Background service worker (alarms, sync, notifications)
├── popup/                   # Main extension dashboard popup
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── alarms/                  # Alarms & reminders management screen
│   ├── alarms.html
│   ├── alarms.css
│   └── alarms.js
├── options/                 # Settings and preferences screen
│   ├── options.html
│   ├── options.css
│   └── options.js
├── components/              # Modular UI components (ContestCard, FilterBar, ReminderPicker, PlatformChip)
├── providers/               # Contest API adapters (Codeforces, LeetCode, CodeChef, AtCoder)
├── services/                # Core business services (syncService, alarmService, storageService, contestService)
├── utils/                   # Shared utilities (dateUtils, formatUtils, platformUtils, themeUtils)
├── assets/                  # Runtime assets (pre-compiled styles.css, logo.png)
├── icons/                   # Chrome toolbar & store icons (16, 32, 48, 128px)
├── src/                     # Developer source CSS for Tailwind CLI
└── package.json             # Build scripts and dev dependencies
```

---

## 🔒 Permissions & Security

ContestPulse follows the principle of least privilege:
- `storage`: Persists contest schedules and user reminder preferences locally.
- `alarms`: Schedules reminder triggers with low CPU overhead.
- `notifications`: Triggers native OS desktop notifications.
- `tabs`: Opens the contest page when a notification or card is clicked.
- `host_permissions`: Strictly limited to the 4 contest websites (`*.codeforces.com`, `*.codechef.com`, `*.leetcode.com`, `*.atcoder.jp`).
- **Zero Telemetry / No External CDNs**: All scripts, fonts, and icons are bundled locally with zero tracking.
