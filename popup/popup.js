// ContestPulse — Main Popup Dashboard Controller
// Implements Phase 1 Scope & Acceptance Criteria matching Design Spec §5.

import {
  getContests,
  getSettings,
  getReminders,
  getLastSync,
  getSyncErrors,
} from "../services/storageService.js";
import { filterContests, getFilterCounts } from "../services/contestService.js";
import { syncContests } from "../services/syncService.js";
import {
  scheduleReminder,
  removeReminder,
  reminderId,
} from "../services/alarmService.js";
import { formatLastSync } from "../utils/dateUtils.js";
import { FilterBar } from "../components/FilterBar.js";
import { PlatformChipsRow } from "../components/PlatformChip.js";
import { ContestCard } from "../components/ContestCard.js";
import { applyTheme } from "../utils/themeUtils.js";

// Application State
const state = {
  contests: [],
  settings: null,
  reminders: [],
  lastSync: null,
  syncErrors: [],
  timeFilter: "all",
  activePlatforms: ["Codeforces", "LeetCode", "CodeChef", "AtCoder"],
  searchQuery: "",
  isSyncing: false,
};

let countdownTimer = null;

/**
 * Initializes the popup dashboard.
 */
async function init() {
  const app = document.getElementById("app");
  if (!app) return;

  // 1. Initial cached render for instant loading
  try {
    const [contests, settings, reminders, lastSync, syncErrors] =
      await Promise.all([
        getContests(),
        getSettings(),
        getReminders(),
        getLastSync(),
        getSyncErrors(),
      ]);

    state.contests = contests || [];
    state.settings = settings;
    state.reminders = reminders || [];
    state.lastSync = lastSync;
    state.syncErrors = syncErrors || [];

    if (settings?.enabledPlatforms?.length) {
      state.activePlatforms = [...settings.enabledPlatforms];
    }

    // Apply theme
    applyTheme(settings?.theme || "system");

    // Render interface with cached data
    renderApp();

    // 2. Trigger fresh background sync
    triggerSync();
  } catch (err) {
    console.error("Initialization error:", err);
    renderApp();
  }

  // 3. Start live countdown interval
  startLiveUpdates();
}

/**
 * Returns platforms currently enabled in user settings.
 */
function getEnabledPlatforms() {
  if (
    state.settings?.enabledPlatforms &&
    Array.isArray(state.settings.enabledPlatforms) &&
    state.settings.enabledPlatforms.length > 0
  ) {
    return state.settings.enabledPlatforms;
  }
  return ["Codeforces", "LeetCode", "CodeChef", "AtCoder"];
}

/**
 * Returns contests excluding platforms disabled in user settings.
 */
function getVisibleContests() {
  const enabled = getEnabledPlatforms();
  return state.contests.filter((c) => enabled.includes(c.platform));
}

/**
 * Executes a sync operation and updates state & UI.
 */
async function triggerSync() {
  if (state.isSyncing) return;
  state.isSyncing = true;
  updateSyncButtonUI();

  try {
    const result = await syncContests();
    const [contests, lastSync, syncErrors] = await Promise.all([
      getContests(),
      getLastSync(),
      getSyncErrors(),
    ]);

    state.contests = contests || [];
    state.lastSync = lastSync || Date.now();
    state.syncErrors = syncErrors || [];
  } catch (err) {
    console.error("Sync failed:", err);
  } finally {
    state.isSyncing = false;
    renderApp();
  }
}

/**
 * Starts interval for live countdowns and last sync text updates.
 */
function startLiveUpdates() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    // Update last sync label
    const syncLabel = document.getElementById("sync-label");
    if (syncLabel) {
      syncLabel.textContent = formatLastSync(state.lastSync);
    }
    // Re-render feed countdowns without rebuilding the entire UI
    renderContestListOnly();
  }, 10000); // 10s tick keeps UI fresh without CPU churn
}

/**
 * Main render function assembling all UI components.
 */
function renderApp() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = "";

  // 1. Sticky Header
  app.appendChild(createHeader());

  // 2. Sync & Search Bar
  app.appendChild(createSyncSearchBar());

  // 3. Time Filter Ribbon
  const enabledPlatforms = getEnabledPlatforms();
  // Ensure active platform filters stay within enabled platforms
  state.activePlatforms = state.activePlatforms.filter((p) =>
    enabledPlatforms.includes(p),
  );
  if (state.activePlatforms.length === 0) {
    state.activePlatforms = [...enabledPlatforms];
  }

  const visibleContests = getVisibleContests();
  const counts = getFilterCounts(visibleContests, state.activePlatforms);
  const filterRibbon = FilterBar({
    selected: state.timeFilter,
    counts,
    onChange: (newFilter) => {
      state.timeFilter = newFilter;
      renderApp();
    },
  });
  app.appendChild(filterRibbon);

  // 4. Platform Chips Row (only showing platforms enabled in Settings)
  const platformRow = PlatformChipsRow({
    platforms: enabledPlatforms,
    activePlatforms: state.activePlatforms,
    onToggle: (platform, enabled) => {
      if (enabled) {
        if (!state.activePlatforms.includes(platform)) {
          state.activePlatforms.push(platform);
        }
      } else {
        state.activePlatforms = state.activePlatforms.filter(
          (p) => p !== platform,
        );
      }
      renderApp();
    },
  });
  app.appendChild(platformRow);

  // 5. Scrollable Contest Feed Container
  const feedContainer = document.createElement("main");
  feedContainer.id = "contest-feed";
  feedContainer.className =
    "flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2 min-h-0";
  app.appendChild(feedContainer);

  renderContestListOnly();

  // 6. Footer Status Bar
  app.appendChild(createFooterBar());
}

/**
 * Renders only the contest list inside the scrollable feed container.
 */
function renderContestListOnly() {
  const feed = document.getElementById("contest-feed");
  if (!feed) return;
  feed.innerHTML = "";

  // A. Non-blocking error banner (if any platform failed)
  if (state.syncErrors && state.syncErrors.length > 0) {
    feed.appendChild(createErrorBanner());
  }

  // B. Loading Skeletons (when initial sync is running and no contests cached)
  if (state.isSyncing && state.contests.length === 0) {
    for (let i = 0; i < 3; i++) {
      feed.appendChild(createSkeletonCard());
    }
    return;
  }

  // C. Filter Contests
  const visibleContests = getVisibleContests();
  const filtered = filterContests(visibleContests, {
    timeFilter: state.timeFilter,
    platforms: state.activePlatforms,
    searchQuery: state.searchQuery,
  });

  // D. Empty State
  if (filtered.length === 0) {
    feed.appendChild(createEmptyState());
    return;
  }

  // E. Contest Cards
  filtered.forEach((contest) => {
    // Find active reminder offsets for this contest
    const activeOffsets = state.reminders
      .filter((r) => r.contestId === contest.id && r.enabled)
      .map((r) => r.offsetMinutes);

    const card = ContestCard({
      contest,
      activeReminders: activeOffsets,
      onSetReminder: async (c, offset) => {
        try {
          await scheduleReminder(c, offset);
          state.reminders = await getReminders();
          renderApp();
        } catch (e) {
          console.error("Failed to schedule reminder:", e);
        }
      },
      onRemoveReminder: async (cId, offset) => {
        try {
          const id = reminderId(cId, offset);
          await removeReminder(id);
          state.reminders = await getReminders();
          renderApp();
        } catch (e) {
          console.error("Failed to remove reminder:", e);
        }
      },
    });

    feed.appendChild(card);
  });
}

/**
 * Creates the sticky header component as per Design Spec §5.1.
 */
function createHeader() {
  const header = document.createElement("header");
  header.className =
    "h-14 px-3 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-glass)] backdrop-blur-md sticky top-0 z-20 select-none";

  // Left: Logo Tile + Title + LIVE Pill + Subtitle
  const left = document.createElement("div");
  left.className = "flex items-center gap-2";

  // 28x28 Logo Tile
  const logo = document.createElement("div");
  logo.className =
    "w-7 h-7 rounded-sm bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-sm";
  logo.innerHTML = `
    <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  `;
  left.appendChild(logo);

  const textCol = document.createElement("div");
  textCol.className = "flex flex-col";

  const titleRow = document.createElement("div");
  titleRow.className = "flex items-center gap-1.5";

  const title = document.createElement("h1");
  title.className =
    "text-[15px] font-bold text-[var(--text)] tracking-tight leading-none";
  title.textContent = "ContestPulse";
  titleRow.appendChild(title);

  // LIVE Pill
  const livePill = document.createElement("span");
  livePill.className =
    "flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[9px] font-bold text-[var(--primary)] leading-none";
  livePill.innerHTML = `
    <span class="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>
    LIVE
  `;
  titleRow.appendChild(livePill);
  textCol.appendChild(titleRow);

  const subtitle = document.createElement("span");
  subtitle.className =
    "text-[9px] font-semibold tracking-wider text-[var(--muted-70)] uppercase leading-none mt-0.5";
  subtitle.textContent = "CONTEST FEED";
  textCol.appendChild(subtitle);

  left.appendChild(textCol);
  header.appendChild(left);

  // Right: Navigation Buttons (Bell + Gear)
  const right = document.createElement("div");
  right.className = "flex items-center gap-1";

  // Bell (Alarms Navigation)
  const bellBtn = document.createElement("button");
  bellBtn.type = "button";
  bellBtn.setAttribute("aria-label", "Open Alarms and Reminders");
  bellBtn.className =
    "relative w-8 h-8 rounded-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer";
  bellBtn.innerHTML = `
    <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  `;

  if (state.reminders && state.reminders.length > 0) {
    const badge = document.createElement("span");
    badge.className =
      "absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--primary)]";
    bellBtn.appendChild(badge);
  }

  bellBtn.addEventListener("click", () => {
    window.location.href = "../alarms/alarms.html";
  });
  right.appendChild(bellBtn);

  // Gear (Settings Navigation)
  const gearBtn = document.createElement("button");
  gearBtn.type = "button";
  gearBtn.setAttribute("aria-label", "Open Settings");
  gearBtn.className =
    "w-8 h-8 rounded-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer";
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
 * Creates the Sync & Search Bar as per Design Spec §5.2.
 */
function createSyncSearchBar() {
  const bar = document.createElement("div");
  bar.className =
    "px-3 py-1.5 flex items-center justify-between gap-2 bg-[var(--surface)] border-b border-[var(--border-subtle)] select-none text-xs";

  // Left: Sync Indicator
  const left = document.createElement("div");
  left.className = "flex items-center gap-1.5 text-[var(--muted)] text-[11px]";
  left.innerHTML = `
    <svg class="w-3 h-3 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
    </svg>
    <span id="sync-label">${formatLastSync(state.lastSync)}</span>
  `;
  bar.appendChild(left);

  // Right: Search Input + Refresh Button
  const right = document.createElement("div");
  right.className = "flex items-center gap-1.5";

  // Search Filter Input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Filter...";
  searchInput.value = state.searchQuery;
  searchInput.className =
    "w-28 px-2 py-0.5 bg-[var(--bg)] text-[var(--text)] placeholder-[var(--muted-60)] text-[11px] rounded-sm border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--primary)]";
  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderContestListOnly();
  });
  right.appendChild(searchInput);

  // Manual Refresh Button
  const refreshBtn = document.createElement("button");
  refreshBtn.id = "refresh-btn";
  refreshBtn.type = "button";
  refreshBtn.setAttribute("aria-label", "Refresh contest schedules");
  refreshBtn.className =
    "w-6 h-6 rounded-sm bg-[var(--bg)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)] transition-colors cursor-pointer";
  refreshBtn.innerHTML = `
    <svg id="refresh-icon" class="w-3.5 h-3.5 stroke-current ${
      state.isSyncing ? "spin-active" : ""
    }" fill="none" viewBox="0 0 24 24" stroke-width="2">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
    </svg>
  `;
  refreshBtn.addEventListener("click", () => {
    triggerSync();
  });
  right.appendChild(refreshBtn);

  bar.appendChild(right);
  return bar;
}

/**
 * Updates refresh icon spin state.
 */
function updateSyncButtonUI() {
  const icon = document.getElementById("refresh-icon");
  if (icon) {
    if (state.isSyncing) icon.classList.add("spin-active");
    else icon.classList.remove("spin-active");
  }
}

/**
 * Creates Footer Status Bar as per Design Spec §5.8.
 */
function createFooterBar() {
  const footer = document.createElement("footer");
  footer.className =
    "h-9 px-3 bg-[var(--surface)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--muted)] select-none shrink-0";

  const count = state.reminders ? state.reminders.length : 0;
  const hasReminders = count > 0;
  const isMuted = state.settings?.notificationsEnabled === false;

  const left = document.createElement("div");
  left.className = "flex items-center gap-1.5";
  left.innerHTML = `
    <svg class="w-3.5 h-3.5 ${
      isMuted
        ? "text-[var(--warning)]"
        : hasReminders
          ? "text-[var(--success)]"
          : "text-[var(--muted)]"
    }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span class="font-semibold tracking-[0.33px] ${
      isMuted ? "text-[var(--warning)]" : "text-[var(--text)]"
    }">
      ${count} Reminder${count === 1 ? "" : "s"} Scheduled${
        isMuted ? " (Muted in Settings)" : ""
      }
    </span>
  `;
  footer.appendChild(left);

  const link = document.createElement("button");
  link.type = "button";
  link.className =
    "text-[var(--primary)] hover:underline font-semibold cursor-pointer text-[11px]";
  link.textContent = "Manage Alarms ›";
  link.addEventListener("click", () => {
    window.location.href = "../alarms/alarms.html";
  });
  footer.appendChild(link);

  return footer;
}

/**
 * Creates non-blocking warning banner for partial provider errors.
 */
function createErrorBanner() {
  const banner = document.createElement("div");
  banner.className =
    "p-2.5 rounded-md bg-[rgba(244,162,97,0.12)] border border-[var(--warning)] text-xs flex items-center justify-between gap-2";

  const platformsFailed = state.syncErrors.map((e) => e.platform).join(", ");
  banner.innerHTML = `
    <div class="flex items-center gap-2 text-[var(--warning)]">
      <svg class="w-4 h-4 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span class="text-[11px] leading-tight">Unable to refresh <strong>${platformsFailed}</strong>. Showing saved contests.</span>
    </div>
  `;

  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className =
    "px-2 py-0.5 rounded-sm bg-[var(--surface-raised)] text-[var(--warning)] font-semibold text-[10px] border border-[var(--warning)] hover:bg-[var(--warning)] hover:text-[var(--primary-on)] transition-colors cursor-pointer shrink-0";
  retryBtn.textContent = "Retry";
  retryBtn.addEventListener("click", () => triggerSync());
  banner.appendChild(retryBtn);

  return banner;
}

/**
 * Creates empty state view.
 */
function createEmptyState() {
  const empty = document.createElement("div");
  empty.className =
    "flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--muted)] gap-2 my-auto";
  empty.innerHTML = `
    <div class="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--muted)]">
      <svg class="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    </div>
    <h3 class="text-xs font-bold text-[var(--text)]">No contests found</h3>
    <p class="text-[11px] max-w-[240px]">There are no contests matching your active filters or selected platforms.</p>
  `;

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className =
    "mt-2 px-3 py-1 rounded-sm bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--primary)] text-[11px] font-semibold hover:border-[var(--primary)] cursor-pointer transition-colors";
  resetBtn.textContent = "Reset Filters & Refresh";
  resetBtn.addEventListener("click", () => {
    state.timeFilter = "all";
    state.searchQuery = "";
    state.activePlatforms = ["Codeforces", "LeetCode", "CodeChef", "AtCoder"];
    triggerSync();
  });
  empty.appendChild(resetBtn);

  return empty;
}

/**
 * Creates a skeleton card placeholder with shimmer.
 */
function createSkeletonCard() {
  const skeleton = document.createElement("div");
  skeleton.className =
    "p-3 rounded-md bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex flex-col gap-2.5";
  skeleton.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="w-14 h-4 rounded-sm skeleton-shimmer"></div>
      <div class="w-24 h-4 rounded-sm skeleton-shimmer"></div>
    </div>
    <div class="w-3/4 h-4 rounded-sm skeleton-shimmer"></div>
    <div class="w-1/2 h-3 rounded-sm skeleton-shimmer"></div>
    <div class="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
      <div class="w-20 h-4 rounded-sm skeleton-shimmer"></div>
      <div class="w-24 h-5 rounded-sm skeleton-shimmer"></div>
    </div>
  `;
  return skeleton;
}

// Start Popup
init();
