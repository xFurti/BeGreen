# User profile

The Me screen follows the centre profile in the [Playora reference by Ryan Indra / Semusim Team](https://dribbble.com/shots/27457522-Playora-Sports-Mobile-App-Profile-Setting-Page): a photo cover, an overlapping avatar, centred identity, compact statistics and three content tabs. BeGreen keeps its existing Geist typography and green, white and black palette. The avatar has a white edge against the cover; the lime ring is removed.

- **Impact:** estimates from proofs with at least three friend verifications and milestones. Earned milestones have a green background; the others share the same neutral style. Status captions are omitted. An information icon beside the title opens the sources and counting explanation; there is no verified-count label or Agenda 2030 grid.
- **Memories:** a Monday-first calendar with month navigation, day filtering and photo cards that open the original proof. Each photo carries its date at the bottom left and, once verified by three friends, a green check at the top right. The action name stays below the photo, without pending-verification captions. Multiple proofs on one day remain accessible.
- **Map:** a preview of the selected proof’s approximate area, with a list for switching between saved places and opening each proof. OpenStreetMap supplies the map tiles and attribution. The external map opens from the location marker or the arrow.

The cover holds the settings and share icons. Settings include Edit profile, which saves name, username and role in the existing local persisted store. Usernames use 2–24 letters, digits or underscores; they are local demo identifiers, with no server-side uniqueness check. Settings also contain the explanation audience, guide, sources, Leaf and a confirmed reset of local demo data.

The profile header displays the name and role without an @username tag. All three profile tabs omit the BeGreen slogan footer.

New proofs save coordinates rounded to two decimal places (roughly 1 km) only when the existing Share area control is enabled. Historical posts without coordinates stay in Memories; the map does not infer coordinates from a city name or the user’s current location. New demo histories include the demo city coordinates. A tile loading failure keeps the place list available and offers a retry. The map is a static area preview; use OpenStreetMap for pan and zoom.

The forest cover is the existing bundled `assets/demo/forest.jpg`. Profile and social data remain local prototype data.

Verification:

```bash
npm run verify
node --test tests/profile.test.cjs
```

The targeted tests cover profile input validation, leap years and calendar boundaries, multiple proofs per day, missing/invalid coordinates, tile coverage and date-line wrapping.
