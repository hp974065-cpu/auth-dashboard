"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"

export default function PendingPage() {
    return (
        <div className="pending-container">
            <div className="pending-card">
                <div className="pending-icon">⏳</div>
                <h1>Awaiting Approval</h1>
                <p>
                    Your account has been created successfully! An administrator will
                    review and approve your account shortly.
                </p>
                <p className="pending-note">
                    You&apos;ll receive access once your account is approved.
                </p>
                <div className="pending-actions">
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="btn-secondary"
                    >
                        Sign Out
                    </button>
                    <Link href="/" className="btn-link">
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
