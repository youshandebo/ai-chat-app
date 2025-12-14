import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";
import { Menu, X, Plus, Edit3, Trash2 } from "lucide-react";

type Model = { id: string; name: string };

export default function Sidebar() {
  const { chats, currentChatId, createChat, setCurrentChat, renameChat, deleteChat } = useChatStore();
  const [models, setModels] = useState<Model[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/models`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setModels)
      .catch(console.error);
  }, []);

  const handleNewChat = () => {
    const currentChat = chats.find((c) => c.id === currentChatId);
    const modelId = currentChat?.modelId || models[0]?.id;
    if (modelId) {
      createChat(modelId);
      setIsOpen(false);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Render content directly as a variable to avoid nested component issues
  const sidebarContent = (
    <>
      <button
        className="mb-4 w-full bg-primary text-white p-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
        onClick={handleNewChat}
        aria-label="新建对话"
      >
        <Plus className="w-5 h-5" />
        新建对话
      </button>
      <div className="flex-1 overflow-y-auto space-y-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group p-3 rounded-xl border transition-all ${currentChatId === chat.id
              ? "bg-primary/10 border-primary/30 dark:bg-primary/20"
              : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:border-primary/30"
              }`}
          >
            <div className="flex items-center gap-2">
              <button
                className="flex-1 text-left font-medium text-gray-900 dark:text-white truncate"
                onClick={() => {
                  setCurrentChat(chat.id);
                  setIsOpen(false);
                }}
                aria-label={`切换到对话: ${chat.title}`}
              >
                {chat.title}
              </button>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                  onClick={() => {
                    const name = prompt("重命名对话", chat.title || "新对话");
                    if (name && name.trim()) renameChat(chat.id, name.trim());
                  }}
                  title="重命名"
                  aria-label="重命名对话"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                  onClick={() => deleteChat(chat.id)}
                  title="删除"
                  aria-label="删除对话"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formatDate(chat.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed bottom-20 left-4 z-50 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="打开对话列表"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 w-72 p-4 flex flex-col bg-gray-50 dark:bg-dark-bg border-r dark:border-dark-border transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">对话历史</h2>
          <button
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r dark:border-dark-border p-4 hidden md:flex flex-col bg-gray-50 dark:bg-dark-bg">
        {sidebarContent}
      </aside>
    </>
  );
}