// Creates Chrome notifications and handles clicks.
import { getContests, getSettings } from "./storageService.js";

export async function showContestNotification(reminder) {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;

  const contests = await getContests();
  const contest = contests.find((c) => c.id === reminder.contestId);
  if (!contest) return;

  if (typeof chrome !== "undefined" && chrome.notifications?.create) {
    const iconUrl =
      typeof chrome.runtime?.getURL === "function"
        ? chrome.runtime.getURL("icons/icon128.png")
        : "icons/icon128.png";

    chrome.notifications.create(contest.id, {
      type: "basic",
      iconUrl,
      title: `${contest.platform}: starting in ${reminder.offsetMinutes} min`,
      message: contest.name,
    });
  }
}

export async function handleNotificationClick(notificationId) {
  const contests = await getContests();
  const contest = contests.find((c) => c.id === notificationId);
  if (contest) {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: contest.url });
    } else {
      window.open(contest.url, "_blank");
    }
  }
  if (typeof chrome !== "undefined" && chrome.notifications?.clear) {
    chrome.notifications.clear(notificationId);
  }
}
