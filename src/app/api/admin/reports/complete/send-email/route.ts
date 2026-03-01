import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { generateCompleteExcel, workbookToBuffer } from "@/lib/reports/excel"
import { generateCompletePDF } from "@/lib/reports/pdf-server"

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

    // Transform refunds to calculate productTotal and giftCardTotal from items JSON
    const transformedRefunds = refunds.map(refund => {
      const items = refund.items as Array<{type: string, price?: number, value?: number, quantity?: number}>
      const productTotal = items
        .filter(item => item.type === 'PRODUCT')
        .reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
      const giftCardTotal = items
        .filter(item => item.type === 'GIFT_CARD')
        .reduce((sum, item) => sum + (item.value || 0), 0)
      
      return {
        ...refund,
        productTotal,
        giftCardTotal,
      }
    })

    // Format month/year for email and PDF
    const monthNames = [
      "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ]
    const monthName = monthNames[month - 1]

    // Generate Excel using shared utility
    const wb = generateCompleteExcel({ orders, refunds: transformedRefunds, transactions, expiredCards })
    const excelBuffer = workbookToBuffer(wb)

    // Generate PDF using server-side function
    const monthYearLabel = `${monthName} ${year}`
    const pdfBytes = await generateCompletePDF({ orders, refunds: transformedRefunds, transactions, expiredCards }, monthYearLabel)

    // Calculate totals for email
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
    const totalRefunds = transformedRefunds.reduce((sum, r) => sum + r.totalRefunded, 0)
    const totalUsed = transactions.reduce((sum, t) => sum + t.amount, 0)
    const totalUnused = expiredCards.reduce((sum, g) => sum + g.remainingValue, 0)

    // Send email
    await sendEmail({
      to: email,
      subject: `Lo Scalo - Report Contabile Completo - ${monthName} ${year}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Report Contabile Completo</h2>
          <p>Periodo: <strong>${monthName} ${year}</strong></p>
          
          <p>In allegato trovi il report contabile completo in formato Excel e PDF che include:</p>
          <ul>
            <li><strong>Vendite e Rimborsi</strong> - Ordini completati e rimborsi del mese</li>
            <li><strong>Transazioni Gift Card</strong> - Utilizzo delle gift card</li>
            <li><strong>Gift Card Scadute</strong> - Card scadute con residuo non utilizzato</li>
          </ul>
                    
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
        {
          filename: `LoScalo_ReportCompleto_${year}-${String(month).padStart(2, '0')}.pdf`,
          content: Buffer.from(pdfBytes).toString("base64"),
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
