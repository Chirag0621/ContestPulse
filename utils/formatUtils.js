// Shared display-formatting helpers.

export function truncate(text = "", max = 50) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1).trim() + "…" : text;
}

export function reminderLabel(offsetMinutes) {
  return `${offsetMinutes}m reminder active`;
}

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
