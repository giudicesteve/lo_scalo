import { Metadata } from "next"
import CookiesClient from "./CookiesClient"

// ISR: Revalidate every hour
export const revalidate = 3600

export const metadata: Metadata = {
  title: "Cookie Policy | Lo Scalo",
  description: "Cookie Policy del sito Lo Scalo",
}

// Server component - fetches initial data with caching
async function getPolicy(lang: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const res = await fetch(
      `${baseUrl}/api/policies?type=COOKIES&lang=${lang}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )
    
    if (!res.ok) return null
    
    const data = await res.json()
    return data.length > 0 ? data[0] : null
  } catch (error) {
    console.error("Error fetching cookies policy:", error)
    return null
  }
}

export default async function CookiesPage({
  searchParams,
}: {
  searchParams: { lang?: string }
}) {
  // Default to Italian if no language specified
  const lang = searchParams.lang === "en" ? "en" : "it"
  const initialPolicy = await getPolicy(lang)

  return <CookiesClient initialPolicy={initialPolicy} initialLang={lang} />
}
