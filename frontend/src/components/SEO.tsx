import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: string;
    jsonLd?: object;
    noindex?: boolean;
}

const SITE_NAME = '聚合AI';
const BASE_URL = 'https://youshandebo.xx.kg';

const defaultSEO = {
    title: `${SITE_NAME} - 免费且强大的多模型对话平台`,
    description: '免费使用 Gemini, ChatGPT 等主流大模型，一键切换多种AI模型，本地保存对话记录，隐私优先。聚合AI让AI触手可及。',
    keywords: '聚合AI, AI对话, ChatGPT, Gemini, 免费AI, 多模型, AI助手',
    image: '/og-image.png',
    type: 'website'
};

export default function SEO({
    title,
    description,
    keywords,
    image,
    url,
    type,
    jsonLd,
    noindex
}: SEOProps) {
    const location = useLocation();
    const canonicalUrl = url || `${BASE_URL}${location.pathname}`;

    const seo = {
        title: title ? `${title} | ${SITE_NAME}` : defaultSEO.title,
        description: description || defaultSEO.description,
        keywords: keywords || defaultSEO.keywords,
        image: image || defaultSEO.image,
        url: canonicalUrl,
        type: type || defaultSEO.type
    };

    return (
        <Helmet>
            <title>{seo.title}</title>
            <meta name="description" content={seo.description} />
            <meta name="keywords" content={seo.keywords} />
            {noindex && <meta name="robots" content="noindex" />}

            {/* Open Graph */}
            <meta property="og:title" content={seo.title} />
            <meta property="og:description" content={seo.description} />
            <meta property="og:image" content={seo.image} />
            <meta property="og:url" content={seo.url} />
            <meta property="og:type" content={seo.type} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:locale" content="zh_CN" />

            {/* Canonical */}
            <link rel="canonical" href={seo.url} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seo.title} />
            <meta name="twitter:description" content={seo.description} />
            <meta name="twitter:image" content={seo.image} />

            {/* JSON-LD Structured Data */}
            {jsonLd && (
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            )}
        </Helmet>
    );
}
