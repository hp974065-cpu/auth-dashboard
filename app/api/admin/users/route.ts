import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isApproved: true,
            createdAt: true
        },
        orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ users })
}

export async function PATCH(request: NextRequest) {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    try {
        const { userId, action } = await request.json()

        if (!userId || !action) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        if (action === "approve") {
            await prisma.user.update({
                where: { id: userId },
                data: { isApproved: true }
            })
        } else if (action === "reject") {
            await prisma.user.delete({
                where: { id: userId }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Admin action error:", error)
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        )
    }
}
