import { auth } from "@/auth"
import { NextResponse } from "next/server"
 
// Configurazione: applica middleware a tutte le rotte /admin/*
export const config = {
  matcher: ["/admin/:path*"],
}
 
export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  
  // Se non è loggato, redirect al login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    // Aggiungi parametro callback per tornare alla pagina originale dopo il login
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Se è loggato, permetti l'accesso
  return NextResponse.next()
})
