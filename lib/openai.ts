
import OpenAI from "openai";

export function getOpenAIClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.error("CRITICAL: OPENROUTER_API_KEY is undefined at client instantiation!");
    } else {
        console.log("OpenAI Client Initializing with Key:", apiKey.substring(0, 10) + "...");
    }

    return new OpenAI({
        apiKey: apiKey, // logic handles missing key by throwing usually, or we let OpenAI throw
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
            "X-Title": "Auth Dashboard",
        }
    });
}

// Keep backward compatibility for now if needed, but better to force usage of function
export const openai = new Proxy({}, {
    get: () => {
        throw new Error("Please use getOpenAIClient() instead of importing 'openai' directly, to ensure env vars are loaded.");
    }
});
