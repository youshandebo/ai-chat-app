import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredKeys, addStoredKey, removeStoredKey } from "../utils/keyStorage";

interface ActivationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface KeyInfo {
    key: string;
    balance: number;
    loading: boolean;
}

export default function ActivationModal({ isOpen, onClose }: ActivationModalProps) {
    const [keys, setKeys] = useState<KeyInfo[]>([]);
    const [inputKey, setInputKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // 加载并刷新余额
    const refreshBalances = async () => {
        const stored = getStoredKeys();
        const infos: KeyInfo[] = [];

        // @ts-ignore
        const apiBase = import.meta.env.VITE_BACKEND_BASE || '';

        for (const k of stored) {
            try {
                const res = await fetch(`${apiBase}/api/keys/balance`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: k })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.balance > 0) {
                        infos.push({ key: k, balance: data.balance, loading: false });
                    } else {
                        // 余额为0，自动移除本地存储
                        removeStoredKey(k);
                    }
                } else {
                    // API 错误，可能是无效key (400/404)
                    removeStoredKey(k);
                }
            } catch {
                infos.push({ key: k, balance: 0, loading: false }); // 网络错误暂不移除
            }
        }
        setKeys(infos);
    };

    useEffect(() => {
        if (isOpen) {
            refreshBalances();
        }
    }, [isOpen]);

    const handleAddKey = async () => {
        if (!inputKey) return;
        setLoading(true);
        setError("");

        // @ts-ignore
        const apiBase = import.meta.env.VITE_BACKEND_BASE || '';

        try {
            const res = await fetch(`${apiBase}/api/keys/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: inputKey })
            });
            const data = await res.json();

            if (res.ok) {
                addStoredKey(inputKey);
                setInputKey("");
                refreshBalances();
            } else {
                setError(data.error || "激活失败");
            }
        } catch (e: any) {
            setError(e.message || "网络错误");
        } finally {
            setLoading(false);
        }
    };

    const totalBalance = keys.reduce((sum, k) => sum + k.balance, 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">激活码充值</h3>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                ✕
                            </button>
                        </div>

                        {/* 总额度展示 */}
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-6 flex justify-between items-center">
                            <span className="text-blue-800 dark:text-blue-200 font-medium">当前可用总额度</span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalBalance} <span className="text-sm font-normal">次</span></span>
                        </div>

                        {/* 添加密钥 */}
                        <div className="space-y-3 mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">添加新密钥</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputKey}
                                    onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                                    placeholder="Yxxxx-Sxxxx-..."
                                    className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <button
                                    onClick={handleAddKey}
                                    disabled={loading || !inputKey}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? "..." : "激活"}
                                </button>
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                        </div>

                        {/* 密钥列表 */}
                        {keys.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-500">已激活密钥</p>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {keys.map((k) => (
                                        <div key={k.key} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded text-sm">
                                            <code className="text-gray-600 dark:text-gray-300">{k.key}</code>
                                            <span className="font-bold text-green-600 dark:text-green-400">+{k.balance}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 text-xs text-center text-gray-400">
                            激活码仅用于补充每日 25 次额度用尽后的情况。<br />优先消耗每日免费额度。
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
