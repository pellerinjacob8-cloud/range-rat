import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { fetchHandicapHistory, deleteHandicapSnapshot, type HandicapSnapshot } from "@/lib/db";

export const Route = createFileRoute("/profile/round-history")({
  head: () => ({
    meta: [{ title: "Round History — Range Rat" }],
  }),
  component: RoundHistoryPage,
});

function RoundHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HandicapSnapshot[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchHandicapHistory().then(h => setHistory([...h].reverse()));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteHandicapSnapshot(id);
    setHistory(prev => prev.filter(h => h.id !== id));
    setDeleting(null);
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppShell>
      <div className="pb-10 pt-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/profile" })}
          className="flex items-center gap-1 text-primary text-[14px] font-semibold mb-4 -ml-1"
        >
          <ChevronLeft className="h-5 w-5" /> Profile
        </button>

        <div className="flex items-baseline justify-between mb-5">
          <h1 className="font-display text-[32px]">Round History</h1>
          {history.length > 0 && (
            <p className="text-[12px] text-muted-foreground">{history.length} round{history.length !== 1 ? "s" : ""} logged</p>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-[14px] text-muted-foreground text-center mt-12">No rounds logged yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => (
              <div key={entry.id} className="rounded-[18px] border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {fmt(entry.recordedAt)}
                    </p>
                    {i === 0 && (
                      <span className="rounded-full border border-gold-border bg-gold-bg text-gold text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5">
                        Latest
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    aria-label="Delete entry"
                    className="rounded-full p-1.5 text-muted-foreground transition active:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="font-stats text-[36px] leading-none text-primary">{entry.handicap}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">Handicap Index</p>

                {(entry.gir !== undefined || entry.fairways !== undefined || entry.putts !== undefined || entry.upAndDowns !== undefined) && (
                  <div className="grid grid-cols-4 gap-2 border-t border-border pt-3">
                    {[
                      { label: "GIR", value: entry.gir !== undefined ? `${entry.gir}%` : "—" },
                      { label: "FWY", value: entry.fairways !== undefined ? `${entry.fairways}%` : "—" },
                      { label: "PUTTS", value: entry.putts !== undefined ? String(entry.putts) : "—" },
                      { label: "U & D", value: entry.upAndDowns !== undefined ? String(entry.upAndDowns) : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                        <p className="mt-0.5 font-stats text-[18px] leading-none text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
