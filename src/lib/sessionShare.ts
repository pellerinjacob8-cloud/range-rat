import { fetchSharedSession, insertSharedSession } from "./db";
import { cleanFirstName, copyLink, type ShareResult } from "./combineShare";
import type { PracticeBlock } from "./practicePlan";

// A range session sent to someone else as a /s/<code> link. The blocks are
// stored in shared_sessions; the link only carries the code.

export const SHARE_CODE_RE = /^[a-z0-9]{8}$/;
const MAX_BLOCKS = 40;

// No 0/o or 1/l, so a code read out loud or retyped still works.
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function newShareCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function sessionShareUrl(origin: string, code: string): string {
  return `${origin}/s/${code}`;
}

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Only the fields the runner needs; Built for you marks are dropped because
// they describe the sender's rounds, not the receiver's.
function cleanBlock(raw: unknown, i: number): PracticeBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const balls = typeof b.balls === "number" && Number.isFinite(b.balls) ? Math.round(b.balls) : NaN;
  const club = text(b.club, 40);
  const cue = text(b.cue, 200);
  if (!club || !cue || !(balls >= 1 && balls <= 200)) return null;
  const detail = text(b.detail, 600);
  return {
    id: `shared-${i}`,
    section: text(b.section, 40) || "Practice",
    club,
    balls,
    unit: b.unit === "min" ? "min" : "balls",
    cue,
    ...(detail ? { detail } : {}),
  };
}

export function cleanBlocks(raw: unknown): PracticeBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_BLOCKS).map(cleanBlock).filter((b): b is PracticeBlock => b !== null);
}

export interface SharedSession {
  senderName: string;
  name: string;
  blocks: PracticeBlock[];
}

// null for an unknown, empty or broken share; throws if the lookup itself fails.
export async function loadSharedSession(code: string): Promise<SharedSession | null> {
  if (!SHARE_CODE_RE.test(code)) return null;
  const row = await fetchSharedSession(code);
  if (!row) return null;
  const blocks = cleanBlocks(row.blocks);
  if (blocks.length === 0) return null;
  return { senderName: cleanFirstName(row.senderName), name: text(row.name, 80) || "Range session", blocks };
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

// Saves the share and opens the phone's share sheet. The share sheet is
// opened right away (Safari only allows it straight from a tap), while the
// row saves in the background; a failed save still reports "failed".
export async function shareSession(name: string, blocks: PracticeBlock[], senderFirstName: string): Promise<ShareResult> {
  const code = newShareCode();
  const sender = cleanFirstName(senderFirstName);
  const title = name.trim().slice(0, 80) || "Range session";
  const payload = blocks.slice(0, MAX_BLOCKS).map(({ section, club, balls, unit, cue, detail }) => ({
    section, club, balls, unit, cue, ...(detail ? { detail } : {}),
  }));
  const saved = insertSharedSession(code, sender, title, payload).then(() => true, () => false);
  const url = sessionShareUrl(window.location.origin, code);
  const message = `${sender ? `${sender} sent you` : "Here's"} a range session on Range Rat: ${title}`;

  let result: ShareResult;
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ text: message, url });
      result = "link";
    } else {
      result = await copyLink(url);
    }
  } catch (e) {
    result = isAbort(e) ? "cancelled" : await copyLink(url);
  }
  if (result === "cancelled") return result;
  return (await saved) ? result : "failed";
}
