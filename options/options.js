// Settings / Options Controller
// Implements Design Spec §6.3.

import { getSettings, saveSettings } from "../services/storageService.js";

async function init() {
  const app = document.getElementById("app");
  if (!app) return;

  const settings = await getSettings();

  app.innerHTML = `
    <!-- Sticky Settings Header -->
    <header class="h-12 px-3 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-glass)] backdrop-blur-md sticky top-0 z-20 select-none">
      <div class="flex items-center gap-2">
        <button id="back-btn" class="w-7 h-7 rounded-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer" aria-label="Back to Contests Feed">
          <svg class="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="flex flex-col">
          <h1 class="text-xs font-bold text-[var(--text)] leading-none">ContestPulse</h1>
          <span class="text-[10px] uppercase font-semibold tracking-wider text-[var(--muted)] leading-none mt-0.5">Settings</span>
        </div>
      </div>
      <span class="font-mono text-[10px] text-[var(--muted)]">v0.1.0</span>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <!-- Section: Appearance -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider px-0.5">Appearance</span>
        <div class="p-2.5 rounded-md bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs">
          <span class="text-[11px] font-medium text-[var(--text)]">Theme</span>
          <div class="flex items-center gap-1 bg-[var(--bg)] p-0.5 rounded-sm border border-[var(--border-subtle)] text-[10px]">
            <button class="px-2 py-0.5 rounded-sm font-semibold bg-[var(--primary)] text-[var(--primary-on)]">Dark</button>
            <button class="px-2 py-0.5 rounded-sm text-[var(--muted)] hover:text-[var(--text)]">Light</button>
            <button class="px-2 py-0.5 rounded-sm text-[var(--muted)] hover:text-[var(--text)]">System</button>
          </div>
        </div>
      </div>

      <!-- Section: Platforms -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider px-0.5">Active Platforms</span>
        <div class="p-2.5 rounded-md bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-2 text-xs">
          ${["Codeforces", "LeetCode", "CodeChef", "AtCoder"]
            .map(
              (p) => `
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-medium text-[var(--text)]">${p}</span>
              <span class="text-[10px] font-bold text-[var(--success)]">ENABLED</span>
            </div>`,
            )
            .join("")}
        </div>
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
