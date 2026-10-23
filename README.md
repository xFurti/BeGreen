# BeGreen

**Proof, not promises.** A social app where you snap a green act, film 5 seconds of proof, and your friends verify it. All of it runs on live local environmental data.

BeGreen is built for the brief **“2. La mia sostenibilità”**: it takes sustainability down to the size of one person, one class, one association or one Comune. It starts from what's happening in your area and links *knowing* to *doing*.

---

## The core loop

1. **The Drop:** each day everyone in a Comune gets the same challenge, built from that Comune's live data and stored on the shared backend, so the whole town sees one mission and one proof each counts for it. Example: air is “Poor” → *Leave the car. Own the street.* Unlike BeReal there's no random alarm. You post it when you actually do it.
2. **Snap the thing:** a photo of the bike, the bin, the bottle or the plant.
3. **Prove it:** a 5-second video of the act itself. It plays inside the photo, in the inset tile.
4. **People verify:** people allowed to see your proof in your city or chosen group check it; 3 verifications turn it into a *Verified* proof. You can't verify your own.
5. **Post yours to see theirs:** today's feed stays blurred until you've done your own green act.

## Screens

| Screen | What it does |
| --- | --- |
| **Onboarding** | «Plant your seed»: your seed, a buddy with a face, asks one thing at a time. Where to plant it (your position or a search, without leaving the screen), then the live ground of that Comune (air, rain or dry days, soil moisture, each with its source) with the seed reacting to it, and today's Drop opening like a bud. Then your name, your @ (checked while you type, with free alternatives when it's taken), your role and the kind of seed (sunflower, oak, lavender, poppy, tomato, fir). A card shows how friends will see you; hold to plant creates an anonymous account (no email, no password). A short welcome («you're seed no. X in {Comune}») explains why the camera is needed before the phone asks, and leads to the first proof. Reduce Motion turns the animations into fades, and hold-to-plant becomes a tap for screen readers. |
| **Comune** | Search any Italian Comune (or use your location to suggest it). Pulse, the Drop, the feed and Community's territory preview follow this choice. |
| **Feed** | One daily card: today's Drop, a countdown, your streak, local participants and your own proof of the day (or a nudge to post one), then an entry to Community. Lenses: *All / Friends / Groups / your Comune*. Group proofs appear only in their chosen group, not automatically in every group the author belongs to. Example proofs remain marked **DEMO**, never verifiable or counted. |
| **Capture** | Photo → 2–5 second proof → review. Choose your Comune, Everyone or one group; a missing group blocks submission rather than publishing elsewhere. The group’s public/private visibility is explained. Completion celebrates Seeds, streak, contribution and Agenda 2030 goals, not rank or overtakes. Pending uploads keep their selected destination and are identified as local. |
| **Pulse** | The same daily card as the feed, then live local data for air, weather, water, soil, nature and protected areas. Every card has a **source badge** and an **“Explain it for: Me / My class / Comune”** switch, plus a button that turns the insight into an action. |
| **Leaf** | An assistant that answers questions about your area using only the data you can see, and cites its sources. It adapts to the audience. |
| **How we know** | Explains each kind of source (official, model, citizen science, open map, community): what it is, what it's good for, where to be careful. It also flags data whose access or terms still need checking. |
| **Community** | *Your city* first: your selected Comune shown once, big, with its real map and recent local contributions, then *Your groups*. Group rows show visibility and membership, not rank. Create a group or join with a code; search finds any Italian city. |
| **Community map** | The real OpenStreetMap map of the area (streets, places, rivers, railway), pannable and zoomable to street level, with BeGreen pins in seven layers: discover, repair & reuse, gardens & groups, swap & share, events & challenges, reports, moments. Search that understands questions (“Dove posso riparare una bici?”, “eventi questo weekend”) and finds real streets and places in the area, layer chips, filters (distance, upcoming events, most saved, new this week, open reports, from friends, family-friendly once verified), a legend, clustering, and a card for the pin you tap with directions. |
| **Add a place** | Photo-first, five steps: what (discovery, useful place, event, challenge/experience, report, moment), photo (optional), a few words and the category (for events: date as DD/MM/YYYY, 24-hour time as HH:MM and optional duration in minutes; fields can be cleared, and All day hides time/duration), where (your location only suggests it; exact or ~200 m; a moment can stay off the map), who sees it (everyone or members only). An exact public spot needs an explicit confirmation. |
| **Place page** | Photo, category, status (verified / from the community / to verify / open or resolved / upcoming or ended), who added it and when, last update, address and directions, love, save, share, “I'm going” for events, the proofs taken there (and “add a proof here”), comments, and the trust tools: report out of date / wrong / not OK, propose a correction, “this looks fixed”, block the author; authors mark resolved/done or “still right”; moderators verify, hide, delete. |
| **Community page** | A **city** leads with its map, this month's impact as one big number (kg CO₂e avoided, acts, items), local experiences, prompts, challenges and proofs, plus a link to its weekly leaderboard. A **group** shows its weekly leaderboard right on the page (top five and your row), the same big impact number, challenges, its impact report, preserved legacy goal, invitation and members (each with a Follow button). Private group content requires membership. |
| **Friends** | Follow anyone: the accounts you follow are your friends. Profiles (tap a name on any proof) show Follow / Following / Follow back, following and followers counts, and a photo grid of their proofs. Your profile tab shows your counts and a *Photos* tab; *Friends* lists who you follow and who follows you, searches people by name or @username and suggests people from your groups and Comune. Friends' proofs come into the feed (*Friends* lens) and the community map's "from friends" filter. Stored in `follows` (`supabase/migrations/20261029000000_follows.sql`): anyone signed in can read it, only you can add or remove your own follows. |
| **Challenges** | Collective challenges with a goal and a deadline, from starter ideas (discover 5 places, reuse, organise a swap, a second-hand shop, clean-up, a neglected area, a walk with a discovery) or your own. Contribute with a place or just “I did it”; progress, contributors (a thank-you list, not a leaderboard) and a result summary. Plus the **daily prompt**: one optional question for everyone, no streak. |
| **Weekly leaderboard** | Shown inline on a group's page; a secondary screen for cities and for a group's full board. No app-wide rank in Feed, Me or completion. Uses the most recent loaded proofs from the last 7 days; the UI labels it as a sample. |
| **How to** | For people who don't know where to start: a searchable **“Where does it go?”** lookup (pizza box, Tetra Pak, receipts…), the six Italian waste streams, and three steps for every act. |
| **Old squad links** | `/squad/:id` redirects to its migrated group, `/new-squad` to group creation and `/league` to Community. Historical screen implementations are retained outside the router in `components/legacy-*`; they are not imported by the app. |
| **Me** | Your seed's plant and how far the next stage is (seed → sprout at the first Seeds → seedling 60 → plant 200 → bloom 500; it never shrinks, it only looks thirsty when the streak breaks), streak, Seeds, verified count, following / followers, **Agenda 2030** grid, estimated impact, a Photos grid of your proofs, a Memories calendar, badges, saved places, contributions and settings (where you can change your seed). |

### Your seed

The plant is everyone's avatar when there's no photo: in the feed, community leaderboards, posts and member pages. The species is stored in `profiles.seed`; lifetime Seeds come from the `profile_seeds` database function (the stage is never written by the app). The first time something matters, the seed explains it once: today's Drop, peer verification, Pulse and the first Agenda 2030 goal. When a proof makes it grow, the celebration shows the new stage.

## How the brief is covered

| Brief requirement | Where it lives |
| --- | --- |
| Personal / class / association / Comune scale | Roles in onboarding, Squads by type, the three explanation modes, the Community Report |
| Agenda 2030 | Every act and every Pulse card is tagged with the UN Sustainable Development Goals it touches; your profile and the Community Report count goals covered |
| Starts from the local environment | Pulse + the Drop, from the Comune the user picks (GPS only suggests it) |
| Links knowledge to concrete action | Every Pulse card ends in an action button; the Drop turns today's worst indicator into today's mission |
| Air, water, soil, biodiversity, consumption, mobility, community | Pulse cards (air, water, soil, nature, protected areas) and the 10 action types, each tagged with its areas; the report shows how many of the 7 a squad covers |
| Protected areas, species, nature observations | iNaturalist species list with photos and attribution; OpenStreetMap protected areas nearby |
| Air quality, weather, local climate | CAMS European AQI with a 24 h chart, pollutant breakdown and dominant pollutant; current weather |
| Soil and landscape changes | Top-soil moisture and its trend; class and Comune text points to land-sealing and land-use cartography (access marked “to verify”) |
| Individual behaviour and group activity | Personal proofs, squad quests, Community challenges and what we did together, Community Report |
| AI to understand measurements and documents | Leaf turns raw numbers into plain language and plugs into an LLM backend (see below) |
| Answers that cite sources | Every Leaf answer carries source badges; every Pulse card carries its source |
| Interpreting images | Proof photo + video verified by peers today; the backend contract covers image interpretation (species ID, proof checks) |
| Explanations adapted to the reader | Me / My class / Comune on Pulse, in Leaf and in the defaults set from your role |
| Sources aren't equivalent | Five source kinds, colour-coded everywhere; each data card's text names its limits (e.g. “model, ~10 km grid, not an ARPA station”) |
| Some access and terms still to verify | The `verified: false` flag in `src/data/sources.ts` shows a ⚠︎ in *How we know* (ISPRA Catasto Rifiuti reuse licence) |

## Data sources (no API keys)

| Domain | Source | Kind |
| --- | --- | --- |
| Air quality (EAQI, PM2.5, PM10, NO₂, O₃, 24 h forecast) | Copernicus CAMS via Open-Meteo | Model |
| Weather, rain over the past 7 days and next 3, soil moisture | Open-Meteo | Model |
| Species seen within 10 km in the last 30 days (research grade) | iNaturalist API | Citizen science |
| Protected areas and nature reserves within 25 km | OpenStreetMap via Overpass | Open map |
| Citizen PM2.5 sensors within 10 km (median of the latest readings) | Sensor.Community | Citizen science |
| Species recorded within 5 km in the last 5 years | GBIF API | Citizen science |
| Italian Comuni (search, coordinates) | Open-Meteo geocoding (GeoNames) | Open map |
| PM10 annual mean and exceedance days per station (2025), emissions per comune (INEMAR 2019) | ARPAV open data (bundled CSV extract) | Official |
| Land sealed per comune (2024) and separate collection per comune (2024) | ISPRA/SNPA, ISPRA Catasto Rifiuti (bundled extract) | Official |
| Acts, quests, reports | BeGreen (aggregated, anonymised) | Community |

Official per-comune data is a bundled extract for the Province of Vicenza, matched to the Comune you picked by name (or, failing that, by the nearest centroid); datasets, joins and thresholds are documented in `docs/dati-comune.md`.

Each source loads separately, so one outage never empties the Pulse. If everything is offline, the app shows clearly labelled sample data, and a Drop built from sample data is never saved as the Comune's challenge.

## Shared backend (Supabase)

Profiles, posts, verifications, reactions, comments, communities, group progress and daily challenges live on [Supabase](https://supabase.com) (Postgres + Storage + Realtime). The schema and row level security rules are in [`supabase/migrations`](supabase/migrations); [`supabase/tests`](supabase/tests) checks them on an in-memory Postgres as part of `npm test`.

- **Accounts** are anonymous Supabase users with a public name and handle. Every rule is enforced in the database: you write only your own rows, can't verify your own proof, can't claim the same Drop twice, and squad points are added by a trigger, not by the app.
- **The Drop** is one row per Comune per day (`<comune id>:<date>`). The first phone to open the app that day builds it from the Comune's live data and inserts it; everyone else reads the same row.
- **Media** use the private `proofs` bucket, each user in their own folder. The app stores durable object references and reads authorized media through five-minute signed URLs, including files previously referenced by public URLs. Photos are JPEGs up to 1280 px, clips are 480p when supported, library clips over ~1.5 MB are refused, and native uploads stream from disk. Demo captures reference bundled assets.
- **Live updates:** the feed refreshes when someone posts, verifies, reacts or comments.

Without the two environment variables below the app still runs, on this phone only: your proofs stay local and the feed shows the example proofs for today's Drop.

## Community

BeGreen doesn't ask people to already care about sustainability: the Community tab is where people, groups and places meet. It links **people** (posts, reactions, shared challenges), **groups** (classes, associations, neighbourhoods, squads) and the **territory** (a map the community builds).

- **Two kinds of community.** A **city** is a real place: Alto Vicentino is bundled and seeded, and any Italian Comune can be found by name (Open-Meteo geocoding) and joined; the first person to join starts it. A **group** is personal: friends, a class, a crew. Creating one takes a name and private/public; it gets an invite code, any member can share it, and the code alone is enough to join (`join_by_code`). Private groups show only their name until you join. The founder is the first moderator.
- **Leaderboards** are secondary. A group counts only explicitly shared group proofs, including migrated squad proofs; a city excludes reserved group proofs. Seeds and personal milestones remain independent of rank. The board is computed from downloaded proofs, not a complete server aggregate.
- **The map is real**: OpenStreetMap's standard tiles (© OpenStreetMap contributors, ODbL) in Web Mercator, with pins positioned by the same projection (`src/services/geo.ts`), and street/place search through Photon (komoot), limited to the community's area. Both are free and keyless for light use; a production build should swap `TILE_URL` in `community-map.tsx` for a keyed tile provider.
- **Trust and privacy**: verified places are distinguished from community additions; two “out of date / wrong” flags mark a place *to verify* (the author's edit clears it), three “not OK” flags hide it until a moderator checks, two “looks fixed” flags resolve a report. Flags are private to moderators. Nobody's real-time position is shown; a precise public spot needs explicit confirmation, and any spot can be shared as approximate (~200 m). Blocking hides someone's places, posts and comments. Last update and verification dates are shown on every place.
- **Event dates**: timed events require a valid date and start time; duration is optional (1–1440 minutes). All-day events need only a date and are stored as a full local calendar day in the existing start/end timestamps, including daylight-saving days. Their summary and place page show “All day” rather than hours.
- **Empty and quiet states**: no fake places, not even examples: the map is real, so only real pins go on it. An empty city says so and offers to add the first place. Location unavailable or denied → search a street or move the map.
- All of it lives in `supabase/migrations/20261025000000_community.sql` (tables, RLS, the flag trigger, join/create/verify functions) and `20261026000000_community_groups.sql` (the `friends` kind, codes for every group, `join_by_code`), and is covered by `supabase/tests`. Without a backend everything works on the phone only.

### Migrating existing squads to groups

`20261028000000_unified_groups.sql` copies existing squads into private groups with stable `squad:<uuid>` IDs, preserves memberships and join dates, and links existing posts without recreating their IDs or interactions. It retains the old tables, quest progress, points and existing monthly totals. New monthly totals live in `group_progress.months`; months that the old system already discarded cannot be reconstructed by this migration.

Old invite codes remain valid aliases. If an old code collides with another group's code, joining asks the person to select the intended group; it never silently chooses one. Existing creators who already left a squad are not automatically re-enrolled. Device-only squads migrate once into the local Community store, without resetting the profile or proof history.

The migration protects group posts and their comments, reactions, verifications and media. Group membership, not legacy squad membership, controls access. Leaving clears cached group content and media authorization; the author retains their own proofs. Signed URLs already issued remain valid until expiry, and previously downloaded files cannot be revoked.

**Coordinated rollout required:** test against a disposable copy first, then apply the migration and distribute the matching app together after human approval. The bucket becomes private, so old app versions that only use public media URLs are not compatible. No storage objects are moved or deleted. Existing public CDN copies may outlive the database change; this does not retroactively make previously shared media secret. The automated tests exercise Postgres/RLS through PGlite, not Supabase Storage's HTTP/CDN behavior. Do not apply this migration to the live backend merely to preview the UI.

Local visual demo: run `EXPO_NO_DOTENV=1 npm run web -- --port 8092`, finish onboarding, open Community, explore the city, create a private group, and share a demo proof explicitly into it. Check that the proof appears in that group, that the leaderboard requires a separate action, and that `/league` redirects to Community.

## The AI layer (Leaf)

`src/services/leaf.ts` has two modes:

Leaf opens on one line about today in your Comune (what to keep an eye on, or that nothing is alarming), today's numbers as chips and up to three questions picked from the data (a problem comes first). The chip at the top shows the place and when the data was updated, and opens the Comune page. Each question becomes a card: the question as caption, then a verdict, a short explanation, the numbers as chips, its sources (tap for what they are) and whether it is a guided or an AI answer. *Explained for* above the composer chooses Me, My class or the Comune for the next questions; it starts from your profile's choice but does not change Pulse or Me. Under the latest answer, chips re-ask it for another audience or suggest a next question; past answers never rewrite themselves.

- **Grounded local engine (default):** answers by recognising the question's intent, using only the live Pulse numbers. It never invents a value and always cites sources. It works offline.
- **AI backend:** set `EXPO_PUBLIC_LEAF_ENDPOINT`. The app sends `POST { question, audience, language, pulse, insights }` (`language` is `it` or `en`) and expects `{ text, cites: SourceId[] }`, optionally with `headline` (the verdict shown in bold), `facts: { label, value, unit?, level? }[]` (number chips) and `followUps: string[]` (up to two next questions); unknown sources and malformed fields are dropped. That server is where a language model reads documents, interprets proof images, identifies species and rewrites answers for the audience. **Model keys stay on the server, never in the app.** If the backend fails or ignores `language`, the app falls back to the local engine, which answers in the active language.

## Run it

```bash
npm install
npx expo start          # press i for the iOS simulator, or scan the QR code with Expo Go
```

The app runs in **Expo Go**, with a static compatibility preview in the profile map. The interactive native profile map uses **Expo Maps** and requires a new development build (Apple Maps on iOS; Google Maps on Android, with a Maps SDK key configured for that build). Native photo maps use iOS 18 or later; older iOS versions and unconfigured Android builds use the tile preview. Web uses an interactive OpenStreetMap preview. On a simulator (which has no camera), the capture screen offers **library** and **demo** capture so you can try the whole flow. See [docs/profile.md](docs/profile.md) for map setup and area-history limits.

To share the feed between phones, connect a Supabase project:

1. Create a project (or run `eas integrations:supabase:connect`), then in **Authentication → Sign In / Providers** turn on **Allow anonymous sign-ins**.
2. Apply the schema: `npx supabase link --project-ref <ref>` and `npx supabase db push`, or paste the migration into the SQL editor.
3. Copy `.env.example` to `.env.local` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). Both are public; never put a secret key in the app.
4. Restart `npx expo start`. Two phones (or a browser and a private window) share the Drop, the feed and their joined communities.

## Language

The interface is Italian or English. On first launch BeGreen uses Italian if the device language is Italian and English otherwise. A switch on onboarding (beside Skip) and on Me changes it immediately, keeps the current screen, and survives a restart. Signing out keeps the chosen language and returns to onboarding. Captions, comments and names people typed stay as they wrote them. Drop, Pulse explanations and Leaf’s local answers follow the active language and keep the same measured numbers: the shared daily challenge stores its readings, and every phone writes its title and text in its own language.

```bash
npm run typecheck
npm run lint
```

## Project structure

```
src/
  app/                    Expo Router routes (screens only)
    (tabs)/               Feed · Pulse · Community · Me + custom tab bar with the shutter button
    community/[id].tsx    Community page: territory or shared group activity, goals and impact
    community-ranking.tsx Secondary weekly leaderboard
    map/[id].tsx          Full-screen community map
    spot/[id].tsx         A place or experience: info, trust tools, proofs, comments
    add-spot.tsx          Add to the map: what → photo → words → where → who sees it
    communities.tsx       Find a city · new-community.tsx New group → invite · join.tsx Join with code
    new-challenge.tsx flag-spot.tsx saved.tsx member/[id].tsx league.tsx
    capture.tsx           Snap → Prove → Review → Celebrate
    post/[id].tsx         Post detail, verifiers, comments, flagging
    squad/[id].tsx        Compatibility redirect to the migrated group
    guide.tsx             How-to: waste lookup, bins, steps per act
    comune.tsx            Comune search / pick
    drop.tsx leaf.tsx sources.tsx new-squad.tsx onboarding.tsx
  components/             UI kit (ui.tsx), icon, proof media, post card, drop card, tab bar
  data/                   Actions (impact, SDGs, how-to, caption ideas), UN goals, waste guide, sources, demo media + example proofs, types
  services/               env (live APIs), interpret (audience-aware text), drop, challenge (shared daily Drop), comuni,
                          supabase (client + anonymous session), social (feed, uploads, verify, squads), leaf, media
  hooks/                  use-pulse (Comune → live data → insights + today's Drop), use-social (sync + live updates)
  store/app-store.ts      Zustand store: local cache of the shared data, saved through the expo-sqlite localStorage polyfill
  store/community-store.ts  Communities, map places, saves, challenges, blocks (same pattern, its own persisted store)
  data/community.ts       Community model (city or group), map layers, starter challenges, daily prompts
  theme/tokens.ts         Colours, Geist font families, radii, type scale
supabase/                 Migrations (schema, RLS, trigger, bucket), their tests, local CLI config
assets/                   Icon, splash, demo photos (Unsplash), 5 s proof clips
```

## Design system

- **White, black and one living green.** White paper and black ink, with a brand green family in `theme/tokens.ts`: `forest` (deep canopy, for dark surfaces and green text), `leaf` (fills, icons, progress; at least 4.5:1 on white and mint), `lime` (new growth, accents on dark only) and `mint` (soft tints). Data keeps its own signal colours (air bands, source kinds, recording red).
- **Logo** from the BeGreen Brand Kit v1.0 in `components/logo.tsx`: the leaf "B" mark and the lockup, drawn as vectors in Canopy (`#152315`). App icon, Android adaptive icon and splash are Canopy on Proof Lime (`#C8E61A`). Never lime on white, never stretch, rotate or rearrange the lockup; minimum 88 px wide for the lockup, 16 px tall for the mark.
- **Nature motifs** in `components/nature.tsx`: a sprout for empty states, slowly drifting organic blobs and leaf-shaped corners on the Drop and Pulse cards, a switch that sprouts a leaf (after a [uiverse.io](https://uiverse.io/Creatlydev/white-vampirebat-27) toggle), leaves flying out when you verify a proof and leaf confetti on the celebration (after [React Bits](https://reactbits.dev) Click Spark and Aurora). They are decorative and hidden from screen readers.
- **Geist Medium** for headlines, tracked tight; Geist for body copy; **Geist Mono** for metadata, labels and numbers (`SDG 13`, `PROOF 0:05`, `09:42:15`).
- Editorial layout: hairline rules, numbered sections (`01`, `02`…), big tabular numbers.
- Deep green is reserved for moments that matter: the Drop, your own row in the league, the celebration, the shutter. The camera stays black.
- Haptics on every meaningful press; springs on entry; count-up numbers; a confetti burst when you post.
- **Agenda 2030** stays quiet: small mono `SDG n` tags on acts and data, one 17-cell grid on your profile.

## Honest limits of this prototype

- Accounts are anonymous and tied to the phone: signing out or reinstalling loses the account (your proofs stay on the feed). There are no friends or follows yet; the social unit is your Comune and your squads.
- The daily Drop is built by the first phone that opens the app in a Comune that day. The database checks its shape and date, not its numbers; a server-side job would make it tamper-proof.
- Moderation of proofs is still missing: “Flag proof” only asks for confirmation. Community places have flags, auto-hiding and moderators, but promoting someone to moderator (beyond a community's founder) is done in the database for now. Verifications are one per person but not yet checked against proximity or fraud patterns.
- Community leaderboards and Comune counts use downloaded proofs, not complete server-side aggregates. City queries load up to 120 recent proofs per source; group detail initially loads up to 200 proofs. Group impact totals are server-maintained.
- Impact figures are conservative estimates per act and are labelled that way everywhere.
- The community map's search for BeGreen places is a keyword and intent matcher, offline, Italian and English; it isn't a language model. Map tiles and street search need a connection and rely on free OpenStreetMap/Photon services meant for light use.
- Old squads are now groups. This needs the unified-groups migration and matching app; legacy clients are not supported after the private-media rollout.
- ARPA / ISPRA official data isn't wired in yet, because access and terms vary by region. It's listed as “to verify”.

See **[MARKETING.md](MARKETING.md)** for the go-to-market plan.

## Team workflow

1. Read [AGENTS.md](AGENTS.md); it applies to AI assistants too.
2. Track tasks and owners in [docs/team.md](docs/team.md); park new ideas in [docs/ideas.md](docs/ideas.md).
3. Branch from an up-to-date `main` and open a PR to `main`. `npm run verify` (typecheck, lint, workflow and database tests) must pass: it's the `Verify` CI check.
4. Get approval from a teammate before merge. If Pi CI review is configured, it runs on ready PRs and new commits by itself; comment `/PI review` on the PR only to repeat it without a push.

Hackathon track and rules: [`docs/traccia.md`](docs/traccia.md), [`docs/regolamento.md`](docs/regolamento.md). Default agent rules: [`AGENTS.md`](AGENTS.md). Optional skills in [`skills/`](skills/) (symlinked as `.agents/skills` / `.pi/skills`):

| For | Skill |
| --- | --- |
| Stay on the official FESAV track | [hackathon-track](skills/hackathon-track/SKILL.md) |
| Building a feature or fix | [hackathon-feature](skills/hackathon-feature/SKILL.md) |
| Review-only on a PR | [hackathon-review](skills/hackathon-review/SKILL.md) |
| Pitch, slides and demo (8 min) | [hackathon-pitch](skills/hackathon-pitch/SKILL.md) |

Out-of-track backlog: [`docs/ideas.md`](docs/ideas.md) or an Idea issue.

Pi review setup: [docs/github-setup.md](docs/github-setup.md). Decisions: [docs/decisions.md](docs/decisions.md). Pitch: [docs/presentation.md](docs/presentation.md).
