import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient } from "@/lib/openai";
import { cosineSimilarity } from "@/lib/vector";
import FirecrawlApp from '@mendable/firecrawl-js';

// Initialize OpenAI client with OpenRouter API key and base URL
// Moved to lib/openai.ts

export const runtime = 'nodejs'; // Force Node.js runtime

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { question, documentId, workspaceId, useDeepSearch } = body;

        if (!question || (!documentId && !workspaceId && !useDeepSearch)) {
            return NextResponse.json(
                { error: "Missing question or context (documentId or workspaceId)" },
                { status: 400 }
            );
        }

        let context = "";
        let contextSource = "";

        // 1. Retrieve Relevant Context
        if (workspaceId) {
            // Generate embedding for the question
            const openai = getOpenAIClient();
            const embeddingResponse = await openai.embeddings.create({
                model: "openai/text-embedding-3-small",
                input: question,
            });
            const questionEmbedding = embeddingResponse.data[0].embedding;

            // Fetch all chunks for the workspace (In-memory vector search)
            // Note: For large workspaces, we would use pgvector or a vector DB.
            // Fetch all chunks for the workspace (In-memory vector search)
            // Note: For large workspaces, we would use pgvector or a vector DB.
            // @ts-ignore
            const chunks = await prisma.documentChunk.findMany({
                where: { workspaceId },
                include: { document: true },
            });

            // Calculate similarity
            const scoredChunks = chunks.map((chunk: any) => ({
                ...chunk,
                score: cosineSimilarity(questionEmbedding, chunk.embedding)
            }));

            // Sort by score descending
            scoredChunks.sort((a: any, b: any) => b.score - a.score);

            // Take top 5 chunks
            const topChunks = scoredChunks.slice(0, 5);

            // Filter out low relevance if needed, but for now just take top 5
            // If top score is very low, we might trigger web search
            const TOP_SCORE_THRESHOLD = 0.4;
            const bestScore = topChunks.length > 0 ? topChunks[0].score : 0;

            console.log(`Top chunk score: ${bestScore}`);

            if (bestScore > TOP_SCORE_THRESHOLD) {
                context = topChunks.map((chunk: any, idx: number) =>
                    `[${idx + 1}] Document: ${chunk.document.title}\n${chunk.content}`
                ).join("\n\n");

                contextSource = "Workspace Documents";
            } else {
                console.log("Documents insufficient, enabling web search fallback.");
                // If document relevance is low, force web search if not already enabled
                if (!useDeepSearch) {
                    // modifying the flag effectively for the logic below
                    // (though we need to handle the variable scope)
                    // We will set a flag to force web search
                }
            }
        } else if (documentId) {
            // Legacy single document mode (or can use chunks too if we want)
            const document = await prisma.document.findUnique({
                where: { id: documentId },
            });

            if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
            if (document.userId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

            context = `--- DOCUMENT: ${document.title} ---\n${document.content.slice(0, 20000)}`;
            contextSource = `Document: ${document.title}`;
        }

        // 2. Fetch Web Context (Deep Search)
        // Trigger if useDeepSearch is TRUE OR if context is empty/low relevance
        let webContext = "";
        const shouldSearchWeb = useDeepSearch || (!context && process.env.FIRECRAWL_API_KEY);

        if (shouldSearchWeb && process.env.FIRECRAWL_API_KEY) {
            try {
                console.log("Starting Firecrawl web search...");
                const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

                const searchResponse = await app.search(question, {
                    scrapeOptions: {
                        formats: ['markdown']
                    },
                    limit: 3
                });

                if (searchResponse) {
                    // @ts-ignore
                    const results = searchResponse.data || searchResponse.web || [];
                    if (results.length > 0) {
                        webContext = results.map((result: any) =>
                            `[Source: ${result.url}] ${result.title}\n${result.markdown || result.description || "No content"}`
                        ).join("\n\n");
                    }
                }
            } catch (err) {
                console.warn("Firecrawl search failed:", err);
                webContext = "Web search failed or returned no results.";
            }
        }

        // 3. Save User Message
        await prisma.message.create({
            data: {
                content: question,
                role: "user",
                documentId: documentId || undefined,
                workspaceId: workspaceId || undefined,
            },
        });

        // 4. Generate AI Response
        const systemPrompt = `You are an AI research assistant.
Synthesize information from the provided workspace documents and web search results to answer the question.
If information conflicts, prioritize the provided documents but mention the external web finding.
Always cite sources using the format [1], [2], etc. matching the provided numbers.
At the end of your response, list the unique sources you used in the format:
Sources:
[1] Document Name (or URL)
[2] Document Name (or URL)

If information comes from:
- uploaded documents → show document name
- web pages → show URL

If the answer cannot be found in the context, say "I could not find the answer in the provided documents or web search results."`;

        const fullPrompt = `CONTEXT FROM DOCUMENTS:\n${context}

${useDeepSearch ? `CONTEXT FROM WEB SEARCH:\n${webContext}\n` : ""}

USER QUESTION: ${question}`;

        const openai = getOpenAIClient();
        const response = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: fullPrompt }
            ]
        });

        const answer = response.choices[0]?.message?.content || "Sorry, I couldn't generate an answer.";

        // 5. Save Assistant Message
        await prisma.message.create({
            data: {
                content: answer,
                role: "assistant",
                documentId: documentId || undefined,
                workspaceId: workspaceId || undefined,
            },
        });

        return NextResponse.json({ answer });
    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
