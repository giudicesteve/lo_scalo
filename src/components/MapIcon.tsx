"use client"

import Image from "next/image"

interface MapIconProps {
  className?: string
}

export function MapIcon({ className = "" }: MapIconProps) {
  return (
    <Image 
      src="/resources/Map.svg" 
      alt="Mappa" 
      className={className}
      width={40}
      height={40}
      priority
    />
  )
}
