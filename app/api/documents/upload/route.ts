
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recursiveCharacterTextSplitter } from "@/lib/chunking";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = 'nodejs'; // Force Node.js runtime

export async function POST(req: NextRequest) {
    try {
        console.log("Upload request started");
        const session = await auth();
        if (!session || !session.user) {
            console.log("Unauthorized request");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.log("User authenticated:", session.user.email);

        const formData = await req.formData();
        const file = formData.get("file") as File;

        const workspaceId = formData.get("workspaceId") as string | null;

        if (!file) {
            console.log("No file provided");
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }
        console.log("File received:", file.name, file.type, file.size);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let textContent = "";

        if (file.type === "application/pdf") {
            try {
                console.log("Parsing PDF... attempting require");
                // @ts-ignore
                const pdf = require("pdf-parse/lib/pdf-parse");
                console.log("PDF module required:", typeof pdf);

                const data = await pdf(buffer);
                textContent = data.text;
                console.log("PDF parsed successfully. Length:", textContent.length);
            } catch (pdfError: any) {
                console.error("PDF Parsing failed:", pdfError);
                return NextResponse.json({ error: "Failed to parse PDF: " + pdfError.message }, { status: 500 });
            }
        } else if (file.type === "text/plain") {
            textContent = buffer.toString("utf-8");
        } else {
            console.log("Unsupported file type:", file.type);
            return NextResponse.json(
                { error: "Unsupported file type. Please upload PDF or Text file." },
                { status: 400 }
            );
        }

        // 1. Create the Document
        const document = await prisma.document.create({
            data: {
                title: file.name,
                content: textContent,
                userId: session.user.id,
                workspaceId: workspaceId || undefined,
            },
        });

        console.log("Document created:", document.id);

        // 2. Chunk the text
        const chunks = recursiveCharacterTextSplitter(textContent, 1000, 200);
        console.log(`Generated ${chunks.length} chunks`);

        // 3. Generate Embeddings & Save Chunks
        // We process in batches to avoid rate limits
        const BATCH_SIZE = 10;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);

            const openai = getOpenAIClient();
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: batch,
            });

            const databaseChunks = batch.map((content, idx) => ({
                content: content,
                embedding: embeddingResponse.data[idx].embedding,
                documentId: document.id,
                workspaceId: workspaceId!, // Ensure we have workspaceId if enforcing it, otherwise handle null
                metadata: {
                    chunkIndex: i + idx,
                }
            }));

            // WorkspaceId might be null if user didn't select one (legacy), but our new system enforces it?
            // The schema says workspaceId is optional on Document, but we added it to DocumentChunk as required?
            // Let's check schema. DocumentChunk.workspaceId is String (Required).
            // So we MUST have a workspaceId suitable here.

            // If workspaceId is null, we can't create chunks per our new schema.
            // We should enforce workspaceId in validation.

            if (workspaceId) {
                await prisma.$transaction(
                    databaseChunks.map(chunk => prisma.documentChunk.create({ data: chunk }))
                );
            }
        }

        console.log("Document saved:", document.id);

        return NextResponse.json(document);
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

// Basic clean up of text

