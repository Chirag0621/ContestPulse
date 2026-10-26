// Alarms: list scheduled reminders; remove one or all.
import { getReminders } from "../services/storageService.js";
import {
  removeReminder,
  removeAllReminders,
} from "../services/alarmService.js";

async function init() {
  const reminders = await getReminders();
  // TODO: render list with remove/toggle buttons + "Remove All"
  console.log("ContestPulse alarms ready", reminders);
}

init();
