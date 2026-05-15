import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { ALPHABET, stripAccents } from "@/lib/sanu/normalize";
import { Search } from "lucide-react";

export default function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const total = useLiveQuery(() => db.entries.count(), []);
  const letterCounts = useLiveQuery(async () => {
    const rows = await db.entries.toArray();
    const map: Record<string, number> = {};
    for (const e of rows) map[e.letter] = (map[e.letter] || 0) + 1;
    return map;
  }, []);
  const categories = useLiveQuery(async () => {
    const rows = await db.entries.toArray();
    const map: Record<string, number> = {};
    for (const e of rows) {
      const c = e.category || "Остало";
      map[c] = (map[c] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);

  const results = useLiveQuery(async () => {
    const term = stripAccents(q.trim().toLowerCase());
    if (!term) return [];
    const all = await db.entries.toArray();
    return all
      .filter((e) => {
        if (e.headword.toLowerCase().includes(term)) return true;
        return e.meanings.some((m) => stripAccents(m.definition.toLowerCase()).includes(term));
      })
      .sort((a, b) => Number(b.sanuVerified) - Number(a.sanuVerified))
      .slice(0, 30);
  }, [q]);

  const sortedCategories = useMemo(() => categories ?? [], [categories]);

  return (
    <div className="space-y-8">
      <section className="text-center pt-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Заплањски Речник</h1>
        <p className="text-muted-foreground">
          {total != null ? `${total.toLocaleString("sr-Cyrl")} одредница` : "учитавање…"}
          {" · "}SANU издање · ради без интернета
        </p>
      </section>

      <section className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Тражи реч, дефиницију или синоним…"
            className="w-full pl-10 pr-4 py-3 rounded-md bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {q && results && (
          <div className="paper-card mt-2 max-h-80 overflow-auto divide-y divide-border">
            {results.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Нема резултата.</div>
            )}
            {results.map((e) => (
              <button
                key={e.id}
                onClick={() => nav(`/rec/${encodeURIComponent(e.id)}`)}
                className="w-full text-left p-3 hover:bg-secondary"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">{e.accented || e.headword}</span>
                  {e.pos && <span className="text-xs text-muted-foreground italic">{e.pos}</span>}
                  {e.sanuVerified && <span className="sanu-badge">SANU</span>}
                </div>
                <div className="text-sm text-foreground/80 line-clamp-1">
                  {e.meanings[0]?.definition}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl mb-3">Азбука</h2>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {ALPHABET.map((l) => {
            const c = letterCounts?.[l] ?? 0;
            return (
              <Link
                key={l}
                to={`/recnik/${encodeURIComponent(l)}`}
                className="paper-card p-3 text-center hover:bg-secondary transition-colors"
              >
                <div className="text-2xl font-semibold text-primary">{l}</div>
                <div className="text-xs text-muted-foreground">{c}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-3">Тематске категорије</h2>
        <div className="flex flex-wrap gap-2">
          {sortedCategories.map(([name, n]) => (
            <Link
              key={name}
              to={`/kategorija/${encodeURIComponent(name)}`}
              className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {name} <span className="text-muted-foreground">· {n}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
