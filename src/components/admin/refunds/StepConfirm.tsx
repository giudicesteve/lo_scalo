"use client"

import { CreditCard, Banknote, Receipt, Package, Gift, Info, AlertTriangle } from "lucide-react"
import { RefundableItem } from "./RefundModal"

interface StepConfirmProps {
  selectedItems: RefundableItem[]
  totalSelected: number
  orderSource: string
  refundMethod: "STRIPE" | "CASH" | "POS"
  onRefundMethodChange: (method: "STRIPE" | "CASH" | "POS") => void
  externalRef: string
  onExternalRefChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  stripeError?: string | null
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
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "outline" }) {
  const styles = {
    default: "bg-blue-100 text-blue-700",
    outline: "border border-gray-300 text-gray-600",
  }
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${styles[variant]}`}>
      {children}
    </span>
  )
}

// Simple Radio Group
function RadioGroup({ 
  value, 
  onChange, 
  children 
}: { 
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2" role="radiogroup">
      {children}
    </div>
  )
}

function RadioGroupItem({ 
  value, 
  id, 
  checked, 
  onChange 
}: { 
  value: string
  id: string
  checked: boolean
  onChange: (value: string) => void
}) {
  return (
    <input
      type="radio"
      id={id}
      name="refundMethod"
      value={value}
      checked={checked}
      onChange={() => onChange(value)}
      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
    />
  )
}

// Simple Label
function Label({ 
  children, 
  htmlFor, 
  className = "" 
}: { 
  children: React.ReactNode
  htmlFor: string
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={`cursor-pointer ${className}`}>
      {children}
    </label>
  )
}

// Simple Input
function Input({ 
  value, 
  onChange, 
  placeholder,
  required
}: { 
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  )
}

// Simple Textarea
function Textarea({ 
  value, 
  onChange, 
  placeholder, 
  rows = 3 
}: { 
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
    />
  )
}

export function StepConfirm({
  selectedItems,
  totalSelected,
  orderSource,
  refundMethod,
  onRefundMethodChange,
  externalRef,
  onExternalRefChange,
  notes,
  onNotesChange,
  stripeError,
}: StepConfirmProps) {
  const products = selectedItems.filter((i) => i.type === "PRODUCT")
  const giftCards = selectedItems.filter((i) => i.type === "GIFT_CARD")

  const isOnline = orderSource === "ONLINE"

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Riepilogo Rimborso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Products */}
          {products.length > 0 && (
            <div>
              <h4 className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Package className="h-3 w-3" />
                Prodotti ({products.length})
              </h4>
              <div className="space-y-1">
                {products.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span>
                      {p.name}
                      {p.size && <span className="text-gray-500"> ({p.size})</span>}
                      {p.quantity && p.quantity > 1 && (
                        <span className="text-gray-500"> x{p.quantity}</span>
                      )}
                    </span>
                    <span className="font-medium">
                      €{((p.price || 0) * (p.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gift Cards */}
          {giftCards.length > 0 && (
            <div>
              <h4 className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Gift className="h-3 w-3" />
                Gift Card ({giftCards.length})
              </h4>
              <div className="space-y-1">
                {giftCards.map((gc) => (
                  <div key={gc.id} className="flex justify-between text-sm">
                    <span className="font-mono">{gc.code}</span>
                    <span className="font-medium">€{gc.price?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">Totale da rimborsare:</span>
              <span className="text-xl font-bold text-blue-600">€{totalSelected.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refund Method */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Metodo di Rimborso</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={refundMethod} onChange={(v) => onRefundMethodChange(v as "STRIPE" | "CASH" | "POS")}>
            <div className="space-y-3">
              {isOnline ? (
                // Ordine ONLINE (Stripe): solo rimborso tramite Stripe Dashboard
                <div className="flex items-center space-x-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
                  <RadioGroupItem 
                    value="STRIPE" 
                    id="stripe" 
                    checked={refundMethod === "STRIPE"}
                    onChange={() => onRefundMethodChange("STRIPE")}
                  />
                  <Label htmlFor="stripe" className="flex items-center gap-2 flex-1">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="font-medium">Stripe</span>
                      <p className="text-xs text-gray-500">
                        Rimborso tramite Stripe Dashboard
                      </p>
                    </div>
                    <Badge>Obbligatorio</Badge>
                  </Label>
                </div>
              ) : (
                <>
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border ${refundMethod === "CASH" ? "bg-gray-50" : ""}`}>
                    <RadioGroupItem 
                      value="CASH" 
                      id="cash" 
                      checked={refundMethod === "CASH"}
                      onChange={() => onRefundMethodChange("CASH")}
                    />
                    <Label htmlFor="cash" className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <div>
                        <span className="font-medium">Contanti</span>
                        <p className="text-xs text-gray-500">
                          Rimborso in contanti in sede
                        </p>
                      </div>
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border ${refundMethod === "POS" ? "bg-gray-50" : ""}`}>
                    <RadioGroupItem 
                      value="POS" 
                      id="pos" 
                      checked={refundMethod === "POS"}
                      onChange={() => onRefundMethodChange("POS")}
                    />
                    <Label htmlFor="pos" className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-purple-600" />
                      <div>
                        <span className="font-medium">POS</span>
                        <p className="text-xs text-gray-500">
                          Rimborso tramite POS in sede
                        </p>
                      </div>
                    </Label>
                  </div>
                </>
              )}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* External Reference - Hidden for ONLINE + STRIPE, visible for all others */}
      {isOnline && refundMethod === "STRIPE" ? (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Rimborso automatico su Stripe
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Il rimborso verrà elaborato automaticamente su Stripe. L'ID del rimborso verrà salvato automaticamente dopo l'elaborazione.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Riferimento {refundMethod === "STRIPE" ? "Stripe Refund ID" : "Documento Rimborso"}
              <span className="text-red-500 ml-1">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder={
                refundMethod === "STRIPE"
                  ? "es: re_1234567890abcdef"
                  : "es: 1234-56789"
              }
              value={externalRef}
              onChange={onExternalRefChange}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              {refundMethod === "STRIPE"
                ? "Inserisci l'ID del rimborso generato su Stripe Dashboard (obbligatorio)"
                : "Inserisci il numero dello documento di rimborso emesso (obbligatorio)"}
            </p>
            {!externalRef && (
              <p className="text-xs text-red-500 mt-1">
                Questo campo è obbligatorio
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Note (opzionale)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Aggiungi eventuali note sul rimborso..."
            value={notes}
            onChange={onNotesChange}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Warning Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">⚠️ Confermando il rimborso:</p>
        <ul className="list-disc list-inside space-y-1 text-amber-700">
          <li>Le quantità dei prodotti torneranno disponibili nello shop</li>
          <li>Le Gift Card selezionate verranno disattivate definitivamente</li>
          <li>Questa azione non può essere annullata</li>
        </ul>
      </div>

      {/* Stripe Error Alert */}
      {stripeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Errore durante l'elaborazione su Stripe
              </p>
              <p className="text-sm text-red-700 mt-1">
                {stripeError}
              </p>
              <p className="text-sm text-red-700 mt-1">
                Puoi inserire manualmente l'ID del rimborso nel campo sottostante.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
