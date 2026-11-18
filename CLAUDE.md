# Range Rat

Golf practice web app (rangeratapp.com). Solo founder and developer. Vite + React + TanStack Router, Supabase for auth and data, Stripe for Pro, deployed on Vercel from `main`.

## How to work in this repo

- Finish every change by merging it to `main` (open a PR, wait for the Vercel preview check to pass, merge). Don't leave work sitting on side branches.
- Before merging, run `npx tsc --noEmit` and `npm run build`. There is no test suite; check logic with a quick script when needed.
- Vercel preview links need a Vercel login (Deployment Protection), so the owner usually can't open them on a phone. The local dev server may also fail to start inside Claude sessions; say so instead of claiming a browser check.
- New Supabase tables made in the SQL Editor get no API grants on this project. Every new migration must `grant` what the app needs to `authenticated`, and to `service_role` if `api/delete-account.ts` (or another server route) touches the table. Without it, writes fail quietly and account deletion can break.
- No em dashes anywhere: code comments, commit messages, PR text, or replies.
- Only change what was asked. Don't refactor or reformat unrelated code.
- If the code disagrees with what the owner describes, stop and say so instead of guessing.

## Free vs Pro (verified 2026-10-29)

Pro is checked with `isPro` from `src/context/AuthContext.tsx` (reads `profiles.is_pro`, set by `api/stripe-webhook.ts`). Pages are gated with `<ProGate>` (`src/components/ProGate.tsx`); locked cards open `<ProModal>`.

- **Pro:** Random Practice (`/play`, `/play/solo`, `/play/game`), Combine retakes (free accounts get one finished Combine, `canStartCombine` in `src/lib/combineShare.ts`), Grid Game, Fairway Game, My Sessions / custom sessions, round stat tiles and stat detail, per-round stats in Round History (blurred for free), Built for you sessions on Practice (the last logged round shapes the range session; putting-heavy rounds point to the Putting Green), practice balance (adds a skipped add-on), and the Pro plans (Scoring day, Ball striking, Pre-round, Play holes).
- **Free:** Logging round stats (GIR, fairways, putts, up and downs). Free users only get one thing back from them: the locked Built for you line on Practice using their real number. Range practice on the Standard plan (Quick or Full, Control and Tee shots add-ons, Learning or Experienced cues, Tip pills, wedge targets from saved yardages), all putting modes, Round Warm Up, Closest to Pin, bag editor, club yardages, handicap updates, handicap trend chart, round history, all-time stats.
- Combine share link (2026-11-18): "Share my score" on results shares a score card image (drawn on the phone) and a `/challenge?...` link. The score travels in the link, so it is never labeled verified. `/challenge` is public; "Take the Combine" sends logged-out visitors to signup, logs `signup_referred` after the name step, and lands them on `/combine` when onboarding finishes. Shares log `combine_shared`. Head-to-head: "Take the Combine" keeps the challenger's score on the device (localStorage `rangeRat_challenge`, 30 days); the next finished Combine shows "You beat Jacob by 6" with Send it back, logs `challenge_completed`, and clears it.
- Saved generated sessions: free accounts are capped at 1 (`FREE_LIMIT` in `src/lib/favorites.ts`); Pro is unlimited.
- Promo codes: entered on Stripe's hosted checkout (`allow_promotion_codes: true` in `api/create-checkout-session.ts`). No in-app code field.
- Only `profiles.is_pro` is stored from Stripe; the customer is found by email. Deleting an account (`api/delete-account.ts`) cancels every live Stripe subscription for that email first, and keeps the account if Stripe fails.

## Range practice (redesigned 2026-11-08)

- Engine: `src/lib/practicePlan.ts`. A fixed list of block templates (club slot, balls, one-line cue, Tip detail) resolved against the user's bag. No stats are tracked in a session; finishing saves only balls hit and blocks done to `sessions` (Home's weekly ball count reads it).
- Runner: `src/components/BlockSessionView.tsx` (club, balls, one cue, Tip, Next/Back/End, screen wake lock). Active run is stored in localStorage `range-rat:active-session` under `run`.
- Saved favorites store blocks as `SessionDrill` rows (cue in `drillName`, tip in `description`); old generated favorites and Pro custom sessions open in the same runner.
- The old `generateSession` engine in `drills.ts` is no longer used by Practice; `/custom-session` and `recommendGoal` still use parts of that file.
- Plans: `PLANS` / `PLAN_BLOCKS` in `practicePlan.ts`. Standard is free; Pro plans are fixed block lists and ignore Built for you and balance.
- Play holes (Pro): warm-up and one wedge block, then a par 5, par 4 and par 3 played with 6 hole shots, 1 ball each (p5-tee, p5-iron, p5-wedge, p4-tee, p4-approach, p3-flag), matching shots to reach the green in regulation. The par 5 and par 4 tee shots also count as tee shot work for practice balance.
- Practice balance: each finished session saves `practice_areas` (wedges, irons, control, tee-shots, holes) on `sessions`. `pickNeglected` flags tee shots or control once 3+ sessions have areas and one hasn't been hit in 14 days. The `practice_areas` column exists (`supabase-migration-practice-areas.sql`, run 2026-11-18); saves still fall back without it if it's ever missing.
- Next (step 3): "Is it working?" progress card on Profile and miss-based cues.

## Data notes

- Up and downs are stored as a count (0-18), not a percent. GIR and fairways are stored as rounded percents (`parsePercentEntry` in `src/routes/profile.tsx`).
- Handicap lives in two places: `profiles.handicap` (current index) and `handicap_history` (each logged round). The Practice tab caches it in localStorage `rangeRat_handicap`.
- Combine history saves to the `combine_attempts` table (created 2026-11-18 with grants) with a per-account localStorage copy (`src/lib/combine.ts`); older browser-only results upload on the next Combine visit.

## Onboarding and first session (2026-11-15)

- Flow: Welcome, Sign up (in-app email code), Name, Bag (skippable), then on phones only `/onboarding/install` (Add to Home Screen steps, iPhone or Android), then Home. The install step sets `rangeRat_onboarding_complete` when the user leaves it; desktop or already-installed users skip it (`isMobileDevice`, `isHomeScreenDone` in `src/lib/pwa.ts`).
- Quick start: `/practice?start=quick` starts a Standard Quick session once bag and level load (`src/lib/quickStart.ts`), resumes any session in progress instead, uses default clubs for an empty bag, never reads or writes builder prefs, and clears the param. Home's "Start your first session" card (zero finished sessions, no Resume card) links to it.
- Funnel on 2026-11-15 (last 90 days): 15 signed up, 12 finished onboarding, 3 finished a session, 0 finished a second. Every user without a session left on signup day and never returned.
- Not built yet: a follow-up email 1-2 days after signup to users with no finished session, linking to quick start (Resend, Vercel cron, a sent-once flag). Don't claim "20 minutes": Standard Quick is about 30.
- `routeTree.gen.ts` is maintained by hand (no router plugin); add new routes by copying an existing entry's pattern.

## Usage tracking (2026-11-18)

- Table `public.app_events` (`supabase-migration-app-events.sql`, run with its grant): insert own rows only, no select policy, so query it in the SQL Editor. `user_id` is set null when an account is deleted.
- Helpers in `src/lib/trackEvent.ts`: `track` (fire and forget), `trackSettled` (one event after autosave edits settle), `trackBeforeLeaving` (waits up to 0.8s before a full page navigation), `useTrackOnce` (once on mount). Logged-out users are skipped. Properties never hold names, emails or typed text.
- Events: `tab_viewed` (`__root.tsx`), `game_started` / `game_completed` (every game and the Combine), `session_started` / `session_completed` / `first_session_completed` (`practice.tsx`), `bag_saved`, `yardages_saved`, `paywall_viewed` (`ProModal`; ProGate pages send a feature name, other locked cards send the path), `upgrade_clicked`.
- The privacy policy (`src/routes/privacy.tsx`, effective 2026-11-18) describes this tracking, Sentry, and account deletion. Update it when data handling changes.

## Planned: miss direction tracking (not built yet)

Goal: like GHIN, let golfers record which way they missed, then use it to pick what to practice.

- **Log Round form (Pro):** add counts for fairway misses (left, right) and green misses (left, right, short, long), next to the existing GIR and Fairways fields in `src/routes/profile.tsx`.
- **Storage:** new nullable columns on `handicap_history` via a new `supabase-migration-*.sql` file, with the same fallback pattern `saveHandicapSnapshot` in `src/lib/db.ts` already uses. Keep existing rounds valid when these are empty.
- **Display:** show the miss split in the stat detail sheet on Profile.
- **Recommendation:** extend `recommendGoal` in `src/lib/drills.ts` so a lopsided miss pattern can win, with a reason like "7 of 9 fairway misses went right". Map to existing categories: left/right misses to Accuracy or Shot Shaping (driver misses to Driver), short/long green misses to Distance Control.
- **Working on it:** when a miss pattern drives the recommendation, the generated session should include drills aimed at that miss (e.g. a right miss gets alignment, path and draw-feel drills).
- **Decide before building:** exact fields, whether to also accept a single "usual miss" instead of counts, whether free users can log misses, and how many rounds to look at (latest round vs last few).

## Open items

- Locked cards on Home, Games, Practice and Profile pass no `feature` to `ProModal`, so `paywall_viewed` records the path there.
- `StatsSection` in `src/routes/profile.tsx` (Last 7 days chart and Recent sessions) is defined but never rendered.
- The "Welcome to Pro" modal on Practice (`?upgraded=true`) is unreachable; checkout returns to `/pro-welcome`.
- Leftover branches `fix/up-and-downs-rate` and `claude/bold-babbage-t4vd7u` can be deleted on GitHub, along with merged `claude/*` branches from PRs 23 to 28.
