import { useEffect, useState } from "react";
import { ensureSeeded } from "@/lib/seed";

export function SeedGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("Покрећем речник…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureSeeded(setMsg)
      .then(() => setReady(true))
      .catch((e) => setError(e?.message ?? "Грешка при учитавању корпуса"));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="paper-card p-6 max-w-md text-center">
          <h2 className="text-xl mb-2">Грешка</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="paper-card p-6 max-w-md text-center">
          <div className="text-3xl text-primary mb-3">З</div>
          <p className="text-foreground">{msg}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Прво учитавање може да потраје неколико секунди. После тога, речник ради и без интернета.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
