"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Gift } from "lucide-react"

interface GiftCardTemplate {
  id: string
  value: number
  price: number
  isActive: boolean
}

export default function GiftCardConfigPage() {
  const [templates, setTemplates] = useState<GiftCardTemplate[]>([])
  const [editingTemplate, setEditingTemplate] = useState<Partial<GiftCardTemplate> | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string
    value: number
  } | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gift-card-templates")
      const data = await res.json()
      setTemplates(data)
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return

    const method = editingTemplate.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/gift-card-templates", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingTemplate),
    })

    if (res.ok) {
      setEditingTemplate(null)
      fetchTemplates()
    }
  }

  const handleDeleteTemplate = (id: string, value: number) => {
    setDeleteConfirm({ id, value })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    const res = await fetch(`/api/admin/gift-card-templates?id=${deleteConfirm.id}`, {
      method: "DELETE",
    })
    if (res.ok) fetchTemplates()
    setDeleteConfirm(null)
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
          <Link href="/admin" className="p-2 -ml-2 relative z-10">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-title-md sm:text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2 text-center w-full px-12">
            Negozio - Tagli Gift Card
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        {/* Add Template Button */}
        <button
          onClick={() => setEditingTemplate({})}
          className="btn-primary mb-6 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuovo Taglio
        </button>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl shadow-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-headline-md font-bold text-brand-primary">
                    {template.value.toFixed(0)}€
                  </h3>
                  <p className="text-body-sm text-brand-gray">
                    Prezzo: {template.price.toFixed(2)}€
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-2 text-brand-gray hover:text-brand-primary"
                    aria-label={`Modifica taglio ${template.value}€`}
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id, template.value)}
                    className="p-2 text-brand-gray hover:text-red-500"
                    aria-label={`Elimina taglio ${template.value}€`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {!template.isActive && (
                <span className="px-2 py-1 bg-red-100 text-red-600 text-label-sm rounded-full">
                  Inattivo
                </span>
              )}
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <p className="text-center text-brand-gray py-12">
            Nessun taglio disponibile
          </p>
        )}
      </div>

      {/* Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-headline-sm font-bold text-brand-dark mb-4">
              {editingTemplate.id ? "Modifica Taglio" : "Nuovo Taglio"}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="template-value" className="block text-label-md text-brand-gray mb-2">
                  Valore (€)
                </label>
                <input
                  id="template-value"
                  type="number"
                  inputMode="decimal"
                  step="1"
                  value={editingTemplate.value || 0}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      value: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="template-price" className="block text-label-md text-brand-gray mb-2">
                  Prezzo di vendita (€)
                </label>
                <input
                  id="template-price"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={editingTemplate.price || 0}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingTemplate(null)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-brand-light-gray text-brand-gray font-medium hover:bg-brand-light-gray/30 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveTemplate}
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
              Sei sicuro di voler eliminare il taglio da {deleteConfirm.value}€?
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
