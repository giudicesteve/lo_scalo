"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Logo } from "@/components/Logo"
import { AlertCircle } from "lucide-react"
import Image from "next/image"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"

  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      setError("")
      await signIn("google", { callbackUrl })
    } catch {
      setError("Si è verificato un errore durante l'accesso. Riprova.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-4">
      {/* Card Login */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-card p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo variant="vertical" className="h-12 w-auto mb-4" />
          <h1 className="text-headline-md font-bold text-brand-dark">
            Accesso Admin
          </h1>
          <p className="text-body-sm text-brand-gray mt-2 text-center">
            Accedi con il tuo account Google autorizzato
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-body-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Access Denied Error from URL */}
        {searchParams.get("error") === "AccessDenied" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-body-sm text-red-600">
              Questa email non è autorizzata ad accedere all&apos;area admin.
              Contatta l&apos;amministratore del sistema.
            </p>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-brand-light-gray hover:border-brand-primary text-brand-dark font-semibold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Image
              src="/resources/Google logo.svg"
              alt="Google"
              width={20}
              height={20}
              className="w-5 h-5"
            />
          )}
          {isLoading ? "Accesso in corso..." : "Accedi con Google"}
        </button>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-body-sm text-brand-gray hover:text-brand-primary transition-colors"
          >
            Torna al sito
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-body-xs text-brand-gray">
        Lo Scalo - Area riservata
      </p>
    </main>
  )
}
