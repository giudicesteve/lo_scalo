"use client"

import { Suspense } from "react"
import { LoginForm } from "./LoginForm"

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-card p-8">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-brand-light-gray rounded-full animate-pulse mb-4" />
            <div className="h-8 w-48 bg-brand-light-gray rounded animate-pulse" />
          </div>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}
