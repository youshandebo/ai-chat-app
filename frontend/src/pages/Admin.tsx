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
  const [metrics, setMetrics] = useState<{ visitors: number; totalUniqueVisitors: number; maxConcurrency: number; calls: number; errors: number; range: string; series?: { label: string; calls: number; errors: number; visitors: number; maxConcurrency?: number }[] } | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] = useState<'calls' | 'errors' | 'visitors' | 'maxConcurrency'>('calls');

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

  const Chart = ({ data, metricType }: { data: { label: string; value: number }[]; metricType: 'calls' | 'errors' | 'visitors' | 'maxConcurrency' }) => {
    const w = 640; const h = 220; const p = 40; // 增加左边距以显示Y轴标签
    const xs = data.map((_, i) => p + i * ((w - 2 * p) / Math.max(1, data.length - 1)));
    const maxY = Math.max(1, ...data.map(d => d.value || 0));
    const y = (v: number) => h - p - v * ((h - 2 * p) / maxY);
    const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${xs[i]},${y(d.value || 0)}`).join(" ");
    
    // 添加状态以跟踪悬停的点
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    
    // 生成Y轴刻度
    const yTicks = [];
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxY / 5) * i);
      yTicks.push({ value, y: y(value) });
    }
    
    // 获取当前指标类型的名称
    const metricName = metricType === 'calls' ? '调用' : 
                      metricType === 'errors' ? '错误' : 
                      metricType === 'visitors' ? '访客' : '并发';
    
    // 设置颜色
    const metricColor = metricType === 'calls' ? '#6366F1' : 
                       metricType === 'errors' ? '#EF4444' : 
                       metricType === 'visitors' ? '#10B981' : '#F59E0B';
    
    return (
      <div className="relative">
        <svg width={w} height={h} className="w-full">
          {/* X轴和Y轴 */}
          <line x1={p} y1={h - p} x2={w - p} y2={h - p} stroke="#ddd" />
          <line x1={p} y1={p} x2={p} y2={h - p} stroke="#ddd" />
          
          {/* Y轴刻度和标签 */}
          {yTicks.map((tick, i) => (
            <g key={`ytick-${i}`}>
              <line x1={p - 5} y1={tick.y} x2={p} y2={tick.y} stroke="#ddd" />
              <text x={p - 10} y={tick.y + 4} textAnchor="end" fontSize="10" fill="#666">{tick.value}</text>
            </g>
          ))}
          
          {/* X轴标签（只显示部分标签以避免拥挤） */}
          {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => {
            const actualIndex = i * Math.ceil(data.length / 5);
            return (
              <g key={`xlabel-${actualIndex}`}>
                <line x1={xs[actualIndex]} y1={h - p} x2={xs[actualIndex]} y2={h - p + 5} stroke="#ddd" />
                <text 
                  x={xs[actualIndex]} 
                  y={h - p + 20} 
                  textAnchor="middle" 
                  fontSize="10" 
                  fill="#666"
                  transform={`rotate(-45, ${xs[actualIndex]}, ${h - p + 20})`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
          
          <motion.path d={path} fill="none" stroke={metricColor} strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
          {data.map((d, i) => (
            <g key={`data-${i}`}>
              <circle 
                cx={xs[i]} 
                cy={y(d.value || 0)} 
                r={hoveredIndex === i ? 6 : 3} 
                fill={metricColor}
                className="cursor-pointer hover:opacity-80 transition-all"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <title>{`${d.label} ${metricName} ${d.value || 0}`}</title>
              </circle>
              {hoveredIndex === i && (
                <text 
                  x={xs[i]} 
                  y={y(d.value || 0) - 10} 
                  textAnchor="middle" 
                  fontSize="12" 
                  fill={metricColor}
                  className="font-medium"
                >
                  {d.value || 0}
                </text>
              )}
            </g>
          ))}
        </svg>
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="absolute top-0 left-0 mt-2 text-sm text-gray-600 dark:text-dark-text/80 bg-white dark:bg-dark-card p-2 rounded border border-gray-200 dark:border-dark-border shadow-sm">
            <div>{data[hoveredIndex].label}</div>
            <div>{metricName}: {data[hoveredIndex].value || 0}</div>
          </div>
        )}
      </div>
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
              <div className="flex flex-wrap gap-2 mb-2">
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
                        <tr className="text-left border-b border-gray-200 dark:border-dark-border">
                          <th className="p-2">统计项</th>
                          <th className="p-2">数值</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 dark:border-dark-border/50">
                          <td className="p-2">时间范围</td>
                          <td className="p-2">{metrics.range === '24h' ? '24小时' : metrics.range === '7d' ? '一周' : metrics.range === '30d' ? '一月' : '一年'}</td>
                        </tr>
                        <tr className="border-b border-gray-100 dark:border-dark-border/50">
                          <td className="p-2">访客数（该周期）</td>
                          <td className="p-2">{metrics.visitors}</td>
                        </tr>
                        <tr className="border-b border-gray-100 dark:border-dark-border/50">
                          <td className="p-2">总访客数（去重）</td>
                          <td className="p-2">{metrics.totalUniqueVisitors}</td>
                        </tr>
                        <tr className="border-b border-gray-100 dark:border-dark-border/50">
                          <td className="p-2">并发峰值</td>
                          <td className="p-2">{metrics.maxConcurrency}</td>
                        </tr>
                        <tr className="border-b border-gray-100 dark:border-dark-border/50">
                          <td className="p-2">API调用数</td>
                          <td className="p-2">{metrics.calls}</td>
                        </tr>
                        <tr>
                          <td className="p-2">报错数</td>
                          <td className="p-2">{metrics.errors}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {Array.isArray(metrics.series) && metrics.series.length > 0 && (
                    <div className="mt-2 space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="p-2">时间</th>
                              <th className="p-2">API调用</th>
                              <th className="p-2">报错</th>
                              <th className="p-2">访客</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.series.map((s, idx) => (
                              <tr key={`row-${idx}`} className="odd:bg-gray-50 dark:odd:bg-dark-bg/40">
                                <td className="p-2">{s.label}</td>
                                <td className="p-2">{s.calls}</td>
                                <td className="p-2">{s.errors}</td>
                                <td className="p-2">{s.visitors}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <span className="text-sm text-gray-600 dark:text-dark-text/80">图表数据:</span>
                        {['calls', 'errors', 'visitors', 'maxConcurrency'].map((metric) => (
                          <label key={metric} className="flex items-center gap-1">
                            <input
                              type="radio"
                              name="chartMetric"
                              value={metric}
                              checked={selectedMetric === metric}
                              onChange={(e) => setSelectedMetric(e.target.value as any)}
                            />
                            <span className="text-sm">
                              {metric === 'calls' ? '调用数' : 
                               metric === 'errors' ? '错误数' : 
                               metric === 'visitors' ? '访客数' : '并发峰值'}
                            </span>
                          </label>
                        ))}
                      </div>
                      <Chart 
                        key={`${range}-${selectedMetric}`} // 添加selectedMetric到key中，确保在切换指标时重新渲染
                        data={metrics.series.map(s => ({ 
                          label: s.label, 
                          value: s[selectedMetric] || 0
                        }))}
                        metricType={selectedMetric}
                      />
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