import { useEffect, useState } from "react";

type Model = { id: string; name: string };

import { useChatStore } from "../store/useChatStore";

export default function ModelSelector() {
  const [models, setModels] = useState<Model[]>([]);
  const [error, setError] = useState<string>("");
  const { chats, currentChatId, updateChatModel } = useChatStore();
  const current = chats.find((c) => c.id === currentChatId);
  const base = (() => {
    const env = import.meta.env.VITE_BACKEND_BASE as string | undefined;
    if (env) return env;
    return window.location.origin;
  })();
  useEffect(() => {
    fetch(`${base}/api/models`).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setModels).catch((e) => setError(e.message || String(e)));
  }, [base]);
  useEffect(() => {
    if (!currentChatId || models.length === 0) return;
    const ids = new Set(models.map((m) => m.id));
    if (current && !ids.has(current.modelId)) {
      updateChatModel(currentChatId, models[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId, models, current?.modelId]);
  const defaultId = current?.modelId || models[0]?.id;
  return (
    <div className="flex items-center gap-2">
      <select
        className="border border-gray-200 dark:border-dark-border rounded p-2 bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text"
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
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  );
}