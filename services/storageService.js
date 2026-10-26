// Single access point for chrome.storage.local.

export const DEFAULT_SETTINGS = {
  theme: "system", // dark | light | system
  enabledPlatforms: ["Codeforces", "CodeChef", "LeetCode", "AtCoder"],
  defaultReminders: [30, 15],
  customReminders: [],
  notificationsEnabled: true,
  platformReminders: {}, // platform-specific defaults
  contestOverrides: {}, // contestId -> reminder offsets
};

export async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export async function getContests() {
  const { contests } = await chrome.storage.local.get("contests");
  return contests || [];
}

export async function saveContests(contests) {
  await chrome.storage.local.set({ contests, lastSync: Date.now() });
}

export async function getReminders() {
  const { reminders } = await chrome.storage.local.get("reminders");
  return reminders || [];
}

export async function saveReminders(reminders) {
  await chrome.storage.local.set({ reminders });
}

export async function getLastSync() {
  const { lastSync } = await chrome.storage.local.get("lastSync");
  return lastSync || null;
}
