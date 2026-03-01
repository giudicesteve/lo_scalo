/**
 * Utility per la conversione tra euro (float) e cents (integer)
 * 
 * DATABASE: salva sempre in cents (intero) per evitare problemi di precisione float
 * FRONTEND: mostra sempre in euro (es: 12.50)
 * 
 * Esempi:
 * - euroToCents(12.50) => 1250
 * - centsToEuro(1250) => 12.50
 * - centsToEuroDisplay(1250) => "12,50 €"
 */

/**
 * Converte euro (float) in cents (integer)
 * es: 12.50 => 1250
 * es: 12.555 => 1256 (arrotonda al centesimo più vicino)
 */
export function euroToCents(euro: number): number {
  return Math.round(euro * 100)
}

/**
 * Converte cents (integer) in euro (float)
 * es: 1250 => 12.50
 */
export function centsToEuro(cents: number): number {
  return cents / 100
}

/**
 * Formatta cents per la visualizzazione in euro
 * es: 1250 => "12,50 €" (IT)
 * es: 1250 => "€12.50" (EN)
 */
export function centsToEuroDisplay(cents: number, locale: string = 'it-IT'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(centsToEuro(cents))
}

/**
 * Formatta numero euro per la visualizzazione
 * es: 12.5 => "12,50 €"
 */
export function euroToDisplay(euro: number, locale: string = 'it-IT'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(euro)
}

/**
 * Converte un oggetto con campi monetari da euro a cents
 * Da usare prima di inviare dati al database
 * 
 * Esempio:
 * const data = { name: 'Prodotto', price: 12.50, total: 25.00 }
 * convertObjectToCents(data, ['price', 'total'])
 * // => { name: 'Prodotto', price: 1250, total: 2500 }
 */
export function convertObjectToCents<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (typeof result[field] === 'number') {
      (result as any)[field] = euroToCents(result[field] as number)
    }
  }
  return result
}

/**
 * Converte un oggetto con campi monetari da cents a euro
 * Da usare quando si ricevono dati dal database
 * 
 * Esempio:
 * const data = { name: 'Prodotto', price: 1250, total: 2500 }
 * convertObjectToEuro(data, ['price', 'total'])
 * // => { name: 'Prodotto', price: 12.50, total: 25.00 }
 */
export function convertObjectToEuro<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (typeof result[field] === 'number') {
      (result as any)[field] = centsToEuro(result[field] as number)
    }
  }
  return result
}

/**
 * Lista dei campi monetari per modello
 * Usata per conversioni automatiche
 */
export const MONETARY_FIELDS = {
  Cocktail: ['price'],
  GiftCardTemplate: ['value', 'price'],
  GiftCard: ['initialValue', 'remainingValue'],
  GiftCardTransaction: ['amount'],
  Order: ['total'],
  OrderItem: ['unitPrice', 'totalPrice'],
  Product: ['price'],
  Refund: ['totalRefunded'],
} as const

/**
 * Tipo per i nomi dei modelli con campi monetari
 */
export type MonetaryModel = keyof typeof MONETARY_FIELDS
