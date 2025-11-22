import { useRef, useState } from "react";

export default function InputBox({ onSend }: { onSend: (content: string) => void }) {
  const [val, setVal] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <textarea
        className="flex-1 border border-gray-200 dark:border-dark-border rounded p-2 min-h-[120px] sm:min-h-[80px] bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text/60"
        placeholder="输入消息..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const v = val.trim();
            if (!v) return;
            onSend(v);
            setVal("");
          }
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.markdown,.json,.csv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 2 * 1024 * 1024) { // 2MB 上限
            alert("文件过大，限制2MB");
            e.target.value = "";
            return;
          }
          const text = await f.text();
          const payload = `上传文档：${f.name}\n\n${text}`;
          onSend(payload);
          e.target.value = "";
        }}
      />
      <button
        className="px-4 py-2 rounded bg-primary text-white hover:bg-indigo-400 dark:bg-primary/90 dark:hover:bg-primary transition-transform hover:scale-105 shadow"
        onClick={() => {
          const v = val.trim();
          if (!v) return;
          onSend(v);
          setVal("");
        }}
      >
        发送
      </button>
      <button
        className="px-3 py-2 rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text"
        onClick={() => fileRef.current?.click()}
        title="上传文档并发送"
      >
        上传文档
      </button>
    </div>
  );
}