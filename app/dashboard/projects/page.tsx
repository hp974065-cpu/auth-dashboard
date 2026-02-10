import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function ProjectsPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const projects = [
        { name: "Website Redesign", status: "In Progress", progress: 65 },
        { name: "Mobile App", status: "Planning", progress: 20 },
        { name: "API Integration", status: "Completed", progress: 100 },
        { name: "Dashboard v2", status: "In Progress", progress: 45 },
    ]

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
                    <h1>📁 Projects</h1>
                    <p>Manage and track your projects.</p>
                </div>

                <div className="projects-list">
                    {projects.map((project, index) => (
                        <div key={index} className="project-card">
                            <div className="project-header">
                                <h3>{project.name}</h3>
                                <span className={`project-status status-${project.status.toLowerCase().replace(' ', '-')}`}>
                                    {project.status}
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${project.progress}%` }}
                                ></div>
                            </div>
                            <span className="progress-text">{project.progress}% complete</span>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
