// Platform identifiers and display metadata.
export const PLATFORMS = {
  Codeforces: {
    id: "codeforces",
    short: "CF",
    name: "Codeforces",
    domain: "codeforces.com",
    logo: "assets/logos/codeforces.svg",
  },
  CodeChef: {
    id: "codechef",
    short: "CC",
    name: "CodeChef",
    domain: "codechef.com",
    logo: "assets/logos/codechef.svg",
  },
  LeetCode: {
    id: "leetcode",
    short: "LC",
    name: "LeetCode",
    domain: "leetcode.com",
    logo: "assets/logos/leetcode.svg",
  },
  AtCoder: {
    id: "atcoder",
    short: "AC",
    name: "AtCoder",
    domain: "atcoder.jp",
    logo: "assets/logos/atcoder.svg",
  },
};

export const PLATFORM_NAMES = Object.keys(PLATFORMS);

export function getPlatformMeta(name) {
  return (
    PLATFORMS[name] || {
      id: (name || "").toLowerCase(),
      short: (name || "").slice(0, 2).toUpperCase(),
      name: name || "Unknown",
    }
  );
}
