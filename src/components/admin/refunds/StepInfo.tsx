"use client"

import { AlertTriangle, Info, CreditCard, Store, Calendar } from "lucide-react"

interface StepInfoProps {
  order: {
    id: string
    orderNumber: string
    orderSource: string
    paidAt: string | null
    createdAt: string
    total: number
    email: string
  }
  existingRefunds: Array<{
    id: string
    refundNumber: string
    totalRefunded: number
    refundedAt: string
  }>
  canRefund: boolean
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateShort(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Simple Card Component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 border-b border-gray-100 ${className}`}>{children}</div>
}

function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-medium ${className}`}>{children}</h3>
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

// Simple Alert Components
function Alert({ 
  children, 
  variant = "default" 
}: { 
  children: React.ReactNode
  variant?: "default" | "warning" | "destructive" 
}) {
  const styles = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    destructive: "bg-red-50 border-red-200 text-red-800",
  }
  
  return (
    <div className={`p-4 rounded-lg border ${styles[variant]}`}>
      {children}
    </div>
  )
}

function AlertTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="font-semibold mb-1 flex items-center gap-2">{children}</h4>
}

function AlertDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm ${className}`}>{children}</div>
}

export function StepInfo({ order, existingRefunds, canRefund }: StepInfoProps) {
  const orderDate = new Date(order.paidAt || order.createdAt)
  const daysSinceOrder = Math.floor(
    (new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="space-y-4">
      {/* Order Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-500">
            Informazioni Ordine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Numero ordine:</span>
            <span className="font-medium">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tipo:</span>
            <span className="font-medium">
              {order.orderSource === "ONLINE" ? "Online (Stripe)" : "Manuale (POS/Contanti)"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Data:</span>
            <span className="font-medium">
              {formatDate(order.paidAt || order.createdAt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Giorni dal pagamento:</span>
            <span className="font-medium text-brand-primary">
              {daysSinceOrder} giorni
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Totale ordine:</span>
            <span className="font-medium">€{order.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Cliente:</span>
            <span className="font-medium">{order.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Existing Refunds Warning */}
      {existingRefunds.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>
            <AlertTriangle className="h-4 w-4" />
            Attenzione: esistono rimborsi precedenti
          </AlertTitle>
          <AlertDescription>
            Questo ordine ha già {existingRefunds.length} rimborso/i:
            <ul className="mt-2 space-y-1">
              {existingRefunds.map((refund) => (
                <li key={refund.id} className="text-sm">
                  • {refund.refundNumber} - €{refund.totalRefunded.toFixed(2)} il{" "}
                  {formatDateShort(refund.refundedAt)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Informazione diritto di recesso */}
      <Alert variant="default">
        <Calendar className="h-4 w-4" />
        <AlertTitle>
          Diritto di recesso
        </AlertTitle>
        <AlertDescription className="space-y-2">
          <ul className="space-y-1 text-sm">
            <li>
              • <strong>Gift Card:</strong> 14 giorni dalla data di acquisto
            </li>
            <li>
              • <strong>Prodotti:</strong> 14 giorni dalla data di consegna
            </li>
          </ul>
          <p className="text-sm mt-2 text-gray-600">
            <Info className="h-3 w-3 inline mr-1" />
            I giorni festivi potrebbero estendere il termine reale di reso, verifica la normativa vigente.
          </p>
        </AlertDescription>
      </Alert>

      {/* Gift Card Warning */}
      <Alert variant="default">
        <AlertTitle>
          <AlertTriangle className="h-4 w-4" />
          Gift Card già utilizzate
        </AlertTitle>
        <AlertDescription>
          Le Gift Card che hanno anche solo una transazione NON sono rimborsabili.
          Nel prossimo step vedrai quali gift card sono rimborsabili.
        </AlertDescription>
      </Alert>

      {/* Cannot Refund Warning */}
      {!canRefund && (
        <Alert variant="destructive">
          <AlertTitle>
            <AlertTriangle className="h-4 w-4" />
            Nessun item rimborsabile
          </AlertTitle>
          <AlertDescription>
            Non ci sono prodotti rimborsabili per questo ordine. Possibili cause:
            <ul className="mt-2 list-disc list-inside text-sm">
              <li>Tutti gli item sono già stati rimborsati</li>
              <li>Le gift card hanno transazioni e dunque non sono rimborsabili</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
