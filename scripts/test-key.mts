
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: "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",
    baseURL: "https://openrouter.ai/api/v1",
})

async function test() {
    try {
        console.log("Testing OpenAI key...")
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 50,
            messages: [{ role: "user", content: "Hello" }],
        })
        console.log("✅ Success! Response:", response.choices[0].message.content)
    } catch (e: any) {
        console.log("❌ Error:", e.message)
        if (e.response) {
            console.log("Status:", e.response.status)
            console.log("Data:", JSON.stringify(e.response.data))
        }
    }
}

test()
