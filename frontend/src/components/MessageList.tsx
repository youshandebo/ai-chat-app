import { useMemo, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import CodeBlock from "./CodeBlock";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Toast from "./Toast";

interface MessageListProps {
  onEditMessage?: (messageId: string, content: string) => void;
}

export default function MessageList({ onEditMessage }: MessageListProps) {
  const { chats, currentChatId } = useChatStore();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  const [expandedMsgs, setExpandedMsgs] = useState<Set<string>>(new Set());

  const messages = useMemo(() => {
    const c = chats.find((x) => x.id === currentChatId);
    return c?.messages || [];
  }, [chats, currentChatId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Track if user is near the bottom
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  };

  useEffect(() => {
    // Only auto-scroll if user is already near the bottom
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setToastMsg("已复制到剪贴板");
    });
  };

  const handleVote = async (messageId: string, vote: 'up' | 'down') => {
    const currentVote = votes[messageId];
    const newVote = currentVote === vote ? null : vote;

    setVotes(prev => ({ ...prev, [messageId]: newVote }));

    try {
      // @ts-ignore
      const apiBase = import.meta.env.VITE_BACKEND_BASE || '';
      await fetch(`${apiBase}/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, vote: newVote, timestamp: Date.now() })
      });
    } catch (e) {
      console.error('Vote failed:', e);
    }
  };

  const toggleExpand = (msgId: string) => {
    setExpandedMsgs(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  // Check if content is very long (likely a file upload)
  const isLongContent = (content: string) => content.length > 800;

  return (
    <div ref={scrollContainerRef} onScroll={handleScroll} className="py-4 px-6 bg-white dark:bg-dark-card min-h-full overflow-y-auto">
      {messages.map((m, idx) => {
        const c = String(m.content || "");
        if (m.role === "assistant" && c.trim() === "") return null;

        const isLong = isLongContent(c);
        const isExpanded = expandedMsgs.has(m.id);
        const displayContent = isLong && !isExpanded ? c.slice(0, 600) + '...' : c;

        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: m.role === "user" ? 20 : -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role !== "user" && (
              <div className="mr-2 flex items-start select-none flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 flex items-center justify-center text-sm">🤖</div>
              </div>
            )}
            <div className={`max-w-[72%] min-w-0 ${m.role === "user" ? "items-end flex flex-col" : "items-start flex flex-col"}`}>
              <div
                className={`w-fit max-w-full rounded-2xl px-4 py-2 shadow overflow-hidden ${m.role === "user"
                  ? "bg-primary dark:bg-primary/90 text-white"
                  : "bg-gray-100 dark:bg-dark-card dark:text-dark-text border border-gray-200 dark:border-dark-border"
                  }`}
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              >
                {(() => {
                  if (m.role === "assistant" && (c.startsWith("<!DOCTYPE") || c.includes("<html"))) {
                    return "接口返回了HTML/非JSON，请检查请求地址";
                  }
                  const re = /```([a-zA-Z0-9+#\-]*)?\n([\s\S]*?)```/g;
                  const parts: { type: "text" | "code"; value: string; lang?: string }[] = [];
                  let lastIndex = 0;
                  let match: RegExpExecArray | null;
                  while ((match = re.exec(displayContent)) !== null) {
                    const [full, lang, code] = match;
                    const start = match.index;
                    if (start > lastIndex) {
                      parts.push({ type: "text", value: displayContent.slice(lastIndex, start) });
                    }
                    parts.push({ type: "code", value: code, lang: (lang || "").toLowerCase() });
                    lastIndex = start + full.length;
                  }
                  if (lastIndex < displayContent.length) {
                    parts.push({ type: "text", value: displayContent.slice(lastIndex) });
                  }
                  if (parts.length === 0) {
                    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>;
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

                {/* Expand/Collapse for long content */}
                {isLong && (
                  <button
                    onClick={() => toggleExpand(m.id)}
                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
                  >
                    {isExpanded ? '收起 ▲' : '展开全部 ▼'}
                  </button>
                )}
              </div>

              <div className={`mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ${m.role === "user" ? "justify-end w-full" : "justify-start w-full"}`}>
                <span>{new Date(m.timestamp || Date.now()).toLocaleString()}</span>
                {m.role === "user" && idx === messages.length - 1 && onEditMessage && (
                  <button
                    className="px-2 py-0.5 rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                    onClick={() => onEditMessage(m.id, c)}
                    title="编辑并重新发送"
                  >
                    ✏️ 编辑
                  </button>
                )}
                {m.role === "assistant" && (
                  <>
                    <button
                      className="px-2 py-0.5 rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleCopy(c)}
                    >
                      复制
                    </button>
                    {/* Voting buttons */}
                    <button
                      className={`px-2 py-0.5 rounded border transition-colors ${votes[m.id] === 'up'
                        ? 'bg-green-100 border-green-300 text-green-600 dark:bg-green-900/50 dark:border-green-700 dark:text-green-400'
                        : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => handleVote(m.id, 'up')}
                      title="有帮助"
                    >
                      👍
                    </button>
                    <button
                      className={`px-2 py-0.5 rounded border transition-colors ${votes[m.id] === 'down'
                        ? 'bg-red-100 border-red-300 text-red-600 dark:bg-red-900/50 dark:border-red-700 dark:text-red-400'
                        : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => handleVote(m.id, 'down')}
                      title="没帮助"
                    >
                      👎
                    </button>
                  </>
                )}
              </div>
            </div>
            {m.role === "user" && (
              <div className="ml-2 flex items-start select-none flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm">🙂</div>
              </div>
            )}
          </motion.div>
        );
      })}
      <div ref={messagesEndRef} />
      <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
    </div>
  );
}
