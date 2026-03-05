import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { generateCompleteExcel, workbookToBuffer } from "@/lib/reports/excel"
import { generateCompletePDF } from "@/lib/reports/pdf-server"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

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

    // Converti ordini da cents a euro
    const ordersInEuro = orders.map(order => ({
      ...order,
      total: order.total / 100,
      items: order.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice / 100,
        totalPrice: item.totalPrice / 100,
      })),
      giftCards: order.giftCards.map(gc => ({
        ...gc,
        initialValue: gc.initialValue / 100,
      })),
    }))

    // Converti rimborsi da cents a euro
    const refundsInEuro = refunds.map(refund => {
      const items = refund.items as Array<{type: string, price?: number, value?: number, quantity?: number}>
      const productTotal = items
        .filter(item => item.type === 'PRODUCT')
        .reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
      const giftCardTotal = items
        .filter(item => item.type === 'GIFT_CARD')
        .reduce((sum, item) => sum + (item.price || 0), 0) // price = initialValue per GC
      
      return {
        ...refund,
        totalRefunded: refund.totalRefunded / 100,
        productTotal: productTotal / 100,
        giftCardTotal: giftCardTotal / 100,
      }
    })

    // Converti transazioni da cents a euro
    const transactionsInEuro = transactions.map(t => ({
      ...t,
      amount: t.amount / 100,
      giftCard: {
        ...t.giftCard,
        initialValue: t.giftCard.initialValue / 100,
        remainingValue: t.giftCard.remainingValue / 100,
      },
    }))

    // Converti gift card scadute da cents a euro
    const expiredCardsInEuro = expiredCards.map(gc => ({
      ...gc,
      initialValue: gc.initialValue / 100,
      remainingValue: gc.remainingValue / 100,
      transactions: gc.transactions.map(t => ({
        ...t,
        amount: t.amount / 100,
      })),
    }))

    // Format month/year for email and PDF
    const monthNames = [
      "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ]
    const monthName = monthNames[month - 1]

    // Generate Excel using shared utility (con dati in euro)
    const wb = generateCompleteExcel({ orders: ordersInEuro, refunds: refundsInEuro, transactions: transactionsInEuro, expiredCards: expiredCardsInEuro })
    const excelBuffer = workbookToBuffer(wb)

    // Generate PDF using server-side function (con dati in euro)
    const monthYearLabel = `${monthName} ${year}`
    const pdfBytes = await generateCompletePDF({ orders: ordersInEuro, refunds: refundsInEuro, transactions: transactionsInEuro, expiredCards: expiredCardsInEuro }, monthYearLabel)

    // Calculate totals for email (già in euro)
    const totalRevenue = ordersInEuro.reduce((sum, o) => sum + o.total, 0)
    const totalRefunds = refundsInEuro.reduce((sum, r) => sum + r.totalRefunded, 0)
    const totalUsed = transactionsInEuro.reduce((sum, t) => sum + t.amount, 0)
    const totalUnused = expiredCardsInEuro.reduce((sum, g) => sum + g.remainingValue, 0)

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
