import { motion } from "framer-motion";

export default function Changelog() {
  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-2xl mx-auto p-6">
        <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">更新公告</motion.h2>

        <div className="space-y-6">
          {/* 2025-12-14 更新 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-5 pb-8 relative"
          >
            <div className="text-gray-700 dark:text-blue-100 pr-4 space-y-2">
              <p>⚡️ 性能优化：大幅提升首页文章加载与 Chat 页面模型列表加载速度</p>
              <p>🐛 修复移动端黑夜模式 bug</p>
              <p>🎨 优化部分 UI 细节与交互体验</p>
              <p>🎉 结束测试阶段，正式发布 v1.0</p>
            </div>
            <div className="absolute right-4 bottom-3 text-xs text-blue-500 dark:text-blue-400">2025年12月14日</div>
          </motion.div>

          {/* 2025-12-10 更新 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 pb-8 relative"
          >
            <div className="text-gray-700 dark:text-dark-text pr-4 space-y-2">
              <p>UI界面升级：优化移动端适配，新增折叠菜单，改进代码块显示样式</p>
              <p>修复与优化：修复管理后台显示问题，增强数据加载稳定性</p>
              <p>系统优化：完善 SEO (sitemap, robots, ads.txt)，提升收录</p>
            </div>
            <div className="absolute right-4 bottom-3 text-xs text-gray-500 dark:text-gray-400">2025年12月12日</div>
          </motion.div>

          {/* 2025-12-07 更新 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 pb-8 relative"
          >
            <div className="text-gray-700 dark:text-dark-text pr-4 space-y-2">
              <p>🐛 修复动画卡顿问题</p>
              <p>✨ 优化页面动画效果</p>
              <p>🤖 ChatGPT模型回归</p>
              <p>📝 文章系统优化升级</p>
              <p>🔍 SEO完善优化</p>
            </div>
            <div className="absolute right-4 bottom-3 text-xs text-gray-500 dark:text-gray-400">2025年12月07日</div>
          </motion.div>

          {/* 2025-12-04 更新 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 pb-8 relative"
          >
            <div className="text-gray-700 dark:text-dark-text pr-4 space-y-2">
              <p>🔧 修复已知bug</p>
              <p>📝 完善文章系统</p>
              <p>⏳ 原本准备接入Gemini 3.0 Pro，测试时发现Gemini 3.0 Pro最近有点火，高峰期会连接断开、响应速度慢等情况，所以决定延迟上架Gemini 3.0 Pro，等热度过去就会上架</p>
              <p>🍪 （画个饼）ChatGPT将在下次更新回归</p>
            </div>
            <div className="absolute right-4 bottom-3 text-xs text-gray-500 dark:text-gray-400">2025年12月04日</div>
          </motion.div>

          {/* 2025-12-03 更新 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 pb-8 relative"
          >
            <div className="text-gray-700 dark:text-dark-text pr-4 space-y-2">
              <p>🚫 移除 Grok AI 模型（检测到违规使用，遵守相关法律法规）</p>
              <p>💸 移除 ChatGPT 模型（API 余额不足，暂停服务）</p>
              <p>⚡ 正在准备接入 Gemini 3.0 Pro</p>
              <p>📝 新增文章管理系统</p>
              <p>🎨 优化界面 UI 设计</p>
            </div>
            <div className="absolute right-4 bottom-3 text-xs text-gray-500 dark:text-gray-400">2025年12月03日</div>
          </motion.div>

          {/* 2025-11-25 更新 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 pb-8 relative"
          >
            <div className="text-gray-700 dark:text-dark-text pr-4 space-y-2">
              <p>🔧 修复已知bug</p>
              <p>✨ 添加和优化UI设计</p>
              <p>🚀 正在为下次更新做铺垫</p>
              <p>🤫 秘密......(不能说)</p>
            </div>
            <div className="absolute right-4 bottom-3 text-xs text-gray-500 dark:text-gray-400">2025年11月25日</div>
          </motion.div>

          {/* 2025-11-20 上线公告 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 pb-8 relative"
          >
            <p className="text-gray-700 dark:text-dark-text pr-16">
              网站上线啦！当前仍处于测试阶段，功能逐步完善中，已知的 bug 正在持续修复与优化。如果你遇到问题，欢迎反馈到邮箱：youshandebo@gmail.com。
            </p>
            <div className="absolute right-4 bottom-3 text-xs text-gray-500 dark:text-gray-400">2025年11月20日</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}