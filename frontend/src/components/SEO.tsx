import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: string;
}

const defaultSEO = {
    title: '聚合AI - 免费且强大的多模型对话平台',
    description: '免费使用 Gemini, ChatGPT 等主流大模型，一键切换多种AI模型，本地保存对话记录，隐私优先。聚合AI让AI触手可及。',
    keywords: '聚合AI, AI对话, ChatGPT, Gemini, 免费AI, 多模型, AI助手',
    image: '/og-image.png',
    url: 'https://youshandebo.xx.kg',
    type: 'website'
};

export default function SEO({
    title,
    description,
    keywords,
    image,
    url,
    type
}: SEOProps) {
    const seo = {
        title: title ? `${title} | 聚合AI` : defaultSEO.title,
        description: description || defaultSEO.description,
        keywords: keywords || defaultSEO.keywords,
        image: image || defaultSEO.image,
        url: url || defaultSEO.url,
        type: type || defaultSEO.type
    };

    return (
        <Helmet>
            <title>{seo.title}</title>
            <meta name="description" content={seo.description} />
            <meta name="keywords" content={seo.keywords} />

            {/* Open Graph */}
            <meta property="og:title" content={seo.title} />
            <meta property="og:description" content={seo.description} />
            <meta property="og:image" content={seo.image} />
            <meta property="og:url" content={seo.url} />
            <meta property="og:type" content={seo.type} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seo.title} />
            <meta name="twitter:description" content={seo.description} />
            <meta name="twitter:image" content={seo.image} />
        </Helmet>
    );
}
