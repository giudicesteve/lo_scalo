import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering - uses request.url
export const dynamic = 'force-dynamic'

// GET /api/policies?type=TERMS|PRIVACY|COOKIES&lang=it|en
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") as "TERMS" | "PRIVACY" | "COOKIES" | null
    const lang = searchParams.get("lang") as "it" | "en" | null

    const policies = await prisma.policyDocument.findMany({
      where: {
        isActive: true,
        isArchived: false,
        ...(type && { type }),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        version: true,
        contentIt: true,
        contentEn: true,
        effectiveDate: true,
      },
    })

    // Return content based on requested language
    const localizedPolicies = policies.map(policy => ({
      id: policy.id,
      type: policy.type,
      version: policy.version,
      content: lang === "en" ? policy.contentEn : policy.contentIt,
      effectiveDate: policy.effectiveDate,
    }))

    return NextResponse.json(localizedPolicies)
  } catch (error) {
    console.error("Error fetching policies:", error)
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    )
  }
}
