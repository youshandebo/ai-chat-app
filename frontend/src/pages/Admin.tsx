import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export default function Admin() {
  const [token, setToken] = useState<string>(() => {
    const saved = localStorage.getItem("ADMIN_TOKEN") || "";
    if (saved) return saved;
    const envToken = (import.meta.env.VITE_ADMIN_TOKEN as string | undefined) || "";
    return envToken;
  });
  const base = useMemo(() => {
    const env = import.meta.env.VITE_BACKEND_BASE as string | undefined;
    if (env) return env;
    return window.location.origin;
  }, []);
  const [status, setStatus] = useState<string>("");
  const [health, setHealth] = useState<string>("");
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [streaming, setStreaming] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadErr, setLoadErr] = useState<string>("");
  const [range, setRange] = useState<string>("24h");
  const [metrics, setMetrics] = useState<{ visitors: number; maxConcurrency: number; calls: number; errors: number; range: string; series?: { label: string; calls: number; errors: number; visitors: number }[] } | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("ADMIN_TOKEN", token);
  }, [token]);

  useEffect(() => {
    if (!authed) return;
    fetch(`${base}/api/models`).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then((list) => { setModels(list); setSelected(list?.[0]?.id || ""); setLoadErr(""); }).catch((e: any) => { setLoadErr(String(e?.message || e)); });
  }, [base, authed]);

  const reloadModels = async () => {
    setStatus("正在重载...");
    try {
      const res = await fetch(`${base}/api/admin/reload-models`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        setStatus(`失败 ${res.status} ${t}`);
        return;
      }
      const data = await res.json();
      setStatus(data.message || "成功");
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  };

  const checkHealth = async () => {
    setHealth("检测中...");
    try {
      const res = await fetch(`${base}/api/admin/health`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) return setHealth(`失败 ${res.status} ${data.error || ""}`);
      setHealth(`正常，模型数 ${data.modelsCount}，CORS ${data.cors || "未设"}`);
    } catch (e: any) {
      setHealth(String(e?.message || e));
    }
  };

  const enter = async () => {
    setStatus("验证中...");
    try {
      const res = await fetch(`${base}/api/admin/health`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setStatus(`令牌无效 ${res.status} ${data.error || ""}`); return; }
      setStatus("已进入后台");
      setAuthed(true);
      loadMetrics(range);
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  };

  const loadMetrics = async (r: string) => {
    setRange(r);
    try {
      const res = await fetch(`${base}/api/admin/metrics?range=${encodeURIComponent(r)}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setStatus(`指标失败 ${res.status} ${data.error || ""}`); return; }
      setMetrics(data);
    } catch (e: any) { setStatus(String(e?.message || e)); }
  };

  const testStream = async () => {
    if (!selected) return;
    setStreaming("");
    setLoading(true);
    try {
      const payload = {
        messages: [
          { role: "user", content: "你好，请用一两句话回答：这是管理面板的流式测试。" }
        ],
        stream: true
      };
      const res = await fetch(`${base}/api/chat/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(payload)
      });
      if (!res.ok && res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (res.body && ct.includes("text/event-stream")) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") { setLoading(false); }
              else {
                try {
                  const parsed = JSON.parse(data);
                  const chunk = parsed.content || parsed.choices?.[0]?.delta?.content || "";
                  if (chunk) setStreaming((s) => s + chunk);
                } catch {}
              }
            }
          }
        }
      } else {
        const text = await res.text();
        setStreaming(text);
      }
    } catch (e: any) {
      setStreaming(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const Chart = ({ data }: { data: { label: string; calls: number; errors: number }[] }) => {
    const w = 640; const h = 220; const p = 24;
    const xs = data.map((_, i) => p + i * ((w - 2 * p) / Math.max(1, data.length - 1)));
    const maxY = Math.max(1, ...data.map(d => Math.max(d.calls, d.errors)));
    const y = (v: number) => h - p - v * ((h - 2 * p) / maxY);
    const path = (k: "calls" | "errors") => data.map((d, i) => `${i === 0 ? "M" : "L"}${xs[i]},${y(d[k])}`).join(" ");
    return (
      <svg width={w} height={h} className="w-full">
        <line x1={p} y1={h - p} x2={w - p} y2={h - p} stroke="#ddd" />
        <line x1={p} y1={p} x2={p} y2={h - p} stroke="#ddd" />
        <motion.path d={path("calls")} fill="none" stroke="#6366F1" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
        <motion.path d={path("errors")} fill="none" stroke="#EF4444" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.1 }} />
        {data.map((d, i) => (
          <circle key={`c-${i}`} cx={xs[i]} cy={y(d.calls)} r={3} fill="#6366F1">
            <title>{`${d.label} 调用 ${d.calls}`}</title>
          </circle>
        ))}
        {data.map((d, i) => (
          <circle key={`e-${i}`} cx={xs[i]} cy={y(d.errors)} r={3} fill="#EF4444">
            <title>{`${d.label} 错误 ${d.errors}`}</title>
          </circle>
        ))}
      </svg>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg min-h-[60vh]">
      <h2 className="text-2xl font-bold mb-4">管理面板</h2>
      {!authed ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <input
            className="w-full border border-gray-200 dark:border-dark-border rounded px-3 py-2 bg-white dark:bg-dark-card"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="输入后端 ADMIN_TOKEN"
          />
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded bg-primary text-white hover:bg-indigo-400 transition-transform hover:scale-105 shadow" onClick={enter}>进入后台</button>
            {status && <span className="text-sm text-gray-600 dark:text-dark-text/80">{status}</span>}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-100" onClick={checkHealth}>后台状态</button>
            {health && <span className="text-sm text-gray-600 dark:text-dark-text/80">{health}</span>}
            <button className="px-4 py-2 rounded bg-primary text-white hover:bg-indigo-400 transition-transform hover:scale-105 shadow" onClick={reloadModels}>重载模型配置</button>
          </div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
            <div className="p-4 rounded border border-gray-200 dark:border-dark-border">
              <div className="text-sm text-gray-600 dark:text-dark-text/80">可用模型</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {models.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="px-3 py-2 rounded bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border">
                    {m.name}
                  </motion.div>
                ))}
              </div>
              {!models.length && (
                <div className="mt-2 text-sm text-red-600">模型列表获取失败：{loadErr || "空列表"}</div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <select className="border border-gray-200 dark:border-dark-border rounded p-2 bg-white dark:bg-dark-card" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button className="px-4 py-2 rounded bg-primary text-white hover:bg-indigo-400 transition-transform hover:scale-105 shadow" onClick={testStream} disabled={loading || !selected}>
                  {loading ? "生成中..." : "测试流式生成"}
                </button>
              </div>
              {streaming && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 rounded bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border whitespace-pre-wrap">
                  {streaming}
                </motion.div>
              )}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
            <div className="p-4 rounded border border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 mb-2">
                {[
                  { k: "24h", t: "24小时" },
                  { k: "7d", t: "一周" },
                  { k: "30d", t: "一月" },
                  { k: "365d", t: "一年" },
                ].map((opt) => (
                  <button key={opt.k} className={`px-3 py-2 rounded border ${range === opt.k ? "bg-primary text-white" : "bg-white dark:bg-dark-card"}`} onClick={() => loadMetrics(opt.k)}>
                    {opt.t}
                  </button>
                ))}
              </div>
              {metrics && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="p-2">时间范围</th>
                          <th className="p-2">访客数</th>
                          <th className="p-2">并发峰值</th>
                          <th className="p-2">API调用数</th>
                          <th className="p-2">报错数</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2">{metrics.range}</td>
                          <td className="p-2">{metrics.visitors}</td>
                          <td className="p-2">{metrics.maxConcurrency}</td>
                          <td className="p-2">{metrics.calls}</td>
                          <td className="p-2">{metrics.errors}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {Array.isArray(metrics.series) && metrics.series.length > 0 && (
                    <div className="mt-2">
                      <Chart data={metrics.series.map(s => ({ label: s.label, calls: s.calls, errors: s.errors }))} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}