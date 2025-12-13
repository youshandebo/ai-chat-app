import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";

const ANNOUNCEMENT_KEY = "lastAnnouncementTime";

export default function AnnouncementModal() {
  const initialShow = (() => {
    try {
      const lastShow = localStorage.getItem(ANNOUNCEMENT_KEY);
      return !lastShow || Date.now() - new Date(lastShow).getTime() > 24 * 60 * 60 * 1000;
    } catch {
      return true;
    }
  })();
  const [show, setShow] = useState(initialShow);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleClose = () => {
    if (dontShowAgain) localStorage.setItem(ANNOUNCEMENT_KEY, new Date().toISOString());
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white dark:bg-dark-card rounded-lg p-6 max-w-2xl w-11/12"
            initial={{ y: 50, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 50, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="text-gray-700 dark:text-gray-200 space-y-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:dark:text-white [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:dark:text-white [&_a]:text-blue-600 [&_a]:dark:text-blue-400 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ANNOUNCEMENT_HTML) }}
            />
            <div className="mt-6 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">24小时内不再显示</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all text-sm font-bold shadow-sm"
                >
                  关闭
                </button>
                <a
                  href="https://afdian.com/a/youshandebo"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all text-sm font-bold shadow-sm inline-block"
                >
                  立即赞助
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ANNOUNCEMENT_HTML = `
  <h2>网站公告</h2>
  <p>本站致力于为用户提供免费、便捷的在线服务，目前所有功能均不收取任何费用。我们仅通过广告或赞助来维持网站的正常运营，后续可能会接入广告以支持服务器和维护成本。</p>
  <p>所有来自赞助或广告的收入，我们将全部用于购买更优质的 API 服务，并不断接入更新、更强大的模型，为大家带来更快、更稳定、更智能的使用体验。</p>
  <h3>温馨提示：</h3>
  <p>本站模型调用按 Token 计费，成本较高。</p>
  <p>若您已拥有官方免费渠道（如官方试用、教育额度、开发者额度等），建议优先使用官方途径，把本站的免费资源留给真正需要的人。</p>
  <p>您的每一次节省，都在帮助我们走得更远。</p>
  <p>如果您在使用过程中遇到任何问题，欢迎随时反馈至我们的邮箱：<a href="mailto:youshandebo@gmail.com">youshandebo@gmail.com</a>。当然，如果你想找我聊天，也是非常欢迎，我们会尽快处理并持续优化用户体验。</p>
  <p>感谢您的支持与理解！</p>
  <p>                                         —— 网站运营团队</p>
`;