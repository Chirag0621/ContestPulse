// Coordinates providers, validates/normalizes contests, filters, and cache.
import { getContests } from "./storageService.js";

/**
 * @typedef {Object} Contest
 * @property {string} id           stable + unique, e.g. "codeforces-1129"
 * @property {string} platform
 * @property {string} name
 * @property {number} startTime    ms timestamp
 * @property {number} endTime      ms timestamp
 * @property {number} duration     seconds
 * @property {string} url
 * @property {"upcoming"|"ongoing"|"completed"} status
 */

export function deriveStatus(contest, now = Date.now()) {
  if (now < contest.startTime) return "upcoming";
  if (now < contest.endTime) return "ongoing";
  return "completed";
}

export function validateContest(c) {
  return Boolean(
    c &&
    c.id &&
    c.name &&
    c.url &&
    Number.isFinite(c.startTime) &&
    Number.isFinite(c.endTime),
  );
}

export function normalizeContests(list) {
  return list
    .filter(validateContest)
    .map((c) => ({ ...c, status: deriveStatus(c) }));
}

export function filterContests(
  contests,
  { timeFilter = "all", platforms = [] } = {},
) {
  // TODO: implement All / Ongoing / Next 24 Hours / Next 7 Days + platform filtering
  return contests;
}

export async function getCachedContests() {
  return getContests();
}
