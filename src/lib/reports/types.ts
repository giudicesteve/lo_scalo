// Shared types for report generation

export interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  size?: string | null
  product?: {
    name: string
  }
  Product?: {
    name: string
  }
}

export interface GiftCard {
  id: string
  code: string
  initialValue: number
}

export interface Order {
  id: string
  orderNumber: string
  type: string
  status: string
  orderSource?: string | null
  email: string
  phone?: string | null
  total: number
  createdAt: Date | string
  paidAt?: Date | string | null
  stripePaymentIntentId?: string | null
  items: OrderItem[]
  giftCards: GiftCard[]
}

export interface RefundOrder {
  id: string
  orderNumber: string
  email: string
  phone?: string | null
  orderSource?: string | null
}

export interface Refund {
  id: string
  refundNumber: string
  orderId: string
  totalRefunded: number
  refundedAt: Date | string
  refundMethod: "STRIPE" | "CASH" | "POS"
  externalRef?: string | null
  productTotal?: number
  giftCardTotal?: number
  order: RefundOrder
}

export interface GiftCardTransaction {
  id: string
  amount: number
  type: string
  note: string | null
  receiptNumber: string | null
  receiptImage: string | null
  createdAt: Date | string
  giftCard: {
    id: string
    code: string
    initialValue: number
    remainingValue: number
    purchasedAt: Date | string
    order: {
      email: string
      orderNumber: string
      phone: string | null
    }
  }
}

export interface ExpiredGiftCard {
  id: string
  code: string
  initialValue: number
  remainingValue: number
  purchasedAt: Date | string
  expiresAt: Date | string | null
  order: {
    email: string
    orderNumber: string
    phone: string | null
  }
  transactions: { id: string; amount: number }[]
}

export interface CompleteReportData {
  orders: Order[]
  refunds: Refund[]
  transactions: GiftCardTransaction[]
  expiredCards: ExpiredGiftCard[]
}
