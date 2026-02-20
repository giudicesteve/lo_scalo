"use client"

import { useEffect, useCallback } from "react"
import { X } from "lucide-react"

interface QRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'scanned') {
      onScan(event.data.code)
    }
  }, [onScan])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
    >
      <div className="bg-white rounded-3xl p-4 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-lg font-bold text-gray-900">
            Scansiona QR Code
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        {/* Iframe con lo scanner */}
        <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '1/1'  }}>
          <iframe
            src="/qr-scanner.html"
            className="w-full h-full border-0"
            allow="camera"
            title="QR Scanner"
          />
        </div>
        
        <p className="text-center text-gray-800 mt-3 font-bold text-sm">
          Inquadra il QR Code
        </p>
      </div>
    </div>
  )
}
