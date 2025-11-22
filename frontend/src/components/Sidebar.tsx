import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";

type Model = { id: string; name: string };

export default function Sidebar() {
  const { chats, currentChatId, createChat, setCurrentChat } = useChatStore();
  const [models, setModels] = useState<Model[]>([]);
  const base = (() => {
    const env = import.meta.env.VITE_BACKEND_BASE as string | undefined;
    if (env) return env;
    return window.location.origin;
  })();

  useEffect(() => {
    fetch(`${base}/api/models`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setModels)
      .catch(console.error);
  }, [base]);

  const handleNewChat = () => {
    const currentChat = chats.find((c) => c.id === currentChatId);
    const modelId = currentChat?.modelId || models[0]?.id;
    if (modelId) {
      createChat(modelId);
    }
  };

  const { renameChat, deleteChat } = useChatStore();

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日${pad(d.getHours())}：${pad(d.getMinutes())}`;
  };

  return (
    <aside className="w-64 border-r dark:border-dark-border p-4 hidden md:flex flex-col bg-white dark:bg-dark-card">
      <button
        className="mb-4 w-full bg-primary text-white p-2 rounded hover:bg-primary/90 transition-colors"
        onClick={handleNewChat}
      >
        新建对话
      </button>
      <div className="flex-1 overflow-y-auto space-y-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group p-2 rounded border border-gray-200 dark:border-dark-border ${
              currentChatId === chat.id ? "bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-dark-card"
            }`}
          >
            <div className="flex items-center gap-2">
              <button className="flex-1 text-left font-medium" onClick={() => setCurrentChat(chat.id)}>
                {chat.title}
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded border border-gray-300 dark:border-dark-border"
                onClick={() => {
                  const name = prompt("重命名对话", chat.title || "新对话");
                  if (name && name.trim()) renameChat(chat.id, name.trim());
                }}
              >
                重命名
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded border border-red-400 text-red-600"
                onClick={() => deleteChat(chat.id)}
              >
                删除
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              最后对话日期 {formatDate(chat.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}