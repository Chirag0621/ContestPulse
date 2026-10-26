// Alarms & Reminders Page Controller
// Implements Design Spec §6.2 and Phase 2 Requirements.

import {
  getReminders,
  getContests,
  getSettings,
} from "../services/storageService.js";
import {
  removeReminder,
  removeAllReminders,
  toggleReminder,
  scheduleReminder,
  reconcileAlarms,
} from "../services/alarmService.js";
import { formatLocalDateTime } from "../utils/dateUtils.js";
import { PLATFORMS } from "../utils/platformUtils.js";
import { escapeHtml } from "../utils/formatUtils.js";
import { applyTheme } from "../utils/themeUtils.js";

// Page State
const state = {
  reminders: [],
  contests: [],
  settings: null,
  selectedContestId: "",
  selectedPresetOffset: 30,
  customOffsetInput: "",
};

async function init() {
  const app = document.getElementById("app");
  if (!app) return;

  // Reconcile before rendering to ensure no expired reminders are displayed
  await reconcileAlarms();

  const [reminders, contests, settings] = await Promise.all([
    getReminders(),
    getContests(),
    getSettings(),
  ]);

  state.reminders = reminders || [];
  state.contests = (contests || []).filter((c) => c.startTime > Date.now());
  state.settings = settings;

  // Apply active theme
  applyTheme(settings?.theme || "system");

  if (state.contests.length > 0 && !state.selectedContestId) {
    state.selectedContestId = state.contests[0].id;
  }

  render();
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = "";

  // 1. Sticky Header
  app.appendChild(createHeader());

  // 2. Scrollable Body
  const main = document.createElement("main");
  main.className =
    "flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-3 min-h-0 select-none";

  // Permission / Status Banner
  main.appendChild(createPermissionBanner());

  // Active Reminders Section Header
  main.appendChild(createSectionHeader());

  // Active Reminders List
  const listContainer = document.createElement("div");
  listContainer.id = "reminders-list";
  listContainer.className = "flex flex-col gap-2";

  if (state.reminders.length === 0) {
    listContainer.appendChild(createEmptyState());
  } else {
    state.reminders.forEach((reminder) => {
      listContainer.appendChild(createReminderCard(reminder));
    });
  }
  main.appendChild(listContainer);

  // Schedule Custom Alarm Card
  main.appendChild(createScheduleCustomCard());

  app.appendChild(main);

  // 3. Persistent Back Footer
  app.appendChild(createFooter());
}

/**
 * Creates Alarms Header as per Design Spec §6.2.
 */
function createHeader() {
  const header = document.createElement("header");
  header.className =
    "h-12 px-3 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-glass)] backdrop-blur-md sticky top-0 z-20 select-none";

  // Left: Back button + Brand + Subtitle
  const left = document.createElement("div");
  left.className = "flex items-center gap-2";

  const backBtn = document.createElement("button");
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
    window.location.href = "../popup/popup.html";
  });
  left.appendChild(backBtn);

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
    "text-[10px] font-mono text-[var(--muted)] leading-none mt-0.5";
  sub.textContent = "Alarms & Reminders";
  titleCol.appendChild(sub);

  left.appendChild(titleCol);
  header.appendChild(left);

  // Right: Clear All & Settings Gear Button
  const right = document.createElement("div");
  right.className = "flex items-center gap-1.5";

  if (state.reminders.length > 0) {
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className =
      "flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--danger)] transition-colors cursor-pointer";
    clearBtn.innerHTML = `
      <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      <span>Clear All</span>
    `;
    clearBtn.addEventListener("click", () => {
      showClearConfirmModal();
    });
    right.appendChild(clearBtn);
  }

  const gearBtn = document.createElement("button");
  gearBtn.type = "button";
  gearBtn.setAttribute("aria-label", "Settings");
  gearBtn.className =
    "w-7 h-7 rounded-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer";
  gearBtn.innerHTML = `
    <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  `;
  gearBtn.addEventListener("click", () => {
    window.location.href = "../options/options.html";
  });
  right.appendChild(gearBtn);

  header.appendChild(right);
  return header;
}

/**
 * Creates the Permission/Status banner as per Design Spec §6.2.
 */
function createPermissionBanner() {
  const count = state.reminders.length;
  const card = document.createElement("div");
  const isMuted = state.settings?.notificationsEnabled === false;

  card.className = `p-2.5 rounded-md border flex items-center justify-between text-xs ${
    isMuted
      ? "bg-[rgba(244,162,97,0.12)] border-[var(--warning)]"
      : "bg-[var(--surface)] border border-[var(--border)]"
  }`;

  if (isMuted) {
    card.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-sm bg-[var(--surface-raised)] border border-[var(--warning)] flex items-center justify-center text-[var(--warning)] shadow-sm">
          <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-1.5 font-bold text-[11px] text-[var(--warning)]">
            <span>Notifications Muted</span>
          </div>
          <div class="text-[10px] text-[var(--muted)]">Alarms won't fire while disabled in Settings</div>
        </div>
      </div>
      <a href="../options/options.html" class="px-2 py-0.5 rounded-sm bg-[var(--surface-raised)] border border-[var(--warning)] text-[10px] font-semibold text-[var(--warning)] hover:bg-[var(--warning)] hover:text-[var(--primary-on)] transition-colors">
        Enable ›
      </a>
    `;
  } else {
    card.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-sm bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-sm">
          <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-1.5 font-bold text-[11px] text-[var(--text)]">
            <span>Chrome Notifications</span>
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></span>
          </div>
          <div class="text-[10px] text-[var(--muted)]">Native background alerts active</div>
        </div>
      </div>
      <span class="px-2 py-0.5 rounded-sm bg-[var(--fill-subtle-2)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--primary)] font-bold">
        ${count} Scheduled
      </span>
    `;
  }

  return card;
}

/**
 * Creates Section Title Header.
 */
function createSectionHeader() {
  const row = document.createElement("div");
  row.className =
    "flex items-center justify-between text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider px-0.5 mt-0.5";

  const count = state.reminders.length;
  row.innerHTML = `
    <span>Active Reminders (${count})</span>
    <span class="font-mono text-[9px] text-[var(--muted-70)]">Sync Interval: 1h</span>
  `;
  return row;
}

/**
 * Creates an individual Alarm Card as per Design Spec §6.2.
 */
function createReminderCard(reminder) {
  const card = document.createElement("article");
  card.className =
    "p-2.5 rounded-md bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-2 transition-shadow hover:border-[var(--primary)]";
  card.dataset.reminderId = reminder.id;

  const platformMeta = PLATFORMS[reminder.platform] || {
    short: (reminder.platform || "").slice(0, 2).toUpperCase(),
    name: reminder.platform,
  };

  const scheduledText = formatLocalDateTime(reminder.scheduledTime);

  // Row 1: Platform tag + Contest Title + Close (X) button
  const row1 = document.createElement("div");
  row1.className = "flex items-start justify-between gap-2";

  const titleCol = document.createElement("div");
  titleCol.className = "flex-1 flex flex-col gap-0.5 min-w-0";

  const topRow = document.createElement("div");
  topRow.className = "flex items-center gap-1.5 min-w-0";

  const tag = document.createElement("span");
  tag.className =
    "px-1 py-0.2 rounded-sm bg-[var(--fill-subtle)] border border-[var(--border-subtle)] text-[var(--primary)] font-mono text-[9px] font-bold shrink-0";
  tag.textContent = `[${platformMeta.short}]`;
  topRow.appendChild(tag);

  const title = document.createElement("h3");
  title.className =
    "font-bold text-[11px] text-[var(--text)] line-clamp-1 hover:text-[var(--primary)] cursor-pointer";
  title.title = reminder.contestName;
  title.textContent = reminder.contestName;
  title.addEventListener("click", () => {
    if (reminder.contestUrl) {
      if (typeof chrome !== "undefined" && chrome.tabs?.create) {
        chrome.tabs.create({ url: reminder.contestUrl });
      } else {
        window.open(reminder.contestUrl, "_blank");
      }
    }
  });
  topRow.appendChild(title);
  titleCol.appendChild(topRow);

  const schedTimeEl = document.createElement("span");
  schedTimeEl.className = "text-[10px] text-[var(--muted)] font-mono";
  schedTimeEl.textContent = `Scheduled: ${scheduledText}`;
  titleCol.appendChild(schedTimeEl);

  row1.appendChild(titleCol);

  // Close (X) button (removal)
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.setAttribute("aria-label", "Remove this reminder");
  removeBtn.className =
    "w-6 h-6 rounded-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer shrink-0";
  removeBtn.innerHTML = `
    <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  `;
  removeBtn.addEventListener("click", async () => {
    await removeReminder(reminder.id);
    state.reminders = await getReminders();
    render();
  });
  row1.appendChild(removeBtn);
  card.appendChild(row1);

  // Row 2: Offset Label <-> Alert Toggle Switch
  const row2 = document.createElement("div");
  row2.className =
    "flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)] text-[10px]";

  const offsetInfo = document.createElement("div");
  offsetInfo.className = "flex items-center gap-1.5";
  offsetInfo.innerHTML = `
    <svg class="w-3.5 h-3.5 ${
      reminder.enabled ? "text-[var(--primary)]" : "text-[var(--muted)]"
    }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>
    <span class="font-mono font-bold ${
      reminder.enabled ? "text-[var(--primary)]" : "text-[var(--muted-60)]"
    }">${reminder.offsetMinutes}m before start</span>
  `;
  row2.appendChild(offsetInfo);

  // Toggle switch (Design Spec §5.12: 28x16 squarish toggle)
  const toggleWrapper = document.createElement("div");
  toggleWrapper.className = "flex items-center gap-1.5";

  const alertLabel = document.createElement("span");
  alertLabel.className = `font-semibold text-[9px] ${
    reminder.enabled ? "text-[var(--text)]" : "text-[var(--muted-60)]"
  }`;
  alertLabel.textContent = "Alert";
  toggleWrapper.appendChild(alertLabel);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.setAttribute("role", "switch");
  toggleBtn.setAttribute("aria-checked", reminder.enabled ? "true" : "false");
  toggleBtn.className = `w-7 h-4 rounded-sm p-0.5 transition-colors cursor-pointer relative ${
    reminder.enabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
  }`;

  const thumb = document.createElement("span");
  thumb.className = `w-3 h-3 rounded-sm bg-[var(--surface)] block transition-transform shadow-sm ${
    reminder.enabled ? "translate-x-3" : "translate-x-0"
  }`;
  toggleBtn.appendChild(thumb);

  toggleBtn.addEventListener("click", async () => {
    const nextState = !reminder.enabled;
    await toggleReminder(reminder.id, nextState);
    state.reminders = await getReminders();
    render();
  });
  toggleWrapper.appendChild(toggleBtn);

  row2.appendChild(toggleWrapper);
  card.appendChild(row2);

  return card;
}

/**
 * Creates the "Schedule Custom Contest Alarm" card as per Design Spec §6.2.
 */
function createScheduleCustomCard() {
  const card = document.createElement("div");
  card.className =
    "p-3 rounded-md bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-2.5 text-xs select-none";

  // Title Row
  card.innerHTML = `
    <div class="flex items-center gap-1.5 font-bold text-[11px] text-[var(--text)]">
      <svg class="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="14" r="8"/>
        <path d="M12 2v3M9 2h6M12 10v4l2 2"/>
      </svg>
      <span>Schedule Custom Contest Alarm</span>
    </div>
  `;

  // 1. Target Contest Dropdown
  const contestSelectRow = document.createElement("div");
  contestSelectRow.className = "flex flex-col gap-1";

  const label = document.createElement("label");
  label.className = "text-[10px] font-semibold text-[var(--muted)]";
  label.textContent = "Select Target Contest:";
  contestSelectRow.appendChild(label);

  const select = document.createElement("select");
  select.className =
    "w-full px-2 py-1 bg-[var(--bg)] text-[var(--text)] text-[11px] font-medium rounded-sm border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--primary)] cursor-pointer";

  if (state.contests.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No upcoming contests available";
    select.appendChild(opt);
    select.disabled = true;
  } else {
    state.contests.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      const dateStr = formatLocalDateTime(c.startTime);
      opt.textContent = `[${c.platform}] ${c.name} (${dateStr})`;
      if (c.id === state.selectedContestId) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", (e) => {
      state.selectedContestId = e.target.value;
    });
  }
  contestSelectRow.appendChild(select);
  card.appendChild(contestSelectRow);

  // 2. Quick Preset Offset Buttons (10m, 15m, 30m, 45m, 60m)
  const presetSection = document.createElement("div");
  presetSection.className = "flex flex-col gap-1";

  const presetHeader = document.createElement("div");
  presetHeader.className = "flex items-center justify-between text-[10px]";
  presetHeader.innerHTML = `
    <span class="font-semibold text-[var(--muted)]">Quick Preset Offset:</span>
    <span id="selected-preset-label" class="font-mono text-[var(--primary)] font-bold">Selected: ${state.selectedPresetOffset}m</span>
  `;
  presetSection.appendChild(presetHeader);

  const presetGrid = document.createElement("div");
  presetGrid.className = "grid grid-cols-5 gap-1 mt-0.5";

  const offsets = [10, 15, 30, 45, 60];
  offsets.forEach((min) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isSelected = state.selectedPresetOffset === min;
    btn.className = `py-1 text-center font-mono text-[10px] rounded-sm border transition-colors cursor-pointer ${
      isSelected
        ? "bg-[var(--primary)] text-[var(--primary-on)] font-bold border-[var(--primary)]"
        : "bg-[var(--bg)] text-[var(--muted)] border-[var(--border-subtle)] hover:border-[var(--border)] hover:text-[var(--text)]"
    }`;
    btn.textContent = `${min}m`;

    btn.addEventListener("click", () => {
      state.selectedPresetOffset = min;
      state.customOffsetInput = "";
      render();
    });

    presetGrid.appendChild(btn);
  });
  presetSection.appendChild(presetGrid);
  card.appendChild(presetSection);

  // 3. Custom Minutes Input Row
  const customRow = document.createElement("div");
  customRow.className =
    "flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)]";

  const numInput = document.createElement("input");
  numInput.type = "number";
  numInput.min = "1";
  numInput.max = "1440";
  numInput.placeholder = String(state.selectedPresetOffset);
  numInput.value = state.customOffsetInput;
  numInput.className =
    "w-16 px-2 py-1 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm font-mono text-[11px] text-[var(--text)] text-center focus:outline-none focus:border-[var(--primary)]";

  numInput.addEventListener("input", (e) => {
    state.customOffsetInput = e.target.value;
    const val = parseInt(e.target.value, 10);
    if (Number.isFinite(val) && val > 0) {
      state.selectedPresetOffset = val;
      const lbl = document.getElementById("selected-preset-label");
      if (lbl) lbl.textContent = `Selected: ${val}m`;
    }
  });

  const suffix = document.createElement("span");
  suffix.className = "text-[10px] text-[var(--muted)] flex-1";
  suffix.textContent = "minutes before official start";

  customRow.appendChild(numInput);
  customRow.appendChild(suffix);
  card.appendChild(customRow);

  // 4. Primary Button: + Add Reminder
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className =
    "w-full py-1.5 px-3 rounded-sm bg-[var(--primary)] text-[var(--primary-on)] text-[11px] font-bold tracking-wide hover:opacity-90 transition-opacity cursor-pointer text-center shadow-sm";
  addBtn.textContent = "+ Add Reminder";

  addBtn.addEventListener("click", async () => {
    const contest = state.contests.find(
      (c) => c.id === state.selectedContestId,
    );
    if (!contest) {
      alert("Please select a contest first.");
      return;
    }

    const offset = state.selectedPresetOffset;
    const triggerTime = contest.startTime - offset * 60 * 1000;
    if (triggerTime <= Date.now()) {
      alert("This reminder time has already passed for the selected contest.");
      return;
    }

    const scheduled = await scheduleReminder(contest, offset);
    if (!scheduled) {
      alert("Failed to schedule reminder or duplicate already active.");
      return;
    }

    state.reminders = await getReminders();
    render();
  });
  card.appendChild(addBtn);

  return card;
}

/**
 * Creates Empty State when no reminders are scheduled.
 */
function createEmptyState() {
  const empty = document.createElement("div");
  empty.className =
    "p-6 text-center text-xs text-[var(--muted)] bg-[var(--surface)] rounded-md border border-[var(--border-subtle)] flex flex-col items-center gap-1.5";
  empty.innerHTML = `
    <svg class="w-6 h-6 text-[var(--muted-60)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <div class="font-bold text-[11px] text-[var(--text)]">No Active Reminders</div>
    <div class="text-[10px] max-w-[240px]">Browse upcoming contests in the feed or schedule a custom reminder below.</div>
  `;
  return empty;
}

/**
 * Creates persistent Back to Feed footer button.
 */
function createFooter() {
  const footer = document.createElement("footer");
  footer.className =
    "p-2 bg-[var(--surface)] border-t border-[var(--border-subtle)] shrink-0 select-none";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "w-full py-1.5 px-3 rounded-sm border border-[var(--border)] text-[var(--text)] text-[11px] font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer text-center";
  btn.textContent = "← Back to Contests Feed";
  btn.addEventListener("click", () => {
    window.location.href = "../popup/popup.html";
  });

  footer.appendChild(btn);
  return footer;
}

/**
 * Shows confirmation modal before removing all reminders.
 */
function showClearConfirmModal() {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none";

  const dialog = document.createElement("div");
  dialog.className =
    "w-full max-w-[320px] p-3.5 rounded-md bg-[var(--surface)] border border-[var(--border)] shadow-xl flex flex-col gap-3 text-xs text-[var(--text)]";

  dialog.innerHTML = `
    <div class="flex items-center gap-2 font-bold text-xs text-[var(--danger)]">
      <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>Remove All Scheduled Alarms?</span>
    </div>
    <p class="text-[11px] text-[var(--muted)] leading-relaxed">
      This will cancel all <strong>${state.reminders.length}</strong> scheduled background alarms and clear all contest reminders. This action cannot be undone.
    </p>
  `;

  const btnRow = document.createElement("div");
  btnRow.className = "flex items-center justify-end gap-2 pt-1";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className =
    "px-2.5 py-1 rounded-sm border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] font-semibold text-[11px] cursor-pointer";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => modal.remove());
  btnRow.appendChild(cancelBtn);

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className =
    "px-3 py-1 rounded-sm bg-[var(--danger)] text-white font-bold text-[11px] hover:opacity-90 cursor-pointer shadow-sm";
  confirmBtn.textContent = "Clear All";
  confirmBtn.addEventListener("click", async () => {
    await removeAllReminders();
    state.reminders = [];
    modal.remove();
    render();
  });
  btnRow.appendChild(confirmBtn);

  dialog.appendChild(btnRow);
  modal.appendChild(dialog);
  document.body.appendChild(modal);
}

init();
