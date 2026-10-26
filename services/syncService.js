// Periodic/manual synchronization. Each provider is isolated so one failure
// never blocks the others.
import { fetchContests as fetchCodeforces } from "../providers/CodeforcesProvider.js";
import { fetchContests as fetchCodeChef } from "../providers/CodeChefProvider.js";
import { fetchContests as fetchLeetCode } from "../providers/LeetCodeProvider.js";
import { fetchContests as fetchAtCoder } from "../providers/AtCoderProvider.js";
import { normalizeContests } from "./contestService.js";
import { getSettings, saveContests, getContests } from "./storageService.js";

const PROVIDERS = {
  Codeforces: fetchCodeforces,
  CodeChef: fetchCodeChef,
  LeetCode: fetchLeetCode,
  AtCoder: fetchAtCoder,
};

export async function syncContests() {
  const settings = await getSettings();
  const enabled = settings.enabledPlatforms.filter((p) => PROVIDERS[p]);

  const results = await Promise.allSettled(enabled.map((p) => PROVIDERS[p]()));
  const errors = [];
  const fresh = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") fresh.push(...r.value);
    else errors.push({ platform: enabled[i], message: String(r.reason) });
  });

  // Keep cached data for platforms that failed
  const cached = await getContests();
  const failed = new Set(errors.map((e) => e.platform));
  const kept = cached.filter((c) => failed.has(c.platform));

  const merged = normalizeContests([...fresh, ...kept]);
  await saveContests(merged);
  return { count: merged.length, errors };
}
