"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { useCart, calculateTotal } from "@/store/cart"
import { ArrowLeft, X, Check, AlertCircle } from "lucide-react"

// Validazione email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validazione telefono
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)\.]{6,20}$/
  return phoneRegex.test(phone)
}

export default function CartContent() {
  const { t } = useLanguage()
  const { items, removeItem, updateQuantity, clearCart } = useCart()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<{ email?: string; phone?: string; general?: string }>({})
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart")
  const [orderNumber, setOrderNumber] = useState("")
  const [loading, setLoading] = useState(false)

  const total = calculateTotal(items)

  // Gestisci ritorno da Stripe
  useEffect(() => {
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")
    const order = searchParams.get("order")

    if (success === "true" && order) {
      setOrderNumber(order)
      setStep("success")
      localStorage.removeItem("pending-order")
      window.history.replaceState({}, '', '/cart')
    } else if (canceled === "true" && order) {
      // Utente ha annullato il pagamento - ripristina disponibilità
      fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: order })
      }).then(() => {
        setErrors({ general: "Pagamento annullato. Puoi riprovare quando vuoi." })
        window.history.replaceState({}, '', '/cart')
      }).catch(() => {
        setErrors({ general: "Pagamento annullato. Contatta il supporto se hai problemi." })
        window.history.replaceState({}, '', '/cart')
      })
    }
  }, [searchParams])

  const validateForm = (): boolean => {
    const newErrors: { email?: string; phone?: string } = {}

    if (!email.trim()) {
      newErrors.email = t('cart.error.email-required')
    } else if (!isValidEmail(email)) {
      newErrors.email = t('cart.error.email-invalid')
    }

    if (!phone.trim()) {
      newErrors.phone = t('cart.error.phone-required')
    } else if (!isValidPhone(phone)) {
      newErrors.phone = t('cart.error.phone-invalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCheckout = async () => {
    if (!validateForm()) return

    setLoading(true)
    setErrors({})
    
    try {
      const orderItems = items.map((item) => ({
        ...item,
        id: item.id,
        type: item.type,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
      }))

      const orderType =
        items.every((i) => i.type === "gift-card")
          ? "GIFT_CARD"
          : items.every((i) => i.type === "product")
          ? "PRODUCT"
          : "MIXED"

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          items: orderItems,
          total: calculateTotal(items),
          type: orderType,
        }),
      })

      const data = await res.json()

      if (data.success && data.stripeUrl) {
        localStorage.setItem('pending-order', JSON.stringify({
          orderNumber: data.order.orderNumber,
          items: items.map(i => ({ name: i.name, quantity: i.quantity }))
        }))
        clearCart()
        window.location.href = data.stripeUrl
      } else {
        if (data.error === 'PRODUCT_UNAVAILABLE' && data.productName) {
          setErrors({ 
            general: t('cart.error.product-unavailable').replace('{product}', data.productName) 
          })
        } else {
          setErrors({ general: data.error || t('cart.error.general') })
        }
      }
    } catch (error) {
      console.error("Error creating order:", error)
      setErrors({ general: t('cart.error.connection') })
    } finally {
      setLoading(false)
    }
  }

  if (step === "success") {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-headline-md font-bold text-brand-dark mb-4">
            {t("cart.success")}
          </h1>
          <p className="text-body-md text-brand-gray mb-2">
            {t("cart.order-number")} #{orderNumber}
          </p>
          <p className="text-body-md text-brand-gray mb-8">
            {t("cart.success-message")}
          </p>
          <Link href="/home" className="btn-primary inline-block">
            Torna alle sezioni
          </Link>
        </div>
      </main>
    )
  }

  if (items.length === 0 && step === "cart") {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <Logo variant="vertical" className="w-64 h-auto mb-6" />
        <p className="text-body-lg text-brand-gray mb-8">
          {t("cart.empty")}
        </p>
        <button 
          onClick={() => window.history.back()}
          className="btn-primary"
        >
          {t("cart.back")}
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-sm drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => window.history.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </button>
          <Link href="/" className="p-2 -mr-2">
            <Logo variant="solo" className="h-8 w-auto" />
          </Link>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4 pb-24">
        {step === "cart" ? (
          <>
            <h1 className="text-headline-sm font-bold text-brand-dark mb-6">
              {t("cart.title")}
            </h1>

            <div className="bg-white rounded-2xl overflow-hidden shadow-card mb-6">
              <table className="w-full">
                <thead className="bg-brand-light-gray/50">
                  <tr>
                    <th className="text-left p-4 text-label-md text-brand-gray">{t("cart.product")}</th>
                    <th className="text-center p-4 text-label-md text-brand-gray">{t("cart.quantity")}</th>
                    <th className="text-right p-4 text-label-md text-brand-gray">{t("cart.total")}</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.id}-${item.size}-${index}`} className="border-t border-brand-light-gray">
                      <td className="p-4 text-body-sm text-brand-dark">{item.name}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                            className="w-6 h-6 rounded-full bg-brand-light-gray text-brand-dark"
                          >
                            -
                          </button>
                          <span className="text-body-md w-6">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                            className="w-6 h-6 rounded-full bg-brand-light-gray text-brand-dark"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right text-body-sm font-medium text-brand-dark">
                        {(item.price * item.quantity).toFixed(2)}€
                      </td>
                      <td className="p-4">
                        <button onClick={() => removeItem(item.id, item.size)} className="text-brand-gray hover:text-brand-primary">
                          <X className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-brand-light-gray flex justify-between items-center">
                <span className="text-title-md font-bold text-brand-dark">{t("cart.total")}</span>
                <span className="text-headline-sm font-bold text-brand-primary">{total.toFixed(2)}€</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("checkout")} className="btn-primary flex-1">
                {t("cart.checkout")}
              </button>
              <button onClick={clearCart} className="btn-secondary">
                {t("cart.clear")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-headline-sm font-bold text-brand-dark mb-6">{t("cart.title")}</h1>

            {errors.general && (
              <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {errors.general}
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-card mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-label-md text-brand-gray mb-2">
                    {t('cart.label.email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors({ ...errors, email: undefined })
                    }}
                    placeholder={t("cart.email-placeholder")}
                    className={`input-field ${errors.email ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                  />
                  {errors.email ? (
                    <p className="text-red-500 text-label-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.email}
                    </p>
                  ) : (
                    <p className="text-label-sm text-brand-gray mt-1">{t("cart.email-help")}</p>
                  )}
                </div>

                <div>
                  <label className="block text-label-md text-brand-gray mb-2">
                    {t('cart.label.phone')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (errors.phone) setErrors({ ...errors, phone: undefined })
                    }}
                    placeholder="+39 123 456 7890"
                    className={`input-field ${errors.phone ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-label-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-brand-light-gray/30 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-body-md text-brand-gray">{t("cart.total")}</span>
                <span className="text-headline-sm font-bold text-brand-dark">{total.toFixed(2)}€</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? t("common.loading") : t("cart.confirm")}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
