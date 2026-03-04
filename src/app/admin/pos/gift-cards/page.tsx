"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Store, CreditCard, Banknote, Gift, Mail, CheckCircle, Loader2, AlertCircle, X } from "lucide-react"
import { useToast } from "@/components/Toast"
import { Toast, useToast } from "@/components/Toast"

// Tagli disponibili per creazione POS (hardcoded, indipendente da e-commerce)
const AVAILABLE_VALUES = [25, 50, 75, 100, 150, 200, 250, 500]

// Validazione email (stessa del carrello)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validazione telefono (stessa del carrello)
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+[\d\s\-\(\)\.]{6,20}$/
  return phoneRegex.test(phone)
}

interface GiftCardValue {
  id: string
  value: number
  label: string
}

type PaymentMethod = "CASH" | "POS"

export default function PosGiftCardPage() {
  const [values, setValues] = useState<GiftCardValue[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{
    orderNumber: string
    giftCardCode: string
  } | null>(null)
  
  // Form state
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  
  const { showToast } = useToast()
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [formData, setFormData] = useState<{
    email: string
    phone: string
    paymentMethod: PaymentMethod
    giftCardValue: number
  } | null>(null)

  // Inizializza i tagli da array hardcoded (indipendente da DB e FF)
  useEffect(() => {
    const giftCardValues = AVAILABLE_VALUES.map((val, index) => ({
      id: `pos-gc-${val}`,
      value: val,
      label: `€${val}`,
    }))
    setValues(giftCardValues)
    if (giftCardValues.length > 0) {
      setSelectedTemplate(giftCardValues[0].id)
    }
    setLoading(false)
  }, [])

  const [errors, setErrors] = useState<{
    email?: string
    phone?: string
  }>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: { email?: string; phone?: string } = {}
    
    // Validazione email
    if (!email?.trim()) {
      newErrors.email = "L'email è obbligatoria"
    } else if (!isValidEmail(email)) {
      newErrors.email = "L'email non è valida"
    }
    
    // Validazione telefono
    if (!phone?.trim()) {
      newErrors.phone = "Il numero di telefono è obbligatorio"
    } else if (!isValidPhone(phone)) {
      newErrors.phone = "Il numero di telefono non è valido (deve iniziare con +)"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors({})

    // Save form data and show confirmation modal
    const selectedValue = values.find(v => v.id === selectedTemplate)?.value
    if (!selectedValue) {
      showToast("Seleziona un taglio valido", "error")
      return
    }
    
    setFormData({
      email,
      phone,
      paymentMethod,
      giftCardValue: selectedValue,
    })
    setShowConfirmModal(true)
  }
  
  const handleConfirmCreate = async () => {
    if (!formData) return
    
    setShowConfirmModal(false)
    setSubmitting(true)
    
    try {
      const res = await fetch("/api/admin/pos/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        // Gestione specifica per rate limiting (429)
        if (res.status === 429) {
          const retryAfter = data.retryAfter || 60
          throw new Error(
            `Troppe richieste. Riprova tra ${retryAfter} secondi.`
          )
        }
        throw new Error(data.error || "Errore durante la creazione")
      }

      setSuccess({
        orderNumber: data.order?.orderNumber || "N/A",
        giftCardCode: data.giftCard?.code || "N/A",
      })
      
      showToast("Gift Card creata con successo!", "success")
      
      // Reset form
      setEmail("")
      setPhone("")
      setSelectedTemplate(values[0]?.id || "")
      setPaymentMethod("CASH")
      setFormData(null)
    } catch (error) {
      console.error("Error creating gift card:", error)
      showToast(error instanceof Error ? error.message : "Errore durante la creazione", "error")
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleCancelCreate = () => {
    setShowConfirmModal(false)
    setFormData(null)
  }

  const handleNewOrder = () => {
    setSuccess(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    )
  }

  // Success view
  if (success) {
    return (
      <main className="min-h-screen bg-brand-cream">
        <header className="bg-white border-b border-brand-light-gray">
          <div className="flex items-center px-4 py-3 relative">
            <Link href="/admin" className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-brand-dark" />
            </Link>
            <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
              Cr. Gift Card
            </h1>
          </div>
        </header>

        <div className="p-4 max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-card p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-headline-sm font-bold text-brand-dark mb-2">
              Gift Card Creata!
            </h2>
            <p className="text-body-md text-brand-gray mb-6">
              L&apos;ordine è stato completato con successo.
            </p>

            <div className="bg-brand-light-gray/30 rounded-2xl p-4 mb-6">
              <div className="mb-4">
                <p className="text-label-sm text-brand-gray mb-1">Numero Ordine</p>
                <p className="text-title-lg font-bold text-brand-dark">{success.orderNumber}</p>
              </div>
              <div>
                <p className="text-label-sm text-brand-gray mb-1">Codice Gift Card</p>
                <p className="text-title-md font-bold text-brand-primary">{success.giftCardCode}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleNewOrder}
                className="w-full py-3 px-6 bg-brand-primary text-white rounded-full font-medium hover:bg-brand-dark transition-colors"
              >
                Nuova Gift Card
              </button>
              <Link
                href="/admin/orders"
                className="block w-full py-3 px-6 bg-brand-light-gray/50 text-brand-dark rounded-full font-medium hover:bg-brand-light-gray transition-colors"
              >
                Vai agli Ordini
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Creazione Gift Card Digitale
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
              <Store className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-title-lg font-bold text-brand-dark">
                Creazione Gift Card Digitale
              </h2>
              <p className="text-body-sm text-brand-gray">
                Pagamento in sede (Contanti/POS)
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-label-md text-brand-gray mb-2">
                Email cliente <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                }}
                placeholder="cliente@email.it"
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${
                  errors.email 
                    ? "border-red-500 ring-2 ring-red-200" 
                    : "border-brand-light-gray focus:border-brand-primary"
                }`}
              />
              {errors.email ? (
                <p className="text-red-500 text-label-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              ) : (
                <p className="text-label-sm text-brand-gray mt-1">
                  L&apos;email è obbligatoria per l&apos;invio della Gift Card
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-label-md text-brand-gray mb-2">
                Telefono <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }))
                }}
                placeholder="+39 347 585 2220"
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${
                  errors.phone 
                    ? "border-red-500 ring-2 ring-red-200" 
                    : "border-brand-light-gray focus:border-brand-primary"
                }`}
              />
              {errors.phone ? (
                <p className="text-red-500 text-label-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.phone}
                </p>
              ) : (
                <p className="text-label-sm text-brand-gray mt-1">
                  Il telefono è obbligatorio per contattare il cliente
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-label-md text-brand-gray mb-2">
                Metodo di pagamento <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === "CASH"
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-brand-light-gray text-brand-gray hover:border-brand-primary/50"
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="font-medium">Contanti</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("POS")}
                  className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === "POS"
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-brand-light-gray text-brand-gray hover:border-brand-primary/50"
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="font-medium">POS</span>
                </button>
              </div>
            </div>

            {/* Gift Card Template */}
            <div>
              <label className="block text-label-md text-brand-gray mb-2">
                Taglio Gift Card <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {values.map((gcValue) => (
                  <button
                    key={gcValue.id}
                    type="button"
                    onClick={() => setSelectedTemplate(gcValue.id)}
                    className={`py-4 px-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                      selectedTemplate === gcValue.id
                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                        : "border-brand-light-gray text-brand-dark hover:border-brand-primary/50"
                    }`}
                  >
                    <Gift className="w-5 h-5 mb-1" />
                    <span className="text-title-sm font-bold">{gcValue.label}</span>
                  </button>
                ))}
              </div>
              {values.length === 0 && (
                <p className="text-body-sm text-red-500 mt-2">
                  Nessun taglio disponibile.
                </p>
              )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-body-sm text-blue-800">
                  L&apos;email con la Gift Card e il PDF allegato verrà inviata automaticamente al cliente.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || values.length === 0}
              className="w-full py-4 px-6 bg-brand-primary text-white rounded-xl font-bold text-title-sm hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  Crea Gift Card
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-headline-sm font-bold text-brand-dark">
                  Conferma Pagamento
                </h3>
              </div>
              <button
                onClick={handleCancelCreate}
                className="p-2 rounded-full hover:bg-brand-light-gray/50 transition-colors"
                title="Annulla"
                aria-label="Annulla"
              >
                <X className="w-5 h-5 text-brand-gray" />
              </button>
            </div>
            
            {/* Content */}
            <div className="space-y-4 mb-6">
              <p className="text-body-md text-brand-dark">
                Il pagamento è stato effettuato correttamente?
              </p>
              
              <div className="bg-brand-light-gray/30 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-body-sm">
                  <span className="text-brand-gray">Metodo:</span>
                  <span className="font-medium text-brand-dark">
                    {paymentMethod === "CASH" ? "Contanti" : "POS"}
                  </span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-brand-gray">Importo:</span>
                  <span className="font-bold text-brand-primary">
                    €{values.find(v => v.id === selectedTemplate)?.value}
                  </span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-brand-gray">Cliente:</span>
                  <span className="font-medium text-brand-dark truncate max-w-[150px]">
                    {email}
                  </span>
                </div>
              </div>
              
              <p className="text-label-sm text-brand-gray">
                Conferma solo se il pagamento è stato ricevuto. Questa azione non può essere annullata.
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelCreate}
                className="flex-1 py-3 px-4 bg-brand-light-gray/50 text-brand-dark rounded-xl font-medium hover:bg-brand-light-gray transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmCreate}
                className="flex-1 py-3 px-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-dark transition-colors"
              >
                Sì, procedi
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={hideToast} />
    </main>
  )
}
