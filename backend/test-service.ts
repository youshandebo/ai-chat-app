import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, ".env") });

import { callModelAPI } from "./src/services/modelService";
import { getModelConfig } from "./src/config/models";

async function test() {
    console.log("Loading config...");
    const cfg = getModelConfig();
    const model = cfg.models.find((m: any) => m.id === "gemini-2.5-flash");

    if (!model) {
        console.error("Model not found!");
        return;
    }
    console.log("Model found:", model.id);

    const apiKey = process.env[model.apiKeyEnv];
    console.log("API Key loaded:", !!apiKey);

    const messages = [{ role: "user", content: "Hello from test-service" }];

    // Test Non-Streaming
    console.log("Testing callModelAPI (non-streaming)...");
    try {
        const res = await callModelAPI(model, messages, apiKey);
        console.log("Response:", res);
    } catch (e: any) {
        console.error("Error in non-streaming:", e);
    }

    // Test Streaming
    console.log("Testing callModelAPI (streaming)...");
    try {
        await callModelAPI(model, messages, apiKey, (chunk) => {
            console.log("Chunk:", JSON.stringify(chunk));
        });
        console.log("Streaming done");
    } catch (e: any) {
        console.error("Error in streaming:", e);
    }
}

test();
