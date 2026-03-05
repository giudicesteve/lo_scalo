"use client"

import Image from "next/image"
import { useSiteConfig, getLogoUrl } from "@/hooks/useSiteConfig"

interface LogoProps {
  className?: string
  variant?: "vertical" | "horizontal" | "solo"
}

export function Logo({ className = "", variant = "vertical" }: LogoProps) {
  const config = useSiteConfig()
  const src = getLogoUrl(config, variant)

  return (
    <Image 
      src={src} 
      alt="Logo" 
      className={className}
      width={variant === "solo" ? 538 : variant === "horizontal" ? 927 : 473}
      height={variant === "solo" ? 96 : variant === "horizontal" ? 94 : 152}
      priority
      // Add unoptimized for external URLs (like GitHub Raw, Cloudinary, etc.)
      unoptimized={src.startsWith("http")}
    />
  )
}
