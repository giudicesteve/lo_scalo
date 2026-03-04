import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * Security headers da applicare a tutte le risposte
 */
const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https://*.stripe.com https://lh3.googleusercontent.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://accounts.google.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
    "form-action 'self' https://hooks.stripe.com",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
};

/**
 * Middleware combinato:
 * 1. Aggiunge security headers a tutte le risposte
 * 2. Aggiunge x-pathname header per Server Components
 * 3. Protegge le route /admin/* con autenticazione
 */
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  // Crea la risposta base
  const response = NextResponse.next();
  
  // 1. Aggiungi security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // 2. Aggiungi il pathname come header per Server Components
  response.headers.set("x-pathname", nextUrl.pathname);
  
  // 3. Protezione route /admin/*
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
