import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, User, ChevronRight, Clock } from 'lucide-react';
import InteractiveGrid from "../components/InteractiveGrid";
import SEO from "../components/SEO";

function UptimeTracker() {
  const [uptimeStart, setUptimeStart] = useState<number | null>(null);
  const [uptimeStr, setUptimeStr] = useState<string>('加载中...');

  useEffect(() => {
    fetch('/api/settings/uptime')
      .then(res => res.json())
      .then(data => setUptimeStart(data.uptimeStart))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!uptimeStart) return;
    const updateTime = () => {
      const now = Date.now();
      const diff = Math.max(0, now - uptimeStart);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      
      setUptimeStr(`${days}天 ${hours}时 ${mins}分 ${secs}秒`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [uptimeStart]);

  return (
    <div className="flex flex-col items-center justify-center py-12 z-10 relative">
      <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-md px-8 py-4 rounded-2xl border border-gray-200 dark:border-dark-border shadow-sm flex items-center gap-3 hover:scale-105 transition-transform duration-300">
        <Clock className="w-5 h-5 text-primary animate-pulse" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">网站已稳定运行：</span>
        <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">{uptimeStr}</span>
      </div>
    </div>
  );
}

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // 确保data是数组
        if (Array.isArray(data)) {
          setArticles(data);
        } else {
          console.warn('Articles data is not an array:', data);
          setArticles([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch articles:', err);
        setArticles([]); // 确保articles是空数组
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col relative min-h-screen">
      <div className="absolute inset-0 bg-white dark:bg-dark-bg transition-colors duration-300 -z-20" />
      <SEO jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "聚合AI",
          "url": "https://youshandebo.xx.kg",
          "description": "免费使用 Gemini, ChatGPT 等主流大模型，一键切换多种AI模型，本地保存对话记录，隐私优先。",
          "inLanguage": "zh-CN",
          "potentialAction": {
              "@type": "SearchAction",
              "target": "https://youshandebo.xx.kg/chat?q={search_term_string}",
              "query-input": "required name=search_term_string"
          }
      }} />
      <InteractiveGrid className="text-gray-400/40 dark:text-gray-500/30" />

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center z-10"
      >
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400 dark:from-primary dark:to-cyan-300">
          聚合AI · 一键对话
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-600 dark:text-gray-300 max-w-2xl">
          免费使用Gemini, ChatGPT等主流大模型，让AI触手可及
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link to="/chat" className="px-6 py-3 rounded-full bg-primary text-white text-lg font-medium hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80 transition-all hover:scale-105 shadow-lg hover:shadow-xl">
            立即开始聊天
          </Link>

          <Link to="/changelog" className="px-6 py-3 rounded-full border border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-card/50 backdrop-blur-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-all hover:scale-105">
            查看更新
          </Link>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-16 px-6 md:px-12 bg-gray-50/50 dark:bg-dark-bg/50 z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "⚡ 多模型切换", desc: "一键在 Gemini / ChatGPT 等模型间切换，适配不同场景。" },
            { title: "🧠 上下文记忆", desc: "本地保存会话与消息，持续对话不丢失，支持重命名与删除。" },
            { title: "🔒 隐私优先", desc: "隐私优先：数据仅存于本地浏览器；API请求安全转发，无多余服务端存储。" },
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
                >
                  <Link
                    to={`/articles/${article.id}`}
                    className="group block bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
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
                          <img src="/author-avatar.jpg" alt={article.author} className="w-5 h-5 rounded-full object-cover" />
                          {article.author}
                        </div>
                        <div className="flex items-center gap-1 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          阅读更多 <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
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

      {/* Uptime Tracker Section */}
      <UptimeTracker />

      {/* Sponsor Section */}
      <section className="py-16 bg-primary/5 dark:bg-primary/10 text-center z-10 relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 relative">
          <div className="relative inline-block mb-4">
             <div className="absolute inset-x-[-10%] bottom-1 h-3 bg-primary/20 dark:bg-primary/40 rounded-full blur-[2px] -z-10" />
             <h2 className="text-3xl font-bold text-gray-900 dark:text-white relative z-10 flex items-center justify-center gap-2">
                 💖 支持我们
             </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-8 mt-2">
            本站完全免费，您的支持是我们持续更新的动力
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/sponsor" className="px-6 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-transform hover:scale-105 shadow-lg">
              查看赞助页面
            </Link>
            <a href="https://afdian.com/a/youshandebo" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card/80 transition-transform hover:scale-105">
              直接去爱发电
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}