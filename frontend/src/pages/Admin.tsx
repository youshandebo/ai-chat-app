import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
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
    Upload,
    ShoppingBag,
    Package,
    Palette,
    Key,
    Copy,
    GripVertical,
    Eye,
    EyeOff,
    Coins,
    Settings
} from 'lucide-react';
import { Reorder } from "framer-motion";
import CustomSelect from "../components/CustomSelect";
import { useChatStore } from "../store/useChatStore";

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

interface Product {
    id: string;
    name: string;
    description: string;
    price: string;
    image: string;
    afdianLink?: string;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}

interface AdminModel {
    id: string;
    name: string;
    enabled: boolean;
    creditCost: number;
    usage: number;
    [key: string]: any;
}

const Admin = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // First-deploy setup state
    const [needsSetup, setNeedsSetup] = useState(false);
    const [setupPassword, setSetupPassword] = useState('');
    const [setupConfirm, setSetupConfirm] = useState('');
    const [setupError, setSetupError] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupDone, setSetupDone] = useState(false);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'articles' | 'sponsors' | 'products' | 'keys' | 'models'>('dashboard');
    const [isAddingModel, setIsAddingModel] = useState(false);
    const [modelModalMode, setModelModalMode] = useState<'add' | 'edit'>('add');
    const [editingModelId, setEditingModelId] = useState<string | null>(null);
    const [newModel, setNewModel] = useState<any>({ id: '', name: '', apiBase: '', apiKey: '', creditCost: 1, enabled: true });
    // Dashboard settings
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '365d'>('24h');
    const [metricType, setMetricType] = useState<keyof MetricSeries>('visits');
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [uptimeStart, setUptimeStart] = useState<string>('');

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
    const productImageRef = useRef<HTMLInputElement>(null);

    // Products state
    const [products, setProducts] = useState<Product[]>([]);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
    const [productImageUploading, setProductImageUploading] = useState(false);

    // Theme state
    const [currentTheme, setCurrentTheme] = useState('default');
    const [keysData, setKeysData] = useState<{ unused: string[], activated: Record<string, any> }>({ unused: [], activated: {} });
    const [keyGenerations, setKeyGenerations] = useState(1);

    // Models state
    const [adminModels, setAdminModels] = useState<AdminModel[]>([]);

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (token) {
            // Verify token with server before trusting it
            fetch('/api/admin/health', { headers: { Authorization: `Bearer ${token}` } })
                .then(r => {
                    if (r.ok) {
                        setIsAuthenticated(true);
                    } else {
                        sessionStorage.removeItem('admin_token');
                        setLoading(false);
                    }
                })
                .catch(() => {
                    sessionStorage.removeItem('admin_token');
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
        // Check if first-deploy setup is needed
        fetch('/api/setup/status')
            .then(r => r.json())
            .then(data => {
                if (data.needsSetup) setNeedsSetup(true);
            })
            .catch(() => {});
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
            } else if (activeTab === 'products') {
                fetchProducts();
            } else if (activeTab === 'keys') {
                fetchKeys();
            } else if (activeTab === 'models') {
                fetchAdminModels();
            }
        }
        fetchTheme();
    }, [isAuthenticated, activeTab, timeRange]);

    const fetchTheme = async () => {
        try {
            const res = await fetch('/api/settings/theme');
            const data = await res.json();
            setCurrentTheme(data.theme || 'default');
        } catch (e) { console.error(e); }
    };

    const fetchKeys = async () => {
        try {
            const res = await fetch('/api/admin/keys', {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('admin_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setKeysData(data);
            }
        } catch (e) { console.error('Failed to fetch keys', e); }
    };

    const handleGenerateKeys = async () => {
        try {
            const res = await fetch('/api/admin/keys/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionStorage.getItem('admin_token')}`
                },
                body: JSON.stringify({ count: keyGenerations })
            });
            if (res.ok) {
                fetchKeys();
                alert('生成成功');
            }
        } catch (e) {
            console.error(e);
            alert('生成失败');
        }
    };


    const { settings } = useChatStore();

    const handleUpdateTheme = async (theme: string) => {
        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/settings/theme', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme })
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentTheme(data.theme);
                // Apply theme-newyear class
                if (data.theme === 'new-year') {
                    document.documentElement.classList.add('theme-newyear');
                } else {
                    document.documentElement.classList.remove('theme-newyear');
                }
                // Sync dark mode with store (preserve current dark/light preference)
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                const isDark = settings.theme === "dark" || (settings.theme === "auto" && prefersDark);
                document.documentElement.classList.toggle("dark", isDark);
            }
        } catch (e) {
            console.error('Failed to update theme', e);
        }
    };

    // --- Handlers: Auth ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            setLoginError('请输入管理员密码');
            return;
        }
        setLoginError('');
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (res.ok && data.success && data.token) {
                sessionStorage.setItem('admin_token', data.token);
                setIsAuthenticated(true);
                setLoginError('');
            } else {
                setLoginError(data.error || '登录失败');
            }
        } catch {
            setLoginError('网络错误，请重试');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_token');
        setIsAuthenticated(false);
        setMetrics(null);
        setArticles([]);
        setSponsors([]);
    };

    const handleUpdateUptime = async () => {
        try {
            const token = sessionStorage.getItem('admin_token');
            const newTime = new Date(uptimeStart).getTime();
            if (isNaN(newTime)) return alert('日期格式不正确');
            const res = await fetch('/api/admin/settings/uptime', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uptimeStart: newTime })
            });
            if (res.ok) alert('运行起始时间更新成功！');
            else throw new Error('Update failed');
        } catch (e) {
            alert('更新运行时间失败');
        }
    };

    // --- Handlers: Data Fetching ---
    const fetchSponsors = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('admin_token');
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
            const token = sessionStorage.getItem('admin_token');
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
            const token = sessionStorage.getItem('admin_token');
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

    // --- Product Handlers ---
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/products', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            if (!res.ok) throw new Error('Failed to fetch products');
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            console.error(err);
            setError('无法加载商品列表');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProduct = async () => {
        try {
            setSaveStatus('saving');
            const token = sessionStorage.getItem('admin_token');
            const isNew = !editingProduct.id;
            const url = isNew ? '/api/admin/products' : `/api/admin/products/${editingProduct.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...editingProduct,
                    enabled: editingProduct.enabled !== false
                })
            });

            if (!res.ok) throw new Error('Failed to save product');

            setSaveStatus('success');
            setTimeout(() => setSaveStatus(''), 2000);
            setIsEditingProduct(false);
            fetchProducts();
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            alert('保存失败');
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('确定要删除这个商品吗？')) return;

        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch(`/api/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to delete product');
            fetchProducts();
        } catch (err) {
            console.error(err);
            alert('删除失败');
        }
    };

    const handleProductImageUpload = async (file: File) => {
        try {
            setProductImageUploading(true);
            const formData = new FormData();
            formData.append('image', file);

            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            setEditingProduct(prev => ({ ...prev, image: data.url }));
        } catch (err) {
            console.error(err);
            alert('图片上传失败');
        } finally {
            setProductImageUploading(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('admin_token');
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
            const token = sessionStorage.getItem('admin_token');
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
            const token = sessionStorage.getItem('admin_token');
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
                    author: editingArticle.author || 'youshandebo',
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
            const token = sessionStorage.getItem('admin_token');
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

            const token = sessionStorage.getItem('admin_token');
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

    const fetchAdminModels = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/models', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch models');
            const data = await res.json();
            setAdminModels(data.models);
        } catch (err) {
            console.error(err);
            setError('无法加载模型列表');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveModels = async (modelsToSave?: AdminModel[]) => {
        try {
            setSaveStatus('saving');
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/models', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ models: modelsToSave || adminModels })
            });

            if (!res.ok) throw new Error('Failed to save models');

            setSaveStatus('success');
            setTimeout(() => setSaveStatus(''), 2000);
            fetchAdminModels();
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            alert('保存失败');
        }
    };

    const handleUpdateModelField = (id: string, field: keyof AdminModel, value: any) => {
        const updatedModels = adminModels.map(m => m.id === id ? { ...m, [field]: value } : m);
        setAdminModels(updatedModels);
        // Auto-save when enabled field is changed
        if (field === 'enabled') {
            handleSaveModels(updatedModels);
        }
    };

    const handleImageUpload = async (file: File) => {
        try {
            const formData = new FormData();
            // Sanitize filename to prevent markdown issues
            const safeName = file.name.replace(/[\[\]\(\)]/g, '_');
            const renamedFile = new File([file], safeName, { type: file.type });
            formData.append('image', renamedFile);

            const token = sessionStorage.getItem('admin_token');
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

        const width = 1000;
        const height = 300;
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

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
            const x = data.length === 1
                ? margin.left + chartWidth / 2
                : margin.left + (i / (data.length - 1)) * chartWidth;
            const y = margin.top + chartHeight - ((d[metricType] as number || 0) / maxVal) * chartHeight;
            return { x, y, val: d[metricType], label: d.label };
        });

        const pathD = points.length > 1
            ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
            : '';

        const yTicks = 5;

        return (
            <div className="relative w-full select-none">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full text-gray-400 dark:text-gray-500 text-xs font-mono">
                    {/* Grid lines and Y-axis Labels */}
                    {[...Array(yTicks + 1)].map((_, i) => {
                        const val = Math.round((maxVal / yTicks) * i);
                        const y = margin.top + chartHeight - (i / yTicks) * chartHeight;
                        return (
                            <g key={i}>
                                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="currentColor" strokeWidth="1" opacity="0.1" />
                                <text x={margin.left - 12} y={y + 4} textAnchor="end" fill="currentColor">{val}</text>
                            </g>
                        );
                    })}

                    {/* X-axis Labels */}
                    {points.filter((_, i) => i % Math.ceil(points.length / 8) === 0 || i === points.length - 1).map((p, i) => (
                        <text key={i} x={p.x} y={height - 10} textAnchor="middle" fill="currentColor">{p.label.split(' ')[1] || p.label}</text>
                    ))}

                    {/* Axes Lines */}
                    <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="currentColor" strokeWidth="1" opacity="0.3" />
                    <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="currentColor" strokeWidth="1" opacity="0.3" />

                    {/* Area fill */}
                    {points.length > 1 && (
                        <path
                            d={`${pathD} L ${points[points.length - 1].x},${height - margin.bottom} L ${points[0].x},${height - margin.bottom} Z`}
                            fill={currentColor.fill}
                            opacity="0.15"
                        />
                    )}

                    {/* Line with Animation */}
                    {points.length > 1 && (
                        <motion.path
                            d={pathD}
                            fill="none"
                            stroke={currentColor.stroke}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                    )}

                    {/* Interactive Points - Invisible but hoverable area */}
                    {points.map((p, i) => (
                        <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} className="cursor-pointer">
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={hoveredIndex === i ? 6 : 0}
                                fill={currentColor.fill}
                                stroke="white"
                                strokeWidth="2"
                                className="transition-all duration-200"
                            />
                            {/* Larger invisible touch target */}
                            <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
                        </g>
                    ))}
                </svg>

                {/* Tooltip */}
                {hoveredIndex !== null && (
                    <div
                        className="absolute pointer-events-none z-10 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg py-2 px-3 shadow-xl transform -translate-x-1/2 -translate-y-full border border-gray-700/50 whitespace-nowrap"
                        style={{
                            left: `${(points[hoveredIndex].x / width) * 100}%`,
                            top: `${(points[hoveredIndex].y / height) * 100}%`,
                            marginTop: '-16px'
                        }}
                    >
                        <div className="font-bold mb-1 border-b border-gray-700 pb-1">{points[hoveredIndex].label}</div>
                        <div className="flex items-center gap-2 pt-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: currentColor.fill }}></div>
                            <span className="font-mono">{currentColor.text}: {points[hoveredIndex].val}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // --- First-Deploy Setup Screen ---
    if (needsSetup && !setupDone && !isAuthenticated) {
        const handleSetup = async (e: React.FormEvent) => {
            e.preventDefault();
            setSetupError('');
            if (!setupPassword || setupPassword.length < 6) {
                setSetupError('密码至少需要6个字符');
                return;
            }
            if (setupPassword !== setupConfirm) {
                setSetupError('两次密码不一致');
                return;
            }
            setSetupLoading(true);
            try {
                const res = await fetch('/api/setup/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: setupPassword })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setSetupDone(true);
                    setNeedsSetup(false);
                } else {
                    setSetupError(data.error || '设置失败');
                }
            } catch {
                setSetupError('网络错误，请重试');
            } finally {
                setSetupLoading(false);
            }
        };
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-lg border border-gray-200 dark:border-dark-border w-full max-w-md"
                >
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <Key className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">初始化设置</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">检测到这是首次部署，请设置管理员密码</p>
                    <form onSubmit={handleSetup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">设置密码</label>
                            <input
                                type="password"
                                value={setupPassword}
                                onChange={e => setSetupPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                placeholder="至少6个字符"
                                minLength={6}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">确认密码</label>
                            <input
                                type="password"
                                value={setupConfirm}
                                onChange={e => setSetupConfirm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                placeholder="再次输入密码"
                            />
                        </div>
                        {setupError && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {setupError}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={setupLoading}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                        >
                            {setupLoading ? '设置中...' : '设置管理员密码'}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    // --- Setup Done: Prompt Login ---
    if (setupDone) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-lg border border-gray-200 dark:border-dark-border w-full max-w-md"
                >
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">设置成功！</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">管理员密码已设置完成，请使用您刚设置的密码登录管理面板。</p>
                    <button
                        onClick={() => { setSetupDone(false); }}
                        className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                        前往登录
                    </button>
                </motion.div>
            </div>
        );
    }

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
            <SEO title="管理面板" noindex />
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
                            <button
                                onClick={() => setActiveTab('products')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'products'
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                商品管理
                            </button>
                            <button
                                onClick={() => setActiveTab('keys')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'keys'
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                密钥管理
                            </button>
                            <button
                                onClick={() => setActiveTab('models')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'models'
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                模型管理
                            </button>
                        </div>

                        {/* Theme Switcher */}
                        <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-gray-500" />
                            <CustomSelect
                                value={currentTheme}
                                onChange={handleUpdateTheme}
                                options={[
                                    { value: "default", label: "默认主题" },
                                    { value: "new-year", label: "新年主题" },
                                ]}
                            />
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

                        {/* Settings & Time Range Selector Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Site Settings */}
                            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="w-5 h-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">站点配置</h2>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        网站稳定运行起始时间
                                    </label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="datetime-local" 
                                            value={uptimeStart}
                                            onChange={e => setUptimeStart(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white flex-1"
                                        />
                                        <button 
                                            onClick={handleUpdateUptime}
                                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg transition-colors"
                                        >
                                            保存
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">将显示在首页赞助板块的上方</p>
                                </div>
                            </div>

                            {/* Time Range Selector */}
                            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">数据趋势</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <CustomSelect
                                        value={metricType}
                                        onChange={(v) => setMetricType(v as keyof MetricSeries)}
                                        options={[
                                            { value: "visits", label: "访问量" },
                                            { value: "calls", label: "API调用" },
                                            { value: "errors", label: "错误数" },
                                            { value: "visitors", label: "访客数" },
                                        ]}
                                    />
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
                                <>
                                    <div className="border-b border-gray-100 dark:border-dark-border mb-6"></div>
                                    <Chart data={metrics.series} metricType={metricType} />
                                </>
                            )}
                        </div>
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
                                                            {Array.isArray(article.tags) && article.tags.length > 0 && (
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

                {activeTab === 'products' && (
                    // --- Products View ---
                    <div className="space-y-6">
                        {!isEditingProduct && (
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">商品管理</h2>
                                <button
                                    onClick={() => {
                                        setEditingProduct({ enabled: true });
                                        setIsEditingProduct(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    添加商品
                                </button>
                            </div>
                        )}

                        {isEditingProduct ? (
                            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {editingProduct.id ? '编辑商品' : '添加商品'}
                                    </h2>
                                    <button
                                        onClick={() => setIsEditingProduct(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                商品名称
                                            </label>
                                            <input
                                                type="text"
                                                value={editingProduct.name || ''}
                                                onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="输入商品名称"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                价格 (元)
                                            </label>
                                            <input
                                                type="text"
                                                value={editingProduct.price || ''}
                                                onChange={e => setEditingProduct(prev => ({ ...prev, price: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="例如: 9.99"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            商品描述
                                        </label>
                                        <textarea
                                            value={editingProduct.description || ''}
                                            onChange={e => setEditingProduct(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full h-24 p-4 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                            placeholder="输入商品简短描述"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            爱发电商品链接 (选填)
                                        </label>
                                        <input
                                            type="text"
                                            value={editingProduct.afdianLink || ''}
                                            onChange={e => setEditingProduct(prev => ({ ...prev, afdianLink: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="例如: https://afdian.com/item/..."
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            如果不填，点击购买将跳转到爱发电个人主页
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="productEnabled"
                                            checked={editingProduct.enabled !== false}
                                            onChange={e => setEditingProduct(prev => ({ ...prev, enabled: e.target.checked }))}
                                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                        />
                                        <label htmlFor="productEnabled" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                            上架销售
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            商品图片
                                        </label>
                                        <div
                                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${productImageUploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'} ${editingProduct.image ? 'border-primary' : 'border-gray-300 dark:border-dark-border'}`}
                                            onClick={() => productImageRef.current?.click()}
                                        >
                                            {editingProduct.image ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <img
                                                        src={editingProduct.image}
                                                        alt="预览"
                                                        className="h-40 rounded-lg object-contain bg-gray-50 dark:bg-gray-900 shadow-md"
                                                    />
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">点击更换图片</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3 py-4">
                                                    {productImageUploading ? (
                                                        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                                                    ) : (
                                                        <Upload className="w-10 h-10 text-gray-400" />
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">点击上传图片</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">支持 JPG, PNG, WebP</p>
                                                    </div>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                ref={productImageRef}
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleProductImageUpload(file);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                                        <button
                                            onClick={() => setIsEditingProduct(false)}
                                            className="px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSaveProduct}
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
                                                    保存商品
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
                                {loading ? (
                                    <div className="text-center py-12 text-gray-500">加载中...</div>
                                ) : products.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">暂无商品</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                                                <tr>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">商品</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">价格</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">描述</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">状态</th>
                                                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {products.map(product => (
                                                    <tr key={product.id} className={`border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors ${!product.enabled ? 'opacity-60 bg-gray-50 dark:bg-dark-bg/30' : ''}`}>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                                                    {product.image ? (
                                                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                            <Package className="w-6 h-6" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-gray-700 dark:text-gray-300 font-medium">
                                                            ¥{product.price}
                                                        </td>
                                                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                                            {product.description}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            {product.enabled ? (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                    已上架
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                                    已下架
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingProduct(product);
                                                                        setIsEditingProduct(true);
                                                                    }}
                                                                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteProduct(product.id)}
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

                {activeTab === 'models' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Server className="w-5 h-5 text-primary" />
                                        模型管理
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">拖动模型调整排序，修改额度消耗或上下架状态。</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setModelModalMode('add');
                                            setEditingModelId(null);
                                            setNewModel({ id: '', name: '', apiBase: '', apiKey: '', creditCost: 1, enabled: true });
                                            setIsAddingModel(true);
                                        }}
                                        className="px-4 py-2 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors rounded-lg flex items-center gap-2 font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        添加模型
                                    </button>
                                    <button
                                        onClick={() => handleSaveModels()}
                                        disabled={saveStatus === 'saving'}
                                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                                    >
                                        {saveStatus === 'saving' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        保存更改
                                    </button>
                                </div>
                            </div>

                            <Reorder.Group
                                axis="y"
                                values={adminModels}
                                onReorder={setAdminModels}
                                className="space-y-3"
                            >
                                {adminModels.map((model) => (
                                    <Reorder.Item
                                        key={model.id}
                                        value={model}
                                        className="group bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <input
                                                    type="text"
                                                    value={model.name}
                                                    onChange={(e) => handleUpdateModelField(model.id, 'name', e.target.value)}
                                                    className="w-full bg-transparent font-bold text-gray-900 dark:text-white border-none focus:ring-0 p-0 text-lg outline-none"
                                                />
                                                <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                    <span className="font-mono bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">{model.id}</span>
                                                    <span>|</span>
                                                    <span>累计调用: <span className="text-primary font-bold">{model.usage || 0}</span></span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 justify-between sm:justify-end">
                                            <div className="flex items-center gap-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1">
                                                <Coins className="w-4 h-4 text-amber-500" />
                                                <span className="text-xs text-gray-500 whitespace-nowrap">额度:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateModelField(model.id, 'creditCost', Math.max(0, Math.round(((model.creditCost || 0) - 0.1) * 10) / 10))}
                                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold transition-colors"
                                                >−</button>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={model.creditCost}
                                                    onChange={(e) => handleUpdateModelField(model.id, 'creditCost', parseFloat(e.target.value) || 0)}
                                                    className="w-16 bg-transparent text-sm font-bold text-gray-900 dark:text-white border-none focus:ring-0 p-0 text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateModelField(model.id, 'creditCost', Math.round(((model.creditCost || 0) + 0.1) * 10) / 10)}
                                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold transition-colors"
                                                >+</button>
                                            </div>

                                            <button
                                                onClick={() => handleUpdateModelField(model.id, 'enabled', !model.enabled)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${model.enabled
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200'
                                                    }`}
                                            >
                                                {model.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                {model.enabled ? '已上架' : '已下架'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setModelModalMode('edit');
                                                    setEditingModelId(model.id);
                                                    setNewModel({...model});
                                                    setIsAddingModel(true);
                                                }}
                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors ml-2"
                                                title="深度编辑模型"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('确定要删除这个模型吗？点击"保存更改"后生效。')) {
                                                        setAdminModels(prev => prev.filter(m => m.id !== model.id));
                                                    }
                                                }}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2"
                                                title="删除模型"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>

                            {adminModels.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-20" />
                                    正在加载模型配置...
                                </div>
                            )}
                        </div>

                        {/* Add Model Modal */}
                        {isAddingModel && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-dark-border">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {modelModalMode === 'edit' ? '编辑现有模型' : '添加新模型'}
                                        </h3>
                                        <button onClick={() => setIsAddingModel(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">显示名称 (Name) <span className="text-red-500">*</span></label>
                                            <input type="text" value={newModel.name} onChange={e => setNewModel({...newModel, name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="例如: GPT-4o" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际模型名 (ID) <span className="text-red-500">*</span></label>
                                            <input type="text" value={newModel.id} onChange={e => setNewModel({...newModel, id: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm" placeholder="例如: gpt-4o" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">请求地址 (API Base) <span className="text-gray-400 text-xs font-normal">选填</span></label>
                                            <input type="text" value={newModel.apiBase} onChange={e => setNewModel({...newModel, apiBase: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm" placeholder="默认使用后端配置的 Base" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密钥 (API Key) <span className="text-gray-400 text-xs font-normal">选填，加密存储</span></label>
                                            <input type="password" value={newModel.apiKey} onChange={e => setNewModel({...newModel, apiKey: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm" placeholder="sk-..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">默认消耗额度 (Credit Cost)</label>
                                            <input type="number" step="0.1" value={newModel.creditCost} onChange={e => setNewModel({...newModel, creditCost: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm" />
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end gap-3">
                                        <button onClick={() => setIsAddingModel(false)} className="px-5 py-2.5 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg rounded-xl transition-colors font-medium">取消</button>
                                        <button 
                                            onClick={() => {
                                                if (!newModel.id || !newModel.name) {
                                                    alert('请填写显示名称和实际模型名！');
                                                    return;
                                                }
                                                if (modelModalMode === 'add') {
                                                    if (adminModels.some(m => m.id === newModel.id)) {
                                                        alert('该模型 ID 已存在！请更换。');
                                                        return;
                                                    }
                                                    setAdminModels(prev => [...prev, newModel]);
                                                } else {
                                                    if (newModel.id !== editingModelId && adminModels.some(m => m.id === newModel.id)) {
                                                        alert('新的模型 ID 与其他模型冲突！请更换。');
                                                        return;
                                                    }
                                                    setAdminModels(prev => prev.map(m => m.id === editingModelId ? newModel : m));
                                                }
                                                setIsAddingModel(false);
                                                setEditingModelId(null);
                                                setNewModel({ id: '', name: '', apiBase: '', apiKey: '', creditCost: 1, enabled: true });
                                            }} 
                                            className="px-5 py-2.5 bg-primary text-white hover:bg-primary/90 rounded-xl transition-all shadow-md shadow-primary/20 font-medium"
                                        >
                                            {modelModalMode === 'edit' ? '保存修改' : '确认添加'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'keys' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                密钥管理
                            </h2>
                            <div className="flex gap-4 items-end mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        生成数量
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={keyGenerations}
                                        onChange={(e) => setKeyGenerations(parseInt(e.target.value) || 1)}
                                        className="w-32 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleGenerateKeys}
                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    生成密钥
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">未使用密钥 ({keysData.unused.length})</h3>
                                    <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-dark-bg/50 rounded-lg p-4 border border-gray-200 dark:border-dark-border scroll-smooth" style={{ overscrollBehavior: 'contain' }}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {keysData.unused.map(k => (
                                                <div key={k} className="flex items-center justify-between bg-white dark:bg-dark-card p-2 rounded border border-gray-200 dark:border-dark-border text-xs font-mono">
                                                    <span className="text-gray-600 dark:text-gray-400 select-all">{k}</span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(k);
                                                            alert('已复制');
                                                        }}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-primary transition-colors"
                                                        title="复制"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {keysData.unused.length === 0 && <div className="text-center text-gray-400 py-4 text-sm col-span-full">暂无可用密钥</div>}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">已激活密钥详情 ({Object.keys(keysData.activated).length})</h3>
                                    <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-dark-bg/50 rounded-lg p-4 border border-gray-200 dark:border-dark-border scroll-smooth" style={{ overscrollBehavior: 'contain' }}>
                                        <table className="w-full text-xs text-left">
                                            <thead>
                                                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-dark-border">
                                                    <th className="pb-2 font-medium">密钥</th>
                                                    <th className="pb-2 font-medium">剩余额度</th>
                                                    <th className="pb-2 font-medium">激活时间</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(keysData.activated).map(([k, v]) => (
                                                    <tr key={k} className="border-b border-gray-100 dark:border-dark-border/50 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                        <td className="py-2 text-gray-600 dark:text-gray-400 font-mono select-all">{k}</td>
                                                        <td className="py-2 text-primary font-bold">{v.credits}</td>
                                                        <td className="py-2 text-gray-500">{new Date(v.activatedAt).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {Object.keys(keysData.activated).length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="py-8 text-center text-gray-400">暂无已激活密钥记录</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;
