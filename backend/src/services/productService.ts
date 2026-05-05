import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { writeJsonAtomic } from "../utils/fileUtils";

const dataPath = path.resolve(process.cwd(), "data/products.json");

export interface Product {
    id: string;
    name: string;
    description: string;
    price: string; // e.g. "9.99"
    image: string; // URL to product image
    afdianLink?: string; // Direct link to Afdian payment page
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}

let products: Product[] = [];

function ensureLoaded() {
    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, "utf-8");
            products = JSON.parse(raw);
        } catch (e) {
            console.error("Failed to parse products.json", e);
            products = [];
        }
    } else {
        products = [];
    }
}

function persist() {
    try {
        writeJsonAtomic(dataPath, products);
    } catch (e) {
        console.error("Failed to persist products", e);
    }
}

ensureLoaded();

export function getProducts(includeDisabled = false): Product[] {
    ensureLoaded();
    const filtered = includeDisabled ? products : products.filter(p => p.enabled);
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export function getProductById(id: string): Product | null {
    ensureLoaded();
    return products.find(p => p.id === id) || null;
}

export function createProduct(data: Omit<Product, "id" | "createdAt" | "updatedAt">): Product {
    ensureLoaded();
    const product: Product = {
        id: randomUUID(),
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    products.unshift(product);
    persist();
    return product;
}

export function updateProduct(id: string, data: Partial<Product>): Product | null {
    ensureLoaded();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    products[index] = {
        ...products[index],
        ...data,
        updatedAt: Date.now()
    };
    persist();
    return products[index];
}

export function deleteProduct(id: string): boolean {
    ensureLoaded();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return false;

    products.splice(index, 1);
    persist();
    return true;
}

export const ProductService = {
    getAll: getProducts,
    getById: getProductById,
    create: createProduct,
    update: updateProduct,
    delete: deleteProduct
};
