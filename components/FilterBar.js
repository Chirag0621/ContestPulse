// Time filters (All / Ongoing / Next 24h / Next 7d) ribbon.
// Implements Design Spec §5.3

/**
 * Creates the Time Filter Ribbon DOM element.
 * @param {Object} props
 * @param {"all"|"ongoing"|"24h"|"7d"} [props.selected="all"]
 * @param {{ all: number, ongoing: number, next24h: number, next7d: number }} [props.counts]
 * @param {function(string): void} props.onChange
 * @returns {HTMLElement}
 */
export function FilterBar({
  selected = "all",
  counts = { all: 0, ongoing: 0, next24h: 0, next7d: 0 },
  onChange,
} = {}) {
  const container = document.createElement("div");
  container.className =
    "flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-3 bg-transparent select-none";
  container.setAttribute("role", "radiogroup");
  container.setAttribute("aria-label", "Filter contests by time");

  const filters = [
    { id: "all", label: `All (${counts.all})`, hasDot: false },
    { id: "ongoing", label: `Ongoing (${counts.ongoing})`, hasDot: true },
    { id: "24h", label: `Next 24h (${counts.next24h})`, hasDot: false },
    { id: "7d", label: `Next 7d (${counts.next7d})`, hasDot: false },
  ];

  filters.forEach((f) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", selected === f.id ? "true" : "false");
    btn.dataset.filterId = f.id;

    const isActive = selected === f.id;
    btn.className = `flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-[0.33px] rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
      isActive
        ? "bg-[var(--primary)] text-[var(--primary-on)] shadow-sm"
        : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]"
    }`;

    if (f.hasDot) {
      const dot = document.createElement("span");
      dot.className = `w-1.5 h-1.5 rounded-full ${
        isActive ? "bg-[var(--primary-on)]" : "bg-[var(--success)]"
      }`;
      btn.appendChild(dot);
    }

    const textSpan = document.createElement("span");
    textSpan.textContent = f.label;
    btn.appendChild(textSpan);

    btn.addEventListener("click", () => {
      if (typeof onChange === "function") {
        onChange(f.id);
      }
    });

    container.appendChild(btn);
  });

  return container;
}
