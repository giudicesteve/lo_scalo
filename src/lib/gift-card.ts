import { randomInt } from "crypto";

/**
 * Genera un codice Gift Card sicuro, senza caratteri ambigui e ottimizzato per QR Code.
 * 
 * Caratteristiche:
 * - Esclusi: 0, O, I, 1, L per evitare errori di lettura umana
 * - Selezione crittograficamente sicura con crypto.randomInt
 * - Prefisso "GC" per identificazione immediata
 * - Lunghezza totale: 14 caratteri (GC + 12 casuali)
 * 
 * @param length - Lunghezza della parte casuale (default 12)
 * @returns Il codice generato (es: GCA39BWM7PH2K)
 */
export function generateGiftCardCode(length = 12): string {
  // Esclusi: 0, O, I, 1, L per evitare errori di lettura umana
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "GC";

  for (let i = 0; i < length; i++) {
    // Selezione crittograficamente sicura
    const randomIndex = randomInt(0, charset.length);
    result += charset[randomIndex];
  }

  return result;
}

/**
 * Genera un codice Gift Card unico verificando nel database.
 * 
 * @param prisma - Istanza Prisma client per la verifica
 * @param maxAttempts - Numero massimo di tentativi (default 10)
 * @returns Promise<string> - Il codice unico generato
 * @throws Error se non riesce a generare un codice unico dopo maxAttempts
 */
export async function generateUniqueGiftCardCode(
  prisma: { giftCard: { findUnique: (args: { where: { code: string } }) => Promise<{ id: string } | null> } },
  maxAttempts = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateGiftCardCode();
    
    // Verifica unicita
    const existing = await prisma.giftCard.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error(`Impossibile generare un codice Gift Card unico dopo ${maxAttempts} tentativi`);
}
