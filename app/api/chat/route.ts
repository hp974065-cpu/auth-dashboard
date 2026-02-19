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
        let forceWebSearch = false;

        // 1. Retrieve Relevant Context — 3-Pass Strategy
        if (workspaceId) {
            const openai = getOpenAIClient();
            const embeddingResponse = await openai.embeddings.create({
                model: "openai/text-embedding-3-small",
                input: question,
            });
            const questionEmbedding = embeddingResponse.data[0].embedding;

            // @ts-ignore
            const chunks = await prisma.documentChunk.findMany({
                where: { workspaceId },
                include: { document: true },
            });

            if (chunks.length === 0) {
                console.log("No document chunks in workspace. Forcing web search.");
                forceWebSearch = true;
            } else {
                // Score all chunks
                const scoredChunks = chunks.map((chunk: any) => ({
                    ...chunk,
                    score: cosineSimilarity(questionEmbedding, chunk.embedding)
                }));
                scoredChunks.sort((a: any, b: any) => b.score - a.score);

                // === PASS 1: Standard (threshold 0.4, top-5) ===
                let selectedChunks = scoredChunks.slice(0, 5).filter((c: any) => c.score > 0.4);
                let passUsed = 1;
                console.log(`Pass 1: ${selectedChunks.length} chunks above 0.4 (best: ${scoredChunks[0]?.score?.toFixed(3)})`);

                // === PASS 2: Broad (threshold 0.25, top-10) ===
                if (selectedChunks.length === 0) {
                    selectedChunks = scoredChunks.slice(0, 10).filter((c: any) => c.score > 0.25);
                    passUsed = 2;
                    console.log(`Pass 2: ${selectedChunks.length} chunks above 0.25`);
                }

                // === PASS 3: Full scan (no threshold, top-15) ===
                if (selectedChunks.length === 0) {
                    selectedChunks = scoredChunks.slice(0, 15);
                    passUsed = 3;
                    console.log(`Pass 3: Taking top ${selectedChunks.length} chunks regardless of score`);
                }

                if (selectedChunks.length > 0) {
                    context = selectedChunks.map((chunk: any, idx: number) =>
                        `[${idx + 1}] (sourceType: document) Document: ${chunk.document.title}\n${chunk.content}`
                    ).join("\n\n");
                    contextSource = `Workspace Documents (Pass ${passUsed})`;
                    console.log(`Using ${selectedChunks.length} chunks from Pass ${passUsed}`);
                } else {
                    console.log("All 3 passes returned no chunks. Forcing web search.");
                    forceWebSearch = true;
                }
            }
        } else if (documentId) {
            const document = await prisma.document.findUnique({
                where: { id: documentId },
            });

            if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
            if (document.userId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

            context = `--- (sourceType: document) DOCUMENT: ${document.title} ---\n${document.content.slice(0, 20000)}`;
            contextSource = `Document: ${document.title}`;
        }

        // 2. Fetch Web Context (Deep Search)
        // Trigger if useDeepSearch is TRUE OR forceWebSearch (all 3 passes failed)
        let webContext = "";
        const shouldSearchWeb = useDeepSearch || (forceWebSearch && process.env.FIRECRAWL_API_KEY);

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
        const hasWebContext = webContext && webContext.length > 0 && !webContext.startsWith("Web search failed");
        const hasDocContext = context && context.length > 0;

        // If neither documents nor web returned anything, short-circuit
        if (!hasDocContext && !hasWebContext) {
            const noDataAnswer = "I could not find any relevant information in your uploaded documents. Please make sure you have uploaded documents to this workspace, or enable Web Search to search the internet.";
            await prisma.message.create({
                data: { content: question, role: "user", documentId: documentId || undefined, workspaceId: workspaceId || undefined }
            });
            await prisma.message.create({
                data: { content: noDataAnswer, role: "assistant", documentId: documentId || undefined, workspaceId: workspaceId || undefined }
            });
            return NextResponse.json({ answer: noDataAnswer });
        }

        const systemPrompt = `You are an AI research assistant.
Synthesize information from the provided workspace documents and web search results to answer the question.
If information conflicts, prioritize the provided documents but mention the external web finding.
Always cite sources using the format [1], [2], etc. matching the provided numbers.
At the end of your response, list the unique sources you used in the format:
Sources:
[1] Document Name (or URL)
[2] Document Name (or URL)

If information comes from:
- uploaded documents (sourceType: document) → show document name
- web pages (sourceType: web) → show URL

If the answer cannot be found in the provided context, say "I could not find the answer in the provided documents or web search results."`;

        const fullPrompt = `${hasDocContext ? `CONTEXT FROM DOCUMENTS:\n${context}\n\n` : ""}
${hasWebContext ? `CONTEXT FROM WEB SEARCH:\n${webContext}\n\n` : ""}
USER QUESTION: ${question}`;

        const openai = getOpenAIClient();
        let answer: string;
        try {
            const response = await openai.chat.completions.create({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: fullPrompt }
                ]
            });
            answer = response.choices[0]?.message?.content || "Sorry, I couldn't generate an answer.";
        } catch (aiError: any) {
            console.error("OpenRouter AI completion FAILED:", aiError.message);
            console.error("Full AI error:", JSON.stringify(aiError, null, 2));
            return NextResponse.json(
                { error: "AI model error: " + aiError.message, answer: "Error: " + aiError.message },
                { status: 502 }
            );
        }

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
    } catch (error: any) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error: " + error.message },
            { status: 500 }
        );
    }
}
