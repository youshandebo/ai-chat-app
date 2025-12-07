import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, User, ChevronRight } from 'lucide-react';
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

// Extract first image from markdown content
function extractFirstImage(content: string): string | null {
    const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
    return imgMatch ? imgMatch[1] : null;
}

export default function Articles() {
    const [articles, setArticles] = useState<Article[]>([]);
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
            <SEO
                title="所有文章"
                description="浏览聚合AI平台的所有文章，获取AI使用技巧、行业资讯和最新动态。"
                keywords="聚合AI文章, AI教程, AI资讯, ChatGPT技巧"
            />

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
                                >
                                    <Link
                                        to={`/articles/${article.id}`}
                                        className="group flex bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-lg transition-all"
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
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
