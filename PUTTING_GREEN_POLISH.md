# Putting Green: Polish Pass

Handoff for a visual/UX polish pass on the Putting Green practice area.
The architecture is done and Jacob has approved it ("looks good, the
structure is there") — **do not redesign the underlying model.** This is a
finishing pass: make it feel professional grade, sharpen the CTAs, and add
drill variety within the existing Train → Measure → Move structure.

Read `PUTTING_GREEN_SPEC.md` first for the original architecture rationale.
This doc assumes you've read that.

## 1. What's locked, do not change

- **Train → Measure → Move**: fixed distance ladder, 3 scored sets per
  station, tap-a-number score entry (0 to ball count) after each set.
  Repeatability (same session every time) is the whole differentiator —
  don't introduce randomness into what a fixed-mode session shows.
- **Distance ladder as ranges**, not exact numbers: Short 3-5/6-8/9-11 ft,
  Medium 8-9/10-11/12-13/14-16 ft, Long 18-22/28-32/38-42/48-52 ft (all in
  `src/lib/putting.ts`). Long is scored by "finished inside 3 ft," not makes.
- **5 modes**: Short, Medium, Long, Mixed (shuffled), Complete (full ladder).
- The station-intro screen (`stationStarted` state in
  `src/components/PuttingSessionView.tsx`) showing range + tip + Start
  button before scoring begins. Jacob specifically asked for this "select
  then start" flow — keep the two-screen-per-station shape.

## 2. What Jacob asked for in this pass

> "Some tweaks will be needed but the structure is there... increase the
> drills and the CTAs. Make it more polished."

Three things, in his words:
1. **Increase the drills** — more variety, not more architecture. See §3.
2. **Increase the CTAs** — buttons/prompts should feel more considered, not
   just functional. See §4.
3. **More polished, professional grade** — visual pass across every screen
   in the putting flow. See §5.

## 3. Increase drill variety (within the existing structure)

Do not change what a station *measures* (3 sets, tap-a-number score) — add
variety in the *tip/prompt layer* and consider optional drill flavor within
a station's 3 sets, without breaking comparability:

- `stationTip()` in `src/lib/putting.ts` currently has 3 short-category tips
  and 2 long-category tips, reused/cycled. Expand the tip pool so a player
  running the same mode repeatedly sees some rotation in *phrasing* (not in
  what's measured) — e.g. a small pool of 4-6 tips per difficulty tier,
  picked deterministically by station index so it's still exactly
  reproducible run to run (don't randomize; two different players running
  "Short Putting" today should see the same tips, matching the repeatability
  goal). A `seed`-free deterministic pick (e.g. `tips[stationIndex % tips.length]`)
  is fine.
- Consider a distinct *set-level* prompt for the 3rd (final) set at a
  station — a small "this one counts most" or pressure framing, since
  Jacob's original notes explicitly liked the idea of the last rep having
  some weight ("Set 3: Scored" / pressure framing was in his initial
  putting-green brief, then simplified to "every set scored" — a light
  callout on set 3 revives that spirit without changing the data model).
- Do not add new station distances or new modes without checking with
  Jacob first — the ladder numbers were deliberately tuned this session.

## 4. CTA pass

Audit every button across the putting flow for copy and visual weight.
Files: `src/components/PuttingSessionView.tsx`,
`src/routes/practice.tsx` (search for `PuttingBuilder`, `PuttingCompletionView`).

Current CTA copy, as a starting point to improve:
- Builder screen: "Generate Session" (shared with the range builder's button
  — consider whether putting deserves its own verb, e.g. "Start Practice").
- Station intro: "Start Station"
- Scoring screen: tap-a-number grid (0..ballCount) — no single CTA, but
  consider whether the grid itself needs a visual treatment pass (currently
  plain bordered squares).
- Station summary: "Move to Next Station" / "See Results" (final station)
- Unlimited ladder-complete: "Keep Going" / "Finish Session"
- Completion screen: "New Session" / (back to home, check
  `PuttingCompletionView` for the full button list)

Look for: weak or generic verbs, inconsistent button hierarchy (which is
primary vs secondary on each screen), and whether pressing state /
active-opacity feedback is consistent with the rest of the app (grep the
codebase for `active:opacity-90`, `active:scale-[0.99]` for the existing
button-press conventions used elsewhere, e.g. `src/routes/practice.tsx`'s
range completion screen).

## 5. Visual polish

Design tokens already defined in `src/styles.css`:
- `font-display` (Instrument Serif) — used for big headline numbers/titles
- `font-stats` (Barlow Condensed) — used for tabular/numeric stats
- `--color-primary`, `--color-gold` family — check existing usage patterns
  (e.g. `src/routes/practice.tsx`'s range completion screen, `ProModal`) so
  the putting screens feel like the same app, not a bolt-on.

Look specifically at:
- **Station intro screen**: the range number is `font-display text-[80px]`
  — check this doesn't overflow/wrap awkwardly on small screens (test at
  375px width). Consider whether the tip card needs an icon or stronger
  visual separation from the body.
- **Scoring grid**: currently a plain `grid-cols-4` of bordered squares.
  Consider whether this needs more visual interest (e.g. a subtle fill
  animation, larger tap targets for outdoor/sunlight use, or grouping
  0 separately from 1..ballCount since "0 made" is a meaningfully different
  outcome than any positive count). Outdoor visibility matters more here
  than in a typical app — players are using this in bright sun.
- **Set progress dots**: currently plain circles
  (`src/components/PuttingSessionView.tsx`, the `Array.from({ length:
  SETS_PER_STATION })` block). Fine as-is structurally, but check contrast
  and sizing against the rest of the app's progress-indicator patterns
  (compare to the range session's phase progress bar in
  `src/routes/practice.tsx`'s `SessionView`).
- **Station line-score screen**: the 3 set-result cards
  (`lastStation.sets.map`) are plain bordered boxes — consider whether a
  make/miss visual per ball (matching Jacob's original mock: "✅✅❌✅✅✅")
  would read better than just "5/6" text. This was in his very first
  putting-green brief and got simplified to a number for v1; worth
  reconsidering now that the structure is stable, IF it doesn't add real
  scope (a static row of check/x icons rendered from `s.makes` vs
  `s.ballCount`, no new data needed — makes count is already stored, you'd
  just render `makes` checks then `ballCount - makes` x's, order is
  cosmetic since we don't track per-ball sequence).
- **Mode picker** (`PuttingBuilder` in `practice.tsx`): the 5 mode cards are
  plain text blocks. Consider whether Complete/Mixed (the two "structured
  workout" modes) deserve visual distinction from the 3 isolated-practice
  modes (Short/Medium/Long), since they're a meaningfully different kind of
  session.

## 6. Constraints / things not to break

- Don't touch `src/lib/db.ts`'s session save shape (`area`, `makes`,
  `attempts` on `sessions`) — Supabase columns are already migrated and
  production data depends on this shape.
- Don't touch `planStations()`'s time-based station-count math unless asked.
- Keep everything working with `npm run build` (`tsc && vite build`) — this
  project has hit real deploy issues this session from unverified pushes;
  run the literal build command, not just `tsc --noEmit`, before calling
  this done.
- Verify in an actual browser preview if you have one available (resize to
  375px mobile width, this is a PWA used outdoors on phones).

## 7. Open questions for Jacob (flag, don't guess)

- Does he want the ball/ball-count grid changed for outdoor sun visibility,
  or is that over-scoping a "polish" pass?
- Does he want the ✅/❌ per-ball visual on the station summary screen (closer
  to his original mock) or is the current "5/6" text suf ficient?
- Any specific reference apps/screens he considers "professional grade" to
  benchmark against (he hasn't named one — don't assume TrackMan's actual UI,
  he referenced it as a training philosophy, not a visual style).
