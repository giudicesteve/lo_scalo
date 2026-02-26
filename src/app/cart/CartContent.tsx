"use client"

import { useState, useEffect } from "react"
import Link from "next/link"


import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { useCart, calculateTotal } from "@/store/cart"
import { ArrowLeft, X, AlertCircle } from "lucide-react"

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
  const { t, lang } = useLanguage()
  const { items, removeItem, updateQuantity, clearCart } = useCart()

  const [email, setEmail] = useState("")
  const [emailConfirm, setEmailConfirm] = useState("")
  const [phone, setPhone] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<{ 
    email?: string; 
    emailConfirm?: string; 
    phone?: string; 
    general?: string;
    unavailableItems?: string;
    terms?: string;
  }>({})
  const [isCheckout, setIsCheckout] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Evita hydration mismatch - la lingua viene caricata dal localStorage solo sul client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Verifica e aggiorna disponibilità quando si torna al carrello
  useEffect(() => {
    if (!mounted || items.length === 0) return

    async function checkStock() {
      try {
        // Carica prodotti aggiornati
        const res = await fetch('/api/products')
        if (!res.ok) return
        
        const products = await res.json()
        let hasUpdates = false

        // Verifica ogni item nel carrello
        items.forEach(item => {
          if (item.type !== 'product') return

          const product = products.find((p: { id: string }) => p.id === item.id)
          if (!product) return

          let currentStock = 0
          if (product.hasSizes && item.size) {
            const variant = product.variants.find((v: { size: string }) => v.size === item.size)
            currentStock = variant?.quantity || 0
          } else {
            currentStock = product.variants[0]?.quantity || 0
          }

          // Se lo stock è cambiato, aggiorna
          if (currentStock !== item.maxStock) {
            if (currentStock === 0) {
              // Rimuovi se esaurito
              removeItem(item.id, item.size)
            } else if (item.quantity > currentStock) {
              // Riduci alla disponibilità
              updateQuantity(item.id, currentStock, item.size)
            }
            hasUpdates = true
          }
        })

        if (hasUpdates) {
          // Mostra notifica
          setErrors(prev => ({
            ...prev,
            general: t('cart.stock-updated')
          }))
        }
      } catch {
        // Ignora errori silenziosamente
      }
    }

    checkStock()
  }, [mounted, items.length]) // Solo al mount e quando cambia il numero di items

  const total = calculateTotal(items)

  const validateForm = (): boolean => {
    const newErrors: { email?: string; emailConfirm?: string; phone?: string; terms?: string } = {}

    if (!email.trim()) {
      newErrors.email = t('cart.error.email-required')
    } else if (!isValidEmail(email)) {
      newErrors.email = t('cart.error.email-invalid')
    }

    if (!emailConfirm.trim()) {
      newErrors.emailConfirm = t('cart.error.email-required')
    } else if (email !== emailConfirm) {
      newErrors.emailConfirm = t('cart.error.email-mismatch')
    }

    if (!phone.trim()) {
      newErrors.phone = t('cart.error.phone-required')
    } else if (!isValidPhone(phone)) {
      newErrors.phone = t('cart.error.phone-invalid')
    }

    if (!acceptTerms) {
      newErrors.terms = t('cart.error.terms-required')
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
          language: lang,  // Lingua selezionata dall'utente
        }),
      })

      const data = await res.json()

      if (data.success && data.stripeUrl) {
        // Record policy acceptance
        try {
          // Get active policies
          const [termsRes, privacyRes] = await Promise.all([
            fetch("/api/policies?type=TERMS"),
            fetch("/api/policies?type=PRIVACY")
          ])
          
          const termsPolicies = termsRes.ok ? await termsRes.json() : []
          const privacyPolicies = privacyRes.ok ? await privacyRes.json() : []
          
          const policyIds = [
            ...(termsPolicies.length > 0 ? [termsPolicies[0].id] : []),
            ...(privacyPolicies.length > 0 ? [privacyPolicies[0].id] : [])
          ]
          
          // Record acceptance if policies exist
          if (policyIds.length > 0) {
            await fetch("/api/policies/accept", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                orderId: data.order.id,
                policyIds,
                language: lang // Track which language version was shown
              })
            })
          }
        } catch (error) {
          // Non bloccare il checkout se il tracking fallisce
          console.error("Error recording policy acceptance:", error)
        }

        // Salva dettagli ordine per la pagina di successo
        localStorage.setItem('pending-order', JSON.stringify({
          orderNumber: data.order.orderNumber,
          items: items.map(i => ({ 
            name: i.name, 
            quantity: i.quantity, 
            type: i.type,
            price: i.price,
            size: i.size 
          })),
          total: calculateTotal(items),
          email: email
        }))
        // Salva carrello per ripristino in caso di annullamento
        localStorage.setItem('cart-backup', JSON.stringify(items))
        clearCart()
        window.location.href = data.stripeUrl
      } else {
        if (data.error === 'PRODUCTS_UNAVAILABLE' && data.items) {
          // Errore con lista prodotti non disponibili
          const unavailableItems = data.items as Array<{
            name: string
            requested: number
            available: number
            size?: string
          }>
          
          // Aggiorna il carrello con le nuove disponibilità
          unavailableItems.forEach((item) => {
            const cartItem = items.find(i => 
              i.name === (item.size ? `${item.name} - ${item.size}` : item.name)
            )
            if (cartItem && item.available > 0) {
              // Aggiorna alla disponibilità massima
              updateQuantity(cartItem.id, Math.min(item.available, cartItem.quantity), cartItem.size)
            }
          })
          
          setErrors({ 
            general: t('cart.error.products-unavailable'),
            unavailableItems: JSON.stringify(unavailableItems)
          })
        } else if (data.error === 'PRODUCT_UNAVAILABLE' && data.productName) {
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

  // Previeni hydration mismatch mostrando un loader finché non è montato
  if (!mounted) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </main>
    )
  }

  if (items.length === 0 && !isCheckout) {
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
        {!isCheckout ? (
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
                        <div className="flex flex-col items-center gap-1">
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
                              disabled={item.type === 'product' && item.maxStock !== undefined && item.quantity >= item.maxStock}
                              className="w-6 h-6 rounded-full bg-brand-light-gray text-brand-dark disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                          {item.type === 'product' && item.maxStock !== undefined && item.quantity >= item.maxStock && (
                            <span className="text-label-xs text-red-500">{t('cart.max-stock')}</span>
                          )}
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
              <button onClick={() => setIsCheckout(true)} className="btn-primary flex-1">
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
              <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-bold">{errors.general}</span>
                </div>
                {errors.unavailableItems && (
                  <div className="mt-3 space-y-2 text-body-sm">
                    {(() => {
                      const items = JSON.parse(errors.unavailableItems) as Array<{
                        name: string
                        requested: number
                        available: number
                        size?: string
                      }>
                      return items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/50 rounded-lg p-2">
                          <span>
                            {item.size ? `${item.name} (${item.size})` : item.name}
                          </span>
                          <span className="text-label-sm">
                            {item.available === 0 
                              ? t('cart.error.sold-out')
                              : `${t('cart.error.available-now')}: ${item.available}`
                            }
                          </span>
                        </div>
                      ))
                    })()}
                  </div>
                )}
                <p className="mt-3 text-body-sm">
                  {t('cart.error.go-back-update')}
                </p>
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
                    {t('cart.label.confirm-email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={emailConfirm}
                    onChange={(e) => {
                      setEmailConfirm(e.target.value)
                      if (errors.emailConfirm) setErrors({ ...errors, emailConfirm: undefined })
                    }}
                    placeholder={t("cart.email-placeholder")}
                    className={`input-field ${errors.emailConfirm ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                  />
                  {errors.emailConfirm ? (
                    <p className="text-red-500 text-label-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.emailConfirm}
                    </p>
                  ) : (
                    <p className="text-label-sm text-brand-gray mt-1">{t("cart.email-confirm-help")}</p>
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
                  {errors.phone ? (
                    <p className="text-red-500 text-label-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.phone}
                    </p>
                  ) : (
                    <p className="text-label-sm text-brand-gray mt-1">{t("cart.phone-help")}</p>
                  )}
                </div>

                {/* Terms and Privacy Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked)
                        if (errors.terms) setErrors({ ...errors, terms: undefined })
                      }}
                      className="w-5 h-5 mt-0.5 rounded border-brand-gray text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="text-body-sm text-brand-dark">
                      {t('cart.terms-label')}
                      <Link href="/terms" className="text-brand-primary hover:underline" target="_blank">
                        {t('cart.terms-link')}
                      </Link>
                      {t('cart.and')}
                      <Link href="/privacy" className="text-brand-primary hover:underline" target="_blank">
                        {t('cart.privacy-link')}
                      </Link>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-red-500 text-label-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.terms}
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
              disabled={loading || !acceptTerms}
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
