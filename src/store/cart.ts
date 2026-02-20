import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CartStore } from '@/types'

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item: CartItem) => {
        const items = get().items
        const existingIndex = items.findIndex(
          (i) => i.id === item.id && i.size === item.size
        )
        
        if (existingIndex >= 0) {
          const newItems = [...items]
          newItems[existingIndex].quantity += item.quantity
          set({ items: newItems })
        } else {
          set({ items: [...items, item] })
        }
      },
      
      removeItem: (id: string, size?: string) => {
        set({
          items: get().items.filter(
            (i) => !(i.id === id && i.size === size)
          ),
        })
      },
      
      updateQuantity: (id: string, quantity: number, size?: string) => {
        if (quantity <= 0) {
          get().removeItem(id, size)
          return
        }
        set({
          items: get().items.map((i) =>
            i.id === id && i.size === size ? { ...i, quantity } : i
          ),
        })
      },
      
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'lo-scalo-cart',
    }
  )
)

// Helper per calcolare il totale
export const calculateTotal = (items: CartItem[]) => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
