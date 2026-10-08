import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./app/AppShell";
import "./ui/tokens.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Renderer root element is missing.");

createRoot(rootElement).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);

// Only the CI-authorized packaged audio probe loads this test helper.
if (
  window.location.protocol === "file:" &&
  new URLSearchParams(window.location.search).get("w06-driver") === "1"
) {
  void import("./playback/w06-packaged-driver-proof").then(
    ({ installW06DriverProof }) => {
      installW06DriverProof();
    },
  );
}
