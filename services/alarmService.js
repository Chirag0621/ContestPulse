// Creates, updates, removes and de-duplicates reminder alarms.
import { getReminders, saveReminders } from "./storageService.js";
import { showContestNotification } from "./notificationService.js";

/** Deterministic id: contestId + offset, e.g. "codeforces-1129-30" */
export function reminderId(contestId, offsetMinutes) {
  return `${contestId}-${offsetMinutes}`;
}

export async function scheduleReminder(contest, offsetMinutes) {
  const id = reminderId(contest.id, offsetMinutes);
  const scheduledTime = contest.startTime - offsetMinutes * 60 * 1000;
  if (scheduledTime <= Date.now()) return null; // never schedule in the past

  const reminders = await getReminders();
  if (reminders.some((r) => r.id === id)) return null; // duplicate

  const reminder = {
    id,
    contestId: contest.id,
    platform: contest.platform,
    offsetMinutes,
    scheduledTime,
    enabled: true,
  };
  await saveReminders([...reminders, reminder]);
  await chrome.alarms.create(id, { when: scheduledTime });
  return reminder;
}

export async function removeReminder(id) {
  await chrome.alarms.clear(id);
  const reminders = await getReminders();
  await saveReminders(reminders.filter((r) => r.id !== id));
}

export async function removeAllReminders() {
  const reminders = await getReminders();
  await Promise.all(reminders.map((r) => chrome.alarms.clear(r.id)));
  await saveReminders([]);
}

/** Re-create alarms from persisted data, drop expired ones. */
export async function reconcileAlarms() {
  // TODO: compare contests + settings with stored reminders and Chrome alarms
}

export async function handleAlarmFired(alarm) {
  const reminders = await getReminders();
  const reminder = reminders.find((r) => r.id === alarm.name);
  if (!reminder || !reminder.enabled) return;
  await showContestNotification(reminder);
}
