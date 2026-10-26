// Platform filter chip toggle button.
// Implements Design Spec §5.4: Equal-width chips [CF] [LC] [CC] [AC] with ON/OFF label.

import { PLATFORMS } from "../utils/platformUtils.js";

/**
 * Creates a Platform Chip DOM element.
 * @param {Object} props
 * @param {string} props.platform e.g. "Codeforces"
 * @param {boolean} props.enabled
 * @param {function(string, boolean): void} props.onToggle
 * @returns {HTMLElement}
 */
export function PlatformChip({ platform, enabled = true, onToggle } = {}) {
  const meta = PLATFORMS[platform] || {
    short: (platform || "").slice(0, 2).toUpperCase(),
    name: platform,
  };

  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("role", "checkbox");
  btn.setAttribute("aria-checked", enabled ? "true" : "false");
  btn.setAttribute("aria-label", `Toggle ${meta.name} contests in feed`);
  btn.dataset.platform = platform;

  btn.className = `flex-1 flex items-center justify-between px-2 py-1 rounded-sm text-[11px] font-semibold tracking-[0.33px] transition-all cursor-pointer ${
    enabled
      ? "bg-[var(--primary)] text-[var(--primary-on)] shadow-sm"
      : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-raised)]"
  }`;

  // Tag: e.g. [CF]
  const tagSpan = document.createElement("span");
  tagSpan.className = "font-bold text-[10px] tracking-[0.5px]";
  tagSpan.textContent = `[${meta.short}]`;
  btn.appendChild(tagSpan);

  // Status: ON / OFF
  const statusSpan = document.createElement("span");
  statusSpan.className = `text-[9px] font-bold ${
    enabled ? "text-[var(--primary-on)]" : "text-[var(--muted-60)]"
  }`;
  statusSpan.textContent = enabled ? "ON" : "OFF";
  btn.appendChild(statusSpan);

  btn.addEventListener("click", () => {
    const nextState = !enabled;
    if (typeof onToggle === "function") {
      onToggle(platform, nextState);
    }
  });

  return btn;
}

/**
 * Creates the row of 4 equal-width platform chips.
 * @param {Object} props
 * @param {Array<string>} [props.activePlatforms]
 * @param {function(string, boolean): void} props.onToggle
 * @returns {HTMLElement}
 */
export function PlatformChipsRow({ activePlatforms = [], onToggle } = {}) {
  const row = document.createElement("div");
  row.className =
    "flex items-center gap-1.5 px-3 py-1 bg-transparent select-none";

  const allPlatforms = ["Codeforces", "LeetCode", "CodeChef", "AtCoder"];

  allPlatforms.forEach((p) => {
    const isEnabled = activePlatforms.includes(p);
    const chip = PlatformChip({
      platform: p,
      enabled: isEnabled,
      onToggle,
    });
    row.appendChild(chip);
  });

  return row;
}
