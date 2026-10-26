/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./popup/**/*.{html,js}",
    "./options/**/*.{html,js}",
    "./alarms/**/*.{html,js}",
    "./components/**/*.js",
  ],
  theme: { extend: {} },
  plugins: [],
};
