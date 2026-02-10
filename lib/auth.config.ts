import type { NextAuthConfig } from "next-auth"

// Edge-compatible auth config (no Prisma imports)
export const authConfig: NextAuthConfig = {
    pages: {
        signIn: "/login"
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isPublicRoute = ["/", "/login", "/signup"].includes(nextUrl.pathname)
            const isAdminRoute = nextUrl.pathname.startsWith("/admin")
            const isApiRoute = nextUrl.pathname.startsWith("/api")

            // Allow API routes and public routes
            if (isApiRoute || isPublicRoute) {
                return true
            }

            // Redirect to login if not authenticated
            if (!isLoggedIn) {
                return false
            }

            // Check if user is approved
            if (!auth?.user?.isApproved) {
                if (nextUrl.pathname !== "/pending") {
                    return Response.redirect(new URL("/pending", nextUrl))
                }
                return true
            }

            // Check admin routes
            if (isAdminRoute && auth?.user?.role !== "ADMIN") {
                return Response.redirect(new URL("/dashboard", nextUrl))
            }

            return true
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.isApproved = user.isApproved
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub as string
                session.user.role = token.role as string
                session.user.isApproved = token.isApproved as boolean
            }
            return session
        }
    },
    session: {
        strategy: "jwt"
    },
    providers: [] // Providers are added in auth.ts (not edge-compatible)
}
