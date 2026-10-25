import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// The SDK's theme variables, its component styles, its markdown skin, then the chat's stylesheet,
// then this site's own rules (tokens only).
import "@dev-mainsequence/command-center-sdk/theme/fonts.css";
import "@dev-mainsequence/command-center-sdk/theme/styles.css";
import "@dev-mainsequence/command-center-sdk/styles.css";
import "@dev-mainsequence/command-center-sdk/theme/markdown.css";
import "@dev-mainsequence/command-center-ai/styles.css";
import "./styles.css";

import App from "./app/App";
import { applyThemeMode, resolveInitialThemeMode } from "./app/theme/theme";

// Apply the persisted preset before the first paint, so the startup screen is already themed.
applyThemeMode(resolveInitialThemeMode());

const container = document.getElementById("root");
if (!container) {
  throw new Error("The Hunch site needs a #root element.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
