// Timestamps are ms internally; format to local time only for display.

/**
 * Formats a timestamp into user's local date + time (e.g. "Oct 24, 4:35 PM").
 * @param {number} ts
 * @returns {string}
 */
export function formatLocalDateTime(ts) {
  const date = new Date(ts);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats duration in seconds to "2h 00m" or "1h 30m" or "45m".
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  return `${m}m`;
}

/**
 * Formats the contest timing metadata row as per Design Spec §5.5:
 * Ongoing: "Oct 24, 4:35 PM • Oct 24, 6:35 PM (2h 00m)"
 * Upcoming: "Oct 25, 8:00 AM • Duration 1h 30m"
 * @param {number} startTime
 * @param {number} endTime
 * @param {number} duration
 * @param {string} status
 * @returns {string}
 */
export function formatContestMeta(startTime, endTime, duration, status) {
  const startStr = formatLocalDateTime(startTime);
  const durStr = formatDuration(duration);

  if (status === "ongoing") {
    const endStr = formatLocalDateTime(endTime);
    return `${startStr} • ${endStr} (${durStr})`;
  }
  return `${startStr} • Duration ${durStr}`;
}

/**
 * Computes countdown label, icon type, and urgent flag as per Design Spec §5.5:
 * Ongoing: "Ends in 1h 14m" (stopwatch icon)
 * Upcoming (< 24h): "Starts in 4h 30m" (clock icon, warning/orange color)
 * Upcoming (>= 24h): "Starts in 1d 6h" (cyan/primary color)
 * @param {number} startTime
 * @param {number} endTime
 * @param {number} [now]
 * @returns {{ text: string, icon: 'stopwatch' | 'clock' | 'none', isUrgent: boolean, isOngoing: boolean }}
 */
export function getCountdownDetails(startTime, endTime, now = Date.now()) {
  if (now >= endTime) {
    return { text: "Ended", icon: "none", isUrgent: false, isOngoing: false };
  }

  if (now >= startTime) {
    // Ongoing contest
    const diffMs = endTime - now;
    return {
      text: `Ends in ${formatTimeDiff(diffMs)}`,
      icon: "stopwatch",
      isUrgent: false,
      isOngoing: true,
    };
  }

  // Upcoming contest
  const diffMs = startTime - now;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const isUrgent = diffMs < ONE_DAY_MS;

  return {
    text: `Starts in ${formatTimeDiff(diffMs)}`,
    icon: isUrgent ? "clock" : "none",
    isUrgent,
    isOngoing: false,
  };
}

/**
 * Formats a millisecond difference into "1d 6h", "4h 30m", or "12m 45s".
 * @param {number} ms
 * @returns {string}
 */
export function formatTimeDiff(ms) {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Formats last sync time into "Synced just now" or "Synced 2m ago".
 * @param {number|null} lastSync
 * @param {number} [now]
 * @returns {string}
 */
export function formatLastSync(lastSync, now = Date.now()) {
  if (!lastSync) return "Never synced";
  const diffSec = Math.floor((now - lastSync) / 1000);
  if (diffSec < 60) return "Synced just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Synced ${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Synced ${diffHours}h ago`;
  return `Synced on ${new Date(lastSync).toLocaleDateString()}`;
}

export function reminderTime(startTime, offsetMinutes) {
  return startTime - offsetMinutes * 60 * 1000;
}
