"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children?: React.ReactNode
}

export function Dialog({ isOpen, onClose, title, description, children }: DialogProps) {
  // Chiudi con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEsc)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - stile QR scanner */}
      <div 
        className="absolute inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light-gray">
          <div>
            <h3 className="text-headline-sm font-bold text-brand-dark">{title}</h3>
            {description && (
              <p className="text-body-sm text-brand-gray mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-brand-gray hover:text-brand-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps extends Omit<DialogProps, "children"> {
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: "primary" | "danger"
  onConfirm: () => void
}

export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  confirmVariant = "primary",
  onConfirm
}: ConfirmDialogProps) {
  const confirmBtnClass = confirmVariant === "danger"
    ? "bg-red-500 hover:bg-red-600 text-white"
    : "bg-brand-primary hover:bg-brand-dark text-white"

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      {description && (
        <p className="text-body-md text-brand-dark mb-6">{description}</p>
      )}
      
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-body-sm font-medium text-brand-dark bg-brand-light-gray hover:bg-brand-gray/20 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={`px-4 py-2.5 rounded-xl text-body-sm font-medium transition-colors ${confirmBtnClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
