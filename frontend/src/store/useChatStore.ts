import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelId?: string;
}

interface Chat {
  id: string;
  title: string;
  modelId: string;
  messages: Message[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  chats: Chat[];
  tags: { id: string; name: string; parentId: string | null }[];
  currentChatId: string | null;
  settings: { theme: "light" | "dark" | "auto" | "new-year"; sidebarCollapsed: boolean };
  createChat: (modelId: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  setCurrentChat: (chatId: string) => void;
  updateChatModel: (chatId: string, modelId: string) => void;
  setTheme: (theme: "light" | "dark" | "auto" | "new-year") => void;
  renameChat: (chatId: string, title: string) => void;
  deleteChat: (chatId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chats: [],
      tags: [],
      currentChatId: null,
      settings: { theme: "auto", sidebarCollapsed: false },
      createChat: (modelId) => {
        const id = `chat_${Date.now()}`;
        set((state) => ({
          chats: [
            {
              id,
              title: "新对话",
              modelId,
              messages: [],
              tags: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...state.chats,
          ],
          currentChatId: id,
        }));
      },
      addMessage: (chatId, message) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
              : c
          ),
        }));
      },
      updateMessage: (chatId, messageId, content) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                ...c,
                messages: c.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
                updatedAt: Date.now(),
              }
              : c
          ),
        }));
      },
      setCurrentChat: (chatId) => set({ currentChatId: chatId }),
      updateChatModel: (chatId, modelId) => {
        set((state) => ({
          chats: state.chats.map((c) => (c.id === chatId ? { ...c, modelId, updatedAt: Date.now() } : c)),
        }));
      },
      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),
      renameChat: (chatId, title) => {
        set((state) => ({
          chats: state.chats.map((c) => (c.id === chatId ? { ...c, title, updatedAt: Date.now() } : c)),
        }));
      },
      deleteChat: (chatId) => {
        set((state) => {
          const filtered = state.chats.filter((c) => c.id !== chatId);
          const nextCurrent = state.currentChatId === chatId ? filtered[0]?.id || null : state.currentChatId;
          return { chats: filtered, currentChatId: nextCurrent };
        });
      },
    }),
    {
      name: "ai-chat-storage",
      partialize: (s) => ({ chats: s.chats, tags: s.tags, settings: s.settings }),
    }
  )
);