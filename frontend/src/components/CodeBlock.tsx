import { useEffect, useMemo, useState } from "react";

type Props = { code: string; language?: string };

export default function CodeBlock({ code, language }: Props) {
  const [html, setHtml] = useState<string>("");
  const lang = useMemo(() => (language && language.trim() ? language.trim().toLowerCase() : "plaintext"), [language]);

  const isDark = useMemo(() => document.documentElement.classList.contains("dark"), []);

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
        ]);
        if (isDark) {
          await import("prism-themes/themes/prism-vsc-dark-plus.css");
        } else {
          await import("prismjs/themes/prism.css");
        }
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
  }, [code, lang, isDark]);

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

  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <span className="language-tag">{lang.toUpperCase()}</span>
        <button className={`copy-button ${copied ? "copied" : ""}`} onClick={onCopy} aria-label={copied ? "已复制" : "复制代码"}>
          {copied ? "✅ 已复制" : "📋 复制"}
        </button>
      </div>
      <pre>
        {html ? <code dangerouslySetInnerHTML={{ __html: html }} /> : <code>{code}</code>}
      </pre>
    </div>
  );
}