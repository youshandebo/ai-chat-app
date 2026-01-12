import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/fileUtils";

const dataPath = path.resolve(process.cwd(), "data/settings.json");

interface GlobalSettings {
    theme: string; // "default" | "new-year"
}

let settings: GlobalSettings = {
    theme: "default"
};

function ensureLoaded() {
    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, "utf-8");
            settings = JSON.parse(raw);
        } catch (e) {
            console.error("Failed to parse settings.json", e);
            settings = { theme: "default" };
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

export const SettingsService = {
    getTheme,
    setTheme
};
