
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Initialize OpenAI client with Groq API key and base URL
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { question, documentId } = body;

        if (!question || !documentId) {
            return NextResponse.json(
                { error: "Missing question or documentId" },
                { status: 400 }
            );
        }

        // Fetch the document
        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (document.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized access to document" }, { status: 403 });
        }

        // save user message
        await prisma.message.create({
            data: {
                content: question,
                role: "user",
                documentId: documentId,
            },
        });

        // Create prompt with context
        // Truncate content if it's too long (simple approach for now)
        // Groq's Llama 3 models have decent context, but let's be safe (~6000 chars)
        const context = document.content.slice(0, 20000);

        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant. Answer the user's question based on the provided context."
                },
                {
                    role: "user",
                    content: `Context: ${context}\n\nQuestion: ${question}`
                }
            ]
        });

        const answer = response.choices[0]?.message?.content || "Sorry, I couldn't generate an answer.";

        // save assistant message
        await prisma.message.create({
            data: {
                content: answer,
                role: "assistant",
                documentId: documentId,
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
