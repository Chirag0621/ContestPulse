// Service worker entry point. Registers lifecycle, alarm and notification events.
// Do not keep important state in memory - the worker can be stopped by Chrome.
import { syncContests } from "./services/syncService.js";
import { handleAlarmFired, reconcileAlarms } from "./services/alarmService.js";
import { handleNotificationClick } from "./services/notificationService.js";

const SYNC_ALARM = "contestpulse-sync";

chrome.runtime.onInstalled.addListener(async () => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 60 });
  await syncContests();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncContests();
  await reconcileAlarms();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM) {
    await syncContests();
    await reconcileAlarms();
  } else {
    await handleAlarmFired(alarm);
  }
});

chrome.notifications.onClicked.addListener(handleNotificationClick);

// Popup -> background messages (e.g. manual refresh)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SYNC_NOW") {
    syncContests().then((result) => sendResponse(result));
    return true; // async response
  }
});
