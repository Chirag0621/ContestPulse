// AtCoder provider: fetch upcoming and active contests from AtCoder website.

export const PLATFORM = "AtCoder";
const ATCODER_URL = "https://atcoder.jp/contests/";

/**
 * Parses AtCoder duration string formatted as "HH:MM" or "HHH:MM" into seconds.
 * @param {string} str e.g. "01:40" or "240:00"
 * @returns {number} duration in seconds
 */
function parseDuration(str) {
  if (!str) return 7200;
  const parts = str.trim().split(":");
  if (parts.length === 2) {
    const hours = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hours * 3600 + mins * 60;
  }
  return 7200;
}

/**
 * Extracts contests from an HTML table block.
 * @param {string} tableHtml
 * @param {number} now
 * @returns {Array<import("../services/contestService.js").Contest>}
 */
function parseTableRows(tableHtml, now) {
  const contests = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row = rowMatch[1];

    // Find time
    const timeMatch = row.match(
      /<time[^>]*class=['"][^'"]*fixtime[^'"]*['"][^>]*>([^<]+)<\/time>/i,
    );
    // Find contest anchor
    const anchorMatch = row.match(
      /<a\s+href=['"]\/contests\/([^'"]+)['"][^>]*>([^<]+)<\/a>/i,
    );
    // Find duration
    const durationMatch = row.match(
      /<td[^>]*class=['"][^'"]*text-center[^'"]*['"][^>]*>\s*(\d+:\d+)\s*<\/td>/i,
    );

    if (timeMatch && anchorMatch) {
      const timeStr = timeMatch[1].trim();
      // Format: "2026-10-30 19:00:00+0900" -> ISO format "2026-10-30T19:00:00+09:00"
      let isoStr = timeStr.replace(" ", "T");
      if (/([+-]\d{2})(\d{2})$/.test(isoStr)) {
        isoStr = isoStr.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
      }

      const startTime = new Date(isoStr).getTime();
      const slug = anchorMatch[1].trim();
      const name = anchorMatch[2].trim();
      const duration = durationMatch ? parseDuration(durationMatch[1]) : 7200;
      const endTime = startTime + duration * 1000;

      if (Number.isFinite(startTime) && endTime > now) {
        contests.push({
          id: `atcoder-${slug.toLowerCase()}`,
          platform: PLATFORM,
          name,
          startTime,
          endTime,
          duration,
          url: `https://atcoder.jp/contests/${slug}`,
        });
      }
    }
  }

  return contests;
}

/**
 * @returns {Promise<Array<import("../services/contestService.js").Contest>>}
 */
export async function fetchContests() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(ATCODER_URL, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`AtCoder returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const now = Date.now();
    const results = [];

    // 1. Look for upcoming contests table
    const upcomingIdx = html.indexOf('id="contest-table-upcoming"');
    if (upcomingIdx !== -1) {
      const chunk = html.slice(upcomingIdx);
      const endTable = chunk.indexOf("</table>");
      const tableHtml = endTable !== -1 ? chunk.slice(0, endTable) : chunk;
      results.push(...parseTableRows(tableHtml, now));
    } else {
      // Fallback search for heading
      const headingIdx = html.indexOf("Upcoming Contests");
      if (headingIdx !== -1) {
        const chunk = html.slice(headingIdx);
        const endTable = chunk.indexOf("</table>");
        const tableHtml = endTable !== -1 ? chunk.slice(0, endTable) : chunk;
        results.push(...parseTableRows(tableHtml, now));
      }
    }

    // 2. Look for active/ongoing contests table
    const activeIdx = html.indexOf('id="contest-table-action"');
    if (activeIdx !== -1) {
      const chunk = html.slice(activeIdx);
      const endTable = chunk.indexOf("</table>");
      const tableHtml = endTable !== -1 ? chunk.slice(0, endTable) : chunk;
      results.push(...parseTableRows(tableHtml, now));
    }

    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}
