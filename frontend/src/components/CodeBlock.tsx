import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Code2 } from "lucide-react";

type Props = { code: string; language?: string };

export default function CodeBlock({ code, language }: Props) {
  const [html, setHtml] = useState<string>("");
  const lang = useMemo(() => (language && language.trim() ? language.trim().toLowerCase() : "plaintext"), [language]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const Prism: any = (await import("prismjs")).default || (await import("prismjs"));
        await Promise.all([
          import("prismjs/components/prism-javascript"),
          import("prismjs/components/prism-typescript"),
          import("prismjs/components/prism-python"),
          import("prismjs/components/prism-java"),
          import("prismjs/components/prism-c"),
          import("prismjs/components/prism-cpp"),
          import("prismjs/components/prism-go"),
          import("prismjs/components/prism-rust"),
          import("prismjs/components/prism-markup"),
          import("prismjs/components/prism-css"),
          import("prismjs/components/prism-sql"),
          import("prismjs/components/prism-bash"),
          import("prismjs/components/prism-json"),
        ]);
        const grammar = Prism.languages[lang] || Prism.languages.plaintext;
        const highlighted = Prism.highlight(code, grammar, lang);
        if (mounted) setHtml(highlighted);
      } catch {
        if (mounted) setHtml("");
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [code, lang]);

  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
      setCopied(true);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="code-block-wrapper group">
      <div className="code-header">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="language-tag">{lang.toUpperCase()}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{lineCount} 行</span>
        </div>
        <button
          className={`copy-button ${copied ? "copied" : ""}`}
          onClick={onCopy}
          aria-label={copied ? "已复制" : "复制代码"}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <div className="code-content">
        <div className="line-numbers" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <pre>
          {html ? <code dangerouslySetInnerHTML={{ __html: html }} /> : <code>{code}</code>}
        </pre>
      </div>
    </div>
  );
}