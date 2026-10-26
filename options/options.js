// Settings / Options Controller
// Implements Design Spec §6.3 and Phase 3 Preferences Management.

import {
  getSettings,
  saveSettings,
  resetSettingsToDefaults,
  clearContestCache,
  getStorageUsageBytes,
} from "../services/storageService.js";
import { reconcileAlarms } from "../services/alarmService.js";
import { syncContests } from "../services/syncService.js";
import { applyTheme } from "../utils/themeUtils.js";
import { PLATFORMS } from "../utils/platformUtils.js";
import { escapeHtml } from "../utils/formatUtils.js";

// State
const state = {
  settings: null,
  originalSettings: null,
  storageBytes: 0,
  isSaving: false,
  isClearingCache: false,
  activeModal: null, // null | 'resetConfirm' | 'platformOverride'
  overridePlatform: null,
  toastMessage: null,
  toastTimeout: null,
};

const ALL_PLATFORMS = [
  { id: "Codeforces", name: "Codeforces", domain: "codeforces.com", tag: "CF" },
  { id: "LeetCode", name: "LeetCode", domain: "leetcode.com", tag: "LC" },
  { id: "CodeChef", name: "CodeChef", domain: "codechef.com", tag: "CC" },
  { id: "AtCoder", name: "AtCoder", domain: "atcoder.jp", tag: "AC" },
];

async function init() {
  const app = document.getElementById("app");
  if (!app) return;

  const [settings, bytes] = await Promise.all([
    getSettings(),
    getStorageUsageBytes(),
  ]);

  // Deep clone to allow discarding edits on Cancel
  state.settings = JSON.parse(JSON.stringify(settings));
  state.originalSettings = JSON.parse(JSON.stringify(settings));
  state.storageBytes = bytes;

  // Apply active theme immediately
  applyTheme(state.settings.theme || "system");

  render();
}

/**
 * Main render function
 */
function render() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = "";

  // 1. Sticky Header
  app.appendChild(createHeader());

  // 2. Scrollable Body
  const main = document.createElement("main");
  main.className =
    "flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-3.5 min-h-0 select-none";

  // Section 1: Notification System
  main.appendChild(createNotificationSection());

  // Section 2: Default Reminder Presets
  main.appendChild(createPresetsSection());

  // Section 3: Active Platforms
  main.appendChild(createPlatformsSection());

  // Section 4: Sync & Storage
  main.appendChild(createSyncStorageSection());

  // Section 5: Appearance
  main.appendChild(createAppearanceSection());

  app.appendChild(main);

  // 3. Persistent Footer
  app.appendChild(createFooter());

  // 4. Modals (if active)
  if (state.activeModal === "resetConfirm") {
    app.appendChild(createResetConfirmModal());
  } else if (state.activeModal === "platformOverride") {
    app.appendChild(createPlatformOverrideModal());
  }

  // 5. Toast notification (if active)
  if (state.toastMessage) {
    app.appendChild(createToast());
  }
}

/**
 * Creates Sticky Header as per Design Spec §5.10 & §6.3.
 */
function createHeader() {
  const header = document.createElement("header");
  header.className =
    "h-12 px-3.5 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-glass)] backdrop-blur-md sticky top-0 z-20 select-none shrink-0";

  // Left: Back button + Title + Subtitle
  const left = document.createElement("div");
  left.className = "flex items-center gap-2";

  const backBtn = document.createElement("button");
  backBtn.id = "back-btn";
  backBtn.type = "button";
  backBtn.setAttribute("aria-label", "Back to Contests Feed");
  backBtn.className =
    "w-7 h-7 rounded-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer";
  backBtn.innerHTML = `
    <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  `;
  backBtn.addEventListener("click", () => {
    // Revert theme if user previewed without saving
    applyTheme(state.originalSettings.theme || "system");
    window.location.href = "../popup/popup.html";
  });
  left.appendChild(backBtn);

  const logo = document.createElement("div");
  logo.className =
    "w-6 h-6 rounded-sm bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shadow-sm shrink-0";
  logo.innerHTML = `
    <img src="../assets/logo.png" alt="ContestPulse" class="w-full h-full object-cover"/>
  `;
  left.appendChild(logo);

  const titleCol = document.createElement("div");
  titleCol.className = "flex flex-col";

  const titleRow = document.createElement("div");
  titleRow.className = "flex items-center gap-1.5";
  titleRow.innerHTML = `
    <h1 class="text-xs font-bold text-[var(--text)] leading-none">ContestPulse</h1>
    <span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></span>
  `;
  titleCol.appendChild(titleRow);

  const sub = document.createElement("span");
  sub.className =
    "text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--muted)] leading-none mt-0.5";
  sub.textContent = "SETTINGS";
  titleCol.appendChild(sub);

  left.appendChild(titleCol);
  header.appendChild(left);

  // Right: Version Tag & Reset Defaults Button
  const right = document.createElement("div");
  right.className = "flex items-center gap-2";

  const ver = document.createElement("span");
  ver.className = "font-mono text-[10px] text-[var(--muted)]";
  ver.textContent = "v0.1.0";
  right.appendChild(ver);

  const resetBtn = document.createElement("button");
  resetBtn.id = "reset-defaults-btn";
  resetBtn.type = "button";
  resetBtn.setAttribute("aria-label", "Reset to Defaults");
  resetBtn.setAttribute("title", "Reset all settings to defaults");
  resetBtn.className =
    "w-6 h-6 rounded-sm border border-[var(--border-subtle)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)] transition-colors cursor-pointer";
  resetBtn.innerHTML = `
    <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  `;
  resetBtn.addEventListener("click", () => {
    state.activeModal = "resetConfirm";
    render();
  });
  right.appendChild(resetBtn);

  header.appendChild(right);
  return header;
}

/**
 * Section 1: Notification System as per Design Spec §6.3 item 1.
 */
function createNotificationSection() {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1.5";

  const title = document.createElement("div");
  title.className =
    "text-[11px] font-bold uppercase tracking-[0.55px] text-[var(--muted)] px-0.5";
  title.textContent = "NOTIFICATION SYSTEM";
  container.appendChild(title);

  const card = document.createElement("div");
  card.className =
    "bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 flex flex-col gap-2.5 shadow-sm";

  // Row 1: Master switch
  const masterRow = document.createElement("div");
  masterRow.className = "flex items-center justify-between";

  const left = document.createElement("div");
  left.className = "flex items-center gap-2.5";
  left.innerHTML = `
    <div class="w-7 h-7 rounded-sm bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shrink-0">
      <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </div>
    <div class="flex flex-col">
      <span class="text-xs font-semibold text-[var(--text)] leading-tight">Browser Notifications</span>
      <span class="text-[10px] text-[var(--muted)] leading-tight mt-0.5">Alarms fire when extension is closed</span>
    </div>
  `;
  masterRow.appendChild(left);

  // Master Toggle (40x20 squarish toggle as per §5.12)
  const isEnabled = state.settings.notificationsEnabled !== false;
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.role = "switch";
  toggleBtn.setAttribute("aria-checked", isEnabled ? "true" : "false");
  toggleBtn.setAttribute("aria-label", "Toggle browser notifications");
  toggleBtn.className = `w-10 h-5 rounded-md p-0.5 transition-colors cursor-pointer flex items-center ${
    isEnabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
  }`;
  toggleBtn.innerHTML = `
    <span class="w-4 h-4 rounded-sm transition-transform duration-150 shadow-sm ${
      isEnabled
        ? "bg-[var(--surface)] translate-x-5"
        : "bg-[var(--muted)] translate-x-0"
    }"></span>
  `;
  toggleBtn.addEventListener("click", () => {
    state.settings.notificationsEnabled = !isEnabled;
    render();
  });
  masterRow.appendChild(toggleBtn);
  card.appendChild(masterRow);

  // Row 2: Divider & Status
  const divider = document.createElement("div");
  divider.className = "border-t border-[var(--border-subtle)] pt-1.5";

  const statusRow = document.createElement("div");
  statusRow.className = "flex items-center gap-1.5 text-[10px]";

  if (isEnabled) {
    statusRow.innerHTML = `
      <svg class="w-3.5 h-3.5 text-[var(--success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span class="text-[var(--text)] font-medium">Chrome alarm permission active</span>
    `;
  } else {
    statusRow.innerHTML = `
      <svg class="w-3.5 h-3.5 text-[var(--warning)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span class="text-[var(--warning)] font-medium">Notifications globally muted</span>
    `;
  }
  divider.appendChild(statusRow);
  card.appendChild(divider);

  container.appendChild(card);
  return container;
}

/**
 * Section 2: Default Reminder Presets as per Design Spec §6.3 item 2 & §5.14.
 */
function createPresetsSection() {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1.5";

  const headerRow = document.createElement("div");
  headerRow.className = "flex items-center justify-between px-0.5";
  headerRow.innerHTML = `
    <span class="text-[11px] font-bold uppercase tracking-[0.55px] text-[var(--muted)]">DEFAULT REMINDER PRESETS</span>
    <span class="text-[10px] font-semibold text-[var(--primary)]">Auto-applied</span>
  `;
  container.appendChild(headerRow);

  const card = document.createElement("div");
  card.className =
    "bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 flex flex-col gap-2.5 shadow-sm";

  // Three preset chips row (30m, 15m, 10m)
  const presets = [30, 15, 10];
  const chipsGrid = document.createElement("div");
  chipsGrid.className = "grid grid-cols-3 gap-2";

  presets.forEach((offset) => {
    const isChecked = (state.settings.defaultReminders || []).includes(offset);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.setAttribute("aria-pressed", isChecked ? "true" : "false");
    chip.className = `py-1.5 px-2 rounded-md border flex items-center justify-center gap-1.5 text-[11px] font-mono transition-colors cursor-pointer select-none ${
      isChecked
        ? "bg-[var(--border)] border-[var(--border)] text-[var(--text)] font-semibold"
        : "bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)]"
    }`;

    chip.innerHTML = `
      <span class="w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${
        isChecked
          ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-on)]"
          : "border-[var(--border)] bg-transparent"
      }">
        ${
          isChecked
            ? `<svg class="w-2.5 h-2.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>`
            : ""
        }
      </span>
      <span>${offset}m</span>
    `;

    chip.addEventListener("click", () => {
      let current = state.settings.defaultReminders || [];
      if (isChecked) {
        current = current.filter((o) => o !== offset);
      } else {
        current = [...current, offset].sort((a, b) => b - a);
      }
      state.settings.defaultReminders = current;
      render();
    });

    chipsGrid.appendChild(chip);
  });
  card.appendChild(chipsGrid);

  // Divider
  const divider = document.createElement("div");
  divider.className =
    "border-t border-[var(--border-subtle)] pt-2 flex items-center justify-between";

  const customLabel = document.createElement("label");
  customLabel.htmlFor = "custom-offset-input";
  customLabel.className = "text-[11px] font-medium text-[var(--muted)]";
  customLabel.textContent = "Custom default offset:";
  divider.appendChild(customLabel);

  const customRight = document.createElement("div");
  customRight.className = "flex items-center gap-1.5";

  const numInput = document.createElement("input");
  numInput.id = "custom-offset-input";
  numInput.type = "number";
  numInput.min = "1";
  numInput.max = "1440";
  numInput.step = "1";
  numInput.value = state.settings.customDefaultOffset || 20;
  numInput.className =
    "w-12 h-6 px-1 text-center font-mono text-[11px] bg-[var(--bg)] text-[var(--text)] rounded-sm border border-[var(--border)] focus:outline-none focus:border-[var(--primary)]";

  numInput.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0 && val <= 1440) {
      state.settings.customDefaultOffset = val;
    }
  });

  customRight.appendChild(numInput);

  const suffix = document.createElement("span");
  suffix.className = "text-[11px] text-[var(--muted)] font-mono";
  suffix.textContent = "min";
  customRight.appendChild(suffix);

  divider.appendChild(customRight);
  card.appendChild(divider);

  container.appendChild(card);
  return container;
}

/**
 * Section 3: Active Contest Platforms as per Design Spec §6.3 item 3 & §5.16.
 */
function createPlatformsSection() {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1.5";

  const enabledList = state.settings.enabledPlatforms || [];
  const headerRow = document.createElement("div");
  headerRow.className = "flex items-center justify-between px-0.5";
  headerRow.innerHTML = `
    <span class="text-[11px] font-bold uppercase tracking-[0.55px] text-[var(--muted)]">ACTIVE CONTEST PLATFORMS</span>
    <span class="text-[10px] font-mono text-[var(--primary)]">${enabledList.length} selected</span>
  `;
  container.appendChild(headerRow);

  const card = document.createElement("div");
  card.className =
    "bg-[var(--surface)] border border-[var(--border)] rounded-md overflow-hidden divide-y divide-[var(--border-subtle)] shadow-sm";

  ALL_PLATFORMS.forEach((platform) => {
    const isChecked = enabledList.includes(platform.id);
    const row = document.createElement("div");
    row.className =
      "px-2.5 py-2 flex items-center justify-between hover:bg-[var(--surface-raised)] transition-colors select-none";

    // Left: Checkbox + Tag + Name & Domain
    const left = document.createElement("div");
    left.className = "flex items-center gap-2 cursor-pointer";

    // Custom Checkbox
    const chk = document.createElement("button");
    chk.type = "button";
    chk.setAttribute("aria-label", `Toggle ${platform.name}`);
    chk.className = `w-4 h-4 rounded-sm flex items-center justify-center border transition-colors cursor-pointer ${
      isChecked
        ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-on)]"
        : "bg-[var(--bg)] border-[var(--border)] text-transparent"
    }`;
    chk.innerHTML = `
      <svg class="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="3">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;
    left.appendChild(chk);

    // Platform Tag [CF], [LC], etc.
    const tag = document.createElement("span");
    tag.className =
      "font-mono text-[10px] px-1 py-0.5 rounded-sm bg-[var(--fill-subtle)] border border-[var(--border-subtle)] text-[var(--primary)] font-bold";
    tag.textContent = `[${platform.tag}]`;
    left.appendChild(tag);

    // Name & Domain
    const textCol = document.createElement("div");
    textCol.className = "flex flex-col";
    textCol.innerHTML = `
      <span class="text-xs font-semibold ${
        isChecked ? "text-[var(--text)]" : "text-[var(--muted)]"
      } leading-tight">${platform.name}</span>
      <span class="text-[10px] text-[var(--muted-70)] font-mono leading-tight">${
        platform.domain
      }</span>
    `;
    left.appendChild(textCol);

    const togglePlatform = () => {
      let current = state.settings.enabledPlatforms || [];
      if (isChecked) {
        if (current.length <= 1) {
          showToast("At least one platform must remain enabled.");
          return;
        }
        current = current.filter((p) => p !== platform.id);
      } else {
        current = [...current, platform.id];
      }
      state.settings.enabledPlatforms = current;
      render();
    };

    chk.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePlatform();
    });
    left.addEventListener("click", togglePlatform);
    row.appendChild(left);

    // Right: Sliders Icon for per-platform reminder overrides (Design §5.16 & PRD §15)
    const slidersBtn = document.createElement("button");
    slidersBtn.type = "button";
    slidersBtn.setAttribute(
      "aria-label",
      `${platform.name} Reminder Preferences`,
    );
    slidersBtn.setAttribute("title", `Configure ${platform.name} reminders`);
    slidersBtn.className =
      "w-7 h-7 rounded-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--bg)] transition-colors cursor-pointer";
    slidersBtn.innerHTML = `
      <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="1.8">
        <line x1="4" y1="21" x2="4" y2="14"/>
        <line x1="4" y1="10" x2="4" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12" y2="3"/>
        <line x1="20" y1="21" x2="20" y2="16"/>
        <line x1="20" y1="12" x2="20" y2="3"/>
        <line x1="1" y1="14" x2="7" y2="14"/>
        <line x1="9" y1="8" x2="15" y2="8"/>
        <line x1="17" y1="16" x2="23" y2="16"/>
      </svg>
    `;
    slidersBtn.addEventListener("click", () => {
      state.overridePlatform = platform.id;
      state.activeModal = "platformOverride";
      render();
    });
    row.appendChild(slidersBtn);

    card.appendChild(row);
  });

  container.appendChild(card);
  return container;
}

/**
 * Section 4: Sync & Storage as per Design Spec §6.3 item 4.
 */
function createSyncStorageSection() {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1.5";

  const title = document.createElement("div");
  title.className =
    "text-[11px] font-bold uppercase tracking-[0.55px] text-[var(--muted)] px-0.5";
  title.textContent = "SYNC & STORAGE";
  container.appendChild(title);

  const card = document.createElement("div");
  card.className =
    "bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 flex flex-col gap-2.5 shadow-sm";

  // Background Sync Interval row
  const syncRow = document.createElement("div");
  syncRow.className = "flex items-center justify-between";

  syncRow.innerHTML = `
    <div class="flex flex-col">
      <span class="text-xs font-semibold text-[var(--text)] leading-tight">Background Sync</span>
      <span class="text-[10px] text-[var(--muted)] leading-tight mt-0.5">Automatic polling frequency</span>
    </div>
  `;

  // Segmented Control (15m / 30m / 1h)
  const syncIntervals = [
    { label: "15m", value: 15 },
    { label: "30m", value: 30 },
    { label: "1h", value: 60 },
  ];
  const activeInterval = state.settings.syncIntervalMinutes || 60;

  const seg = document.createElement("div");
  seg.className =
    "flex items-center gap-1 bg-[var(--bg)] p-0.5 rounded-md border border-[var(--border-subtle)]";

  syncIntervals.forEach((item) => {
    const isCur = activeInterval === item.value;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `px-2 py-1 rounded-sm text-[10px] font-mono transition-colors cursor-pointer ${
      isCur
        ? "bg-[var(--primary)] text-[var(--primary-on)] font-bold shadow-sm"
        : "text-[var(--muted)] hover:text-[var(--text)] font-medium"
    }`;
    btn.textContent = item.label;
    btn.addEventListener("click", () => {
      state.settings.syncIntervalMinutes = item.value;
      render();
    });
    seg.appendChild(btn);
  });
  syncRow.appendChild(seg);
  card.appendChild(syncRow);

  // Divider
  const divider = document.createElement("div");
  divider.className =
    "border-t border-[var(--border-subtle)] pt-2 flex items-center justify-between";

  // Cache Usage & Clear Button
  const kb = Math.max(1, Math.round((state.storageBytes || 0) / 1024));
  const usageText = document.createElement("span");
  usageText.className = "font-mono text-[11px] text-[var(--muted)]";
  usageText.textContent = `Cache: ${kb} KB used`;
  divider.appendChild(usageText);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className =
    "px-2.5 py-1 rounded-sm border border-[var(--border)] text-[var(--text)] text-[10px] font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer flex items-center gap-1.5";
  clearBtn.innerHTML = `
    <svg class="w-3 h-3 stroke-current ${
      state.isClearingCache ? "spin-active" : ""
    }" fill="none" viewBox="0 0 24 24" stroke-width="2">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
    </svg>
    <span>${state.isClearingCache ? "Resyncing..." : "Clear Cache & Resync"}</span>
  `;

  clearBtn.addEventListener("click", async () => {
    if (state.isClearingCache) return;
    state.isClearingCache = true;
    render();

    try {
      await clearContestCache();
      await syncContests();
      state.storageBytes = await getStorageUsageBytes();
      showToast("Cache cleared and fresh contests synced!");
    } catch (e) {
      console.error("Failed to clear cache:", e);
      showToast("Sync error: " + (e.message || "Failed"));
    } finally {
      state.isClearingCache = false;
      render();
    }
  });

  divider.appendChild(clearBtn);
  card.appendChild(divider);

  container.appendChild(card);
  return container;
}

/**
 * Section 5: Appearance as per Design Spec §6.3 item 5 & §5.15.
 */
function createAppearanceSection() {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1.5";

  const title = document.createElement("div");
  title.className =
    "text-[11px] font-bold uppercase tracking-[0.55px] text-[var(--muted)] px-0.5";
  title.textContent = "APPEARANCE";
  container.appendChild(title);

  const card = document.createElement("div");
  card.className =
    "bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 flex items-center justify-between shadow-sm";

  card.innerHTML = `
    <div class="flex flex-col">
      <span class="text-xs font-semibold text-[var(--text)] leading-tight">Theme</span>
      <span class="text-[10px] text-[var(--muted)] leading-tight mt-0.5">Color palette mode</span>
    </div>
  `;

  // Segmented control: Dark / Light / System
  const themes = [
    { label: "Dark", value: "dark" },
    { label: "Light", value: "light" },
    { label: "System", value: "system" },
  ];
  const curTheme = state.settings.theme || "system";

  const seg = document.createElement("div");
  seg.className =
    "flex items-center gap-1 bg-[var(--bg)] p-0.5 rounded-md border border-[var(--border-subtle)] text-[10px]";

  themes.forEach((t) => {
    const isCur = curTheme === t.value;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `px-2.5 py-1 rounded-sm transition-colors cursor-pointer font-semibold ${
      isCur
        ? "bg-[var(--primary)] text-[var(--primary-on)] shadow-sm"
        : "text-[var(--muted)] hover:text-[var(--text)]"
    }`;
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      state.settings.theme = t.value;
      applyTheme(t.value); // live theme preview!
      render();
    });
    seg.appendChild(btn);
  });

  card.appendChild(seg);
  container.appendChild(card);
  return container;
}

/**
 * Section 6: Persistent Footer as per Design Spec §6.3 item 6.
 */
function createFooter() {
  const footer = document.createElement("footer");
  footer.className =
    "h-[52px] px-3.5 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between shrink-0 select-none";

  // Cancel link
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className =
    "underline text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    // Revert theme preview if changed
    applyTheme(state.originalSettings.theme || "system");
    window.location.href = "../popup/popup.html";
  });
  footer.appendChild(cancelBtn);

  // Save Preferences Button
  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.disabled = state.isSaving;
  saveBtn.className =
    "px-4 py-1.5 rounded-sm bg-[var(--primary)] text-[var(--primary-on)] font-bold text-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center gap-1.5";
  saveBtn.innerHTML = `
    <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>${state.isSaving ? "Saving..." : "Save Preferences"}</span>
  `;

  saveBtn.addEventListener("click", async () => {
    if (state.isSaving) return;
    state.isSaving = true;
    render();

    try {
      // 1. Save settings to storage
      await saveSettings(state.settings);
      state.originalSettings = JSON.parse(JSON.stringify(state.settings));

      // 2. Reconcile alarms according to newly enabled/disabled platforms and notifications toggle
      await reconcileAlarms();

      // 3. Update Chrome background sync alarm period if applicable
      if (typeof chrome !== "undefined" && chrome.alarms?.create) {
        chrome.alarms.create("contestpulse-sync", {
          periodInMinutes: state.settings.syncIntervalMinutes || 60,
        });
      }

      showToast("✓ Preferences saved successfully!");

      // Return to feed after brief success confirmation
      setTimeout(() => {
        window.location.href = "../popup/popup.html";
      }, 500);
    } catch (e) {
      console.error("Failed to save settings:", e);
      showToast("Save failed: " + (e.message || "Unknown error"));
      state.isSaving = false;
      render();
    }
  });

  footer.appendChild(saveBtn);
  return footer;
}

/**
 * Confirmation modal for Reset to Defaults as per Design Spec §10.
 */
function createResetConfirmModal() {
  const overlay = document.createElement("div");
  overlay.className =
    "fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in";

  const modal = document.createElement("div");
  modal.className =
    "w-full max-w-[320px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-md p-4 shadow-xl flex flex-col gap-3 select-none";

  modal.innerHTML = `
    <div class="flex items-start gap-2.5">
      <div class="w-8 h-8 rounded-sm bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--warning)] shrink-0">
        <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div class="flex flex-col">
        <h3 class="text-xs font-bold text-[var(--text)]">Reset all settings?</h3>
        <p class="text-[11px] text-[var(--muted)] leading-relaxed mt-1">
          This restores all platform selections, notification presets, and appearance to defaults.
        </p>
      </div>
    </div>
  `;

  const btnRow = document.createElement("div");
  btnRow.className = "flex items-center justify-end gap-2 pt-1";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className =
    "px-3 py-1.5 rounded-sm border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    state.activeModal = null;
    render();
  });
  btnRow.appendChild(cancelBtn);

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className =
    "px-3 py-1.5 rounded-sm bg-[var(--danger)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer";
  confirmBtn.textContent = "Reset Defaults";
  confirmBtn.addEventListener("click", async () => {
    state.activeModal = null;
    await resetSettingsToDefaults();
    const fresh = await getSettings();
    state.settings = JSON.parse(JSON.stringify(fresh));
    state.originalSettings = JSON.parse(JSON.stringify(fresh));
    applyTheme(fresh.theme || "system");
    await reconcileAlarms();
    showToast("Settings reset to defaults!");
    render();
  });
  btnRow.appendChild(confirmBtn);

  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  return overlay;
}

/**
 * Modal for Per-Platform Reminder Preferences (PRD §15 & Design Spec §5.16).
 */
function createPlatformOverrideModal() {
  const platform = state.overridePlatform;
  const overlay = document.createElement("div");
  overlay.className =
    "fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in";

  const modal = document.createElement("div");
  modal.className =
    "w-full max-w-[320px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-md p-4 shadow-xl flex flex-col gap-3 select-none";

  modal.innerHTML = `
    <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
      <div class="flex items-center gap-1.5">
        <h3 class="text-xs font-bold text-[var(--text)]">${platform} Reminders</h3>
      </div>
      <button id="close-override-modal" class="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer text-sm">✕</button>
    </div>
    <p class="text-[10px] text-[var(--muted)] leading-tight">
      Configure unique reminder presets for ${platform}. Contests on this platform will use these instead of the global defaults.
    </p>
  `;

  // Custom presets row
  const platformReminders = state.settings.platformReminders || {};
  let currentOffsets = platformReminders[platform]
    ? [...platformReminders[platform]]
    : [...(state.settings.defaultReminders || [30, 15])];

  const presetsGrid = document.createElement("div");
  presetsGrid.className = "grid grid-cols-3 gap-2";

  [30, 15, 10].forEach((offset) => {
    const isChecked = currentOffsets.includes(offset);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `py-1.5 px-2 rounded-md border flex items-center justify-center gap-1.5 text-[11px] font-mono cursor-pointer ${
      isChecked
        ? "bg-[var(--border)] border-[var(--border)] text-[var(--text)] font-semibold"
        : "bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--muted)]"
    }`;

    chip.innerHTML = `
      <span class="w-3 h-3 rounded-sm flex items-center justify-center border ${
        isChecked
          ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-on)]"
          : "border-[var(--border)]"
      }">
        ${isChecked ? "✓" : ""}
      </span>
      <span>${offset}m</span>
    `;

    chip.addEventListener("click", () => {
      if (currentOffsets.includes(offset)) {
        currentOffsets = currentOffsets.filter((o) => o !== offset);
      } else {
        currentOffsets.push(offset);
      }
      currentOffsets.sort((a, b) => b - a);
      chip.className = `py-1.5 px-2 rounded-md border flex items-center justify-center gap-1.5 text-[11px] font-mono cursor-pointer ${
        currentOffsets.includes(offset)
          ? "bg-[var(--border)] border-[var(--border)] text-[var(--text)] font-semibold"
          : "bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--muted)]"
      }`;
      chip.querySelector("span").innerHTML = currentOffsets.includes(offset)
        ? "✓"
        : "";
    });

    presetsGrid.appendChild(chip);
  });
  modal.appendChild(presetsGrid);

  // Footer Buttons: Reset to Global vs Apply
  const footerRow = document.createElement("div");
  footerRow.className =
    "flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]";

  const clearOverrideBtn = document.createElement("button");
  clearOverrideBtn.type = "button";
  clearOverrideBtn.className =
    "text-[10px] text-[var(--muted)] hover:underline cursor-pointer";
  clearOverrideBtn.textContent = "Use Global Defaults";
  clearOverrideBtn.addEventListener("click", () => {
    delete state.settings.platformReminders[platform];
    state.activeModal = null;
    showToast(`Restored global defaults for ${platform}`);
    render();
  });
  footerRow.appendChild(clearOverrideBtn);

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.className =
    "px-3 py-1 rounded-sm bg-[var(--primary)] text-[var(--primary-on)] font-bold text-xs cursor-pointer";
  applyBtn.textContent = "Apply";
  applyBtn.addEventListener("click", () => {
    if (!state.settings.platformReminders) {
      state.settings.platformReminders = {};
    }
    state.settings.platformReminders[platform] = currentOffsets;
    state.activeModal = null;
    showToast(`Updated presets for ${platform}`);
    render();
  });
  footerRow.appendChild(applyBtn);

  modal.appendChild(footerRow);
  overlay.appendChild(modal);

  overlay
    .querySelector("#close-override-modal")
    .addEventListener("click", () => {
      state.activeModal = null;
      render();
    });

  return overlay;
}

/**
 * Toast feedback notification
 */
function createToast() {
  const toast = document.createElement("div");
  toast.className =
    "fixed bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[var(--surface-raised)] border border-[var(--primary)] text-[var(--text)] text-[11px] font-medium rounded-sm shadow-xl z-50 whitespace-nowrap animate-fade-in";
  toast.textContent = state.toastMessage;
  return toast;
}

function showToast(msg) {
  state.toastMessage = msg;
  if (state.toastTimeout) clearTimeout(state.toastTimeout);
  render();
  state.toastTimeout = setTimeout(() => {
    state.toastMessage = null;
    render();
  }, 2200);
}

// Start
init();
