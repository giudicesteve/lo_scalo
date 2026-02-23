"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from "lucide-react"

interface GiftCardTemplate {
  id: string
  value: number
  price: number
  isActive: boolean
}

export default function AdminGiftCardTemplatesPage() {
  const [templates, setTemplates] = useState<GiftCardTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<Partial<GiftCardTemplate> | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/gift-card-templates")
      const data = await res.json()
      setTemplates(data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching templates:", error)
      setLoading(false)
    }
  }

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

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo taglio?")) return

    const res = await fetch(`/api/admin/gift-card-templates?id=${id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      fetchTemplates()
    }
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
            Tagli Gift Card
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={() => setEditingTemplate({ value: 50, price: 50 })}
          className="btn-primary mb-6 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuovo Taglio
        </button>

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
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-brand-gray hover:text-red-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-headline-sm font-bold text-brand-dark mb-4">
              {editingTemplate.id ? "Modifica Taglio" : "Nuovo Taglio"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Valore (€)
                </label>
                <input
                  type="number"
                  step="1"
                  value={editingTemplate.value || ""}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      value: parseFloat(e.target.value),
                    })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Prezzo vendita (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTemplate.price || ""}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="input-field"
                />
              </div>
              {editingTemplate.id && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isActive}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-brand-gray text-brand-primary"
                  />
                  <span className="text-body-md text-brand-dark">Attivo</span>
                </label>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveTemplate} className="btn-primary flex-1">
                <Save className="w-5 h-5 inline mr-2" />
                Salva
              </button>
              <button
                onClick={() => setEditingTemplate(null)}
                className="btn-secondary flex-1"
              >
                <X className="w-5 h-5 inline mr-2" />
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
