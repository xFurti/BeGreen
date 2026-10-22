# BeGreen

**Proof, not promises.** A social app where you snap a green act, film 5 seconds of proof, and your friends verify it. All of it runs on live local environmental data.

BeGreen is built for the brief **“2. La mia sostenibilità”**: it takes sustainability down to the size of one person, one class, one association or one Comune. It starts from what's happening in your area and links *knowing* to *doing*.

---

## The core loop

1. **The Drop:** each day every user in a city gets the same mission, generated from local data. Example: air is “Poor” → *Leave the car. Own the street.* Unlike BeReal there's no random alarm. You post it when you actually do it.
2. **Snap the thing:** a photo of the bike, the bin, the bottle or the plant.
3. **Prove it:** a 5-second video of the act itself. It plays inside the photo, in the inset tile.
4. **Friends verify:** 3 verifications turn a post into a *Verified* proof. Only verified proofs count toward streaks, squads and city stats.
5. **Post yours to see theirs:** today's friend feed stays blurred until you've done your own green act.

## Screens

| Screen | What it does |
| --- | --- |
| **Onboarding** | Four-slide story (Proof, not promises / Your city, decoded / Beat your friends. Save the planet. / 17 goals, one tiny act at a time), then name, role (Student · Teacher · Association · Comune), approximate location and an optional demo history. |
| **Feed** | Today's Drop with a live countdown to midnight, your post for today (or a streak-saver prompt), your rank in this week's friends race, and Friends / Squads / Nearby lenses. Proof clips autoplay as each post scrolls into view. Double-tap to react, verify, comment. |
| **Capture** | Full-screen camera with two steps: photo, then a 5-second recording with a progress ring. Then review: choose the act, write a caption (or tap a caption idea), pick who sees it (Friends / Squad / Everyone) and whether to show your area. The celebration shows Seeds, streak, who you just passed in the league, new Agenda 2030 goals and the feed unlock, with a share button. A **?** opens the how-to for the act. |
| **Pulse** | Live local data for air, weather, water, soil, nature and protected areas. Every card has a **source badge** and an **“Explain it for: Me / My class / Comune”** switch, plus a button that turns the insight into an action. |
| **Leaf** | An assistant that answers questions about your area using only the data you can see, and cites its sources. It adapts to the audience. |
| **How we know** | Explains each kind of source (official, model, citizen science, open map, community): what it is, what it's good for, where to be careful. It also flags data whose access or terms still need checking. |
| **League** | This week's friends race (podium, your gap to the next person, **nudges** for friends who haven't posted), your squads with weekly quests and join-by-code, and the city league between schools. |
| **How to** | For people who don't know where to start: a searchable **“Where does it go?”** lookup (pizza box, Tetra Pak, receipts…), the six Italian waste streams, and three steps for every act. |
| **Squad page** | Quest progress, invite code, and a **Community Report**: anonymised acts by type, estimated impact, which of the 7 areas are covered, today's local context. It can be shared with a school or Comune. |
| **Me** | Streak, Seeds, verified count, **Agenda 2030** grid (which of the 17 UN goals your proofs moved, plus days left to 2030), estimated impact, a Memories calendar, badges, settings. |
| **Caccia verde** | Unlocked after a post: 3 stops in Schio on water, energy, reuse and urban green, then the nature around you from live open data. Find a detail, the place tells its story with sources, a **“Lo sapevi?”** you can listen to, and an act to prove next. Extra Seeds. See below. |

## How the brief is covered

| Brief requirement | Where it lives |
| --- | --- |
| Personal / class / association / Comune scale | Roles in onboarding, Squads by type, the three explanation modes, the Community Report |
| Agenda 2030 | Every act and every Pulse card is tagged with the UN Sustainable Development Goals it touches; your profile and the Community Report count goals covered |
| Starts from the local environment | Pulse + the Drop, from the user's approximate (~1 km) location |
| Links knowledge to concrete action | Every Pulse card ends in an action button; the Drop turns today's worst indicator into today's mission; every Caccia verde stop points to an act and the hunt ends on the camera |
| Air, water, soil, biodiversity, consumption, mobility, community | Pulse cards (air, water, soil, nature, protected areas) and the 10 action types, each tagged with its areas; the report shows how many of the 7 a squad covers |
| Protected areas, species, nature observations | iNaturalist species list with photos and attribution; OpenStreetMap protected areas nearby; the Caccia verde's last stop turns them into a game |
| Air quality, weather, local climate | CAMS European AQI with a 24 h chart, pollutant breakdown and dominant pollutant; current weather |
| Soil and landscape changes | Top-soil moisture and its trend; class and Comune text points to land-sealing and land-use cartography (access marked “to verify”) |
| Individual behaviour and group activity | Personal proofs, squad quests, city league, Community Report |
| AI to understand measurements and documents | Leaf turns raw numbers into plain language and plugs into an LLM backend (see below) |
| Answers that cite sources | Every Leaf answer carries source badges; every Pulse card carries its source |
| Interpreting images | Proof photo + video verified by peers today; the backend contract covers image interpretation (species ID, proof checks) |
| Explanations adapted to the reader | Me / My class / Comune on Pulse, in Leaf and in the defaults set from your role |
| Sources aren't equivalent | Five source kinds, colour-coded everywhere; each data card's text names its limits (e.g. “model, ~10 km grid, not an ARPA station”) |
| Some access and terms still to verify | The `verified: false` flag in `src/data/sources.ts` shows a ⚠︎ in *How we know* (ARPA regional stations) |

## Data sources (live, no API keys)

| Domain | Source | Kind |
| --- | --- | --- |
| Air quality (EAQI, PM2.5, PM10, NO₂, O₃, 24 h forecast) | Copernicus CAMS via Open-Meteo | Model |
| Weather, rain over the past 7 days and next 3, soil moisture | Open-Meteo | Model |
| Species seen within 10 km in the last 30 days (research grade) | iNaturalist API | Citizen science |
| Protected areas and nature reserves within 25 km | OpenStreetMap via Overpass | Open map |
| Acts, quests, reports | BeGreen (aggregated, anonymised) | Community |

Each source loads separately, so one outage never empties the Pulse. If everything is offline, the app shows clearly labelled sample data.

## The AI layer (Leaf)

`src/services/leaf.ts` has two modes:

- **Grounded local engine (default):** answers by recognising the question's intent, using only the live Pulse numbers. It never invents a value and always cites sources. It works offline.
- **AI backend:** set `EXPO_PUBLIC_LEAF_ENDPOINT`. The app sends `POST { question, audience, pulse, insights }` and expects `{ text, cites: SourceId[] }`. That server is where a language model reads documents, interprets proof images, identifies species and rewrites answers for the audience. **Model keys stay on the server, never in the app.** If the backend fails, the app falls back to the local engine.

## Caccia verde (Le mura parlano)

The hunt from our *Le mura parlano* project, rebuilt for this brief: from the water that powered the town to the nature that lives around you. Content is in Italian.

1. **Unlock:** after posting, the celebration screen offers the hunt. The thread follows the act and sets the emphasis of the stories, the SDGs and the act suggested at the end: refill / save / car-free → **Acqua & energia** (SDG 6, 7, 15); sort / rewear / plate / pickup → **Riuso** (SDG 11, 12, 15); plant / spot / crew → **Verde & natura** (SDG 11, 15). A hunt in progress shows “Riprendi”.
2. **Route** (`src/services/quest/route.ts`), 4 stops:
   - **Roggia Maestra**: water as a common good and as energy (44 wheels in 1795, small hydro plants still running). Clue: the wash-house on the canal.
   - **Lanificio Conte**: electric light from the canal in 1883, restored hydro turbines, a water tank reused for heating and cooling, the factory turned into museum, homes and a square. Clue: the restored building; the on-site answer is what it hosts today.
   - **Giardino Jacquard**: a factory yard turned garden, urine reused for ammonia, local and exotic trees, replanting. Clue: the big trees; the answer is what was replanted.
   - **Natura intorno a te** (live, works anywhere): which species was observed most often within 10 km in the last 30 days (iNaturalist, research grade), then the numbers behind it and the nearest protected area (OpenStreetMap), each with its source, plus the citizen-science caveat. Clearly flagged sample data if the APIs don't answer.
3. **Clue:** a cropped photo + 2 hints. Check **on site** (a control question with an objective answer) or **remotely** (tap the detail on the full photo; after 3 misses it shows where it was). The nature stop is a pick among 3 nearby species, checked against the data. No model decides whether you found it.
4. **The place speaks:** first-person sentences, each with a numbered source chip (fact, source, exact quote). Lines without a source are marked **racconto** and can't contain dates, numbers or names. The pipeline is the same as for an LLM (validation → grounding check → 1 retry → hand-written fallback); the demo uses a fixture narrator (`src/services/quest/narrate.ts`). At the nature stop every number is read from the open data (`src/services/quest/nature.ts`).
5. **Lo sapevi?:** a curiosity written for under-26s, backed by facts of that place, with **Ascolta** (on-device text-to-speech via `expo-speech`, `it-IT`).
6. **Fai la tua parte:** every stop points to a BeGreen act (refill, save water / energy, plant, spot a species), and the end screen opens the camera on the act of your thread: knowing → doing → proving.
7. **Seeds:** +15 per stop (−5 per hint, minimum 5), +25 for finishing a thread. Each stop and thread pays out once. Quest Seeds count in Me and in the weekly league.

Data lives in `src/data/quest/` (places, links, clues, facts, sources). Every `quote` must appear **word for word** in the saved Wikipedia revision (`src/data/quest/snapshots/`), and `tests/quest-data.test.ts` fails otherwise. Photos: Wikimedia Commons, CC BY-SA, credited in the app; species photos from iNaturalist with their authors' licence.

To check on site before a live demo: that the shelter on the Roggia is the wash-house at via Fogazzaro / via Manin, and that the Roggia's coordinates are only indicative.

## Run it

```bash
npm install
npx expo start          # press i for the iOS simulator, or scan the QR code with Expo Go
```

The app runs in **Expo Go**: it uses no custom native code. On a simulator (which has no camera), the capture screen offers **library** and **demo** capture so you can try the whole flow.

```bash
npm run verify          # typecheck + lint + tests (review workflow and Caccia verde)
```

## Project structure

```
src/
  app/                    Expo Router routes (screens only)
    (tabs)/               Feed · Pulse · League · Me + custom tab bar with the shutter button
    capture.tsx           Snap → Prove → Review → Celebrate (→ Caccia verde)
    quest.tsx             Caccia verde: map → clue → the place speaks → thread → … → nature around you → end
    post/[id].tsx         Post detail, verifiers, comments, flagging
    squad/[id].tsx        Quest + Community Report
    guide.tsx             How-to: waste lookup, bins, steps per act
    drop.tsx leaf.tsx sources.tsx new-squad.tsx onboarding.tsx
  components/             UI kit (ui.tsx), icon, proof media, post card, drop card, tab bar
  data/                   Actions (impact, SDGs, how-to, caption ideas), UN goals, waste guide, sources, seed content, types
  services/               env (live APIs), interpret (audience-aware text), drop, leaf, media, quest/ (path, verify, grounding, narrate, seeds)
  hooks/use-pulse.ts      Location → live data → insights + today's Drop
  store/app-store.ts      Zustand store, saved through the expo-sqlite localStorage polyfill
  theme/tokens.ts         Colours, Geist font families, radii, type scale
assets/                   Icon, splash, demo photos (Unsplash), avatars, 5 s proof clips
```

## Design system

- **White, black and one living green.** White paper and black ink, with a brand green family in `theme/tokens.ts`: `forest` (deep canopy, for dark surfaces and green text), `leaf` (fills, icons, progress), `lime` (new growth, accents on dark only) and `mint` (soft tints). Data keeps its own signal colours (air bands, source kinds, recording red).
- **Nature motifs** in `components/nature.tsx`: the leaf on the wordmark, a sprout for empty states, slowly drifting organic blobs and leaf-shaped corners on the Drop and Pulse cards, a switch that sprouts a leaf (after a [uiverse.io](https://uiverse.io/Creatlydev/white-vampirebat-27) toggle), leaves flying out when you verify a proof and leaf confetti on the celebration (after [React Bits](https://reactbits.dev) Click Spark and Aurora). They are decorative and hidden from screen readers.
- **Geist Medium** for the wordmark and headlines, tracked tight; Geist for body copy; **Geist Mono** for metadata, labels and numbers (`SDG 13`, `PROOF 0:05`, `09:42:15`).
- Editorial layout: hairline rules, numbered sections (`01`, `02`…), big tabular numbers.
- Deep green is reserved for moments that matter: the Drop, your own row in the league, the celebration, the shutter. The camera stays black.
- Haptics on every meaningful press; springs on entry; count-up numbers; a confetti burst when you post.
- **Agenda 2030** stays quiet: small mono `SDG n` tags on acts and data, one 17-cell grid on your profile.

## Honest limits of this prototype

- Social data (friends, posts, squads, league) is seeded demo content kept on the device; production needs a backend with auth, moderation and anti-fraud.
- Impact figures are conservative estimates per act and are labelled that way everywhere.
- ARPA / ISPRA official data isn't wired in yet, because access and terms vary by region. It's listed as “to verify”.
- The first 3 Caccia verde stops are in Schio (elsewhere you play them remotely); the nature stop works anywhere. The narrator is a fixture, not a live model, and species common names come from iNaturalist in English.

See **[MARKETING.md](MARKETING.md)** for the go-to-market plan.

## Team workflow

1. Read [AGENTS.md](AGENTS.md); it applies to AI assistants too.
2. Track tasks and owners in [docs/team.md](docs/team.md); park new ideas in [docs/ideas.md](docs/ideas.md).
3. Branch from an up-to-date `main` and open a PR to `main`. `npm run verify` (typecheck, lint, workflow tests) must pass: it's the `Verify` CI check.
4. Comment `/PI review` on the PR for an AI review, fix what it finds, then get approval from a teammate.

Shared agent skills live in [`skills/`](skills/) (linked from `.agents/skills` for Codex and `.pi/skills` for Pi):

| For | Skill |
| --- | --- |
| Comparing ideas and scoping the MVP | [hackathon-ideas](skills/hackathon-ideas/SKILL.md) |
| Building a feature or fix | [hackathon-feature](skills/hackathon-feature/SKILL.md) |
| Reviewing a PR | [hackathon-review](skills/hackathon-review/SKILL.md) |
| Pitch, slides and demo | [hackathon-pitch](skills/hackathon-pitch/SKILL.md) |

Pi review setup (secrets, variables, `main` protection): [docs/github-setup.md](docs/github-setup.md). Decisions: [docs/decisions.md](docs/decisions.md). Pitch and demo: [docs/presentation.md](docs/presentation.md).
