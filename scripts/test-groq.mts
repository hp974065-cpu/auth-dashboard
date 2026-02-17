
import OpenAI from "openai"
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
})

async function test() {
    console.log("Testing Groq API Key:", process.env.GROQ_API_KEY ? "Present" : "Missing")
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: "Hello" }],
        })
        console.log("✅ Success! Response:", response.choices[0].message.content)
    } catch (e: any) {
        console.log("❌ Error:", e.message)
    }
}

test()
