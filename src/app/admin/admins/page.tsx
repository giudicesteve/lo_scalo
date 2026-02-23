"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Mail, Shield, Bell, X, Save } from "lucide-react"
import { ConfirmDialog } from "@/components/Dialog"
import { Toast, useToast } from "@/components/Toast"

interface Admin {
  id: string
  email: string
  name: string | null
  receiveNotifications: boolean
  canManageAdmins: boolean
  createdAt: string
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useToast()

  const [newAdmin, setNewAdmin] = useState({
    email: "",
    name: "",
    receiveNotifications: true,
    canManageAdmins: false,
  })

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins")
      if (res.status === 403) {
        setUnauthorized(true)
        return
      }
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setAdmins(data)
    } catch {
      showToast("Errore nel caricamento admin", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.email) {
      showToast("Inserisci un'email valida", "error")
      return
    }

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante l'aggiunta")
      }

      showToast("Admin aggiunto con successo", "success")
      setShowAddModal(false)
      setNewAdmin({
        email: "",
        name: "",
        receiveNotifications: true,
        canManageAdmins: false,
      })
      fetchAdmins()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore", "error")
    }
  }

  const handleDeleteAdmin = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/admins?id=${id}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante l'eliminazione")
      }

      showToast("Admin rimosso con successo", "success")
      fetchAdmins()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore", "error")
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleUpdatePermissions = async (admin: Admin) => {
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          receiveNotifications: admin.receiveNotifications,
          canManageAdmins: admin.canManageAdmins,
        })
      })

      if (!res.ok) throw new Error("Failed to update")

      showToast("Permessi aggiornati", "success")
      fetchAdmins()
    } catch {
      showToast("Errore nell'aggiornamento", "error")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    )
  }

  if (unauthorized) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-brand-gray mx-auto mb-4" />
          <h1 className="text-headline-lg font-bold text-brand-dark mb-2">
            Accesso Negato
          </h1>
          <p className="text-body-lg text-brand-gray mb-6">
            Non hai i permessi per gestire gli admin.
          </p>
          <Link
            href="/admin"
            className="px-6 py-3 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-colors"
          >
            Torna alla Dashboard
          </Link>
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
            Gestione Admin
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <p className="text-body-sm text-blue-700">
            <Shield className="w-4 h-4 inline mr-2" />
            Solo gli admin con il permesso &quot;Gestione Admin&quot; possono vedere questa pagina.
          </p>
        </div>

        {/* Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary mb-6 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Aggiungi Admin
        </button>

        {/* Lista Admin */}
        <div className="space-y-4">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="bg-white rounded-2xl shadow-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-title-md font-bold text-brand-dark">
                      {admin.name || admin.email.split('@')[0]}
                    </h2>
                    {admin.canManageAdmins && (
                      <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-label-sm rounded-full">
                        Super Admin
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-brand-gray flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {admin.email}
                  </p>

                  {/* Permessi */}
                  <div className="flex flex-wrap gap-4 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={admin.receiveNotifications}
                        onChange={(e) => {
                          const updated = { ...admin, receiveNotifications: e.target.checked }
                          handleUpdatePermissions(updated)
                        }}
                        className="w-4 h-4 rounded border-brand-gray text-brand-primary"
                      />
                      <span className="text-label-sm text-brand-gray flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        Riceve notifiche
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={admin.canManageAdmins}
                        onChange={(e) => {
                          const updated = { ...admin, canManageAdmins: e.target.checked }
                          handleUpdatePermissions(updated)
                        }}
                        className="w-4 h-4 rounded border-brand-gray text-brand-primary"
                      />
                      <span className="text-label-sm text-brand-gray flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Gestione Admin
                      </span>
                    </label>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => setDeleteConfirm(admin.id)}
                  className="p-2 text-brand-gray hover:text-red-500 transition-colors"
                  title="Rimuovi"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {admins.length === 0 && (
          <p className="text-center text-brand-gray py-12">
            Nessun admin registrato
          </p>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-headline-sm font-bold text-brand-dark">
                Aggiungi Admin
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 -mr-2 text-brand-gray hover:text-brand-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="nome@esempio.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
                <p className="text-label-sm text-brand-gray mt-1">
                  L&apos;utente dovrà accedere con Google usando questa email.
                </p>
              </div>

              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Nome (opzionale)
                </label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  placeholder="Nome visualizzato"
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAdmin.receiveNotifications}
                    onChange={(e) => setNewAdmin({ ...newAdmin, receiveNotifications: e.target.checked })}
                    className="w-4 h-4 rounded border-brand-gray text-brand-primary"
                  />
                  <span className="text-body-sm text-brand-dark">Riceve notifiche ordini</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAdmin.canManageAdmins}
                    onChange={(e) => setNewAdmin({ ...newAdmin, canManageAdmins: e.target.checked })}
                    className="w-4 h-4 rounded border-brand-gray text-brand-primary"
                  />
                  <span className="text-body-sm text-brand-dark">Può gestire altri admin</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-brand-dark text-brand-dark font-medium hover:bg-brand-dark hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleAddAdmin}
                className="flex-1 px-6 py-3 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Conferma rimozione"
        description="Sei sicuro di voler rimuovere questo admin? L'utente non potrà più accedere all'area admin."
        confirmLabel="Rimuovi"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDeleteAdmin(deleteConfirm)}
      />

      {/* Toast */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
        duration={4000}
      />
    </main>
  )
}
