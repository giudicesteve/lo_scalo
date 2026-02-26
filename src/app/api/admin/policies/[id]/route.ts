import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// GET /api/admin/policies/[id] - Get single policy
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const policy = await prisma.policyDocument.findUnique({
      where: { id: params.id },
    })

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 })
    }

    return NextResponse.json(policy)
  } catch (error) {
    console.error("Error fetching policy:", error)
    return NextResponse.json(
      { error: "Failed to fetch policy" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/policies/[id] - Update policy (activate/deactivate or edit)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { isActive, contentIt, contentEn, effectiveDate, isArchived } = body

    const policy = await prisma.policyDocument.findUnique({
      where: { id: params.id },
    })

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 })
    }

    // If activating, first deactivate all other policies of the same type
    if (isActive === true) {
      await prisma.policyDocument.updateMany({
        where: {
          type: policy.type,
          isActive: true,
          id: { not: params.id },
        },
        data: { isActive: false },
      })
    }

    const updatedPolicy = await prisma.policyDocument.update({
      where: { id: params.id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(contentIt !== undefined && { contentIt }),
        ...(contentEn !== undefined && { contentEn }),
        ...(effectiveDate !== undefined && { effectiveDate: new Date(effectiveDate) }),
        ...(isArchived !== undefined && { isArchived }),
      },
    })

    return NextResponse.json(updatedPolicy)
  } catch (error) {
    console.error("Error updating policy:", error)
    return NextResponse.json(
      { error: "Failed to update policy" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/policies/[id] - Archive policy (soft delete)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const policy = await prisma.policyDocument.findUnique({
      where: { id: params.id },
    })

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 })
    }

    // Don't allow archiving active policies
    if (policy.isActive) {
      return NextResponse.json(
        { error: "Cannot archive an active policy. Deactivate it first." },
        { status: 400 }
      )
    }

    // Soft delete - archive instead of delete
    const archivedPolicy = await prisma.policyDocument.update({
      where: { id: params.id },
      data: { isArchived: true },
    })

    return NextResponse.json({ success: true, policy: archivedPolicy })
  } catch (error) {
    console.error("Error archiving policy:", error)
    return NextResponse.json(
      { error: "Failed to archive policy" },
      { status: 500 }
    )
  }
}
