import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function SettingsPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <Link href="/dashboard" className="nav-back">← Dashboard</Link>
                </div>
                <div className="nav-user">
                    <span>{session.user.name}</span>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="welcome-card">
                    <h1>⚙️ Settings</h1>
                    <p>Configure your account preferences.</p>
                </div>

                <div className="settings-list">
                    <div className="settings-section">
                        <h2>Profile</h2>
                        <div className="settings-item">
                            <div className="settings-label">
                                <strong>Name</strong>
                                <span>{session.user.name}</span>
                            </div>
                        </div>
                        <div className="settings-item">
                            <div className="settings-label">
                                <strong>Email</strong>
                                <span>{session.user.email}</span>
                            </div>
                        </div>
                        <div className="settings-item">
                            <div className="settings-label">
                                <strong>Role</strong>
                                <span className="role-badge">{session.user.role}</span>
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h2>Preferences</h2>
                        <div className="settings-item">
                            <div className="settings-label">
                                <strong>Dark Mode</strong>
                                <span>Enabled</span>
                            </div>
                        </div>
                        <div className="settings-item">
                            <div className="settings-label">
                                <strong>Notifications</strong>
                                <span>On</span>
                            </div>
                        </div>
                        <div className="settings-item">
                            <div className="settings-label">
                                <strong>Language</strong>
                                <span>English</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
