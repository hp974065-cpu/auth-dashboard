import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav glass-panel">
                <div className="nav-brand neon-text">AI Command Center</div>
                <div className="nav-user">
                    <span>{session.user.name}</span>
                    <form
                        action={async () => {
                            "use server"
                            await signOut({ redirectTo: "/" })
                        }}
                    >
                        <button type="submit" className="btn-logout hover:bg-red-500/20">
                            Sign Out
                        </button>
                    </form>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="welcome-card glass-panel glow-hover">
                    <h1 className="text-3xl font-bold mb-4">
                        Welcome back, <span className="neon-text">{session.user.name}</span>
                    </h1>
                    <p className="text-lg text-gray-400">
                        Your AI workspace is ready. Select a module to begin.
                    </p>
                </div>

                <div className="ai-card-grid">
                    {/* Workspaces Module */}
                    <Link href="/dashboard/workspaces" className="ai-card glass-panel glow-hover group">
                        <div className="ai-badge">Core Engine</div>
                        <div className="ai-card-icon group-hover:scale-110 transition-transform">🚀</div>
                        <div>
                            <h2>Smart Workspaces</h2>
                            <p>Manage your projects and context boundaries separately.</p>
                        </div>
                    </Link>

                    {/* Knowledge Base Module */}
                    <Link href="/dashboard/documents" className="ai-card glass-panel glow-hover group">
                        <div className="ai-badge">RAG System</div>
                        <div className="ai-card-icon group-hover:scale-110 transition-transform">🧠</div>
                        <div>
                            <h2>Knowledge Base</h2>
                            <p>Upload documents and query your private data with AI.</p>
                        </div>
                    </Link>

                    {/* Deep Search Module */}
                    <Link href="/dashboard/deep-search" className="ai-card glass-panel glow-hover group">
                        <div className="ai-badge">Live Web</div>
                        <div className="mb-5 relative w-24 h-24 group-hover:scale-110 transition-transform duration-300">
                            <Image
                                src="/assets/deep-search.png"
                                alt="Deep Search"
                                fill
                                className="object-contain drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                            />
                        </div>
                        <div>
                            <h2>Deep Search</h2>
                            <p>Perform live web searches with Firecrawl integration.</p>
                        </div>
                    </Link>
                </div>

                <div className="mt-12 opacity-50 text-center">
                    <p className="text-sm text-gray-500">System Status: <span className="text-green-500">Online</span> • v1.2.0 • Powered by Gemini 2.0</p>
                </div>
            </main >
        </div >
    )
}
