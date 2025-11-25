import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  Server,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Table as TableIcon,
  Lock,
  LogOut
} from 'lucide-react';

interface MetricSeries {
  label: string;
  calls: number;
  errors: number;
  visits: number;
  visitors: number;
  cumulativeVisitors: number;
  maxConcurrency?: number;
}

interface MetricsData {
  visitors: number;
  totalUniqueVisitors: number;
  maxConcurrency: number;
  calls: number;
  errors: number;
  range: string;
  series: MetricSeries[];
}

const Admin = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '365d'>('24h');
  const [selectedMetric, setSelectedMetric] = useState<keyof MetricSeries>('visits');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      localStorage.setItem('admin_token', password);
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('请输入管理员密码');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setMetrics(null);
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setIsAuthenticated(false);
        throw new Error('Unauthorized');
      }

      const res = await fetch(`/api/admin/metrics?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 403) {
          setLoginError('密码错误，请重新登录');
          handleLogout();
        }
        throw new Error('Failed to fetch metrics');
      }

      const data = await res.json();
      console.log('Metrics data:', data);
      setMetrics(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
    }
  }, [timeRange, isAuthenticated]);

  const Chart = ({ data, metricType }: { data: MetricSeries[], metricType: keyof MetricSeries }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const maxVal = Math.max(...data.map(d => (d[metricType] as number) || 0), 1);

    // Chart dimensions
    const height = 256; // h-64 = 16rem = 256px
    const width = 1000; // ViewBox width
    const padding = 20;

    // Calculate points
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d[metricType] as number || 0) / maxVal) * (height - padding * 2) - padding;
      return { x, y, val: d[metricType], label: d.label };
    });

    // Generate path d attribute
    const pathD = points.length > 1
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
      : '';

    // Generate area path d attribute (closed path for gradient)
    const areaD = points.length > 1
      ? `${pathD} L ${width} ${height} L 0 ${height} Z`
      : '';

    const metricName = metricType === 'calls' ? '调用' :
      metricType === 'errors' ? '错误' :
        metricType === 'visits' ? '访问量(PV)' :
          metricType === 'visitors' ? '独立访客(UV)' :
            metricType === 'cumulativeVisitors' ? '累计访客' : '并发';

    const metricColor = metricType === 'calls' ? '#6366F1' :
      metricType === 'errors' ? '#EF4444' :
        metricType === 'visits' ? '#8B5CF6' :
          metricType === 'visitors' ? '#10B981' :
            metricType === 'cumulativeVisitors' ? '#059669' : '#F59E0B';

    return (
      <div className="h-64 w-full relative group" onMouseLeave={() => setHoveredIndex(null)}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Defs for gradient */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={metricColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <line
              key={tick}
              x1="0"
              y1={height - tick * (height - padding * 2) - padding}
              x2={width}
              y2={height - tick * (height - padding * 2) - padding}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area fill */}
          <motion.path
            d={areaD}
            fill="url(#chartGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Line path */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={metricColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          {/* Hover effects */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <>
              {/* Vertical line */}
              <line
                x1={points[hoveredIndex].x}
                y1={padding}
                x2={points[hoveredIndex].x}
                y2={height}
                stroke={metricColor}
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              {/* Point circle */}
              <circle
                cx={points[hoveredIndex].x}
                cy={points[hoveredIndex].y}
                r="6"
                fill={metricColor}
                stroke="white"
                strokeWidth="2"
              />
            </>
          )}
        </svg>

        {/* Interactive Overlay */}
        <div className="absolute inset-0 flex">
          {points.map((_, i) => (
            <div
              key={i}
              className="flex-1 hover:bg-transparent cursor-crosshair"
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}
        </div>

        {/* Tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute pointer-events-none z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredIndex / (points.length - 1)) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100}%`,
              marginTop: '-10px'
            }}
          >
            <div className="font-bold whitespace-nowrap">{points[hoveredIndex].label}</div>
            <div className="whitespace-nowrap">{metricName}: {points[hoveredIndex].val}</div>
          </div>
        )}
      </div>
    );
  };

  // Login page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card p-8 rounded-xl border border-gray-200 dark:border-dark-border shadow-lg max-w-md w-full"
        >
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">管理员登录</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">请输入管理员密码访问后台</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                管理员密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入密码"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
            >
              登录
            </button>
          </form>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
            提示：请输入管理员令牌
          </p>
        </motion.div>
      </div>
    );
  }

  if (loading && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchMetrics} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              系统监控
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              实时监控系统运行状态和用户访问数据
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-dark-card p-1 rounded-lg border border-gray-200 dark:border-dark-border shadow-sm">
              {(['24h', '7d', '30d', '365d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timeRange === range
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg'
                    }`}
                >
                  {range === '24h' ? '24小时' :
                    range === '7d' ? '7天' :
                      range === '30d' ? '30天' : '1年'}
                </button>
              ))}
              <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-1" />
              <button
                onClick={fetchMetrics}
                className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-dark-bg rounded-md transition-colors"
                title="刷新数据"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">总访客 (UV)</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {metrics?.totalUniqueVisitors?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">最大并发</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {metrics?.maxConcurrency?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">API 调用</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {metrics?.calls?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">错误率</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {metrics?.calls ? ((metrics.errors / metrics.calls) * 100).toFixed(2) : 0}%
                </h3>
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Chart Section */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-dark-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              趋势分析
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              {(['calls', 'errors', 'visits', 'visitors', 'cumulativeVisitors', 'maxConcurrency'] as const).map((metric) => (
                <label key={metric} className={`flex items-center gap-1 px-3 py-1 rounded cursor-pointer border transition-colors ${selectedMetric === metric ? 'bg-primary/10 border-primary text-primary' : 'border-transparent hover:bg-gray-100 dark:hover:bg-dark-bg'}`}>
                  <input
                    type="radio"
                    name="chartMetric"
                    value={metric}
                    checked={selectedMetric === metric}
                    onChange={(e) => setSelectedMetric(e.target.value as keyof MetricSeries)}
                    className="hidden"
                  />
                  <span className="text-sm font-medium">
                    {metric === 'calls' ? '调用数' :
                      metric === 'errors' ? '错误数' :
                        metric === 'visits' ? '访问量(PV)' :
                          metric === 'visitors' ? '访客(UV)' :
                            metric === 'cumulativeVisitors' ? '累计UV' : '并发峰值'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-4">
            {metrics?.series && metrics.series.length > 0 ? (
              <Chart data={metrics.series} metricType={selectedMetric} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* Detailed Data Table */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-gray-500" />
              详细数据
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-dark-bg/50 text-gray-500 dark:text-gray-400 font-medium">
                <tr>
                  <th className="p-3">时间</th>
                  <th className="p-3">访问(PV)</th>
                  <th className="p-3">访客(UV)</th>
                  <th className="p-3">累计UV</th>
                  <th className="p-3">API调用</th>
                  <th className="p-3">报错</th>
                  <th className="p-3">并发</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {metrics?.series?.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors">
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{s.label}</td>
                    <td className="p-3">{s.visits || 0}</td>
                    <td className="p-3">{s.visitors}</td>
                    <td className="p-3">{s.cumulativeVisitors || 0}</td>
                    <td className="p-3">{s.calls}</td>
                    <td className={s.errors > 0 ? "p-3 text-red-600 dark:text-red-400 font-medium" : "p-3"}>{s.errors}</td>
                    <td className="p-3">{s.maxConcurrency || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;