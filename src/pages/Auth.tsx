import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav("/", { replace: true });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Налог направљен. Проверите имејл за потврду.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Пријава успешна");
        nav("/", { replace: true });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Грешка");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (r.error) throw r.error;
    } catch (e: any) {
      toast.error(e?.message ?? "Google грешка");
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="paper-card p-6 space-y-4">
        <h1 className="text-2xl text-primary">{mode === "login" ? "Пријава" : "Регистрација"}</h1>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Име за приказ (опционо)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-background"
            />
          )}
          <input
            type="email"
            required
            placeholder="Имејл"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Лозинка (мин. 6 знакова)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : mode === "login" ? "Пријави се" : "Региструј се"}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">или</div>

        <button
          onClick={google}
          disabled={busy}
          className="w-full px-4 py-2 rounded border border-border bg-card hover:bg-secondary disabled:opacity-50"
        >
          Настави са Google
        </button>

        <div className="text-sm text-center">
          {mode === "login" ? (
            <button onClick={() => setMode("signup")} className="text-primary hover:underline">
              Немате налог? Региструјте се
            </button>
          ) : (
            <button onClick={() => setMode("login")} className="text-primary hover:underline">
              Већ имате налог? Пријавите се
            </button>
          )}
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:underline">
          ← Назад на речник
        </Link>
      </div>
    </div>
  );
}
