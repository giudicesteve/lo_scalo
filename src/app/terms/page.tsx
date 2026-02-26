import { Metadata } from "next"
import TermsClient from "./TermsClient"

// ISR: Revalidate every hour
export const revalidate = 3600

export const metadata: Metadata = {
  title: "Termini e Condizioni | Lo Scalo",
  description: "Termini e Condizioni di utilizzo del sito Lo Scalo",
}

// Server component - fetches initial data with caching
async function getPolicy(lang: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const res = await fetch(
      `${baseUrl}/api/policies?type=TERMS&lang=${lang}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )
    
    if (!res.ok) return null
    
    const data = await res.json()
    return data.length > 0 ? data[0] : null
  } catch (error) {
    console.error("Error fetching terms:", error)
    return null
  }
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams: { lang?: string }
}) {
  // Default to Italian if no language specified
  const lang = searchParams.lang === "en" ? "en" : "it"
  const initialPolicy = await getPolicy(lang)

  return <TermsClient initialPolicy={initialPolicy} initialLang={lang} />
}
