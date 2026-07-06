# Putting Green Practice Area

Documents the shipped architecture as of commit history through 2026-07-06.
This superseded an earlier free-form "zone picker" design (short/mid/lag
adjustable distance ranges, unlimited-loop generic drills) that was fully
replaced with a structured, scored practice system per Jacob's direction:
**Train → Measure → Move**, not "one station → move."

## 1. Core model

Every user practices the same **fixed distance ladder** (not customizable —
this is what makes sessions comparable week to week and player to player):

- **Short**: 4, 5, 6 ft
- **Medium**: 8, 10, 12, 15 ft
- **Long**: 20, 30, 40, 50 ft — scored by finishing inside **`LONG_TARGET_FT`
  (3 ft)** of the hole, not by makes (nobody "makes" a 30-footer reliably;
  distance control is the skill).

A **station** is one distance. Every station is always **`SETS_PER_STATION`
(3) scored sets** of the user's chosen ball count (e.g. 6 balls). After 3 sets
the station shows a line score (makes/attempts per set + station total), then
moves to the next station. This is implemented in
`src/lib/putting.ts` and `src/components/PuttingSessionView.tsx`.

## 2. Practice modes

`PUTTING_MODES` in `src/lib/putting.ts`:

- **Short / Medium / Long**: isolated ladders, for working a specific weakness.
- **Mixed**: all 11 stations, shuffled once at generation (and reshuffled on
  every additional lap in an unlimited session) for game-like variability.
- **Complete**: the full ladder in order (short → medium → long) — the
  structured full workout.

## 3. Session length: sets, not ball totals

Time does **not** allocate a ball total across drills (that's the range's
model). Instead:

- Every station always gets exactly 3 sets, at the user's chosen ball count.
- A **soft target station count** is computed from time:
  `target = round(time / (SETS_PER_STATION * MINUTES_PER_SET))`, where
  `MINUTES_PER_SET = 2` (hit the set, retrieve, reset). E.g. 20 min → ~3
  stations (`planStations()`). If the target reaches or exceeds the mode's
  full ladder length, the whole ladder is used.
- **Unlimited time** (`config.time === "unlimited"`): starts with the full
  ladder; once exhausted, the user is asked "Keep Going" (appends another
  `buildLadder()` call — reshuffles for Mixed) or "Finish Session" with
  whatever was scored so far.
- Quitting mid-session (back button) also saves nothing extra — only a full
  `onFinish` with completed `StationResult[]` persists a session; the
  practice-page level `resetAll()` on quit clears in-progress state and
  returns to the area picker without saving a partial session. (This matches
  existing app convention: quitting anywhere else in the app also discards.)

## 4. Scoring input

After each set, `PuttingSessionView` shows a tap-a-number grid, **0 through
ball count**, one tap records the set and advances. Chosen over a stepper
(too many taps) or ball-by-ball sequence entry (also more taps, and the exact
make/miss order isn't used anywhere downstream) as the fastest single
interaction, since this happens outdoors mid-practice.

## 5. Data model

- `sessions.area` (nullable text, default `'range'`): tags every session's
  practice area. Putting sessions save `area: "putting"`.
- `sessions.makes`, `sessions.attempts` (nullable integers): the session-level
  scored totals for putting sessions (sum across every completed set). Range
  sessions leave these null.
- Both follow the existing "try with new columns, fall back without" pattern
  used elsewhere in `db.ts` (see `fetchHandicapHistory`) so the app works
  whether or not `supabase-migration-putting.sql` has been run yet.
- `filters.goal` for a putting session is `"putting-{mode}"` (e.g.
  `"putting-short"`); `profile.tsx`'s `sessionGoalLabel()` renders this as
  "Putting: Short" in the recent-sessions list, which also shows the make %
  instead of a ball count when `makes`/`attempts` are present.
- **No per-distance history table yet.** Per Jacob's call (2026-07-06):
  ship scoring first; the confidence-meter / month-over-month trend view
  ("4ft: 89% → 100% a month later") is deferred until there's real practice
  data to make it meaningful. When built, it needs a new table storing every
  completed set (distance, makes, attempts, date, user) since session-level
  totals alone can't reconstruct a per-distance trend.

## 6. What NOT built (explicitly deferred)

- Per-distance confidence meter / historical trend (see above).
- Custom/adjustable distance ladders — removed; fixed for everyone.
- Chipping builder — the area picker still shows a disabled "Coming Soon"
  card only.
- Feel/Groove/Pressure progressive set framing — every set is scored
  (Jacob's explicit preference over a practice-then-scored structure).

## 7. Key files

- `src/lib/putting.ts` — ladder definitions, modes, `planStations`,
  `buildLadder`, `summarizeStation`/`summarizeSession`.
- `src/components/PuttingSessionView.tsx` — the station/set runner: active-set
  scoring screen, station line-score screen, unlimited keep-going/finish
  choice screen.
- `src/routes/practice.tsx` — `AreaPickerView`, `PuttingBuilder` (mode/balls/
  time), `PuttingCompletionView` (per-station breakdown + overall), and the
  putting-specific active-session persistence (`ActivePuttingData`,
  `persistActivePutting`/`loadActivePutting`) kept separate from the range's.
- `supabase-migration-putting.sql` — run in the Supabase SQL Editor.
