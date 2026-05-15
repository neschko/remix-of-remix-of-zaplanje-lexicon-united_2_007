import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Plus, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  type CommunityEntry,
  type PublishedDictionary,
  createCommunityEntry,
  listCommunityEntries,
  listPublishedDictionaries,
  listVotesFor,
  toggleVote,
} from "@/lib/community/api";
import { getDeviceId, getDeviceName, setDeviceName } from "@/lib/device";

type VoteMap = Record<string, { count: number; mine: boolean }>;

function buildVoteMap(
  rows: { target_id: string; device_id: string }[],
  myDeviceId: string
): VoteMap {
  const map: VoteMap = {};
  for (const r of rows) {
    if (!map[r.target_id]) map[r.target_id] = { count: 0, mine: false };
    map[r.target_id].count += 1;
    if (r.device_id === myDeviceId) map[r.target_id].mine = true;
  }
  return map;
}

export default function Zajednicki() {
  const myId = getDeviceId();
  const [tab, setTab] = useState("entries");

  const [entries, setEntries] = useState<CommunityEntry[]>([]);
  const [entryVotes, setEntryVotes] = useState<VoteMap>({});
  const [loadingEntries, setLoadingEntries] = useState(true);

  const [dicts, setDicts] = useState<PublishedDictionary[]>([]);
  const [dictVotes, setDictVotes] = useState<VoteMap>({});
  const [loadingDicts, setLoadingDicts] = useState(true);

  async function refreshEntries() {
    setLoadingEntries(true);
    try {
      const list = await listCommunityEntries();
      setEntries(list);
      const votes = await listVotesFor(
        "community_entry",
        list.map((e) => e.id)
      );
      setEntryVotes(buildVoteMap(votes, myId));
    } catch (e: any) {
      toast.error("Грешка при учитавању: " + (e?.message || "непознато"));
    } finally {
      setLoadingEntries(false);
    }
  }

  async function refreshDicts() {
    setLoadingDicts(true);
    try {
      const list = await listPublishedDictionaries();
      setDicts(list);
      const votes = await listVotesFor(
        "published_dictionary",
        list.map((d) => d.id)
      );
      setDictVotes(buildVoteMap(votes, myId));
    } catch (e: any) {
      toast.error("Грешка при учитавању речника: " + (e?.message || "непознато"));
    } finally {
      setLoadingDicts(false);
    }
  }

  useEffect(() => {
    refreshEntries();
    refreshDicts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onVoteEntry(id: string) {
    const prev = entryVotes[id] || { count: 0, mine: false };
    const next = { count: prev.count + (prev.mine ? -1 : 1), mine: !prev.mine };
    setEntryVotes({ ...entryVotes, [id]: next });
    try {
      await toggleVote("community_entry", id);
    } catch (e: any) {
      setEntryVotes({ ...entryVotes, [id]: prev });
      toast.error("Грешка: " + (e?.message || "непознато"));
    }
  }

  async function onVoteDict(id: string) {
    const prev = dictVotes[id] || { count: 0, mine: false };
    const next = { count: prev.count + (prev.mine ? -1 : 1), mine: !prev.mine };
    setDictVotes({ ...dictVotes, [id]: next });
    try {
      await toggleVote("published_dictionary", id);
    } catch (e: any) {
      setDictVotes({ ...dictVotes, [id]: prev });
      toast.error("Грешка: " + (e?.message || "непознато"));
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="paper-card p-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Заједнички речник</h1>
        <p className="text-sm text-muted-foreground">
          Нове речи и објављени речници других корисника. Један глас по уређају —
          поновни клик уклања глас.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="entries">Нове речи</TabsTrigger>
            <TabsTrigger value="dicts">Објављени речници</TabsTrigger>
          </TabsList>
          {tab === "entries" && <NewEntryDialog onCreated={refreshEntries} />}
        </div>

        <TabsContent value="entries" className="mt-4">
          {loadingEntries ? (
            <Loading />
          ) : entries.length === 0 ? (
            <EmptyState text="Још нема предложених речи. Буди први!" />
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => {
                const v = entryVotes[e.id] || { count: 0, mine: false };
                return (
                  <li key={e.id} className="paper-card p-4">
                    <div className="flex items-start gap-3">
                      <VoteButton
                        count={v.count}
                        mine={v.mine}
                        onClick={() => onVoteEntry(e.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h3 className="text-xl font-semibold text-primary">
                            {e.headword}
                          </h3>
                          {e.type_full && (
                            <span className="text-xs italic text-muted-foreground">
                              {e.type_full}
                            </span>
                          )}
                          {e.category && (
                            <span className="text-xs text-muted-foreground">
                              · {e.category}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-foreground/90">{e.definition}</p>
                        {e.examples && e.examples.length > 0 && (
                          <ul className="mt-2 text-sm space-y-0.5">
                            {e.examples.map((ex, i) => (
                              <li key={i} className="italic text-foreground/70">
                                — {ex}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {e.author_name || "уређај"} ·{" "}
                          {new Date(e.created_at).toLocaleDateString("sr-Cyrl-RS")}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="dicts" className="mt-4">
          {loadingDicts ? (
            <Loading />
          ) : dicts.length === 0 ? (
            <EmptyState text="Још нема објављених речника." />
          ) : (
            <ul className="space-y-3">
              {dicts.map((d) => {
                const v = dictVotes[d.id] || { count: 0, mine: false };
                return (
                  <li key={d.id} className="paper-card p-4">
                    <div className="flex items-start gap-3">
                      <VoteButton
                        count={v.count}
                        mine={v.mine}
                        onClick={() => onVoteDict(d.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-primary">
                          {d.title}
                        </h3>
                        <div className="text-xs text-muted-foreground">
                          {d.author_name} · {d.entries_count} одредница ·{" "}
                          {new Date(d.created_at).toLocaleDateString("sr-Cyrl-RS")}
                        </div>
                        {d.description && (
                          <p className="mt-1 text-foreground/90">{d.description}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VoteButton({
  count,
  mine,
  onClick,
}: {
  count: number;
  mine: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-md border transition-colors ${
        mine
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/70"
      }`}
      aria-label={mine ? "Уклони глас" : "Гласај"}
    >
      <Heart className={`w-4 h-4 ${mine ? "fill-current" : ""}`} />
      <span className="text-xs font-semibold mt-0.5">{count}</span>
    </button>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground p-6 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> Учитавам…
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="paper-card p-6 text-center text-muted-foreground">
      <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-60" />
      {text}
    </div>
  );
}

function NewEntryDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [headword, setHeadword] = useState("");
  const [definition, setDefinition] = useState("");
  const [typeFull, setTypeFull] = useState("");
  const [category, setCategory] = useState("");
  const [example, setExample] = useState("");
  const [author, setAuthor] = useState(getDeviceName());
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!headword.trim() || !definition.trim()) {
      toast.error("Унеси реч и дефиницију");
      return;
    }
    setSubmitting(true);
    try {
      if (author.trim()) setDeviceName(author);
      await createCommunityEntry({
        headword,
        definition,
        type_full: typeFull || undefined,
        category: category || undefined,
        examples: example.trim() ? [example.trim()] : [],
      });
      toast.success("Реч је послата у заједнички речник");
      setOpen(false);
      setHeadword("");
      setDefinition("");
      setTypeFull("");
      setCategory("");
      setExample("");
      onCreated();
    } catch (e: any) {
      toast.error("Грешка: " + (e?.message || "непознато"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Нова реч
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Предложи нову реч</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="hw">Реч *</Label>
            <Input
              id="hw"
              value={headword}
              onChange={(e) => setHeadword(e.target.value)}
              placeholder="нпр. абер"
            />
          </div>
          <div>
            <Label htmlFor="df">Дефиниција *</Label>
            <Textarea
              id="df"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tp">Тип</Label>
              <Input
                id="tp"
                value={typeFull}
                onChange={(e) => setTypeFull(e.target.value)}
                placeholder="именица, глагол…"
              />
            </div>
            <div>
              <Label htmlFor="cat">Категорија</Label>
              <Input
                id="cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="нпр. Природа"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ex">Пример (опционо)</Label>
            <Input
              id="ex"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="реченица са том речју"
            />
          </div>
          <div>
            <Label htmlFor="au">Твоје име (опционо)</Label>
            <Input
              id="au"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="приказује се уз предлог"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Откажи
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            Пошаљи
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
