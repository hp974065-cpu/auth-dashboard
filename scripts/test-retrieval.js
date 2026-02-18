
const { PrismaClient } = require('@prisma/client');
const OpenAI = require("openai");

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

async function main() {
    const workspaceId = "cmlrpg9kg000111tuvgrrz58t"; // WORKSPACE ID FROM PREVIOUS STEP
    const question = "What are the registration instructions?";

    console.log(`Testing retrieval for workspace: ${workspaceId}`);
    console.log(`Question: ${question}`);

    try {
        // 1. Generate Embedding
        console.log("Generating embedding...");
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: question,
        });
        const questionEmbedding = embeddingResponse.data[0].embedding;
        console.log("Embedding generated.");

        // 2. Fetch Chunks
        console.log("Fetching chunks from DB...");
        const chunks = await prisma.documentChunk.findMany({
            where: { workspaceId },
            include: { document: true },
        });
        console.log(`Found ${chunks.length} chunks in workspace.`);

        if (chunks.length === 0) {
            console.warn("No chunks found! Did you upload documents to this workspace?");
            return;
        }

        // 3. Simple Cosine Similarity (Manual)
        const cosineSimilarity = (a, b) => {
            const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
            const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
            const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
            return dotProduct / (magnitudeA * magnitudeB);
        };

        const scoredChunks = chunks.map(chunk => ({
            ...chunk,
            score: cosineSimilarity(questionEmbedding, chunk.embedding)
        }));

        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunk = scoredChunks[0];

        console.log(`Top match score: ${topChunk.score}`);
        console.log(`Top match content: ${topChunk.content.substring(0, 100)}...`);

        // 4. Test Chat Completion
        console.log("Testing Chat Completion...");
        const response = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [
                { role: "user", content: "Hello" }
            ]
        });
        console.log("Chat Response:", response.choices[0].message.content);

    } catch (error) {
        console.error("TEST FAILED:", error);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
