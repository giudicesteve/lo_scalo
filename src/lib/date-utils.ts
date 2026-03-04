/**
 * Utility per gestire date nel timezone italiano (Europe/Rome)
 * Tutte le date nel DB sono UTC, ma i report/filtri devono lavorare in orario italiano
 */

/**
 * Crea una data UTC che corrisponde alla data/ora italiana specificata
 * Esempio: 1 marzo 2026 00:00 (ITA) → restituisce la data UTC equivalente
 */
export function fromItalyToUTC(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  // Crea una stringa ISO rappresentante la data in Italia
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateString = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.000`
  
  // Parsa come se fosse in timezone Italia, poi ottieni timestamp UTC
  const italyDate = new Date(dateString)
  
  // Calcola offset tra UTC e Italia per quella specifica data
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const offset = getItalyOffsetMinutes(utcDate)
  
  // Sottrai l'offset per ottenere l'ora UTC corrispondente
  return new Date(italyDate.getTime() - offset * 60 * 1000)
}

/**
 * Ottiene l'offset in minuti tra UTC e Italia (Europe/Rome) per una data specifica
 * Considera CET (UTC+1) o CEST (UTC+2) in base al periodo dell'anno
 */
function getItalyOffsetMinutes(date: Date): number {
  // Formatta la data in timezone Italia
  const italyString = date.toLocaleString("sv-SE", { timeZone: "Europe/Rome" }) // sv-SE = formato ISO-like
  const italyDate = new Date(italyString)
  
  // La differenza in millisecondi divisa per 60*1000 dà l'offset in minuti
  // Se Italia è avanti (es. UTC+1), italyDate > date, quindi offset positivo
  return (italyDate.getTime() - date.getTime()) / (60 * 1000)
}

/**
 * Ottiene il range di date UTC per un mese/anno in timezone Italia
 */
export function getItalyMonthRange(year: number, month: number): { start: Date; end: Date } {
  // Inizio mese: 1° giorno alle 00:00:00 italiane
  const start = fromItalyToUTC(year, month, 1, 0, 0, 0)
  
  // Fine mese: ultimo giorno alle 23:59:59.999 italiane
  const lastDay = new Date(year, month, 0).getDate() // 0 del mese successivo = ultimo giorno del mese corrente
  const end = fromItalyToUTC(year, month, lastDay, 23, 59, 59)
  end.setMilliseconds(999)
  
  return { start, end }
}

/**
 * Ottiene il range di date UTC per un giorno specifico in timezone Italia
 */
export function getItalyDayRange(year: number, month: number, day: number): { start: Date; end: Date } {
  const start = fromItalyToUTC(year, month, day, 0, 0, 0)
  const end = fromItalyToUTC(year, month, day, 23, 59, 59)
  end.setMilliseconds(999)
  
  return { start, end }
}

/**
 * Formatta una data per visualizzazione italiana
 */
export function formatItalyDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }
  return d.toLocaleDateString("it-IT", { ...defaultOptions, timeZone: "Europe/Rome" })
}

/**
 * Formatta data e ora per visualizzazione italiana
 */
export function formatItalyDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  })
}
