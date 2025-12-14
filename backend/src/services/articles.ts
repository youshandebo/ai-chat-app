import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/fileUtils";
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

let lastLoaded = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache if modified externally, but we primarily rely on in-memory state

function ensureLoaded() {
    try {
        // If we have cached data and it's not too old, or if we just wrote to it (meaning it's fresh), skip load
        const now = Date.now();
        if (cached.articles.length > 0 && (now - lastLoaded < CACHE_TTL)) {
            return;
        }

        if (fs.existsSync(dataPath)) {
            // Check if file modified since last load
            const stats = fs.statSync(dataPath);
            if (stats.mtimeMs <= lastLoaded && cached.articles.length > 0) {
                return;
            }

            const raw = fs.readFileSync(dataPath, "utf-8");
            cached = JSON.parse(raw || "{}");
            if (!Array.isArray(cached.articles)) {
                cached.articles = [];
            }
            // Auto-migration: Update 'Admin' to 'youshandebo'
            let hasChanges = false;
            cached.articles.forEach(a => {
                if (a.author === 'Admin') {
                    a.author = 'youshandebo';
                    hasChanges = true;
                }
            });
            if (hasChanges) {
                console.log('[Articles] Migrated authors from Admin to youshandebo');
                persist(); // Save immediately
            }

            lastLoaded = Date.now();
            console.log(`[Articles] Loaded ${cached.articles.length} articles from disk`);
        }
    } catch (e) {
        console.error("Failed to load articles:", e);
        cached = { articles: [] };
    }
}

function persist() {
    try {
        writeJsonAtomic(dataPath, cached);
        lastLoaded = Date.now(); // Update timestamp so we don't reload our own changes
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
