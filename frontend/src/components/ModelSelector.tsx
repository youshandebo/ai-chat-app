import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";

type Model = { id: string; name: string; supportsWebSearch?: boolean };

export default function ModelSelector() {
  const [models, setModels] = useState<Model[]>([]);
  const [error, setError] = useState<string>("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
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

  const toggleWebSearch = () => {
    const newValue = !webSearchEnabled;
    setWebSearchEnabled(newValue);
    localStorage.setItem('webSearchEnabled', String(newValue));
  };

  const defaultId = current?.modelId || models[0]?.id;
  const currentModel = models.find(m => m.id === defaultId);
  const showWebSearchToggle = currentModel?.supportsWebSearch;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        className="border border-gray-200 dark:border-dark-border rounded p-2 bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text text-sm"
        value={defaultId}
        onChange={(e) => {
          if (!currentChatId) return;
          updateChatModel(currentChatId, e.target.value);
        }}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      {/* Web Search Toggle - only show for models that support it */}
      {showWebSearchToggle && (
        <button
          onClick={toggleWebSearch}
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs border transition-colors ${webSearchEnabled
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