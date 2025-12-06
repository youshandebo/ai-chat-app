import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { X, Calendar, User, Tag, ChevronRight } from 'lucide-react';

import InteractiveGrid from "../components/InteractiveGrid";

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

export default function Home() {
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
    <div className="flex flex-col relative min-h-screen">
      <InteractiveGrid />

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center z-10"
      >
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600 dark:from-indigo-400 dark:to-white">
          聚合AI · 一键对话
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-600 dark:text-gray-300 max-w-2xl">
          免费使用 Gemini, ChatGPT 等主流大模型，让 AI 触手可及
        </p>
        <div className="flex gap-4">
          <Link to="/chat" className="px-6 py-3 rounded-full bg-primary text-white text-lg font-medium hover:bg-indigo-600 dark:bg-primary dark:hover:bg-indigo-500 transition-all hover:scale-105 shadow-lg hover:shadow-xl">
            立即开始聊天
          </Link>
          <Link to="/changelog" className="px-6 py-3 rounded-full border border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-card/50 backdrop-blur-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-all hover:scale-105">
            查看更新
          </Link>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-16 px-6 md:px-12 bg-gray-50/50 dark:bg-dark-bg/50 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "⚡ 多模型切换", desc: "一键在 Gemini / ChatGPT 等模型间切换，适配不同场景。" },
            { title: "🧠 上下文记忆", desc: "本地保存会话与消息，持续对话不丢失，支持重命名与删除。" },
            { title: "🔒 隐私优先", desc: "数据仅存于本地浏览器，不上传后端；接口只转发模型请求。仅会用正则捕捉敏感对话并记录在服务器端。" },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{c.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Articles Section */}
      {articles.length > 0 && (
        <section className="py-16 px-6 md:px-12 z-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">最新文章</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.slice(0, 3).map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedArticle(article)}
                  className="group cursor-pointer bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        {article.tags?.[0] || '文章'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(article.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                      {article.content.replace(/[#*`]/g, '').slice(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {article.author}
                      </div>
                      <div className="flex items-center gap-1 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        阅读更多 <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {articles.length > 3 && (
              <div className="text-center mt-8">
                <Link
                  to="/articles"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary hover:text-white transition-all hover:scale-105"
                >
                  查看更多文章 <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Sponsor Section */}
      <section className="py-16 bg-primary/5 dark:bg-primary/10 text-center z-10">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">💖 支持我们</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            本站完全免费，您的支持是我们持续更新的动力
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/sponsor" className="px-6 py-3 rounded-full bg-primary text-white font-medium hover:bg-indigo-600 transition-transform hover:scale-105 shadow-lg">
              前往赞助页面
            </Link>
            <a href="https://afdian.com/a/youshandebo" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card/80 transition-transform hover:scale-105">
              直接爱发电
            </a>
          </div>
        </div>
      </section>

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