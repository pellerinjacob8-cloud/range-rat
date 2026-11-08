# Range Rat

Golf practice web app (rangeratapp.com). Solo founder and developer. Vite + React + TanStack Router, Supabase for auth and data, Stripe for Pro, deployed on Vercel from `main`.

## How to work in this repo

- Finish every change by merging it to `main` (open a PR, wait for the Vercel preview check to pass, merge). Don't leave work sitting on side branches.
- Before merging, run `npx tsc --noEmit` and `npm run build`. There is no test suite; check logic with a quick script when needed.
- No em dashes anywhere: code comments, commit messages, PR text, or replies.
- Only change what was asked. Don't refactor or reformat unrelated code.
- If the code disagrees with what the owner describes, stop and say so instead of guessing.

## Free vs Pro (verified 2026-10-29)

Pro is checked with `isPro` from `src/context/AuthContext.tsx` (reads `profiles.is_pro`, set by `api/stripe-webhook.ts`). Pages are gated with `<ProGate>` (`src/components/ProGate.tsx`); locked cards open `<ProModal>`.

- **Pro:** Random Practice (`/play`, `/play/solo`, `/play/game`), Combine, Grid Game, Fairway Game, My Sessions / custom sessions, logging GIR, fairways, putts and up and downs, round stat tiles, Built for you sessions on Practice (the last logged round shapes the range session; putting-heavy rounds point to the Putting Green).
- **Free:** Range practice (Quick or Full, Control and Tee shots add-ons, Learning or Experienced cues, Tip pills, wedge targets from saved yardages), all putting modes, Round Warm Up, Closest to Pin, bag editor, club yardages, handicap updates, handicap trend chart, round history, all-time stats.
- Saved generated sessions: free accounts are capped at 1 (`FREE_LIMIT` in `src/lib/favorites.ts`); Pro is unlimited.
- Promo codes: entered on Stripe's hosted checkout (`allow_promotion_codes: true` in `api/create-checkout-session.ts`). No in-app code field.

## Range practice (redesigned 2026-11-08)

- Engine: `src/lib/practicePlan.ts`. A fixed list of block templates (club slot, balls, one-line cue, Tip detail) resolved against the user's bag. No stats are tracked in a session; finishing saves only balls hit and blocks done to `sessions` (Home's weekly ball count reads it).
- Runner: `src/components/BlockSessionView.tsx` (club, balls, one cue, Tip, Next/Back/End, screen wake lock). Active run is stored in localStorage `range-rat:active-session` under `run`.
- Saved favorites store blocks as `SessionDrill` rows (cue in `drillName`, tip in `description`); old generated favorites and Pro custom sessions open in the same runner.
- The old `generateSession` engine in `drills.ts` is no longer used by Practice; `/custom-session` and `recommendGoal` still use parts of that file.
- Planned step 2: free basic round-stat logging, one free Built for you session a month, Pro plan library (Scoring day, Ball striking day, Pre-round, Play holes), and a session focus column for practice balance. Step 3: "Is it working?" progress card and miss-based cues.

## Data notes

- Up and downs are stored as a count (0-18), not a percent. GIR and fairways are stored as rounded percents (`parsePercentEntry` in `src/routes/profile.tsx`).
- Handicap lives in two places: `profiles.handicap` (current index) and `handicap_history` (each logged round). The Practice tab caches it in localStorage `rangeRat_handicap`.
- Combine history saves to the `combine_attempts` table with a per-account localStorage copy (`src/lib/combine.ts`).

## Planned: miss direction tracking (not built yet)

Goal: like GHIN, let golfers record which way they missed, then use it to pick what to practice.

- **Log Round form (Pro):** add counts for fairway misses (left, right) and green misses (left, right, short, long), next to the existing GIR and Fairways fields in `src/routes/profile.tsx`.
- **Storage:** new nullable columns on `handicap_history` via a new `supabase-migration-*.sql` file, with the same fallback pattern `saveHandicapSnapshot` in `src/lib/db.ts` already uses. Keep existing rounds valid when these are empty.
- **Display:** show the miss split in the stat detail sheet on Profile.
- **Recommendation:** extend `recommendGoal` in `src/lib/drills.ts` so a lopsided miss pattern can win, with a reason like "7 of 9 fairway misses went right". Map to existing categories: left/right misses to Accuracy or Shot Shaping (driver misses to Driver), short/long green misses to Distance Control.
- **Working on it:** when a miss pattern drives the recommendation, the generated session should include drills aimed at that miss (e.g. a right miss gets alignment, path and draw-feel drills).
- **Decide before building:** exact fields, whether to also accept a single "usual miss" instead of counts, whether free users can log misses, and how many rounds to look at (latest round vs last few).

## Open items

- Run `supabase-migration-combine.sql` in the Supabase SQL Editor if it hasn't been run yet. Until then Combine history stays browser-only.
- `StatsSection` in `src/routes/profile.tsx` (Last 7 days chart and Recent sessions) is defined but never rendered.
- The "Welcome to Pro" modal on Practice (`?upgraded=true`) is unreachable; checkout returns to `/pro-welcome`.
- Leftover branches `fix/up-and-downs-rate` and `claude/bold-babbage-t4vd7u` can be deleted on GitHub.
