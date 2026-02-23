"use client"

import { usePathname } from "next/navigation"
import { Footer } from "./Footer"

export function FooterWrapper() {
  const pathname = usePathname()
  
  // Don't show footer in admin panel and login page
  if (pathname?.startsWith("/admin") || pathname === "/login") {
    return null
  }
  
  return <Footer />
}
