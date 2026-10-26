// LeetCode provider: fetch upcoming contests using LeetCode GraphQL API.

export const PLATFORM = "LeetCode";
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

const CONTESTS_QUERY = `
query {
  allContests {
    title
    titleSlug
    startTime
    duration
    originStartTime
    isVirtual
  }
}
`;

/**
 * @returns {Promise<Array<import("../services/contestService.js").Contest>>}
 */
export async function fetchContests() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(LEETCODE_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: CONTESTS_QUERY }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`LeetCode GraphQL returned HTTP ${response.status}`);
    }

    const json = await response.json();
    const list = json?.data?.allContests;
    if (!Array.isArray(list)) {
      throw new Error("Invalid LeetCode contests response structure");
    }

    const now = Date.now();
    const contests = [];

    for (const c of list) {
      if (!c || !c.titleSlug || !c.title || !c.startTime) continue;
      if (c.isVirtual) continue;

      const startTime = c.startTime * 1000;
      const duration = Number(c.duration) || 5400; // 90 mins default
      const endTime = startTime + duration * 1000;

      // Filter out finished contests
      if (endTime <= now) continue;

      contests.push({
        id: `leetcode-${c.titleSlug}`,
        platform: PLATFORM,
        name: c.title.trim(),
        startTime,
        endTime,
        duration,
        url: `https://leetcode.com/contest/${c.titleSlug}`,
      });
    }

    return contests;
  } finally {
    clearTimeout(timeoutId);
  }
}
