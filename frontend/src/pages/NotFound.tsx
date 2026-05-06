import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center p-4">
            <SEO title="404 页面未找到" noindex />

            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                页面未找到或已被移除
            </p>

            <Link
                to="/"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
            >
                <Home className="w-4 h-4" />
                返回首页
            </Link>
        </div>
    );
}
