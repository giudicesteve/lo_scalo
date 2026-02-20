"use client"

import Image from "next/image"

interface CartIconProps {
  className?: string
}

export function CartIcon({ className = "" }: CartIconProps) {
  return (
    <Image 
      src="/resources/Cart.svg" 
      alt="Carrello" 
      className={className}
      width={40}
      height={40}
      priority
    />
  )
}
