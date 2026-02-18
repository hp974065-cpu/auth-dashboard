
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recursiveCharacterTextSplitter } from "@/lib/chunking";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = 'nodejs'; // Force Node.js runtime

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            console.log("Unauthorized: No session");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.log("User:", session.user.email);

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const workspaceId = formData.get("workspaceId") as string | null;

        if (!file) {
            console.log("Error: No file provided");
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }
        console.log(`File: ${file.name} (${file.type}, ${file.size} bytes)`);
        console.log(`Workspace ID: ${workspaceId}`);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let textContent = "";

        // 1. PDF Parsing
        if (file.type === "application/pdf") {
            try {
                console.log("Parsing PDF...");
                // @ts-ignore
                const pdf = require("pdf-parse/lib/pdf-parse"); // Using CommonJS require
                const data = await pdf(buffer);
                textContent = data.text;
                console.log(`PDF Parsed. Text length: ${textContent.length}`);
            } catch (pdfError: any) {
                console.error("PDF Parsing FAILED:", pdfError);
                return NextResponse.json({ error: "Failed to parse PDF: " + pdfError.message }, { status: 500 });
            }
        } else if (file.type === "text/plain") {
            textContent = buffer.toString("utf-8");
        } else {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
        }

        // 2. Database Document Creation
        console.log("Creating Document in DB...");
        let document;
        try {
            document = await prisma.document.create({
                data: {
                    title: file.name,
                    content: textContent,
                    userId: session.user.id,
                    workspaceId: workspaceId || undefined,
                },
            });
            console.log(`Document created with ID: ${document.id}`);
        } catch (dbError: any) {
            console.error("DB Document Creation FAILED:", dbError);
            return NextResponse.json({ error: "Database error during document creation" }, { status: 500 });
        }

        // 3. Chunking
        console.log("Chunking text...");
        const chunks = recursiveCharacterTextSplitter(textContent, 1000, 200);
        console.log(`Generated ${chunks.length} chunks`);

        // 4. Embedding & Saving Chunks
        console.log("Generating Embeddings & Saving Chunks...");
        const BATCH_SIZE = 10;

        try {
            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                const batch = chunks.slice(i, i + BATCH_SIZE);
                console.log(`Processing batch ${i / BATCH_SIZE + 1}...`);

                const openai = getOpenAIClient();
                const embeddingResponse = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: batch,
                });

                const databaseChunks = batch.map((content, idx) => ({
                    content: content,
                    embedding: embeddingResponse.data[idx].embedding,
                    documentId: document.id,
                    workspaceId: workspaceId!, // This might be the issue if workspaceId is null
                    metadata: { chunkIndex: i + idx }
                }));

                // Check for null workspaceId before insert if schema requires it
                if (!workspaceId) {
                    console.warn("WARNING: Skipping chunk insertion because workspaceId is null (Legacy mode?)");
                } else {
                    await prisma.$transaction(
                        databaseChunks.map(chunk => prisma.documentChunk.create({ data: chunk }))
                    );
                }
            }
            console.log("All chunks processed successfully.");
        } catch (embeddingError: any) {
            console.error("Embedding/Chunk Saving FAILED:", embeddingError);
            // We might want to delete the document if chunks failed?
            return NextResponse.json({ error: "Failed to generate embeddings or save chunks: " + embeddingError.message }, { status: 500 });
        }

        console.log("----- UPLOAD COMPLETE -----");
        return NextResponse.json(document);

    } catch (error: any) {
        console.error("CRITICAL UNHANDLED ERROR:", error);
        return NextResponse.json(
            { error: "Internal Server Error: " + error.message },
            { status: 500 }
        );
    }
}

// Basic clean up of text

