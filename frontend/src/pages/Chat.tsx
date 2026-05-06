import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import { getFingerprint } from "../utils/fingerprint";
import { getStoredKeys } from "../utils/keyStorage";
import AbuseWarningModal from "../components/AbuseWarningModal";
import ActivationModal from "../components/ActivationModal";
import Sidebar from "../components/Sidebar";
import MessageList from "../components/MessageList";
import InputBox from "../components/InputBox";
import ModelSelector from "../components/ModelSelector";
import SEO from "../components/SEO";

export default function Chat() {
  const { chats, currentChatId, createChat, addMessage, updateMessage, setCurrentChat, deleteMessagesAfter } = useChatStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [showAbuseWarning, setShowAbuseWarning] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const current = useMemo(() => chats.find((c) => c.id === currentChatId), [chats, currentChatId]);


  useEffect(() => {
    if (!currentChatId) {
      if (chats.length === 0) createChat("gemini-2.5-flash");
      else setCurrentChat(chats[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup: abort any in-flight request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);
  return (
    <div className="flex h-full">
      <SEO title="AI 对话" description="与多种AI模型免费对话，支持 Gemini、ChatGPT 等主流大模型，一键切换，流式响应。" />
      <Sidebar onOpenActivation={() => setShowActivation(true)} />
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
          <MessageList onEditMessage={(msgId, content) => {
            if (!current || isGenerating) return;
            // Remove the message being edited and any messages after it
            deleteMessagesAfter(current.id, msgId);
            setEditingMessage({ id: msgId, content });
          }} />
        </motion.div>
        <div className="border-t border-gray-200 dark:border-dark-border p-4 bg-white dark:bg-dark-card">
          <InputBox
            editingMessage={editingMessage?.content}
            onCancelEdit={() => setEditingMessage(null)}
            onSend={async (content) => {
              // Clear editing state when sending
              setEditingMessage(null);
              if (!current) {
                setError("尚未选择会话，已创建新会话，请再次发送");
                if (chats.length === 0) createChat("gemini-2.5-flash"); else setCurrentChat(chats[0].id);
                return;
              }
              const chatId = current.id;
              const freshCurrent = useChatStore.getState().chats.find(c => c.id === chatId);
              const modelId = freshCurrent?.modelId || "gemini-2.5-flash"; // Fallback safety
              const ts = Date.now();
              const userMsgId = `msg_${ts}_user`;
              addMessage(chatId, { id: userMsgId, role: "user", content, timestamp: ts, modelId });
              const asstId = `msg_${ts}_asst`;
              addMessage(chatId, { id: asstId, role: "assistant", content: "AI正在思考🤔", timestamp: Date.now(), modelId });
              const controller = new AbortController();
              abortRef.current = controller;
              setIsGenerating(true);
              let acc = ""; // Move acc here to be accessible in catch block
              try {
                // Refresh activation key balance asynchronously (non-blocking)
                const storedKeys = getStoredKeys();
                const lastKey = storedKeys.length > 0 ? storedKeys[storedKeys.length - 1] : undefined;
                if (lastKey) {
                  // Run in background without await to prevent blocking the main chat flow
                  (async () => {
                    try {
                      // @ts-ignore
                      const apiBase = import.meta.env.VITE_BACKEND_BASE || '';
                      await fetch(`${apiBase}/api/keys/balance`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key: lastKey })
                      });
                    } catch (e) {
                      console.warn("Background balance check failed:", e);
                    }
                  })();
                }

                const fingerprint = await getFingerprint();
                const webSearchEnabled = localStorage.getItem('webSearchEnabled') === 'true';
                // Filter out error messages from context to prevent AI confusion
                const cleanMessages = (freshCurrent?.messages || []).filter(m => {
                  const c = String(m.content || '');
                  if (m.role === 'assistant') {
                    // Exclude error responses and thinking indicators
                    if (c.includes('Internal Server Error') || c.startsWith('HTTP ') || c === 'AI正在思考🤔') return false;
                  }
                  return true;
                });
                const payload = {
                  messages: cleanMessages.concat([{ id: userMsgId, role: "user", content, timestamp: Date.now(), modelId }]),
                  stream: true,
                  webSearch: webSearchEnabled
                } as any;

                // @ts-ignore
                const apiBase = import.meta.env.VITE_BACKEND_BASE || '';
                const apiUrl = `${apiBase}/api/chat/${modelId}`;
                const res = await fetch(apiUrl, {
                  method: "POST",
                  mode: "cors",
                  headers: {
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                    "X-Device-Fingerprint": fingerprint,
                    "X-Activation-Key": lastKey || ""
                  },
                  body: JSON.stringify(payload),
                  signal: controller.signal,
                });

                if (res.headers.get("X-Usage-Warning") === "true") {
                  if (!sessionStorage.getItem("abuse_warning_shown")) {
                    setShowAbuseWarning(true);
                  }
                }

                if (!res.ok) {
                  let errorMessage = `HTTP ${res.status}`;
                  try {
                    const errorText = await res.text();
                    try {
                      const errorJson = JSON.parse(errorText);
                      if (errorJson.error) errorMessage = errorJson.error;
                    } catch {
                      if (errorText) errorMessage = `HTTP ${res.status}: ${errorText.slice(0, 100)}`;
                    }
                  } catch { }
                  throw new Error(errorMessage);
                }
                const ct = res.headers.get("content-type") || "";
                if (res.body && (ct.includes("text/event-stream") || ct.includes("stream"))) {
                  const reader = res.body.getReader();
                  const decoder = new TextDecoder();
                  let buf = "";
                  let hasReceivedContent = false;
                  for (; ;) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buf += decoder.decode(value, { stream: true });
                    const lines = buf.split("\n");
                    buf = lines.pop() || "";
                    for (const line of lines) {
                      // Skip SSE comments (heartbeats etc.)
                      if (line.startsWith(":")) continue;
                      if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") {
                          setIsGenerating(false);
                        } else {
                          try {
                            const parsed = JSON.parse(data);
                            if (parsed.error) {
                              throw new Error(parsed.error);
                            }
                            const chunk = parsed.content || parsed.choices?.[0]?.delta?.content || "";
                            if (chunk) {
                              if (!hasReceivedContent) {
                                acc = chunk;
                                hasReceivedContent = true;
                              } else {
                                acc += chunk;
                              }
                              updateMessage(chatId, asstId, acc);
                            }
                          } catch (parseErr: any) {
                            // Skip unparseable SSE data lines (not errors)
                          }
                        }
                      }
                    }
                  }
                  setIsGenerating(false);
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
                if (e.name === 'AbortError' || e.message?.includes('aborted')) {
                  updateMessage(chatId, asstId, (acc || "") + "\n\n[用户手动停止输出]");
                  setIsGenerating(false);
                  return;
                }
                const errorMsg = e?.message || "请求失败，请稍后重试";
                setError(errorMsg);
                updateMessage(chatId, asstId, `❌ ${errorMsg}`);
                setIsGenerating(false);
              }
            }} />
        </div>
      </div>
      <AbuseWarningModal
        isOpen={showAbuseWarning}
        onClose={() => {
          sessionStorage.setItem("abuse_warning_shown", "true");
          setShowAbuseWarning(false);
        }}
      />
      <ActivationModal
        isOpen={showActivation}
        onClose={() => setShowActivation(false)}
      />
    </div>
  );
}