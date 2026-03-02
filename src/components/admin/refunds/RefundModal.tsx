"use client"

import { Loader2, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft, X } from "lucide-react"
import { useState, useEffect } from "react"
import { StepInfo } from "./StepInfo"
import { StepSelection } from "./StepSelection"
import { StepConfirm } from "./StepConfirm"
import { StepSuccess } from "./StepSuccess"

interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderNumber: string
  onRefundComplete?: () => void
}

type RefundStep = "info" | "selection" | "confirm" | "success"

export interface RefundableItem {
  type: "PRODUCT" | "GIFT_CARD"
  id: string
  productId?: string
  giftCardId?: string
  name: string
  nameEn?: string
  size?: string
  price: number
  quantity?: number
  availableQuantity?: number
  refundedQuantity?: number
  refundQuantity?: number
  code?: string
  remainingValue?: number
  isRefundable: boolean
  isAlreadyRefunded: boolean
  hasTransactions?: boolean
  transactionCount?: number
  daysSinceOrder: number
  reason: string | null
}

export interface RefundPreviewData {
  order: {
    id: string
    orderNumber: string
    orderSource: string
    paidAt: string | null
    createdAt: string
    total: number
    email: string
    stripePaymentIntentId?: string | null
  }
  products: RefundableItem[]
  giftCards: RefundableItem[]
  canRefund: boolean
  existingRefunds: Array<{
    id: string
    refundNumber: string
    totalRefunded: number
    refundedAt: string
  }>
}

// Simple Dialog Component
function Dialog({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between p-6 border-b">{children}</div>
}

function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>
}

function DialogContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">{children}</div>
}

function Button({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "primary",
  className = ""
}: { 
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "outline" | "danger"
  className?: string
}) {
  const baseClasses = "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700"
  }
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// Simple Alert Component
function Alert({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "destructive" }) {
  const bgColors = {
    default: "bg-blue-50 border-blue-200",
    destructive: "bg-red-50 border-red-200"
  }
  
  return (
    <div className={`p-4 rounded-lg border ${bgColors[variant]} mb-4`}>
      {children}
    </div>
  )
}

export function RefundModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  onRefundComplete,
}: RefundModalProps) {
  const [step, setStep] = useState<RefundStep>("info")
  const [previewData, setPreviewData] = useState<RefundPreviewData | null>(null)
  const [selectedItems, setSelectedItems] = useState<RefundableItem[]>([])
  const [refundMethod, setRefundMethod] = useState<"STRIPE" | "CASH" | "POS">("STRIPE")
  const [externalRef, setExternalRef] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingStripe, setIsProcessingStripe] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refundResult, setRefundResult] = useState<{
    refundNumber: string
    totalRefunded: number
    refundedAt: string
  } | null>(null)

  // Load preview data when modal opens
  useEffect(() => {
    if (isOpen && orderId) {
      loadPreview()
    }
  }, [isOpen, orderId])

  // Auto-set refund method based on order source
  useEffect(() => {
    if (previewData) {
      if (previewData.order.orderSource === "ONLINE") {
        setRefundMethod("STRIPE")
      } else {
        // For MANUAL orders, default to CASH (can be changed to POS)
        setRefundMethod("CASH")
      }
    }
  }, [previewData?.order.orderSource])

  const loadPreview = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund-preview`)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to load preview")
      }
      const data = await response.json()
      setPreviewData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = () => {
    if (step === "info") {
      setStep("selection")
    } else if (step === "selection") {
      if (selectedItems.length === 0) {
        setError("Seleziona almeno un item da rimborsare")
        return
      }
      setError(null)
      setStep("confirm")
    }
  }

  const handleBack = () => {
    setError(null)
    if (step === "selection") {
      setStep("info")
    } else if (step === "confirm") {
      setStep("selection")
    }
  }

  const handleSubmit = async () => {
    if (!previewData) return

    const isOnlineOrder = previewData.order.orderSource === "ONLINE"
    const paymentIntentId = previewData.order.stripePaymentIntentId

    // For ONLINE orders, we try to process Stripe refund automatically first
    let stripeRefundId = externalRef

    if (isOnlineOrder && !stripeError) {
      // Check if payment intent is available
      if (!paymentIntentId) {
        setStripeError("Payment Intent ID non disponibile per questo ordine. Inserisci manualmente l'ID del rimborso Stripe.")
        return
      }

      setIsProcessingStripe(true)
      setError(null)

      try {
        const stripeResponse = await fetch("/api/admin/refunds/stripe-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntentId,
            amount: Math.round(totalSelected * 100), // convert to cents
          }),
        })

        const stripeResult = await stripeResponse.json()

        if (!stripeResponse.ok) {
          throw new Error(stripeResult.error || "Errore durante il rimborso su Stripe")
        }

        // Stripe refund succeeded, use the refund ID
        stripeRefundId = stripeResult.refundId
      } catch (err: any) {
        setStripeError(err.message || "Errore durante l'elaborazione del rimborso su Stripe")
        setIsProcessingStripe(false)
        return
      } finally {
        setIsProcessingStripe(false)
      }
    }

    // Validate externalRef for MANUAL orders or when Stripe auto-processing is not available
    // For ONLINE orders, if we don't have a stripeRefundId (missing PI or failed), require manual input
    const needsManualRef = !isOnlineOrder || (isOnlineOrder && stripeError)
    if (needsManualRef && !stripeRefundId.trim()) {
      setError(refundMethod === "STRIPE" 
        ? "Inserisci l'ID del rimborso Stripe" 
        : "Inserisci il numero del documento di rimborso")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const items = selectedItems.map((item) => ({
        type: item.type,
        id: item.id,
        refundQuantity: item.refundQuantity || item.quantity || 1,
      }))

      const response = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          items,
          refundMethod,
          externalRef: stripeRefundId || undefined,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to create refund")
      }

      const result = await response.json()
      setRefundResult(result.refund)
      setStep("success")
      onRefundComplete?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Reset state
    setStep("info")
    setSelectedItems([])
    setRefundMethod("STRIPE")
    setExternalRef("")
    setNotes("")
    setError(null)
    setStripeError(null)
    setIsProcessingStripe(false)
    setRefundResult(null)
    onClose()
  }

  const totalSelected = selectedItems.reduce((sum, item) => sum + item.price * (item.refundQuantity || item.quantity || 1), 0)

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogHeader>
        <DialogTitle>
          {step === "success" ? (
            <span className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Rimborso Completato
            </span>
          ) : (
            <span className="flex items-center gap-2">
              💰 Rimborso Ordine #{orderNumber}
            </span>
          )}
        </DialogTitle>
        <button 
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </DialogHeader>

      <DialogContent>
        {isLoading && !previewData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error && step !== "success" && !isLoading ? (
          <Alert variant="destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </Alert>
        ) : (
          <>
            {/* Step Indicator */}
            {step !== "success" && (
              <div className="flex items-center gap-2 mb-6">
                {["info", "selection", "confirm"].map((s, idx) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === s
                          ? "bg-blue-600 text-white"
                          : idx < ["info", "selection", "confirm"].indexOf(step)
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {idx < ["info", "selection", "confirm"].indexOf(step) ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className="text-sm text-gray-500 hidden sm:inline">
                      {s === "info" && "Informazioni"}
                      {s === "selection" && "Selezione"}
                      {s === "confirm" && "Conferma"}
                    </span>
                    {idx < 2 && <div className="w-8 h-px bg-gray-300" />}
                  </div>
                ))}
              </div>
            )}

            {/* Step Content */}
            {step === "info" && previewData && (
              <StepInfo
                order={previewData.order}
                existingRefunds={previewData.existingRefunds}
                canRefund={previewData.canRefund}
              />
            )}

            {step === "selection" && previewData && (
              <StepSelection
                products={previewData.products}
                giftCards={previewData.giftCards}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                totalSelected={totalSelected}
              />
            )}

            {step === "confirm" && previewData && (
              <StepConfirm
                selectedItems={selectedItems}
                totalSelected={totalSelected}
                orderSource={previewData.order.orderSource}
                refundMethod={refundMethod}
                onRefundMethodChange={setRefundMethod}
                externalRef={externalRef}
                onExternalRefChange={setExternalRef}
                notes={notes}
                onNotesChange={setNotes}
                stripeError={stripeError}
              />
            )}

            {step === "success" && refundResult && (
              <StepSuccess
                refund={refundResult}
                orderNumber={orderNumber}
                onClose={handleClose}
              />
            )}

            {/* Error Message */}
            {error && step !== "success" && (
              <Alert variant="destructive">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              </Alert>
            )}

            {/* Navigation Buttons */}
            {step !== "success" && (
              <div className="flex justify-between mt-6 pt-4 border-t">
                {step !== "info" ? (
                  <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                    <ArrowLeft className="h-4 w-4" />
                    Indietro
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                    Annulla
                  </Button>
                )}

                {step === "confirm" ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || isProcessingStripe || (!externalRef.trim() && !!stripeError)}
                    variant="danger"
                  >
                    {isProcessingStripe ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Elaborazione su Stripe...
                      </>
                    ) : isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Elaborazione...
                      </>
                    ) : (
                      <>
                        Conferma Rimborso
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={isLoading || (step === "info" && !previewData?.canRefund)}
                  >
                    Procedi
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
