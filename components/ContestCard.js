// Renders one contest: platform tag, status badge, live countdown,
// contest title, timing metadata, and action buttons with ReminderPicker.
// Implements Design Spec §5.5 & §5.6.

import { PLATFORMS } from "../utils/platformUtils.js";
import { formatContestMeta, getCountdownDetails } from "../utils/dateUtils.js";
import { escapeHtml } from "../utils/formatUtils.js";
import { ReminderPicker } from "./ReminderPicker.js";

/**
 * Creates a Contest Card DOM element.
 * @param {Object} props
 * @param {import("../services/contestService.js").Contest} props.contest
 * @param {Array<number>} [props.activeReminders=[]] array of reminder offset minutes
 * @param {function(import("../services/contestService.js").Contest, number): void} [props.onSetReminder]
 * @param {function(string, number): void} [props.onRemoveReminder]
 * @returns {HTMLElement}
 */
export function ContestCard({
  contest,
  activeReminders = [],
  onSetReminder,
  onRemoveReminder,
} = {}) {
  const card = document.createElement("article");
  card.className =
    "p-3 rounded-md bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex flex-col gap-2 transition-shadow hover:border-[var(--border)]";
  card.dataset.contestId = contest.id;

  const now = Date.now();
  const status = contest.status || "upcoming";
  const metaPlatform = PLATFORMS[contest.platform] || {
    short: (contest.platform || "").slice(0, 2).toUpperCase(),
    name: contest.platform,
  };

  const countdown = getCountdownDetails(
    contest.startTime,
    contest.endTime,
    now,
  );
  const metaText = formatContestMeta(
    contest.startTime,
    contest.endTime,
    contest.duration,
    status,
  );

  // ──────────────────────────────────────────
  // Row 1: Badges & Countdown
  // ──────────────────────────────────────────
  const row1 = document.createElement("div");
  row1.className = "flex items-center justify-between text-xs";

  const badges = document.createElement("div");
  badges.className = "flex items-center gap-1.5";

  // Platform Tag: [CF]
  const tag = document.createElement("span");
  tag.className =
    "px-1.5 py-0.5 rounded-sm bg-[var(--surface)] text-[var(--primary)] font-bold text-[10px] tracking-[0.5px]";
  tag.textContent = `[${metaPlatform.short}]`;
  badges.appendChild(tag);

  // Status Badge
  const statusBadge = document.createElement("span");
  if (status === "ongoing") {
    statusBadge.className =
      "flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-[var(--bg)] text-[var(--success)] font-bold text-[10px] uppercase";
    statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>ONGOING`;
  } else if (status === "upcoming") {
    statusBadge.className =
      "px-1.5 py-0.5 rounded-sm bg-[var(--surface)] text-[var(--muted)] text-[10px] uppercase font-medium";
    statusBadge.textContent = "UPCOMING";
  } else {
    statusBadge.className =
      "px-1.5 py-0.5 rounded-sm bg-[var(--surface)] text-[var(--muted-60)] text-[10px] uppercase";
    statusBadge.textContent = "ENDED";
  }
  badges.appendChild(statusBadge);
  row1.appendChild(badges);

  // Countdown element
  const countdownEl = document.createElement("div");
  countdownEl.className =
    "flex items-center gap-1 font-mono text-[13px] font-bold tracking-tight";

  let countdownColor = "text-[var(--primary)]";
  if (countdown.isOngoing) countdownColor = "text-[var(--text)]";
  else if (countdown.isUrgent) countdownColor = "text-[var(--warning)]";
  countdownEl.className += ` ${countdownColor}`;

  // Icon
  if (countdown.icon === "stopwatch") {
    countdownEl.innerHTML = `
      <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <circle cx="12" cy="14" r="8"/>
        <path d="M12 2v3M9 2h6M12 10v4l2 2"/>
      </svg>
      <span>${escapeHtml(countdown.text)}</span>`;
  } else if (countdown.icon === "clock") {
    countdownEl.innerHTML = `
      <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 2"/>
      </svg>
      <span>${escapeHtml(countdown.text)}</span>`;
  } else {
    countdownEl.innerHTML = `<span>${escapeHtml(countdown.text)}</span>`;
  }
  row1.appendChild(countdownEl);
  card.appendChild(row1);

  // ──────────────────────────────────────────
  // Row 2: Title & Meta Timing
  // ──────────────────────────────────────────
  const row2 = document.createElement("div");
  row2.className = "flex flex-col gap-0.5";

  const title = document.createElement("h3");
  title.className =
    "text-[13px] font-semibold text-[var(--text)] leading-snug line-clamp-1 hover:text-[var(--primary)] cursor-pointer";
  title.title = contest.name;
  title.textContent = contest.name;
  title.addEventListener("click", () => {
    if (contest.url) {
      if (typeof chrome !== "undefined" && chrome.tabs?.create) {
        chrome.tabs.create({ url: contest.url });
      } else {
        window.open(contest.url, "_blank", "noopener,noreferrer");
      }
    }
  });
  row2.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "text-[11px] font-medium text-[var(--muted)]";
  meta.textContent = metaText;
  row2.appendChild(meta);

  card.appendChild(row2);

  // ──────────────────────────────────────────
  // Row 2.5: Inline Quick-Alert Reminder Picker
  // ──────────────────────────────────────────
  const pickerWrapper = document.createElement("div");
  pickerWrapper.className = "hidden";

  const picker = ReminderPicker({
    contest,
    activeOffsets: activeReminders,
    onSetOffset: (c, min) => {
      if (typeof onSetReminder === "function") {
        onSetReminder(c, min);
      }
    },
    onRemoveOffset: (cId, min) => {
      if (typeof onRemoveReminder === "function") {
        onRemoveReminder(cId, min);
      }
    },
    onClose: () => {
      pickerWrapper.classList.add("hidden");
    },
  });
  pickerWrapper.appendChild(picker);
  card.appendChild(pickerWrapper);

  // ──────────────────────────────────────────
  // Row 3: Actions
  // ──────────────────────────────────────────
  const row3 = document.createElement("div");
  row3.className =
    "flex items-center justify-between pt-1 gap-2 border-t border-[var(--border-subtle)]";

  // Left action: Reminder indicator badge(s) or Set Reminder button
  const leftAction = document.createElement("div");

  if (activeReminders.length > 0) {
    const reminderBadge = document.createElement("button");
    reminderBadge.type = "button";
    reminderBadge.className =
      "flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[var(--surface)] text-[var(--primary)] text-[10px] font-semibold border border-[var(--border-subtle)] hover:border-[var(--primary)] cursor-pointer transition-colors";

    const label =
      activeReminders.length === 1
        ? `${activeReminders[0]}m reminder active`
        : `${activeReminders.map((m) => `${m}m`).join(", ")} active`;

    reminderBadge.innerHTML = `
      <svg class="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span>${escapeHtml(label)}</span>
    `;
    reminderBadge.addEventListener("click", () => {
      pickerWrapper.classList.toggle("hidden");
    });
    leftAction.appendChild(reminderBadge);
  } else {
    const setReminderBtn = document.createElement("button");
    setReminderBtn.type = "button";
    setReminderBtn.className =
      "flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[var(--bg)] text-[var(--muted)] text-[10px] font-medium border border-[var(--border-subtle)] hover:text-[var(--text)] hover:border-[var(--border)] cursor-pointer transition-colors";
    setReminderBtn.innerHTML = `
      <svg class="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span>Set Reminder</span>
    `;
    setReminderBtn.addEventListener("click", () => {
      pickerWrapper.classList.toggle("hidden");
    });
    leftAction.appendChild(setReminderBtn);
  }
  row3.appendChild(leftAction);

  // Right action: Enter Contest / Open Contest
  const openBtn = document.createElement("button");
  openBtn.type = "button";

  if (status === "ongoing") {
    openBtn.className =
      "flex items-center gap-1 px-3 py-1 rounded-sm bg-[var(--primary)] text-[var(--primary-on)] text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm";
    openBtn.innerHTML = `
      <span>Enter Contest</span>
      <svg class="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.2">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    `;
  } else {
    openBtn.className =
      "flex items-center gap-1 px-2.5 py-1 rounded-sm bg-[var(--bg)] text-[var(--muted)] text-[11px] font-medium border border-[var(--border-subtle)] hover:text-[var(--text)] hover:border-[var(--border)] transition-colors cursor-pointer";
    openBtn.innerHTML = `
      <span>Open Contest</span>
      <svg class="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    `;
  }

  openBtn.addEventListener("click", () => {
    if (contest.url) {
      if (typeof chrome !== "undefined" && chrome.tabs?.create) {
        chrome.tabs.create({ url: contest.url });
      } else {
        window.open(contest.url, "_blank", "noopener,noreferrer");
      }
    }
  });

  row3.appendChild(openBtn);
  card.appendChild(row3);

  return card;
}
