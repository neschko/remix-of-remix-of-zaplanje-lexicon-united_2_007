import { useEffect, useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  type Comment,
  listComments,
  postComment,
  deleteComment,
} from "@/lib/community/api";
import { getDeviceId, getDeviceName, setDeviceName } from "@/lib/device";

export function CommentsSection({ entryId }: { entryId: string }) {
  const myId = getDeviceId();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState(getDeviceName());
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setComments(await listComments(entryId));
    } catch (e: any) {
      toast.error("Грешка при учитавању коментара");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      if (author.trim()) setDeviceName(author);
      await postComment(entryId, body);
      setBody("");
      refresh();
    } catch (e: any) {
      toast.error("Грешка: " + (e?.message || "непознато"));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteComment(id);
      refresh();
    } catch (e: any) {
      toast.error("Не могу да обришем коментар");
    }
  }

  return (
    <section className="paper-card p-6 mt-4">
      <h2 className="text-xl font-semibold text-primary mb-3">Коментари</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Учитавам…
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Још нема коментара. Буди први.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="border-l-2 border-primary/40 pl-3">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{c.author_name || "уређај"}</span>
                <span>·</span>
                <span>{new Date(c.created_at).toLocaleString("sr-Cyrl-RS")}</span>
                {c.device_id === myId && (
                  <button
                    onClick={() => remove(c.id)}
                    className="ml-auto text-destructive hover:underline inline-flex items-center gap-1"
                    aria-label="Обриши"
                  >
                    <Trash2 className="w-3 h-3" /> обриши
                  </button>
                )}
              </div>
              <p className="text-foreground/90 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 space-y-2">
        <Textarea
          placeholder="Напиши коментар…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Твоје име (опционо)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={submit} disabled={submitting || !body.trim()} className="ml-auto gap-1.5">
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Пошаљи
          </Button>
        </div>
      </div>
    </section>
  );
}
