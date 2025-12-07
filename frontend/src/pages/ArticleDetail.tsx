import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Calendar, User, Tag, ArrowLeft, Home } from 'lucide-react';
import SEO from '../components/SEO';

interface Article {
    id: string;
    title: string;
    content: string;
    author: string;
    createdAt: number;
    updatedAt: number;
    published: boolean;
    tags: string[];
}

export default function ArticleDetail() {
    const { id } = useParams<{ id: string }>();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        fetch(`/api/articles/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Article not found');
                return res.json();
            })
            .then(data => {
                setArticle(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch article:', err);
                setError('文章不存在或已被删除');
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center gap-4">
                <SEO title="文章未找到" description="您访问的文章不存在或已被删除" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">😕 {error || '文章未找到'}</h1>
                <Link to="/" className="flex items-center gap-2 text-primary hover:underline">
                    <Home className="w-4 h-4" /> 返回首页
                </Link>
            </div>
        );
    }

    // Generate description from content (first 150 chars)
    const description = article.content
        .replace(/[#*`!\[\]()]/g, '')
        .slice(0, 150)
        .trim() + '...';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
            <SEO
                title={article.title}
                description={description}
                keywords={article.tags?.join(', ') + ', 聚合AI, AI文章'}
                type="article"
                url={`https://youshandebo.xx.kg/articles/${article.id}`}
            />

            {/* Sticky Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
                    <Link
                        to="/articles"
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> 返回文章列表
                    </Link>
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                    >
                        <Home className="w-4 h-4" /> 首页
                    </Link>
                </div>
            </div>

            {/* Header */}
            <div className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                        <Link to="/" className="hover:text-primary transition-colors">首页</Link>
                        <span>/</span>
                        <Link to="/articles" className="hover:text-primary transition-colors">文章</Link>
                        <span>/</span>
                        <span className="text-gray-900 dark:text-white truncate max-w-[200px]">{article.title}</span>
                    </nav>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
                    >
                        {article.title}
                    </motion.h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {article.author}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(article.createdAt).toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                        {article.tags && article.tags.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                {article.tags.map(tag => (
                                    <span key={tag} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-4xl mx-auto px-6 py-8"
            >
                <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 md:p-10">
                    <div className="prose dark:prose-invert max-w-none prose-lg">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                                img: ({ node, ...props }) => (
                                    <img {...props} className="max-w-full h-auto rounded-xl shadow-lg my-6 border border-gray-200 dark:border-dark-border" loading="lazy" />
                                ),
                                a: ({ node, ...props }) => (
                                    <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
                                ),
                                h1: ({ node, ...props }) => (
                                    <h1 {...props} className="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white" />
                                ),
                                h2: ({ node, ...props }) => (
                                    <h2 {...props} className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white" />
                                ),
                                h3: ({ node, ...props }) => (
                                    <h3 {...props} className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white" />
                                ),
                                code: ({ node, className, children, ...props }: any) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return match ? (
                                        <div className="relative group">
                                            <div className="absolute right-2 top-2 text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">{match[1]}</div>
                                            <code className={`${className} block bg-gray-800 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto`} {...props}>
                                                {children}
                                            </code>
                                        </div>
                                    ) : (
                                        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-500" {...props}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}
                        >
                            {article.content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-8 flex justify-between">
                    <Link
                        to="/articles"
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> 返回文章列表
                    </Link>
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                    >
                        <Home className="w-4 h-4" /> 返回首页
                    </Link>
                </div>
            </motion.article>
        </div>
    );
}
