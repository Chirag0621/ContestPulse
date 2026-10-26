// Codeforces provider: fetch upcoming and ongoing contests from Codeforces API.

export const PLATFORM = "Codeforces";
const CODEFORCES_API = "https://codeforces.com/api/contest.list?gym=false";

/**
 * @returns {Promise<Array<import("../services/contestService.js").Contest>>}
 */
export async function fetchContests() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(CODEFORCES_API, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Codeforces API returned HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.status !== "OK" || !Array.isArray(json.result)) {
      throw new Error("Invalid Codeforces API response format");
    }

    const now = Date.now();
    const activeOrUpcoming = json.result.filter((c) => {
      if (!c || !c.id || !c.name || !c.startTimeSeconds) return false;
      const startTime = c.startTimeSeconds * 1000;
      const duration = Number(c.durationSeconds) || 7200;
      const endTime = startTime + duration * 1000;
      // Keep if upcoming or still ongoing
      return endTime > now && (c.phase === "BEFORE" || c.phase === "CODING");
    });

    return activeOrUpcoming.map((c) => {
      const startTime = c.startTimeSeconds * 1000;
      const duration = Number(c.durationSeconds) || 7200;
      const endTime = startTime + duration * 1000;

      return {
        id: `codeforces-${c.id}`,
        platform: PLATFORM,
        name: c.name.trim(),
        startTime,
        endTime,
        duration,
        url: `https://codeforces.com/contest/${c.id}`,
      };
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
