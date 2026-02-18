import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import UploadForm from "./UploadForm";
import WorkspaceManager from "@/components/WorkspaceManager";
import ChatInterface from "@/components/ChatInterface";

export default async function DocumentsPage({
    searchParams
}: {
    searchParams: Promise<{ workspaceId?: string }>
}) {
    const session = await auth();
    const { workspaceId } = await searchParams;

    if (!session || !session.user) {
        redirect("/login");
    }

    // 1. Fetch Workspaces
    const workspaces = await prisma.workspace.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { documents: true } } }
    });

    // 2. Determine Active Workspace
    let activeWorkspaceId = workspaceId;
    if (!activeWorkspaceId && workspaces.length > 0) {
        activeWorkspaceId = workspaces[0].id;
    }

    // 3. Fetch Documents (if workspace selected)
    const documents = activeWorkspaceId ? await prisma.document.findMany({
        where: {
            userId: session.user.id,
            workspaceId: activeWorkspaceId
        },
        orderBy: { createdAt: "desc" },
    }) : [];

    // 4. Fetch Previous Messages (if needed, but ChatInterface handles its own state mostly, 
    // or we can seed it with history for the workspace)
    // For now we start fresh or specific chat history component can load it.
    // If we want chat history per workspace, we can fetch it here.
    const initialMessages = activeWorkspaceId ? await prisma.message.findMany({
        where: { workspaceId: activeWorkspaceId },
        orderBy: { createdAt: "asc" },
        take: 50 // Limit history
    }) : [];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Knowledge Base 🧠</h1>
                <Link href="/dashboard" className="text-blue-500 hover:underline">
                    Back to Dashboard
                </Link>
            </div>

            <WorkspaceManager
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
            />

            {!activeWorkspaceId ? (
                <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed">
                    <h2 className="text-xl font-semibold text-gray-700">No Workspace Selected</h2>
                    <p className="text-gray-500 mt-2">Create a workspace to start uploading documents.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
                    {/* Left Column: Documents & Upload */}
                    <div className="lg:col-span-5 flex flex-col gap-6 h-full overflow-hidden">
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <h2 className="text-lg font-semibold mb-3">Upload Document</h2>
                            <UploadForm workspaceId={activeWorkspaceId} />
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm border flex-1 overflow-y-auto">
                            <h2 className="text-lg font-semibold mb-3">Documents ({documents.length})</h2>
                            {documents.length === 0 ? (
                                <p className="text-sm text-gray-500">No documents in this workspace.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {documents.map((doc) => (
                                        <li key={doc.id} className="border-b last:border-0 pb-2 mb-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-sm truncate max-w-[200px]" title={doc.title}>
                                                        {doc.title}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {doc.createdAt.toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <Link
                                                    href={`/dashboard/documents/${doc.id}`}
                                                    className="text-xs text-blue-500 hover:underline"
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Chat */}
                    <div className="lg:col-span-7 h-full">
                        <ChatInterface
                            workspaceId={activeWorkspaceId}
                            initialMessages={initialMessages}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
