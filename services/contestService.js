// Coordinates providers, validates/normalizes contests, filters, and cache.
import { getContests } from "./storageService.js";

/**
 * @typedef {Object} Contest
 * @property {string} id           stable + unique, e.g. "codeforces-1129"
 * @property {string} platform     "Codeforces" | "CodeChef" | "LeetCode" | "AtCoder"
 * @property {string} name         e.g. "Weekly Contest 421"
 * @property {number} startTime    ms timestamp
 * @property {number} endTime      ms timestamp
 * @property {number} duration     seconds
 * @property {string} url          valid contest URL
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
    typeof c.id === "string" &&
    c.id.length > 0 &&
    typeof c.name === "string" &&
    c.name.length > 0 &&
    typeof c.url === "string" &&
    c.url.startsWith("http") &&
    Number.isFinite(c.startTime) &&
    Number.isFinite(c.endTime) &&
    c.endTime > c.startTime,
  );
}

/**
 * Normalizes, validates, deduplicates by id, and sorts contests by startTime ascending.
 * @param {Array<Contest>} list
 * @param {number} [now]
 * @returns {Array<Contest>}
 */
export function normalizeContests(list, now = Date.now()) {
  const seen = new Set();
  const valid = [];

  for (const item of list) {
    if (!validateContest(item)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    valid.push({
      ...item,
      status: deriveStatus(item, now),
    });
  }

  // Sort chronologically by start time
  return valid.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Filters contests by time window, selected platforms, and search query.
 * @param {Array<Contest>} contests
 * @param {Object} options
 * @param {"all"|"ongoing"|"24h"|"7d"} [options.timeFilter="all"]
 * @param {Array<string>} [options.platforms=[]]
 * @param {string} [options.searchQuery=""]
 * @param {number} [options.now]
 * @returns {Array<Contest>}
 */
export function filterContests(
  contests = [],
  {
    timeFilter = "all",
    platforms = [],
    searchQuery = "",
    now = Date.now(),
  } = {},
) {
  const query = searchQuery ? searchQuery.trim().toLowerCase() : "";
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

  return contests.filter((c) => {
    // 1. Platform filter (if specified)
    if (platforms && platforms.length > 0) {
      const matchPlatform = platforms.some(
        (p) => p.toLowerCase() === c.platform.toLowerCase(),
      );
      if (!matchPlatform) return false;
    }

    // 2. Search query filter
    if (query) {
      const matchName = c.name.toLowerCase().includes(query);
      const matchPlat = c.platform.toLowerCase().includes(query);
      if (!matchName && !matchPlat) return false;
    }

    // Recalculate status for filter accuracy
    const status = deriveStatus(c, now);

    // Filter out completed contests by default
    if (status === "completed") return false;

    // 3. Time filter
    switch (timeFilter) {
      case "ongoing":
        return status === "ongoing";
      case "24h":
        return (
          status === "ongoing" ||
          (c.startTime <= now + ONE_DAY_MS && c.startTime >= now)
        );
      case "7d":
        return (
          status === "ongoing" ||
          (c.startTime <= now + SEVEN_DAYS_MS && c.startTime >= now)
        );
      case "all":
      default:
        return true;
    }
  });
}

/**
 * Computes live counts for each filter category, respecting active platforms.
 * @param {Array<Contest>} contests
 * @param {Array<string>} platforms
 * @param {number} [now]
 * @returns {{ all: number, ongoing: number, next24h: number, next7d: number }}
 */
export function getFilterCounts(
  contests = [],
  platforms = [],
  now = Date.now(),
) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

  let all = 0;
  let ongoing = 0;
  let next24h = 0;
  let next7d = 0;

  for (const c of contests) {
    if (platforms && platforms.length > 0) {
      const match = platforms.some(
        (p) => p.toLowerCase() === c.platform.toLowerCase(),
      );
      if (!match) continue;
    }

    const status = deriveStatus(c, now);
    if (status === "completed") continue;

    all++;
    if (status === "ongoing") {
      ongoing++;
      next24h++;
      next7d++;
    } else {
      if (c.startTime <= now + ONE_DAY_MS) next24h++;
      if (c.startTime <= now + SEVEN_DAYS_MS) next7d++;
    }
  }

  return { all, ongoing, next24h, next7d };
}

export async function getCachedContests() {
  return getContests();
}
