import { motion } from "framer-motion";

export default function Sponsor() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto p-10 text-center">
      <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold mb-3">赞助支持</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6 text-gray-600">本站完全免费，感谢你的支持。</motion.p>
      <div className="flex justify中心 gap-4">
        <a className="px-4 py-2 rounded bg-primary text-white hover:bg-indigo-400 dark:bg-primary/90 dark:hover:bg-primary transition-transform hover:scale-105 shadow" href="https://afdian.com/a/youshandebo" target="_blank" rel="noreferrer">前往爱发电</a>
        <a className="px-4 py-2 rounded border border-gray-200 dark:border-dark-border dark:bg-dark-card dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-card/80 transition-transform hover:scale-105" href="/changelog">查看更新</a>
      </div>
    </motion.div>
  );
}