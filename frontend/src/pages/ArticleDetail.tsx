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
        <div className="min-h-screen bg-gray-100 dark:bg-dark-bg transition-colors duration-300">
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

            {/* Main Content Area */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden ring-1 ring-black/5"
                >
                    {/* Article Header */}
                    <div className="px-8 pt-12 pb-10 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-b from-gray-50/80 to-transparent dark:from-white/5">
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {article.tags?.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                    >
                                        <Tag className="w-3 h-3 mr-1" />
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                                {article.title}
                            </h1>

                            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                                        <img src="/author-avatar.jpg" alt={article.author} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 dark:text-gray-200">{article.author}</span>
                                        <span className="text-xs text-gray-400">作者</span>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                        <Calendar className="w-4 h-4" />
                                        <time dateTime={new Date(article.createdAt).toISOString()}>
                                            {new Date(article.createdAt).toLocaleDateString()}
                                        </time>
                                    </div>
                                    <span className="text-xs text-gray-400">发布日期</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Article Body */}
                    <div className="px-8 py-10">
                        <article className="prose prose-lg dark:prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-10 mb-6 text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-white" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-6 leading-relaxed text-gray-700 dark:text-gray-300 text-lg" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-outside mb-6 ml-6 text-gray-700 dark:text-gray-300 space-y-2" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside mb-6 ml-6 text-gray-700 dark:text-gray-300 space-y-2" {...props} />,
                                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                    blockquote: ({ node, ...props }) => (
                                        <blockquote className="border-l-4 border-primary/50 pl-6 italic my-8 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark-card/50 py-4 pr-4 rounded-r-lg" {...props} />
                                    ),
                                    code: ({ node, inline, className, children, ...props }: any) => {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return !inline ? (
                                            <div className="rounded-xl overflow-hidden my-8 border border-gray-200 dark:border-dark-border shadow-sm">
                                                <div className="bg-gray-50 dark:bg-[#1e1e1e] px-4 py-2 text-xs font-mono text-gray-500 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
                                                        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                                                    </div>
                                                    <span className="uppercase opacity-70">{match?.[1] || 'text'}</span>
                                                </div>
                                                <pre className="p-5 bg-[#fafafa] dark:bg-[#0d0d0d] overflow-x-auto">
                                                    <code className={`${className} text-sm font-mono`} {...props}>
                                                        {children}
                                                    </code>
                                                </pre>
                                            </div>
                                        ) : (
                                            <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary font-medium border border-gray-200 dark:border-gray-700" {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    img: ({ node, ...props }) => (
                                        <figure className="my-8">
                                            <img className="rounded-xl shadow-lg max-w-full mx-auto border border-gray-200 dark:border-dark-border" {...props} />
                                            {props.alt && <figcaption className="text-center text-sm text-gray-500 mt-2">{props.alt}</figcaption>}
                                        </figure>
                                    ),
                                    a: ({ node, ...props }) => <a className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary transition-colors font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                                    table: ({ node, ...props }) => <div className="overflow-x-auto my-8 rounded-lg border border-gray-200 dark:border-dark-border"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800" {...props} /></div>,
                                    thead: ({ node, ...props }) => <thead className="bg-gray-50 dark:bg-dark-card" {...props} />,
                                    th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props} />,
                                    td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-800 whitespace-nowrap" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="my-10 border-gray-200 dark:border-gray-800" {...props} />,
                                }}
                            >
                                {article.content}
                            </ReactMarkdown>
                        </article>

                        {/* Footer / Navigation */}
                        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-dark-border flex justify-between items-center">
                            <Link to="/articles" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> 返回列表
                            </Link>
                            <div className="text-sm text-gray-400">
                                最后更新于 {new Date(article.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
