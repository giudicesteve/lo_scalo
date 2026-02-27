"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { useCart } from "@/store/cart"
import { ArrowLeft, X, Check, Package } from "lucide-react"
import { CartIcon } from "@/components/CartIcon"

interface ProductVariant {
  id: string
  size: string
  quantity: number
}

interface Product {
  id: string
  name: string
  descriptionIt: string
  descriptionEn: string
  price: number
  image: string
  hasSizes: boolean
  variants: ProductVariant[]
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"]

export default function ShopProductsPage() {
  const { lang, t } = useLanguage()
  const router = useRouter()
  const { addItem, items } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    // Verifica se lo shop è aperto
    const checkShopStatus = async () => {
      try {
        const res = await fetch("/api/site-config?key=SHOP_ENABLED")
        const data = await res.json()
        if (data.value === 'false') {
          router.replace("/shop") // Reindirizza alla pagina di chiusura
        }
      } catch (error) {
        console.error("Error checking shop status:", error)
      }
    }
    checkShopStatus()
    fetchProducts()
  }, [router])

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products")
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const showAddedToast = (productName: string) => {
    setToastMessage(`${productName} ${t('shop.added-to-cart')}`)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2500)
  }

  const handleAddToCart = () => {
    if (!selectedProduct) return

    if (selectedProduct.hasSizes) {
      // Prodotto con taglie - richiede selezione
      if (!selectedSize) return

      // Controlla disponibilità
      const available = getAvailableStock(selectedProduct, selectedSize)
      if (available <= 0) {
        alert(t('shop.max-stock-reached'))
        return
      }
      
      addItem({
        id: selectedProduct.id,
        type: "product",
        name: `${selectedProduct.name} - ${selectedSize}`,
        price: selectedProduct.price,
        quantity: 1,
        size: selectedSize,
        image: selectedProduct.image,
        maxStock: available, // Salva disponibilità per controllo nel carrello
      })
      
      showAddedToast(`${selectedProduct.name} (${selectedSize})`)
      setSelectedProduct(null)
      setSelectedSize("")
    } else {
      // Prodotto senza taglie - aggiungi direttamente
      // Controlla disponibilità
      const available = getAvailableStock(selectedProduct)
      if (available <= 0) {
        alert(t('shop.max-stock-reached'))
        return
      }

      addItem({
        id: selectedProduct.id,
        type: "product",
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity: 1,
        image: selectedProduct.image,
        maxStock: available, // Salva disponibilità per controllo nel carrello
      })
      
      showAddedToast(selectedProduct.name)
      setSelectedProduct(null)
    }
  }

  const handleQuickAdd = (product: Product) => {
    if (product.hasSizes) {
      // Mostra modal per selezione taglia
      setSelectedProduct(product)
      setSelectedSize("")
    } else {
      // Controlla disponibilità prima di aggiungere
      const available = getAvailableStock(product)
      if (available <= 0) {
        alert(t('shop.max-stock-reached'))
        return
      }

      // Aggiungi direttamente
      addItem({
        id: product.id,
        type: "product",
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
        maxStock: available, // Salva disponibilità per controllo nel carrello
      })
      showAddedToast(product.name)
    }
  }

  const getAvailableSizes = (product: Product) => {
    return SIZES.filter(
      (size) =>
        product.variants.find((v) => v.size === size && v.quantity > 0)
    )
  }

  const getStock = (product: Product) => {
    if (product.hasSizes) {
      return product.variants.reduce((sum, v) => sum + v.quantity, 0)
    }
    return product.variants[0]?.quantity || 0
  }

  // Ottieni quantità già nel carrello per un prodotto (e taglia specifica)
  const getQuantityInCart = (productId: string, size?: string) => {
    const cartItem = items.find(item => item.id === productId && item.size === size)
    return cartItem?.quantity || 0
  }

  // Calcola disponibilità residua (stock - carrello)
  const getAvailableStock = (product: Product, size?: string) => {
    const inCart = getQuantityInCart(product.id, size)
    
    if (product.hasSizes && size) {
      const variant = product.variants.find(v => v.size === size)
      return Math.max(0, (variant?.quantity || 0) - inCart)
    } else {
      const totalStock = product.variants[0]?.quantity || 0
      return Math.max(0, totalStock - inCart)
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream" suppressHydrationWarning>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-sm drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/home" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <Link href="/home"><Logo variant="solo" className="h-8 w-auto" /></Link>
          <Link href="/cart" className="p-2 -mr-2 relative">
            <CartIcon className="w-10 h-10" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 drop-shadow drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] bg-brand-primary text-white text-label-sm w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Toast Notification */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="bg-brand-dark text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-body-md font-medium">{toastMessage}</span>
        </div>
      </div>

      {/* Products */}
      <div className="p-4 pb-24 max-w-7xl mx-auto">
        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-4 mb-6">
          <p className="text-body-sm text-brand-dark">
            <span className="font-bold">{t("shop.warning")}:</span>{" "}
            {t("shop.no-shipping")}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const availableSizes = getAvailableSizes(product)
              const stock = getStock(product)
              const isAvailable = stock > 0
              // Disponibilità residua (considerando carrello)
              const availableStock = getAvailableStock(product)
              const canAdd = availableStock > 0
              
              return (
                <div
                  key={product.id}
                  className="bg-[#FBEEEB] rounded-2xl overflow-hidden drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] flex flex-col"
                >
                  <div className="relative aspect-square bg-brand-light-gray flex-shrink-0">
                    <Image
                      src={product.image.startsWith('data:') ? product.image : `${product.image}${product.image.includes('?') ? '&' : '?'}t=${product.id}`}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized={product.image.startsWith('data:')}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {product.hasSizes && (
                      <div className="absolute top-2 left-2 bg-brand-primary/90 text-white text-label-sm px-2 py-1 rounded-full">
                        {t('shop.sizes-available')}
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-headline-sm font-bold text-brand-primary mb-2">
                      {product.name}
                    </h3>
                    <p className="text-body-sm text-brand-gray mb-4 flex-grow">
                      {lang === "it" ? product.descriptionIt : product.descriptionEn}
                    </p>
                    
                    {/* Info stock */}
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-brand-gray" />
                      <span className={`text-label-sm ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {isAvailable 
                          ? (product.hasSizes 
                            ? t('shop.sizes-count').replace('{count}', availableSizes.length.toString())
                            : `${stock} ${t('common.available')}`)
                          : t('shop.sold-out')
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-title-lg font-bold text-brand-dark">
                        {product.price.toFixed(2)}€
                      </span>
                      <button
                        onClick={() => handleQuickAdd(product)}
                        disabled={!isAvailable || !canAdd}
                        className="btn-primary text-label-lg py-2 px-4 disabled:opacity-50 transition-all active:scale-95"
                      >
                        {!isAvailable
                          ? t('shop.sold-out')
                          : !canAdd
                          ? t('shop.max-in-cart')
                          : (product.hasSizes ? t('shop.select-size-btn') : t('shop.add-to-cart-btn'))}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Size Selection Modal */}
      {selectedProduct && selectedProduct.hasSizes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-headline-sm font-bold text-brand-dark">
                {t('shop.select-size-title')}
              </h3>
              <button
                onClick={() => {
                  setSelectedProduct(null)
                  setSelectedSize("")
                }}
                className="p-2"
              >
                <X className="w-6 h-6 text-brand-gray" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              {SIZES.map((size) => {
                const isAvailable = selectedProduct.variants.some(
                  (v) => v.size === size && v.quantity > 0
                )
                return (
                  <button
                    key={size}
                    onClick={() => isAvailable && setSelectedSize(size)}
                    disabled={!isAvailable}
                    className={`py-3 rounded-xl text-title-md font-medium transition-all ${
                      selectedSize === size
                        ? "bg-brand-primary text-white"
                        : isAvailable
                        ? "bg-brand-light-gray text-brand-dark hover:bg-brand-gray/20"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>

            {selectedSize && (
              <p className="text-label-sm text-brand-gray mb-3 text-center">
                {(() => {
                  const available = selectedProduct ? getAvailableStock(selectedProduct, selectedSize) : 0
                  return available > 0 
                    ? `${t('shop.available')}: ${available}`
                    : t('shop.max-stock-reached')
                })()}
              </p>
            )}
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize || (selectedProduct && getAvailableStock(selectedProduct, selectedSize) <= 0)}
              className="btn-primary w-full mb-3 disabled:opacity-50"
            >
              {t('shop.add-to-cart-btn')}
            </button>
            <button
              onClick={() => {
                setSelectedProduct(null)
                setSelectedSize("")
              }}
              className="btn-secondary w-full"
            >
              {t('shop.close')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
