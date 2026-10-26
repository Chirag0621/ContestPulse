/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./popup/**/*.{html,js}",
    "./options/**/*.{html,js}",
    "./alarms/**/*.{html,js}",
    "./components/**/*.js",
    "./utils/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        cp: {
          bg: "var(--bg)",
          surface: "var(--surface)",
          raised: "var(--surface-raised)",
          glass: "var(--surface-glass)",
          inset: "var(--surface-inset)",
          border: "var(--border)",
          "border-subtle": "var(--border-subtle)",
          primary: "var(--primary)",
          "primary-on": "var(--primary-on)",
          text: "var(--text)",
          muted: "var(--muted)",
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "2px",
        md: "4px",
        shell: "6px",
      },
    },
  },
  plugins: [],
};
