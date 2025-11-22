import { motion } from "framer-motion";

export default function Changelog() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日`;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto p-6">
      <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold mb-4">更新公告</motion.h2>
      <div className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 pb-8 relative">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-gray-700 dark:text-dark-text pr-16">
          网站上线啦！当前仍处于测试阶段，功能逐步完善中，已知的 bug 正在持续修复与优化。如果你遇到问题，欢迎反馈到邮箱：youshandebo@gmail.com。
        </motion.p>
        <div className="absolute right-4 bottom-3 text-xs text-gray-500 dark:text-gray-400">{dateStr}</div>
      </div>
    </motion.div>
  );
}