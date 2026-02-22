"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Package, Power } from "lucide-react"
import { ImageUpload } from "@/components/ImageUpload"

interface ProductVariant {
  id?: string
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
  isActive: boolean
  variants: ProductVariant[]
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"]

export default function AdminShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [shopEnabled, setShopEnabled] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Partial<Product> & { 
    variants?: { size: string; quantity: number; id?: string }[] 
    stock?: number
    originalHasSizes?: boolean
    hasSizesChanged?: boolean
  } | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchShopStatus()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products")
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

  const handleSaveProduct = async () => {
    if (!editingProduct) return

    const method = editingProduct.id ? "PUT" : "POST"
    
    const bodyData = {
      ...editingProduct,
      hasSizes: editingProduct.hasSizes,
      hasSizesChanged: editingProduct.hasSizesChanged,
      variants: editingProduct.hasSizes 
        ? (editingProduct.variants || [])
        : undefined,
      stock: !editingProduct.hasSizes 
        ? (editingProduct.stock || 0)
        : undefined,
    }
    
    const res = await fetch("/api/admin/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    })

    if (res.ok) {
      setEditingProduct(null)
      fetchProducts()
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return

    const res = await fetch(`/api/admin/products?id=${id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      fetchProducts()
    }
  }

  const handleVariantChange = (size: string, quantity: number) => {
    if (!editingProduct) return

    const variants = editingProduct.variants || []
    const existingIndex = variants.findIndex((v) => v.size === size)

    if (existingIndex >= 0) {
      variants[existingIndex].quantity = quantity
    } else {
      variants.push({ size, quantity })
    }

    setEditingProduct({ ...editingProduct, variants })
  }

  const getVariantQuantity = (size: string) => {
    if (!editingProduct?.variants) return 0
    return editingProduct.variants.find((v) => v.size === size)?.quantity || 0
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
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Negozio
          </h1>
          <Logo variant="solo" className="h-3 w-auto ml-auto" />
        </div>
      </header>

      <div className="p-4">
        {/* Shop Toggle */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-title-md font-bold text-brand-dark">
                {shopEnabled ? 'Shop Attivo' : 'Shop Chiuso'}
              </h2>
              <p className="text-body-sm text-brand-gray">
                {shopEnabled 
                  ? 'Lo shop è aperto e i clienti possono acquistare'
                  : 'Lo shop è chiuso e i clienti non possono acquistare'}
              </p>
            </div>
            <button
              onClick={toggleShop}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                shopEnabled 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <Power className="w-4 h-4 inline mr-2" />
              {shopEnabled ? 'Chiudi Shop' : 'Apri Shop'}
            </button>
          </div>
        </div>

        {/* Add Product Button */}
        <button
          onClick={() =>
            setEditingProduct({
              name: "",
              descriptionIt: "",
              descriptionEn: "",
              price: 25,
              image: "",
              hasSizes: true,
              isActive: true,
              variants: SIZES.map((size) => ({ size, quantity: 0 })),
            })
          }
          className="btn-primary mb-6 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuovo Prodotto
        </button>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product.id} className={`bg-white rounded-2xl shadow-card overflow-hidden ${!product.isActive ? 'opacity-60' : ''}`}>
              <div className="relative aspect-square bg-brand-light-gray">
                <img
                  src={product.image.startsWith('data:') ? product.image : `${product.image}${product.image.includes('?') ? '&' : '?'}t=${product.id}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-title-md font-bold text-brand-dark truncate">
                      {product.name}
                    </h2>
                    <p className="text-title-sm font-bold text-brand-primary">
                      {product.price.toFixed(2)}€
                    </p>
                    <span className={`text-label-sm ${product.hasSizes ? 'text-brand-primary' : 'text-brand-gray'}`}>
                      {product.hasSizes ? 'Con taglie' : 'Singolo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingProduct({ 
                        ...product, 
                        stock: product.hasSizes ? undefined : (product.variants[0]?.quantity || 0),
                        originalHasSizes: product.hasSizes,
                        hasSizesChanged: false,
                      })}
                      className="p-1.5 text-brand-gray hover:text-brand-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 text-brand-gray hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Variants */}
                {product.hasSizes ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {SIZES.map((size) => {
                      const variant = product.variants.find((v) => v.size === size)
                      const quantity = variant?.quantity || 0
                      return (
                        <div
                          key={size}
                          className={`px-2 py-0.5 rounded text-label-sm ${
                            quantity > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {size}:{quantity}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2">
                    <Package className="w-3 h-3 text-brand-gray" />
                    <span className={`text-label-sm ${product.variants[0]?.quantity > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {product.variants[0]?.quantity || 0} pz
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <p className="text-center text-brand-gray py-12">
            Nessun prodotto nel negozio
          </p>
        )}
      </div>

      {/* Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-headline-sm font-bold text-brand-dark mb-4">
              {editingProduct.id ? "Modifica Prodotto" : "Nuovo Prodotto"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Descrizione (IT)
                </label>
                <textarea
                  value={editingProduct.descriptionIt || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, descriptionIt: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none min-h-[60px]"
                />
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Descrizione (EN)
                </label>
                <textarea
                  value={editingProduct.descriptionEn || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, descriptionEn: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none min-h-[60px]"
                />
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Prezzo (€)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editingProduct.price || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Upload Immagine */}
              <ImageUpload
                value={editingProduct.image || ""}
                onChange={(path) => setEditingProduct({ ...editingProduct, image: path })}
              />
              
              {/* Toggle per taglie */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingProduct.hasSizes ?? true}
                  onChange={(e) => {
                    const hasSizes = e.target.checked
                    const originalHasSizes = editingProduct.originalHasSizes ?? editingProduct.hasSizes ?? true
                    setEditingProduct({ 
                      ...editingProduct, 
                      hasSizes,
                      hasSizesChanged: hasSizes !== originalHasSizes,
                      variants: hasSizes 
                        ? SIZES.map((size) => ({ size, quantity: 0 }))
                        : editingProduct.variants,
                      stock: hasSizes ? undefined : (editingProduct.stock || 0)
                    })
                  }}
                  className="w-5 h-5 rounded border-brand-gray text-brand-primary"
                />
                <span className="text-body-md text-brand-dark">Prodotto con taglie multiple</span>
              </label>

              {/* Gestione stock in base a hasSizes */}
              {editingProduct.hasSizes ? (
                <div>
                  <label className="block text-label-md text-brand-gray mb-2">
                    Quantità per taglia
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map((size) => (
                      <div key={size} className="flex items-center gap-2">
                        <span className="text-body-sm w-8">{size}</span>
                        <input
                          type="number"
                          min="0"
                          value={getVariantQuantity(size)}
                          onChange={(e) =>
                            handleVariantChange(size, parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-2 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-label-md text-brand-gray mb-2">
                    Quantità disponibile
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.stock || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                  />
                </div>
              )}
              
              {editingProduct.id && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingProduct.isActive}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, isActive: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-brand-gray text-brand-primary"
                  />
                  <span className="text-body-md text-brand-dark">Attivo</span>
                </label>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleSaveProduct} 
                className="flex-1 px-6 py-3 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salva
              </button>
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-brand-dark text-brand-dark font-medium hover:bg-brand-dark hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
