// Test database connection with Prisma
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    console.log('[TestDB] Testing Prisma connection...')
    console.log('[TestDB] DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    const count = await prisma.category.count()
    
    console.log('[TestDB] Success! Category count:', count)
    return Response.json({ 
      success: true, 
      categoryCount: count 
    })
  } catch (error) {
    console.error('[TestDB] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'no stack'
    return Response.json({ 
      success: false, 
      error: errorMessage,
      stack: errorStack
    }, { status: 500 })
  }
}
