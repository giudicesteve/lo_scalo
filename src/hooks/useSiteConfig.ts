"use client"

import { useEffect, useState } from "react"

interface SiteConfig {
  logoVertical?: string
  logoHorizontal?: string
  logoSolo?: string
  logoEmail?: string
}

const DEFAULT_LOGOS = {
  logoVertical: "/resources/Lo_Scalo_vertical.svg",
  logoHorizontal: "/resources/Lo_Scalo_horizontal.svg",
  logoSolo: "/resources/Lo_Scalo_solo_logo.svg",
  logoEmail: "https://raw.githubusercontent.com/giudicesteve/lo_scalo/main/public/resources/Lo_Scalo_vertical_black.png",
}

export function useSiteConfig(): SiteConfig {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_LOGOS)

  useEffect(() => {
    fetch("/api/site-config")
      .then(res => res.json())
      .then(data => {
        setConfig({
          logoVertical: data.logoVertical || DEFAULT_LOGOS.logoVertical,
          logoHorizontal: data.logoHorizontal || DEFAULT_LOGOS.logoHorizontal,
          logoSolo: data.logoSolo || DEFAULT_LOGOS.logoSolo,
          logoEmail: data.logoEmail || DEFAULT_LOGOS.logoEmail,
        })
      })
      .catch(err => {
        console.error("Failed to load site config:", err)
        // Fallback to defaults on error
      })
  }, [])

  return config
}

export function getLogoUrl(config: SiteConfig, variant: "vertical" | "horizontal" | "solo"): string {
  switch (variant) {
    case "solo":
      return config.logoSolo || DEFAULT_LOGOS.logoSolo
    case "horizontal":
      return config.logoHorizontal || DEFAULT_LOGOS.logoHorizontal
    case "vertical":
    default:
      return config.logoVertical || DEFAULT_LOGOS.logoVertical
  }
}

export { DEFAULT_LOGOS }
