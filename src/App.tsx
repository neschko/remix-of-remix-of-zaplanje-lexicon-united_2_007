import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { SeedGate } from "@/components/SeedGate";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import LetterPage from "./pages/LetterPage";
import EntryPage from "./pages/EntryPage";
import CategoryPage from "./pages/CategoryPage";
import Manage from "./pages/Manage";
import Uputstvo from "./pages/Uputstvo";
import Zajednicki from "./pages/Zajednicki";
import AuthPage from "./pages/Auth";
import Analiza from "./pages/Analiza";
import Komentari from "./pages/Komentari";
import AdminOcr from "./pages/AdminOcr";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SeedGate>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/recnik/:slovo" element={<LetterPage />} />
                <Route path="/rec/:id" element={<EntryPage />} />
                <Route path="/kategorija/:naziv" element={<CategoryPage />} />
                <Route path="/zajednicki" element={<Zajednicki />} />
                <Route path="/komentari" element={<Komentari />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/analiza"
                  element={
                    <ProtectedRoute>
                      <Analiza />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ocr"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminOcr />
                    </ProtectedRoute>
                  }
                />
                <Route path="/upravljanje" element={<Manage />} />
                <Route path="/uputstvo" element={<Uputstvo />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </SeedGate>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
