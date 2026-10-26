// Creates, updates, removes, toggles, and reconciles reminder alarms.
// Implements Phase 2 Alarm Engine and deterministic ID scheme.

import { getReminders, saveReminders, getContests } from "./storageService.js";
import { showContestNotification } from "./notificationService.js";

/**
 * Generates a deterministic unique ID for a contest reminder.
 * Format: `${contestId}-${offsetMinutes}` (e.g. "codeforces-2282-30")
 * @param {string} contestId
 * @param {number} offsetMinutes
 * @returns {string}
 */
export function reminderId(contestId, offsetMinutes) {
  return `${contestId}-${offsetMinutes}`;
}

/**
 * Schedules a reminder for a contest.
 * @param {import("./contestService.js").Contest} contest
 * @param {number} offsetMinutes
 * @returns {Promise<Object|null>}
 */
export async function scheduleReminder(contest, offsetMinutes) {
  if (
    !contest ||
    !contest.id ||
    !Number.isFinite(offsetMinutes) ||
    offsetMinutes <= 0
  ) {
    return null;
  }

  const id = reminderId(contest.id, offsetMinutes);
  const scheduledTime = contest.startTime - offsetMinutes * 60 * 1000;
  const now = Date.now();

  // Reject reminders whose trigger time is already in the past
  if (scheduledTime <= now) {
    return null;
  }

  const reminders = await getReminders();
  const existing = reminders.find((r) => r.id === id);

  if (existing) {
    // If it exists but was disabled, re-enable it
    if (!existing.enabled) {
      return toggleReminder(id, true);
    }
    return existing; // Already active, avoid duplicate
  }

  const reminder = {
    id,
    contestId: contest.id,
    contestName: contest.name,
    platform: contest.platform,
    contestUrl: contest.url,
    contestStartTime: contest.startTime,
    offsetMinutes,
    scheduledTime,
    enabled: true,
    createdAt: now,
  };

  await saveReminders([...reminders, reminder]);

  if (typeof chrome !== "undefined" && chrome.alarms?.create) {
    await chrome.alarms.create(id, { when: scheduledTime });
  }

  return reminder;
}

/**
 * Enables or disables an existing reminder without deleting it.
 * @param {string} id
 * @param {boolean} enabled
 * @returns {Promise<Object|null>}
 */
export async function toggleReminder(id, enabled) {
  const reminders = await getReminders();
  const index = reminders.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const reminder = reminders[index];
  reminder.enabled = enabled;
  reminders[index] = reminder;

  await saveReminders(reminders);

  if (typeof chrome !== "undefined" && chrome.alarms) {
    if (enabled) {
      if (reminder.scheduledTime > Date.now()) {
        await chrome.alarms.create(id, { when: reminder.scheduledTime });
      }
    } else {
      await chrome.alarms.clear(id);
    }
  }

  return reminder;
}

/**
 * Removes an individual scheduled reminder and clears its Chrome alarm.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function removeReminder(id) {
  if (typeof chrome !== "undefined" && chrome.alarms?.clear) {
    await chrome.alarms.clear(id);
  }
  const reminders = await getReminders();
  await saveReminders(reminders.filter((r) => r.id !== id));
}

/**
 * Removes all scheduled reminders and clears all reminder Chrome alarms.
 * @returns {Promise<void>}
 */
export async function removeAllReminders() {
  const reminders = await getReminders();
  if (typeof chrome !== "undefined" && chrome.alarms?.clear) {
    await Promise.all(reminders.map((r) => chrome.alarms.clear(r.id)));
  }
  await saveReminders([]);
}

/**
 * Reconciles stored reminders with Chrome alarms:
 * - Drops expired alarms whose scheduled time or contest end time has passed.
 * - Recreates missing Chrome alarms after browser/worker restart.
 * @returns {Promise<void>}
 */
export async function reconcileAlarms() {
  const now = Date.now();
  const reminders = await getReminders();
  const contests = await getContests();
  const contestMap = new Map(contests.map((c) => [c.id, c]));

  // Keep reminders where scheduledTime is in future AND contest hasn't ended
  const activeReminders = reminders.filter((r) => {
    if (r.scheduledTime <= now) return false;
    const contest = contestMap.get(r.contestId);
    if (contest && contest.endTime <= now) return false;
    return true;
  });

  if (activeReminders.length !== reminders.length) {
    await saveReminders(activeReminders);
  }

  if (typeof chrome !== "undefined" && chrome.alarms?.getAll) {
    const existingAlarms = await chrome.alarms.getAll();
    const existingNames = new Set(existingAlarms.map((a) => a.name));
    const activeNames = new Set(activeReminders.map((r) => r.id));

    // 1. Clear obsolete reminder alarms (excluding sync alarm)
    for (const a of existingAlarms) {
      if (a.name !== "contestpulse-sync" && !activeNames.has(a.name)) {
        await chrome.alarms.clear(a.name);
      }
    }

    // 2. Re-create any missing alarms for enabled active reminders
    for (const r of activeReminders) {
      if (r.enabled && !existingNames.has(r.id)) {
        await chrome.alarms.create(r.id, { when: r.scheduledTime });
      }
    }
  }
}

/**
 * Handles an alarm event fired by Chrome alarms.
 * @param {chrome.alarms.Alarm} alarm
 * @returns {Promise<void>}
 */
export async function handleAlarmFired(alarm) {
  const reminders = await getReminders();
  const reminder = reminders.find((r) => r.id === alarm.name);
  if (!reminder) return;

  if (reminder.enabled) {
    await showContestNotification(reminder);
  }

  // Remove the fired reminder from active list
  await removeReminder(alarm.name);
}
