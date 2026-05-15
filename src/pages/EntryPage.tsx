import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { db } from "@/lib/db";
import { CommentsSection } from "@/components/CommentsSection";

export default function EntryPage() {
  const { id = "" } = useParams();
  const entryId = decodeURIComponent(id);
  const entry = useLiveQuery(() => db.entries.get(entryId), [entryId]);

  if (!entry) {
    return <div className="text-muted-foreground">Учитавам одредницу…</div>;
  }

  return (
    <article className="max-w-3xl mx-auto">
      <div className="mb-4 text-sm text-muted-foreground flex gap-3">
        <Link to="/" className="hover:text-primary">Почетна</Link>
        <span>›</span>
        <Link to={`/recnik/${encodeURIComponent(entry.letter)}`} className="hover:text-primary">
          Слово {entry.letter}
        </Link>
      </div>

      <header className="paper-card p-6 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-bold">{entry.accented || entry.headword}</h1>
          {entry.sanuVerified && <span className="sanu-badge">SANU</span>}
        </div>
        <div className="mt-2 text-sm text-muted-foreground italic">
          {entry.posFull || entry.pos}
          {entry.grammar && <span className="ml-2">({entry.grammar})</span>}
          {entry.category && <span className="ml-2">· {entry.category}</span>}
        </div>
        {entry.etymology && (
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">Етимологија: </span>
            {entry.etymology}
          </div>
        )}
      </header>

      <section className="paper-card p-6 space-y-5">
        {entry.meanings.map((m) => (
          <div key={m.number}>
            <div className="flex items-baseline gap-2">
              <span className="text-primary font-semibold">{m.number}.</span>
              <p className="text-foreground">{m.definition}</p>
            </div>
            {m.qualifiers && m.qualifiers.length > 0 && (
              <div className="ml-6 mt-1 text-xs text-muted-foreground italic">
                {m.qualifiers.join(", ")}
              </div>
            )}
            {m.synonyms && m.synonyms.length > 0 && (
              <div className="ml-6 mt-1 text-sm">
                <span className="text-muted-foreground">синоними: </span>
                {m.synonyms.join(", ")}
              </div>
            )}
            {m.examples && m.examples.length > 0 && (
              <ul className="ml-6 mt-2 space-y-1 text-sm">
                {m.examples.map((ex, i) => (
                  <li key={i} className="text-foreground/80 italic">— {ex.text}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <CommentsSection entryId={entry.id} />
    </article>
  );
}
