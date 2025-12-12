import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, User, ExternalLink } from 'lucide-react';
import SEO from '../components/SEO';

interface Sponsor {
    id: string;
    name: string;
    avatar: string;
    message: string;
    amount?: string;
    date: number;
}

export default function Sponsor() {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/sponsors')
            .then(res => res.json())
            .then(data => {
                setSponsors(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch sponsors:', err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
            <SEO
                title="赞助者"
                description="感谢所有支持我们的赞助者。"
                keywords="赞助, 支持, 感谢"
            />

            {/* Header */}
            <div className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
                <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                        <Heart className="w-8 h-8 text-red-500" fill="currentColor" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">感谢支持</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto mb-6">
                        每一份支持都是我们前进的动力。感谢以下朋友对本项目的慷慨赞助！
                    </p>
                    <a
                        href="https://afdian.com/a/youshandebo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-full hover:bg-primary/90 transition-all hover:scale-105 shadow-lg"
                    >
                        <Heart className="w-5 h-5" fill="currentColor" />
                        去爱发电支持我们
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* Sponsors Grid */}
            <div className="max-w-6xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">加载中...</div>
                ) : sponsors.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">暂无赞助者</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sponsors.map((sponsor, i) => (
                            <motion.div
                                key={sponsor.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-bg flex-shrink-0">
                                        {sponsor.avatar ? (
                                            <img src={sponsor.avatar} alt={sponsor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <User className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{sponsor.name}</h3>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(sponsor.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {sponsor.amount && (
                                        <div className="ml-auto text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                            {sponsor.amount}
                                        </div>
                                    )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                    "{sponsor.message}"
                                </p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
