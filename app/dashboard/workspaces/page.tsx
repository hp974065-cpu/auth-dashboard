import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import WorkspaceManager from "@/components/WorkspaceManager";

export default async function WorkspacesPage() {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/login");
    }

    const workspaces = await prisma.workspace.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { documents: true } } }
    });

    return (
        <div className="dashboard-container p-8">
            <div className="max-w-6xl mx-auto">
                <nav className="flex items-center gap-4 mb-8 text-sm text-gray-400">
                    <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                    <span>/</span>
                    <span className="text-white">Workspaces</span>
                </nav>

                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Smart Workspaces 🚀</h1>
                        <p className="text-gray-400">Manage your isolated knowledge contexts.</p>
                    </div>
                </div>

                {/* We reuse WorkspaceManager but wrap it for the page context */}
                <div className="glass-panel p-8 rounded-2xl">
                    <WorkspaceManager workspaces={workspaces} activeWorkspaceId={undefined} />

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workspaces.map(ws => (
                            <Link key={ws.id} href={`/dashboard/documents?workspaceId=${ws.id}`}
                                className="block p-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 hover:border-purple-500/50 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-2xl group-hover:scale-110 transition-transform">
                                        📁
                                    </div>
                                    <span className="text-xs font-mono text-gray-500">{ws.id.slice(-6)}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{ws.title}</h3>
                                <div className="flex items-center justify-between text-sm text-gray-400">
                                    <span>{ws._count.documents} Documents</span>
                                    <span>{new Date(ws.createdAt).toLocaleDateString()}</span>
                                </div>
                            </Link>
                        ))}

                        {workspaces.length === 0 && (
                            <div className="col-span-full text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                                <p className="text-gray-400 mb-4">No workspaces found.</p>
                                <p className="text-sm text-gray-500">Create one above to get started.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
