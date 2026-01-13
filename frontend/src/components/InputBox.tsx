import { useRef, useState, useEffect } from "react";

const ALLOWED_TEXT_TYPES = ['.txt', '.md', '.markdown', '.json', '.csv'];
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface InputBoxProps {
  onSend: (content: string) => void;
  editingMessage?: string | null;
  onCancelEdit?: () => void;
}

export default function InputBox({ onSend, editingMessage, onCancelEdit }: InputBoxProps) {
  const [val, setVal] = useState("");
  const [pendingFile, setPendingFile] = useState<{ name: string; content: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When editing message comes in, populate the textarea
  useEffect(() => {
    if (editingMessage) {
      setVal(editingMessage);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

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

  const handleCancelEdit = () => {
    setVal("");
    onCancelEdit?.();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Editing indicator */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-sm border border-amber-200 dark:border-amber-700">
          <span className="text-amber-600 dark:text-amber-300">✏️ 正在编辑消息</span>
          <button
            onClick={handleCancelEdit}
            className="ml-auto text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 text-xs font-medium"
          >
            取消编辑
          </button>
        </div>
      )}

      {/* Pending file indicator */}
      {pendingFile && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl text-sm border border-blue-200 dark:border-blue-700/50">
          <span className="text-blue-600 dark:text-blue-300 font-medium">
            {pendingFile.content.startsWith('data:image') ? '🖼️' : '📄'} {pendingFile.name}
          </span>
          <button
            onClick={clearPendingFile}
            className="ml-auto px-2 py-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            ✕ 取消
          </button>
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="w-full border-2 border-gray-200 dark:border-dark-border rounded-2xl px-4 py-3 min-h-[100px] sm:min-h-[80px] bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 shadow-sm resize-none transition-all duration-200 focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            placeholder={editingMessage ? "编辑你的消息..." : pendingFile ? "输入你的问题..." : "输入消息，Enter 发送，Shift+Enter 换行..."}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.json,.csv,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            className="group flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium"
            onClick={() => fileRef.current?.click()}
            title="上传文档或图片 (最大5MB)"
          >
            <span className="text-lg">📎</span>
            <span className="hidden sm:inline">上传</span>
          </button>
          <button
            className="group flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white hover:from-indigo-500 hover:to-primary transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={handleSend}
            disabled={!val.trim() && !pendingFile}
          >
            <span className="text-lg">▶</span>
            <span className="hidden sm:inline">{editingMessage ? '重发' : '发送'}</span>
          </button>
        </div>
      </div>

      {/* File type hint */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-left">
        💡 支持: txt, md, json, csv, jpg, png (最大5MB) · Enter 发送 · Shift+Enter 换行
      </p>
    </div>
  );
}