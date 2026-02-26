"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Mail, Shield, Bell, X, User } from "lucide-react"
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
    // Prevent deletion if there's only one admin
    if (admins.length <= 1) {
      showToast("Deve rimanere almeno un admin", "error")
      setDeleteConfirm(null)
      return
    }

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
            href="/admin/settings"
            className="px-6 py-3 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-colors"
          >
            Torna alle Impostazioni
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
          <Link href="/admin/settings" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Gestione Utenti
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">

        {/* Lista Admin */}
        <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title-lg font-bold text-brand-dark flex items-center gap-2">
              <User className="w-5 h-5 text-brand-primary" />
              Utenti
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Aggiungi
            </button>
          </div>

          <div className="space-y-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="bg-brand-cream/50 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-title-md font-bold text-brand-dark">
                        {admin.name || admin.email.split('@')[0]}
                      </h3>
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
                    disabled={admins.length <= 1}
                    className="p-2 text-brand-gray hover:text-red-500 transition-colors disabled:opacity-30"
                    title="Rimuovi admin"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-title-lg font-bold text-brand-dark">
                Aggiungi Admin
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-brand-light-gray rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-brand-gray" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="admin@esempio.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-label-md text-brand-gray mb-2">
                  Nome (opzionale)
                </label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  placeholder="Mario Rossi"
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
                  <span className="text-body-sm text-brand-dark">Riceve notifiche email</span>
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

              <button
                onClick={handleAddAdmin}
                className="btn-primary w-full"
              >
                Aggiungi Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteAdmin(deleteConfirm)}
        title="Rimuovi Admin"
        description="Sei sicuro di voler rimuovere questo admin? L'azione non può essere annullata."
        confirmLabel="Rimuovi"
        cancelLabel="Annulla"
        confirmVariant="danger"
      />

      {/* Toast */}
      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={hideToast} />
    </main>
  )
}
