import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Defanzivno: ako je app u Lovable preview iframe-u, deregistruj sve postojeće
// service workere da preview ne servira stari shell.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com"));

if ((isInIframe || isPreviewHost) && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
