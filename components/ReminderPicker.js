// Reminder picker component: choose 30 / 15 / 10 min or custom offset.
// Implements Design Spec §5.6 and §5.7.

/**
 * Creates a Reminder Picker DOM element.
 * @param {Object} props
 * @param {import("../services/contestService.js").Contest} props.contest
 * @param {Array<number>} [props.activeOffsets=[]]
 * @param {function(number): void} props.onSelectOffset
 * @param {function(): void} [props.onClose]
 * @returns {HTMLElement}
 */
export function ReminderPicker({
  contest,
  activeOffsets = [],
  onSelectOffset,
  onClose,
} = {}) {
  const container = document.createElement("div");
  container.className =
    "p-3 rounded-md bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-2.5 text-xs text-[var(--text)] shadow-md select-none";

  // Header row
  const header = document.createElement("div");
  header.className = "flex items-center justify-between";
  header.innerHTML = `
    <div class="flex items-center gap-1.5">
      <svg class="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="font-bold text-[11px] uppercase tracking-wider text-[var(--text)]">Schedule Reminder</span>
    </div>
  `;

  if (typeof onClose === "function") {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className =
      "text-[var(--muted)] hover:text-[var(--text)] text-xs p-1 cursor-pointer";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", onClose);
    header.appendChild(closeBtn);
  }
  container.appendChild(header);

  // Preset offsets buttons
  const presetsRow = document.createElement("div");
  presetsRow.className = "grid grid-cols-3 gap-1.5";

  const presets = [30, 15, 10];
  presets.forEach((min) => {
    const isSelected = activeOffsets.includes(min);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `py-1.5 px-2 text-center font-mono text-[11px] font-semibold rounded-sm border transition-colors cursor-pointer ${
      isSelected
        ? "bg-[var(--primary)] text-[var(--primary-on)] border-[var(--primary)]"
        : "bg-[var(--bg)] text-[var(--muted)] border-[var(--border-subtle)] hover:border-[var(--border)] hover:text-[var(--text)]"
    }`;
    btn.textContent = `${min} min`;

    btn.addEventListener("click", () => {
      if (typeof onSelectOffset === "function") {
        onSelectOffset(min);
      }
    });

    presetsRow.appendChild(btn);
  });
  container.appendChild(presetsRow);

  // Custom offset input row
  const customRow = document.createElement("div");
  customRow.className =
    "flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)]";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "1440";
  input.placeholder = "25";
  input.className =
    "w-16 px-2 py-1 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm font-mono text-[11px] text-[var(--text)] text-center focus:outline-none focus:border-[var(--primary)]";

  const suffix = document.createElement("span");
  suffix.className = "text-[10px] text-[var(--muted)] flex-1";
  suffix.textContent = "min before start";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className =
    "px-2.5 py-1 bg-[var(--surface-raised)] text-[var(--primary)] text-[10px] font-semibold rounded-sm border border-[var(--border-subtle)] hover:border-[var(--primary)] cursor-pointer transition-colors";
  addBtn.textContent = "Set";

  addBtn.addEventListener("click", () => {
    const val = parseInt(input.value, 10);
    if (Number.isFinite(val) && val > 0) {
      if (typeof onSelectOffset === "function") {
        onSelectOffset(val);
      }
      input.value = "";
    }
  });

  customRow.appendChild(input);
  customRow.appendChild(suffix);
  customRow.appendChild(addBtn);
  container.appendChild(customRow);

  return container;
}
