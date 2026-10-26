// Single access point for chrome.storage.local with safe web and memory fallback.

export const DEFAULT_SETTINGS = {
  theme: "system", // dark | light | system
  enabledPlatforms: ["Codeforces", "CodeChef", "LeetCode", "AtCoder"],
  defaultReminders: [30, 15],
  customReminders: [],
  customDefaultOffset: 20,
  notificationsEnabled: true,
  syncIntervalMinutes: 60, // 15 | 30 | 60
  platformReminders: {}, // platform-specific defaults
  contestOverrides: {}, // contestId -> reminder offsets
};

const memoryStore = {};
const hasChromeStorage =
  typeof chrome !== "undefined" &&
  Boolean(chrome.storage && chrome.storage.local);

function getFallback(key) {
  if (typeof localStorage !== "undefined") {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  }
  return memoryStore[key] || null;
}

function setFallback(key, value) {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {}
  }
  memoryStore[key] = value;
}

function removeFallback(key) {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(key);
      return;
    } catch {}
  }
  delete memoryStore[key];
}

export async function getSettings() {
  if (hasChromeStorage) {
    const { settings } = await chrome.storage.local.get("settings");
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  }
  try {
    const val = getFallback("contestpulse_settings");
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
    setFallback("contestpulse_settings", JSON.stringify(next));
  }
  return next;
}

export async function resetSettingsToDefaults() {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  } else {
    setFallback("contestpulse_settings", JSON.stringify(DEFAULT_SETTINGS));
  }
  return DEFAULT_SETTINGS;
}

export async function getContests() {
  if (hasChromeStorage) {
    const { contests } = await chrome.storage.local.get("contests");
    return contests || [];
  }
  try {
    const val = getFallback("contestpulse_contests");
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
    setFallback("contestpulse_contests", JSON.stringify(contests));
    setFallback("contestpulse_lastSync", String(now));
  }
}

export async function clearContestCache() {
  if (hasChromeStorage) {
    await chrome.storage.local.remove(["contests", "lastSync", "syncErrors"]);
  } else {
    removeFallback("contestpulse_contests");
    removeFallback("contestpulse_lastSync");
    removeFallback("contestpulse_syncErrors");
  }
}

export async function getReminders() {
  if (hasChromeStorage) {
    const { reminders } = await chrome.storage.local.get("reminders");
    return reminders || [];
  }
  try {
    const val = getFallback("contestpulse_reminders");
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function saveReminders(reminders) {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ reminders });
  } else {
    setFallback("contestpulse_reminders", JSON.stringify(reminders));
  }
}

export async function getLastSync() {
  if (hasChromeStorage) {
    const { lastSync } = await chrome.storage.local.get("lastSync");
    return lastSync || null;
  }
  try {
    const val = getFallback("contestpulse_lastSync");
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
    const val = getFallback("contestpulse_syncErrors");
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function saveSyncErrors(errors) {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ syncErrors: errors || [] });
  } else {
    setFallback("contestpulse_syncErrors", JSON.stringify(errors || []));
  }
}

/**
 * Calculates total storage used by the extension in bytes.
 * @returns {Promise<number>}
 */
export async function getStorageUsageBytes() {
  if (hasChromeStorage && chrome.storage.local.getBytesInUse) {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        resolve(bytes || 0);
      });
    });
  }

  // Fallback calculation
  try {
    const contests = await getContests();
    const settings = await getSettings();
    const reminders = await getReminders();
    const str = JSON.stringify({ contests, settings, reminders });
    return str.length;
  } catch {
    return 1024 * 16;
  }
}
