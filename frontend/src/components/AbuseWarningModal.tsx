import { motion, AnimatePresence } from "framer-motion";

interface AbuseWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AbuseWarningModal({ isOpen, onClose }: AbuseWarningModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-red-200 dark:border-red-900"
                    >
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <h3 className="text-lg font-semibold">检测到多设备使用</h3>
                        </div>

                        <div className="space-y-3 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            <p>
                                系统检测到您的网络环境（IP）存在多个不同的设备/用户同时使用。
                            </p>
                            <p>
                                这一点通常出现在同一个办公室、学校或通过代理访问的情况下。为了防止资源滥用，系统已标记您的设备。
                            </p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                您当前已被限制每日 **10次** 对话额度。
                            </p>
                            <p className="text-xs text-gray-500 mt-4">
                                * 我们不希望有人滥用免费资源。如果您认为这是误判，请联系：<br />
                                <a href="mailto:youshandebo@gmail.com" className="text-blue-500 hover:underline">youshandebo@gmail.com</a>
                            </p>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                            >
                                我知道了
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
