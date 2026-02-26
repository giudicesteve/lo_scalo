import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST /api/admin/policies/revalidate
// Revalidates policy pages after update
export async function POST() {
  try {
    // Verify admin
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

    // Revalidate all policy pages
    revalidatePath("/terms")
    revalidatePath("/privacy") 
    revalidatePath("/cookies")
    
    // Also revalidate with language prefixes if you have i18n routing
    revalidatePath("/it/terms")
    revalidatePath("/en/terms")
    revalidatePath("/it/privacy")
    revalidatePath("/en/privacy")
    revalidatePath("/it/cookies")
    revalidatePath("/en/cookies")

    return NextResponse.json({ 
      success: true, 
      message: "Pages revalidated successfully",
      revalidated: ["/terms", "/privacy", "/cookies"]
    })
  } catch (error) {
    console.error("Error revalidating:", error)
    return NextResponse.json(
      { error: "Failed to revalidate pages" },
      { status: 500 }
    )
  }
}
