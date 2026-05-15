import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { SeedGate } from "@/components/SeedGate";
import Home from "./pages/Home";
import LetterPage from "./pages/LetterPage";
import EntryPage from "./pages/EntryPage";
import CategoryPage from "./pages/CategoryPage";
import Manage from "./pages/Manage";
import Uputstvo from "./pages/Uputstvo";
import Zajednicki from "./pages/Zajednicki";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SeedGate>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/recnik/:slovo" element={<LetterPage />} />
              <Route path="/rec/:id" element={<EntryPage />} />
              <Route path="/kategorija/:naziv" element={<CategoryPage />} />
              <Route path="/zajednicki" element={<Zajednicki />} />
              <Route path="/upravljanje" element={<Manage />} />
              <Route path="/uputstvo" element={<Uputstvo />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SeedGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
