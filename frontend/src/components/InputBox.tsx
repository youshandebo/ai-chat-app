import { useRef, useState } from "react";

const ALLOWED_TEXT_TYPES = ['.txt', '.md', '.markdown', '.json', '.csv'];
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function InputBox({ onSend }: { onSend: (content: string) => void }) {
  const [val, setVal] = useState("");
  const [pendingFile, setPendingFile] = useState<{ name: string; content: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Size check
    if (f.size > MAX_FILE_SIZE) {
      alert(`文件过大，限制 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      e.target.value = "";
      return;
    }

    const ext = '.' + f.name.split('.').pop()?.toLowerCase();

    // Text file handling
    if (ALLOWED_TEXT_TYPES.includes(ext)) {
      const text = await f.text();
      // Truncate if too long for display (keep full for sending)
      const displayText = text.length > 500 ? text.slice(0, 500) + `...[共${text.length}字]` : text;
      setPendingFile({ name: f.name, content: text });
      setVal((prev) => prev + (prev ? '\n\n' : '') + `📄 已上传: ${f.name}\n---\n${displayText}\n---\n请问: `);
    }
    // Image file handling
    else if (ALLOWED_IMAGE_TYPES.includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPendingFile({ name: f.name, content: base64 });
        setVal((prev) => prev + (prev ? '\n\n' : '') + `🖼️ 已上传图片: ${f.name}\n请问: `);
      };
      reader.readAsDataURL(f);
    } else {
      alert(`不支持的文件类型。支持: ${[...ALLOWED_TEXT_TYPES, ...ALLOWED_IMAGE_TYPES].join(', ')}`);
    }

    e.target.value = "";
  };

  const handleSend = () => {
    const v = val.trim();
    if (!v && !pendingFile) return;

    let finalContent = v;

    // If there's a pending file, include full content
    if (pendingFile) {
      if (pendingFile.content.startsWith('data:image')) {
        // Image: include base64 reference
        finalContent = `[图片上传: ${pendingFile.name}]\n${pendingFile.content}\n\n${v}`;
      } else {
        // Text file: include full content
        finalContent = `上传文档：${pendingFile.name}\n\n${pendingFile.content}\n\n用户问题：${v}`;
      }
    }

    onSend(finalContent);
    setVal("");
    setPendingFile(null);
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setVal("");
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Pending file indicator */}
      {pendingFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm">
          <span className="text-blue-600 dark:text-blue-300">
            {pendingFile.content.startsWith('data:image') ? '🖼️' : '📄'} {pendingFile.name}
          </span>
          <button
            onClick={clearPendingFile}
            className="ml-auto text-red-500 hover:text-red-700 text-xs"
          >
            ✕ 取消
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          className="flex-1 border border-gray-200 dark:border-dark-border rounded-lg p-3 min-h-[90px] sm:min-h-[72px] bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text/60 shadow-sm resize-none"
          placeholder={pendingFile ? "输入你的问题..." : "输入消息..."}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.markdown,.json,.csv,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <button
            className="w-full sm:w-auto px-3 py-2 rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
            onClick={() => fileRef.current?.click()}
            title="上传文档或图片"
          >
            📎 上传
          </button>
          <button
            className="w-full sm:w-auto px-4 py-2 rounded bg-primary text-white hover:bg-indigo-400 dark:bg-primary/90 dark:hover:bg-primary transition-transform hover:scale-105 shadow text-sm"
            onClick={handleSend}
          >
            ▶ 发送
          </button>
        </div>
      </div>

      {/* File type hint for mobile */}
      <p className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">
        支持: txt, md, json, csv, jpg, png (最大5MB)
      </p>
    </div>
  );
}