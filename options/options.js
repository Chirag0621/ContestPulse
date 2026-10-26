// Settings: theme, enabled platforms, notifications, default + custom reminders.
import { getSettings, saveSettings } from "../services/storageService.js";

async function init() {
  const settings = await getSettings();
  // TODO: render controls, save via saveSettings(), then reconcile alarms
  console.log("ContestPulse options ready", settings);
}

init();
