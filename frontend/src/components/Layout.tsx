import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import AnnouncementModal from "./AnnouncementModal";

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const { settings, setTheme } = useChatStore();
  const [overlayRunning, setOverlayRunning] = React.useState<boolean>(false);
  const [key, setKey] = React.useState<string>("");
  React.useEffect(() => {
    setKey(loc.pathname);
    setOverlayRunning(true);
  }, [loc.pathname]);
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <nav className="sticky top-0 z-30 bg-white/90 dark:bg-dark-card/90 backdrop-blur border-b border-gray-200 dark:border-dark-border">
        <div className="max-w-6xl mx-auto h-16 flex items-center px-6">
          <Link to="/" className="text-xl font-bold">聚合AI · 对话</Link>
          <div className="ml-auto flex gap-6 text-sm">
            <Link to="/" className={loc.pathname === "/" ? "font-semibold text-primary" : "hover:text-primary"}>首页</Link>
            <Link to="/chat" className={loc.pathname === "/chat" ? "font-semibold text-primary" : "hover:text-primary"}>开始聊天</Link>
            <Link to="/changelog" className={loc.pathname === "/changelog" ? "font-semibold text-primary" : "hover:text-primary"}>更新记录</Link>
            <Link to="/sponsor" className={loc.pathname === "/sponsor" ? "font-semibold text-primary" : "hover:text-primary"}>赞助支持</Link>
            <button id="theme-toggle" className="rounded px-2 py-1 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text" onClick={() => {
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              let next: "light" | "dark" | "auto" = "dark";
              if (settings.theme === "auto") next = prefersDark ? "light" : "dark"; else next = settings.theme === "dark" ? "light" : "dark";
              setTheme(next);
            }}>🌓</button>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="min-h-full" style={{ visibility: overlayRunning ? "hidden" : "visible" }}>
            {children}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="popLayout">
          {overlayRunning && (
            <motion.div key={key} className="absolute inset-0 z-40 bg-white dark:bg-dark-card" initial={{ scaleX: 1, originX: 0 }} animate={{ scaleX: 0 }} exit={{ scaleX: 0 }} transition={{ duration: 0.25 }} onAnimationComplete={() => setOverlayRunning(false)} />
          )}
        </AnimatePresence>
      </main>
      <footer className="h-12 border-t border-gray-200 dark:border-dark-border flex items-center justify-center text-sm bg-white dark:bg-dark-card">© 聚合AI</footer>
      {loc.pathname !== "/admin" && <AnnouncementModal />}
    </div>
  );
}