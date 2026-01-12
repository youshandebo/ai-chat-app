import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ShoppingBag, ExternalLink, Loader2, Package } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    description: string;
    price: string;
    image: string;
    afdianLink?: string;
    enabled: boolean;
}

export default function Store() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error('Failed to fetch products');
            const data = await res.json();
            setProducts(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = (product: Product) => {
        if (product.afdianLink) {
            window.open(product.afdianLink, '_blank');
        } else {
            // Default Afdian user page
            window.open('https://afdian.com/a/83b1bf9a2a7c11f09fbf52540025c377', '_blank');
        }
    };

    return (
        <>
            <Helmet>
                <title>商城 - 聚合AI</title>
                <meta name="description" content="聚合AI商城，选购优质商品和服务" />
            </Helmet>

            <div className="min-h-full bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-purple-900/10 py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25 mb-6">
                            <ShoppingBag className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent mb-4">
                            商城
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                            选购优质商品和服务，通过爱发电安全支付
                        </p>
                    </motion.div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="text-center py-20">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button
                                onClick={fetchProducts}
                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                重试
                            </button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && products.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">
                                暂无商品，敬请期待
                            </p>
                        </motion.div>
                    )}

                    {/* Products Grid */}
                    {!loading && !error && products.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product, index) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-dark-border hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300"
                                >
                                    {/* Product Image */}
                                    <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 relative overflow-hidden">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-12 h-12 text-purple-300 dark:text-purple-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                                            {product.name}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                                            {product.description || '暂无描述'}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                                                ¥{product.price}
                                            </div>
                                            <button
                                                onClick={() => handleBuy(product)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/30"
                                            >
                                                购买
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Payment Notice */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-12 text-center"
                    >
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            支付由 <a href="https://afdian.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">爱发电</a> 提供安全保障
                        </p>
                    </motion.div>
                </div>
            </div>
        </>
    );
}
