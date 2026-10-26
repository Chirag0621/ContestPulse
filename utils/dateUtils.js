// Timestamps are ms internally; format to local time only for display.
export function formatLocalDateTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ") || "0m";
}

export function formatCountdown(ms) {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export function reminderTime(startTime, offsetMinutes) {
  return startTime - offsetMinutes * 60 * 1000;
}
