"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { ArrowLeft, Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown, Power, AlertCircle } from "lucide-react"
import { AlcoholLevelPreview } from "@/components/AlcoholIndicator"

// Helper to parse number with both comma and dot as decimal separator
const parseNumber = (value: string): number => {
  if (!value) return 0
  // Replace comma with dot for European decimal format, then parse
  const normalized = value.replace(',', '.')
  return parseFloat(normalized) || 0
}

interface Cocktail {
  id?: string
  nameIt: string
  nameEn: string
  ingredientsIt?: string | null
  ingredientsEn?: string | null
  descriptionIt?: string | null
  descriptionEn?: string | null
  price: number
  alcoholLevel?: number | null
  isActive?: boolean
  categoryId?: string
}

interface Category {
  id: string
  nameIt: string
  nameEn: string
  macroCategoryIt: string | null
  macroCategoryEn: string | null
  showAlcoholLevel: boolean
  isActive: boolean
  order: number
  cocktails: Cocktail[]
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null)
  const [editingCocktail, setEditingCocktail] = useState<Cocktail | null>(null)
  const [menuEnabled, setMenuEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'category' | 'cocktail', id: string, name: string} | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchMenuStatus()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories")
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMenuStatus = async () => {
    try {
      const res = await fetch("/api/site-config?key=MENU_ENABLED")
      const data = await res.json()
      setMenuEnabled(data.value === 'true')
    } catch (error) {
      console.error("Error fetching menu status:", error)
    }
  }

  const toggleMenu = async () => {
    const newStatus = !menuEnabled
    try {
      const res = await fetch("/api/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "MENU_ENABLED", value: newStatus ? "true" : "false" }),
      })
      if (res.ok) {
        setMenuEnabled(newStatus)
      }
    } catch (error) {
      console.error("Error toggling menu:", error)
    }
  }

  const validateCategory = (cat: Partial<Category>): boolean => {
    const errors: Record<string, string> = {}
    
    if (!cat.nameIt?.trim()) {
      errors.nameIt = "Il nome italiano è obbligatorio"
    }
    if (!cat.nameEn?.trim()) {
      errors.nameEn = "Il nome inglese è obbligatorio"
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateCocktail = (cocktail: Cocktail, category: Category | null | undefined): boolean => {
    const errors: Record<string, string> = {}
    
    if (!cocktail.nameIt?.trim()) {
      errors.nameIt = "Il nome italiano è obbligatorio"
    }
    if (!cocktail.nameEn?.trim()) {
      errors.nameEn = "Il nome inglese è obbligatorio"
    }
    if (cocktail.price === undefined || cocktail.price === null || cocktail.price < 0) {
      errors.price = "Il prezzo è obbligatorio"
    }
    if (category?.showAlcoholLevel && (cocktail.alcoholLevel === undefined || cocktail.alcoholLevel === null)) {
      errors.alcoholLevel = "Il livello alcolico è obbligatorio"
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveCategory = async () => {
    if (!editingCategory) return
    
    if (!validateCategory(editingCategory)) return

    setError(null)
    const method = editingCategory.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingCategory),
    })

    if (res.ok) {
      setEditingCategory(null)
      setFieldErrors({})
      fetchCategories()
    } else {
      const data = await res.json()
      setError(data.error || "Errore durante il salvataggio")
    }
  }

  const handleDeleteCategory = (id: string, name: string) => {
    setDeleteConfirm({ type: 'category', id, name })
  }

  const handleDeleteCocktail = (id: string, name: string) => {
    setDeleteConfirm({ type: 'cocktail', id, name })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    const { type, id } = deleteConfirm
    const endpoint = type === 'category' 
      ? `/api/admin/categories?id=${id}`
      : `/api/admin/cocktails?id=${id}`

    const res = await fetch(endpoint, { method: "DELETE" })

    if (res.ok) {
      fetchCategories()
    }
    setDeleteConfirm(null)
  }

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === categories.length - 1) return

    const newCategories = [...categories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    const temp = newCategories[index]
    newCategories[index] = newCategories[targetIndex]
    newCategories[targetIndex] = temp

    const updates = newCategories.map((cat, idx) => ({
      id: cat.id,
      order: idx,
    }))

    try {
      await Promise.all(
        updates.map(update =>
          fetch("/api/admin/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: update.id,
              order: update.order,
            }),
          })
        )
      )
      fetchCategories()
    } catch (error) {
      console.error("Error reordering:", error)
    }
  }

  const handleSaveCocktail = async () => {
    if (!editingCocktail) return
    
    const category = getCategoryForCocktail()
    if (!validateCocktail(editingCocktail, category)) return

    setError(null)
    const method = editingCocktail.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/cocktails", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingCocktail),
    })

    if (res.ok) {
      setEditingCocktail(null)
      setFieldErrors({})
      fetchCategories()
    } else {
      const data = await res.json()
      setError(data.error || "Errore durante il salvataggio")
    }
  }



  const getCategoryForCocktail = () => {
    if (!editingCocktail?.categoryId) return null
    return categories.find(c => c.id === editingCocktail.categoryId)
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
          <Link href="/admin" className="p-2 -ml-2 relative z-10">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Gestione Menu
          </h1>
        </div>
      </header>

      <div className="p-4">
        {/* Menu Toggle - Stile unificato con Shop */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-title-md font-bold text-brand-dark">
                {menuEnabled ? 'Menu Attivo' : 'Menu Chiuso'}
              </h2>
              <p className="text-body-sm text-brand-gray">
                {menuEnabled 
                  ? 'Il menu è visibile ai clienti' 
                  : 'Il menu è nascosto, i clienti vedranno il messaggio di chiusura'}
              </p>
            </div>
            <button
              onClick={toggleMenu}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                menuEnabled 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <Power className="w-4 h-4 inline mr-2" />
              {menuEnabled ? 'Chiudi Menu' : 'Apri Menu'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Add Category Button */}
        <button
          onClick={() => {
            const maxOrder = categories.length > 0 
              ? Math.max(...categories.map(c => c.order)) 
              : -1
            setEditingCategory({ 
              nameIt: "", 
              nameEn: "", 
              macroCategoryIt: null, 
              macroCategoryEn: null,
              showAlcoholLevel: true,
              order: maxOrder + 1
            })
            setFieldErrors({})
            setError(null)
          }}
          className="btn-primary mb-6 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuova Sezione
        </button>

        {/* Categories */}
        <div className="space-y-6">
          {categories.map((category, index) => (
            <div key={category.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="p-4 bg-brand-light-gray/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-headline-sm font-bold text-brand-dark">
                      {category.nameIt}
                    </h2>
                    <span className="text-body-sm text-brand-gray">/ {category.nameEn}</span>
                    {(category.macroCategoryIt || category.macroCategoryEn) && (
                      <div className="text-label-sm text-brand-primary mt-1">
                        {category.macroCategoryIt} {category.macroCategoryEn && `/ ${category.macroCategoryEn}`}
                        {!category.showAlcoholLevel && " • Senza Alcohol"}
                      </div>
                    )}
                  </div>
                  {!category.isActive && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-label-sm rounded-full">
                      Inattiva
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveCategory(index, 'up')}
                    disabled={index === 0}
                    className="p-2 text-brand-gray hover:text-brand-primary disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveCategory(index, 'down')}
                    disabled={index === categories.length - 1}
                    className="p-2 text-brand-gray hover:text-brand-primary disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(category)
                      setFieldErrors({})
                      setError(null)
                    }}
                    className="p-2 text-brand-gray hover:text-brand-primary"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id, category.nameIt)}
                    className="p-2 text-brand-gray hover:text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-title-md font-bold text-brand-dark">
                    {category.macroCategoryIt || 'Prodotto'}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingCocktail({
                        categoryId: category.id,
                        nameIt: "",
                        nameEn: "",
                        price: 10,
                        alcoholLevel: category.showAlcoholLevel ? 5 : undefined,
                      })
                      setFieldErrors({})
                      setError(null)
                    }}
                    className="btn-outline flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi
                  </button>
                </div>

                <div className="space-y-2">
                  {category.cocktails.map((cocktail) => (
                    <div
                      key={cocktail.id}
                      className="flex items-center justify-between p-3 bg-brand-cream rounded-xl"
                    >
                      <div>
                        <h4 className="font-medium text-brand-dark">{cocktail.nameIt}</h4>
                        <p className="text-body-sm text-brand-gray">
                          {cocktail.price.toFixed(2)}€
                          {category.showAlcoholLevel && cocktail.alcoholLevel !== undefined && ` • Alcohol: ${cocktail.alcoholLevel}/10`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCocktail({ ...cocktail, categoryId: category.id })
                            setFieldErrors({})
                            setError(null)
                          }}
                          className="p-2 text-brand-gray hover:text-brand-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => cocktail.id && handleDeleteCocktail(cocktail.id, cocktail.nameIt)}
                          className="p-2 text-brand-gray hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-headline-sm font-bold text-brand-dark mb-4">
              {editingCategory.id ? "Modifica Sezione" : "Nuova Sezione"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Nome (IT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.nameIt || ""}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, nameIt: e.target.value })
                  }
                  className={`input-field ${fieldErrors.nameIt ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                />
                {fieldErrors.nameIt && (
                  <p className="text-red-500 text-label-sm mt-1">{fieldErrors.nameIt}</p>
                )}
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Nome (EN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.nameEn || ""}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, nameEn: e.target.value })
                  }
                  className={`input-field ${fieldErrors.nameEn ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                />
                {fieldErrors.nameEn && (
                  <p className="text-red-500 text-label-sm mt-1">{fieldErrors.nameEn}</p>
                )}
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Macrocategoria (IT)
                </label>
                <input
                  type="text"
                  value={editingCategory.macroCategoryIt ?? ""}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, macroCategoryIt: e.target.value })
                  }
                  className="input-field"
                  placeholder="es. Cocktail, Food, Birre..."
                />
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Macrocategoria (EN)
                </label>
                <input
                  type="text"
                  value={editingCategory.macroCategoryEn ?? ""}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, macroCategoryEn: e.target.value })
                  }
                  className="input-field"
                  placeholder="es. Cocktail, Food, Beers..."
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingCategory.showAlcoholLevel ?? true}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, showAlcoholLevel: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-brand-gray text-brand-primary"
                />
                <span className="text-body-md text-brand-dark">Mostra livello alcolico</span>
              </label>
              {editingCategory.id && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingCategory.isActive}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, isActive: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-brand-gray text-brand-primary"
                  />
                  <span className="text-body-md text-brand-dark">Attiva</span>
                </label>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveCategory} className="btn-primary flex-1">
                <Save className="w-5 h-5 inline mr-2" />
                Salva
              </button>
              <button
                onClick={() => {
                  setEditingCategory(null)
                  setFieldErrors({})
                  setError(null)
                }}
                className="btn-secondary flex-1"
              >
                <X className="w-5 h-5 inline mr-2" />
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cocktail Modal */}
      {editingCocktail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-headline-sm font-bold text-brand-dark mb-4">
              {editingCocktail.id ? "Modifica Cocktail" : "Nuovo Cocktail"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Nome (IT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCocktail.nameIt || ""}
                  onChange={(e) =>
                    setEditingCocktail({ ...editingCocktail, nameIt: e.target.value })
                  }
                  className={`input-field ${fieldErrors.nameIt ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                />
                {fieldErrors.nameIt && (
                  <p className="text-red-500 text-label-sm mt-1">{fieldErrors.nameIt}</p>
                )}
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Nome (EN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCocktail.nameEn || ""}
                  onChange={(e) =>
                    setEditingCocktail({ ...editingCocktail, nameEn: e.target.value })
                  }
                  className={`input-field ${fieldErrors.nameEn ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                />
                {fieldErrors.nameEn && (
                  <p className="text-red-500 text-label-sm mt-1">{fieldErrors.nameEn}</p>
                )}
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Ingredienti (IT)
                </label>
                <textarea
                  value={editingCocktail.ingredientsIt || ""}
                  onChange={(e) =>
                    setEditingCocktail({ ...editingCocktail, ingredientsIt: e.target.value })
                  }
                  className="input-field min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Ingredienti (EN)
                </label>
                <textarea
                  value={editingCocktail.ingredientsEn || ""}
                  onChange={(e) =>
                    setEditingCocktail({ ...editingCocktail, ingredientsEn: e.target.value })
                  }
                  className="input-field min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Prezzo (€) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={editingCocktail.price ?? ""}
                  onChange={(e) =>
                    setEditingCocktail({ ...editingCocktail, price: parseNumber(e.target.value) })
                  }
                  className={`input-field ${fieldErrors.price ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                />
                {fieldErrors.price && (
                  <p className="text-red-500 text-label-sm mt-1">{fieldErrors.price}</p>
                )}
              </div>
              {getCategoryForCocktail()?.showAlcoholLevel && (
                <div>
                  <label className="block text-label-md text-brand-gray mb-2">
                    Livello Alcolico (0-10) <span className="text-red-500">*</span>
                  </label>
                  <div className="mb-2">
                    <AlcoholLevelPreview level={editingCocktail.alcoholLevel} />
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="10"
                    step="1"
                    value={editingCocktail.alcoholLevel ?? ""}
                    onChange={(e) =>
                      setEditingCocktail({
                        ...editingCocktail,
                        alcoholLevel: Math.floor(parseNumber(e.target.value)) || 0,
                      })
                    }
                    className={`input-field ${fieldErrors.alcoholLevel ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                  />
                  {fieldErrors.alcoholLevel && (
                    <p className="text-red-500 text-label-sm mt-1">{fieldErrors.alcoholLevel}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveCocktail} className="btn-primary flex-1">
                <Save className="w-5 h-5 inline mr-2" />
                Salva
              </button>
              <button
                onClick={() => {
                  setEditingCocktail(null)
                  setFieldErrors({})
                  setError(null)
                }}
                className="btn-secondary flex-1"
              >
                <X className="w-5 h-5 inline mr-2" />
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-headline-sm font-bold text-brand-dark mb-2">
                Elimina {deleteConfirm.type === 'category' ? 'Sezione' : 'Cocktail'}
              </h3>
              <p className="text-body-md text-brand-gray">
                Sei sicuro di voler eliminare <strong>{deleteConfirm.name}</strong>? L&apos;azione non può essere annullata.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 px-4 bg-brand-light-gray/50 text-brand-dark rounded-full font-medium hover:bg-brand-light-gray transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors"
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
