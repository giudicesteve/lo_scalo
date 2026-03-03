import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * GET /api/admin/printed-gift-cards/guide-pdf
 * Genera PDF con specifiche tecniche per lo studio di stampa
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    });

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Crea PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    // Titolo
    page.drawText("LO SCALO - GIFT CARD CARTACEE", {
      x: 50,
      y,
      size: 24,
      font: fontBold,
      color: rgb(0.94, 0.35, 0.16), // brand-primary
    });
    y -= 30;

    page.drawText("Guida Tecnica per Studio di Stampa", {
      x: 50,
      y,
      size: 16,
      font: font,
      color: rgb(0.14, 0.12, 0.13), // brand-dark
    });
    y -= 50;

    // Sezione 1: Dati CSV
    page.drawText("1. DATI FORNITI (CSV)", {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.14, 0.12, 0.13),
    });
    y -= 25;

    const csvInfo = [
      "• Code: Codice PG (es: PGA39BWM7PH2K)",
      "• QR_Code: URL API esterna per generazione QR",
      "• Value: Valore espresso (es: €50.00)",
    ];

    for (const line of csvInfo) {
      page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.42, 0.4, 0.4) });
      y -= 18;
    }
    y -= 20;

    // Sezione 2: Specifiche QR
    page.drawText("2. SPECIFICHE TECNICHE QR CODE", {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.14, 0.12, 0.13),
    });
    y -= 25;

    const qrSpecs = [
      "Contenuto: Codice PG (14 caratteri alfanumerici)",
      "Tipo: QR Code standard ISO/IEC 18004",
      "Correzione errori: Level M (15%) minimo, consigliato H (30%)",
      "Modulo minimo: 0.5mm (consigliato 0.8mm per stampa offset)",
      "Dimensione minima finita: 15x15mm",
      "Quiet Zone: 4 moduli bianchi attorno al QR",
      "",
      "NOTA: Il codice PG usa charset: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
      "(esclusi 0, O, I, 1, L per evitare confusione)",
    ];

    for (const line of qrSpecs) {
      if (line === "") {
        y -= 10;
        continue;
      }
      page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.42, 0.4, 0.4) });
      y -= 18;
    }
    y -= 20;

    // Sezione 3: Formati
    page.drawText("3. FORMATI CONSIGLIATI", {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.14, 0.12, 0.13),
    });
    y -= 25;

    // Digitale
    page.drawText("Stampa Digitale / Piccoli tiraggi:", {
      x: 50,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.14, 0.12, 0.13),
    });
    y -= 20;

    const digital = [
      "• Dimensione card: 85x55mm (standard biglietto da visita)",
      "• Dimensione QR: 20x20mm",
      "• Carta: 350gr patinata opaca o plastificata",
      "• Finitura: Opaca per evitare riflessi alla scansione",
    ];

    for (const line of digital) {
      page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.42, 0.4, 0.4) });
      y -= 18;
    }
    y -= 20;

    // Offset
    page.drawText("Stampa Offset / Grandi tiraggi:", {
      x: 50,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.14, 0.12, 0.13),
    });
    y -= 20;

    const offset = [
      "• Dimensione card: 85x55mm o 90x50mm",
      "• Dimensione QR: 25x25mm (più sicuro per lettura)",
      "• Carta: 300-400gr",
      "• Finitura: Plastificazione opaca + vernice UV spot sul logo",
    ];

    for (const line of offset) {
      page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.42, 0.4, 0.4) });
      y -= 18;
    }
    y -= 30;

    // Nuova pagina per errori
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    y = page2.getSize().height - 50;

    // Sezione 4: Errori da evitare
    page2.drawText("4. ERRORI DA EVITARE", {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2),
    });
    y -= 25;

    const errors = [
      "X NON invertire i colori (QR bianco su sfondo scuro)",
      "X NON comprimere troppo il QR (< 15x15mm finito)",
      "X NON mettere grafica, testo o loghi sopra il QR",
      "X NON usare carta lucida senza opacizzazione",
      "X NON modificare il contenuto del QR (deve essere il codice PG esatto)",
    ];

    for (const line of errors) {
      page2.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.8, 0.2, 0.2) });
      y -= 20;
    }
    y -= 30;

    // Sezione 5: Best practices
    page2.drawText("5. BEST PRACTICES", {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.14, 0.12, 0.13),
    });
    y -= 25;

    const bestPractices = [
      "OK Testare la lettura del QR con 2-3 app diverse prima della stampa",
      "OK Lasciare margine bianco attorno al QR (quiet zone)",
      "OK Usare inchiostro nero puro (K100) per il QR",
      "OK Verificare la risoluzione: minimo 300 DPI per stampa",
      "OK Effettuare una stampa di prova e testare la scansione",
    ];

    for (const line of bestPractices) {
      page2.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.2, 0.6, 0.3) });
      y -= 20;
    }
    y -= 30;

    // Sezione 6: Contatti
    page2.drawText("6. CONTATTI E SUPPORTO", {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.14, 0.12, 0.13),
    });
    y -= 25;

    const contacts = [
      "Per domande tecniche o chiarimenti:",
      "Email: info@loscalo.it",
      "",
      "Lo Scalo - Craft Drinks by the Lake",
      "Frazione San Vito, 9 - 22010 Cremia (CO)",
    ];

    for (const line of contacts) {
      if (line === "") {
        y -= 10;
        continue;
      }
      page2.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.42, 0.4, 0.4) });
      y -= 18;
    }

    // Footer
    page2.drawText(`Documento generato il ${new Date().toLocaleDateString("it-IT")}`, {
      x: 50,
      y: 50,
      size: 9,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lo-scalo-guida-stampa-gift-card.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF guide:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
