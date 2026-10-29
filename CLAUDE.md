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

- **Pro:** Random Practice (`/play`, `/play/solo`, `/play/game`), Combine, Grid Game, Fairway Game, My Sessions / custom sessions, logging GIR, fairways, putts and up and downs, round stat tiles, the Recommended card on Practice.
- **Free:** Practice session builder, all putting modes, Round Warm Up, Closest to Pin, bag editor, club yardages, handicap updates, handicap trend chart, round history, all-time stats.
- Saved generated sessions: free accounts are capped at 1 (`FREE_LIMIT` in `src/lib/favorites.ts`); Pro is unlimited.
- Promo codes: entered on Stripe's hosted checkout (`allow_promotion_codes: true` in `api/create-checkout-session.ts`). No in-app code field.

## Data notes

- Up and downs are stored as a count (0-18), not a percent. GIR and fairways are stored as rounded percents (`parsePercentEntry` in `src/routes/profile.tsx`).
- Handicap lives in two places: `profiles.handicap` (current index) and `handicap_history` (each logged round). The Practice tab caches it in localStorage `rangeRat_handicap`.
- Combine history saves to the `combine_attempts` table with a per-account localStorage copy (`src/lib/combine.ts`).

## Open items

- Run `supabase-migration-combine.sql` in the Supabase SQL Editor if it hasn't been run yet. Until then Combine history stays browser-only.
- The upgrade page lists "Priority support" as a Pro perk; confirm it's offered or remove it (`src/routes/upgrade.tsx`).
- `StatsSection` in `src/routes/profile.tsx` (Last 7 days chart and Recent sessions) is defined but never rendered.
- The "Welcome to Pro" modal on Practice (`?upgraded=true`) is unreachable; checkout returns to `/pro-welcome`.
- Leftover branches `fix/up-and-downs-rate` and `claude/bold-babbage-t4vd7u` can be deleted on GitHub.
