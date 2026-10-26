// Shared display-formatting helpers.
export function truncate(text, max = 50) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function reminderLabel(offsetMinutes) {
  return `${offsetMinutes} min before`;
}
