// Club ordering for the Bag (driver first) and Club Yardages (shortest
// club first). Club names are free text, so numbers and lofts are read from
// the name when a club has no iron number.

export interface OrderClub {
  id: string;
  name: string;
  type: string;
  parentSetId?: string;
  ironNumber?: number;
}

// "2 Iron", "2i", "3 Wood", "4h" -> 2, 2, 3, 4. Unknown -> null.
export function clubNumber(c: OrderClub): number | null {
  if (c.ironNumber !== undefined) return c.ironNumber;
  const m = c.name.toLowerCase().match(/\b(\d{1,2})\s*-?\s*(i|iron|h|hybrid|w|wood)\b/);
  return m ? Number(m[1]) : null;
}

// Wedge loft from "56°", "Vokey SM10 60", or the wedge's name.
export function wedgeLoft(c: OrderClub): number {
  if (c.ironNumber === 10) return 46; // PW inside an iron set
  const name = c.name.toLowerCase();
  const deg = [...name.matchAll(/\d{2}/g)].map((m) => Number(m[0])).find((n) => n >= 44 && n <= 64);
  if (deg !== undefined) return deg;
  if (name.includes("lob")) return 60;
  if (name.includes("sand")) return 56;
  if (name.includes("gap") || name.includes("approach")) return 52;
  if (name.includes("pitch")) return 46;
  return 50;
}

const isWedge = (c: OrderClub) => c.type === "wedge" || c.ironNumber === 10;

/**
 * Bag order: driver, woods, hybrids, irons, wedges, putter. Iron-set children
 * follow their set row; an iron outside the set sits by its number, so a
 * loose 2 iron comes before a 4-9 set instead of after the 9 iron.
 */
export function sortForBag<T extends OrderClub>(clubs: T[]): T[] {
  const byType = (t: string) => clubs.filter((c) => c.type === t && !c.parentSetId);
  const result: T[] = [...byType("driver"), ...byType("wood"), ...byType("hybrid")];

  const units: { key: number; clubs: T[] }[] = [];
  for (const set of byType("iron-set")) {
    const children = clubs
      .filter((c) => c.parentSetId === set.id)
      .sort((a, b) => (a.ironNumber ?? 99) - (b.ironNumber ?? 99));
    const first = children.map(clubNumber).find((n) => n !== null);
    units.push({ key: first ?? 99, clubs: [set, ...children] });
  }
  for (const iron of clubs.filter((c) => c.type === "iron" && !c.parentSetId)) {
    units.push({ key: clubNumber(iron) ?? 99, clubs: [iron] });
  }
  units.sort((a, b) => a.key - b.key); // stable: ties keep bag order
  for (const u of units) result.push(...u.clubs);

  result.push(...byType("wedge"), ...byType("putter"));
  return result;
}

/**
 * Yardage order, shortest to longest: wedges from highest loft, irons 9 down
 * to 2, hybrids, woods, driver. Iron-set rows and putters are left out.
 */
export function sortForYardages<T extends OrderClub>(clubs: T[]): T[] {
  const group = (c: T) =>
    isWedge(c) ? 0 : c.type === "iron" ? 1 : c.type === "hybrid" ? 2 : c.type === "wood" ? 3 : c.type === "driver" ? 4 : 5;
  // Higher number or loft = shorter club. Unknown numbers go last in their group.
  const shortness = (c: T) => (isWedge(c) ? wedgeLoft(c) : clubNumber(c) ?? 0);
  return clubs
    .filter((c) => c.type !== "iron-set" && c.type !== "putter")
    .map((c, i) => ({ c, i }))
    .sort((a, b) => group(a.c) - group(b.c) || shortness(b.c) - shortness(a.c) || a.i - b.i)
    .map(({ c }) => c);
}
