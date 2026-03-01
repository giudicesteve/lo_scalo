import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const { year, month, email } = await request.json()

    if (!year || !month || !email) {
      return NextResponse.json(
        { error: "Anno, mese e email sono obbligatori" },
        { status: 400 }
      )
    }

    // Fetch all data
    const [orders, refunds, transactions, expiredCards] = await Promise.all([
      // Orders
      prisma.order.findMany({
        where: {
          paidAt: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
          status: { in: ["COMPLETED", "DELIVERED"] },
        },
        include: {
          items: { include: { Product: true } },
          giftCards: true,
        },
        orderBy: { paidAt: "asc" },
      }),

      // Refunds
      prisma.refund.findMany({
        where: {
          refundedAt: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              email: true,
              orderSource: true,
            },
          },
        },
        orderBy: { refundedAt: "asc" },
      }),

      // Gift Card Transactions
      prisma.giftCardTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
        include: {
          giftCard: {
            include: {
              order: {
                select: {
                  email: true,
                  orderNumber: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),

      // Expired Gift Cards
      prisma.giftCard.findMany({
        where: {
          isExpired: true,
          expiresAt: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
        include: {
          order: {
            select: {
              email: true,
              orderNumber: true,
              phone: true,
            },
          },
          transactions: true,
        },
        orderBy: { expiresAt: "asc" },
      }),
    ])

    // Generate Excel - Exact copy from individual report pages
    const wb = XLSX.utils.book_new()

    // ========== SHEET 1: VENDITE E RIMBORSI (from /admin/reports/monthly) ==========
    const sheet1Rows: Record<string, string | number>[] = []
    
    // Orders
    orders.forEach(order => {
      const productTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
      const giftCardTotal = order.giftCards.reduce((sum, gc) => sum + gc.initialValue, 0)
      
      sheet1Rows.push({
        "Data": order.paidAt?.toLocaleDateString("it-IT") + " " + order.paidAt?.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        "Tipo": "Ordine",
        "Codice Univoco": order.orderNumber,
        "Rif. Ordine": "-",
        "Fonte": order.orderSource === "MANUAL" ? "Fisico" : "Online",
        "Metodo Rimborso": "-",
        "Stripe ID / Rif. Documento": order.stripePaymentIntentId || "-",
        "Dettaglio Prodotti": productTotal > 0 ? +productTotal : "-",
        "Dettaglio Gift Card": giftCardTotal > 0 ? +giftCardTotal : "-",
        "Totale": +order.total,
      })
    })
    
    // Refunds
    refunds.forEach(refund => {
      sheet1Rows.push({
        "Data": refund.refundedAt.toLocaleDateString("it-IT") + " " + refund.refundedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        "Tipo": "Rimborso",
        "Codice Univoco": refund.refundNumber,
        "Rif. Ordine": refund.order.orderNumber,
        "Fonte": "-",
        "Metodo Rimborso": refund.refundMethod,
        "Stripe ID / Rif. Documento": refund.externalRef || "-",
        "Dettaglio Prodotti": refund.productTotal > 0 ? -refund.productTotal : "-",
        "Dettaglio Gift Card": refund.giftCardTotal > 0 ? -refund.giftCardTotal : "-",
        "Totale": -refund.totalRefunded,
      })
    })
    
    // Riepilogo
    const productRevenue = orders.reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0)
    const giftCardRevenue = orders.reduce((sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0), 0)
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
    const totalRefunds = refunds.reduce((sum, r) => sum + r.totalRefunded, 0)
    const productRefunds = refunds.reduce((sum, r) => sum + r.productTotal, 0)
    const giftCardRefunds = refunds.reduce((sum, r) => sum + r.giftCardTotal, 0)
    
    sheet1Rows.push({})
    sheet1Rows.push({"Data": "=== ORDINI ==="})
    
    sheet1Rows.push({
      "Data": "Prodotti:",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Stripe ID / Rif. Documento": "",
      "Dettaglio Prodotti": +productRevenue,
      "Dettaglio Gift Card": "",
      "Totale": "",
    })
    
    sheet1Rows.push({
      "Data": "Gift Card:",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Stripe ID / Rif. Documento": "",
      "Dettaglio Prodotti": "",
      "Dettaglio Gift Card": +giftCardRevenue,
      "Totale": "",
    })
    
    sheet1Rows.push({
      "Data": "TOTALE ORDINI",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Stripe ID / Rif. Documento": "",
      "Dettaglio Prodotti": "",
      "Dettaglio Gift Card": "",
      "Totale": +totalRevenue,
    })
    
    if (totalRefunds > 0) {
      sheet1Rows.push({})
      sheet1Rows.push({"Data": "=== RIMBORSI ==="})
      
      sheet1Rows.push({
        "Data": "Prodotti:",
        "Tipo": "",
        "Codice Univoco": "",
        "Rif. Ordine": "",
        "Fonte": "",
        "Metodo Rimborso": "",
        "Stripe ID / Rif. Documento": "",
        "Dettaglio Prodotti": -productRefunds,
        "Dettaglio Gift Card": "",
        "Totale": "",
      })
      
      sheet1Rows.push({
        "Data": "Gift Card:",
        "Tipo": "",
        "Codice Univoco": "",
        "Rif. Ordine": "",
        "Fonte": "",
        "Metodo Rimborso": "",
        "Stripe ID / Rif. Documento": "",
        "Dettaglio Prodotti": "",
        "Dettaglio Gift Card": -giftCardRefunds,
        "Totale": "",
      })
      
      sheet1Rows.push({
        "Data": "TOTALE RIMBORSI",
        "Tipo": "",
        "Codice Univoco": "",
        "Rif. Ordine": "",
        "Fonte": "",
        "Metodo Rimborso": "",
        "Stripe ID / Rif. Documento": "",
        "Dettaglio Prodotti": "",
        "Dettaglio Gift Card": "",
        "Totale": -totalRefunds,
      })
    }
    
    sheet1Rows.push({})
    sheet1Rows.push({
      "Data": "NETTO MESE",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Stripe ID / Rif. Documento": "",
      "Dettaglio Prodotti": "",
      "Dettaglio Gift Card": "",
      "Totale": totalRevenue - totalRefunds,
    })

    const ws1 = XLSX.utils.json_to_sheet(sheet1Rows)
    XLSX.utils.book_append_sheet(wb, ws1, "Vendite e Rimborsi")

    // ========== SHEET 2: TRANSAZIONI GIFT CARD (from /admin/reports/gift-cards) ==========
    const sheet2Rows: Record<string, string | number>[] = []
    
    transactions.forEach((t) => {
      sheet2Rows.push({
        "Data": t.createdAt.toLocaleDateString("it-IT"),
        "Ora": t.createdAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        "Codice Gift Card": t.giftCard.code,
        "Importo Utilizzato": -t.amount,
        "Numero Scontrino": t.receiptNumber || "-",
        "Nota": t.note || "-",
        "Data Acquisto": t.giftCard.purchasedAt.toLocaleDateString("it-IT"),
        "Foto Scontrino": t.receiptImage ? "Presente" : "-",
      })
    })
    
    const totalUsed = transactions.reduce((sum, t) => sum + t.amount, 0)
    const uniqueCards = new Set(transactions.map(t => t.giftCard.id)).size
    
    sheet2Rows.push({})
    sheet2Rows.push({"Data": "=== RIEPILOGO ==="})
    sheet2Rows.push({
      "Data": "Totale Utilizzato:",
      "Importo Utilizzato": -totalUsed,
    })
    sheet2Rows.push({
      "Data": "Gift Card Usate:",
      "Codice Gift Card": uniqueCards,
    })

    const ws2 = XLSX.utils.json_to_sheet(sheet2Rows)
    XLSX.utils.book_append_sheet(wb, ws2, "Transazioni GC")

    // ========== SHEET 3: GIFT CARD SCADUTE (from /admin/reports/expired-gift-cards) ==========
    const sheet3Rows: Record<string, string | number>[] = []
    
    expiredCards.forEach((g) => {
      const expiryDate = g.expiresAt
      const usedAmount = g.initialValue - g.remainingValue
      
      sheet3Rows.push({
        "Codice Gift Card": g.code,
        "Valore Iniziale": g.initialValue,
        "Importo Utilizzato": usedAmount,
        "Residuo Non Utilizzato": g.remainingValue,
        "Data Acquisto": g.purchasedAt.toLocaleDateString("it-IT"),
        "Data Scadenza": expiryDate ? expiryDate.toLocaleDateString("it-IT") : "-",
        "Numero Transazioni": g.transactions.length,
      })
    })
    
    const totalInitial = expiredCards.reduce((sum, g) => sum + g.initialValue, 0)
    const totalUnused = expiredCards.reduce((sum, g) => sum + g.remainingValue, 0)
    const totalExpiredUsed = expiredCards.reduce((sum, g) => sum + (g.initialValue - g.remainingValue), 0)
    
    sheet3Rows.push({})
    sheet3Rows.push({"Codice Gift Card": "=== RIEPILOGO ==="})
    sheet3Rows.push({
      "Codice Gift Card": "Valore Iniziale:",
      "Valore Iniziale": totalInitial,
    })
    sheet3Rows.push({
      "Codice Gift Card": "Importo Utilizzato:",
      "Importo Utilizzato": totalExpiredUsed,
    })
    sheet3Rows.push({
      "Codice Gift Card": "Residuo Non Utilizzato:",
      "Residuo Non Utilizzato": +totalUnused,
    })
    sheet3Rows.push({
      "Codice Gift Card": "Card Scadute:",
      "Numero Transazioni": expiredCards.length,
    })

    const ws3 = XLSX.utils.json_to_sheet(sheet3Rows)
    XLSX.utils.book_append_sheet(wb, ws3, "GC Scadute")

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    // Format month/year for email
    const monthNames = [
      "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ]
    const monthName = monthNames[month - 1]

    // Send email
    await sendEmail({
      to: email,
      subject: `Lo Scalo - Report Contabile Completo - ${monthName} ${year}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Report Contabile Completo</h2>
          <p>Periodo: <strong>${monthName} ${year}</strong></p>
          
          <p>In allegato trovi il report contabile completo che include:</p>
          <ul>
            <li><strong>Vendite e Rimborsi</strong> - Ordini completati e rimborsi del mese</li>
            <li><strong>Transazioni Gift Card</strong> - Utilizzo delle gift card</li>
            <li><strong>Gift Card Scadute</strong> - Card scadute con residuo non utilizzato</li>
          </ul>
          
          <h3>Riepilogo:</h3>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Totale Ordini</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">€${totalRevenue.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Totale Rimborsi</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #c00;">-€${totalRefunds.toFixed(2)}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Netto Mese</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>€${(totalRevenue - totalRefunds).toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Transazioni GC</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">€${totalUsed.toFixed(2)}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>GC Scadute (Residuo)</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #0a0;">€${totalUnused.toFixed(2)}</td>
            </tr>
          </table>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Questo è un messaggio automatico dal sistema Lo Scalo.<br>
            I dati sono stati generati il ${new Date().toLocaleDateString("it-IT")}.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `LoScalo_ReportCompleto_${year}-${String(month).padStart(2, '0')}.xlsx`,
          content: Buffer.from(excelBuffer).toString("base64"),
        },
      ],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending complete report email:", error)
    return NextResponse.json(
      { error: "Errore durante l'invio dell'email" },
      { status: 500 }
    )
  }
}
