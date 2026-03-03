"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet,
  Printer,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react"
import { generateCompleteExcel, downloadWorkbook } from "@/lib/reports/excel"
import { generateCompletePDF, downloadPDF } from "@/lib/reports/pdf"
import type { Order, Refund, GiftCardTransaction, ExpiredGiftCard } from "@/lib/reports/types"

export default function CompleteReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    now.setMonth(now.getMonth() - 1)
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const [year, month] = selectedDate.split('-').map(Number)
  const isCurrentMonth = selectedDate === new Date().toISOString().slice(0, 7)

  const formatMonthYear = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    })
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const current = new Date(year, month - 1, 1)
    if (direction === 'prev') {
      current.setMonth(current.getMonth() - 1)
    } else {
      current.setMonth(current.getMonth() + 1)
    }
    setSelectedDate(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`)
  }

  const fetchAllData = async () => {
    // Fetch orders (con paginazione - prendi tutte le pagine)
    const allOrders: Order[] = []
    let page = 1
    let hasMore = true
    
    while (hasMore && page <= 10) { // Max 10 pagine (500 ordini) per sicurezza
      const ordersRes = await fetch(`/api/admin/orders?page=${page}&limit=50`)
      const ordersData = await ordersRes.json()
      
      if (!ordersData.orders || ordersData.orders.length === 0) {
        hasMore = false
      } else {
        allOrders.push(...ordersData.orders)
        hasMore = ordersData.pagination?.currentPage < ordersData.pagination?.totalPages
        page++
      }
    }
    
    const filteredOrders = allOrders.filter(order => {
      if (!order.paidAt) return false
      const orderDate = new Date(order.paidAt)
      const isOnMonth = orderDate.getFullYear() === year && orderDate.getMonth() === month - 1
      const isPaidOrder = ["COMPLETED", "DELIVERED"].includes(order.status)
      return isOnMonth && isPaidOrder
    }).sort((a, b) => new Date(a.paidAt!).getTime() - new Date(b.paidAt!).getTime())

    // Fetch refunds
    const refundsRes = await fetch(`/api/admin/refunds?year=${year}&month=${month}`)
    const refundsData = await refundsRes.json()
    const monthlyRefunds: Refund[] = (refundsData.refunds || []).sort(
      (a: Refund, b: Refund) => new Date(a.refundedAt).getTime() - new Date(b.refundedAt).getTime()
    )

    // Fetch gift card transactions
    const transactionsRes = await fetch(`/api/admin/gift-cards/transactions/monthly?year=${year}&month=${month}`)
    const transactionsData: GiftCardTransaction[] = await transactionsRes.json()

    // Fetch expired gift cards
    const expiredRes = await fetch(`/api/admin/gift-cards/expired/monthly?year=${year}&month=${month}`)
    const expiredData: ExpiredGiftCard[] = await expiredRes.json()

    return {
      orders: filteredOrders,
      refunds: monthlyRefunds,
      transactions: transactionsData,
      expiredCards: expiredData,
    }
  }

  const exportToExcel = async () => {
    setLoading(true)
    try {
      const data = await fetchAllData()
      const wb = generateCompleteExcel(data)
      downloadWorkbook(wb, `LoScalo_ReportCompleto_${selectedDate}.xlsx`)
    } catch (error) {
      console.error("Error exporting Excel:", error)
      alert("Errore durante l'export Excel")
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    setLoading(true)
    try {
      const data = await fetchAllData()
      const pdfBytes = await generateCompletePDF(data, formatMonthYear(selectedDate))
      downloadPDF(pdfBytes, `LoScalo_ReportCompleto_${selectedDate}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Errore durante la generazione del PDF")
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = async () => {
    if (!email || !email.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Inserisci un indirizzo email valido' })
      return
    }

    setLoading(true)
    setEmailStatus(null)

    try {
      const response = await fetch('/api/admin/reports/complete/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month,
          email,
        }),
      })

      if (response.ok) {
        setEmailStatus({ type: 'success', message: 'Report inviati con successo!' })
        setEmail("")
      } else {
        const error = await response.json()
        setEmailStatus({ type: 'error', message: error.message || 'Errore durante l\'invio' })
      }
    } catch (error) {
      setEmailStatus({ type: 'error', message: 'Errore di connessione' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin/reports" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Report Completo
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Month Navigation */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleMonthChange('prev')}
              className="p-2 rounded-xl hover:bg-brand-light-gray/50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-brand-dark" />
            </button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-primary" />
              <input
                type="month"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-title-md font-bold text-brand-dark bg-transparent border-none focus:outline-none cursor-pointer"
              />
              {isCurrentMonth && (
                <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary text-label-sm rounded-full">
                  Corrente
                </span>
              )}
            </div>

            <button
              onClick={() => handleMonthChange('next')}
              className="p-2 rounded-xl hover:bg-brand-light-gray/50 transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-brand-dark" />
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-body-md font-bold text-blue-800 mb-1">
                Report Contabile Completo
              </h3>
              <p className="text-body-sm text-blue-700">
                Questo report include tutti e 3 i report contabili in un unico file:
              </p>
              <ul className="text-label-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                <li>Vendite Prodotti/Gift Card e Rimborsi</li>
                <li>Transazioni Gift Card utilizzate</li>
                <li>Gift Card scadute con residuo</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="space-y-3 mb-6">
          <h2 className="text-title-md font-bold text-brand-dark">Scarica Report</h2>
          
          <button
            onClick={exportToExcel}
            disabled={loading}
            className="w-full bg-white rounded-2xl shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow group disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-headline-sm font-bold text-brand-dark group-hover:text-green-600 transition-colors">
                Scarica Excel
              </h3>
              <p className="text-body-sm text-brand-gray">
                3 fogli: Vendite, Transazioni GC, GC Scadute
              </p>
            </div>
            <Download className="w-5 h-5 text-brand-gray group-hover:text-green-500 transition-colors" />
          </button>

          <button
            onClick={handleGeneratePDF}
            disabled={loading}
            className="w-full bg-white rounded-2xl shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow group disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Printer className="w-6 h-6 text-brand-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-headline-sm font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                Scarica PDF
              </h3>
              <p className="text-body-sm text-brand-gray">
                Documento completo con tutti i report
              </p>
            </div>
            <Download className="w-5 h-5 text-brand-gray group-hover:text-brand-primary transition-colors" />
          </button>
        </div>

        {/* Email Section */}
        <div className="bg-white rounded-2xl shadow-card p-4">
          <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-primary" />
            Invia via Email
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-label-md text-brand-gray mb-1 block">
                Indirizzo Email
              </label>
              <input
                type="email"
                placeholder="esempio@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
              />
            </div>

            {emailStatus && (
              <div className={`flex items-center gap-2 p-3 rounded-xl ${
                emailStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {emailStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-body-sm">{emailStatus.message}</span>
              </div>
            )}

            <button
              onClick={sendEmail}
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white rounded-full text-body-md font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Invia Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
