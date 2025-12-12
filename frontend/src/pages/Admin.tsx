import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
    Lock,
    AlertCircle,
    LogOut,
    Users,
    Activity,
    Server,
    BarChart3,
    RefreshCw,
    Table as TableIcon,
    Plus,
    X,
    CheckCircle,
    Save,
    Edit,
    Trash2,
    Upload
} from 'lucide-react';

interface MetricSeries {
    label: string;
    visits: number;
    calls: number;
    errors: number;
    visitors: number;
    cumulativeVisitors: number;
}

interface MetricsData {
    visitors: number;
    totalUniqueVisitors: number;
    calls: number;
    errors: number;
    series: MetricSeries[];
}

interface Article {
    id: string;
    title: string;
    content: string;
    tags: string[] | string;
    author: string;
    published: boolean;
    createdAt: number;
    updatedAt: number;
}

interface Sponsor {
    id: string;
    name: string;
    avatar: string;
    message: string;
    amount?: string;
    date: number;
}

const Admin = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState<'dashboard' | 'articles' | 'sponsors'>('dashboard');
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '365d'>('24h');
    const [metricType, setMetricType] = useState<keyof MetricSeries>('visits');
    const [metrics, setMetrics] = useState<MetricsData | null>(null);

    const [articles, setArticles] = useState<Article[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingArticle, setEditingArticle] = useState<Partial<Article>>({});

    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [isEditingSponsor, setIsEditingSponsor] = useState(false);
    const [editingSponsor, setEditingSponsor] = useState<Partial<Sponsor>>({});

    const [saveStatus, setSaveStatus] = useState<'saving' | 'success' | 'error' | ''>('');
    const [avatarUploading, setAvatarUploading] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            setIsAuthenticated(true);
        } else {
            setLoading(false);
        }
    }, []);

    // --- Data Fetching Effects ---
    useEffect(() => {
        if (isAuthenticated) {
            if (activeTab === 'dashboard') {
                fetchMetrics();
            } else if (activeTab === 'articles') {
                fetchArticles();
            } else if (activeTab === 'sponsors') {
                fetchSponsors();
            }
        }
    }, [isAuthenticated, activeTab, timeRange]);

    // --- Handlers: Auth ---
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
        setArticles([]);
        setSponsors([]);
    };

    // --- Handlers: Data Fetching ---
    const fetchSponsors = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/sponsors');
            // Public endpoint doesn't need auth, but admin endpoint might be better if we want more details?
            // Actually let's use public for listing, but we need editing.
            // Wait, public list is fine.

            if (!res.ok) throw new Error('Failed to fetch sponsors');
            const data = await res.json();
            setSponsors(data);
        } catch (err) {
            console.error(err);
            setError('无法加载赞助者列表');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSponsor = async () => {
        try {
            setSaveStatus('saving');
            const token = localStorage.getItem('admin_token');
            const isNew = !editingSponsor.id;
            const url = isNew ? '/api/admin/sponsors' : `/api/admin/sponsors/${editingSponsor.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editingSponsor)
            });

            if (!res.ok) throw new Error('Failed to save sponsor');

            setSaveStatus('success');
            setTimeout(() => setSaveStatus(''), 2000);
            setIsEditingSponsor(false);
            fetchSponsors();
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            alert('保存失败');
        }
    };

    const handleDeleteSponsor = async (id: string) => {
        if (!confirm('确定要删除这位赞助者吗？')) return;

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`/api/admin/sponsors/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to delete sponsor');
            fetchSponsors();
        } catch (err) {
            console.error(err);
            alert('删除失败');
        }
    };

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('admin_token');
            if (!token) throw new Error('Unauthorized');

            const res = await fetch(`/api/admin/metrics?range=${timeRange}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });

            if (!res.ok) {
                if (res.status === 403) {
                    setLoginError('密码错误，请重新登录');
                    handleLogout();
                }
                throw new Error('Failed to fetch metrics');
            }

            const data = await res.json();
            setMetrics(data);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchArticles = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/articles', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            if (!res.ok) throw new Error('Failed to fetch articles');
            const data = await res.json();
            setArticles(data);
        } catch (err) {
            console.error(err);
            setError('无法加载文章列表');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveArticle = async () => {
        try {
            setSaveStatus('saving');
            const token = localStorage.getItem('admin_token');
            const isNew = !editingArticle.id;
            const url = isNew ? '/api/admin/articles' : `/api/admin/articles/${editingArticle.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...editingArticle,
                    author: editingArticle.author || 'Admin',
                    tags: typeof editingArticle.tags === 'string' ? (editingArticle.tags as string).split(',').map(t => t.trim()) : editingArticle.tags || []
                })
            });

            if (!res.ok) throw new Error('Failed to save article');

            setSaveStatus('success');
            setTimeout(() => setSaveStatus(''), 2000);
            setIsEditing(false);
            fetchArticles();
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            alert('保存失败');
        }
    };

    const handleDeleteArticle = async (id: string) => {
        if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`/api/admin/articles/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to delete article');
            fetchArticles();
        } catch (err) {
            console.error(err);
            alert('删除失败');
        }
    };

    // Handle avatar upload for sponsors
    const handleAvatarUpload = async (file: File) => {
        try {
            setAvatarUploading(true);
            const formData = new FormData();
            formData.append('image', file);

            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/upload-avatar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            setEditingSponsor(prev => ({ ...prev, avatar: data.url }));
        } catch (err) {
            console.error(err);
            alert('头像上传失败');
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleAvatarDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleAvatarUpload(files[0]);
        }
    };

    const handleAvatarPaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) handleAvatarUpload(file);
            }
        }
    };

    const handleImageUpload = async (file: File) => {
        try {
            const formData = new FormData();
            // Sanitize filename to prevent markdown issues
            const safeName = file.name.replace(/[\[\]\(\)]/g, '_');
            const renamedFile = new File([file], safeName, { type: file.type });
            formData.append('image', renamedFile);

            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            const imageUrl = data.url;
            const imageMarkdown = `![${safeName}](${imageUrl})`;

            setEditingArticle(prev => {
                const content = prev.content || '';
                const textarea = textareaRef.current;

                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newContent = content.substring(0, start) + imageMarkdown + content.substring(end);

                    // Restore cursor position after update (needs timeout to wait for render)
                    setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
                    }, 0);

                    return { ...prev, content: newContent };
                }

                return {
                    ...prev,
                    content: content + '\n' + imageMarkdown
                };
            });
        } catch (err) {
            console.error(err);
            alert('图片上传失败');
        }
    };

    // Handle paste for image upload
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) handleImageUpload(file);
            }
        }
    };

    // Handle drag and drop for image upload
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageUpload(files[0]);
        }
    };

    // --- Chart Component ---
    const Chart = ({ data, metricType }: { data: MetricSeries[], metricType: keyof MetricSeries }) => {
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        const maxVal = Math.max(...data.map(d => (d[metricType] as number) || 0), 1);

        const height = 256;
        const width = 1000;
        const padding = 20;

        // Color mapping for different metrics
        const colorMap: Record<string, { stroke: string; fill: string; text: string }> = {
            visits: { stroke: '#00B4FF', fill: '#00B4FF', text: '访问' },      // Primary blue
            calls: { stroke: '#06B6D4', fill: '#06B6D4', text: 'API' },        // Cyan
            errors: { stroke: '#ef4444', fill: '#ef4444', text: '错误' },      // Red
            visitors: { stroke: '#10b981', fill: '#10b981', text: '访客' },    // Green
            cumulativeVisitors: { stroke: '#f59e0b', fill: '#f59e0b', text: '累计访客' } // Amber
        };

        const currentColor = colorMap[metricType] || colorMap.visits;

        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d[metricType] as number || 0) / maxVal) * (height - padding * 2) - padding;
            return { x, y, val: d[metricType], label: d.label };
        });

        const pathD = points.length > 1
            ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
            : '';

        return (
            <div className="relative w-full">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                    {/* Grid lines */}
                    {[...Array(5)].map((_, i) => {
                        const y = padding + (i / 4) * (height - padding * 2);
                        return (
                            <line key={i} x1="0" y1={y} x2={width} y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                        );
                    })}

                    {/* Area fill */}
                    {points.length > 1 && (
                        <path
                            d={`${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`}
                            fill={currentColor.fill}
                            opacity="0.2"
                        />
                    )}

                    {/* Line with Animation */}
                    {points.length > 1 && (
                        <motion.path
                            d={pathD}
                            fill="none"
                            stroke={currentColor.stroke}
                            strokeWidth="2"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                    )}

                    {/* Points */}
                    {points.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={hoveredIndex === i ? 6 : 4}
                            fill={currentColor.fill}
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        />
                    ))}
                </svg>

                {/* Tooltip */}
                {hoveredIndex !== null && (
                    <div
                        className="absolute pointer-events-none z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg transform -translate-x-1/2 -translate-y-full"
                        style={{
                            left: `${(hoveredIndex / (points.length - 1)) * 100}%`,
                            top: `${(points[hoveredIndex].y / height) * 100}%`,
                            marginTop: '-10px'
                        }}
                    >
                        <div className="font-bold whitespace-nowrap">{points[hoveredIndex].label}</div>
                        <div className="whitespace-nowrap">{currentColor.text}: {points[hoveredIndex].val}</div>
                    </div>
                )}
            </div>
        );
    };

    // --- Login Screen ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-lg border border-gray-200 dark:border-dark-border w-full max-w-md"
                >
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">管理员登录</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                管理员密码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                placeholder="请输入密码"
                            />
                        </div>
                        {loginError && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {loginError}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                        >
                            登录
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    // --- Main Admin Interface ---
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">管理面板</h1>
                        <p className="text-gray-600 dark:text-gray-400">系统监控与内容管理</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-card p-1 rounded-lg border border-gray-200 dark:border-dark-border">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'dashboard'
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                仪表盘
                            </button>
                            <button
                                onClick={() => setActiveTab('articles')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'articles'
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                文章管理
                            </button>
                            <button
                                onClick={() => setActiveTab('sponsors')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'sponsors'
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                赞助者
                            </button>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-card rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            退出
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {activeTab === 'dashboard' && (
                    // --- Dashboard View ---
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                        实时
                                    </span>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">总访问量</h3>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {metrics?.visitors.toLocaleString() || '-'}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">API 调用</h3>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {metrics?.calls.toLocaleString() || '-'}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                        <Server className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">独立访客</h3>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {metrics?.totalUniqueVisitors.toLocaleString() || '-'}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">错误次数</h3>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {metrics?.errors.toLocaleString() || '-'}
                                </div>
                            </motion.div>
                        </div>

                        {/* Time Range Selector */}
                        <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">数据趋势</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={metricType}
                                        onChange={e => setMetricType(e.target.value as keyof MetricSeries)}
                                        className="px-3 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                    >
                                        <option value="visits">访问量</option>
                                        <option value="calls">API调用</option>
                                        <option value="errors">错误数</option>
                                        <option value="visitors">访客数</option>
                                    </select>
                                    <div className="flex gap-1 bg-gray-100 dark:bg-dark-bg p-1 rounded-lg">
                                        {(['24h', '7d', '30d', '365d'] as const).map(range => (
                                            <button
                                                key={range}
                                                onClick={() => setTimeRange(range)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${timeRange === range
                                                    ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                {range}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={fetchMetrics}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {loading && <div className="text-center py-8 text-gray-500">加载中...</div>}
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            )}
                            {metrics && metrics.series && metrics.series.length > 0 && (
                                <Chart data={metrics.series} metricType={metricType} />
                            )}
                        </div>

                        {/* Data Table */}
                        {metrics && metrics.series && (
                            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <TableIcon className="w-5 h-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">详细数据</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                                            <tr>
                                                <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">时间</th>
                                                <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">访问</th>
                                                <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">API</th>
                                                <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">错误</th>
                                                <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">访客</th>
                                                <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">累计访客</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metrics.series.map((row, i) => (
                                                <tr key={i} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors">
                                                    <td className="py-3 px-4 text-gray-900 dark:text-white">{row.label}</td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.visits.toLocaleString()}</td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.calls.toLocaleString()}</td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.errors.toLocaleString()}</td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.visitors.toLocaleString()}</td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.cumulativeVisitors.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'articles' && (
                    // --- Articles View ---
                    <div className="space-y-6">
                        {/* Article Header */}
                        {!isEditing && (
                            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">文章列表</h2>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">共 {articles.length} 篇文章</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingArticle({ published: false, tags: [] });
                                            setIsEditing(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        新建文章
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Article Editor */}
                        {isEditing ? (
                            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {editingArticle.id ? '编辑文章' : '新建文章'}
                                    </h2>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            标题
                                        </label>
                                        <input
                                            type="text"
                                            value={editingArticle.title || ''}
                                            onChange={e => setEditingArticle(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="文章标题"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            标签 (用逗号分隔)
                                        </label>
                                        <input
                                            type="text"
                                            value={Array.isArray(editingArticle.tags) ? editingArticle.tags.join(', ') : editingArticle.tags || ''}
                                            onChange={e => setEditingArticle(prev => ({ ...prev, tags: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="AI, Tech, Update"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                        <div className="flex flex-col">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                内容 (Markdown)
                                            </label>
                                            <div
                                                className="flex-1 relative h-[500px]"
                                                onPaste={handlePaste}
                                                onDrop={handleDrop}
                                                onDragOver={e => e.preventDefault()}
                                            >
                                                <textarea
                                                    ref={textareaRef}
                                                    value={editingArticle.content || ''}
                                                    onChange={e => setEditingArticle(prev => ({ ...prev, content: e.target.value }))}
                                                    className="w-full h-full p-4 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none overflow-y-auto font-mono text-sm"
                                                    placeholder="# Hello World..."
                                                />
                                                <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white/80 dark:bg-dark-card/80 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                                                    支持粘贴/拖拽上传图片
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                预览
                                            </label>
                                            <div className="flex-1 h-[500px] p-4 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg prose dark:prose-invert max-w-none overflow-y-auto">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                                    components={{
                                                        img: ({ node, ...props }) => (
                                                            <img {...props} className="max-w-full h-auto rounded-lg shadow-md my-4 border border-gray-200 dark:border-dark-border" />
                                                        )
                                                    }}
                                                >
                                                    {editingArticle.content || ''}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-border">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="published"
                                                checked={editingArticle.published || false}
                                                onChange={e => setEditingArticle(prev => ({ ...prev, published: e.target.checked }))}
                                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                            />
                                            <label htmlFor="published" className="text-sm text-gray-700 dark:text-gray-300">
                                                立即发布
                                            </label>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                                            >
                                                取消
                                            </button>
                                            <button
                                                onClick={handleSaveArticle}
                                                disabled={saveStatus === 'saving'}
                                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                                            >
                                                {saveStatus === 'saving' ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        保存中...
                                                    </>
                                                ) : saveStatus === 'success' ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" />
                                                        已保存
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        保存文章
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Article List
                            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
                                {loading ? (
                                    <div className="text-center py-12 text-gray-500">加载中...</div>
                                ) : articles.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">暂无文章</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                                                <tr>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">标题</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">作者</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">状态</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">创建时间</th>
                                                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {articles.map(article => (
                                                    <tr key={article.id} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors">
                                                        <td className="py-4 px-4">
                                                            <div className="font-medium text-gray-900 dark:text-white">{article.title}</div>
                                                            {article.tags && article.tags.length > 0 && (
                                                                <div className="flex gap-1 mt-1">
                                                                    {article.tags.slice(0, 3).map(tag => (
                                                                        <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{article.author}</td>
                                                        <td className="py-4 px-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${article.published
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                                                }`}>
                                                                {article.published ? '已发布' : '草稿'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-gray-700 dark:text-gray-300 text-sm">
                                                            {new Date(article.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingArticle(article);
                                                                        setIsEditing(true);
                                                                    }}
                                                                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteArticle(article.id)}
                                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'sponsors' && (
                    <div className="space-y-6">
                        {/* Sponsor Header */}
                        {!isEditingSponsor && (
                            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">赞助者列表</h2>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">共 {sponsors.length} 位赞助者</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingSponsor({});
                                            setIsEditingSponsor(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        添加赞助者
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Sponsor Editor */}
                        {isEditingSponsor ? (
                            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {editingSponsor.id ? '编辑赞助者' : '添加赞助者'}
                                    </h2>
                                    <button
                                        onClick={() => setIsEditingSponsor(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            昵称
                                        </label>
                                        <input
                                            type="text"
                                            value={editingSponsor.name || ''}
                                            onChange={e => setEditingSponsor(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="赞助者昵称"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            头像
                                        </label>
                                        <div
                                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${avatarUploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'} ${editingSponsor.avatar ? 'border-primary' : 'border-gray-300 dark:border-dark-border'}`}
                                            onDrop={handleAvatarDrop}
                                            onDragOver={e => e.preventDefault()}
                                            onPaste={handleAvatarPaste}
                                            onClick={() => avatarInputRef.current?.click()}
                                            tabIndex={0}
                                        >
                                            {editingSponsor.avatar ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <img
                                                        src={editingSponsor.avatar}
                                                        alt="头像预览"
                                                        className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-md"
                                                    />
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">点击或拖拽更换头像</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3 py-4">
                                                    {avatarUploading ? (
                                                        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                                                    ) : (
                                                        <Upload className="w-10 h-10 text-gray-400" />
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">点击或拖拽上传头像</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">支持 JPG, PNG, WebP</p>
                                                    </div>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                ref={avatarInputRef}
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleAvatarUpload(file);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            赞助金额 (可选)
                                        </label>
                                        <input
                                            type="text"
                                            value={editingSponsor.amount || ''}
                                            onChange={e => setEditingSponsor(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="例如：¥50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            留言
                                        </label>
                                        <textarea
                                            value={editingSponsor.message || ''}
                                            onChange={e => setEditingSponsor(prev => ({ ...prev, message: e.target.value }))}
                                            className="w-full h-32 p-4 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                            placeholder="赞助留言..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                                        <button
                                            onClick={() => setIsEditingSponsor(false)}
                                            className="px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSaveSponsor}
                                            disabled={saveStatus === 'saving'}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                                        >
                                            {saveStatus === 'saving' ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    保存中...
                                                </>
                                            ) : saveStatus === 'success' ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    已保存
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    保存赞助者
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Sponsor List
                            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
                                {loading ? (
                                    <div className="text-center py-12 text-gray-500">加载中...</div>
                                ) : sponsors.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">暂无赞助者</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                                                <tr>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">用户</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">金额</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">留言</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">时间</th>
                                                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sponsors.map(sponsor => (
                                                    <tr key={sponsor.id} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors">
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={sponsor.avatar || 'https://via.placeholder.com/40'}
                                                                    alt={sponsor.name}
                                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-dark-border"
                                                                />
                                                                <div className="font-medium text-gray-900 dark:text-white">{sponsor.name}</div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-gray-700 dark:text-gray-300 font-medium">
                                                            {sponsor.amount || '-'}
                                                        </td>
                                                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                                            {sponsor.message}
                                                        </td>
                                                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm">
                                                            {new Date(sponsor.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingSponsor(sponsor);
                                                                        setIsEditingSponsor(true);
                                                                    }}
                                                                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSponsor(sponsor.id)}
                                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;