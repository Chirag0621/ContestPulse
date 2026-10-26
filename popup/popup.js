// Dashboard: render cached contests immediately, then refresh in the background.
import { getContests, getSettings } from "../services/storageService.js";

async function init() {
  const [contests, settings] = await Promise.all([
    getContests(),
    getSettings(),
  ]);
  // TODO: apply theme, render FilterBar + ContestCards, start countdown timer
  console.log("ContestPulse popup ready", {
    contests: contests.length,
    settings,
  });

  // Ask background to sync, then re-render when done
  chrome.runtime.sendMessage({ type: "SYNC_NOW" });
}

init();
