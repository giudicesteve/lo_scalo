import { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

// ISR: Revalidate every hour
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy Policy | Lo Scalo",
  description: "Privacy Policy del sito Lo Scalo",
};

// Server component - fetches initial data with caching
async function getPolicy(lang: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/policies?type=PRIVACY&lang=${lang}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error fetching privacy:", error);
    return null;
  }
}

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  // Await searchParams as it's now a Promise in Next.js 15+
  const params = await searchParams;
  // Default to Italian if no language specified
  const lang = params.lang === "en" ? "en" : "it";
  const initialPolicy = await getPolicy(lang);

  return <PrivacyClient initialPolicy={initialPolicy} initialLang={lang} />;
}
