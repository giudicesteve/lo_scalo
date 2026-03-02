"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Package, Power } from "lucide-react"
import { ImageUpload } from "@/components/ImageUpload"

// Helper to parse number with both comma and dot as decimal separator
const parseNumber = (value: string): number => {
  if (!value) return 0
  // Replace comma with dot for European decimal format, then parse
  const normalized = value.replace(',', '.')
  return parseFloat(normalized) || 0
}

interface ProductVariant {
  id?: string
  size: string
  quantity: number
}

interface Product {
  id: string
  name: string
  nameEn: string
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
  const [shopEnabled, setShopEnabled] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Partial<Product> & { 
    variants?: { size: string; quantity: number; id?: string }[] 
    stock?: number
    originalHasSizes?: boolean
    hasSizesChanged?: boolean
  } | null>(null)
  
  const [loading, setLoading] = useState(true)
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string
    name: string
  } | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products")
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }, [])

  const fetchShopStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/site-config?key=SHOP_ENABLED")
      const data = await res.json()
      setShopEnabled(data.value === 'true')
    } catch (error) {
      console.error("Error fetching shop status:", error)
    }
  }, [])

  const fetchData = useCallback(async () => {
    await Promise.all([
      fetchProducts(),
      fetchShopStatus(),
    ])
    setLoading(false)
  }, [fetchProducts, fetchShopStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    
    // Transform variants to API format (size + stock instead of quantity)
    const sizes = editingProduct.hasSizes 
      ? (editingProduct.variants || []).map(v => ({
          id: v.id,
          size: v.size,
          stock: v.quantity, // API expects 'stock', frontend uses 'quantity'
        }))
      : undefined
    
    const bodyData = {
      ...editingProduct,
      hasSizes: editingProduct.hasSizes,
      hasSizesChanged: editingProduct.hasSizesChanged,
      sizes,
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

  const handleDeleteProduct = (id: string, name: string) => {
    setDeleteConfirm({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    const res = await fetch(`/api/admin/products?id=${deleteConfirm.id}`, {
      method: "DELETE",
    })
    if (res.ok) fetchProducts()
    setDeleteConfirm(null)
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
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product.id} className={`bg-white rounded-2xl shadow-card overflow-hidden ${!product.isActive ? 'opacity-60' : ''}`}>
              <div className="relative aspect-square bg-brand-light-gray">
                <Image
                  src={product.image.startsWith('data:') ? product.image : `${product.image}${product.image.includes('?') ? '&' : '?'}t=${product.id}`}
                  alt={product.name}
                  fill
                  unoptimized={product.image.startsWith('data:')}
                  className="object-cover"
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
                      onClick={() => {
                        // Ensure variants is always an array and initialize missing sizes with 0
                        const variants = product.variants || []
                        // For products with sizes, ensure all SIZES are present in variants
                        const completeVariants = product.hasSizes 
                          ? SIZES.map(size => {
                              const existing = variants.find((v: ProductVariant) => v.size === size)
                              return existing || { size, quantity: 0 }
                            })
                          : variants
                        
                        setEditingProduct({ 
                          ...product, 
                          variants: completeVariants,
                          stock: product.hasSizes ? undefined : (variants[0]?.quantity || 0),
                          originalHasSizes: product.hasSizes,
                          hasSizesChanged: false,
                        })
                      }}
                      className="p-1.5 text-brand-gray hover:text-brand-primary"
                      aria-label={`Modifica ${product.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      className="p-1.5 text-brand-gray hover:text-red-500"
                      aria-label={`Elimina ${product.name}`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-headline-sm font-bold text-brand-dark mb-4">
              {editingProduct.id ? "Modifica Prodotto" : "Nuovo Prodotto"}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="product-name" className="block text-label-md text-brand-gray mb-2">
                  Nome (Italiano)
                </label>
                <input
                  id="product-name"
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="product-name-en" className="block text-label-md text-brand-gray mb-2">
                  Nome (English)
                </label>
                <input
                  id="product-name-en"
                  type="text"
                  value={editingProduct.nameEn || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nameEn: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="product-desc-it" className="block text-label-md text-brand-gray mb-2">
                  Descrizione (IT)
                </label>
                <textarea
                  id="product-desc-it"
                  value={editingProduct.descriptionIt || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, descriptionIt: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none min-h-[60px]"
                />
              </div>
              <div>
                <label htmlFor="product-desc-en" className="block text-label-md text-brand-gray mb-2">
                  Descrizione (EN)
                </label>
                <textarea
                  id="product-desc-en"
                  value={editingProduct.descriptionEn || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, descriptionEn: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none min-h-[60px]"
                />
              </div>
              <div>
                <label htmlFor="product-price" className="block text-label-md text-brand-gray mb-2">
                  Prezzo (€)
                </label>
                <input
                  id="product-price"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={editingProduct.price || 0}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, price: parseNumber(e.target.value) })
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
              <label htmlFor="product-has-sizes" className="flex items-center gap-2">
                <input
                  id="product-has-sizes"
                  type="checkbox"
                  checked={editingProduct.hasSizes ?? true}
                  onChange={(e) => {
                    const newHasSizes = e.target.checked;
                    setEditingProduct({ 
                      ...editingProduct, 
                      hasSizes: newHasSizes,
                      hasSizesChanged: editingProduct.originalHasSizes !== undefined && editingProduct.originalHasSizes !== newHasSizes,
                      variants: newHasSizes 
                        ? SIZES.map((size) => ({ size, quantity: 0 }))
                        : [{ size: "UNIQUE", quantity: editingProduct.stock || 0 }]
                    })
                  }}
                  className="w-5 h-5 rounded border-2 border-brand-light-gray text-brand-primary focus:ring-brand-primary"
                />
                <span className="text-body-md text-brand-dark">Prodotto con taglie (S, M, L, XL)</span>
              </label>

              {/* Stock per singolo prodotto */}
              {!editingProduct.hasSizes && (
                <div>
                  <label htmlFor="product-stock" className="block text-label-md text-brand-gray mb-2">
                    Quantità disponibile
                  </label>
                  <input
                    id="product-stock"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    value={editingProduct.stock || 0}
                    onChange={(e) => {
                      const quantity = parseInt(e.target.value) || 0
                      setEditingProduct({ 
                        ...editingProduct, 
                        stock: quantity,
                        variants: [{ size: "UNIQUE", quantity }]
                      })
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                  />
                </div>
              )}

              {/* Varianti per taglie */}
              {editingProduct.hasSizes && (
                <div>
                  <label className="block text-label-md text-brand-gray mb-2">
                    Quantità per taglia
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map((size) => (
                      <div key={size}>
                        <label className="block text-label-sm text-brand-gray mb-1">
                          {size}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={getVariantQuantity(size)}
                          onChange={(e) =>
                            handleVariantChange(size, parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-brand-light-gray text-brand-gray font-medium hover:bg-brand-light-gray/30 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveProduct}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-headline-sm font-bold text-brand-dark mb-2">
              Conferma eliminazione
            </h3>
            <p className="text-body-md text-brand-gray mb-6">
              Sei sicuro di voler eliminare &quot;{deleteConfirm.name}&quot;?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-brand-light-gray text-brand-gray font-medium hover:bg-brand-light-gray/30 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
