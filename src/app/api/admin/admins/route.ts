import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// GET - Lista admin (solo per chi può gestirli)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verifica che l'utente possa gestire admin
    const currentAdmin = await prisma.admin.findUnique({
      where: { email: session.user.email }
    })

    if (!currentAdmin?.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(admins)
  } catch (error) {
    console.error("Error fetching admins:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// POST - Aggiungi nuovo admin
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentAdmin = await prisma.admin.findUnique({
      where: { email: session.user.email }
    })

    if (!currentAdmin?.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { email, name, receiveNotifications, canManageAdmins } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    // Verifica se esiste già
    const existing = await prisma.admin.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 409 })
    }

    const admin = await prisma.admin.create({
      data: {
        email,
        name: name || null,
        receiveNotifications: receiveNotifications ?? true,
        canManageAdmins: canManageAdmins ?? false,
      }
    })

    return NextResponse.json(admin)
  } catch (error) {
    console.error("Error creating admin:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// DELETE - Rimuovi admin
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentAdmin = await prisma.admin.findUnique({
      where: { email: session.user.email }
    })

    if (!currentAdmin?.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    // Non permettere di eliminare se stesso
    if (id === currentAdmin.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
    }

    await prisma.admin.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting admin:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// PUT - Aggiorna permessi admin
export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentAdmin = await prisma.admin.findUnique({
      where: { email: session.user.email }
    })

    if (!currentAdmin?.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id, receiveNotifications, canManageAdmins } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    const admin = await prisma.admin.update({
      where: { id },
      data: {
        receiveNotifications,
        canManageAdmins,
      }
    })

    return NextResponse.json(admin)
  } catch (error) {
    console.error("Error updating admin:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
