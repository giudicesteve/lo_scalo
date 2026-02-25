import { GiftCardExpiryType, GiftCardExpiryTime } from "@prisma/client"

/**
 * Calculates the expiry date for a gift card based on admin settings
 * 
 * @param expiryType - Type of expiry calculation (EXACT_DATE or END_OF_MONTH)
 * @param expiryTime - Duration until expiry (SIX_MONTHS, ONE_YEAR, or TWO_YEARS)
 * @param purchaseDate - Date of purchase (defaults to now)
 * @returns Date - The calculated expiry date (end of day in Italian timezone)
 */
export function calculateGiftCardExpiry(
  expiryType: GiftCardExpiryType,
  expiryTime: GiftCardExpiryTime,
  purchaseDate: Date = new Date()
): Date {
  // Create a copy of the purchase date
  const result = new Date(purchaseDate)
  
  // Add the appropriate time period
  switch (expiryTime) {
    case GiftCardExpiryTime.SIX_MONTHS:
      result.setMonth(result.getMonth() + 6)
      break
    case GiftCardExpiryTime.ONE_YEAR:
      result.setFullYear(result.getFullYear() + 1)
      break
    case GiftCardExpiryTime.TWO_YEARS:
      result.setFullYear(result.getFullYear() + 2)
      break
    default:
      result.setFullYear(result.getFullYear() + 1)
  }
  
  // If END_OF_MONTH, adjust to the last day of the month
  if (expiryType === GiftCardExpiryType.END_OF_MONTH) {
    // Set to the first day of next month, then subtract one day
    result.setDate(1)
    result.setMonth(result.getMonth() + 1)
    result.setDate(0) // This sets it to the last day of the previous month
  }
  
  // Set to end of day (23:59:59.999)
  result.setHours(23, 59, 59, 999)
  
  return result
}

/**
 * Gets a human-readable description of the expiry policy
 */
export function getExpiryPolicyDescription(
  expiryType: GiftCardExpiryType,
  expiryTime: GiftCardExpiryTime,
  lang: "it" | "en" = "it"
): string {
  const timeTranslations = {
    it: {
      [GiftCardExpiryTime.SIX_MONTHS]: "6 mesi",
      [GiftCardExpiryTime.ONE_YEAR]: "1 anno",
      [GiftCardExpiryTime.TWO_YEARS]: "2 anni",
    },
    en: {
      [GiftCardExpiryTime.SIX_MONTHS]: "6 months",
      [GiftCardExpiryTime.ONE_YEAR]: "1 year",
      [GiftCardExpiryTime.TWO_YEARS]: "2 years",
    },
  }
  
  const timeText = timeTranslations[lang][expiryTime] || timeTranslations.it[expiryTime]
  
  if (expiryType === GiftCardExpiryType.EXACT_DATE) {
    return lang === "it"
      ? `Valida per ${timeText} dalla data di acquisto.`
      : `Valid for ${timeText} from purchase date.`
  } else {
    return lang === "it"
      ? `Valida per ${timeText} dalla data di acquisto, scade alla fine del mese.`
      : `Valid for ${timeText} from purchase date, expires at end of month.`
  }
}

/**
 * Formats an expiry date for display in Italian timezone
 */
export function formatExpiryDate(date: Date, lang: "it" | "en" = "it"): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Rome",
  }
  
  return date.toLocaleDateString(lang === "it" ? "it-IT" : "en-US", options)
}

/**
 * Checks if a gift card is expired based on the expiry date
 */
export function isGiftCardExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  
  const now = new Date()
  const italianNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Rome" })
  )
  
  const italianExpiry = new Date(
    expiresAt.toLocaleString("en-US", { timeZone: "Europe/Rome" })
  )
  
  return italianNow > italianExpiry
}
