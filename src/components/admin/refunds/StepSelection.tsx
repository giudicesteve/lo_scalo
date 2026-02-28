"use client"

import { AlertTriangle, Package, Gift } from "lucide-react"
import { RefundableItem } from "./RefundModal"

interface StepSelectionProps {
  products: RefundableItem[]
  giftCards: RefundableItem[]
  selectedItems: RefundableItem[]
  onSelectionChange: (items: RefundableItem[]) => void
  totalSelected: number
}

// Simple Card Component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 border-b border-gray-100 ${className}`}>{children}</div>
}

function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-medium ${className}`}>{children}</h3>
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

// Simple Badge
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "destructive" | "outline" }) {
  const styles = {
    default: "bg-gray-100 text-gray-700",
    destructive: "bg-red-100 text-red-700",
    outline: "border border-gray-300 text-gray-600",
  }
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${styles[variant]}`}>
      {children}
    </span>
  )
}

// Simple Checkbox
function Checkbox({ 
  checked, 
  onChange, 
  disabled = false 
}: { 
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={`w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    />
  )
}

export function StepSelection({
  products,
  giftCards,
  selectedItems,
  onSelectionChange,
  totalSelected,
}: StepSelectionProps) {
  const toggleItem = (item: RefundableItem) => {
    const isSelected = selectedItems.some((i) => i.id === item.id)
    if (isSelected) {
      onSelectionChange(selectedItems.filter((i) => i.id !== item.id))
    } else {
      onSelectionChange([...selectedItems, item])
    }
  }

  const selectedIds = new Set(selectedItems.map((i) => i.id))

  return (
    <div className="space-y-4">
      {/* Total Selected */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Totale selezionato:</span>
          <span className="text-xl font-bold">€{totalSelected.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {selectedItems.length} item selezionati
        </p>
      </div>

      {/* Products Section */}
      {products.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Prodotti ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {products.map((product) => {
              const isSelected = selectedIds.has(product.id)
              const isDisabled = !product.isRefundable

              return (
                <div
                  key={product.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isDisabled
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : isSelected
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50 cursor-pointer"
                  }`}
                  onClick={() => !isDisabled && toggleItem(product)}
                >
                  <div className="mt-0.5">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleItem(product)}
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{product.name}</span>
                      {product.size && (
                        <Badge variant="outline">
                          {product.size}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className="font-medium">€{product.price?.toFixed(2)}</span>
                      {product.quantity && product.quantity > 1 && (
                        <span className="text-gray-500">x{product.quantity}</span>
                      )}
                    </div>
                    {product.reason && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{product.reason}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold">
                      €{((product.price || 0) * (product.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Gift Cards Section */}
      {giftCards.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Gift Card ({giftCards.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {giftCards.map((gc) => {
              const isSelected = selectedIds.has(gc.id)
              const isDisabled = !gc.isRefundable

              return (
                <div
                  key={gc.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isDisabled
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : isSelected
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50 cursor-pointer"
                  }`}
                  onClick={() => !isDisabled && toggleItem(gc)}
                >
                  <div className="mt-0.5">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleItem(gc)}
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono">{gc.code}</span>
                      {gc.hasTransactions && (
                        <Badge variant="destructive">
                          Usata
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-medium">Valore: €{gc.price?.toFixed(2)}</span>
                      {gc.remainingValue !== undefined && gc.remainingValue !== gc.price && (
                        <span className="text-gray-500 ml-2">
                          (Residuo: €{gc.remainingValue.toFixed(2)})
                        </span>
                      )}
                    </div>
                    {gc.reason && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{gc.reason}</span>
                      </div>
                    )}
                    {gc.hasTransactions && gc.transactionCount && (
                      <p className="text-xs text-red-600 mt-1">
                        Ha {gc.transactionCount} transazione/i - non rimborsabile
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold">€{gc.price?.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* No Items Message */}
      {products.length === 0 && giftCards.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nessun item disponibile per il rimborso</p>
        </div>
      )}
    </div>
  )
}
