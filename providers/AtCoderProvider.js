// AtCoder provider: fetch platform data and return normalized contests.
// TODO: verify the data source/API during implementation.

export const PLATFORM = "AtCoder";

/** @returns {Promise<Array<import("../services/contestService.js").Contest>>} */
export async function fetchContests() {
  // 1. Fetch data from the AtCoder source
  // 2. Convert times/durations into the common contest model (ms timestamps, duration in seconds)
  // 3. Validate and return normalized contests; throw on failure (syncService isolates errors)
  return [];
}
