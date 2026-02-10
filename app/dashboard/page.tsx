import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <div className="nav-brand">Dashboard</div>
                <div className="nav-user">
                    <span>{session.user.name}</span>
                    {session.user.role === "ADMIN" && (
                        <Link href="/admin" className="nav-link">
                            Admin Panel
                        </Link>
                    )}
                    <form
                        action={async () => {
                            "use server"
                            await signOut({ redirectTo: "/" })
                        }}
                    >
                        <button type="submit" className="btn-logout">
                            Sign Out
                        </button>
                    </form>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="welcome-card">
                    <h1>Welcome, {session.user.name}! 👋</h1>
                    <p>You have successfully logged into the dashboard.</p>
                    <div className="user-info">
                        <div className="info-item">
                            <span className="info-label">Email</span>
                            <span className="info-value">{session.user.email}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Role</span>
                            <span className="info-value role-badge">{session.user.role}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Status</span>
                            <span className="info-value status-approved">Approved ✓</span>
                        </div>
                    </div>
                </div>

                <div className="dashboard-grid">
                    <Link href="/dashboard/analytics" className="stat-card clickable">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <h3>Analytics</h3>
                            <p>View your performance metrics</p>
                        </div>
                    </Link>
                    <Link href="/dashboard/projects" className="stat-card clickable">
                        <div className="stat-icon">📁</div>
                        <div className="stat-content">
                            <h3>Projects</h3>
                            <p>Manage your projects</p>
                        </div>
                    </Link>
                    <Link href="/dashboard/settings" className="stat-card clickable">
                        <div className="stat-icon">⚙️</div>
                        <div className="stat-content">
                            <h3>Settings</h3>
                            <p>Configure your account</p>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    )
}
