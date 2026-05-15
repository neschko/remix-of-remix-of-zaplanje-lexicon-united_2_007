import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { db } from "@/lib/db";

export default function CategoryPage() {
  const { naziv = "" } = useParams();
  const category = decodeURIComponent(naziv);

  const entries = useLiveQuery(async () => {
    const rows = await db.entries.where("category").equals(category).toArray();
    return rows.sort((a, b) => {
      if (a.sanuVerified !== b.sanuVerified) return a.sanuVerified ? -1 : 1;
      return a.headword.localeCompare(b.headword, "sr");
    });
  }, [category]);

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Почетна</Link>
        <h1 className="text-3xl">{category}</h1>
        <span className="text-muted-foreground">{entries?.length ?? 0} одредница</span>
      </div>
      <div className="paper-card divide-y divide-border">
        {entries?.map((e) => (
          <Link
            key={e.id}
            to={`/rec/${encodeURIComponent(e.id)}`}
            className="block p-3 hover:bg-secondary"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-primary">{e.accented || e.headword}</span>
              {e.pos && <span className="text-xs italic text-muted-foreground">{e.pos}</span>}
              {e.sanuVerified && <span className="sanu-badge">SANU</span>}
            </div>
            <div className="text-sm text-foreground/80 mt-1 line-clamp-2">
              {e.meanings[0]?.definition}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
