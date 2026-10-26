// CodeChef provider: fetch upcoming and present contests from CodeChef API.

export const PLATFORM = "CodeChef";
const CODECHEF_API =
  "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=premium";

/**
 * @returns {Promise<Array<import("../services/contestService.js").Contest>>}
 */
export async function fetchContests() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(CODECHEF_API, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`CodeChef API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawList = [
      ...(Array.isArray(data.present_contests) ? data.present_contests : []),
      ...(Array.isArray(data.future_contests) ? data.future_contests : []),
    ];

    const now = Date.now();
    const contests = [];

    for (const c of rawList) {
      if (!c || (!c.contest_code && !c.contest_id) || !c.contest_name) continue;

      const code = (c.contest_code || c.contest_id).trim();
      const name = c.contest_name.trim();

      // Parse start and end times
      let startTime = c.contest_start_date_iso
        ? new Date(c.contest_start_date_iso).getTime()
        : new Date(c.contest_start_date).getTime();

      let endTime = c.contest_end_date_iso
        ? new Date(c.contest_end_date_iso).getTime()
        : new Date(c.contest_end_date).getTime();

      let duration = Number(c.contest_duration)
        ? Number(c.contest_duration) * 60
        : 7200;

      if (!Number.isFinite(startTime) || startTime <= 0) continue;
      if (!Number.isFinite(endTime) || endTime <= startTime) {
        endTime = startTime + duration * 1000;
      } else {
        duration = Math.round((endTime - startTime) / 1000);
      }

      // Filter out contests that have already ended
      if (endTime <= now) continue;

      contests.push({
        id: `codechef-${code.toLowerCase()}`,
        platform: PLATFORM,
        name,
        startTime,
        endTime,
        duration,
        url: `https://www.codechef.com/${code}`,
      });
    }

    return contests;
  } finally {
    clearTimeout(timeoutId);
  }
}
