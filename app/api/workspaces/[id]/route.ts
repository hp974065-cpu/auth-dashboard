
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Params are promises in Next.js 15+ (detected 16.1.6)
) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const workspace = await prisma.workspace.findUnique({
            where: {
                id,
            },
            include: {
                documents: true,
                messages: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            },
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        if (workspace.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized access to workspace" }, { status: 403 });
        }

        return NextResponse.json(workspace);
    } catch (error) {
        console.error("Error fetching workspace:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const workspace = await prisma.workspace.findUnique({
            where: { id },
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        if (workspace.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await prisma.workspace.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Workspace deleted" });
    } catch (error) {
        console.error("Error deleting workspace:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
