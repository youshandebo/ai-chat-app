import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import InteractiveGrid from "../components/InteractiveGrid";

export default function Home() {
  return (
    <div className="flex flex-col relative">
      <InteractiveGrid />
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-16"
      >
        <h1 className="text-5xl font-bold mb-4 sm:text-3xl">聚合AI · 一键对话</h1>
        <p className="text-xl mb-8">免费使用 Gemini, DeepSeek 等主流大模型</p>
        <div className="flex gap-4">
          <Link to="/chat" className="px-4 py-2 rounded bg-primary text-white hover:bg-indigo-400 dark:bg-primary/90 dark:hover:bg-primary transition-transform hover:scale-105 shadow">立即开始聊天</Link>
          <Link to="/changelog" className="px-4 py-2 rounded border border-gray-200 dark:border-dark-border dark:bg-dark-card dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-card/80 transition-transform hover:scale-105">查看更新</Link>
        </div>
      </motion.section>

      <section className="py-16 grid grid-cols-1 md:grid-cols-3 gap-6 px-6 md:px-12">
        {[
          { title: "⚡ 多模型切换", desc: "一键在 Gemini / DeepSeek 等模型间切换，适配不同场景。" },
          { title: "🧠 上下文记忆", desc: "本地保存会话与消息，持续对话不丢失，支持重命名与删除。" },
          { title: "🔒 隐私优先", desc: "数据仅存于本地浏览器，不上传后端；接口只转发模型请求。" },
        ].map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.2 }}
            className="p-6 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border"
          >
            <h3 className="text-xl font-semibold mb-2">{c.title}</h3>
            <p className="text-gray-700 dark:text-dark-text/90">{c.desc}</p>
          </motion.div>
        ))}
      </section>

      <section className="py-12 bg-primary/10 text-center">
        <h2 className="text-2xl mb-4">💖 本站完全免费，依赖赞助运营</h2>
        <div className="flex justify-center gap-4">
          <Link to="/sponsor" className="px-4 py-2 rounded bg-primary text-white hover:bg-indigo-400 transition-transform hover:scale-105 shadow">前往赞助页面</Link>
          <a href="https://afdian.com/a/youshandebo" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded border border-gray-200 dark:border-dark-border dark:bg-dark-card dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-card/80 transition-transform hover:scale-105">直接爱发电</a>
        </div>
      </section>
    </div>
  );
}