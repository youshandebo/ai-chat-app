import { useEffect, useState, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

type Model = { id: string; name: string; supportsWebSearch?: boolean };

export default function ModelSelector() {
  const [models, setModels] = useState<Model[]>([]);
  const [error, setError] = useState<string>("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { chats, currentChatId, updateChatModel } = useChatStore();
  const current = chats.find((c) => c.id === currentChatId);

  useEffect(() => {
    // @ts-ignore
    const apiBase = import.meta.env.VITE_BACKEND_BASE || '';
    fetch(`${apiBase}/api/models`).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setModels).catch((e) => setError(e.message || String(e)));
  }, []);

  useEffect(() => {
    if (!currentChatId || models.length === 0) return;
    const ids = new Set(models.map((m) => m.id));
    if (current && !ids.has(current.modelId)) {
      updateChatModel(currentChatId, models[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId, models, current?.modelId]);

  // Store web search preference in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('webSearchEnabled');
    if (stored !== null) {
      setWebSearchEnabled(stored === 'true');
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleWebSearch = () => {
    const newValue = !webSearchEnabled;
    setWebSearchEnabled(newValue);
    localStorage.setItem('webSearchEnabled', String(newValue));
  };

  const defaultId = current?.modelId || models[0]?.id;
  const currentModel = models.find(m => m.id === defaultId);
  const showWebSearchToggle = currentModel?.supportsWebSearch;

  return (
    <div className="flex items-center gap-2 flex-wrap" ref={dropdownRef}>
      {models.length === 0 && !error && (
        <span className="text-sm text-gray-400 dark:text-gray-500">加载模型中...</span>
      )}
      {models.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between min-w-[220px] px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-gray-900 dark:text-dark-text text-sm hover:border-primary dark:hover:border-primary transition-colors outline-none focus:ring-2 focus:ring-primary/20 shadow-sm active:scale-[0.98]"
          >
            <span className="truncate">{currentModel?.name || "选择模型"}</span>
            <ChevronDown className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
                className="absolute left-0 top-full mt-2 w-full min-w-[240px] max-h-64 overflow-y-auto bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border border-gray-200/60 dark:border-dark-border/40 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/30 z-[60] py-1.5 scroll-smooth"
              >
                {models.map((m, index) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (currentChatId) updateChatModel(currentChatId, m.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left mx-1.5 px-3 py-2.5 text-sm flex items-center justify-between transition-all duration-150 ${index === 0 ? 'rounded-t-2xl' : ''} ${index === models.length - 1 ? 'rounded-b-2xl' : ''} rounded-xl ${m.id === defaultId ? "text-primary font-medium bg-primary/8 dark:bg-primary/12" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/5"}`}
                    style={{ width: 'calc(100% - 12px)' }}
                  >
                    <span className="truncate pr-4">{m.name}</span>
                    {m.id === defaultId && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Web Search Toggle - only show for models that support it */}
      {showWebSearchToggle && (
        <button
          onClick={toggleWebSearch}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border transition-colors ${webSearchEnabled
              ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300'
              : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          title={webSearchEnabled ? '联网搜索已开启' : '点击开启联网搜索'}
        >
          🌐 {webSearchEnabled ? '联网中' : '联网'}
        </button>
      )}

      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  );
}