
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import ChatInterface from "./ChatInterface";
import Link from "next/link";
import { Prisma } from "@prisma/client";

export default async function DocumentChatPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const { id } = await params;

    if (!session || !session.user) {
        redirect("/login");
    }

    let document;
    try {
        // @ts-ignore
        document = await prisma.document.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return (
            <div className="p-6 text-red-500 bg-red-50 rounded-lg">
                <h2 className="text-lg font-bold">Error Loading Document</h2>
                <p>Could not connect to the database. Please try again later.</p>
                <Link href="/dashboard/documents" className="text-blue-600 hover:underline mt-4 block">
                    Return to Documents
                </Link>
            </div>
        );
    }

    if (!document) {
        notFound();
    }

    if (document.userId !== session.user.id) {
        return <div className="p-6 text-red-500">Unauthorized access.</div>;
    }

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <div>
                    <h1 className="text-xl font-bold">{document.title}</h1>
                    <p className="text-xs text-gray-500">Chatting about this document</p>
                </div>
                <Link href="/dashboard/documents" className="text-blue-500 hover:underline">
                    Back to list
                </Link>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg shadow-lg border">
                <ChatInterface
                    documentId={document.id}
                    initialMessages={document.messages}
                />
            </div>
        </div>
    );
}
