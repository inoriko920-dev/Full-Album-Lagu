import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./app/AppShell";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Renderer root element is missing.");

createRoot(rootElement).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
