"use client"

import Link from "next/link"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ArrowLeft, Check, X } from "lucide-react"

export default function CookiesPage() {
  const { lang, t } = useLanguage()

  const content = {
    it: {
      title: "Cookie Policy",
      lastUpdate: "Ultimo aggiornamento: 21 Febbraio 2026",
      intro: "Questa pagina spiega come utilizziamo i cookie sul nostro sito. Lo Scalo utilizza esclusivamente cookie tecnici essenziali, necessari per il funzionamento del sito. Non utilizziamo cookie di profilazione o di terze parti.",
      sections: [
        {
          title: "Cosa sono i Cookie",
          content: `I cookie sono piccoli file di testo che i siti web memorizzano sul tuo dispositivo quando li visiti. Servono a ricordare le tue preferenze e a garantire il corretto funzionamento del sito.`
        },
        {
          title: "Cookie che Utilizziamo",
          content: ``
        }
      ],
      table: {
        headers: ["Nome", "Tipo", "Scopo", "Durata"],
        rows: [
          ["lo-scalo-language", "Tecnico essenziale", "Memorizza la preferenza lingua (IT/EN)", "1 anno"],
          ["lo-scalo-cart", "Tecnico essenziale", "Memorizza gli articoli nel carrello", "Persistente"],
          ["Next.js (config)", "Tecnico essenziale", "Configurazione stato sito (menu/shop aperto)", "Sessione"]
        ]
      },
      otherSections: [
        {
          title: "Cookie che NON Utilizziamo",
          content: ``,
          list: [
            "Google Analytics o altri strumenti di analisi",
            "Facebook Pixel o Pixel di tracciamento",
            "Cookie pubblicitari o di targeting",
            "Cookie di profilazione comportamentale",
            "Cookie di terze parti per marketing"
          ],
          conclusion: "Non tracciamo la navigazione degli utenti né creiamo profili di marketing."
        },
        {
          title: "Gestione dei Cookie",
          content: `Poiché utilizziamo solo cookie tecnici essenziali, non è richiesto il consenso preventivo. Tuttavia, puoi gestire i cookie attraverso le impostazioni del tuo browser:

• Chrome: Impostazioni → Privacy e sicurezza → Cookie
• Firefox: Impostazioni → Privacy e sicurezza → Cookie
• Safari: Preferenze → Privacy → Cookie
• Edge: Impostazioni → Cookie e autorizzazioni sito

Nota: disabilitare i cookie tecnici potrebbe compromettere il funzionamento del sito (es. perdita del carrello).`
        },
        {
          title: "Servizi di Terze Parti",
          content: `Utilizziamo Stripe per i pagamenti. Stripe può utilizzare i propri cookie esclusivamente per:
• Prevenire frodi
• Elaborare i pagamenti in modo sicuro

Questi cookie sono essenziali per la sicurezza delle transazioni e non vengono utilizzati per tracciare o profilare gli utenti.`
        },
        {
          title: "Aggiornamenti",
          content: `Questa Cookie Policy può essere aggiornata periodicamente. La data dell'ultimo aggiornamento è indicata in cima alla pagina. Ti invitiamo a consultare regolarmente questa pagina.`
        },
        {
          title: "Contatti",
          content: `Per qualsiasi domanda sui cookie:
Email: support@loscalo.it`
        }
      ],
      summary: {
        title: "Riepilogo",
        items: [
          { icon: "check", text: "Solo cookie tecnici essenziali" },
          { icon: "check", text: "Nessun tracciamento" },
          { icon: "check", text: "Nessuna profilazione" },
          { icon: "check", text: "Nessun marketing" },
          { icon: "x", text: "No Google Analytics" },
          { icon: "x", text: "No Facebook Pixel" },
          { icon: "x", text: "No cookie pubblicitari" }
        ]
      }
    },
    en: {
      title: "Cookie Policy",
      lastUpdate: "Last updated: February 21, 2026",
      intro: "This page explains how we use cookies on our website. Lo Scalo uses only essential technical cookies necessary for site functionality. We do not use profiling or third-party cookies.",
      sections: [
        {
          title: "What are Cookies",
          content: `Cookies are small text files that websites store on your device when you visit them. They serve to remember your preferences and ensure proper site functionality.`
        },
        {
          title: "Cookies We Use",
          content: ``
        }
      ],
      table: {
        headers: ["Name", "Type", "Purpose", "Duration"],
        rows: [
          ["lo-scalo-language", "Essential technical", "Stores language preference (IT/EN)", "1 year"],
          ["lo-scalo-cart", "Essential technical", "Stores cart items", "Persistent"],
          ["Next.js (config)", "Essential technical", "Site status configuration (menu/shop open)", "Session"]
        ]
      },
      otherSections: [
        {
          title: "Cookies We Do NOT Use",
          content: ``,
          list: [
            "Google Analytics or other analytics tools",
            "Facebook Pixel or tracking pixels",
            "Advertising or targeting cookies",
            "Behavioral profiling cookies",
            "Third-party marketing cookies"
          ],
          conclusion: "We do not track user navigation or create marketing profiles."
        },
        {
          title: "Cookie Management",
          content: `Since we only use essential technical cookies, prior consent is not required. However, you can manage cookies through your browser settings:

• Chrome: Settings → Privacy and security → Cookies
• Firefox: Settings → Privacy and security → Cookies
• Safari: Preferences → Privacy → Cookies
• Edge: Settings → Cookies and site permissions

Note: disabling technical cookies may compromise site functionality (e.g., cart loss).`
        },
        {
          title: "Third-Party Services",
          content: `We use Stripe for payments. Stripe may use its own cookies exclusively for:
• Fraud prevention
• Secure payment processing

These cookies are essential for transaction security and are not used to track or profile users.`
        },
        {
          title: "Updates",
          content: `This Cookie Policy may be updated periodically. The last update date is indicated at the top of the page. We invite you to regularly check this page.`
        },
        {
          title: "Contact",
          content: `For any cookie questions:
Email: support@loscalo.it`
        }
      ],
      summary: {
        title: "Summary",
        items: [
          { icon: "check", text: "Only essential technical cookies" },
          { icon: "check", text: "No tracking" },
          { icon: "check", text: "No profiling" },
          { icon: "check", text: "No marketing" },
          { icon: "x", text: "No Google Analytics" },
          { icon: "x", text: "No Facebook Pixel" },
          { icon: "x", text: "No advertising cookies" }
        ]
      }
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

        {/* Intro */}
        <div className="bg-brand-orange/10 border border-brand-orange rounded-2xl p-6 mb-8">
          <p className="text-body-sm text-brand-dark">
            {data.intro}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
          <h2 className="text-title-md font-bold text-brand-dark mb-4">
            {data.summary.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.summary.items.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                {item.icon === "check" ? (
                  <div className="w-6 h-6 rounded-full bg-brand-green/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-brand-green" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand-red/20 flex items-center justify-center">
                    <X className="w-4 h-4 text-brand-red" />
                  </div>
                )}
                <span className="text-label-md text-brand-dark">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What are cookies */}
        <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
          <h2 className="text-title-md font-bold text-brand-dark mb-3">
            {data.sections[0].title}
          </h2>
          <p className="text-body-sm text-brand-gray">
            {data.sections[0].content}
          </p>
        </div>

        {/* Cookie Table */}
        <div className="bg-white rounded-2xl shadow-card p-6 mb-6 overflow-x-auto">
          <h2 className="text-title-md font-bold text-brand-dark mb-4">
            {data.sections[1].title}
          </h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-cream">
                {data.table.headers.map((header, i) => (
                  <th key={i} className="pb-3 text-label-sm font-semibold text-brand-dark pr-4">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.table.rows.map((row, i) => (
                <tr key={i} className="border-b border-brand-cream last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="py-3 text-body-sm text-brand-gray pr-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* What we don't use */}
        <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
          <h2 className="text-title-md font-bold text-brand-dark mb-3">
            {data.otherSections[0].title}
          </h2>
          <ul className="space-y-2 mb-4">
            {data.otherSections[0].list?.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-body-sm text-brand-gray">
                <X className="w-4 h-4 text-brand-red flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-body-sm text-brand-dark font-medium">
            {data.otherSections[0].conclusion}
          </p>
        </div>

        {/* Other sections */}
        {data.otherSections.slice(1).map((section, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-card p-6 mb-6">
            <h2 className="text-title-md font-bold text-brand-dark mb-3">
              {section.title}
            </h2>
            <p className="text-body-sm text-brand-gray whitespace-pre-line">
              {section.content}
            </p>
          </div>
        ))}

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
