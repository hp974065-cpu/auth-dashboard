
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
