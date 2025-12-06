import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { X, Calendar, User, Tag, ChevronRight, Image } from 'lucide-react';

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

// Extract first image from markdown content
function extractFirstImage(content: string): string | null {
    const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
    return imgMatch ? imgMatch[1] : null;
}

export default function Articles() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/articles')
            .then(res => res.json())
            .then(data => {
                setArticles(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch articles:', err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <div className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">所有文章</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        共 {articles.length} 篇文章
                    </p>
                </div>
            </div>

            {/* Articles List */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">加载中...</div>
                ) : articles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">暂无文章</div>
                ) : (
                    <div className="space-y-4">
                        {articles.map((article, i) => {
                            const imageUrl = extractFirstImage(article.content);

                            return (
                                <motion.div
                                    key={article.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => setSelectedArticle(article)}
                                    className="group cursor-pointer bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-lg transition-all flex"
                                >
                                    {/* Image Section */}
                                    {imageUrl && (
                                        <div className="w-48 h-32 flex-shrink-0 overflow-hidden">
                                            <img
                                                src={imageUrl}
                                                alt={article.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Content Section */}
                                    <div className="flex-1 p-5 flex flex-col justify-center">
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                                {article.tags?.[0] || '文章'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(article.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {article.author}
                                            </span>
                                        </div>

                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1 mb-1">
                                            {article.title}
                                        </h2>

                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                                            {article.content.replace(/[#*`!\[\]()]/g, '').slice(0, 150)}...
                                        </p>
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex items-center px-4 text-gray-400 group-hover:text-primary transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Article Modal */}
            <AnimatePresence>
                {selectedArticle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedArticle(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white dark:bg-dark-card w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-dark-border flex justify-between items-start bg-gray-50 dark:bg-dark-bg/50">
                                <div className="pr-8">
                                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                        {selectedArticle.title}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            {selectedArticle.author}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(selectedArticle.createdAt).toLocaleDateString()}
                                        </span>
                                        {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4" />
                                                {selectedArticle.tags.map(tag => (
                                                    <span key={tag} className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="prose dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkBreaks]}
                                        components={{
                                            img: ({ node, ...props }) => (
                                                <img {...props} className="max-w-full h-auto rounded-xl shadow-lg my-6 border border-gray-200 dark:border-dark-border" />
                                            ),
                                            a: ({ node, ...props }) => (
                                                <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
                                            ),
                                            code: ({ node, className, children, ...props }: any) => {
                                                const match = /language-(\w+)/.exec(className || '');
                                                return match ? (
                                                    <div className="relative group">
                                                        <div className="absolute right-2 top-2 text-xs text-gray-400">{match[1]}</div>
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
                                        {selectedArticle.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
