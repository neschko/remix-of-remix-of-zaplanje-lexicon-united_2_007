import { useState } from "react";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { useLiveQuery } from "dexie-react-hooks";

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
        <h2 className="text-lg">Радње</h2>
        <button
          onClick={exportJson}
          className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90"
        >
          Извези цео речник (JSON)
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 rounded bg-destructive text-destructive-foreground hover:opacity-90 ml-2"
        >
          Ресетуј и поново учитај SANU
        </button>
        {busy && <p className="text-sm text-muted-foreground">{busy}</p>}
      </section>

      <section className="paper-card p-5">
        <h2 className="text-lg mb-2">SANU формат</h2>
        <p className="text-sm text-muted-foreground">
          Унос се чува у канонском SANU формату: одредница, акценат, граматичке
          ознаке, нумерисана значења са дефиницијама и потврдама. Извори SANU
          имају приоритет при сортирању и приказу.
        </p>
      </section>
    </div>
  );
}
