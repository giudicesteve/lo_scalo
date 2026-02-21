"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/Logo"
import { ArrowLeft, Power, Package, Plus, Edit2, Trash2 } from "lucide-react"

interface Product {
  id: string
  name: string
  descriptionIt: string
  descriptionEn: string
  price: number
  image: string
  hasSizes: boolean
  variants: Array<{
    id: string
    size: string
    quantity: number
  }>
}

export default function AdminShopPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [shopEnabled, setShopEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
    fetchShopStatus()
  }, [])

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

  const fetchShopStatus = async () => {
    try {
      const res = await fetch("/api/site-config?key=SHOP_ENABLED")
      const data = await res.json()
      setShopEnabled(data.value === 'true')
    } catch (error) {
      console.error("Error fetching shop status:", error)
    }
  }

  const toggleShop = async () => {
    const newStatus = !shopEnabled
    try {
      const res = await fetch("/api/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "SHOP_ENABLED", value: newStatus ? "true" : "false" }),
      })
      if (res.ok) {
        setShopEnabled(newStatus)
      }
    } catch (error) {
      console.error("Error toggling shop:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return

    const res = await fetch(`/api/admin/products?id=${id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      fetchProducts()
    }
  }

  const getTotalStock = (product: Product) => {
    return product.variants.reduce((sum, v) => sum + v.quantity, 0)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Gestione Shop
          </h1>
          <Logo variant="solo" className="h-3 w-auto ml-auto" />
        </div>
      </header>

      <div className="p-4">
        {/* Shop Toggle */}
        <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between ${shopEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
          <div className="flex items-center gap-3">
            <Power className={`w-6 h-6 ${shopEnabled ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="font-bold text-brand-dark">
                Shop {shopEnabled ? 'Attivo' : 'Spento'}
              </p>
              <p className="text-body-sm text-brand-gray">
                {shopEnabled 
                  ? 'Lo shop è aperto e i clienti possono acquistare' 
                  : 'Lo shop è chiuso, i clienti vedranno il messaggio di chiusura stagionale'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleShop}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              shopEnabled 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {shopEnabled ? 'Chiudi Shop' : 'Apri Shop'}
          </button>
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => router.push("/admin/shop/products/new")}
          className="btn-primary mb-6 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuovo Prodotto
        </button>

        {/* Products List */}
        <div className="space-y-4">
          {products.map((product) => {
            const totalStock = getTotalStock(product)
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-card p-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-xl bg-brand-light-gray"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-title-md font-bold text-brand-dark">
                          {product.name}
                        </h2>
                        <p className="text-headline-sm font-bold text-brand-primary mt-1">
                          {product.price.toFixed(2)}€
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/admin/shop/products/${product.id}`)}
                          className="p-2 text-brand-gray hover:text-brand-primary"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-brand-gray hover:text-red-500"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Package className="w-4 h-4 text-brand-gray" />
                      <span className={`text-label-sm ${totalStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalStock > 0 
                          ? `${totalStock} disponibili${product.hasSizes ? ' in totale' : ''}`
                          : 'Esaurito'
                        }
                      </span>
                    </div>

                    {product.hasSizes && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {product.variants.map((variant) => (
                          <span
                            key={variant.id}
                            className={`px-2 py-1 rounded-full text-label-sm ${
                              variant.quantity > 0
                                ? 'bg-brand-light-gray text-brand-dark'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {variant.size}: {variant.quantity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {products.length === 0 && (
          <p className="text-center text-brand-gray py-12">
            Nessun prodotto nel negozio
          </p>
        )}
      </div>
    </main>
  )
}
