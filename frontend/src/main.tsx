import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useChatStore } from "./store/useChatStore";

const applyTheme = (t: "light" | "dark" | "auto") => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = t === "dark" || (t === "auto" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
};

applyTheme(useChatStore.getState().settings.theme);
const media = window.matchMedia("(prefers-color-scheme: dark)");
media.addEventListener("change", () => {
  if (useChatStore.getState().settings.theme === "auto") applyTheme("auto");
});
useChatStore.subscribe((state) => {
  applyTheme(state.settings.theme);
});

const root = document.getElementById("root")!;
createRoot(root).render(<App />);
