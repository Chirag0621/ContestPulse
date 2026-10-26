// Reminder picker component: presets (30m, 15m, 10m) and custom minute offset input.
// Implements Design Spec §5.6 & §5.7.

/**
 * Creates the inline Reminder Picker DOM element.
 * @param {Object} props
 * @param {import("../services/contestService.js").Contest} props.contest
 * @param {Array<number>} [props.activeOffsets=[]]
 * @param {function(import("../services/contestService.js").Contest, number): void} props.onSetOffset
 * @param {function(string, number): void} props.onRemoveOffset
 * @param {function(): void} [props.onClose]
 * @returns {HTMLElement}
 */
export function ReminderPicker({
  contest,
  activeOffsets = [],
  onSetOffset,
  onRemoveOffset,
  onClose,
} = {}) {
  const container = document.createElement("div");
  container.className =
    "flex flex-col gap-2 p-2 rounded-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] text-xs select-none";

  const now = Date.now();

  // Header row
  const header = document.createElement("div");
  header.className = "flex items-center justify-between text-[10px]";

  const activeCount = activeOffsets.length;
  header.innerHTML = `
    <span class="font-bold text-[var(--muted)] tracking-wider">⏰ QUICK ALERT:</span>
    <span class="text-[var(--primary)] font-medium">
      ${
        activeCount > 0
          ? `${activeCount} reminder${activeCount > 1 ? "s" : ""} active`
          : "Choose reminder offset"
      }
    </span>
  `;

  if (typeof onClose === "function") {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className =
      "text-[var(--muted)] hover:text-[var(--text)] text-xs p-0.5 cursor-pointer";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", onClose);
    header.appendChild(closeBtn);
  }
  container.appendChild(header);

  // Preset Buttons Row (30m, 15m, 10m, + Custom toggle)
  const presetsRow = document.createElement("div");
  presetsRow.className = "grid grid-cols-4 gap-1 mt-0.5";

  const presets = [30, 15, 10];
  presets.forEach((min) => {
    const isSet = activeOffsets.includes(min);
    const triggerTime = contest.startTime - min * 60 * 1000;
    const isPast = triggerTime <= now;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `py-1 text-center font-mono text-[11px] rounded-sm transition-all cursor-pointer ${
      isPast
        ? "opacity-40 cursor-not-allowed bg-[var(--bg)] text-[var(--muted-60)] border border-transparent"
        : isSet
          ? "bg-[var(--primary)] text-[var(--primary-on)] font-bold shadow-sm"
          : "bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-[var(--border-subtle)]"
    }`;
    btn.textContent = `${min}m`;
    btn.title = isPast
      ? "Trigger time has already passed"
      : isSet
        ? "Click to remove this reminder"
        : `Set reminder ${min} minutes before start`;

    if (!isPast) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isSet) {
          if (typeof onRemoveOffset === "function") {
            onRemoveOffset(contest.id, min);
          }
        } else {
          if (typeof onSetOffset === "function") {
            onSetOffset(contest, min);
          }
        }
      });
    }

    presetsRow.appendChild(btn);
  });

  // + Custom Toggle Button
  const customToggleBtn = document.createElement("button");
  customToggleBtn.type = "button";
  customToggleBtn.className =
    "py-1 text-center font-mono text-[10px] rounded-sm bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer";
  customToggleBtn.textContent = "+ Custom";

  presetsRow.appendChild(customToggleBtn);
  container.appendChild(presetsRow);

  // Custom offset input row (collapsible)
  const customInputRow = document.createElement("div");
  customInputRow.className =
    "hidden flex items-center gap-1.5 pt-1.5 border-t border-[var(--border-subtle)]";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "1440";
  input.placeholder = "25";
  input.className =
    "w-16 px-1.5 py-0.5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm font-mono text-[11px] text-[var(--text)] text-center focus:outline-none focus:border-[var(--primary)]";

  const suffix = document.createElement("span");
  suffix.className = "text-[10px] text-[var(--muted)] flex-1";
  suffix.textContent = "min before start";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className =
    "px-2 py-0.5 bg-[var(--surface-raised)] text-[var(--primary)] text-[10px] font-semibold rounded-sm border border-[var(--border-subtle)] hover:border-[var(--primary)] cursor-pointer transition-colors";
  saveBtn.textContent = "Save";

  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const val = parseInt(input.value, 10);
    if (Number.isFinite(val) && val > 0) {
      const triggerTime = contest.startTime - val * 60 * 1000;
      if (triggerTime <= now) {
        alert("This reminder time has already passed.");
        return;
      }
      if (typeof onSetOffset === "function") {
        onSetOffset(contest, val);
      }
      input.value = "";
    }
  });

  customToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    customInputRow.classList.toggle("hidden");
    customInputRow.classList.toggle("flex");
  });

  customInputRow.appendChild(input);
  customInputRow.appendChild(suffix);
  customInputRow.appendChild(saveBtn);
  container.appendChild(customInputRow);

  return container;
}
