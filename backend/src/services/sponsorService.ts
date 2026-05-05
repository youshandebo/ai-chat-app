import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { writeJsonAtomic } from "../utils/fileUtils";

const dataPath = path.resolve(process.cwd(), "data/sponsors.json");

export interface Sponsor {
    id: string;
    name: string;
    avatar: string; // URL to avatar image
    message: string;
    amount?: string; // e.g. "50 RMB"
    date: number; // timestamp
}

let sponsors: Sponsor[] = [];

function ensureLoaded() {
    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, "utf-8");
            sponsors = JSON.parse(raw);
        } catch (e) {
            console.error("Failed to parse sponsors.json", e);
            sponsors = [];
        }
    } else {
        sponsors = [];
    }
}

function persist() {
    try {
        // fs.mkdirSync handled by writeJsonAtomic
        writeJsonAtomic(dataPath, sponsors);
    } catch (e) {
        console.error("Failed to persist sponsors", e);
    }
}

ensureLoaded();

export function getSponsors(): Sponsor[] {
    ensureLoaded();
    return sponsors.sort((a, b) => b.date - a.date);
}

export function createSponsor(data: Omit<Sponsor, "id" | "date">): Sponsor {
    ensureLoaded();
    const sponsor: Sponsor = {
        id: randomUUID(),
        ...data,
        date: Date.now(),
    };
    sponsors.unshift(sponsor);
    persist();
    return sponsor;
}

export function updateSponsor(id: string, data: Partial<Sponsor>): Sponsor | null {
    ensureLoaded();
    const index = sponsors.findIndex(s => s.id === id);
    if (index === -1) return null;

    sponsors[index] = { ...sponsors[index], ...data };
    persist();
    return sponsors[index];
}

export function deleteSponsor(id: string): boolean {
    ensureLoaded();
    const index = sponsors.findIndex(s => s.id === id);
    if (index === -1) return false;

    sponsors.splice(index, 1);
    persist();
    return true;
}

export const SponsorService = {
    getAll: getSponsors,
    create: createSponsor,
    update: updateSponsor,
    delete: deleteSponsor
};
