import { randomInt } from "crypto";

/**
 * Genera un codice Gift Card Cartacea (PG).
 * Stesso algoritmo di GC ma con prefisso PG.
 */
export function generatePrintedGiftCardCode(): string {
  // Esclusi: 0, O, I, 1, L per evitare errori di lettura umana
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "PG";

  for (let i = 0; i < 12; i++) {
    const randomIndex = randomInt(0, charset.length);
    result += charset[randomIndex];
  }

  return result;
}

/**
 * Genera un codice PG unico verificando nel database.
 */
export async function generateUniquePrintedCode(
  prisma: { printedGiftCard: { findUnique: (args: { where: { code: string } }) => Promise<{ id: string } | null> } },
  maxAttempts = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generatePrintedGiftCardCode();
    
    const existing = await prisma.printedGiftCard.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error(`Impossibile generare un codice PG unico dopo ${maxAttempts} tentativi`);
}
