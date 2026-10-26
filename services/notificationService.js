// Creates Chrome desktop notifications and handles user click interactions.
// Implements Phase 2 Notification Workflow.

import { getContests, getSettings } from "./storageService.js";

/**
 * Shows a native Chrome desktop notification for a reminder.
 * @param {Object} reminder
 * @returns {Promise<void>}
 */
export async function showContestNotification(reminder) {
  if (!reminder) return;

  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;

  // Retrieve contest details to ensure latest title & URL
  const contests = await getContests();
  const contest = contests.find((c) => c.id === reminder.contestId);
  const name = contest?.name || reminder.contestName || "Programming Contest";
  const platform = contest?.platform || reminder.platform || "ContestPulse";
  const url = contest?.url || reminder.contestUrl || "";

  if (typeof chrome !== "undefined" && chrome.notifications?.create) {
    const iconUrl =
      typeof chrome.runtime?.getURL === "function"
        ? chrome.runtime.getURL("icons/icon128.png")
        : "icons/icon128.png";

    // Use notificationId encoded with URL if contestId doesn't exist in cache
    const notifId = contest ? contest.id : `url:${encodeURIComponent(url)}`;

    chrome.notifications.create(notifId, {
      type: "basic",
      iconUrl,
      title: `${platform}: Starting in ${reminder.offsetMinutes}m`,
      message: name,
      contextMessage: "Click to open contest in browser",
      priority: 2,
    });
  }
}

/**
 * Handles user clicking on a Chrome desktop notification.
 * Opens the corresponding contest URL in a browser tab.
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
export async function handleNotificationClick(notificationId) {
  if (!notificationId) return;

  let targetUrl = null;

  if (notificationId.startsWith("url:")) {
    targetUrl = decodeURIComponent(notificationId.slice(4));
  } else {
    const contests = await getContests();
    const contest = contests.find((c) => c.id === notificationId);
    if (contest) targetUrl = contest.url;
  }

  if (targetUrl) {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, "_blank");
    }
  }

  if (typeof chrome !== "undefined" && chrome.notifications?.clear) {
    chrome.notifications.clear(notificationId);
  }
}
