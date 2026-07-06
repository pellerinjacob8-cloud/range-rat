# Putting Green Practice Area — Implementation Spec

Handoff spec for implementing the Putting Green practice area and the Practice
Area selector. Written against the codebase as of commit `00a1033`. Read
`src/lib/drills.ts`, `src/lib/phases.ts`, and `src/routes/practice.tsx` first —
this spec extends that architecture, it does not replace it.

## 1. Product requirements (from Jacob, verbatim intent)

- Practice today is driving-range-only. Add an area picker: **Driving Range**,
  **Chipping**, **Putting Green**. Chipping ships with a **"Coming soon"**
  badge and is not clickable yet — putting is the only new area to build now.
- Putting has no "bucket of balls" like the range. The user has a **fixed,
  small number of real putting balls** (they physically walk out, hit them,
  and walk back to collect). Default suggestions: **10** or **35**, but it's a
  free-entry number, not a preset list.
- Because the ball count is small and reused, sessions are **not** built by
  allocating a big ball total across drills (that's the range model). Instead
  the session is a **sequence of reps/sets**, each using the user's fixed ball
  count per trip, and the *number of drills/sets* scales with the **time**
  the user has, not with total balls hit. Balls hit is not the primary
  progress metric here; sets/reps completed is.
- Keep v1 **generic**: no putting-specific training aids (mirrors, gates,
  alignment sticks) in the first version. That's a fast-follow. Descriptions
  should read fine with just a ball and a putter.
- Three distance zones, each a **user-adjustable feet range**:
  - **Short putts**: 3–5 ft
  - **Mid-range putts**: 5–15 ft
  - **Lag putts**: 15 ft and beyond
  - CONFIRMED with Jacob 2026-07-06: lag starts at 15 ft. Mid-range's upper
    bound is set to 15 ft to close the gap cleanly (no dead zone between mid
    and lag). These are the shipped defaults, not placeholders.
- Like the range's club-group multi-select, the user can pick **any
  combination of 1, 2, or all 3 zones**. The session builds only drills for
  the zones picked.
- Drills should **progress in a natural order** across zones (e.g. shortest
  to longest, mirroring how the range already sorts short-to-long by loft).
  Jacob is not 100% decided on direction (short→long vs long→short) — default
  to **short → lag** (matches the existing range convention and is the safer
  default for warm-up logic), flag it as a one-line constant so it's trivial
  to flip later.

## 2. Architecture decisions (answers to the open questions in
   `practice_areas_expansion.md`)

### 2.1 Where does `area` live?

Add a new top-level concept, **not** a club group:

```ts
// src/lib/phases.ts or a new src/lib/areas.ts
export type PracticeArea = "range" | "putting" | "chipping";
```

`sessions` table gets one new nullable column:

```sql
alter table sessions add column if not exists area text not null default 'range';
```

Existing rows default to `'range'` — zero migration risk, matches the
"stats columns may not exist yet" fallback pattern already used in
`fetchHandicapHistory` (`src/lib/db.ts:184`). Follow that same
try-with-fallback shape here: attempt the insert/select with `area`, and if
the column doesn't exist yet (error), fall back to the columnless query. This
means the column can be added to Supabase *after* the code ships without
breaking anything, or before — order doesn't matter.

`SavedSession` and `fetchSessions`/`saveSession` in `src/lib/db.ts` gain an
`area: PracticeArea` field (default `"range"` when absent, exactly like the
handicap-history stats-column fallback).

### 2.2 Session generation logic — new generator, not a branch in the old one

Do **not** try to bend `generateSession()` / `GenerateInput` to cover putting.
That interface is deeply range-shaped (`clubGroups`, `bag`, `bucket` as a
*ball total to allocate*, `goal`/`category` driving a large drill library).
Forcing putting through it will produce worse code than a parallel, smaller
generator.

Add a sibling type and function:

```ts
// src/lib/putting.ts (new file)

export type PuttZone = "short" | "mid" | "lag";

export interface PuttZoneRange {
  zone: PuttZone;
  label: string;       // "Short Putts", "Mid-Range Putts", "Lag Putts"
  minFeet: number;
  maxFeet: number | null; // null = "and beyond" for lag
}

// Defaults; the user can override min/max per zone (see 2.4).
export const PUTT_ZONES: PuttZoneRange[] = [
  { zone: "short", label: "Short Putts",     minFeet: 3,  maxFeet: 5    },
  { zone: "mid",   label: "Mid-Range Putts", minFeet: 5,  maxFeet: 15   },
  { zone: "lag",   label: "Lag Putts",       minFeet: 15, maxFeet: null },
];

// Progression order. Change this one line to flip direction later.
export const ZONE_ORDER: PuttZone[] = ["short", "mid", "lag"];

export interface PuttingGenerateInput {
  zones: PuttZone[];          // 1-3, any combination
  zoneRanges?: Partial<Record<PuttZone, { minFeet: number; maxFeet: number | null }>>;
  ballCount: number;          // fixed balls the user owns for this session, e.g. 10 or 35
  time: TimeAvailable;        // reuse existing 15|30|45|60 from drills.ts
}

export function generatePuttingSession(input: PuttingGenerateInput): SessionDrill[] {
  // See 2.3 for the algorithm.
}
```

Reuse `SessionDrill` from `src/lib/drills.ts` unchanged (`id`, `club`,
`drillName`, `description`, `balls`, `unit`, `type`, `phase`) so the existing
`GuidedSessionView`, `CompletionView`, list rendering, and phase grouping all
work with zero changes. For putting, repurpose the `club` field to hold the
**zone label** ("Short Putts") instead of a club name — every downstream
component just renders `d.club` as a string, so this is a safe reuse, not a
hack. Confirm this by reading `GuidedSessionView.tsx` before assuming it.

### 2.3 The generation algorithm (time-driven sets, not ball-allocation)

This is the core logic difference from the range and the part to get right:

1. Compute a target number of **drill blocks** from time, not from
   `ballCount`. Reuse the existing `MINUTES_PER_BLOCK = 3.5` constant/pattern
   from `drills.ts` (a putting rep + walk-and-retrieve realistically takes
   about that long too) — don't invent a new number without reason:
   ```ts
   const totalBlocks = Math.max(1, Math.round(time / MINUTES_PER_BLOCK));
   ```
2. Distribute `totalBlocks` across the selected zones **in `ZONE_ORDER`**,
   spread as evenly as possible (reuse `pickSpread`-style logic already in
   `drills.ts` — genuinely reuse the function if it's exported, or copy the
   3-line pattern, don't reimplement differently).
3. Each block = one "drill": `{balls: input.ballCount, drillName, description}`.
   The ball count is **the same fixed number every block** (the user's real
   ball count) — this is the key behavioral difference from the range, where
   `balls` varies per block via `allocateExact`. Do not run `allocateExact`
   here.
4. Drill naming/description is generic per zone (no aids, no club specifics):
   - Short: "Short Putts — {min}-{max} ft", description e.g. "Putt all
     {ballCount} balls from {min}-{max} feet, same hole. Focus on speed."
   - Mid: "Mid-Range Putts — {min}-{max} ft", description varies rep to rep
     (rotate a small generic cue list, same pattern as `FLOW_CUES` in
     `drills.ts:916`) e.g. "Read the line, commit, roll it.", "Pick your
     entry point on the cup before every putt."
   - Lag: "Lag Putts — {min}+ ft", description emphasizes distance control,
     e.g. "Putt to different holes, focus on leaving it inside 3 feet."
5. Assign `phase: "Skill"` to every block for v1 (no Warm Up / Transfer /
   Challenge / Test phases yet — that's a stretch goal once beta feedback
   comes in specifically about putting; don't build it speculatively).
6. `unit: "balls"`, `type: "drill"`.

Total balls **hit** in a session is `ballCount * totalBlocks` (they reuse the
same balls each block). CONFIRMED with Jacob 2026-07-06: this total counts
toward the same Home/Profile "Balls" stat as range sessions (total putts
struck = balls hit). No second stat card, no schema change beyond `totalBalls`
already being generic. Persist it in `SavedSession.totalBalls` exactly like
the range does; `saveSession` in `db.ts` needs no changes for this.

### 2.4 Zone range customization (user-adjustable feet)

v1 scope: expose editable min/max per zone as **plain number inputs**
(reuse whatever numeric-input pattern already exists in the profile
yardage editor, `src/routes/profile.tsx` yardage section, for visual
consistency) on the putting zone-picker screen, defaulting to `PUTT_ZONES`.
Persist the customization the same way yardages persist per user — a new
Supabase table `putting_zones (user_id, zone, min_feet, max_feet)`, upsert on
change, fetched on load. Follow the exact shape of `fetchYardages`/
`saveYardage` in `src/lib/db.ts:324-358` — same pattern, new table.
Do not build a generic "settings" system for this; three rows per user is
enough.

## 3. UI changes

### 3.1 Practice Area selector (new)

Add a new top-level screen in `practice.tsx`'s flow, shown **before** the
existing builder screens (before club-group selection). Suggested shape:

```
PracticePage
  └─ areaView state: "picker" | "range" | "putting" | "chipping"
       "picker"  -> new AreaPickerView (3 cards: Driving Range / Chipping / Putting Green)
       "range"   -> existing builder flow, unchanged, entered via card tap
       "putting" -> new PuttingBuilderView (zone picker, ball count, time)
       "chipping"-> unreachable in v1 (card is disabled + "Coming Soon" badge)
```

Persist the last-chosen area in the active-session marker
(`src/lib/active-session.ts` already has a `type` field per flow — add
`"putting"` to `ActiveSessionMarker["type"]` union, same pattern as
`"round-warmup" | "play-solo"` etc.) so a resumed putting session routes back
correctly from the Home resume card.

Card copy:
- **Driving Range** — existing icon, subtitle e.g. "Full swing practice"
- **Chipping** — greyed card, small "Coming Soon" pill badge, not clickable
  (`disabled`, `aria-disabled`, no onClick)
- **Putting Green** — new icon (lucide `Target` is already used for
  categories — pick something distinct, e.g. `CircleDot` or a custom SVG;
  don't reuse an icon already meaning something else in this file)

### 3.2 Putting builder screen

Mirrors the range builder's step structure (club groups → bucket → time →
category → generate), but simpler:

1. **Zone multi-select**: 3 tappable chips (Short / Mid / Lag), same
   multi-select interaction pattern as the range's club-group picker
   (`handleClubGroupsChange` in `practice.tsx` — copy the toggle pattern, not
   the club-specific logic).
2. **Ball count**: a numeric input with two quick-pick chips (10, 35) plus
   free entry — same UX pattern as the range's `showCustomBucket` /
   `customBallsStr` free-entry flow (`practice.tsx` around line 230-236).
   Do not reuse `BUCKET_SIZES` (small/medium/large/unlimited) — that concept
   doesn't apply here; ball count is just a number.
3. **Time**: reuse the existing `TIMES` constant and time-picker UI verbatim
   (`practice.tsx`'s time selector component) — putting sessions use the
   same 15/30/45/60 options.
4. **Generate** button, disabled until zones.length >= 1, ballCount > 0,
   time !== null — mirror `canGenerate`'s shape in `practice.tsx`.

Session playback (list view / guided view / completion) reuses
`GuidedSessionView` and the existing completion flow unmodified — verify by
reading `GuidedSessionView.tsx`'s prop types before assuming, but the plan
depends on `SessionDrill` being area-agnostic, which it already is.

### 3.3 Chipping "Coming Soon"

No new route or logic. Just the disabled card in the area picker. Do not
scaffold a chipping builder file yet — that's the next spec after putting
ships and gets feedback.

## 4. Data model changes summary (for the migration)

```sql
-- sessions: track which area a session belongs to
alter table sessions add column if not exists area text not null default 'range';

-- new table: per-user custom putting zone distances
create table if not exists putting_zones (
  user_id uuid not null references auth.users(id) on delete cascade,
  zone text not null check (zone in ('short', 'mid', 'lag')),
  min_feet integer not null,
  max_feet integer, -- null = open-ended (lag)
  updated_at timestamptz not null default now(),
  primary key (user_id, zone)
);
alter table putting_zones enable row level security;
create policy "users manage their own putting zones"
  on putting_zones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Add `"putting_zones"` to `USER_TABLES` in `api/delete-account.ts` so account
deletion clears it (this list already exists specifically for this purpose —
don't forget it, it's the easiest thing to miss).

## 5. What NOT to build in v1 (explicitly out of scope)

- Training aids / equipment selection — generic drills only.
- Warm Up / Transfer / Challenge / Test phases for putting — everything is
  phase `"Skill"` for now.
- Chipping builder — card only, disabled.
- Putting-specific stats/charts in Profile beyond what "Balls"/"Sessions"
  already show (see the open stat-attribution question in 2.3).
- Combine/warm-up-style separate history screens for putting.

## 6. Suggested build order (for a single implementation pass)

1. `src/lib/putting.ts` — types, `PUTT_ZONES`, `ZONE_ORDER`,
   `generatePuttingSession()`. Pure function, unit-testable without touching
   any UI.
2. `sessions.area` column + `db.ts` fallback read/write (mirror the
   handicap-history stats-columns pattern exactly).
3. Area picker screen + routing state in `practice.tsx`.
4. Putting builder screen (zone picker, ball count, time) wired to
   `generatePuttingSession()`.
5. Wire completion → `saveSession` with `area: "putting"`.
6. `putting_zones` table + `fetchPuttingZones`/`savePuttingZone` in `db.ts`
   (mirror `fetchYardages`/`saveYardage` exactly) + simple edit UI, can ship
   in a fast-follow commit after the core flow works with hardcoded defaults.
7. Add `"putting_zones"` to `USER_TABLES` in `delete-account.ts`.
8. Manual test pass: pick each zone combination (1, 2, 3 zones), confirm
   block count scales sensibly across 15/30/45/60 minutes, confirm resume
   works via Home's active-session card, confirm completion saves and shows
   up in Profile's session history with the right area/label.

## 7. Open questions

None outstanding. Zone distances (2.1) and Balls-stat attribution (2.3) were
both confirmed with Jacob on 2026-07-06 and are locked in as shipped defaults
above, not placeholders. Fable 5 can build straight through without pausing
for design sign-off.
