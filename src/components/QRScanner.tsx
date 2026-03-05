"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { X, Camera } from "lucide-react"

interface QRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

// Funzione per fermare tutte le tracce video
function stopAllVideoTracks() {
  try {
    // Ferma tutti i media stream attivi
    const videos = document.querySelectorAll('video')
    videos.forEach(video => {
      // Sopprimi errori di abort
      video.onabort = null
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach(track => {
          track.stop()
        })
        video.srcObject = null
      }
    })
  } catch (e) {
    // Ignora silenziosamente
  }
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)

  // Funzione per fermare e pulire lo scanner
  const cleanupScanner = useCallback(async () => {
    // Ferma lo scanner html5-qrcode
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {
        // Ignora
      }
      try {
        await scannerRef.current.clear()
      } catch {
        // Ignora
      }
      scannerRef.current = null
    }
    
    // Ferma manualmente tutti i video stream
    stopAllVideoTracks()
    
    // Pulisci il container
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initScanner = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Assicurati che il container sia pulito
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        const scanner = new Html5Qrcode("qr-reader")
        scannerRef.current = scanner

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        }

        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (!isMounted) return
            
            const match = decodedText.match(/GC[A-Z0-9]+/)
            const code = match ? match[0] : decodedText
            
            setScannedCode(code)
            
            setTimeout(async () => {
              await cleanupScanner()
              onScan(code)
            }, 1500)
          },
          () => {
            // Ignora errori di scansione
          }
        )

        if (isMounted) {
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Errore scanner:", err)
        if (!isMounted) return
        
        let msg = "Impossibile accedere alla fotocamera."
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            msg = "Permesso fotocamera negato. Concedi l'accesso nelle impostazioni del browser."
          } else if (err.name === "NotFoundError") {
            msg = "Nessuna fotocamera trovata."
          } else if (err.name === "NotReadableError") {
            msg = "Fotocamera occupata da un'altra applicazione."
          }
        }
        
        setError(msg)
        setIsLoading(false)
      }
    }

    initScanner()

    return () => {
      isMounted = false
      cleanupScanner()
    }
  }, [onScan, cleanupScanner])

  const handleClose = async () => {
    await cleanupScanner()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
      <div className="bg-white rounded-3xl p-4 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-lg font-bold text-gray-900">
            Scansiona QR Code
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Chiudi"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Scanner Container */}
        <div 
          className="relative rounded-xl overflow-hidden bg-black" 
          style={{ aspectRatio: "1/1" }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="w-10 h-10 border-3 border-gray-300 border-t-orange-500 rounded-full animate-spin mb-3" />
              <p className="text-sm">Avvio fotocamera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
              <Camera className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-red-400 font-medium mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600"
              >
                Riprova
              </button>
            </div>
          )}

          {scannedCode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-10">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <p className="text-xl font-bold mb-2">Codice letto!</p>
              <p className="text-orange-400 font-mono text-lg bg-orange-400/10 px-4 py-2 rounded-lg">
                {scannedCode}
              </p>
            </div>
          )}

          {/* Container per html5-qrcode */}
          <div 
            id="qr-reader" 
            ref={containerRef}
            className={`w-full h-full ${(isLoading || error || scannedCode) ? 'opacity-0' : 'opacity-100'}`} 
          />
        </div>

        {!isLoading && !error && !scannedCode && (
          <p className="text-center text-gray-600 mt-3 font-medium text-sm">
            Inquadra il QR Code della Gift Card
          </p>
        )}
      </div>
    </div>
  )
}
