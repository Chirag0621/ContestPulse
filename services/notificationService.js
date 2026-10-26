// Creates Chrome notifications and handles clicks.
import { getContests, getSettings } from "./storageService.js";

export async function showContestNotification(reminder) {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;

  const contests = await getContests();
  const contest = contests.find((c) => c.id === reminder.contestId);
  if (!contest) return;

  chrome.notifications.create(contest.id, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: `${contest.platform}: starting in ${reminder.offsetMinutes} min`,
    message: contest.name,
  });
}

export async function handleNotificationClick(notificationId) {
  const contests = await getContests();
  const contest = contests.find((c) => c.id === notificationId);
  if (contest) chrome.tabs.create({ url: contest.url });
  chrome.notifications.clear(notificationId);
}
