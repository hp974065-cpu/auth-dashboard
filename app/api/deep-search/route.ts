import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import FirecrawlApp from '@mendable/firecrawl-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { question } = body;

        if (!question) {
            return NextResponse.json({ error: "Missing question" }, { status: 400 });
        }

        // 1. Search the web using Firecrawl
        let webContext = "";
        let sources: { title: string; url: string }[] = [];

        if (!process.env.FIRECRAWL_API_KEY) {
            return NextResponse.json(
                { error: "Firecrawl API key not configured. Please add FIRECRAWL_API_KEY to your environment variables." },
                { status: 500 }
            );
        }

        try {
            console.log("Deep Search: Starting Firecrawl web search for:", question);
            const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

            const searchResponse = await app.search(question, {
                scrapeOptions: {
                    formats: ['markdown']
                },
                limit: 5
            });

            if (searchResponse) {
                // @ts-ignore
                const results = searchResponse.data || searchResponse.web || [];
                if (results.length > 0) {
                    webContext = results.map((result: any, idx: number) => {
                        sources.push({
                            title: result.title || `Source ${idx + 1}`,
                            url: result.url || ""
                        });
                        return `[${idx + 1}] Source: ${result.url}\nTitle: ${result.title}\n${result.markdown || result.description || "No content"}`;
                    }).join("\n\n---\n\n");
                }
            }

            console.log(`Deep Search: Found ${sources.length} web results`);
        } catch (err: any) {
            console.error("Firecrawl search failed:", err.message);
            return NextResponse.json(
                { error: "Web search failed: " + err.message },
                { status: 502 }
            );
        }

        if (!webContext || webContext.length === 0) {
            return NextResponse.json({
                answer: "I searched the web but could not find relevant results for your query. Please try rephrasing your question.",
                sources: []
            });
        }

        // 2. Generate AI Response
        const systemPrompt = `You are an AI research assistant with access to live web search results.
Analyze the provided web search results and synthesize a comprehensive, well-structured answer.
Always cite your sources using [1], [2], etc. matching the source numbers provided.
At the end of your response, list all sources used in the format:

Sources:
[1] Title - URL
[2] Title - URL

Be thorough, accurate, and helpful. If the search results don't fully answer the question, say so.`;

        const fullPrompt = `WEB SEARCH RESULTS:\n${webContext}\n\nUSER QUESTION: ${question}`;

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
            answer = response.choices[0]?.message?.content || "Sorry, I couldn't generate an answer from the web results.";
        } catch (aiError: any) {
            console.error("Deep Search AI completion failed:", aiError.message);
            return NextResponse.json(
                { error: "AI model error: " + aiError.message },
                { status: 502 }
            );
        }

        return NextResponse.json({ answer, sources });
    } catch (error: any) {
        console.error("Deep Search API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error: " + error.message },
            { status: 500 }
        );
    }
}
