import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface ToastProps {
    message: string | null;
    onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(onClose, 2000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    return (
        <AnimatePresence>
            {message && (
                <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="flex items-center gap-2 bg-gray-800/90 dark:bg-white/90 backdrop-blur text-white dark:text-gray-900 px-4 py-2.5 rounded-full shadow-lg"
                    >
                        <CheckIcon />
                        <span className="text-sm font-medium">{message}</span>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    );
}
