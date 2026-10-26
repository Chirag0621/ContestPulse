// Single access point for chrome.storage.local with safe web fallback.

export const DEFAULT_SETTINGS = {
  theme: "system", // dark | light | system
  enabledPlatforms: ["Codeforces", "CodeChef", "LeetCode", "AtCoder"],
  defaultReminders: [30, 15],
  customReminders: [],
  notificationsEnabled: true,
  platformReminders: {}, // platform-specific defaults
  contestOverrides: {}, // contestId -> reminder offsets
};

const hasChromeStorage =
  typeof chrome !== "undefined" &&
  Boolean(chrome.storage && chrome.storage.local);

export async function getSettings() {
  if (hasChromeStorage) {
    const { settings } = await chrome.storage.local.get("settings");
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  }
  try {
    const val = localStorage.getItem("contestpulse_settings");
    return val ? { ...DEFAULT_SETTINGS, ...JSON.parse(val) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const next = { ...current, ...partial };
  if (hasChromeStorage) {
    await chrome.storage.local.set({ settings: next });
  } else {
    try {
      localStorage.setItem("contestpulse_settings", JSON.stringify(next));
    } catch (e) {
      console.warn("Storage fallback error:", e);
    }
  }
  return next;
}

export async function getContests() {
  if (hasChromeStorage) {
    const { contests } = await chrome.storage.local.get("contests");
    return contests || [];
  }
  try {
    const val = localStorage.getItem("contestpulse_contests");
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function saveContests(contests) {
  const now = Date.now();
  if (hasChromeStorage) {
    await chrome.storage.local.set({ contests, lastSync: now });
  } else {
    try {
      localStorage.setItem("contestpulse_contests", JSON.stringify(contests));
      localStorage.setItem("contestpulse_lastSync", String(now));
    } catch (e) {
      console.warn("Storage fallback error:", e);
    }
  }
}

export async function getReminders() {
  if (hasChromeStorage) {
    const { reminders } = await chrome.storage.local.get("reminders");
    return reminders || [];
  }
  try {
    const val = localStorage.getItem("contestpulse_reminders");
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function saveReminders(reminders) {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ reminders });
  } else {
    try {
      localStorage.setItem("contestpulse_reminders", JSON.stringify(reminders));
    } catch (e) {
      console.warn("Storage fallback error:", e);
    }
  }
}

export async function getLastSync() {
  if (hasChromeStorage) {
    const { lastSync } = await chrome.storage.local.get("lastSync");
    return lastSync || null;
  }
  try {
    const val = localStorage.getItem("contestpulse_lastSync");
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

export async function getSyncErrors() {
  if (hasChromeStorage) {
    const { syncErrors } = await chrome.storage.local.get("syncErrors");
    return syncErrors || [];
  }
  try {
    const val = localStorage.getItem("contestpulse_syncErrors");
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function saveSyncErrors(errors) {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ syncErrors: errors || [] });
  } else {
    try {
      localStorage.setItem(
        "contestpulse_syncErrors",
        JSON.stringify(errors || []),
      );
    } catch (e) {
      console.warn("Storage fallback error:", e);
    }
  }
}
