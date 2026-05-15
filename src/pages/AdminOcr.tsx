import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";

const BATCH = 20;

export default function AdminOcr() {
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [results, setResults] = useState<any[] | null>(null);
  const [running, setRunning] = useState(false);

  const entries = useLiveQuery(
    () => db.entries.where("source").equals("SANU").offset(offset).limit(BATCH).toArray(),
    [offset]
  );

  const reviewed = useQuery({
    queryKey: ["entry_corrections_ids"],
    queryFn: async () => {
      const { data } = await supabase.from("entry_corrections").select("entry_id");
      return new Set((data ?? []).map((r: any) => r.entry_id));
    },
  });

  const accept = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await supabase.from("entry_corrections").insert({
        entry_id: r.id,
        original: r.original,
        corrected: r.corrected,
        confidence: r.confidence,
        status: "accepted",
        reviewed_at: new Date().toISOString(),
      });
      if (error) throw error;
      // Update local Dexie
      const local = await db.entries.get(r.id);
      if (local) {
        await db.entries.put({
          ...local,
          headword: r.corrected.headword,
          accented: r.corrected.accented,
          meanings: [{ ...local.meanings[0], definition: r.corrected.definition }],
          updatedAt: Date.now(),
        });
      }
    },
    onSuccess: () => {
      toast.success("Прихваћено");
      qc.invalidateQueries({ queryKey: ["entry_corrections_ids"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Грешка"),
  });

  const reject = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await supabase.from("entry_corrections").insert({
        entry_id: r.id,
        original: r.original,
        corrected: r.corrected,
        confidence: r.confidence,
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Одбијено");
      qc.invalidateQueries({ queryKey: ["entry_corrections_ids"] });
    },
  });

  const runBatch = async () => {
    if (!entries || entries.length === 0) return;
    setRunning(true);
    setResults(null);
    try {
      const payload = entries.map((e) => ({
        id: e.id,
        headword: e.headword,
        accented: e.accented,
        pos: e.pos,
        definition: e.meanings?.[0]?.definition || "",
      }));
      const { data, error } = await supabase.functions.invoke("ocr-fix", {
        body: { entries: payload },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResults((data as any).results || []);
    } catch (e: any) {
      toast.error(e?.message ?? "Грешка");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-3xl text-primary">OCR исправке</h1>
      <p className="text-sm text-muted-foreground">
        Преглед и AI исправка SANU одредница, у батчевима од {BATCH}.
      </p>

      <div className="paper-card p-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOffset(Math.max(0, offset - BATCH))}
          disabled={offset === 0}
          className="px-3 py-1.5 rounded bg-secondary disabled:opacity-50"
        >
          ← Претходних {BATCH}
        </button>
        <span className="text-sm text-muted-foreground">
          Позиција: {offset + 1} – {offset + (entries?.length ?? 0)}
        </span>
        <button
          onClick={() => setOffset(offset + BATCH)}
          className="px-3 py-1.5 rounded bg-secondary"
        >
          Следећих {BATCH} →
        </button>
        <button
          onClick={runBatch}
          disabled={running || !entries || entries.length === 0}
          className="ml-auto px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {running && <Loader2 className="w-4 h-4 animate-spin" />}
          Анализирај овај батч
        </button>
      </div>

      {results ? (
        <ul className="space-y-3">
          {results.map((r: any) => (
            <li key={r.id} className="paper-card p-4">
              {r.error ? (
                <p className="text-destructive text-sm">{r.id}: {r.error}</p>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="font-semibold text-primary">{r.corrected.accented || r.corrected.headword}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.confidence > 0.8 ? "bg-primary/20" : r.confidence > 0.5 ? "bg-secondary" : "bg-destructive/20"}`}>
                      сигурност {(r.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Оригинал</div>
                      <p>{r.original.accented || r.original.headword}</p>
                      <p className="text-muted-foreground mt-1">{r.original.definition}</p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Предлог</div>
                      <p>{r.corrected.accented || r.corrected.headword}</p>
                      <p className="text-muted-foreground mt-1">{r.corrected.definition}</p>
                    </div>
                  </div>
                  {r.summary && <p className="text-xs italic mt-2 text-muted-foreground">{r.summary}</p>}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => accept.mutate(r)}
                      className="px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Прихвати
                    </button>
                    <button
                      onClick={() => reject.mutate(r)}
                      className="px-3 py-1.5 rounded border border-border hover:bg-secondary inline-flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Одбиј
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1">
          {entries?.map((e) => (
            <li key={e.id} className="paper-card p-3 text-sm flex items-baseline justify-between">
              <span>
                <strong className="text-primary">{e.accented || e.headword}</strong>
                <span className="text-muted-foreground"> — {e.meanings?.[0]?.definition?.slice(0, 80)}…</span>
              </span>
              {reviewed.data?.has(e.id) && (
                <span className="text-xs text-primary">прегледано</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
