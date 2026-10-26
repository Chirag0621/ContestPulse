# ContestPulse

Manifest V3 Chrome extension that tracks Codeforces, CodeChef, LeetCode and AtCoder contests and sends reminders.

## Setup

```bash
npm install
npm run build:css      # generates assets/styles.css (use watch:css while developing)
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.

## Next steps

1. Implement the four providers in `providers/` (verify data sources first).
2. Finish `filterContests` and `reconcileAlarms` in `services/`.
3. Build UI in `components/` and wire up `popup/`, `options/`, `alarms/`.
4. Replace placeholder icons in `icons/`; add logos to `assets/logos/`.
