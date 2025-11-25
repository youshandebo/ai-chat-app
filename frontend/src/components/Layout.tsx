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
          <div className="ml-auto flex gap-6 items-center text-sm">
            <Link to="/" className={loc.pathname === "/" ? "font-semibold text-primary" : "hover:text-primary"}>首页</Link>
            <Link to="/chat" className={loc.pathname === "/chat" ? "font-semibold text-primary" : "hover:text-primary"}>开始聊天</Link>
            <Link to="/changelog" className={loc.pathname === "/changelog" ? "font-semibold text-primary" : "hover:text-primary"}>更新记录</Link>
            <Link to="/sponsor" className={loc.pathname === "/sponsor" ? "font-semibold text-primary" : "hover:text-primary"}>赞助支持</Link>
            <button
              id="theme-toggle"
              className="group relative rounded-lg px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow"
              onClick={() => {
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                let next: "light" | "dark" | "auto" = "dark";
                if (settings.theme === "auto") next = prefersDark ? "light" : "dark"; else next = settings.theme === "dark" ? "light" : "dark";
                setTheme(next);
              }}
              title={`当前: ${settings.theme === 'dark' ? '深色' : settings.theme === 'light' ? '浅色' : '自动'}`}
            >
              <span className="flex items-center gap-1.5">
                {settings.theme === 'dark' ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                    <span className="text-xs font-medium">深色</span>
                  </>
                ) : settings.theme === 'light' ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium">浅色</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium">自动</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className={`h-full ${loc.pathname === '/chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}
            style={{ visibility: overlayRunning ? "hidden" : "visible" }}
          >
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