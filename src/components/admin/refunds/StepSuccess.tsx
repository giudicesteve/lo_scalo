"use client"

import { CheckCircle, ExternalLink, Mail, Package, Gift } from "lucide-react"

interface StepSuccessProps {
  refund: {
    refundNumber: string
    totalRefunded: number
    refundedAt: string
  }
  orderNumber: string
  onClose: () => void
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

// Simple Card Component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border ${className}`}>
      {children}
    </div>
  )
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

// Simple Button
function Button({ 
  children, 
  onClick, 
  className = ""
}: { 
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

export function StepSuccess({ refund, orderNumber, onClose }: StepSuccessProps) {
  return (
    <div className="space-y-6">
      {/* Success Icon */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium">Rimborso Registrato!</h3>
        <p className="text-gray-500">
          Il rimborso è stato registrato con successo nel sistema.
        </p>
      </div>

      {/* Refund Details */}
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Numero rimborso:</span>
            <span className="font-mono font-bold text-lg">{refund.refundNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Riferimento ordine:</span>
            <span className="font-medium">{orderNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Data:</span>
            <span className="font-medium">
              {formatDate(refund.refundedAt)}
            </span>
          </div>
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">Totale rimborsato:</span>
              <span className="text-xl font-bold text-green-600">
                €{refund.totalRefunded.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">
          Azioni da completare
        </h4>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Verifica il rimborso esterno</p>
              <p className="text-sm text-blue-700">
                Se hai selezionato Stripe, verifica che il rimborso sia stato processato
                correttamente su Stripe Dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <Package className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">Stock ripristinato</p>
              <p className="text-sm text-green-700">
                Le quantità dei prodotti rimborsati sono tornate automaticamente disponibili nello shop.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <Gift className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-900">Gift Card disattivate</p>
              <p className="text-sm text-purple-700">
                Le Gift Card rimborsate sono state disattivate e non sono più utilizzabili.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Mail className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-900">Comunicazione al cliente</p>
              <p className="text-sm text-amber-700">
                Ricorda di informare il cliente che il rimborso è stato elaborato.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <div className="flex justify-center pt-4">
        <Button onClick={onClose}>
          Chiudi
        </Button>
      </div>
    </div>
  )
}
