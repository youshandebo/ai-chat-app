import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const dataPath = path.resolve(process.cwd(), "data/articles.json");

export interface Article {
    id: string;
    title: string;
    content: string;  // Markdown format
    author: string;
    createdAt: number;
    updatedAt: number;
    published: boolean;
    tags: string[];
}

interface ArticlesData {
    articles: Article[];
}

let cached: ArticlesData = { articles: [] };

function ensureLoaded() {
    try {
        if (fs.existsSync(dataPath)) {
            const raw = fs.readFileSync(dataPath, "utf-8");
            cached = JSON.parse(raw || "{}");
            if (!Array.isArray(cached.articles)) {
                cached.articles = [];
            }
        }
    } catch (e) {
        console.error("Failed to load articles:", e);
        cached = { articles: [] };
    }
}

function persist() {
    try {
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        fs.writeFileSync(dataPath, JSON.stringify(cached, null, 2));
    } catch (e) {
        console.error("Failed to persist articles:", e);
    }
}

// Get all articles (optionally filter by published status)
export function getArticles(publishedOnly = false): Article[] {
    ensureLoaded();
    if (publishedOnly) {
        return cached.articles.filter(a => a.published);
    }
    return cached.articles;
}

// Get single article by ID
export function getArticle(id: string): Article | null {
    ensureLoaded();
    return cached.articles.find(a => a.id === id) || null;
}

// Create new article
export function createArticle(data: Omit<Article, "id" | "createdAt" | "updatedAt">): Article {
    ensureLoaded();
    const article: Article = {
        id: randomUUID(),
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    cached.articles.unshift(article);  // Add to beginning
    persist();
    return article;
}

// Update existing article
export function updateArticle(id: string, data: Partial<Omit<Article, "id" | "createdAt">>): Article | null {
    ensureLoaded();
    const index = cached.articles.findIndex(a => a.id === id);
    if (index === -1) return null;

    cached.articles[index] = {
        ...cached.articles[index],
        ...data,
        updatedAt: Date.now(),
    };
    persist();
    return cached.articles[index];
}

// Delete article
export function deleteArticle(id: string): boolean {
    ensureLoaded();
    const index = cached.articles.findIndex(a => a.id === id);
    if (index === -1) return false;

    cached.articles.splice(index, 1);
    persist();
    return true;
}

export const ArticleService = {
    getAll: getArticles,
    getById: getArticle,
    create: createArticle,
    update: updateArticle,
    delete: deleteArticle
};
