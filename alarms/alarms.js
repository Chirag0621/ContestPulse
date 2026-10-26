// Alarms & Reminders: list scheduled reminders, remove one or all.
// Implements Design Spec §6.2.

import { getReminders } from "../services/storageService.js";
import {
  removeReminder,
  removeAllReminders,
} from "../services/alarmService.js";

async function init() {
  const app = document.getElementById("app");
  if (!app) return;

  const reminders = await getReminders();

  app.innerHTML = `
    <!-- Sticky Alarms Header -->
    <header class="h-12 px-3 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-glass)] backdrop-blur-md sticky top-0 z-20 select-none">
      <div class="flex items-center gap-2">
        <button id="back-btn" class="w-7 h-7 rounded-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer" aria-label="Back to Contests Feed">
          <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="flex flex-col">
          <h1 class="text-xs font-bold text-[var(--text)] leading-none">ContestPulse</h1>
          <span class="text-[10px] font-mono text-[var(--muted)] leading-none mt-0.5">Alarms & Reminders</span>
        </div>
      </div>
      <button id="clear-all-btn" class="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--danger)] transition-colors cursor-pointer ${
        reminders.length === 0 ? "hidden" : ""
      }">
        Clear All
      </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <!-- Status Banner -->
      <div class="p-2.5 rounded-md bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-sm bg-[var(--surface-raised)] flex items-center justify-center text-[var(--primary)]">
            <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div>
            <div class="font-bold text-[11px] text-[var(--text)]">Chrome Notifications</div>
            <div class="text-[10px] text-[var(--muted)]">Native background alerts active</div>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-sm bg-[var(--fill-subtle-2)] font-mono text-[10px] text-[var(--primary)] font-bold">
          ${reminders.length} Scheduled
        </span>
      </div>

      <!-- Active Reminders Section -->
      <div class="flex items-center justify-between text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider px-0.5">
        <span>Active Reminders (${reminders.length})</span>
        <span class="font-mono text-[9px]">Phase 2 Feature</span>
      </div>

      <div id="reminders-list" class="flex flex-col gap-2">
        ${
          reminders.length === 0
            ? `<div class="p-6 text-center text-xs text-[var(--muted)] bg-[var(--surface)] rounded-md border border-[var(--border-subtle)]">
                No reminders scheduled yet. Browse contests on the feed and click <strong>Set Reminder</strong>.
              </div>`
            : ""
        }
      </div>
    </main>

    <!-- Persistent Back Footer -->
    <footer class="p-2 bg-[var(--surface)] border-t border-[var(--border-subtle)] shrink-0">
      <button id="footer-back-btn" class="w-full py-1.5 px-3 rounded-sm border border-[var(--border)] text-[var(--text)] text-[11px] font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer text-center">
        ← Back to Contests Feed
      </button>
    </footer>
  `;

  document.getElementById("back-btn")?.addEventListener("click", () => {
    window.location.href = "../popup/popup.html";
  });

  document.getElementById("footer-back-btn")?.addEventListener("click", () => {
    window.location.href = "../popup/popup.html";
  });
}

init();
