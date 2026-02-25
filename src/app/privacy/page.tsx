"use client"

import Link from "next/link"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  const { lang, t } = useLanguage()

  const content = {
    it: {
      title: "Privacy Policy",
      lastUpdate: "Ultimo aggiornamento: 21 Febbraio 2026",
      sections: [
        {
          title: "1. Titolare del Trattamento",
          content: `Il titolare del trattamento dei dati personali è Lo Scalo, con sede in Frazione San Vito, 9 - 22010 Cremia (CO) - Italia, P.IVA IT03661710131.

Per qualsiasi informazione riguardante il trattamento dei dati personali, puoi contattarci all'indirizzo email: support@loscalo.it`
        },
        {
          title: "2. Dati Raccolti",
          content: `Raccogliamo esclusivamente i seguenti dati personali:

• Indirizzo email: necessario per inviare la conferma dell'ordine
• Numero di telefono: necessario per contattarti in caso di problemi con l'ordine

Non raccogliamo:
• Dati di navigazione o tracciamento
• Cookie di profilazione o marketing
• Informazioni sulle preferenze di acquisto
• Dati demografici o personali aggiuntivi

I dati di pagamento (carta di credito) sono gestiti esclusivamente da Stripe. Lo Scalo non ha mai accesso a questi dati.`
        },
        {
          title: "3. Finalità del Trattamento",
          content: `I dati raccolti sono utilizzati esclusivamente per:

• Inviare la conferma dell'ordine e i dettagli dell'acquisto
• Comunicare eventuali problemi o variazioni nell'ordine
• Permettere il ritiro dei prodotti in sede (verifica identità)
• Assistenza clienti in caso di richieste o reclami

I dati NON sono utilizzati per:
• Marketing diretto o indiretto
• Profilazione dell'utente
• Comunicazioni promozionali
• Vendita a terzi
• Newsletter (non inviamo newsletter)`
        },
        {
          title: "4. Base Giuridica del Trattamento",
          content: `Il trattamento dei dati si basa su:

• Esecuzione di un contratto (l'acquisto): l'email e il telefono sono necessari per completare l'ordine
• Obblighi legali: conservazione degli ordini per finalità fiscali

Non è richiesto il consenso per attività di marketing perché non ne effettuiamo.`
        },
        {
          title: "5. Conservazione dei Dati",
          content: `I dati personali sono conservati per:

• Ordini completati: 10 anni (obbligo fiscale)
• Ordini annullati/non completati: 30 giorni
• Richieste di assistenza: 2 anni dalla risoluzione

Trascorsi questi termini, i dati vengono cancellati automaticamente.`
        },
        {
          title: "6. Sicurezza dei Dati",
          content: `Adottiamo misure di sicurezza appropriate per proteggere i dati:

• Connessione HTTPS/TLS su tutto il sito
• Database protetto e accessibile solo al personale autorizzato
• Pagamenti gestiti da Stripe (PCI DSS compliant)
• Nessuna memorizzazione di dati sensibili di pagamento
• Cookie tecnici essenziali solo per funzionalità del sito`
        },
        {
          title: "7. Condivisione con Terzi",
          content: `I dati personali non sono venduti, scambiati o trasferiti a terzi per scopi commerciali.

Condivisione limitata a:
• Stripe: per la gestione dei pagamenti (solo dati transazionali, non email/telefono)
• Autorità competenti: solo su richiesta legale

Stripe agisce come responsabile del trattamento autonomo per i dati di pagamento.`
        },
        {
          title: "8. Cookie Utilizzati",
          content: `Utilizziamo esclusivamente cookie tecnici essenziali:

• Cookie di lingua (lo-scalo-language): memorizza la preferenza italiano/inglese
• Cookie di carrello (lo-scalo-cart): memorizza gli articoli nel carrello
• Cookie di configurazione sito: stato del menu/shop (aperto/chiuso)

Non utilizziamo:
• Cookie di profilazione
• Cookie di terze parti (Google Analytics, Facebook Pixel, ecc.)
• Cookie per pubblicità mirata

Il sito non traccia la navigazione degli utenti.`
        },
        {
          title: "9. Diritti dell'Utente (GDPR)",
          content: `Hai il diritto di:

• Accesso: richiedere una copia dei tuoi dati personali
• Rettifica: correggere dati inesatti
• Cancellazione ("diritto all'oblio"): richiedere la cancellazione dei dati (salvo obblighi legali)
• Limitazione: richiedere la limitazione del trattamento
• Opposizione: opporti al trattamento (quando applicabile)
• Portabilità: ricevere i dati in formato strutturato

Per esercitare questi diritti, scrivi a support@loscalo.it con oggetto "Richiesta GDPR".

Hai anche il diritto di presentare reclamo all'Autorità Garante per la Protezione dei Dati Personali.`
        },
        {
          title: "10. Modifiche alla Privacy Policy",
          content: `Ci riserviamo il diritto di aggiornare questa Privacy Policy in qualsiasi momento. Le modifiche saranno pubblicate su questa pagina con la data di aggiornamento. Ti invitiamo a consultare regolarmente questa pagina.`
        },
        {
          title: "11. Contatti",
          content: `Per qualsiasi domanda sulla privacy:
Email: support@loscalo.it
Indirizzo: Frazione San Vito, 9 - 22010 Cremia (CO) - Italia`
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      lastUpdate: "Last updated: February 21, 2026",
      sections: [
        {
          title: "1. Data Controller",
          content: `The data controller is Lo Scalo, located at Frazione San Vito, 9 - 22010 Cremia (CO), Italy, VAT IT03661710131.

For any information regarding the processing of personal data, you can contact us at: support@loscalo.it`
        },
        {
          title: "2. Data Collected",
          content: `We collect exclusively the following personal data:

• Email address: required to send order confirmation
• Phone number: required to contact you in case of order issues

We do NOT collect:
• Browsing or tracking data
• Profiling or marketing cookies
• Information about purchase preferences
• Demographic or additional personal data

Payment data (credit card) is exclusively managed by Stripe. Lo Scalo never has access to this data.`
        },
        {
          title: "3. Purpose of Processing",
          content: `The collected data is used exclusively for:

• Sending order confirmation and purchase details
• Communicating any problems or changes to the order
• Allowing in-store product pickup (identity verification)
• Customer support for requests or complaints

Data is NOT used for:
• Direct or indirect marketing
• User profiling
• Promotional communications
• Sale to third parties
• Newsletters (we don't send newsletters)`
        },
        {
          title: "4. Legal Basis for Processing",
          content: `Data processing is based on:

• Performance of a contract (purchase): email and phone are necessary to complete the order
• Legal obligations: order retention for tax purposes

Consent for marketing activities is not required because we do not engage in any marketing.`
        },
        {
          title: "5. Data Retention",
          content: `Personal data is retained for:

• Completed orders: 10 years (tax obligation)
• Cancelled/incomplete orders: 30 days
• Support requests: 2 years from resolution

After these periods, data is automatically deleted.`
        },
        {
          title: "6. Data Security",
          content: `We adopt appropriate security measures to protect data:

• HTTPS/TLS connection throughout the site
• Protected database accessible only to authorized personnel
• Payments managed by Stripe (PCI DSS compliant)
• No storage of sensitive payment data
• Essential technical cookies only for site functionality`
        },
        {
          title: "7. Sharing with Third Parties",
          content: `Personal data is not sold, exchanged, or transferred to third parties for commercial purposes.

Limited sharing with:
• Stripe: for payment management (only transactional data, not email/phone)
• Competent authorities: only upon legal request

Stripe acts as an independent data controller for payment data.`
        },
        {
          title: "8. Cookies Used",
          content: `We use only essential technical cookies:

• Language cookie (lo-scalo-language): stores Italian/English preference
• Cart cookie (lo-scalo-cart): stores cart items
• Site configuration cookie: menu/shop status (open/closed)

We do NOT use:
• Profiling cookies
• Third-party cookies (Google Analytics, Facebook Pixel, etc.)
• Targeted advertising cookies

The site does not track user navigation.`
        },
        {
          title: "9. User Rights (GDPR)",
          content: `You have the right to:

• Access: request a copy of your personal data
• Rectification: correct inaccurate data
• Erasure ("right to be forgotten"): request deletion of data (except legal obligations)
• Restriction: request limitation of processing
• Objection: object to processing (when applicable)
• Portability: receive data in a structured format

To exercise these rights, write to support@loscalo.it with subject "GDPR Request".

You also have the right to lodge a complaint with the Data Protection Authority.`
        },
        {
          title: "10. Changes to Privacy Policy",
          content: `We reserve the right to update this Privacy Policy at any time. Changes will be published on this page with the update date. We invite you to regularly check this page.`
        },
        {
          title: "11. Contact",
          content: `For any privacy questions:
Email: support@loscalo.it
Address: Frazione San Vito, 9 - 22010 Cremia (CO), Italy`
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
