import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import AnnouncementModal from "./AnnouncementModal";
import { Menu, X } from "lucide-react";
import Fireworks from "./Fireworks";
import RedPacketRain from "./RedPacketRain";
import NewYearGreetings from "./NewYearGreetings";

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const { settings, setTheme } = useChatStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState<'none' | 'fireworks' | 'rain'>('none');

  React.useEffect(() => {
    setIsMobileMenuOpen(false); // Close mobile menu on route change
  }, [loc.pathname]);

  const toggleTheme = () => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let next: "light" | "dark" | "auto" = "dark";
    if (settings.theme === "auto") next = prefersDark ? "light" : "dark"; else next = settings.theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const navLinks = [
    { path: "/", label: "首页" },
    { path: "/chat", label: "开始聊天" },
    { path: "/image", label: "图像生成" },
    { path: "/changelog", label: "更新记录" },
    { path: "/sponsor", label: "赞助支持" },
    { path: "/store", label: "商城" },
  ];

  const handleAnnouncementClose = () => {
    // Only play animation if theme is New Year (check DOM class for immediate effect)
    if (!document.documentElement.classList.contains('theme-newyear')) return;

    // Random animation
    const rand = Math.random();
    const type = rand > 0.5 ? 'fireworks' : 'rain';
    setActiveAnimation(type);

    // Stop after duration
    setTimeout(() => {
      setActiveAnimation('none');
    }, 6000);
  };

  const isChat = loc.pathname === '/chat';
  const isImageGen = loc.pathname === '/image';
  const isFullHeight = isChat || isImageGen;

  return (
    <div className={`flex flex-col transition-colors duration-300 ${isFullHeight ? 'h-screen overflow-hidden bg-white dark:bg-dark-bg' : 'min-h-screen'}`}>
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border flex-shrink-0">
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
            聚合AI · 对话
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex gap-6 items-center text-sm">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors duration-200 ${loc.pathname === link.path ? "font-semibold text-primary" : "text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary"
                  }`}
              >
                {link.label}
              </Link>
            ))}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              title="切换主题"
            >
              {settings.theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : settings.theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleTheme}
              className="mr-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-300 transition-colors"
            >
              {settings.theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-300"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border overflow-hidden"
            >
              <div className="px-4 pt-2 pb-4 space-y-1">
                {navLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${loc.pathname === link.path
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className={`relative ${isFullHeight ? 'flex-1 overflow-auto' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className={isFullHeight ? 'h-full' : ''}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isFullHeight && (
        <footer className="h-12 border-t border-gray-200 dark:border-dark-border flex items-center justify-center text-sm bg-white dark:bg-dark-card text-gray-500 dark:text-gray-400">
          © 2026 聚合AI · All Rights Reserved (v2.1)
        </footer>
      )}
      {loc.pathname !== "/admin" && <AnnouncementModal onClose={handleAnnouncementClose} />}

      {activeAnimation === 'fireworks' && <Fireworks />}
      {activeAnimation === 'rain' && <RedPacketRain />}
      {(activeAnimation === 'fireworks' || activeAnimation === 'rain') && <NewYearGreetings />}
    </div>
  );
}
