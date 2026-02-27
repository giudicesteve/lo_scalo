"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/store/language"
import { MapPin, Phone, Mail, Instagram } from "lucide-react"

export function Footer() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Evita hydration mismatch - renderizza solo dopo il mount client-side
  if (!mounted) {
    return (
      <footer className="bg-brand-dark text-white py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-white/10 rounded w-1/2"></div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-brand-dark text-white py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        {/* Grid principale */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Colonna 1 - Contatti */}
          <div className="space-y-3">
            <h3 className="text-label-md font-bold text-brand-primary mb-4">
              {t('footer.contact')}
            </h3>
            <a 
              href="https://maps.google.com/?q=Lo+Scalo+Craft+Drinks+By+The+Lake+Cremia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-body-sm text-brand-light-gray hover:text-white transition-colors"
            >
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Frazione San Vito, 9<br />22010 Cremia (CO)</span>
            </a>
            <a 
              href="tel:+393475852220"
              className="flex items-center gap-2 text-body-sm text-brand-light-gray hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span>+39 347 585 2220</span>
            </a>
            <a 
              href="mailto:info@loscalo.it"
              className="flex items-center gap-2 text-body-sm text-brand-light-gray hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>info@loscalo.it</span>
            </a>
          </div>

          {/* Colonna 2 - Social & Orari */}
          <div className="space-y-3">
            <h3 className="text-label-md font-bold text-brand-primary mb-4">
              {t('footer.follow-us')}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <a 
                href="https://www.instagram.com/lo_scalo_craftdrinksbythelake"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://www.tripadvisor.it/Restaurant_Review-g1235475-d14802884-Reviews-Lo_Scalo-Cremia_Lake_Como_Lombardy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-primary transition-colors"
                aria-label="TripAdvisor"
              >
                {/* Icona TripAdvisor */}
                <Image 
                  src="/resources/Tripadvisor.svg" 
                  alt="TripAdvisor" 
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </a>
            </div>
          </div>

          {/* Colonna 3 - Info e Assistenza */}
          <div className="space-y-3">
            <h3 className="text-label-md font-bold text-brand-primary mb-4">
              {t('footer.support')}
            </h3>
            <a 
              href="mailto:support@loscalo.it"
              className="flex items-center gap-2 text-body-sm text-brand-light-gray hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>support@loscalo.it</span>
            </a>
            <div className="flex flex-col gap-2 mt-2">
              <Link 
                href="/faq"
                className="text-label-sm text-brand-gray hover:text-white transition-colors"
              >
                {t('footer.faq')}
              </Link>
            </div>
          </div>

          {/* Colonna 4 - Legale */}
          <div className="space-y-3">
            <h3 className="text-label-md font-bold text-brand-primary mb-4">
              {t('footer.legal')}
            </h3>
            <p className="text-label-sm text-brand-gray">
              P.IVA: IT03661710131
            </p>
            <div className="flex flex-col gap-2">
              <Link 
                href="/terms"
                className="text-label-sm text-brand-gray hover:text-white transition-colors"
              >
                {t('footer.terms')}
              </Link>
              <Link 
                href="/privacy"
                className="text-label-sm text-brand-gray hover:text-white transition-colors"
              >
                {t('footer.privacy')}
              </Link>
              <Link 
                href="/cookies"
                className="text-label-sm text-brand-gray hover:text-white transition-colors"
              >
                {t('footer.cookies')}
              </Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-center text-label-sm text-brand-gray mb-2">
            © 2026 Lo Scalo - {t('footer.tagline')}
          </p>
          <p className="text-center text-[10px] text-brand-gray/60">
            Developed by{' '}
            <a 
              href="mailto:giudice.steve@gmail.com" 
              className="hover:text-brand-primary transition-colors"
            >
              Steve Giudice
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
