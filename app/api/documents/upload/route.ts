
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse";

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
                console.log("Parsing PDF...");
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

        // Basic clean up of text
        textContent = textContent.replace(/\s+/g, ' ').trim();

        console.log("Saving to database...");
        const document = await prisma.document.create({
            data: {
                title: file.name,
                content: textContent,
                userId: session.user.id!,
            },
        });
        console.log("Document saved:", document.id);

        return NextResponse.json({ document }, { status: 201 });
    } catch (error: any) {
        console.error("Upload error (unhandled):", error);
        return NextResponse.json(
            { error: "Internal Server Error: " + error.message },
            { status: 500 }
        );
    }
}
