
const OpenAI = require("openai");

const key = "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";

const openai = new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
});

async function testKey() {
    try {
        console.log("Testing key: " + key.substring(0, 10) + "...");
        const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [{ role: "user", content: "Hello" }],
        });
        console.log("Success! Response:", completion.choices[0].message.content);
    } catch (error) {
        console.error("Error:", error);
    }
}

testKey();
