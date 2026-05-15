import { Link, NavLink, useNavigate } from "react-router-dom";
import { Moon, Sun, WifiOff, Wifi, BookOpen, Menu, X, LogIn, LogOut, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export function Header() {
  const online = useOnline();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();

  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm transition-colors ${
      isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"
    }`;

  const mobileLink = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 text-base transition-colors border-b border-border ${
      isActive ? "bg-primary/10 text-primary font-semibold" : "text-foreground/80 hover:bg-secondary"
    }`;

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    nav("/");
  };

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
          <BookOpen className="w-5 h-5" />
          <span className="text-lg">Заплањски Речник</span>
          <span className="sanu-badge">SANU</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <NavLink to="/" end className={link}>Почетна</NavLink>
          <NavLink to="/zajednicki" className={link}>Заједнички</NavLink>
          <NavLink to="/komentari" className={link}>Коментари</NavLink>
          <NavLink to="/analiza" className={link}>Анализа</NavLink>
          {isAdmin && <NavLink to="/admin/ocr" className={link}>OCR</NavLink>}
          <NavLink to="/upravljanje" className={link}>Управљање</NavLink>
          <NavLink to="/uputstvo" className={link}>Упутство</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {isAdmin && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary">
              <Shield className="w-3 h-3" /> админ
            </span>
          )}
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
              online ? "bg-secondary text-secondary-foreground" : "bg-destructive text-destructive-foreground"
            }`}
            title={online ? "На мрежи" : "Без интернета — речник и даље ради"}
          >
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? "online" : "offline"}
          </span>
          {user ? (
            <button
              onClick={handleSignOut}
              className="hidden md:inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded hover:bg-secondary text-foreground/80"
            >
              <LogOut className="w-4 h-4" /> Одјава
            </button>
          ) : (
            <Link
              to="/auth"
              className="hidden md:inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
            >
              <LogIn className="w-4 h-4" /> Пријава
            </Link>
          )}
          <button
            onClick={toggle}
            className="hidden md:block p-2 rounded-md hover:bg-secondary text-foreground/80"
            aria-label="Промени тему"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 rounded-md hover:bg-secondary text-foreground/80"
            aria-label="Мени"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-card">
          <NavLink to="/" end className={mobileLink} onClick={() => setMenuOpen(false)}>Почетна</NavLink>
          <NavLink to="/zajednicki" className={mobileLink} onClick={() => setMenuOpen(false)}>Заједнички</NavLink>
          <NavLink to="/komentari" className={mobileLink} onClick={() => setMenuOpen(false)}>Коментари</NavLink>
          <NavLink to="/analiza" className={mobileLink} onClick={() => setMenuOpen(false)}>Језичка анализа</NavLink>
          {isAdmin && <NavLink to="/admin/ocr" className={mobileLink} onClick={() => setMenuOpen(false)}>OCR исправке</NavLink>}
          <NavLink to="/upravljanje" className={mobileLink} onClick={() => setMenuOpen(false)}>Управљање</NavLink>
          <NavLink to="/uputstvo" className={mobileLink} onClick={() => setMenuOpen(false)}>Упутство</NavLink>
          {user ? (
            <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-3 text-base text-foreground/80 hover:bg-secondary border-b border-border">
              <LogOut className="w-4 h-4" /> Одјава
            </button>
          ) : (
            <NavLink to="/auth" className={mobileLink} onClick={() => setMenuOpen(false)}>Пријава / Регистрација</NavLink>
          )}
          <button
            onClick={() => {
              toggle();
              setMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-base text-foreground/80 hover:bg-secondary transition-colors"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {dark ? "Светла тема" : "Тамна тема"}
          </button>
        </nav>
      )}
    </header>
  );
}
