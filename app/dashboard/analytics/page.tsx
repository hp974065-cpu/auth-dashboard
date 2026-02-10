import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AnalyticsPage() {
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
                    <h1>📊 Analytics</h1>
                    <p>View your performance metrics and insights.</p>
                </div>

                <div className="dashboard-grid">
                    <div className="stat-card">
                        <div className="stat-content">
                            <h3>Total Users</h3>
                            <p className="stat-number">2</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-content">
                            <h3>Active Sessions</h3>
                            <p className="stat-number">1</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-content">
                            <h3>Page Views</h3>
                            <p className="stat-number">128</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-content">
                            <h3>Avg. Time</h3>
                            <p className="stat-number">3m 42s</p>
                        </div>
                    </div>
                </div>

                <div className="chart-placeholder">
                    <div className="welcome-card">
                        <h2>Weekly Overview</h2>
                        <div className="chart-bars">
                            <div className="chart-bar-group">
                                <div className="chart-bar" style={{ height: '60%' }}></div>
                                <span>Mon</span>
                            </div>
                            <div className="chart-bar-group">
                                <div className="chart-bar" style={{ height: '80%' }}></div>
                                <span>Tue</span>
                            </div>
                            <div className="chart-bar-group">
                                <div className="chart-bar" style={{ height: '45%' }}></div>
                                <span>Wed</span>
                            </div>
                            <div className="chart-bar-group">
                                <div className="chart-bar" style={{ height: '90%' }}></div>
                                <span>Thu</span>
                            </div>
                            <div className="chart-bar-group">
                                <div className="chart-bar" style={{ height: '70%' }}></div>
                                <span>Fri</span>
                            </div>
                            <div className="chart-bar-group">
                                <div className="chart-bar" style={{ height: '30%' }}></div>
                                <span>Sat</span>
                            </div>
                            <div className="chart-bar-group">
                                <div className="chart-bar" style={{ height: '20%' }}></div>
                                <span>Sun</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
