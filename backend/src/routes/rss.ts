import express from "express";
import { ArticleService } from "../services/articles";

const router = express.Router();

router.get("/rss", (req, res) => {
    try {
        const articles = ArticleService.getAll(true); // Published only
        const siteUrl = "https://youshandebo.xx.kg";
        const feedUrl = `${siteUrl}/api/rss`;

        // Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>聚合AI - AI对话平台</title>
    <link>${siteUrl}</link>
    <description>免费体验 Gemini, ChatGPT 等主流大模型，一键切换多种AI模型。</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
`;

        articles.forEach(article => {
            const link = `${siteUrl}/articles/${article.id}`;
            const date = new Date(article.createdAt).toUTCString();
            // Simple description from first 200 chars or customized
            const desc = article.content.slice(0, 200).replace(/<[^>]+>/g, '') + '...';

            xml += `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${date}</pubDate>
      <description><![CDATA[${desc}]]></description>
      <author><![CDATA[${article.author}]]></author>
    </item>`;
        });

        xml += `
  </channel>
</rss>`;

        res.header("Content-Type", "application/xml");
        res.send(xml);

    } catch (e: any) {
        console.error("RSS generation failed:", e);
        res.status(500).send("Error generating RSS feed");
    }
});

export default router;
