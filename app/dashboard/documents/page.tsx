
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import UploadForm from "./UploadForm";

// Manual definition to bypass Prisma type issues
interface Document {
    id: string;
    title: string;
    content: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export default async function DocumentsPage() {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/login");
    }

    let documents: Document[] = [];
    try {
        // @ts-ignore
        documents = await prisma.document.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    } catch (error) {
        console.error("Failed to fetch documents:", error);
        // Return an empty list or a specific error state if needed
        // For now, we'll just let it render as empty with a console error
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">My Documents 📄</h1>
                <Link href="/dashboard" className="text-blue-500 hover:underline">
                    Back to Dashboard
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
                <UploadForm />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
                {documents.length === 0 ? (
                    <p className="text-gray-500">No documents uploaded yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {documents.map((doc) => (
                            <li key={doc.id} className="border p-4 rounded hover:bg-gray-50 flex justify-between items-center transition">
                                <div>
                                    <Link href={`/dashboard/documents/${doc.id}`} className="font-medium text-blue-600 hover:underline">
                                        {doc.title}
                                    </Link>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Uploaded on {doc.createdAt.toLocaleDateString()}
                                    </p>
                                </div>
                                <Link
                                    href={`/dashboard/documents/${doc.id}`}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                >
                                    Chat 💬
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
