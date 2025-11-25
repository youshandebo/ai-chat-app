import { useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import CodeBlock from "./CodeBlock";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MessageList() {
  const { chats, currentChatId } = useChatStore();
  const messages = useMemo(() => {
    const c = chats.find((x) => x.id === currentChatId);
    return c?.messages || [];
  }, [chats, currentChatId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="p-6 bg-white dark:bg-dark-card">
      {messages.map((m, i) => {
        const c = String(m.content || "");
        if (m.role === "assistant" && c.trim() === "") return null;
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: m.role === "user" ? 20 : -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role !== "user" && (
              <div className="mr-2 flex items-start select-none">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 flex items-center justify-center text-sm">🤖</div>
              </div>
            )}
            <div className="max-w-[72%]">
              <div
                className={`rounded-2xl px-4 py-2 shadow ${m.role === "user"
                    ? "bg-primary dark:bg-primary/90 text-white"
                    : "bg-gray-100 dark:bg-dark-card dark:text-dark-text border border-gray-200 dark:border-dark-border"
                  }`}
              >
                {(() => {
                  if (m.role === "assistant" && (c.startsWith("<!DOCTYPE") || c.includes("<html"))) {
                    return "接口返回了HTML/非JSON，请检查请求地址";
                  }
                  const re = /```([a-zA-Z0-9+#\-]*)?\n([\s\S]*?)```/g;
                  const parts: { type: "text" | "code"; value: string; lang?: string }[] = [];
                  let lastIndex = 0;
                  let match: RegExpExecArray | null;
                  while ((match = re.exec(c)) !== null) {
                    const [full, lang, code] = match;
                    const start = match.index;
                    if (start > lastIndex) {
                      parts.push({ type: "text", value: c.slice(lastIndex, start) });
                    }
                    parts.push({ type: "code", value: code, lang: (lang || "").toLowerCase() });
                    lastIndex = start + full.length;
                  }
                  if (lastIndex < c.length) {
                    parts.push({ type: "text", value: c.slice(lastIndex) });
                  }
                  if (parts.length === 0) {
                    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{c}</ReactMarkdown>;
                  }
                  return (
                    <div className="space-y-3">
                      {parts.map((p, idx) =>
                        p.type === "code" ? (
                          <CodeBlock key={idx} code={p.value} language={p.lang} />
                        ) : (
                          <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>{p.value}</ReactMarkdown>
                        )
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{new Date(m.timestamp || Date.now()).toLocaleString()}</span>
                {m.role === "assistant" && (
                  <button
                    className="px-2 py-0.5 rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-100"
                    onClick={() => navigator.clipboard?.writeText(c)}
                  >
                    复制
                  </button>
                )}
              </div>
            </div>
            {m.role === "user" && (
              <div className="ml-2 flex items-start select-none">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm">🙂</div>
              </div>
            )}
          </motion.div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
