# BeGreen integration QA — 23 October 2026

Application commit: c4fc5686ba4b6cc0c2cbdb0970b5200f066ea6c0 (PR #25, includes #10/#40/#41/#48/#49/#50/#51/#57 and main's upload fix #58).

Real Chromium screenshots of Expo web at 390×844, plus 320×712 and 1440×1000. Local fixture users QA User and QA Peer; the fixture contains a Refill challenge for the current day. Sensor.Community, GBIF and iNaturalist are mocked for repeatable screenshots. Capture uses the application's bundled demo photo and five-second clip. No production writes or native device tests.

- me-before-theme.png: pre-theme profile on the integrated #10 branch, light mode, same English fixture and viewport.
- me-dark-en.png / me-dark-it.png: dark profile (the Italian screenshot is delivered separately locally).
- settings-dark-it.png / settings-dark-en.png / settings-dark-320.png / settings-dark-1440.png: theme and explanation controls.
- feed-dark.png / pulse-dark.png / drop-dark.png: final dark feed and sheets.
- capture-ring-dark.png / capture-review-dark.png / capture-done-dark.png: demo capture ring, +20 Refill review, +20 celebration.
- flag-before.png / flag-after.png: #10 confirmation and persisted disabled state.
- flag-dark.png: same flow with dark mode.

Runtime checks passed: Light/Dark changes in place; System reacts to dark/light emulation without reload; explicit theme survives reload; Italian/English switch; explanation preference; navigation across main screens and sheets; flag cancel/confirm/disabled/reload/own-post exclusion; Drop tag routing; Refill reward +20, persisted challenge and second-proof +10. No JavaScript page errors in these completed flows. `aria-selected` checked on web theme options.

Node 24: npm run verify passes (77 tests). Expo install --check reports compatible dependencies; Expo Doctor passes 20/20 checks. Native config introspection includes automatic appearance for iOS and Android. iOS/Android status bars, native sheets and physical camera remain untested.
