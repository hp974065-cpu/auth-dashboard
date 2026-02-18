
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import FirecrawlApp from '@mendable/firecrawl-js';

// Initialize OpenAI client with OpenRouter API key and base URL
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { question, documentId, workspaceId, useDeepSearch } = body;

        if (!question || (!documentId && !workspaceId)) {
            return NextResponse.json(
                { error: "Missing question or context (documentId or workspaceId)" },
                { status: 400 }
            );
        }

        let context = "";
        let contextSource = "";

        // 1. Fetch Document Context
        if (workspaceId) {
            const workspace = await prisma.workspace.findUnique({
                where: { id: workspaceId },
                include: { documents: true },
            });

            if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
            if (workspace.userId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

            // Combine content from all documents
            // Limit total context to ~25k chars to be safe with Llama 3.1 8b headers
            // A smarter approach would be RAG, but context stuffing detailed here.
            context = workspace.documents.map(doc => `--- DOCUMENT: ${doc.title} ---\n${doc.content.slice(0, 5000)}`).join("\n\n");
            contextSource = `Workspace: ${workspace.title}`;
        } else if (documentId) {
            const document = await prisma.document.findUnique({
                where: { id: documentId },
            });

            if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
            if (document.userId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

            context = `--- DOCUMENT: ${document.title} ---\n${document.content.slice(0, 20000)}`;
            contextSource = `Document: ${document.title}`;
        }

        // 2. Fetch Web Context (Deep Search)
        let webContext = "";
        if (useDeepSearch && process.env.FIRECRAWL_API_KEY) {
            try {
                const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

                // Search utilizing the web-scraper to get content
                const searchResponse = await app.search(question, {
                    scrapeOptions: {
                        formats: ['markdown']
                    }
                });

                if (searchResponse && searchResponse.web) {
                    webContext = searchResponse.web.map((result: any) =>
                        `--- WEB RESULT: ${result.title} (${result.url}) ---\n${result.markdown || result.description || "No content available"}`
                    ).join("\n\n");
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
        const systemPrompt = `You are an intelligent assistant. 
You have access to the following context from the user's documents and potentially the web.
Answer the user's question based ONLY on the provided context. 
If the answer is in the documents, cite the document title like [Document Title].
If the answer is from the web, cite the source URL or title.
If the answer is not in the context, say so.`;

        const fullPrompt = `CONTEXT FROM DOCUMENTS:\n${context}

${useDeepSearch ? `CONTEXT FROM WEB SEARCH:\n${webContext}\n` : ""}

USER QUESTION: ${question}`;

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
