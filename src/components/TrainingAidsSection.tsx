import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { cleanAidName, fetchTrainingAids, loadCachedAids, MAX_AID_LENGTH, MAX_AIDS, saveTrainingAids } from "@/lib/trainingAids";

// "My aids" in the bag editor: the training aids this golfer owns, typed by
// them. The session builder lets them put one on any block.
export function TrainingAidsSection() {
  const [aids, setAids] = useState<string[]>(loadCachedAids);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    fetchTrainingAids().then(setAids).catch(() => {});
    // Opened from Home's Finish your setup card
    if (window.location.hash === "#training-aids") {
      setTimeout(() => document.getElementById("training-aids")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, []);

  const persist = (next: string[]) => {
    setAids(next);
    saveTrainingAids(next).catch(() => toast.error("Couldn't save your training aids. Check your connection and try again."));
  };

  const add = () => {
    const name = cleanAidName(draft);
    if (!name) return;
    if (aids.some((a) => a.toLowerCase() === name.toLowerCase())) { setDraft(""); return; }
    persist([...aids, name]);
    setDraft("");
  };

  return (
    <section id="training-aids" className="mt-10 scroll-mt-6">
      <h2 className="font-display text-[26px] leading-tight">Training Aids</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        Add the aids you own, like alignment sticks or impact tape. When you build a session, you can put one on any block.
      </p>

      {aids.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {aids.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded-full border border-border bg-card pl-3 pr-1 py-1 text-[13.5px] font-semibold">
              {a}
              <button
                type="button"
                aria-label={`Remove ${a}`}
                onClick={() => persist(aids.filter((x) => x !== a))}
                className="rounded-full p-1 text-muted-foreground active:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {aids.length < MAX_AIDS && (
        <div className="mt-4 flex gap-2">
          <input
            id="new-training-aid"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="e.g. Alignment sticks"
            maxLength={MAX_AID_LENGTH}
            className="h-11 min-w-0 flex-1 rounded-[12px] border border-border bg-background px-3 text-[15px] outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="h-11 shrink-0 rounded-[12px] bg-primary px-4 text-[14px] font-bold text-primary-foreground disabled:opacity-40 active:opacity-90 inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      )}
    </section>
  );
}
