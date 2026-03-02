"use client"

import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { CompleteReportData } from "./types"

export async function generateCompletePDF(
  data: CompleteReportData,
  monthYearLabel: string
): Promise<Uint8Array> {
  const { orders, refunds, transactions, expiredCards } = data
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Helper function to add a report section
  const addReportSection = async (
    title: string,
    subtitle: string,
    drawContent: (page: any, y: number) => Promise<number>
  ) => {
    let page = pdfDoc.addPage([842, 595])
    const { height } = page.getSize()
    let y = height - 50
    const margin = 40

    // Section header
    page.drawText(title, {
      x: margin,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    })

    y -= 22
    page.drawText(subtitle, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })

    y -= 30

    const finalY = await drawContent(page, y)
    return finalY
  }

  // Section 1: Vendite e Rimborsi
  await addReportSection(
    "Lo Scalo - Report Mensile Vendite/Rimborsi Contabili",
    `Periodo: ${monthYearLabel}`,
    async (page, startY) => {
      let y = startY
      const margin = 40
      const rowHeight = 12
      const colWidths = [60, 60, 95, 85, 50, 65, 220, 95, 60]
      const colPositions = colWidths.reduce((acc, w, i) => {
        acc.push((acc[i - 1] || margin - 5) + w)
        return acc
      }, [] as number[])

      // All rows sorted by date
      const allRows = [
        ...orders.map((o) => ({
          type: "order" as const,
          data: o,
          date: new Date(o.paidAt!),
        })),
        ...refunds.map((r) => ({
          type: "refund" as const,
          data: r,
          date: new Date(r.refundedAt),
        })),
      ].sort((a, b) => a.date.getTime() - b.date.getTime())

      // Header
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: 842 - margin * 2,
        height: 18,
        color: rgb(0.95, 0.95, 0.9),
      })

      const headers = [
        "Data",
        "Tipo",
        "Codice",
        "Rif. Ord.",
        "Fonte",
        "Metodo Rimborso",
        "Stripe ID",
        "Dettaglio",
        "Totale",
      ]
      headers.forEach((h, i) => {
        page.drawText(h, {
          x: i === 0 ? margin : colPositions[i - 1],
          y,
          size: 7,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        })
      })
      y -= rowHeight + 8

      // Data rows (max 20 per page)
      let rowCount = 0
      for (const row of allRows) {
        if (rowCount >= 20) {
          page = pdfDoc.addPage([842, 595])
          y = page.getSize().height - 50
          rowCount = 0
        }

        if (row.type === "order") {
          const order = row.data
          const productTotal = order.items.reduce(
            (sum, item) => sum + item.totalPrice,
            0
          )
          const giftCardTotal = order.giftCards.reduce(
            (sum, gc) => sum + gc.initialValue,
            0
          )
          const dateStr = row.date.toLocaleDateString("it-IT")

          // Data
          page.drawText(dateStr, {
            x: margin,
            y,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          })

          // Tipo
          page.drawText("Ordine", {
            x: colPositions[0],
            y,
            size: 8,
            font,
            color: rgb(0.2, 0.6, 0.2),
          })

          // Codice Univoco
          page.drawText(`#${order.orderNumber}`, {
            x: colPositions[1],
            y,
            size: 8,
            font: fontBold,
            color: rgb(0, 0, 0),
          })

          // Rif. Ordine
          page.drawText("-", {
            x: colPositions[2],
            y,
            size: 8,
            font,
            color: rgb(0.5, 0.5, 0.5),
          })

          // Fonte
          page.drawText(order.orderSource === "MANUAL" ? "Fisico" : "Online", {
            x: colPositions[3],
            y,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          })

          // Metodo Rimborso
          page.drawText("-", {
            x: colPositions[4],
            y,
            size: 8,
            font,
            color: rgb(0.5, 0.5, 0.5),
          })

          // Stripe ID
          const stripeId = order.stripePaymentIntentId || "-"
          page.drawText(stripeId, {
            x: colPositions[5],
            y,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
          })

          const marginExtra = 140
          const pageWidth = page.getWidth()
          const rightAlignX = pageWidth - marginExtra
          const textWidth = font.widthOfTextAtSize(
            `Prod: +${productTotal.toFixed(2)}€`,
            7
          )

          // Dettaglio
          let dettaglioY = y
          if (productTotal > 0) {
            page.drawText(`Prod: +${productTotal.toFixed(2)}€`, {
              x: rightAlignX - textWidth,
              y: dettaglioY,
              size: 7,
              font,
              color: rgb(0.2, 0.4, 0.8),
            })
            dettaglioY -= 10
          }

          const textWidth2 = font.widthOfTextAtSize(
            `GC: +${giftCardTotal.toFixed(2)}€`,
            7
          )

          if (giftCardTotal > 0) {
            page.drawText(`GC: +${giftCardTotal.toFixed(2)}€`, {
              x: rightAlignX - textWidth2,
              y: dettaglioY,
              size: 7,
              font,
              color: rgb(0.6, 0.2, 0.6),
            })
          }

          const marginExtra2 = 60
          const rightAlignX2 = pageWidth - marginExtra2
          const textWidth3 = font.widthOfTextAtSize(`+${order.total.toFixed(2)}€`, 7)

          // Totale
          page.drawText(`+${order.total.toFixed(2)}€`, {
            x: rightAlignX2 - textWidth3,
            y,
            size: 9,
            font: fontBold,
            color: rgb(0.2, 0.6, 0.2),
          })
        } else {
          const refund = row.data
          const dateStr = row.date.toLocaleDateString("it-IT")

          // Data
          page.drawText(dateStr, {
            x: margin,
            y,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          })

          // Tipo
          page.drawText("Rimborso", {
            x: colPositions[0],
            y,
            size: 8,
            font,
            color: rgb(0.8, 0.2, 0.2),
          })

          // Codice Univoco
          page.drawText(refund.refundNumber, {
            x: colPositions[1],
            y,
            size: 8,
            font: fontBold,
            color: rgb(0.8, 0.2, 0.2),
          })

          // Rif. Ordine
          page.drawText(`#${refund.order.orderNumber}`, {
            x: colPositions[2],
            y,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
          })

          // Fonte
          page.drawText("-", {
            x: colPositions[3],
            y,
            size: 8,
            font,
            color: rgb(0.5, 0.5, 0.5),
          })

          // Metodo Rimborso
          page.drawText(refund.refundMethod, {
            x: colPositions[4],
            y,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          })

          // Stripe ID / Rif
          const extRef = refund.externalRef || "-"
          page.drawText(
            extRef,
            {
              x: colPositions[5],
              y,
              size: 8,
              font,
              color: rgb(0.4, 0.4, 0.4),
            }
          )

          const marginExtra = 140
          const pageWidth = page.getWidth()
          const rightAlignX = pageWidth - marginExtra
          const textWidth = font.widthOfTextAtSize(
            `Prod: -${(refund.productTotal || 0).toFixed(2)}€`,
            7
          )

          // Dettaglio
          let dettaglioY = y
          if ((refund.productTotal || 0) > 0) {
            page.drawText(`Prod: -${(refund.productTotal || 0).toFixed(2)}€`, {
              x: rightAlignX - textWidth,
              y: dettaglioY,
              size: 7,
              font,
              color: rgb(0.2, 0.4, 0.8),
            })
            dettaglioY -= 10
          }

          const textWidth2 = font.widthOfTextAtSize(
            `GC: -${(refund.giftCardTotal || 0).toFixed(2)}€`,
            7
          )

          if ((refund.giftCardTotal || 0) > 0) {
            page.drawText(`GC: -${(refund.giftCardTotal || 0).toFixed(2)}€`, {
              x: rightAlignX - textWidth2,
              y: dettaglioY,
              size: 7,
              font,
              color: rgb(0.6, 0.2, 0.6),
            })
          }

          const marginExtra2 = 60
          const rightAlignX2 = pageWidth - marginExtra2
          const textWidth3 = font.widthOfTextAtSize(
            `-${refund.totalRefunded.toFixed(2)}€`,
            7
          )

          // Totale
          page.drawText(`-${refund.totalRefunded.toFixed(2)}€`, {
            x: rightAlignX2 - textWidth3,
            y,
            size: 9,
            font: fontBold,
            color: rgb(0.8, 0.2, 0.2),
          })
        }

        page.drawLine({
          start: { x: 40, y: y + 10 },
          end: { x: 802, y: y + 10 },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75),
          opacity: 0.8,
        })

        y -= rowHeight + 10
        rowCount++
      }

      // Totals - Exact copy from /admin/reports/monthly
      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
      const totalRefunds = refunds.reduce((sum, r) => sum + r.totalRefunded, 0)
      const productRevenue = orders.reduce(
        (sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0),
        0
      )
      const giftCardRevenue = orders.reduce(
        (sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0),
        0
      )
      const productRefunds = refunds.reduce((sum, r) => sum + (r.productTotal || 0), 0)
      const giftCardRefunds = refunds.reduce((sum, r) => sum + (r.giftCardTotal || 0), 0)

      y -= 10
      page.drawLine({
        start: { x: margin, y },
        end: { x: 842 - margin, y },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      })

      y -= 20
      page.drawText("RIEPILOGO", {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0),
      })

      // ORDINI section
      y -= 18
      page.drawText("ORDINI", {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.6, 0.2),
      })

      y -= 16
      page.drawText(`Prodotti:`, {
        x: margin + 20,
        y,
        size: 9,
        font,
        color: rgb(0.2, 0.4, 0.8),
      })
      page.drawText(`+${productRevenue.toFixed(2)}€`, {
        x: margin + 200,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.4, 0.8),
      })

      y -= 14
      page.drawText(`Gift Card:`, {
        x: margin + 20,
        y,
        size: 9,
        font,
        color: rgb(0.6, 0.2, 0.6),
      })
      page.drawText(`+${giftCardRevenue.toFixed(2)}€`, {
        x: margin + 200,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.6, 0.2, 0.6),
      })

      y -= 16
      page.drawLine({
        start: { x: margin + 15, y },
        end: { x: margin + 250, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      })

      y -= 16
      page.drawText(`TOTALE ORDINI:`, {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.6, 0.2),
      })
      page.drawText(`+${totalRevenue.toFixed(2)}€`, {
        x: margin + 200,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.6, 0.2),
      })

      // RIMBORSI section
      if (totalRefunds > 0) {
        y -= 22
        page.drawText("RIMBORSI", {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.8, 0.2, 0.2),
        })

        y -= 16
        page.drawText(`Prodotti:`, {
          x: margin + 20,
          y,
          size: 9,
          font,
          color: rgb(0.2, 0.4, 0.8),
        })
        page.drawText(`-${productRefunds.toFixed(2)}€`, {
          x: margin + 200,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.8),
        })

        y -= 14
        page.drawText(`Gift Card:`, {
          x: margin + 20,
          y,
          size: 9,
          font,
          color: rgb(0.6, 0.2, 0.6),
        })
        page.drawText(`-${giftCardRefunds.toFixed(2)}€`, {
          x: margin + 200,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.6, 0.2, 0.6),
        })

        y -= 16
        page.drawLine({
          start: { x: margin + 15, y },
          end: { x: margin + 250, y },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        })

        y -= 16
        page.drawText(`TOTALE RIMBORSI:`, {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.8, 0.2, 0.2),
        })
        page.drawText(`-${totalRefunds.toFixed(2)}€`, {
          x: margin + 200,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.8, 0.2, 0.2),
        })
      }

      return y
    }
  )

  // Section 2: Transazioni Gift Card
  if (transactions.length > 0) {
    await addReportSection(
      "Lo Scalo - Report Transazioni Gift Card",
      `${transactions.length} transazioni`,
      async (page, startY) => {
        let y = startY
        const margin = 40
        const rowHeight = 12
        const colWidths = [60, 100, 180, 180, 140, 80]
        const colPositions = colWidths.reduce((acc, w, i) => {
          acc.push((acc[i - 1] || margin - 5) + w)
          return acc
        }, [] as number[])

        // Header
        page.drawRectangle({
          x: margin,
          y: y - 5,
          width: 842 - margin * 2,
          height: 18,
          color: rgb(0.95, 0.95, 0.9),
        })

        const headers = ["Data", "Gift Card", "Dettaglio", "", "", "Importo"]
        headers.forEach((h, i) => {
          page.drawText(h, {
            x: (i === 0 ? margin : colPositions[i - 1]) + 3,
            y,
            size: 8,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          })
        })
        y -= rowHeight + 8

        // Data rows (max 15 per page)
        let rowCount = 0
        for (const t of transactions) {
          if (rowCount >= 15) {
            page = pdfDoc.addPage([842, 595])
            y = page.getSize().height - 50
            rowCount = 0
          }

          const date = new Date(t.createdAt)

          page.drawText(date.toLocaleDateString("it-IT"), {
            x: margin,
            y,
            size: 8,
            font,
          })
          page.drawText(t.giftCard.code, {
            x: colPositions[0],
            y,
            size: 8,
            font: fontBold,
          })

          const details = []
          if (t.receiptNumber) details.push(`Scontrino: ${t.receiptNumber}`)
          if (t.note) details.push(t.note)
          if (t.receiptImage) details.push("[Foto]")
          const detailText = details.join(" | ")
          page.drawText(
            detailText,
            {
              x: colPositions[1],
              y,
              size: 7,
              font,
              color: rgb(0.2, 0.4, 0.8),
            }
          )

          const marginExtra = 115
          const pageWidth = page.getWidth()
          const rightAlignX = pageWidth - marginExtra
          const textWidth = fontBold.widthOfTextAtSize(`-${t.amount.toFixed(2)}€`, 9)
          page.drawText(`-${t.amount.toFixed(2)}€`, {
            x: rightAlignX - textWidth,
            y,
            size: 9,
            font: fontBold,
            color: rgb(0.8, 0.2, 0.2),
          })

          page.drawLine({
            start: { x: 40, y: y + 10 },
            end: { x: 802, y: y + 10 },
            thickness: 0.5,
            color: rgb(0.75, 0.75, 0.75),
            opacity: 0.8,
          })

          y -= rowHeight + 10
          rowCount++
        }

        // Totals - Exact copy from /admin/reports/gift-cards
        const totalUsed = transactions.reduce((sum, t) => sum + t.amount, 0)
        const uniqueCards = new Set(transactions.map((t) => t.giftCard.id)).size

        y -= 10
        page.drawLine({
          start: { x: margin, y },
          end: { x: page.getSize().width - margin, y },
          thickness: 1,
          color: rgb(0.7, 0.7, 0.7),
        })

        y -= 20
        page.drawText("RIEPILOGO", {
          x: margin,
          y,
          size: 11,
          font: fontBold,
          color: rgb(0, 0, 0),
        })

        y -= 18
        page.drawText(`Totale Utilizzato:`, {
          x: margin,
          y,
          size: 10,
          font,
          color: rgb(0.8, 0.2, 0.2),
        })
        page.drawText(`-${totalUsed.toFixed(2)}€`, {
          x: margin + 170,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.8, 0.2, 0.2),
        })

        y -= 16
        page.drawText(`Gift Card Usate:`, {
          x: margin,
          y,
          size: 10,
          font,
          color: rgb(0.6, 0.2, 0.6),
        })
        page.drawText(`${uniqueCards}`, {
          x: margin + 199,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.6, 0.2, 0.6),
        })

        return y
      }
    )
  }

  // Section 3: Gift Card Scadute
  if (expiredCards.length > 0) {
    await addReportSection(
      "Lo Scalo - Report Gift Card Scadute",
      `${expiredCards.length} card scadute`,
      async (page, startY) => {
        let y = startY
        const margin = 40
        const rowHeight = 12
        const colWidths = [30, 140, 80, 80, 90, 80]
        const colPositions = colWidths.reduce((acc, w, i) => {
          acc.push((acc[i - 1] || margin - 5) + w)
          return acc
        }, [] as number[])

        // Header
        page.drawRectangle({
          x: margin,
          y: y - 5,
          width: 842 - margin * 2,
          height: 18,
          color: rgb(0.95, 0.95, 0.9),
        })

        const headers = ["#", "Codice", "Valore Iniz.", "Utilizzato", "Residuo", "Data Scad."]
        headers.forEach((h, i) => {
          page.drawText(h, {
            x: (i === 0 ? margin : colPositions[i - 1]) + 3,
            y,
            size: 8,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          })
        })
        y -= rowHeight + 8

        // Data rows
        let rowCount = 0
        for (let i = 0; i < expiredCards.length; i++) {
          const g = expiredCards[i]
          if (rowCount >= 10) {
            page = pdfDoc.addPage([842, 595])
            y = page.getSize().height - 50
            rowCount = 0
          }

          const expiryDate = g.expiresAt ? new Date(g.expiresAt) : null
          const usedAmount = g.initialValue - g.remainingValue

          page.drawText(`${i + 1}`, { x: margin, y, size: 8, font })
          page.drawText(g.code, {
            x: colPositions[0],
            y,
            size: 8,
            font: fontBold,
          })
          page.drawText(`${g.initialValue.toFixed(2)}€`, {
            x: colPositions[1],
            y,
            size: 8,
            font,
          })
          page.drawText(`${usedAmount.toFixed(2)}€`, {
            x: colPositions[2],
            y,
            size: 8,
            font,
            color: rgb(0.2, 0.4, 0.8),
          })
          page.drawText(`${g.remainingValue.toFixed(2)}€`, {
            x: colPositions[3] + 10,
            y,
            size: 9,
            font: fontBold,
            color: rgb(0.2, 0.6, 0.2),
          })
          page.drawText(
            expiryDate ? expiryDate.toLocaleDateString("it-IT") : "-",
            {
              x: colPositions[4],
              y,
              size: 8,
              font,
              color: rgb(0.5, 0.5, 0.5),
            }
          )

          page.drawLine({
            start: { x: 40, y: y + 10 },
            end: { x: 802, y: y + 10 },
            thickness: 0.5,
            color: rgb(0.75, 0.75, 0.75),
            opacity: 0.8,
          })

          y -= rowHeight + 10
          rowCount++
        }

        // Totals - Exact copy from /admin/reports/expired-gift-cards
        const totalInitial = expiredCards.reduce((sum, g) => sum + g.initialValue, 0)
        const totalUnused = expiredCards.reduce((sum, g) => sum + g.remainingValue, 0)
        const totalExpiredUsed = expiredCards.reduce(
          (sum, g) => sum + (g.initialValue - g.remainingValue),
          0
        )

        y -= 10
        page.drawLine({
          start: { x: margin, y },
          end: { x: page.getSize().width - margin, y },
          thickness: 1,
          color: rgb(0.7, 0.7, 0.7),
        })

        y -= 20
        page.drawText("RIEPILOGO", {
          x: margin,
          y,
          size: 11,
          font: fontBold,
          color: rgb(0, 0, 0),
        })

        y -= 18
        page.drawText(`Valore Iniziale:`, {
          x: margin + 20,
          y,
          size: 10,
          font,
          color: rgb(0.6, 0.2, 0.6),
        })
        page.drawText(`${totalInitial.toFixed(2)}€`, {
          x: margin + 200,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.6, 0.2, 0.6),
        })

        y -= 16
        page.drawText(`Importo Utilizzato:`, {
          x: margin + 20,
          y,
          size: 10,
          font,
          color: rgb(0.2, 0.4, 0.8),
        })
        page.drawText(`${totalExpiredUsed.toFixed(2)}€`, {
          x: margin + 200,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.8),
        })

        y -= 16
        page.drawText(`Residuo Non Utilizzato:`, {
          x: margin + 20,
          y,
          size: 10,
          font,
          color: rgb(0.2, 0.6, 0.2),
        })
        page.drawText(`${totalUnused.toFixed(2)}€`, {
          x: margin + 200,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.2, 0.6, 0.2),
        })

        y -= 16
        page.drawText(`Card Scadute:`, {
          x: margin + 20,
          y,
          size: 10,
          font,
          color: rgb(0.8, 0.2, 0.2),
        })
        page.drawText(`${expiredCards.length}`, {
          x: margin + 200,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.8, 0.2, 0.2),
        })

        return y
      }
    )
  }

  return await pdfDoc.save()
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
