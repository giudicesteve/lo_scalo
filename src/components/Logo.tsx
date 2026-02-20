"use client"

import Image from "next/image"

interface LogoProps {
  className?: string
  variant?: "vertical" | "horizontal" | "solo"
}

export function Logo({ className = "", variant = "vertical" }: LogoProps) {
  const src = variant === "solo" 
    ? "/resources/Lo_Scalo_solo_logo.svg"
    : variant === "horizontal"
    ? "/resources/Lo_Scalo_horizontal.svg"
    : "/resources/Lo_Scalo_vertical.svg"

  return (
    <Image 
      src={src} 
      alt="Lo Scalo" 
      className={className}
      width={variant === "solo" ? 538 : variant === "horizontal" ? 927 : 473}
      height={variant === "solo" ? 96 : variant === "horizontal" ? 94 : 152}
      priority
    />
  )
}
