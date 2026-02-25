"use client"

import Link from "next/link"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  const { lang, t } = useLanguage()

  const content = {
    it: {
      title: "Termini e Condizioni",
      lastUpdate: "Ultimo aggiornamento: 21 Febbraio 2026",
      sections: [
        {
          title: "1. Introduzione",
          content: `Benvenuto su Lo Scalo. Questi Termini e Condizioni regolano l'uso del nostro sito web e dei servizi offerti. Accedendo al sito e effettuando acquisti, accetti questi termini nella loro interezza. Se non sei d'accordo con questi termini, ti invitiamo a non utilizzare il nostro sito.`
        },
        {
          title: "2. Servizi Offerti",
          content: `Lo Scalo offre:
• Vendita di prodotti fisici (magliette, gadget) con ritiro in sede
• Vendita di Gift Card digitali utilizzabili presso il nostro locale
• Consultazione del menu cocktail (quando il locale è aperto)

Tutti i prodotti sono soggetti a disponibilità limitata e stagionale.`
        },
        {
          title: "3. Modalità di Acquisto",
          content: `Per effettuare un acquisto è necessario:
• Fornire un indirizzo email valido
• Fornire un numero di telefono valido
• Accettare i Termini e Condizioni al momento del checkout

I dati forniti (email e telefono) sono utilizzati esclusivamente per:
• Inviare la conferma dell'ordine
• Comunicare eventuali problemi con l'ordine
• Permettere il ritiro dei prodotti in sede

Non utilizziamo questi dati per marketing, profilazione o comunicazioni promozionali.`
        },
        {
          title: "4. Pagamenti",
          content: `I pagamenti sono gestiti interamente da Stripe, un servizio di pagamento sicuro certificato PCI DSS. Lo Scalo non memorizza né ha accesso ai dati della carta di credito. Tutte le transazioni sono criptate e sicure.

In caso di problemi con il pagamento, l'ordine rimane in stato "In attesa di pagamento" per 30 minuti, dopodiché viene automaticamente annullato.`
        },
        {
          title: "5. Ritiro in Sede",
          content: `Tutti i prodotti acquistati devono essere ritirati presso il nostro locale:
Indirizzo: Frazione San Vito, 9 - 22010 Cremia (CO)

I prodotti sono generalmente pronti per il ritiro entro 24-48 ore dall'ordine. Non effettuiamo spedizioni.

Per ritirare è necessario presentare:
• L'email di conferma con il numero d'ordine (digitale o stampata)
• Un documento d'identità valido

È possibile delegare un'altra persona al ritiro presentando l'email con il numero d'ordine.`
        },
        {
          title: "6. Resi e Rimborsi - Prodotti",
          content: `Hai diritto di recedere dall'acquisto entro 14 giorni dal ritiro del prodotto, senza dover fornire alcuna motivazione.

Condizioni per il reso:
• Il prodotto deve essere integro, non usato e con l'imballaggio originale
• Deve essere restituito presso il nostro locale
• È necessario presentare lo scontrino o l'email di conferma

In caso di reso conforme, il rimborso verrà effettuato entro 14 giorni dal ricevimento del prodotto restituito, tramite lo stesso metodo di pagamento utilizzato.`
        },
        {
          title: "7. Resi e Rimborsi - Gift Card",
          content: `Le Gift Card sono prodotti digitali con codice QR unico. Una volta acquistate e attivate, le Gift Card NON sono rimborsabili.

Validità e scadenza:
• Le Gift Card hanno una validità di 1 anno dalla data di acquisto
• La data di scadenza è indicata nell'email di conferma e sul PDF allegato
• Scaduto il termine, il credito residuo non potrà più essere utilizzato per gli acquisti
• Il credito residuo delle Gift Card scadute rimane nei nostri sistemi per finalità contabili

In caso di problemi tecnici con la ricezione della Gift Card (non arrivo email, QR code illeggibile), contattaci entro 7 giorni dall'acquisto a support@loscalo.it per risolvere il problema o ricevere un rimborso.`
        },
        {
          title: "8. Disponibilità Stagionale",
          content: `Lo Scalo è un locale stagionale. Durante i mesi di chiusura:
• Lo shop online può essere temporaneamente disattivato
• Il menu cocktail non è consultabile
• I ritiri dei prodotti acquistati potrebbero subire ritardi

Ti invitiamo a seguirci sui social per conoscere le date di apertura e chiusura.`
        },
        {
          title: "9. Limitazione di Responsabilità",
          content: `Lo Scalo non è responsabile per:
• Ritardi nel ritiro dovuti a cause di forza maggiore
• Perdita di dati dovuta a problemi tecnici del browser dell'utente
• Errori di sistema temporanei

Ci impegniamo a mantenere il sito sicuro e funzionante, ma non garantiamo la disponibilità ininterrotta del servizio.`
        },
        {
          title: "10. Modifiche ai Termini",
          content: `Ci riserviamo il diritto di modificare questi Termini e Condizioni in qualsiasi momento. Le modifiche saranno pubblicate su questa pagina con la data di aggiornamento. Ti invitiamo a consultare regolarmente questa pagina.`
        },
        {
          title: "11. Contatti",
          content: `Per qualsiasi domanda o reclamo:
Email: support@loscalo.it
Indirizzo: Frazione San Vito, 9 - 22010 Cremia (CO)
Telefono: +39 347 585 2220`
        }
      ]
    },
    en: {
      title: "Terms & Conditions",
      lastUpdate: "Last updated: February 21, 2026",
      sections: [
        {
          title: "1. Introduction",
          content: `Welcome to Lo Scalo. These Terms and Conditions govern the use of our website and services. By accessing the site and making purchases, you accept these terms in their entirety. If you do not agree with these terms, we invite you not to use our site.`
        },
        {
          title: "2. Services Offered",
          content: `Lo Scalo offers:
• Sale of physical products (t-shirts, gadgets) with in-store pickup
• Sale of digital Gift Cards usable at our venue
• Consultation of the cocktail menu (when the venue is open)

All products are subject to limited and seasonal availability.`
        },
        {
          title: "3. Purchase Methods",
          content: `To make a purchase you must:
• Provide a valid email address
• Provide a valid phone number
• Accept the Terms and Conditions at checkout

The data provided (email and phone) is used exclusively for:
• Sending order confirmation
• Communicating any problems with the order
• Allowing in-store pickup of products

We do not use this data for marketing, profiling, or promotional communications.`
        },
        {
          title: "4. Payments",
          content: `Payments are entirely managed by Stripe, a PCI DSS certified secure payment service. Lo Scalo does not store or have access to credit card data. All transactions are encrypted and secure.

In case of problems with payment, the order remains in "Pending Payment" status for 30 minutes, after which it is automatically cancelled.`
        },
        {
          title: "5. In-Store Pickup",
          content: `All purchased products must be picked up at our venue:
Address: Frazione San Vito, 9 - 22010 Cremia (CO), Italy

Products are generally ready for pickup within 24-48 hours of ordering. We do not ship products.

To pick up you must present:
• The confirmation email with the order number (digital or printed)
• A valid ID document

It is possible to delegate another person to pick up by presenting the email with the order number.`
        },
        {
          title: "6. Returns and Refunds - Products",
          content: `You have the right to withdraw from the purchase within 14 days of picking up the product, without having to provide any reason.

Return conditions:
• The product must be intact, unused, and in original packaging
• It must be returned to our venue
• The receipt or confirmation email must be presented

In case of a compliant return, the refund will be made within 14 days of receiving the returned product, using the same payment method used.`
        },
        {
          title: "7. Returns and Refunds - Gift Cards",
          content: `Gift Cards are digital products with a unique QR code. Once purchased and activated, Gift Cards are NOT refundable.

Validity and expiry:
• Gift Cards are valid for 1 year from the date of purchase
• The expiry date is indicated in the confirmation email and attached PDF
• After expiry, the remaining balance can no longer be used for purchases
• The remaining balance of expired Gift Cards remains in our systems for accounting purposes

In case of technical problems with receiving the Gift Card (email not arriving, unreadable QR code), contact us within 7 days of purchase at support@loscalo.it to resolve the issue or receive a refund.`
        },
        {
          title: "8. Seasonal Availability",
          content: `Lo Scalo is a seasonal venue. During closing months:
• The online shop may be temporarily deactivated
• The cocktail menu is not available
• Pickup of purchased products may be delayed

We invite you to follow us on social media to know the opening and closing dates.`
        },
        {
          title: "9. Limitation of Liability",
          content: `Lo Scalo is not responsible for:
• Delays in pickup due to force majeure
• Data loss due to user's browser technical problems
• Temporary system errors

We are committed to maintaining the site safe and functional, but we do not guarantee uninterrupted service availability.`
        },
        {
          title: "10. Changes to Terms",
          content: `We reserve the right to modify these Terms and Conditions at any time. Changes will be published on this page with the update date. We invite you to regularly check this page.`
        },
        {
          title: "11. Contact",
          content: `For any questions or complaints:
Email: support@loscalo.it
Address: Frazione San Vito, 9 - 22010 Cremia (CO), Italy
Phone: +39 347 585 2220`
        }
      ]
    }
  }

  const data = content[lang]

  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-sm drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/home" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <Link href="/home">
            <Logo variant="solo" className="h-8 w-auto" />
          </Link>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4 pb-24 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-headline-md font-bold text-brand-dark mb-2">
            {data.title}
          </h1>
          <p className="text-label-sm text-brand-gray">
            {data.lastUpdate}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {data.sections.map((section, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="text-title-md font-bold text-brand-dark mb-3">
                {section.title}
              </h2>
              <p className="text-body-sm text-brand-gray whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Link href="/home" className="btn-primary inline-block">
            {t("cart.back-to-menu")}
          </Link>
        </div>
      </div>
    </main>
  )
}
