import { Resend } from 'resend'
import QRCode from 'qrcode'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { prisma } from './prisma'

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
}

interface OrderDetails {
  orderNumber: string
  email: string
  phone?: string
  total: number
  items: OrderItem[]
  giftCards: GiftCardInfo[]
  createdAt: Date
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
 * Genera QR code come data URL
 */
async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (err) {
    console.error('Error generating QR code:', err)
    return ''
  }
}

/**
 * Genera PDF Gift Card
 */
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
    const logoUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/resources/Lo_Scalo_vertical_black.png`
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
    const qrDataUrl = await QRCode.toDataURL(giftCard.code, { width: 200 })
    const qrBase64 = qrDataUrl.split(',')[1]
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'))
    
    page.drawImage(qrImage, {
      x: width / 2 - 100,
      y: height - 462,
      width: 200,
      height: 200
    })
  } catch (err) {
    console.error('Error embedding QR in PDF:', err)
  }

  // Gift Card code
  const textWidth3 = fontBold.widthOfTextAtSize(giftCard.code, 20)
  page.drawText(giftCard.code, {
    x: width / 2 - textWidth3 / 2,
    y: height - 492,
    size: 20,
    font: fontBold,
    color: rgb(0.137, 0.122, 0.125)
  })
  
  // Instructions IT
  const textWidth4 = fontBold.widthOfTextAtSize('Come utilizzare la tua Gift Card', 12)
  page.drawText('Come utilizzare la tua Gift Card', {
    x: width / 2 - textWidth4 / 2,
    y: height - 559,
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
      y: height - 577 - (i * 15),
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3)
    })
  })

  // Instructions EN
  const textWidth5 = fontBold.widthOfTextAtSize('How to use your Gift Card', 12)
  page.drawText('How to use your Gift Card', {
    x: width / 2 - textWidth5 / 2,
    y: height - 660,
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
      y: height - 676 - (i * 15),
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  })
  
  // Footer
  const textWidth6 = font.widthOfTextAtSize('Lo Scalo - Frazione San Vito, 9 - 22010 Cremia (CO)', 10)
  page.drawText('Lo Scalo - Frazione San Vito, 9 - 22010 Cremia (CO)', {
    x: width / 2 - textWidth6 / 2,
    y: 60,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5)
  })
  
  const textWidth7 = font.widthOfTextAtSize('Valida senza scadenza per qualsiasi consumazione', 10)
  page.drawText('Valida senza scadenza per qualsiasi consumazione', {
    x: width / 2 - textWidth7 / 2,
    y: 40,
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

  const itemsList = order.items
    .map(item => `• ${item.name}${item.size ? ` (Taglia: ${item.size})` : ''} - Qty: ${item.quantity} - €${item.totalPrice.toFixed(2)}`)
    .join('\n')

  const giftCardsList = order.giftCards
    .map(gc => `• Gift Card ${gc.code} - €${gc.initialValue.toFixed(2)}`)
    .join('\n')

  const pickupInstructions = hasProducts
    ? `\n📦 RITIRO IN SEDE\nI tuoi prodotti saranno pronti per il ritiro entro 24-48 ore presso:\nLo Scalo - Frazione San Vito, 9 - 22010 Cremia (CO)\n\nPresenta questo numero d'ordine al momento del ritiro.`
    : ''

  const giftCardInstructions = hasGiftCards
    ? `\n🎁 GIFT CARD\nTrovi le tue Gift Card in formato PDF in allegato a questa email.\nPresenta il QR code al locale per utilizzarle.`
    : ''

  const attachments = hasGiftCards ? await generateGiftCardAttachments(order) : []
  const htmlContent = generateOrderConfirmationHtml(order, attachments.length > 0)

  const text = `
Grazie per il tuo ordine!

ORDINE #${order.orderNumber}
Data: ${order.createdAt.toLocaleDateString('it-IT')}

📧 Email: ${order.email}
${order.phone ? `📞 Telefono: ${order.phone}` : ''}

🛍️ PRODOTTI
${itemsList || 'Nessun prodotto'}

${hasGiftCards ? `🎁 GIFT CARD\n${giftCardsList}` : ''}

💰 TOTALE: €${order.total.toFixed(2)}

${pickupInstructions}

${giftCardInstructions}

Per qualsiasi domanda, scrivi a support@loscalo.it indicando il numero d'ordine.

A presto!
Lo Scalo Team
`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.email,
      subject: `Conferma ordine #${order.orderNumber} - Lo Scalo`,
      text,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    if (error) {
      console.error('Error sending order confirmation:', error)
      return { success: false, error }
    }

    console.log('Order confirmation sent:', data?.id, attachments.length > 0 ? `con ${attachments.length} allegati` : '')
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
      <img src="${LOGO_URL}" alt="Lo Scalo" style="max-width: 140px; height: auto; display: block;" />
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

/**
 * Invia email con Gift Card - include QR code e PDF allegati
 */
export async function sendGiftCardEmail(order: OrderDetails): Promise<EmailResult> {
  if (order.giftCards.length === 0) return { success: true }

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

  const text = `
Le tue Gift Card sono pronte!

Ordine #${order.orderNumber}

${order.giftCards.map(gc => `
🎁 Gift Card ${gc.code}
Valore: €${gc.initialValue.toFixed(2)}

Presenta il codice al barista o usa il PDF allegato.
`).join('\n---\n')}

📍 Lo Scalo - Frazione San Vito, 9 - 22010 Cremia (CO)
Senza scadenza - Valida per qualsiasi consumazione

Problemi? support@loscalo.it
`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.email,
      subject: `Le tue Gift Card - Ordine #${order.orderNumber}`,
      text,
      html: generateGiftCardHtml(order),
      attachments,
    })

    if (error) {
      console.error('Error sending gift card email:', error)
      return { success: false, error }
    }

    console.log('Gift card email sent with', attachments.length, 'PDFs')
    return { success: true, id: data?.id, attachments: attachments.length }
  } catch (err) {
    console.error('Exception sending gift card email:', err)
    return { success: false, error: err }
  }
}

// Logo URL pubblico
const LOGO_URL = 'https://i.ibb.co/JjXJtRjT/Lo-Scalo-vertical-orange.png'

// HTML template per conferma ordine
function generateOrderConfirmationHtml(order: OrderDetails, hasAttachments: boolean = false): string {
  const hasProducts = order.items.length > 0
  const hasGiftCards = order.giftCards.length > 0

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma Ordine #${order.orderNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${BRAND_DARK}; background-color: ${BRAND_CREAM};">
  <div style="background-color: white; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background-color: ${BRAND_CREAM}; border-radius: 16px;padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(78,110,88,0.1);">
      <div style="margin-bottom: 6px;">
        <img src="${LOGO_URL}" alt="Lo Scalo" style="max-width: 160px; height: auto;" />
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND_DARK}; margin: 0 0 8px;">Grazie per il tuo ordine!</h1>
      <div style="font-size: 15px; color: #666; font-weight: 500;">Ordine <strong style="color: ${BRAND_DARK};">#${order.orderNumber}</strong></div>
    </div>

    <div>
      <div style="background-color: white; padding: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px;margin-top: 16px;">
        <div style="font-size: 15px; font-weight: 700; color: ${BRAND_DARK}; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee;">Riepilogo ordine</div>
        
        <table width="100%" cellpadding="20" style="width: 100%; border-collapse: collapse;">
          ${order.items.map(item => `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
              <div style="font-weight: 600; color: ${BRAND_DARK}; font-size: 14px; margin-bottom: 4px;">${item.name}</div>
              <div style="font-size: 13px; color: #888;">Qty: ${item.quantity}${item.size ? ` • Taglia: ${item.size}` : ''}</div>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right; vertical-align: top; white-space: nowrap;">
              <div style="font-weight: 700; color: ${BRAND_DARK}; font-size: 15px;">€${item.totalPrice.toFixed(2)}</div>
            </td>
          </tr>
          `).join('')}
          
          ${order.giftCards.map(gc => `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
              <div style="font-weight: 600; color: ${BRAND_DARK}; font-size: 14px; margin-bottom: 4px;">Gift Card</div>
              <div style="font-size: 13px; color: #888;">${gc.code}</div>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right; vertical-align: top; white-space: nowrap;">
              <div style="font-weight: 700; color: ${BRAND_DARK}; font-size: 15px;">€${gc.initialValue.toFixed(2)}</div>
            </td>
          </tr>
          `).join('')}
          
          <tr>
            <td style="padding-top: 16px;">
              <span style="font-size: 16px; font-weight: 700; color: ${BRAND_DARK};">Totale</span>
            </td>
            <td style="padding-top: 16px; text-align: right;">
              <span style="font-size: 24px; font-weight: 700; color: ${BRAND_GREEN};">€${order.total.toFixed(2)}</span>
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 16px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
          Conferma inviata a: <strong>${order.email}</strong>
        </div>
      </div>

      ${hasGiftCards ? `
      <div style="background-color: rgba(240,90,40,0.1); border-radius: 16px; padding: 16px; margin-top: 16px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: ${BRAND_ORANGE};">🎁 Le tue Gift Card sono pronte!</div>
        <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.6;">${hasAttachments ? 'Trovi le tue Gift Card in formato PDF in allegato a questa email. Presenta il QR code al locale per utilizzarle.' : 'Riceverai un\'altra email con i PDF contenenti i QR code scansionabili.'} Le gift card sono già attive e utilizzabili da subito presso il nostro locale.</p>
      </div>
      ` : ''}

      ${hasProducts ? `
      <div style="background-color: rgba(78,110,88,0.1); border-radius: 16px; padding: 16px; margin-top: 16px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: ${BRAND_GREEN};">📦 Ritiro in sede</div>
        <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.6;">Potrai ritirare i prodotti fra 24/48 ore. Controlla gli orari di apertura del locale per sapere quando passare da noi!<br><br>
        <strong>Indirizzo:</strong> Frazione San Vito, 9 - 22010 Cremia (CO)</p>
      </div>
      ` : ''}
    </div>

    <div style="background-color: ${BRAND_CREAM}; border-radius: 16px; padding: 24px; margin-top: 16px; text-align: center; border-top: 1px solid rgba(78,110,88,0.1);">
      <p style="font-size: 13px; color: #666; margin: 0 0 8px;">Per problemi scrivi a <a href="mailto:support@loscalo.it" style="color: ${BRAND_GREEN}; text-decoration: none; font-weight: 600;">support@loscalo.it</a><br>indicando il numero d'ordine nell'oggetto.</p>
      <p style="margin-top: 20px; color: #999; font-size: 12px;">© 2026 Lo Scalo - Craft Drinks by the Lake</p>
    </div>
  </div>
</body>
</html>
  `
}

// HTML template per Gift Card
function generateGiftCardHtml(order: OrderDetails): string {
  return `
<html lang="it">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Le tue Gift Card - Ordine #${order.orderNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${BRAND_DARK}; background-color: #FFFFFF;">
  <div style="margin: 0 auto; background-color: white; border-radius: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background-color: #FFF5F0; border-radius: 16px; padding: 32px 24px; text-align: center;">
      <div style="margin-bottom: 6px;">
        <img src="${LOGO_URL}" alt="Lo Scalo" style="max-width: 160px; height: auto;" />
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #000000;">Le tue Gift Card</h1>
      <div style="opacity: 0.9; margin-top: 8px; color: #000000;">Ordine #${order.orderNumber}</div>
    </div>

    <div style="background-color: #EDF0EE; border-radius16px;">
      <div style="background-color: #EDF0EE; border-radius: 16px 16px 0px 0px; padding: 16px; margin-top: 16px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_DARK};"><strong>📎 PDF allegati</strong><br>Ogni Gift Card ha il suo PDF con QR code scansionabile,<br>pronto da salvare sul telefono o stampare.</p>
      </div>

      <div style="background-color: #EDF0EE; border-radius: 0px 0px 16px 16px; padding: 16px; text-align: center;">
        <h3 style="margin: 0 0 12px; font-size: 15px; color: ${BRAND_DARK};">📍 Come utilizzare la Gift Card</h3>
        <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #555;">
          <p>1. Vieni a trovarci presso <strong>Lo Scalo</strong><br>
              Frazione San Vito, 9 - 22010 Cremia (CO)</p>
          <p>2. Mostra il <strong>codice</strong> o il <strong>QR code</strong> al barista</p>
          <p>3. Il credito verrà scalato automaticamente dal totale</p>
        </ol>
        <p style="margin-top: 16px; font-weight: 600; color: ${BRAND_GREEN};">
          La Gift card è senza scadenza — Valida per qualsiasi consumazione
        </p>
      </div>
    </div>

    <div style="background-color: #FFF5F0; padding: 24px; border-radius: 16px;text-align: center;margin-top: 16px;">
      <p style="font-size: 13px; color: #666; margin: 0 0 8px;">Problemi con la Gift Card?</p>
      <p style="font-size: 13px; color: #666; margin: 0 0 8px;">Scrivi a <a href="mailto:support@loscalo.it" style="color: ${BRAND_GREEN}; text-decoration: none; font-weight: 600;">support@loscalo.it</a></p>
      <p style="font-size: 13px; color: #666; margin: 0 0 8px;">Indicando il numero d'ordine: <strong>#${order.orderNumber}</strong></p>
      <p style="margin-top: 20px; color: #999; font-size: 12px;">© 2026 Lo Scalo - Craft Drinks by the Lake</p>
    </div>
  </div>
</body>
</html>
  `
}

export { resend }
