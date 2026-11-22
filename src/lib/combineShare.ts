import { isMonitorAttempt, skillLabel, type CombineAttempt } from "@/lib/combine";

// ─── Free first Combine ───────────────────────────────────────────────────────

// Free accounts get one finished Combine. Retakes need Pro.
export function canStartCombine(isPro: boolean, finishedAttempts: number): boolean {
  return isPro || finishedAttempts === 0;
}

// ─── Share link ───────────────────────────────────────────────────────────────

// The score travels in the link itself (no database row), so a shared page
// is never labeled "verified": it only says Range or Monitor.
export interface SharedScore {
  name: string;
  overall: number;
  wedge: number;
  midIron: number;
  longGame: number;
  driver: number;
  monitor: boolean;
}

export type ShareSearch = Partial<Record<"n" | "s" | "w" | "i" | "l" | "d" | "m", string>>;

// First name only: letters, spaces, apostrophes, hyphens and periods, 20 chars max.
export function cleanFirstName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const first = raw.trim().split(/\s+/)[0] ?? "";
  return first.replace(/[^\p{L}'.-]/gu, "").slice(0, 20);
}

function score(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const s = String(raw);
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= 0 && n <= 100 ? n : null;
}

export function shareFromAttempt(attempt: CombineAttempt, name: string): SharedScore {
  return {
    name: cleanFirstName(name),
    overall: attempt.overallScore,
    wedge: attempt.categoryScores.wedge,
    midIron: attempt.categoryScores.midIron,
    longGame: attempt.categoryScores.longGame,
    driver: attempt.categoryScores.driver,
    monitor: isMonitorAttempt(attempt),
  };
}

export function shareSearch(s: SharedScore): ShareSearch {
  return {
    ...(s.name ? { n: s.name } : {}),
    s: String(s.overall),
    w: String(s.wedge),
    i: String(s.midIron),
    l: String(s.longGame),
    d: String(s.driver),
    ...(s.monitor ? { m: "1" } : {}),
  };
}

export function shareUrl(origin: string, s: SharedScore): string {
  return `${origin}/challenge?${new URLSearchParams(shareSearch(s) as Record<string, string>).toString()}`;
}

// Returns null for a missing or edited-out-of-range score, so the page can
// fall back to a plain "Take the Combine" invite.
export function parseShare(search: Record<string, unknown>): SharedScore | null {
  const overall = score(search.s);
  const wedge = score(search.w);
  const midIron = score(search.i);
  const longGame = score(search.l);
  const driver = score(search.d);
  if (overall === null || wedge === null || midIron === null || longGame === null || driver === null) return null;
  return {
    name: cleanFirstName(search.n),
    overall, wedge, midIron, longGame, driver,
    monitor: search.m === "1" || search.m === 1,
  };
}

// ─── Coming from a shared link ────────────────────────────────────────────────

// Set when a logged-out visitor taps "Take the Combine" on a shared page.
// The source is sent once as a usage event after signup; the landing path
// sends the new user to the Combine when onboarding finishes.
const REF_KEY = "rangeRat_ref";
const LANDING_KEY = "rangeRat_after_onboarding";

export function rememberShareVisit(): void {
  try {
    localStorage.setItem(REF_KEY, "combine_share");
    localStorage.setItem(LANDING_KEY, "/combine");
  } catch {}
}

// Same handoff for a shared range session: after onboarding (or signing in)
// the user lands in Practice with that session ready to run. Signing in to an
// existing account isn't a referred signup, so it skips the referral source.
export function rememberSessionShareVisit(code: string, referral = true): void {
  try {
    if (referral) localStorage.setItem(REF_KEY, "session_share");
    localStorage.setItem(LANDING_KEY, `/practice?shared=${code}`);
  } catch {}
}

export function takeReferralSource(): string | null {
  try {
    const ref = localStorage.getItem(REF_KEY);
    localStorage.removeItem(REF_KEY);
    return ref;
  } catch { return null; }
}

// Only known in-app paths are honored.
export function takeLandingPath(): string {
  try {
    const path = localStorage.getItem(LANDING_KEY);
    localStorage.removeItem(LANDING_KEY);
    if (path === "/combine") return path;
    if (path && /^\/practice\?shared=[a-z0-9]{8}$/.test(path)) return path;
    return "/";
  } catch { return "/"; }
}

// ─── Head-to-head ─────────────────────────────────────────────────────────────

// The score someone was challenged with on a shared page, kept on this device
// until their next finished Combine, then compared on the results screen.
const CHALLENGE_KEY = "rangeRat_challenge";
const CHALLENGE_DAYS = 30;

export interface PendingChallenge {
  name: string;
  overall: number;
  savedAt: number;
}

export function rememberChallenge(s: SharedScore, now = Date.now()): void {
  try {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify({ name: s.name, overall: s.overall, savedAt: now }));
  } catch {}
}

export function loadChallenge(now = Date.now()): PendingChallenge | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CHALLENGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const overall = score(raw.overall);
    const savedAt = typeof raw.savedAt === "number" ? raw.savedAt : NaN;
    if (overall === null || !(now - savedAt <= CHALLENGE_DAYS * 86_400_000)) return null;
    return { name: cleanFirstName(raw.name), overall, savedAt };
  } catch { return null; }
}

export function clearChallenge(): void {
  try { localStorage.removeItem(CHALLENGE_KEY); } catch {}
}

export type ChallengeOutcome = "won" | "lost" | "tied";

export function challengeOutcome(mine: number, theirs: number): { outcome: ChallengeOutcome; margin: number } {
  const margin = Math.abs(mine - theirs);
  return { outcome: mine > theirs ? "won" : mine < theirs ? "lost" : "tied", margin };
}

export function challengeHeadline(mine: number, c: PendingChallenge): string {
  const who = c.name || "your friend";
  const Who = c.name || "Your friend";
  const { outcome, margin } = challengeOutcome(mine, c.overall);
  if (outcome === "won") return `You beat ${who} by ${margin}`;
  if (outcome === "lost") return `${Who} wins by ${margin}`;
  return `Tied with ${who} at ${mine}`;
}

// ─── Score card image ─────────────────────────────────────────────────────────

const CARD_W = 1080;
const CARD_H = 1920;
const NAVY = "#0D2D5A";
const NAVY_DEEP = "#081d3b";
const WHITE = "#ffffff";
const SOFT = "rgba(255,255,255,0.62)";
const TRACK = "rgba(255,255,255,0.14)";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('700 120px "Barlow Condensed"'),
      document.fonts.load('400 80px "Instrument Serif"'),
      document.fonts.load('700 40px "Inter Tight"'),
    ]);
  } catch {}
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // Letter spacing by hand: canvas letterSpacing isn't supported everywhere.
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = x - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx + widths[i] / 2, y);
    cx += widths[i] + spacing;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A 9:16 card for Stories and TikTok, drawn on the phone.
export async function drawScoreCard(s: SharedScore): Promise<Blob | null> {
  await loadFonts();
  const logo = await loadImage("/brand/logo-white-solid.png");
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, NAVY);
  bg.addColorStop(1, NAVY_DEEP);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  if (logo) {
    const h = 150;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, (CARD_W - w) / 2, 150, w, h);
  }

  ctx.fillStyle = SOFT;
  ctx.font = '700 34px "Inter Tight", system-ui, sans-serif';
  spaced(ctx, "RANGE RAT COMBINE", CARD_W / 2, 400, 7);

  if (s.name) {
    ctx.fillStyle = WHITE;
    ctx.font = '400 72px "Instrument Serif", Georgia, serif';
    ctx.fillText(`${s.name} scored`, CARD_W / 2, 530);
  }

  ctx.fillStyle = WHITE;
  ctx.font = '700 380px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText(String(s.overall), CARD_W / 2, 880);

  ctx.font = '400 92px "Instrument Serif", Georgia, serif';
  ctx.fillText(skillLabel(s.overall), CARD_W / 2, 1000);

  ctx.font = '700 30px "Inter Tight", system-ui, sans-serif';
  const tag = s.monitor ? "LAUNCH MONITOR" : "AT THE RANGE";
  const tagW = ctx.measureText(tag).width + 4 * (tag.length - 1) + 64;
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 3;
  roundRect(ctx, (CARD_W - tagW) / 2, 1048, tagW, 64, 32);
  ctx.stroke();
  ctx.fillStyle = SOFT;
  spaced(ctx, tag, CARD_W / 2, 1091, 4);

  const rows: [string, number][] = [
    ["Wedges", s.wedge],
    ["Mid Irons", s.midIron],
    ["Long Game", s.longGame],
    ["Driver", s.driver],
  ];
  const left = 130;
  const right = CARD_W - 130;
  const barX = 400;
  const barW = right - 110 - barX;
  rows.forEach(([label, value], i) => {
    const y = 1230 + i * 95;
    ctx.textAlign = "left";
    ctx.fillStyle = WHITE;
    ctx.font = '600 40px "Inter Tight", system-ui, sans-serif';
    ctx.fillText(label, left, y + 14);
    ctx.fillStyle = TRACK;
    roundRect(ctx, barX, y - 6, barW, 24, 12);
    ctx.fill();
    ctx.fillStyle = WHITE;
    roundRect(ctx, barX, y - 6, Math.max(24, (barW * value) / 100), 24, 12);
    ctx.fill();
    ctx.textAlign = "right";
    ctx.font = '700 58px "Barlow Condensed", Impact, sans-serif';
    ctx.fillText(String(value), right, y + 20);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = WHITE;
  ctx.font = '400 96px "Instrument Serif", Georgia, serif';
  ctx.fillText("Can you beat it?", CARD_W / 2, 1720);
  ctx.fillStyle = SOFT;
  ctx.font = '600 38px "Inter Tight", system-ui, sans-serif';
  ctx.fillText("rangeratapp.com", CARD_W / 2, 1800);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export type ShareResult = "image" | "link" | "copied" | "cancelled" | "failed";

// "an 80", "an 8", "an 11", "an 18"; "a 74" otherwise
function withArticle(n: number): string {
  const an = String(n).startsWith("8") || n === 11 || n === 18;
  return `${an ? "an" : "a"} ${n}`;
}

// After a head-to-head win, the share says who was beaten.
export function shareText(s: SharedScore, beat?: PendingChallenge | null): string {
  if (beat && beat.name && s.overall > beat.overall) {
    return `I beat ${beat.name}'s ${beat.overall} with ${withArticle(s.overall)} on the Range Rat Combine. Can you beat it?`;
  }
  return `I scored ${s.overall} on the Range Rat Combine. Can you beat it?`;
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

// Image card plus link through the phone's share sheet, then link only,
// then copying the link where sharing isn't supported (most desktops).
// The card is drawn ahead of time (drawScoreCard) because Safari only opens
// the share sheet straight from a tap, with no slow work in between.
export async function shareScore(s: SharedScore, url: string, card: Blob | null, beat?: PendingChallenge | null): Promise<ShareResult> {
  const text = shareText(s, beat);
  try {
    if (card && typeof navigator.canShare === "function") {
      const file = new File([card], `range-rat-combine-${s.overall}.png`, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${url}` });
        return "image";
      }
    }
  } catch (e) {
    if (isAbort(e)) return "cancelled";
  }
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ text, url });
      return "link";
    }
  } catch (e) {
    if (isAbort(e)) return "cancelled";
  }
  return copyLink(url);
}

export async function copyLink(url: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
