/**
 * Prisma Client Extension per la conversione automatica euro <-> cents
 * 
 * Questo extension intercetta automaticamente tutte le operazioni Prisma
 * e converte i campi monetari:
 * - In scrittura (create, update): euro -> cents
 * - In lettura (find, findMany): cents -> euro
 * 
 * I campi monetari sono definiti in MONETARY_FIELDS per ogni modello.
 */

import { Prisma } from '@prisma/client'

// Campi monetari per modello (in cents nel database)
const MODEL_MONETARY_FIELDS: Record<string, string[]> = {
  Cocktail: ['price'],
  GiftCardTemplate: ['value', 'price'],
  GiftCard: ['initialValue', 'remainingValue'],
  GiftCardTransaction: ['amount'],
  Order: ['total'],
  OrderItem: ['unitPrice', 'totalPrice'],
  Product: ['price'],
  Refund: ['totalRefunded'],
}

/**
 * Converte euro a cents
 */
function euroToCents(value: number): number {
  return Math.round(value * 100)
}

/**
 * Converte cents a euro
 */
function centsToEuro(value: number): number {
  return value / 100
}

/**
 * Converte i campi monetari in un oggetto da euro a cents (per scrittura DB)
 */
function convertToCents(obj: any, modelName: string): any {
  if (!obj || typeof obj !== 'object') return obj
  
  const fields = MODEL_MONETARY_FIELDS[modelName]
  if (!fields) return obj

  const result = { ...obj }
  
  for (const field of fields) {
    if (field in result && typeof result[field] === 'number') {
      result[field] = euroToCents(result[field])
    }
  }
  
  return result
}

/**
 * Converte i campi monetari in un oggetto da cents a euro (per lettura DB)
 */
function convertToEuro(obj: any, modelName: string): any {
  if (!obj || typeof obj !== 'object') return obj
  
  const fields = MODEL_MONETARY_FIELDS[modelName]
  if (!fields) return obj

  const result = { ...obj }
  
  for (const field of fields) {
    if (field in result && typeof result[field] === 'number') {
      result[field] = centsToEuro(result[field])
    }
  }
  
  return result
}

/**
 * Converte ricorsivamente in una struttura annidata (per include/relations)
 */
function convertNestedToEuro(data: any, parentModel: string): any {
  if (Array.isArray(data)) {
    return data.map(item => convertNestedToEuro(item, parentModel))
  }
  
  if (!data || typeof data !== 'object') {
    return data
  }

  // Converte il modello corrente
  let result = convertToEuro(data, parentModel)
  
  // Converte le relazioni annidate
  for (const [key, value] of Object.entries(result)) {
    if (value && typeof value === 'object') {
      const relatedModel = getModelNameFromField(parentModel, key)
      if (relatedModel) {
        result[key] = convertNestedToEuro(value, relatedModel)
      }
    }
  }
  
  return result
}

/**
 * Mappa i nomi dei campi relazione ai nomi dei modelli
 */
function getModelNameFromField(parentModel: string, field: string): string | null {
  // Mappa delle relazioni comuni
  const relations: Record<string, Record<string, string>> = {
    Order: {
      items: 'OrderItem',
      giftCards: 'GiftCard',
      refunds: 'Refund',
    },
    OrderItem: {
      Product: 'Product',
      ProductVariant: 'ProductVariant',
      order: 'Order',
    },
    GiftCard: {
      order: 'Order',
      transactions: 'GiftCardTransaction',
      refund: 'Refund',
    },
    GiftCardTransaction: {
      giftCard: 'GiftCard',
    },
    Refund: {
      order: 'Order',
      giftCards: 'GiftCard',
    },
    Product: {
      ProductVariant: 'ProductVariant',
      OrderItem: 'OrderItem',
    },
    Category: {
      cocktails: 'Cocktail',
    },
  }
  
  return relations[parentModel]?.[field] || null
}

/**
 * Extension Prisma per conversione automatica valuta
 */
export const currencyExtension = Prisma.defineExtension({
  name: 'currencyConverter',
  
  model: {
    $allModels: {
      // Operazioni di lettura - converte cents -> euro
      async findUnique<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const result = await (context as any).$parent[model].findUnique(args)
        return result ? convertNestedToEuro(result, model) : null
      },
      
      async findFirst<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const result = await (context as any).$parent[model].findFirst(args)
        return result ? convertNestedToEuro(result, model) : null
      },
      
      async findMany<T>(this: T, args: any): Promise<any[]> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const results = await (context as any).$parent[model].findMany(args)
        return results.map((r: any) => convertNestedToEuro(r, model))
      },
      
      // Operazioni di scrittura - converte euro -> cents
      async create<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const convertedData = args.data ? convertToCents(args.data, model) : args.data
        const result = await (context as any).$parent[model].create({
          ...args,
          data: convertedData,
        })
        return convertNestedToEuro(result, model)
      },
      
      async createMany<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        if (args.data && Array.isArray(args.data)) {
          args.data = args.data.map((d: any) => convertToCents(d, model))
        }
        return (context as any).$parent[model].createMany(args)
      },
      
      async update<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const convertedData = args.data ? convertToCents(args.data, model) : args.data
        const result = await (context as any).$parent[model].update({
          ...args,
          data: convertedData,
        })
        return convertNestedToEuro(result, model)
      },
      
      async updateMany<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const convertedData = args.data ? convertToCents(args.data, model) : args.data
        return (context as any).$parent[model].updateMany({
          ...args,
          data: convertedData,
        })
      },
      
      async upsert<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const convertedCreate = args.create ? convertToCents(args.create, model) : args.create
        const convertedUpdate = args.update ? convertToCents(args.update, model) : args.update
        const result = await (context as any).$parent[model].upsert({
          ...args,
          create: convertedCreate,
          update: convertedUpdate,
        })
        return convertNestedToEuro(result, model)
      },
      
      async count<T>(this: T, args?: any): Promise<number> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        return (context as any).$parent[model].count(args)
      },
      
      async delete<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const result = await (context as any).$parent[model].delete(args)
        return convertNestedToEuro(result, model)
      },
      
      async deleteMany<T>(this: T, args?: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        return (context as any).$parent[model].deleteMany(args)
      },
      
      async aggregate<T>(this: T, args: any): Promise<any> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const result = await (context as any).$parent[model].aggregate(args)
        return convertNestedToEuro(result, model)
      },
      
      async groupBy<T>(this: T, args: any): Promise<any[]> {
        const context = Prisma.getExtensionContext(this) as any
        const model = context.$name
        const results = await (context as any).$parent[model].groupBy(args)
        return results.map((r: any) => convertNestedToEuro(r, model))
      },
    },
  },
})
