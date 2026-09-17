# Lacunarium — local update, September 16, 2026

This is a source-code update prepared from the supplied ZIP. Nothing has been published, no live records have been deleted, and your Google account has not been changed. Your original ZIP is unchanged.

## Mobile/tablet review update

Compact screens now show taller storefronts with neighboring room edges. Only the floor number remains below; navigation is by swipe and rooms remain tappable. A sideways swipe rotates the floor where it starts, one room per gesture. Each floor remembers its own rotation. Vertical gestures snap between floors (drag down to bring the upper floor into view; drag up to descend). Desktop compass and proportions are retained. Browser checks passed for independent upper/lower floor rotation, snapping, home reset, hidden touch buttons and horizontal overflow at phone/tablet sizes. Build and lint passed. Physical-device testing remains pending.

Deployment recommendation: clone the existing Base44 app, apply the updated code/functions/schemas to that copy, and verify Google sign-in, owner access and save/reset behavior before making it the primary site. Keep the original as a backup. A source ZIP alone is not evidence that hosted configuration/data/security have been migrated. Base44 documents cloning for major changes at https://docs.base44.com/Getting-Started/Quick-start-guide .

## Desktop review update

The L now returns to floor 1, room 1. The menu button, corner labels, Enter Room button and normal-view directory/help text are removed. Four compass arrows surround the floor number. A white circular 3D floor extends to both viewport edges and pillars terminate on it. The scrolling ticker includes coming-soon messages and medals for each game’s top three scores. Desktop, mobile and tablet layout/navigation checks and the production build passed. These remain local changes, not published.

## What changed

- Lacunarium is the site name throughout the application. Piece & Quiet is the island game's name and `/piece-and-quiet` is its route. Old route aliases were intentionally removed.
- The 3D tower is the only home screen. The old carousel, floor components, prototype toggle and prototype editors were removed. A simple room directory remains for accessibility and devices without WebGL.
- Storefronts have separate horizontal and vertical spacing. Curved balcony bands and ledges sit between floors. Pillars appear on wide screens with a fine pointer; tablet/phone layouts omit them. Original storefront artwork is retained as local assets.
- Floors reuse a small pool of scene objects instead of building an enormous tower. Rendering stops when the tower is still or the tab is hidden. Keyboard controls, swipe controls, reduced-motion support and failure recovery are included.
- The separate Piece & Quiet island viewer remains in tester/admin tools. It refreshes the island, retains camera position, caps resolution, releases graphics resources and uses shared terrain/cloud meshes. Normal island gameplay still uses its 2D canvas.
- Authentication has one shared account check. Profile and leaderboard requests use shared caches. Failed requests are presented as errors rather than missing accounts/saves.
- Admin authority is checked on the server. A public profile name can no longer grant admin. Only the verified account for **brandonkimball5000@gmail.com** can initially bind the private owner record. Later checks use the stored user ID. This controls site administration, not Base44 Builder ownership.
- Profiles, saves, owner bindings and presence records are private to server functions. Public leaderboards return names and scores only. Admin functions independently verify ownership.
- Island saves have a format version and revision. Writes and resets are queued. Conditional database updates reject stale saves from another tab. Failed loads never enable blank-island autosaves. Reset waits for the server before replacing the current island.
- Record updates use an atomic maximum so a slower, lower submission cannot lower the best. Inputs have explicit limits. Leaderboards are labeled casual/player-reported because the game still runs on the player's device.
- Red Queen transitions copy nested state before changing decks. Timers are tracked and cancelled when leaving the game; hand resolution blocks repeat actions; pending redraws and ability checks cannot be mistaken for completed hands. Score rules and artwork were preserved. Ties are shown as shared victories.
- Presence uses separate sessions and server time. Admin record errors and record-save failures have recovery controls. Unused imports and outdated navigation were cleaned up.

## Architecture and reusable pieces

React 18 + Vite provide the application. React Router handles public rooms and sign-in pages; games check sign-in before mounting. Base44 SDK supplies Google/email authentication and function calls. React Query caches the account's profile and leaderboards. Base44 entities store profiles, island snapshots, the owner binding and presence. Backend functions use the authenticated request and service-role data access after explicit authorization.

`src/lib/rooms.js` is the room/game catalog used by tower, navigation and score displays. Add new room metadata there, register its route in `src/App.jsx`, and give the game an isolated page. Do not give the tower responsibility for game rules or account data.

`src/components/lacunarium/LacunariumConfig.js` holds tower dimensions; `lacunariumScene.js` builds the scene; `Lacunarium3D.jsx` handles navigation and display lifecycle. Change spacing in the config instead of independently resizing storefronts, floors and pillars.

Piece & Quiet retains its geometry, island logic, renderer and state modules. `src/lib/islandPersistence.js` isolates save ordering from animation. Red Queen retains `src/lib/redQueenEngine.js` and its own visual components. Shared authorization, validation and record rules live in `base44/shared`.

## Verification performed

- Production Vite build passed with a local test app ID. The build artifacts are excluded from this package; build again for the intended Base44 project.
- ESLint passed across application source (excluding the existing generated UI component library).
- Backend TypeScript check passed against the installed SDK declarations.
- Nine automated safety tests passed: owner authorization/binding, private entity rules, invalid island data, competing writes/reset, score monotonicity, failed-load protection, save ordering/conflict, card scoring, and login-token/backend-URL handling. Database tests use an in-memory simulation of the SDK operations, not a live Base44 database.
- Browser checks used headless Edge, software WebGL and intercepted API responses. Desktop 1440×1000, phone 390×844 and tablet 820×1180 had no horizontal overflow or page errors. Room/floor controls were exercised.
- With a simulated tester account, the island loaded, opened in 3D, saved and reset. A simulated load failure produced no save calls. Red Queen advanced through multiple rounds, including an AI 21/redraw, and returned to its lobby after restart without page errors.
- **The existing frontend `npm run typecheck` does not pass.** It reports missing/inferred Three.js typings and React component prop typing problems in both existing code and updated components. This has not been hidden by disabling the check. Broad typing cleanup remains.
- Physical iOS/Android devices, real OAuth and live backend deployment have not been tested. The build reports a large main bundle and stale browser-target metadata; further bundle trimming remains.

## Before publishing — deployment owner checklist

1. Import/review this source in a staging copy of the correct Base44 project. Apply `CHANGE-MANIFEST.json`, including deletions: copying new files alone leaves obsolete routes and functions behind. In particular, remove the retired `adminSetMassRecord` backend function from the deployed app if still present.
2. Deploy updated entity schemas and all functions together. The new frontend expects the revisioned save contract. Confirm Base44 accepts the private RLS rules and the generic snapshot object schema. Do not publish the frontend alone.
3. Use the real project environment configuration. Do not use the `local-preview` ID from testing. `VITE_BASE44_APP_ID` and the appropriate Base44 app URL must come from trusted deployment configuration.
4. A fresh data start is supported, but this package performs no live wipe. Use a staging dataset first. Old unversioned saves are deliberately rejected rather than silently reset. If choosing a fresh production start, back up and clear the app's old profiles/saves/presence as a separate, deliberate operation. Keep authentication accounts unless account deletion is expressly intended. Preserve an existing valid OwnerAccount binding.
5. Sign in with the requested Google account, choose a profile name and confirm Admin Access. Verify the trusted Base44 account reports `is_verified: true`; never work around a failure by promoting a display name or trusting a client-submitted email. Confirm a second ordinary account cannot call admin functions or directly read/write private entities.
6. Run real save/reload, two-tab conflict, reset and best-score concurrency checks. Confirm the deployed SDK's conditional `updateMany` filter and `$max` operation behave as tested. If any check fails, keep the change in staging.
7. Test real phone/tablet touch input, orientation changes and the island viewer before publishing. Software-WebGL screenshots are visual checks, not mobile performance benchmarks.

## Remaining priorities

**P0 — live integration verification:** complete the deployment checks above. Source tests cannot establish the hosted database's behavior or your actual Google identity.

**P1 — profile uniqueness:** profile names are checked case-insensitively, but check-then-create is not a database uniqueness constraint. Simultaneous profile creation can still produce duplicate names/rows. Canonical-row selection reduces ambiguity; a supported unique constraint or transactional reservation service is needed for a strict guarantee.

**P1 — typing and stronger game tests:** finish frontend type declarations rather than suppressing errors. Extract Red Queen transitions into a pure reducer/event engine before network multiplayer, with deterministic random seeds and tests for every ability and card-conservation case. Browser playthroughs are not exhaustive rules verification.

**P2 — scale and resilience:** public leaderboard endpoints currently page through profiles before sorting; add an indexed/materialized leaderboard and server caching as usage grows. Presence rows from abandoned sessions need scheduled retention cleanup. Saves are periodic and attempted on hide/normal navigation; abrupt browser termination can lose the latest few seconds. A local recovery copy would help, but must preserve revision conflict rules.

**P2 — performance:** shared meshes reduce island draw calls, but tree rendering, island physics and snapshot serialization still need representative large-island profiling on real phones. The main bundle and remaining unused UI/dependencies can be reduced after dependency analysis.

## Future multiplayer and the 3D environment

Keep the tower a lightweight navigation shell. Load only nearby floors and load a game's code when entering it. Keep uploaded artwork/media outside game saves; use a dedicated content catalog with title, thumbnail, destination, publication status and access rules. Add an owner upload/publishing screen as a separate feature. This update does not yet provide that content-management workflow.

Start multiplayer with a single turn-based Red Queen room. A server-owned match should hold players, turn/phase, version, seeded deck and event history. Clients send actions with a match version and unique action ID; the server checks membership, legal moves and duplicates before advancing the match. Reconnect by fetching a snapshot and missing events. Compute final scores on the server. Presence alone is not multiplayer state.

Use a transactional room coordinator/actor or another authoritative service whose current Base44 support has been verified before implementation. Avoid treating entity subscriptions as a lock or broadcasting every animation frame. For shared islands, first design ownership and an edit-command model; do not let multiple players overwrite an entire JSON island. Keep personal saves separate from shared-world state.

## Prompting Base44 without collateral changes

- Give one concrete outcome per prompt. Name the page/component and include a screenshot with the exact mismatch.
- State protected areas explicitly: artwork, game rules, auth, save format and unrelated routes. Ask it to list needed dependencies before expanding scope.
- Use measurable acceptance checks: “at 390px there is no horizontal scroll; at desktop width pillars show; each floor has a visible gap.”
- Ask for a change summary and test results. Avoid “clean up everything,” “make it better,” or simultaneous visual and database redesigns.
- Checkpoint before each change. If something breaks, revert the change or diagnose its cause; avoid stacking speculative repair prompts.
- “Touch only this file” is a useful boundary, not a guarantee: shared CSS, schemas, helpers and routes can affect other pages. Ask it to explain any required boundary crossing first.

Reusable prompt:

> Change only [page/component] to achieve [specific visible result]. Preserve [artwork, rules, authentication, persistence, unrelated pages]. First identify the smallest set of affected files and shared dependencies. If other areas must change, explain why before editing them. Afterward, list the files changed and verify [desktop/mobile behavior and relevant save/login checks]. Do not publish or reset live data.
