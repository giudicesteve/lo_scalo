"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import CartContent from "./CartContent"

function Loading() {
  return (
    <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
      <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
      <p className="mt-4 text-brand-gray">Caricamento...</p>
    </main>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CartContent />
    </Suspense>
  )
}
