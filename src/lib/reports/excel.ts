import * as XLSX from "xlsx"
import type { CompleteReportData, Order, Refund, GiftCardTransaction, ExpiredGiftCard } from "./types"

// ========== SHEET 1: VENDITE E RIMBORSI ==========
function generateSheet1(data: { orders: Order[]; refunds: Refund[] }) {
  const { orders, refunds } = data
  const rows: Record<string, string | number>[] = []

  // Orders
  orders.forEach((order) => {
    const productTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const giftCardTotal = order.giftCards.reduce((sum, gc) => sum + gc.initialValue, 0)
    const orderDate = new Date(order.paidAt!)

    rows.push({
      "Data":
        orderDate.toLocaleDateString("it-IT") +
        " " +
        orderDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
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
  refunds.forEach((refund) => {
    const refundDate = new Date(refund.refundedAt)
    rows.push({
      "Data":
        refundDate.toLocaleDateString("it-IT") +
        " " +
        refundDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      "Tipo": "Rimborso",
      "Codice Univoco": refund.refundNumber,
      "Rif. Ordine": refund.order.orderNumber,
      "Fonte": "-",
      "Metodo Rimborso": refund.refundMethod,
      "Stripe ID / Rif. Documento": refund.externalRef || "-",
      "Dettaglio Prodotti": (refund.productTotal || 0) > 0 ? -(refund.productTotal || 0) : "-",
      "Dettaglio Gift Card": (refund.giftCardTotal || 0) > 0 ? -(refund.giftCardTotal || 0) : "-",
      "Totale": -refund.totalRefunded,
    })
  })

  // Riepilogo
  const productRevenue = orders.reduce(
    (sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0),
    0
  )
  const giftCardRevenue = orders.reduce(
    (sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0),
    0
  )
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const totalRefunds = refunds.reduce((sum, r) => sum + r.totalRefunded, 0)
  const productRefunds = refunds.reduce((sum, r) => sum + (r.productTotal || 0), 0)
  const giftCardRefunds = refunds.reduce((sum, r) => sum + (r.giftCardTotal || 0), 0)

  rows.push({})
  rows.push({ "Data": "=== ORDINI ===" })

  rows.push({
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

  rows.push({
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

  rows.push({
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
    rows.push({})
    rows.push({ "Data": "=== RIMBORSI ===" })

    rows.push({
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

    rows.push({
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

    rows.push({
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

  rows.push({})
  rows.push({
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

  const ws = XLSX.utils.json_to_sheet(rows)

  const colWidths = [
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 17 },
    { wch: 10 },
    { wch: 15 },
    { wch: 34 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
  ]
  ws["!cols"] = colWidths

  return ws
}

// ========== SHEET 2: TRANSAZIONI GIFT CARD ==========
function generateSheet2(transactions: GiftCardTransaction[]) {
  const rows: Record<string, string | number>[] = []

  transactions.forEach((t) => {
    rows.push({
      "Data": new Date(t.createdAt).toLocaleDateString("it-IT"),
      "Ora": new Date(t.createdAt).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      "Codice Gift Card": t.giftCard.code,
      "Importo Utilizzato": -t.amount,
      "Numero Scontrino": t.receiptNumber || "-",
      "Nota": t.note || "-",
      "Data Acquisto": new Date(t.giftCard.purchasedAt).toLocaleDateString("it-IT"),
      "Foto Scontrino": t.receiptImage ? "Presente" : "-",
    })
  })

  const totalUsed = transactions.reduce((sum, t) => sum + t.amount, 0)
  const uniqueCards = new Set(transactions.map((t) => t.giftCard.id)).size

  rows.push({})
  rows.push({ "Data": "=== RIEPILOGO ===" })
  rows.push({
    "Data": "Totale Utilizzato:",
    "Importo Utilizzato": -totalUsed,
  })
  rows.push({
    "Data": "Gift Card Usate:",
    "Codice Gift Card": uniqueCards,
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  const colWidths = [
    { wch: 12 },
    { wch: 8 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
  ]
  ws["!cols"] = colWidths

  return ws
}

// ========== SHEET 3: GIFT CARD SCADUTE ==========
function generateSheet3(expiredCards: ExpiredGiftCard[]) {
  const rows: Record<string, string | number>[] = []

  expiredCards.forEach((g) => {
    const expiryDate = g.expiresAt ? new Date(g.expiresAt) : null
    const purchaseDate = new Date(g.purchasedAt)
    const usedAmount = g.initialValue - g.remainingValue

    rows.push({
      "Codice Gift Card": g.code,
      "Valore Iniziale": g.initialValue,
      "Importo Utilizzato": usedAmount,
      "Residuo Non Utilizzato": g.remainingValue,
      "Data Acquisto": purchaseDate.toLocaleDateString("it-IT"),
      "Data Scadenza": expiryDate ? expiryDate.toLocaleDateString("it-IT") : "-",
      "Numero Transazioni": g.transactions.length,
    })
  })

  const totalInitial = expiredCards.reduce((sum, g) => sum + g.initialValue, 0)
  const totalUnused = expiredCards.reduce((sum, g) => sum + g.remainingValue, 0)
  const totalExpiredUsed = expiredCards.reduce(
    (sum, g) => sum + (g.initialValue - g.remainingValue),
    0
  )

  rows.push({})
  rows.push({ "Codice Gift Card": "=== RIEPILOGO ===" })
  rows.push({
    "Codice Gift Card": "Valore Iniziale:",
    "Valore Iniziale": totalInitial,
  })
  rows.push({
    "Codice Gift Card": "Importo Utilizzato:",
    "Importo Utilizzato": totalExpiredUsed,
  })
  rows.push({
    "Codice Gift Card": "Residuo Non Utilizzato:",
    "Residuo Non Utilizzato": +totalUnused,
  })
  rows.push({
    "Codice Gift Card": "Card Scadute:",
    "Numero Transazioni": expiredCards.length,
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  const colWidths = [
    { wch: 20 },
    { wch: 15 },
    { wch: 18 },
    { wch: 22 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
  ]
  ws["!cols"] = colWidths

  return ws
}

// Helper to format numbers as currency in Excel
function formatCurrencyCells(ws: XLSX.WorkSheet, columns: number[]) {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1")
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    columns.forEach((colIdx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: colIdx })
      const cell = ws[cellAddress]

      if (cell && typeof cell.v === "number") {
        cell.t = "n" // 'n' = number
        cell.z = "#,##0.00 €" // Euro currency format
      }
    })
  }
}

// ========== MAIN EXPORT FUNCTION ==========
export function generateCompleteExcel(data: CompleteReportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Vendite e Rimborsi
  const ws1 = generateSheet1({ orders: data.orders, refunds: data.refunds })
  formatCurrencyCells(ws1, [7, 8, 9]) // Dettaglio Prodotti, Dettaglio Gift Card, Totale
  XLSX.utils.book_append_sheet(wb, ws1, "Vendite e Rimborsi")

  // Sheet 2: Transazioni Gift Card
  const ws2 = generateSheet2(data.transactions)
  formatCurrencyCells(ws2, [3]) // Importo Utilizzato
  XLSX.utils.book_append_sheet(wb, ws2, "Transazioni GC")

  // Sheet 3: Gift Card Scadute
  const ws3 = generateSheet3(data.expiredCards)
  formatCurrencyCells(ws3, [1, 2, 3]) // Valore Iniziale, Importo Utilizzato, Residuo
  XLSX.utils.book_append_sheet(wb, ws3, "GC Scadute")

  return wb
}

// Helper to convert workbook to buffer (for server-side)
export function workbookToBuffer(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}

// Helper to download workbook (for client-side)
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename)
}
