import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/fileUtils";

const dataPath = path.resolve(process.cwd(), "data/settings.json");

interface GlobalSettings {
    theme: string; // "default" | "new-year"
    uptimeStart: number;
}

let settings: GlobalSettings = {
    theme: "default",
    uptimeStart: Date.now()
};

function ensureLoaded() {
    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, "utf-8");
            settings = JSON.parse(raw);
            if (!settings.uptimeStart) settings.uptimeStart = Date.now();
        } catch (e) {
            console.error("Failed to parse settings.json", e);
            settings = { theme: "default", uptimeStart: Date.now() };
        }
    }
}

function persist() {
    try {
        writeJsonAtomic(dataPath, settings);
    } catch (e) {
        console.error("Failed to persist settings", e);
    }
}

ensureLoaded();

export function getTheme(): string {
    ensureLoaded();
    return settings.theme || "default";
}

export function setTheme(theme: string): void {
    ensureLoaded();
    settings.theme = theme;
    persist();
}

export function getUptimeStart(): number {
    ensureLoaded();
    return settings.uptimeStart;
}

export function setUptimeStart(start: number): void {
    ensureLoaded();
    settings.uptimeStart = start;
    persist();
}

export const SettingsService = {
    getTheme,
    setTheme,
    getUptimeStart,
    setUptimeStart
};
