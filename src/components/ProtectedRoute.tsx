import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Учитавање…</div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (adminOnly && !isAdmin) {
    return (
      <div className="paper-card p-6 max-w-md mx-auto text-center">
        <h2 className="text-xl mb-2">Само за администраторе</h2>
        <p className="text-sm text-muted-foreground">Немате потребна права за ову страницу.</p>
      </div>
    );
  }
  return <>{children}</>;
}
