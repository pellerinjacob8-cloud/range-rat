import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Printer, Ruler, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProModal } from "@/components/ProModal";
import { useAuth } from "@/context/AuthContext";
import { fetchBag, fetchYardages, type Club, type YardageMap } from "@/lib/db";
import { sortForYardages } from "@/lib/clubOrder";
import { loadProfileFullName } from "@/lib/profile";
import { track } from "@/lib/trackEvent";

// Yardage card: a big-text view to check on the course (free), and a
// print layout sized for a yardage book (Pro).
export const Route = createFileRoute("/yardages")({
  head: () => ({
    meta: [
      { title: "Range Rat: Yardages" },
      { name: "description", content: "Your club yardages at a glance." },
    ],
  }),
  component: YardagesPage,
});

// Same localStorage copies the Profile bag and yardage editors keep
const BAG_KEY = "rangeRat_bag";
const YARDAGE_KEY = "rangeRat_yardages";

function readLocal<T>(key: string, fallback: T): T {
  try { return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback; }
  catch { return fallback; }
}

type Col = "halfSwing" | "threeQuarterSwing" | "fullSwing";
const COLS: { key: Col; label: string }[] = [
  { key: "halfSwing", label: "½" },
  { key: "threeQuarterSwing", label: "¾" },
  { key: "fullSwing", label: "Full" },
];

// Print card size in inches (an index card that fits a yardage book).
const CARD_W = 3;
const CARD_H = 5;

function YardagesPage() {
  const navigate = useNavigate();
  const { isPro } = useAuth();
  const [clubs, setClubs] = useState<Club[]>(() => sortForYardages(readLocal<Club[]>(BAG_KEY, [])));
  const [yardages, setYardages] = useState<YardageMap>(() => readLocal<YardageMap>(YARDAGE_KEY, {}));
  const [showPro, setShowPro] = useState(false);

  useEffect(() => {
    fetchBag().then((b) => { if (b.length > 0) setClubs(sortForYardages(b)); }).catch(() => {});
    fetchYardages().then((y) => { if (Object.keys(y).length > 0) setYardages(y); }).catch(() => {});
  }, []);

  const value = (id: string, col: Col) => yardages[id]?.[col] ?? null;
  const filled = clubs.filter((c) => COLS.some((col) => value(c.id, col.key) !== null));
  // Only show the half and three-quarter columns when any club has one
  const cols = COLS.filter((col) => col.key === "fullSwing" || filled.some((c) => value(c.id, col.key) !== null));
  const editYardages = () => navigate({ to: "/profile", search: { view: "yardage" } });

  const print = () => {
    if (!isPro) { setShowPro(true); return; }
    track("yardages_printed", { clubs: filled.length });
    window.print();
  };

  return (
    <>
      <div className="print:hidden">
        <AppShell showBack>
          <div className="pb-10">
            <p className="pt-2 text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">On course</p>
            <h1 className="mt-2 font-display text-[42px] leading-[0.98] tracking-[-0.01em]">Yardages.</h1>

            {filled.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
                <Ruler className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-display text-[24px] leading-tight">No yardages yet</p>
                <p className="mt-1 text-[14px] text-muted-foreground">Add how far you carry each club and they'll show here, ready for the course.</p>
                <button
                  type="button"
                  onClick={editYardages}
                  className="mt-5 h-12 w-full rounded-[14px] bg-primary text-primary-foreground font-bold text-[14px] uppercase tracking-[0.06em] active:opacity-90"
                >
                  Add yardages
                </button>
              </div>
            ) : (
              <>
                <p className="mt-3 text-[14px] text-muted-foreground">Carry distance in yards.</p>
                <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="grid items-center px-4 py-2.5 border-b border-border bg-muted/40" style={{ gridTemplateColumns: `1fr repeat(${cols.length}, 4.25rem)` }}>
                    <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">Club</span>
                    {cols.map((col) => (
                      <span key={col.key} className="text-right text-[12px] font-bold uppercase tracking-widest text-muted-foreground">{col.label}</span>
                    ))}
                  </div>
                  {filled.map((c) => (
                    <div key={c.id} className="grid items-center px-4 py-3 border-b border-border last:border-0" style={{ gridTemplateColumns: `1fr repeat(${cols.length}, 4.25rem)` }}>
                      <span className="text-[17px] font-semibold truncate pr-2">{c.name}</span>
                      {cols.map((col) => {
                        const v = value(c.id, col.key);
                        return (
                          <span
                            key={col.key}
                            className={col.key === "fullSwing"
                              ? "text-right font-stats text-[30px] leading-none tabular-nums text-primary"
                              : "text-right font-stats text-[22px] leading-none tabular-nums text-muted-foreground"}
                          >
                            {v ?? "–"}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={editYardages}
                    className="h-12 rounded-[14px] border border-border bg-card text-[14px] font-bold uppercase tracking-[0.06em] inline-flex items-center justify-center gap-2 active:bg-muted"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={print}
                    className="h-12 rounded-[14px] bg-primary text-primary-foreground text-[14px] font-bold uppercase tracking-[0.06em] inline-flex items-center justify-center gap-2 active:opacity-90"
                  >
                    {isPro ? <Printer className="h-4 w-4" /> : <Zap className="h-4 w-4" />} Print card
                  </button>
                </div>
                <p className="mt-2 text-center text-[13px] text-muted-foreground">
                  {isPro ? "Sized for a yardage book. Save as PDF from the print screen." : "Printable yardage book card is a Pro feature."}
                </p>
              </>
            )}
          </div>
        </AppShell>
      </div>

      {isPro && filled.length > 0 && <PrintCard clubs={filled} cols={cols} value={value} />}

      <ProModal
        open={showPro}
        onClose={() => setShowPro(false)}
        feature="yardage_print"
        reason="Print your yardages on a card sized for your yardage book. Go Pro to unlock it."
      />
    </>
  );
}

// Only shown when printing. A 3 x 5 inch card with a thin cut line, so it
// fits a yardage book even when the printer uses letter paper.
function PrintCard({ clubs, cols, value }: {
  clubs: Club[];
  cols: { key: Col; label: string }[];
  value: (id: string, col: Col) => number | null;
}) {
  const name = loadProfileFullName();
  const date = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  // Shrink rows to fit long bags on one card
  const rowPt = Math.max(9, Math.min(14, Math.floor(160 / Math.max(clubs.length, 1))));
  return (
    <div className="hidden print:block">
      <style>{`@media print { @page { size: ${CARD_W}in ${CARD_H}in; margin: 0; } html, body { background: #fff !important; } }`}</style>
      <div
        style={{ width: `${CARD_W}in`, height: `${CARD_H}in`, padding: "0.2in", boxSizing: "border-box", border: "0.5pt dashed #999", color: "#000", fontFamily: "'Inter Tight', system-ui, sans-serif", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1pt solid #000", paddingBottom: "4pt" }}>
          <span style={{ fontSize: "12pt", fontWeight: 700 }}>{name || "Yardages"}</span>
          <span style={{ fontSize: "8pt", color: "#555" }}>{date}</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "4pt", fontSize: `${rowPt}pt` }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontSize: "7pt", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2pt 0", color: "#555" }}>Club</th>
              {cols.map((col) => (
                <th key={col.key} style={{ textAlign: "right", fontSize: "7pt", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2pt 0", color: "#555", width: "0.45in" }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clubs.map((c) => (
              <tr key={c.id} style={{ borderTop: "0.5pt solid #ccc" }}>
                <td style={{ padding: "2pt 0", fontWeight: 600 }}>{c.name}</td>
                {cols.map((col) => (
                  <td key={col.key} style={{ textAlign: "right", padding: "2pt 0", fontWeight: col.key === "fullSwing" ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>
                    {value(c.id, col.key) ?? "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: "7pt", color: "#777", textAlign: "center" }}>Carry yards · Range Rat</div>
      </div>
    </div>
  );
}
