import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import MessageList from "../components/MessageList";
import InputBox from "../components/InputBox";
import ModelSelector from "../components/ModelSelector";

export default function Chat() {
  const { chats, currentChatId, createChat, addMessage, updateMessage, setCurrentChat } = useChatStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const current = useMemo(() => chats.find((c) => c.id === currentChatId), [chats, currentChatId]);


  useEffect(() => {
    if (!currentChatId) {
      if (chats.length === 0) createChat("gemini-2.5-flash");
      else setCurrentChat(chats[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-gray-200 dark:border-dark-border flex items-center px-4 bg-white dark:bg-dark-card">
          <ModelSelector />
          {error && <span className="ml-4 text-red-600 text-sm">{error}</span>}
          {isGenerating && (
            <button className="ml-auto px-3 py-2 rounded bg-red-500 dark:bg-red-500/90 text-white hover:bg-red-600 dark:hover:bg-red-500" onClick={() => {
              abortRef.current?.abort();
              setIsGenerating(false);
            }}>停止生成</button>
          )}
        </div>
        <motion.div className="flex-1 overflow-auto bg-gray-50 dark:bg-dark-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <MessageList />
        </motion.div>
        <div className="border-t border-gray-200 dark:border-dark-border p-4 bg-white dark:bg-dark-card">
          <InputBox onSend={async (content) => {
            if (!current) {
              setError("尚未选择会话，已创建新会话，请再次发送");
              if (chats.length === 0) createChat("gemini-2.5-flash"); else setCurrentChat(chats[0].id);
              return;
            }
            const chatId = current.id;
            const freshCurrent = useChatStore.getState().chats.find(c => c.id === chatId);
            const modelId = freshCurrent?.modelId || "gemini-2.5-flash"; // Fallback safety
            const userMsgId = `msg_${Date.now()}`;
            addMessage(chatId, { id: userMsgId, role: "user", content, timestamp: Date.now(), modelId });
            const asstId = `msg_${Date.now()}_asst`;
            addMessage(chatId, { id: asstId, role: "assistant", content: "", timestamp: Date.now(), modelId });
            const controller = new AbortController();
            abortRef.current = controller;
            setIsGenerating(true);
            try {
              const payload = { messages: freshCurrent?.messages.concat([{ id: userMsgId, role: "user", content, timestamp: Date.now(), modelId }]) || [], stream: true } as any;
              console.log("send payload", { modelId, payload });
              const res = await fetch(`/api/chat/${modelId}`, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
                body: JSON.stringify(payload),
                signal: controller.signal,
              });
              if (!res.ok) {
                let errorMessage = `HTTP ${res.status}`;
                try {
                  const errorJson = await res.json();
                  if (errorJson.error) errorMessage = errorJson.error;
                } catch {
                  // If JSON parse fails, try text
                  try {
                    const text = await res.text();
                    if (text) errorMessage = `HTTP ${res.status}: ${text.slice(0, 100)}`;
                  } catch { }
                }
                throw new Error(errorMessage);
              }
              const ct = res.headers.get("content-type") || "";
              if (res.body && ct.includes("text/event-stream")) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buf = "";
                let acc = "";
                for (; ;) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  const lines = buf.split("\n");
                  buf = lines.pop() || "";
                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      const data = line.slice(6);
                      if (data === "[DONE]") {
                        setIsGenerating(false);
                      } else {
                        try {
                          const parsed = JSON.parse(data);
                          const chunk = parsed.content || parsed.choices?.[0]?.delta?.content || "";
                          if (chunk) {
                            acc += chunk;
                            updateMessage(chatId, asstId, acc);
                          }
                        } catch { }
                      }
                    }
                  }
                }
              } else {
                const ct2 = res.headers.get("content-type") || "";
                const text = await res.text();
                if (!ct2.includes("application/json")) {
                  setError("接口返回了HTML/非JSON，请检查请求地址与代理配置");
                  updateMessage(chatId, asstId, "接口返回了HTML/非JSON，请检查请求地址与代理配置");
                  setIsGenerating(false);
                  return;
                }
                try {
                  const parsed = JSON.parse(text);
                  const content = parsed.content || parsed.choices?.[0]?.message?.content || text;
                  updateMessage(chatId, asstId, content);
                } catch {
                  setError("JSON解析失败，请检查接口响应");
                }
                setIsGenerating(false);
              }
            } catch (e: any) {
              console.error("chat error", e);
              setError(e?.message || String(e));
              updateMessage(chatId, asstId, e?.message || String(e));
              setIsGenerating(false);
            }
          }} />
        </div>
      </div>
    </div>
  );
}