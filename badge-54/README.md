# PR #54 — Badge details QA

Application commit: 8b7b4f2 (fix/45-badge-details), integrated with main f792137.

Actual Chromium screenshots at 390×844 and 320×568. Local fixtures: QA User owns one refill proof, two car-free proofs and one plant observation. The initial title is Spotter; Car-free ×5 is locked at 2/5. Sensor.Community, GBIF and iNaturalist are mocked. No production writes.

- locked-dark-it.png: requirement and 2/5 progress, no title action.
- earned-dark-it.png: First proof earned, explicit use-title action.
- equipped-dark-it.png: explicit remove-title action.
- locked-light-en.png: same locked badge in English, light mode.
- locked-light-320.png: narrow screen, lower content reached by scrolling.

Verified in the browser: opening a badge never changes the title; locked badges have no equip action; using First proof replaces Spotter; removal clears the title; equipping Spotter survives reload. X, Escape and tapping the backdrop dismiss without changing the title. Keyboard focus enters the sheet and stays inside when tabbing. Web progressbar exposes min=0, max=5, now=2. No JavaScript page errors or console errors in the final completed flow.

npm run verify passes on Node 24: typecheck, lint and 77 tests. Physical iOS/Android devices, VoiceOver/TalkBack and native dismissal were not tested. Native initial accessibility focus uses the React Native AccessibilityInfo.sendAccessibilityEvent API.

Before images of this PR against current main were unavailable because the initial BadgeSheet imported removed static C/T theme exports and failed typecheck. These screenshots show the corrected application; no generated mockups.
