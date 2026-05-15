import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { community } from "@/lib/community/client";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { MessageSquare } from "lucide-react";

export default function Komentari() {
  const comments = useQuery({
    queryKey: ["all_comments"],
    queryFn: async () => {
      const { data, error } = await community
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const allEntries = useLiveQuery(() => db.entries.toArray(), []);
  const entryMap = new Map(allEntries?.map((e) => [e.id, e]) ?? []);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl text-primary flex items-center gap-2">
          <MessageSquare className="w-7 h-7" /> Сви коментари
        </h1>
        <p className="text-sm text-muted-foreground">Скорашњи коментари на одредницама речника.</p>
      </div>

      {comments.isLoading ? (
        <p className="text-muted-foreground">Учитавам…</p>
      ) : comments.data && comments.data.length > 0 ? (
        <ul className="space-y-3">
          {comments.data.map((c: any) => {
            const entry = entryMap.get(c.entry_id);
            return (
              <li key={c.id} className="paper-card p-4">
                <div className="flex items-baseline justify-between mb-1">
                  <Link
                    to={`/rec/${c.entry_id}`}
                    className="text-primary font-semibold hover:underline"
                  >
                    {entry?.accented || entry?.headword || c.entry_id}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("sr-Cyrl")}
                  </span>
                </div>
                <p className="text-sm">{c.body}</p>
                {c.author_name && (
                  <p className="text-xs text-muted-foreground mt-1">— {c.author_name}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">Још нема коментара.</p>
      )}
    </div>
  );
}
