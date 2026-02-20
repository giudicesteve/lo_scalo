// Tipi per il carrello
export interface CartItem {
  id: string
  type: 'product' | 'gift-card'
  name: string
  price: number
  quantity: number
  size?: string
  image?: string
}

export interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string, size?: string) => void
  updateQuantity: (id: string, quantity: number, size?: string) => void
  clearCart: () => void
}

// Tipi per le traduzioni
export type Language = 'it' | 'en'

export interface Translations {
  [key: string]: string | Translations
}

// Tipi per il menu
export interface CategoryWithCocktails {
  id: string
  nameIt: string
  nameEn: string
  cocktails: Cocktail[]
}

export interface Cocktail {
  id: string
  name: string
  ingredientsIt: string
  ingredientsEn: string
  descriptionIt?: string
  descriptionEn?: string
  price: number
  alcoholLevel?: number
}

// Tipi per i prodotti
export interface ProductWithVariants {
  id: string
  name: string
  descriptionIt: string
  descriptionEn: string
  price: number
  image: string
  variants: {
    id: string
    size: string
    quantity: number
  }[]
}

// Tipi per le gift card
export interface GiftCardTemplate {
  id: string
  value: number
  price: number
}
