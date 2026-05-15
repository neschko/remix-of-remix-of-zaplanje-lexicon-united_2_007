import { useState } from "react";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { useLiveQuery } from "dexie-react-hooks";
import { exportPdf, exportDocx } from "@/lib/exporters";
import { FileText, FileType, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Manage() {
  const [busy, setBusy] = useState<string | null>(null);
  const total = useLiveQuery(() => db.entries.count(), []);
  const sanuCount = useLiveQuery(
    () => db.entries.filter((e) => e.sanuVerified === true).count(),
    []
  );

  const reset = async () => {
    if (!confirm("Обрисати локалну базу и поново учитати SANU корпус?")) return;
    setBusy("Бришем…");
    await db.delete();
    await db.open();
    setBusy("Учитавам корпус…");
    await ensureSeeded((m) => setBusy(m));
    setBusy(null);
    location.reload();
  };

  const exportJson = async () => {
    const rows = await db.entries.toArray();
    const blob = new Blob([JSON.stringify({ format: "sanu-zaplanjski", version: 1, entries: rows }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zaplanjski-recnik-sanu-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doExport = async (kind: "pdf" | "docx") => {
    setBusy(`Припремам ${kind.toUpperCase()}…`);
    try {
      const rows = await db.entries.toArray();
      if (kind === "pdf") await exportPdf(rows);
      else await exportDocx(rows);
      toast.success(`${kind.toUpperCase()} извезен`);
    } catch (e: any) {
      toast.error(e?.message ?? "Грешка");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl">Управљање</h1>

      <section className="paper-card p-5">
        <h2 className="text-lg mb-2">Стање корпуса</h2>
        <p className="text-sm text-muted-foreground">
          Укупно одредница: <strong>{total ?? "…"}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          SANU верификовано: <strong>{sanuCount ?? "…"}</strong>
        </p>
      </section>

      <section className="paper-card p-5 space-y-3">
        <h2 className="text-lg">Извоз речника</h2>
        <p className="text-sm text-muted-foreground">Свих {total ?? "…"} одредница, спремно за штампу.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => doExport("pdf")}
            disabled={!!busy}
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => doExport("docx")}
            disabled={!!busy}
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileType className="w-4 h-4" /> Word (DOCX)
          </button>
          <button
            onClick={exportJson}
            disabled={!!busy}
            className="px-4 py-2 rounded border border-border hover:bg-secondary disabled:opacity-50"
          >
            JSON
          </button>
        </div>
      </section>

      <section className="paper-card p-5 space-y-3">
        <h2 className="text-lg">Радње</h2>
        <button
          onClick={reset}
          disabled={!!busy}
          className="px-4 py-2 rounded bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50"
        >
          Ресетуј и поново учитај SANU
        </button>
        {busy && (
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> {busy}
          </p>
        )}
      </section>
    </div>
  );
}
