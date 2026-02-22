"use client"

import { useEffect } from "react"
import { CheckCircle, XCircle, X, AlertCircle } from "lucide-react"

export type ToastType = "success" | "error" | "info"

interface ToastProps {
  isOpen: boolean
  message: string
  type?: ToastType
  onClose: () => void
  duration?: number // ms, default 3000
}

export function Toast({ 
  isOpen, 
  message, 
  type = "success", 
  onClose, 
  duration = 3000 
}: ToastProps) {
  // Auto close
  useEffect(() => {
    if (!isOpen) return
    
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    
    return () => clearTimeout(timer)
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />
  }

  const bgColors = {
    success: "bg-white border-green-200",
    error: "bg-white border-red-200",
    info: "bg-white border-blue-200"
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 pointer-events-none">
      <div 
        className={`
          pointer-events-auto
          flex items-center gap-3 
          px-5 py-4 rounded-2xl shadow-2xl 
          border-2 ${bgColors[type]}
          animate-in slide-in-from-top-4 fade-in duration-300
        `}
        style={{ minWidth: "320px" }}
      >
        {icons[type]}
        <p className="text-body-sm font-medium text-brand-dark flex-1">
          {message}
        </p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-brand-light-gray rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-brand-gray" />
        </button>
      </div>
    </div>
  )
}

// Hook per gestire il toast
import { useState, useCallback } from "react"

export function useToast() {
  const [toast, setToast] = useState<{
    isOpen: boolean
    message: string
    type: ToastType
  }>({
    isOpen: false,
    message: "",
    type: "success"
  })

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ isOpen: true, message, type })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    toast,
    showToast,
    hideToast
  }
}
