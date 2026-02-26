"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Eye, Power, X, Save, FileText, Shield, Cookie, Archive } from "lucide-react"
import { ConfirmDialog } from "@/components/Dialog"
import { Toast, useToast } from "@/components/Toast"

type PolicyType = "TERMS" | "PRIVACY" | "COOKIES"

interface PolicyDocument {
  id: string
  type: PolicyType
  version: string
  contentIt: string
  contentEn: string
  isActive: boolean
  isArchived: boolean
  effectiveDate: string
  createdAt: string
  createdBy: string | null
}

const policyLabels: Record<PolicyType, string> = {
  TERMS: "Termini e Condizioni",
  PRIVACY: "Privacy Policy",
  COOKIES: "Cookie Policy",
}

const policyIcons: Record<PolicyType, typeof FileText> = {
  TERMS: Shield,
  PRIVACY: FileText,
  COOKIES: Cookie,
}

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [previewPolicy, setPreviewPolicy] = useState<PolicyDocument | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useToast()

  const [newPolicy, setNewPolicy] = useState({
    type: "TERMS" as PolicyType,
    contentIt: "",
    contentEn: "",
    effectiveDate: new Date().toISOString().split("T")[0],
  })
  const [activeLang, setActiveLang] = useState<"it" | "en">("it")

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/admin/policies")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setPolicies(data)
    } catch (error) {
      console.error("Error fetching policies:", error)
      showToast("Errore nel caricamento delle policy", "error")
    } finally {
      setLoading(false)
    }
  }

  // Revalidate public pages after policy changes
  const revalidatePages = async () => {
    try {
      await fetch("/api/admin/policies/revalidate", { method: "POST" })
    } catch (error) {
      console.error("Error revalidating pages:", error)
    }
  }

  const handleCreate = async () => {
    if (!newPolicy.contentIt.trim() || !newPolicy.contentEn.trim()) {
      showToast("Entrambe le versioni (IT e EN) sono obbligatorie", "error")
      return
    }

    try {
      const version = new Date().toISOString().split("T")[0] // Date-based version
      
      const res = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPolicy,
          version,
        }),
      })

      if (!res.ok) throw new Error("Failed to create")

      showToast("Policy creata con successo", "success")
      setShowCreateModal(false)
      setNewPolicy({
        type: "TERMS",
        contentIt: "",
        contentEn: "",
        effectiveDate: new Date().toISOString().split("T")[0],
      })
      setActiveLang("it")
      fetchPolicies()
      
      // Revalidate public pages
      await revalidatePages()
    } catch (error) {
      console.error("Error creating policy:", error)
      showToast("Errore nella creazione della policy", "error")
    }
  }

  const handleToggleActive = async (id: string, activate: boolean) => {
    try {
      const res = await fetch(`/api/admin/policies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: activate }),
      })

      if (!res.ok) throw new Error("Failed to update")

      showToast(
        activate ? "Policy attivata" : "Policy disattivata",
        "success"
      )
      fetchPolicies()
      
      // Revalidate public pages if activating (affects which content is shown)
      if (activate) {
        await revalidatePages()
      }
    } catch (error) {
      console.error("Error updating policy:", error)
      showToast("Errore nell'aggiornamento", "error")
    }
  }

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/policies/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to archive")
      }

      showToast("Policy archiviata", "success")
      fetchPolicies()
      
      // Revalidate public pages
      await revalidatePages()
    } catch (error) {
      console.error("Error archiving policy:", error)
      const errorMessage = error instanceof Error ? error.message : "Errore nell'archiviazione"
      showToast(errorMessage, "error")
    }
  }

  const groupedPolicies = policies.reduce((acc, policy) => {
    if (!acc[policy.type]) acc[policy.type] = []
    acc[policy.type].push(policy)
    return acc
  }, {} as Record<PolicyType, PolicyDocument[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="text-brand-gray">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center justify-between px-4 py-3 min-h-[64px]">
          <Link href="/admin/settings" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark text-center flex-1 px-2">
            Documenti Legali
          </h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-body-sm text-blue-800">
            <strong>Nota:</strong> Qui puoi gestire le versioni di Termini e Condizioni, Privacy Policy e Cookie Policy. 
            Solo una versione per tipo può essere attiva. Le accettazioni degli utenti vengono tracciate automaticamente durante il checkout.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Documento</span>
          </button>
        </div>
  

        {/* Policy Types */}
        {(["TERMS", "PRIVACY", "COOKIES"] as PolicyType[]).map((type) => {
          const typePolicies = groupedPolicies[type] || []
          const activePolicy = typePolicies.find((p) => p.isActive)
          const Icon = policyIcons[type]

          return (
            <div key={type} className="mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-brand-primary flex-shrink-0" />
                  <h2 className="text-h3 text-brand-dark">{policyLabels[type]}</h2>
                </div>
                {activePolicy ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-body-xs rounded-full w-fit">
                    Attiva: v{activePolicy.version}
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-body-xs rounded-full w-fit">
                    Nessuna versione attiva
                  </span>
                )}
              </div>

              {typePolicies.length === 0 ? (
                <div className="bg-white rounded-xl border border-brand-light-gray p-8 text-center">
                  <p className="text-brand-gray mb-4">
                    Nessuna versione disponibile per {policyLabels[type].toLowerCase()}
                  </p>
                  <button
                    onClick={() => {
                      setNewPolicy((prev) => ({ ...prev, type }))
                      setShowCreateModal(true)
                    }}
                    className="text-brand-primary hover:underline"
                  >
                    Crea la prima versione
                  </button>
                </div>
              ) : (
                <>
                <div className="block sm:hidden space-y-3">
                  {typePolicies.map((policy) => (
                    <div 
                      key={policy.id} 
                      className={`bg-white rounded-xl border p-4 ${
                        policy.isActive 
                          ? "bg-green-50/50 border-green-200" 
                          : "border-brand-light-gray"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-body-sm font-medium text-brand-dark">v{policy.version}</p>
                          <p className="text-label-sm text-brand-gray">
                            {new Date(policy.effectiveDate).toLocaleDateString("it-IT")}
                          </p>
                        </div>
                        {policy.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-body-xs rounded-full">
                            <Power className="w-3 h-3" />
                            Attiva
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-body-xs rounded-full">
                            Inattiva
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-label-sm text-brand-gray truncate max-w-[150px]">
                          {policy.createdBy || "-"}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewPolicy(policy)}
                            className="p-2 text-brand-gray hover:text-brand-primary transition-colors"
                            title="Anteprima"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!policy.isActive && (
                            <button
                              onClick={() => handleToggleActive(policy.id, true)}
                              className="p-2 text-brand-gray hover:text-green-600 transition-colors"
                              title="Attiva"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}
                          {policy.isActive && (
                            <button
                              onClick={() => handleToggleActive(policy.id, false)}
                              className="p-2 text-green-600 hover:text-brand-gray transition-colors"
                              title="Disattiva"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}
                          {!policy.isActive && (
                            <button
                              onClick={() => setArchiveConfirm(policy.id)}
                              className="p-2 text-brand-gray hover:text-orange-500 transition-colors"
                              title="Archivia"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block bg-white rounded-xl border border-brand-light-gray overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-brand-cream border-b border-brand-light-gray">
                      <tr>
                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-brand-gray">Versione</th>
                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-brand-gray">Data effettiva</th>
                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-brand-gray">Creata da</th>
                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-brand-gray">Stato</th>
                        <th className="text-right px-4 py-3 text-body-sm font-semibold text-brand-gray">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-light-gray">
                      {typePolicies.map((policy) => (
                        <tr 
                          key={policy.id} 
                          className={policy.isActive ? "bg-green-50/50" : ""}
                        >
                          <td className="px-4 py-3 text-body-sm text-brand-dark">{policy.version}</td>
                          <td className="px-4 py-3 text-body-sm text-brand-gray">
                            {new Date(policy.effectiveDate).toLocaleDateString("it-IT")}
                          </td>
                          <td className="px-4 py-3 text-body-sm text-brand-gray">{policy.createdBy || "-"}</td>
                          <td className="px-4 py-3">
                            {policy.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-body-xs rounded-full">
                                <Power className="w-3 h-3" />
                                Attiva
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-body-xs rounded-full">
                                Inattiva
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setPreviewPolicy(policy)}
                                className="p-2 text-brand-gray hover:text-brand-primary transition-colors"
                                title="Anteprima"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {!policy.isActive && (
                                <button
                                  onClick={() => handleToggleActive(policy.id, true)}
                                  className="p-2 text-brand-gray hover:text-green-600 transition-colors"
                                  title="Attiva"
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              )}
                              {policy.isActive && (
                                <button
                                  onClick={() => handleToggleActive(policy.id, false)}
                                  className="p-2 text-green-600 hover:text-brand-gray transition-colors"
                                  title="Disattiva"
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              )}
                              {!policy.isActive && (
                                <button
                                  onClick={() => setArchiveConfirm(policy.id)}
                                  className="p-2 text-brand-gray hover:text-orange-500 transition-colors"
                                  title="Archivia"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-brand-light-gray">
              <h3 className="text-h4 text-brand-dark">Nuovo Documento</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-brand-light-gray/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-brand-gray" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-brand-dark mb-2">
                  Tipo di Policy
                </label>
                <select
                  value={newPolicy.type}
                  onChange={(e) =>
                    setNewPolicy((prev) => ({ ...prev, type: e.target.value as PolicyType }))
                  }
                  className="w-full px-4 py-2 border border-brand-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                >
                  <option value="TERMS">Termini e Condizioni</option>
                  <option value="PRIVACY">Privacy Policy</option>
                  <option value="COOKIES">Cookie Policy</option>
                </select>
              </div>
              <div>
                <label className="block text-body-sm font-medium text-brand-dark mb-2">
                  Data di entrata in vigore
                </label>
                <input
                  type="date"
                  value={newPolicy.effectiveDate}
                  onChange={(e) =>
                    setNewPolicy((prev) => ({ ...prev, effectiveDate: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-brand-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
              
              {/* Bilingual Content Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-body-sm font-medium text-brand-dark">
                    Contenuto HTML
                  </label>
                  <div className="flex rounded-lg border border-brand-light-gray overflow-hidden">
                    <button
                      onClick={() => setActiveLang("it")}
                      className={`px-3 py-1 text-body-xs font-medium transition-colors ${
                        activeLang === "it"
                          ? "bg-brand-primary text-white"
                          : "bg-white text-brand-gray hover:text-brand-dark"
                      }`}
                    >
                      🇮🇹 IT
                    </button>
                    <button
                      onClick={() => setActiveLang("en")}
                      className={`px-3 py-1 text-body-xs font-medium transition-colors ${
                        activeLang === "en"
                          ? "bg-brand-primary text-white"
                          : "bg-white text-brand-gray hover:text-brand-dark"
                      }`}
                    >
                      🇬🇧 EN
                    </button>
                  </div>
                </div>
                <p className="text-body-xs text-brand-gray mb-2">
                  Inserisci il contenuto HTML per entrambe le lingue. Usa le classi Tailwind per lo stile.
                </p>
                <textarea
                  value={activeLang === "it" ? newPolicy.contentIt : newPolicy.contentEn}
                  onChange={(e) =>
                    setNewPolicy((prev) => ({
                      ...prev,
                      [activeLang === "it" ? "contentIt" : "contentEn"]: e.target.value,
                    }))
                  }
                  rows={12}
                  className="w-full px-4 py-2 border border-brand-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-mono text-sm"
                  placeholder={activeLang === "it" ? "<div class='prose max-w-none'>...</div>" : "<div class='prose max-w-none'>...</div>"}
                />
                <div className="flex gap-2 mt-2">
                  <span className={`text-label-xs px-2 py-1 rounded ${newPolicy.contentIt ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    🇮🇹 IT {newPolicy.contentIt ? "✓" : "vuoto"}
                  </span>
                  <span className={`text-label-xs px-2 py-1 rounded ${newPolicy.contentEn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    🇬🇧 EN {newPolicy.contentEn ? "✓" : "vuoto"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-brand-light-gray">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-brand-gray hover:text-brand-dark transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
              >
                <Save className="w-4 h-4" />
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewPolicy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-brand-light-gray">
              <div>
                <h3 className="text-h4 text-brand-dark">
                  {policyLabels[previewPolicy.type]} - v{previewPolicy.version}
                </h3>
                <p className="text-body-xs text-brand-gray">
                  Data effettiva: {new Date(previewPolicy.effectiveDate).toLocaleDateString("it-IT")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-brand-light-gray overflow-hidden">
                  <button
                    onClick={() => setActiveLang("it")}
                    className={`px-3 py-1 text-body-xs font-medium transition-colors ${
                      activeLang === "it"
                        ? "bg-brand-primary text-white"
                        : "bg-white text-brand-gray hover:text-brand-dark"
                    }`}
                  >
                    🇮🇹 IT
                  </button>
                  <button
                    onClick={() => setActiveLang("en")}
                    className={`px-3 py-1 text-body-xs font-medium transition-colors ${
                      activeLang === "en"
                        ? "bg-brand-primary text-white"
                        : "bg-white text-brand-gray hover:text-brand-dark"
                    }`}
                  >
                    🇬🇧 EN
                  </button>
                </div>
                <button
                  onClick={() => setPreviewPolicy(null)}
                  className="p-2 hover:bg-brand-light-gray/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-brand-gray" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-brand-cream">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: activeLang === "it" ? previewPolicy.contentIt : previewPolicy.contentEn }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={!!archiveConfirm}
        onClose={() => setArchiveConfirm(null)}
        onConfirm={() => archiveConfirm && handleArchive(archiveConfirm)}
        title="Archivia Policy"
        description="Sei sicuro di voler archiviare questa versione? Verrà nascosta dall'interfaccia ma rimarrà nel database."
        confirmLabel="Archivia"
        cancelLabel="Annulla"
        confirmVariant="primary"
      />

      {/* Toast */}
      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={hideToast} />
    </div>
  )
}
