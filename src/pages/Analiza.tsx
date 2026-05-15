import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upload, Loader2, Mic, Trash2 } from "lucide-react";

const MAX_AUDIO = 5 * 1024 * 1024;

const MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini Flash (брзо)" },
  { id: "google/gemini-2.5-pro", label: "Gemini Pro (детаљније)" },
];

export default function Analiza() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [audio, setAudio] = useState<File | null>(null);
  const [running, setRunning] = useState(false);

  const history = useQuery({
    queryKey: ["analysis_history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("analysis_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analysis_history"] }),
  });

  const onAudio = (f: File | null) => {
    if (!f) return setAudio(null);
    if (f.size > MAX_AUDIO) {
      toast.error("Фајл је већи од 5MB");
      return;
    }
    setAudio(f);
  };

  const run = async () => {
    if (!text.trim() && !audio) {
      toast.error("Унесите текст или аудио");
      return;
    }
    setRunning(true);
    try {
      let audio_path: string | undefined;
      let audio_mime: string | undefined;
      if (audio && user) {
        const ext = audio.name.split(".").pop() || "mp3";
        audio_path = `${user.id}/${Date.now()}.${ext}`;
        audio_mime = audio.type;
        const { error: upErr } = await supabase.storage
          .from("analysis-audio")
          .upload(audio_path, audio, { contentType: audio.type });
        if (upErr) throw upErr;
      }

      const { data, error } = await supabase.functions.invoke("dialect-analyze", {
        body: { text: text.trim() || undefined, audio_path, audio_mime, model },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Анализа завршена");
      setText("");
      setAudio(null);
      qc.invalidateQueries({ queryKey: ["analysis_history"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Грешка");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl text-primary">Језичка анализа</h1>
        <p className="text-sm text-muted-foreground">
          AI анализа дијалекатских одлика заплањског говора (текст или аудио до 5MB).
        </p>
      </div>

      <section className="paper-card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Модел</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="px-3 py-2 rounded border border-border bg-background"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Текст за анализу</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Унесите текст или транскрипт..."
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1 flex items-center gap-2">
            <Mic className="w-4 h-4" /> Аудио (опционо, ≤5MB)
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => onAudio(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />
          {audio && (
            <p className="text-xs text-muted-foreground mt-1">
              {audio.name} · {(audio.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>

        <button
          onClick={run}
          disabled={running}
          className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {running ? "Анализирам…" : "Покрени анализу"}
        </button>
      </section>

      <section>
        <h2 className="text-xl mb-3">Историја анализа</h2>
        {history.isLoading ? (
          <p className="text-muted-foreground text-sm">Учитавам…</p>
        ) : history.data && history.data.length > 0 ? (
          <ul className="space-y-3">
            {history.data.map((h: any) => (
              <li key={h.id} className="paper-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString("sr-Cyrl")} · {h.kind} · {h.model}
                  </div>
                  <button
                    onClick={() => del.mutate(h.id)}
                    className="text-destructive hover:opacity-80"
                    aria-label="Обриши"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {h.input_text && (
                  <p className="text-sm italic mb-2 line-clamp-2">„{h.input_text}"</p>
                )}
                <ResultView result={h.result} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Нема још анализа.</p>
        )}
      </section>
    </div>
  );
}

function ResultView({ result }: { result: any }) {
  if (!result) return null;
  if (result.raw) return <pre className="text-xs whitespace-pre-wrap">{result.raw}</pre>;
  return (
    <div className="text-sm space-y-2">
      {typeof result.preservation_score === "number" && (
        <p><strong>Очуваност дијалекта:</strong> {result.preservation_score}/10</p>
      )}
      {result.standard_serbian && (
        <p><strong>Стандардни српски:</strong> {result.standard_serbian}</p>
      )}
      {Array.isArray(result.dialect_features) && result.dialect_features.length > 0 && (
        <div>
          <strong>Дијалекатске црте:</strong>
          <ul className="list-disc ml-5">
            {result.dialect_features.map((f: any, i: number) => (
              <li key={i}>{f.feature}: <em>{f.example}</em> — {f.explanation}</li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(result.lexemes) && result.lexemes.length > 0 && (
        <div>
          <strong>Лексеме:</strong>
          <ul className="list-disc ml-5">
            {result.lexemes.map((l: any, i: number) => (
              <li key={i}><strong>{l.word}</strong> = {l.standard} {l.note && <em>({l.note})</em>}</li>
            ))}
          </ul>
        </div>
      )}
      {result.comment && <p className="text-muted-foreground">{result.comment}</p>}
    </div>
  );
}
