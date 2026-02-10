import Link from "next/link"
import { auth } from "@/lib/auth"

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="home-container">
      <div className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Secure <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="hero-subtitle">
            A modern authentication system with role-based access control.
            Sign up, get approved by an admin, and access your personalized dashboard.
          </p>

          <div className="hero-buttons">
            {session ? (
              <Link href="/dashboard" className="btn-primary">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn-primary">
                  Get Started
                </Link>
                <Link href="/login" className="btn-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Secure Auth</h3>
            <p>Password hashing with bcrypt and JWT sessions</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Role-Based</h3>
            <p>Admin and User roles with different permissions</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✅</div>
            <h3>Approval Flow</h3>
            <p>Admins approve users before access is granted</p>
          </div>
        </div>
      </div>
    </div>
  )
}
