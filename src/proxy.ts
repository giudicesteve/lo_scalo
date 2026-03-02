import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * Middleware combinato:
 * 1. Aggiunge x-pathname header per Server Components
 * 2. Protegge le route /admin/* con autenticazione
 */
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  // Crea la risposta base
  const response = NextResponse.next();
  
  // 1. Aggiungi il pathname come header per i Server Components
  response.headers.set("x-pathname", nextUrl.pathname);
  
  // 2. Protezione route /admin/*
  if (nextUrl.pathname.startsWith("/admin")) {
    // Se non è loggato, redirect al login
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      // Aggiungi parametro callback per tornare alla pagina originale dopo il login
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Permetti l'accesso
  return response;
});

export const config = {
  matcher: [
    // Applica a tutte le route tranne file statici e API
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
