import { Resend } from 'resend'
import QRCode from 'qrcode'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { prisma } from './prisma'

// Default logo URLs
const DEFAULT_LOGO_EMAIL = 'https://raw.githubusercontent.com/giudicesteve/lo_scalo/main/public/resources/Lo_Scalo_vertical_black.png'

// Cache for logo URL (fetched once per request)
let cachedLogoEmail: string | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60000 // 1 minute

async function getLogoEmail(): Promise<string> {
  const now = Date.now()
  if (cachedLogoEmail && now - cacheTimestamp < CACHE_TTL) {
    return cachedLogoEmail
  }

  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'logoEmail' }
    })
    cachedLogoEmail = config?.value || DEFAULT_LOGO_EMAIL
    cacheTimestamp = now
    return cachedLogoEmail
  } catch {
    return DEFAULT_LOGO_EMAIL
  }
}

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Lo Scalo <onboarding@resend.dev>'

// Brand colors
const BRAND_GREEN = '#000000'
const BRAND_CREAM = '#FFF5F0'
const BRAND_DARK = '#231F20'
const BRAND_ORANGE = '#F05A28'

interface OrderItem {
  name: string
  quantity: number
  size?: string
  totalPrice: number
}

interface GiftCardInfo {
  code: string
  initialValue: number
  expiresAt?: Date | null
}

// Helper function to format date for PDF
function formatPDFDate(date: Date | null | undefined, lang: 'it' | 'en' = 'it'): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Rome'
  })
}

interface OrderDetails {
  orderNumber: string
  email: string
  phone?: string
  total: number
  items: OrderItem[]
  giftCards: GiftCardInfo[]
  createdAt: Date
  lang?: string  // 'it' | 'en'
}

// Traduzioni per le email (copia dal client)
const emailTranslations: Record<string, Record<string, string>> = {
  it: {
    'email.order.subject': 'Conferma ordine #{orderNumber} - Lo Scalo',
    'email.order.greeting': 'Grazie per il tuo ordine!',
    'email.order.number': 'Ordine',
    'email.order.date': 'Data',
    'email.order.email': 'Email',
    'email.order.phone': 'Telefono',
    'email.order.products': 'Prodotti',
    'email.order.noProducts': 'Nessun prodotto',
    'email.order.giftcard': 'Gift Card',
    'email.order.total': 'Totale',
    'email.order.pickup.title': '📦 Ritiro in sede',
    'email.order.pickup.message': 'Potrai ritirare i prodotti fra 24/48 ore. Controlla gli orari di apertura del locale per sapere quando passare da noi!',
    'email.order.pickup.address': 'Indirizzo: Frazione San Vito, 9 - 22010 Cremia (CO) - Italia',
    'email.order.giftcardReady.title': '🎁 Le tue Gift Card sono pronte!',
    'email.order.giftcardReady.message': 'Trovi le tue Gift Card in formato PDF in allegato a questa email. Presenta il QR code al locale per utilizzarle.',
    'email.order.giftcardReady.noAttach': 'Riceverai un\'altra email con i PDF contenenti i QR code scansionabili.',
    'email.order.giftcardReady.active': 'Le gift card sono già attive e utilizzabili da subito presso il nostro locale.',
    'email.order.giftcard.expiry': 'Scadenza',
    'email.order.giftcard.expiryWarning': 'Questa Gift Card è valida fino al {date}. Scaduta questa data, il credito residuo non potrà più essere utilizzato e non potrà essere rimborsato.',
    'email.order.support': 'Per problemi scrivi a',
    'email.order.subjectLine': 'indicando il numero d\'ordine nell\'oggetto.',
    'email.order.footer': '© 2026 Lo Scalo - Craft Drinks by the Lake',
    'email.order.success-sent-to': 'Conferma inviata a:',
    'email.order.thanks': 'Grazie per il tuo ordine!',
    'email.order.orderDetails': 'Dettagli ordine',
    'email.order.summary': 'Riepilogo ordine',
    'email.order.size': 'Taglia',
    'email.order.qty': 'Qtà',
  },
  en: {
    'email.order.subject': 'Order confirmation #{orderNumber} - Lo Scalo',
    'email.order.greeting': 'Thank you for your order!',
    'email.order.number': 'Order',
    'email.order.date': 'Date',
    'email.order.email': 'Email',
    'email.order.phone': 'Phone',
    'email.order.products': 'Products',
    'email.order.noProducts': 'No products',
    'email.order.giftcard': 'Gift Card',
    'email.order.total': 'Total',
    'email.order.pickup.title': '📦 In-store pickup',
    'email.order.pickup.message': 'You can pick up products within 24/48 hours. Check our opening hours to know when to visit us!',
    'email.order.pickup.address': 'Address: Frazione San Vito, 9 - 22010 Cremia (CO) - Italy',
    'email.order.giftcardReady.title': '🎁 Your Gift Cards are ready!',
    'email.order.giftcardReady.message': 'You will find your Gift Cards in PDF format attached to this email. Present the QR code at the venue to use them.',
    'email.order.giftcardReady.noAttach': 'You will receive another email with the PDFs containing scannable QR codes.',
    'email.order.giftcardReady.active': 'Gift cards are already active and ready to use at our venue.',
    'email.order.giftcard.expiry': 'Expiry date',
    'email.order.giftcard.expiryWarning': 'This Gift Card is valid until {date}. After this date, any remaining balance can no longer be used and cannot be refunded.',
    'email.order.support': 'For issues, write to',
    'email.order.subjectLine': 'indicating the order number in the subject.',
    'email.order.footer': '© 2026 Lo Scalo - Craft Drinks by the Lake',
    'email.order.success-sent-to': 'Confirmation sent to:',
    'email.order.thanks': 'Thank you for your order!',
    'email.order.orderDetails': 'Order details',
    'email.order.summary': 'Order summary',
    'email.order.size': 'Size',
    'email.order.qty': 'Qty',
  }
}

// Funzione di traduzione per email
function t(key: string, language: string = 'it', replacements?: Record<string, string>): string {
  const lang = language === 'en' ? 'en' : 'it'
  let text = emailTranslations[lang][key] || key
  
  // Sostituisce i placeholder tipo {orderNumber}
  if (replacements) {
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(`{${placeholder}}`, 'g'), value)
    })
  }
  
  return text
}

interface EmailResult {
  success: boolean
  id?: string
  attachments?: number
  recipients?: string[]
  message?: string
  error?: unknown
}

/**
 * Genera PDF Gift Card
 */
export async function createGiftCardPDF(giftCard: { code: string; value: number; expiresAt?: Date | null }): Promise<Buffer> {
  // Converti il formato del parametro al formato interno
  const giftCardInfo: GiftCardInfo = {
    code: giftCard.code,
    initialValue: giftCard.value,
    expiresAt: giftCard.expiresAt
  }
  return generateGiftCardPDF(giftCardInfo)
}

async function generateGiftCardPDF(giftCard: GiftCardInfo): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Load and embed logo PNG (usa fetch per funzionare su Vercel)
  let logoImage = null
  let logoDims = null
  try {
    const logoUrl = await getLogoEmail()
    const response = await fetch(logoUrl)
    if (response.ok) {
      const logoBytes = await response.arrayBuffer()
      logoImage = await pdfDoc.embedPng(Buffer.from(logoBytes))
      logoDims = logoImage.scale(0.6)
    } else {
      console.log('Logo not found at:', logoUrl)
    }
  } catch (err) {
    console.error('Error loading logo:', err)
  }
  
  // Background color (white)
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(1, 1, 1)
  })
  
  // Header background
  page.drawRectangle({
    x: 0,
    y: height - 150,
    width,
    height: 150,
    color: rgb(1, 1, 1)
  })
  
  // Draw logo or fallback to text
  if (logoImage && logoDims) {
    page.drawImage(logoImage, {
      x: width / 2 - logoDims.width / 2,
      y: height - 75 - logoDims.height / 2,
      width: logoDims.width,
      height: logoDims.height
    })
  } else {
    page.drawText('LO SCALO', {
      x: width / 2 - 80,
      y: height - 75,
      size: 36,
      font: fontBold,
      color: rgb(1, 1, 1)
    })
  }
  
  // Gift Card title
  const textWidth = fontBold.widthOfTextAtSize('GIFT CARD', 24)  
  page.drawText('GIFT CARD', {
    x: width / 2 - textWidth / 2,
    y: height - 199,
    size: 24,
    font: fontBold,
    color: rgb(0.941, 0.353, 0.157)
  })
  
  // Value
  const textWidth2 = font.widthOfTextAtSize(`€${giftCard.initialValue.toFixed(2)}`, 32)
  page.drawText(`€${giftCard.initialValue.toFixed(2)}`, {
    x: width / 2 - textWidth2 / 2,
    y: height - 247,
    size: 32,
    font: font,
    color: rgb(0.137, 0.122, 0.125)
  })
  
  // QR Code
  try {
    // 1. Genera direttamente un Buffer invece di una DataURL (evita il passaggio in base64)
    const qrBuffer = await QRCode.toBuffer(giftCard.code, { 
        width: 200,
        errorCorrectionLevel: 'M', // Livello medio: ottimo compromesso tra leggibilità e resistenza ai danni
    });

    // 2. Incorpora direttamente il Buffer nel PDF
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    // 3. Disegna l'immagine (esempio di posizionamento)
    page.drawImage(qrImage, {
      x: width / 2 - 100,
      y: height - 455,
      width: 200,
      height: 200
    })
  } catch (err) {
    console.error('Error embedding QR in PDF:', err)
  }

  // Gift Card code
  const monoFont = await pdfDoc.embedFont(StandardFonts.CourierBold)
  const textWidth3 = monoFont.widthOfTextAtSize(giftCard.code, 20)
  page.drawText(giftCard.code, {
      x: width / 2 - textWidth3 / 2,
      y: height - 482,
      size: 20,
      font: monoFont,
      color: rgb(0.1, 0.1, 0.1),
  });
    
  // Instructions IT
  const textWidth4 = fontBold.widthOfTextAtSize('Come utilizzare la tua Gift Card', 12)
  page.drawText('Come utilizzare la tua Gift Card', {
    x: width / 2 - textWidth4 / 2,
    y: height - 539,
    size: 12,
    font: fontBold,
    color: rgb(0.137, 0.122, 0.125)
  })
  
  const instructions = [
    '1. Mostra il voucher: Al momento del pagamento, esibisci il PDF dal tuo smartphone o in versione cartacea.',
    '2. Scansiona il codice: Il personale provvederà alla lettura rapida del QR.',
    '3. Scegli la quota: Decidi liberamente quanto importo scalare dalla tua Gift Card per l\'acquisto corrente.',
    '4. Controlla il saldo: L\'importo verrà aggiornato all\'istante e ti verrà comunicato il credito residuo.'
  ]

  let widthSentence = 0;
  instructions.forEach((line, i) => {
    widthSentence = font.widthOfTextAtSize(instructions[i], 10)
    page.drawText(line, {
      x: width / 2 - widthSentence / 2,
      y: height - 557 - (i * 15),
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3)
    })
  })

  // Instructions EN
  const textWidth5 = fontBold.widthOfTextAtSize('How to use your Gift Card', 12)
  page.drawText('How to use your Gift Card', {
    x: width / 2 - textWidth5 / 2,
    y: height - 630,
    size: 12,
    font: fontBold,
    color: rgb(0.137, 0.122, 0.125)
  })
  
  const instructions2 = [
    '1. Show your voucher: Present this PDF on your smartphone or as a printout at the checkout.',
    '2. Scan the code: The staff will quickly scan the QR code.',
    '3. Choose the amount: Decide how much credit you would like to deduct from your Gift Card for this purchase.',
    '4. Check your balance: Your credit will be updated instantly, and you will be notified of any remaining balance.'
  ]

  let widthSentence2 = 0;
  instructions2.forEach((line, i) => {
    widthSentence2 = font.widthOfTextAtSize(instructions2[i], 10)
    page.drawText(line, {
      x: width / 2 - widthSentence2 / 2,
      y: height - 646 - (i * 15),
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  })
  

  
  // Expiry warning in PDF (Italian & English)
  console.log(`[PDF] Gift card ${giftCard.code} expiresAt:`, giftCard.expiresAt, typeof giftCard.expiresAt)
  const expiryDateStr = formatPDFDate(giftCard.expiresAt, 'it')
  const expiryDateStrEn = formatPDFDate(giftCard.expiresAt, 'en')

  console.log(`[PDF] Formatted expiry date (IT):`, expiryDateStr)

  const expiryText = `Valida fino al ${expiryDateStr} | Valid until ${expiryDateStrEn}`
  const textWidth7 = fontBold.widthOfTextAtSize(expiryText, 12)
  page.drawText(expiryText, {
    x: width / 2 - textWidth7 / 2,
    y: 95,
    size: 12,
    font: fontBold,
    color: rgb(0.94, 0.35, 0.16) // Orange color for warning
  })


  const textWidth8 = font.widthOfTextAtSize('Oltrepassata la data di validità, il credito residuo non potrà più essere utilizzato per gli acquisti e non potrà essere rimborsato.', 8)
  page.drawText('Oltrepassata la data di validità, il credito residuo non potrà più essere utilizzato per gli acquisti e non potrà essere rimborsato.', {
      x: width / 2 - textWidth8 / 2,
      y: 75,
      size: 8,
      font,
      color: rgb(0.137, 0.122, 0.125)
  })
  const textWidth9 = font.widthOfTextAtSize('Upon expiry of the validity period, any remaining balance can no longer be used for purchases and is non-refundable.', 8)
  page.drawText('Upon expiry of the validity period, any remaining balance can no longer be used for purchases and is non-refundable.', {
      x: width / 2 - textWidth9 / 2,
      y: 60,
      size: 8,
      font,
      color: rgb(0.137, 0.122, 0.125)
  })

  // Footer
  const textWidth6 = font.widthOfTextAtSize('Lo Scalo - Frazione San Vito, 9 - 22010 Cremia (CO) - Italia/Italy', 10)
  page.drawText('Lo Scalo - Frazione San Vito, 9 - 22010 Cremia (CO) - Italia/Italy', {
    x: width / 2 - textWidth6 / 2,
    y: 35,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5)
  })
  
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Genera allegati PDF per le gift card
 */
async function generateGiftCardAttachments(order: OrderDetails): Promise<{ filename: string; content: Buffer }[]> {
  const attachments: { filename: string; content: Buffer }[] = []
  
  for (const gc of order.giftCards) {
    try {
      const pdfBuffer = await generateGiftCardPDF(gc)
      attachments.push({
        filename: `Lo Scalo - ${gc.initialValue.toFixed(0)}EUR - ${gc.code}.pdf`,
        content: pdfBuffer
      })
    } catch (err) {
      console.error(`Error generating PDF for ${gc.code}:`, err)
    }
  }
  
  return attachments
}

/**
 * Invia email di conferma ordine al cliente
 * Se ci sono gift card, include i PDF allegati
 */
export async function sendOrderConfirmation(order: OrderDetails): Promise<EmailResult> {
  const hasProducts = order.items.length > 0
  const hasGiftCards = order.giftCards.length > 0
  const lang = order.lang || 'it'
  console.log(`🌐 [EMAIL] sendOrderConfirmation - order.lang=${order.lang}, using lang=${lang}`)

  const itemsList = order.items
    .map(item => `• ${item.name}${item.size ? ` (${t('email.order.size', lang)}: ${item.size})` : ''} - ${t('email.order.qty', lang)}: ${item.quantity} - €${item.totalPrice.toFixed(2)}`)
    .join('\n')

  const giftCardsList = order.giftCards
    .map(gc => {
      console.log(`[EMAIL] Processing gift card ${gc.code}, expiresAt:`, gc.expiresAt, typeof gc.expiresAt)
      const expiryDate = gc.expiresAt 
        ? new Date(gc.expiresAt).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null
      return `• Gift Card ${gc.code} - €${gc.initialValue.toFixed(2)}${expiryDate ? ` (${t('email.order.giftcard.expiry', lang)}: ${expiryDate})` : ''}`
    })
    .join('\n')

  const pickupInstructions = hasProducts
    ? `\n${t('email.order.pickup.title', lang)}\n${t('email.order.pickup.message', lang)}\n\n${t('email.order.pickup.address', lang)}`
    : ''

  const giftCardExpiryWarning = hasGiftCards && order.giftCards.some(gc => gc.expiresAt)
    ? `\n⚠️ ${t('email.order.giftcard.expiryWarning', lang, { date: new Date(order.giftCards[0].expiresAt!).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })}`
    : ''

  const giftCardInstructions = hasGiftCards
    ? `\n${t('email.order.giftcardReady.title', lang)}\n${t('email.order.giftcardReady.message', lang)}`
    : ''

  const attachments = hasGiftCards ? await generateGiftCardAttachments(order) : []
  const htmlContent = await generateOrderConfirmationHtml(order, attachments.length > 0, lang)

  const dateLocale = lang === 'en' ? 'en-US' : 'it-IT'
  const text = `
${t('email.order.thanks', lang)}

${t('email.order.number', lang).toUpperCase()} #${order.orderNumber}
${t('email.order.date', lang)}: ${order.createdAt.toLocaleDateString(dateLocale)}

📧 ${t('email.order.email', lang)}: ${order.email}
${order.phone ? `📞 ${t('email.order.phone', lang)}: ${order.phone}` : ''}

🛍️ ${t('email.order.products', lang).toUpperCase()}
${itemsList || t('email.order.noProducts', lang)}

${hasGiftCards ? `🎁 ${t('email.order.giftcard', lang).toUpperCase()}\n${giftCardsList}${giftCardExpiryWarning}` : ''}

💰 ${t('email.order.total', lang).toUpperCase()}: €${order.total.toFixed(2)}

${pickupInstructions}

${giftCardInstructions}

${t('email.order.support', lang)} support@loscalo.it ${t('email.order.subjectLine', lang)}

${lang === 'en' ? 'See you soon!' : 'A presto!'}
Lo Scalo Team
`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.email,
      subject: t('email.order.subject', lang, { orderNumber: order.orderNumber }),
      text,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    if (error) {
      console.error('Error sending order confirmation:', error)
      return { success: false, error }
    }

    console.log(`✅ [EMAIL] Order confirmation sent: ${data?.id}, lang=${lang}, subject="${t('email.order.subject', lang, { orderNumber: order.orderNumber })}"`)
    return { success: true, id: data?.id, attachments: attachments.length }
  } catch (err) {
    console.error('Exception sending order confirmation:', err)
    return { success: false, error: err }
  }
}

/**
 * Invia notifica admin per nuovo ordine a tutti gli admin abilitati
 */
export async function sendAdminNotification(order: OrderDetails): Promise<EmailResult> {
  const hasGiftCards = order.giftCards.length > 0

  const admins = await prisma.admin.findMany({
    where: { receiveNotifications: true }
  })

  if (admins.length === 0) {
    console.log('Nessun admin abilitato a ricevere notifiche')
    return { success: true, message: 'Nessun destinatario' }
  }

  const adminEmails = admins.map(a => a.email)
  console.log(`Invio notifica admin a ${adminEmails.length} indirizzi:`, adminEmails)

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Nuovo Ordine #${order.orderNumber}</title>
</head>
<body style="font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.4; color: #231F20; background-color: #f5f5f5;">
  <div style="background-color: white; margin: 0 auto; padding: 8px; border: 2px solid #000000;">
    <div style="margin-bottom: 15px;">
      <img src="${await getLogoEmail()}" alt="Logo" style="max-width: 140px; height: auto; display: block;" />
    </div>
    <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 16px; border-bottom: 2px solid #000000; padding-bottom: 5px;">🛒 NUOVO ORDINE #${order.orderNumber}</h2>
    
    <table width="100%" cellpadding="20" style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <tr><th colspan="2" style="text-align: left; padding: 6px 8px; border: 1px solid #ddd; background-color: #000000; color: white; font-weight: bold;">CLIENTE</th></tr>
      <tr><td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;">${order.email}</td></tr>
      ${order.phone ? `<tr><td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;"><strong>Telefono:</strong></td><td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;">${order.phone}</td></tr>` : ''}
      <tr><td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;"><strong>Data:</strong></td><td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;">${order.createdAt.toLocaleString('it-IT')}</td></tr>
    </table>

    ${order.items.length > 0 ? `
    <table width="100%" cellpadding="20" style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <tr>
        <th style="text-align: left; padding: 6px 8px; border: 1px solid #ddd; background-color: #000000; color: white; font-weight: bold;">Prodotto</th>
        <th style="text-align: left; padding: 6px 8px; border: 1px solid #ddd; background-color: #000000; color: white; font-weight: bold;">Taglia</th>
        <th style="text-align: left; padding: 6px 8px; border: 1px solid #ddd; background-color: #000000; color: white; font-weight: bold;">Qty</th>
        <th style="text-align: left; padding: 6px 8px; border: 1px solid #ddd; background-color: #000000; color: white; font-weight: bold;">Prezzo</th>
      </tr>
      ${order.items.map(item => `
      <tr>
        <td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;">${item.name}</td>
        <td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;">${item.size || '-'}</td>
        <td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;">€${item.totalPrice.toFixed(2)}</td>
      </tr>
      `).join('')}
    </table>
    ` : ''}

    ${hasGiftCards ? `
    <table width="100%" cellpadding="20" style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <tr><th colspan="2" style="text-align: left; padding: 6px 8px; border: 1px solid #ddd; background-color: #000000; color: white; font-weight: bold;">GIFT CARD</th></tr>
      ${order.giftCards.map(gc => `
      <tr>
        <td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;"><strong>${gc.code}</strong></td>
        <td style="text-align: left; padding: 6px 8px; border: 1px solid #ddd;">€${gc.initialValue.toFixed(2)}</td>
      </tr>
      `).join('')}
    </table>
    ` : ''}

    <div style="font-size: 16px; font-weight: bold; color: #000000; text-align: right; margin-top: 10px;">TOTALE: €${order.total.toFixed(2)}</div>

    <a href="${process.env.NEXTAUTH_URL}/admin/orders" style="background-color: #eb6f45; color: #231F20; padding: 10px 15px; text-decoration: none; display: inline-block; margin-top: 15px; font-weight: bold;">Gestisci Ordine →</a>
  </div>
</body>
</html>
  `

  const text = `
🛒 NUOVO ORDINE #${order.orderNumber}

CLIENTE
Email: ${order.email}
${order.phone ? `Telefono: ${order.phone}` : ''}
Data: ${order.createdAt.toLocaleString('it-IT')}

PRODOTTI
${order.items.map(item => `- ${item.name}${item.size ? ` (${item.size})` : ''} x${item.quantity} = €${item.totalPrice.toFixed(2)}`).join('\n') || 'Nessun prodotto'}

${hasGiftCards ? `GIFT CARD\n${order.giftCards.map(gc => `- ${gc.code} = €${gc.initialValue.toFixed(2)}`).join('\n')}` : ''}

TOTALE: €${order.total.toFixed(2)}

Admin: ${process.env.NEXTAUTH_URL}/admin/orders
`

  try {
    const [firstAdmin, ...otherAdmins] = adminEmails
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: firstAdmin,
      bcc: otherAdmins.length > 0 ? otherAdmins : undefined,
      subject: `🛒 #${order.orderNumber} - €${order.total.toFixed(2)}`,
      text,
      html,
    })

    if (error) {
      console.error('Error sending admin notification:', error)
      return { success: false, error }
    }

    console.log(`Admin notification sent to ${adminEmails.length} admins:`, data?.id)
    return { success: true, id: data?.id, recipients: adminEmails }
  } catch (err) {
    console.error('Exception sending admin notification:', err)
    return { success: false, error: err }
  }
}

// HTML template per conferma ordine
async function generateOrderConfirmationHtml(order: OrderDetails, hasAttachments: boolean = false, lang: string = 'it'): Promise<string> {
  const logoUrl = await getLogoEmail()
  const hasProducts = order.items.length > 0
  const hasGiftCards = order.giftCards.length > 0

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('email.order.subject', lang, { orderNumber: order.orderNumber })}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${BRAND_DARK}; background-color: ${BRAND_CREAM};">
  <div style="background-color: white; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background-color: ${BRAND_CREAM}; border-radius: 16px;padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(78,110,88,0.1);">
      <div style="margin-bottom: 6px;">
        <img src="${logoUrl}" alt="Logo" style="max-width: 160px; height: auto;" />
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND_DARK}; margin: 0 0 8px;">${t('email.order.greeting', lang)}</h1>
      <div style="font-size: 15px; color: #666; font-weight: 500;">${t('email.order.number', lang)} <strong style="color: ${BRAND_DARK};">#${order.orderNumber}</strong></div>
    </div>

    <div>
      <div style="background-color: white; padding: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px;margin-top: 16px;">
        <div style="font-size: 15px; font-weight: 700; color: ${BRAND_DARK}; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee;">${t('email.order.summary', lang)}</div>
        
        <table width="100%" cellpadding="20" style="width: 100%; border-collapse: collapse;">
          ${order.items.map(item => `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
              <div style="font-weight: 600; color: ${BRAND_DARK}; font-size: 14px; margin-bottom: 4px;">${item.name}</div>
              <div style="font-size: 13px; color: #888;">${t('email.order.qty', lang)}: ${item.quantity}${item.size ? ` • ${t('email.order.size', lang)}: ${item.size}` : ''}</div>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right; vertical-align: top; white-space: nowrap;">
              <div style="font-weight: 700; color: ${BRAND_DARK}; font-size: 15px;">€${item.totalPrice.toFixed(2)}</div>
            </td>
          </tr>
          `).join('')}
          
          ${order.giftCards.map(gc => {
            const expiryDate = gc.expiresAt ? new Date(gc.expiresAt).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null
            return `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
              <div style="font-weight: 600; color: ${BRAND_DARK}; font-size: 14px; margin-bottom: 4px;">${t('email.order.giftcard', lang)}</div>
              <div style="font-size: 13px; color: #888;">${gc.code}</div>
              ${expiryDate ? `<div style="font-size: 12px; color: #F05A28; margin-top: 4px;">${t('email.order.giftcard.expiry', lang)}: ${expiryDate}</div>` : ''}
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right; vertical-align: top; white-space: nowrap;">
              <div style="font-weight: 700; color: ${BRAND_DARK}; font-size: 15px;">€${gc.initialValue.toFixed(2)}</div>
            </td>
          </tr>
          `}).join('')}
          
          <tr>
            <td style="padding-top: 16px;">
              <span style="font-size: 16px; font-weight: 700; color: ${BRAND_DARK};">${t('email.order.total', lang)}</span>
            </td>
            <td style="padding-top: 16px; text-align: right;">
              <span style="font-size: 24px; font-weight: 700; color: ${BRAND_GREEN};">€${order.total.toFixed(2)}</span>
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 16px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
          ${t('email.order.success-sent-to', lang)} <strong>${order.email}</strong>
        </div>
      </div>

      ${hasGiftCards ? `
      <div style="background-color: rgba(240,90,40,0.1); border-radius: 16px; padding: 16px; margin-top: 16px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: ${BRAND_ORANGE};">${t('email.order.giftcardReady.title', lang)}</div>
        <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.6;">${hasAttachments ? t('email.order.giftcardReady.message', lang) : t('email.order.giftcardReady.noAttach', lang)} ${t('email.order.giftcardReady.active', lang)}</p>
      </div>
      ` : ''}

      ${hasProducts ? `
      <div style="background-color: rgba(78,110,88,0.1); border-radius: 16px; padding: 16px; margin-top: 16px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: ${BRAND_GREEN};">${t('email.order.pickup.title', lang)}</div>
        <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.6;">${t('email.order.pickup.message', lang)}<br><br>
        <strong>${t('email.order.pickup.address', lang)}</strong></p>
      </div>
      ` : ''}
    </div>

    <div style="background-color: ${BRAND_CREAM}; border-radius: 16px; padding: 24px; margin-top: 16px; text-align: center; border-top: 1px solid rgba(78,110,88,0.1);">
      <p style="font-size: 13px; color: #666; margin: 0 0 8px;">${t('email.order.support', lang)} <a href="mailto:support@loscalo.it" style="color: ${BRAND_GREEN}; text-decoration: none; font-weight: 600;">support@loscalo.it</a><br>${t('email.order.subjectLine', lang)}</p>
      <p style="margin-top: 20px; color: #999; font-size: 12px;">${t('email.order.footer', lang)}</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Generic send email function
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: { filename: string; content: string }[]
}): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
      attachments: attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
      })),
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error }
    }

    console.log(`Email sent: ${data?.id} to ${to}`)
    return { success: true, id: data?.id }
  } catch (err) {
    console.error('Exception sending email:', err)
    return { success: false, error: err }
  }
}

export { resend }
