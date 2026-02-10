"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface User {
    id: string
    name: string
    email: string
    role: string
    isApproved: boolean
    createdAt: string
}

export default function AdminPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        if (status === "loading") return
        if (!session || session.user.role !== "ADMIN") {
            router.push("/dashboard")
            return
        }
        fetchUsers()
    }, [session, status, router])

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users")
            const data = await res.json()
            setUsers(data.users || [])
        } catch (error) {
            console.error("Failed to fetch users:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (userId: string, action: "approve" | "reject") => {
        setActionLoading(userId)
        try {
            await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action })
            })
            await fetchUsers()
        } catch (error) {
            console.error("Action failed:", error)
        } finally {
            setActionLoading(null)
        }
    }

    const pendingUsers = users.filter(u => !u.isApproved && u.role !== "ADMIN")
    const approvedUsers = users.filter(u => u.isApproved)

    if (status === "loading" || loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <nav className="dashboard-nav">
                <div className="nav-brand">Admin Panel</div>
                <div className="nav-user">
                    <Link href="/dashboard" className="nav-link">
                        ← Dashboard
                    </Link>
                </div>
            </nav>

            <main className="admin-main">
                <section className="admin-section">
                    <h2>Pending Approvals ({pendingUsers.length})</h2>
                    {pendingUsers.length === 0 ? (
                        <div className="empty-state">
                            <p>No pending users 🎉</p>
                        </div>
                    ) : (
                        <div className="users-grid">
                            {pendingUsers.map((user) => (
                                <div key={user.id} className="user-card pending">
                                    <div className="user-avatar">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="user-details">
                                        <h3>{user.name}</h3>
                                        <p>{user.email}</p>
                                        <span className="user-date">
                                            Joined {new Date(user.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="user-actions">
                                        <button
                                            onClick={() => handleAction(user.id, "approve")}
                                            className="btn-approve"
                                            disabled={actionLoading === user.id}
                                        >
                                            {actionLoading === user.id ? "..." : "Approve"}
                                        </button>
                                        <button
                                            onClick={() => handleAction(user.id, "reject")}
                                            className="btn-reject"
                                            disabled={actionLoading === user.id}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="admin-section">
                    <h2>Approved Users ({approvedUsers.length})</h2>
                    {approvedUsers.length === 0 ? (
                        <div className="empty-state">
                            <p>No approved users yet</p>
                        </div>
                    ) : (
                        <div className="users-grid">
                            {approvedUsers.map((user) => (
                                <div key={user.id} className="user-card approved">
                                    <div className="user-avatar">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="user-details">
                                        <h3>{user.name}</h3>
                                        <p>{user.email}</p>
                                        <span className={`role-tag ${user.role.toLowerCase()}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}
