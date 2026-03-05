import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// GET /api/admin/policies - List all policies (excluding archived by default)
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin with manage admins permission
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin || !admin.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const includeArchived = searchParams.get("archived") === "true"

    const policies = await prisma.policyDocument.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      orderBy: [
        { type: "asc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(policies)
  } catch (error) {
    console.error("Error fetching policies:", error)
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    )
  }
}

// POST /api/admin/policies - Create new policy
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin with manage admins permission
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin || !admin.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { type, version, contentIt, contentEn, effectiveDate } = body

    // Validation
    if (!type || !version || !contentIt || !contentEn || !effectiveDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const policy = await prisma.policyDocument.create({
      data: {
        type,
        version,
        contentIt,
        contentEn,
        effectiveDate: new Date(effectiveDate),
        createdBy: session.user.email,
        isActive: false, // New policies are inactive by default
      },
    })

    return NextResponse.json(policy)
  } catch (error) {
    console.error("Error creating policy:", error)
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    )
  }
}
