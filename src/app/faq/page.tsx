"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"

interface FAQItem {
  id: string
  question: string
  answer: string
}

function FAQSection({ title, items }: { title: string; items: FAQItem[] }) {
  const [openItem, setOpenItem] = useState<string | null>(null)

  return (
    <div className="mb-8">
      <h2 className="text-title-md font-bold text-brand-dark mb-4">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-card overflow-hidden"
          >
            <button
              onClick={() => setOpenItem(openItem === item.id ? null : item.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-body-md font-medium text-brand-dark pr-4">
                {item.question}
              </span>
              {openItem === item.id ? (
                <ChevronUp className="w-5 h-5 text-brand-primary flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-brand-gray flex-shrink-0" />
              )}
            </button>
            {openItem === item.id && (
              <div className="px-4 pb-4">
                <p className="text-body-sm text-brand-gray leading-relaxed">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FAQPage() {
  const { lang } = useLanguage()

  const faqData = {
    it: {
      title: "Domande Frequenti",
      subtitle: "Trova le risposte alle domande piu comuni su Lo Scalo",
      sections: [
        {
          title: "Ordini e Pagamenti",
          items: [
            {
              id: "payment-methods",
              question: "Quali metodi di pagamento accettate?",
              answer: "Accettiamo pagamenti tramite carta di credito/debito attraverso Stripe, in modo sicuro e protetto. Tutte le transazioni sono crittografate e i tuoi dati sono al sicuro."
            },
            {
              id: "order-confirmation",
              question: "Come ricevo la conferma del mio ordine?",
              answer: "Dopo il pagamento riceverai un'email di conferma con tutti i dettagli del tuo ordine, inclusi numero ordine, articoli acquistati e istruzioni per il ritiro. Controlla anche la cartella spam se non la vedi immediatamente. Nel caso l'email non sia arrivata, contattaci a support@loscalo.it con il numero di ordine nell'oggetto, ti risponderemo il prima possibile."
            },
            {
              id: "order-number",
              question: "Dove trovo il numero del mio ordine?",
              answer: "Il numero ordine ti viene mostrato al completamento del pagamento e ti viene inviato via email. Ha il formato ANNO-NUMERO (es: 2026-0042). Conservalo per eventuali assistenze."
            }
          ]
        },
        {
          title: "Gift Card",
          items: [
            {
              id: "giftcard-delivery",
              question: "Come ricevo la Gift Card?",
              answer: "La Gift Card viene inviata immediatamente via email dopo il pagamento. Contiene un QR code unico che potrai mostrare al nostro staff per utilizzarla. Nel caso le Gift Card non siano arrivate, contattaci a support@loscalo.it con il numero di ordine nell'oggetto, ti risponderemo il prima possibile."
            },
            {
              id: "giftcard-expiry",
              question: "Le Gift Card hanno scadenza?",
              answer: "Si, le Gift Card hanno una durata di 1 anno dalla data di acquisto. Scaduto questo periodo, il credito residuo non potrà piu essere utilizzato per gli acquisti e non potrà essere rimborsata. Ti consigliamo di utilizzare la Gift Card entro la data di scadenza indicata nell'email e sul PDF allegato."
            },
            {
              id: "giftcard-use",
              question: "Come utilizzo la Gift Card?",
              answer: "Presenta il QR code ricevuto via email al nostro staff al momento del pagamento. Il QR code puo essere scannerizzato direttamente dal tuo smartphone o stampato. Ogni transazione verra scalata automaticamente dal saldo disponibile."
            },
            {
              id: "giftcard-balance",
              question: "Come controllo il saldo residuo?",
              answer: "Il saldo residuo viene comunicato dopo ogni utilizzo. Per controllarlo in qualsiasi momento, puoi scriverci a support@loscalo.it indicando il codice della tua Gift Card."
            },
            {
              id: "giftcard-multiple",
              question: "Posso usare piu Gift Card per un singolo ordine?",
              answer: "Si, puoi utilizzare multiple Gift Card per pagare un unico ordine. Il nostro staff potra scannerizzare piu QR code e sommare i saldi."
            }
          ]
        },
        {
          title: "Ritiro in Sede",
          items: [
            {
              id: "pickup-location",
              question: "Dove ritiro i prodotti acquistati?",
              answer: "Tutti i prodotti devono essere ritirati presso il nostro locale a Cremia (CO), in Frazione San Vito, 9. Non effettuiamo spedizioni."
            },
            {
              id: "pickup-time",
              question: "Quando posso ritirare i prodotti?",
              answer: "I prodotti sono generalmente pronti per il ritiro entro 24-48 ore dall'ordine. Verifica sempre i nostri orari di apertura."
            },
            {
              id: "pickup-hours",
              question: "Quali sono gli orari di apertura?",
              answer: "Solitamente siamo aperti da inizio aprile a fine settembre, ti consigliamo di controllare i nostri social o su google maps per aggiornamenti."
            },
            {
              id: "someone-else",
              question: "Puo ritirare un'altra persona al posto mio?",
              answer: "Si, basta che la persona presenti l'email con il numero di ordine (digitale o stampata)."
            }
          ]
        },
        {
          title: "Shop e Prodotti",
          items: [
            {
              id: "product-availability",
              question: "I prodotti sono sempre disponibili?",
              answer: "La disponibilita dei prodotti e limitata e soggetta alle scorte di magazzino. Durante l'acquisto puoi vedere la quantita disponibile in tempo reale. Se un prodotto e esaurito, puoi contattarci per sapere quando sara disponibile."
            },
            {
              id: "product-sizes",
              question: "Come scegliere la taglia corretta?",
              answer: "Ogni prodotto con taglie mostra la disponibilita per ogni taglia. Seleziona la taglia desiderata prima di aggiungere al carrello. Le taglie esaurite non saranno selezionabili."
            },
            {
              id: "shop-seasonal",
              question: "Lo shop e sempre aperto?",
              answer: "Lo shop online segue la stagionalita del nostro locale. Durante i mesi di chiusura stagionale lo shop potrebbe essere temporaneamente disattivato. Seguici sui social per sapere quando riapriamo."
            }
          ]
        },
        {
          title: "Menu e Cocktail",
          items: [
            {
              id: "menu-availability",
              question: "Il menu e sempre disponibile online?",
              answer: "Il menu online e disponibile durante i mesi di apertura del locale. Quando siamo chiusi per la stagione, il menu viene temporaneamente nascosto. Puoi comunque consultare la lista della stagione precedente."
            },
            {
              id: "cocktail-reservation",
              question: "E necessario prenotare per consumare al locale?",
              answer: "Non accettiamo prenotazioni al locale."
            }
          ]
        },
        {
          title: "Assistenza e Problemi",
          items: [
            {
              id: "support-contact",
              question: "Come posso contattare l'assistenza?",
              answer: "Per qualsiasi problema o domanda scrivi a support@loscalo.it indicando sempre il numero d'ordine nell'oggetto. Rispondiamo entro 24-48 ore."
            },
            {
              id: "wrong-order",
              question: "Ho sbagliato ordine, cosa posso fare?",
              answer: "Se l'ordine non e stato pagato, puoi tornare indietro e svuotare il carrello e crearne uno nuovo. Se hai gia pagato, contattaci immediatamente a support@loscalo.it con il numero d'ordine e spiega la situazione. Faremo il possibile per aiutarti."
            },
            {
              id: "email-not-received",
              question: "Non ho ricevuto l'email di conferma, cosa fare?",
              answer: "Controlla sempre la cartella spam o promozioni del tuo provider email. Se non trovi nulla, scrivici a support@loscalo.it indicando l'email utilizzata per l'ordine e, se lo hai segnato, il numero di ordine. Altrimenti indicaci il numero di telefono, il giorno e l'ora di acquisto. Ti invieremo nuovamente la conferma."
            },
            {
              id: "payment-error",
              question: "Il pagamento e fallito, ma l'ordine risulta creato",
              answer: "Se il pagamento non va a buon fine, l'ordine rimane in stato 'In attesa di pagamento' per 30 minuti. Puoi riprovare il pagamento, oppure l'ordine verra automaticamente annullato e i prodotti rilasciati."
            }
          ]
        }
      ]
    },
    en: {
      title: "Frequently Asked Questions",
      subtitle: "Find answers to the most common questions about Lo Scalo",
      sections: [
        {
          title: "Orders & Payments",
          items: [
            {
              id: "payment-methods",
              question: "What payment methods do you accept?",
              answer: "We accept credit/debit card payments through Stripe, in a secure and protected way. All transactions are encrypted and your data is safe."
            },
            {
              id: "order-confirmation",
              question: "How do I receive order confirmation?",
              answer: "After payment, you will receive a confirmation email with all order details, including order number, purchased items, and pickup instructions. Check your spam folder if you don't see it immediately. If you haven't received the email, contact us at support@loscalo.it with the order number in the subject, we will reply as soon as possible."
            },
            {
              id: "order-number",
              question: "Where can I find my order number?",
              answer: "The order number is shown upon payment completion and sent via email. It has the format YEAR-NUMBER (e.g., 2026-0042). Keep it for any assistance needed."
            }
          ]
        },
        {
          title: "Gift Cards",
          items: [
            {
              id: "giftcard-delivery",
              question: "How do I receive the Gift Card?",
              answer: "The Gift Card is sent immediately via email after payment. It contains a unique QR code that you can show to our staff to use it. If you haven't received the Gift Card, contact us at support@loscalo.it with the order number in the subject, we will reply as soon as possible."
            },
            {
              id: "giftcard-expiry",
              question: "Do Gift Cards expire?",
              answer: "Yes, Gift Cards are valid for 1 year from the date of purchase. After this period, the remaining balance can no longer be used for purchases, and cannot be refunded. We recommend using your Gift Card before the expiration date indicated in the email and attached PDF."
            },
            {
              id: "giftcard-use",
              question: "How do I use the Gift Card?",
              answer: "Present the QR code received via email to our staff when paying. The QR code can be scanned directly from your smartphone or printed. Each transaction will be automatically deducted from the available balance."
            },
            {
              id: "giftcard-balance",
              question: "How do I check the remaining balance?",
              answer: "The remaining balance is communicated after each use. To check it at any time, you can write to us at support@loscalo.it indicating your Gift Card code."
            },
            {
              id: "giftcard-multiple",
              question: "Can I use multiple Gift Cards for a single order?",
              answer: "Yes, you can use multiple Gift Cards to pay for a single order. Our staff can scan multiple QR codes and add up the balances."
            }
          ]
        },
        {
          title: "In-Store Pickup",
          items: [
            {
              id: "pickup-location",
              question: "Where do I pick up purchased products?",
              answer: "All products must be picked up at our venue in Cremia (CO), Frazione San Vito, 9. We do not ship products."
            },
            {
              id: "pickup-time",
              question: "When can I pick up products?",
              answer: "Products are generally ready for pickup within 24-48 hours of ordering, always check our opening hours."
            },
            {
              id: "pickup-hours",
              question: "What are your opening hours?",
              answer: "We're usually open from early April to late September. Check our social media or Google Maps for updates."
            },
            {
              id: "someone-else",
              question: "Can someone else pick up on my behalf?",
              answer: "Yes, the person just needs to present the email with the order number (digital or printed)."
            }
          ]
        },
        {
          title: "Shop & Products",
          items: [
            {
              id: "product-availability",
              question: "Are products always available?",
              answer: "Product availability is limited and subject to warehouse stock. During purchase you can see the real-time available quantity. If a product is sold out, you can contact us to find out when it will be available."
            },
            {
              id: "product-sizes",
              question: "How do I choose the correct size?",
              answer: "Each product with sizes shows availability for each size. Select the desired size before adding to cart. Sold out sizes will not be selectable."
            },
            {
              id: "shop-seasonal",
              question: "Is the shop always open?",
              answer: "The online shop follows the seasonality of our venue. During closing months the shop may be temporarily deactivated. Follow us on social media to know when we reopen."
            }
          ]
        },
        {
          title: "Menu & Cocktails",
          items: [
            {
              id: "menu-availability",
              question: "Is the menu always available online?",
              answer: "The online menu is available during our opening months. When we are closed for the season, the menu is temporarily hidden. You can still check the list from the previous season."
            },
            {
              id: "cocktail-reservation",
              question: "Do I need a reservation to visit?",
              answer: "We do not accept reservations at our venue."
            }
          ]
        },
        {
          title: "Support & Issues",
          items: [
            {
              id: "support-contact",
              question: "How can I contact support?",
              answer: "For any problem or question write to support@loscalo.it always indicating the order number in the subject. We respond within 24-48 hours."
            },
            {
              id: "wrong-order",
              question: "I made a mistake with my order, what can I do?",
              answer: "If the order hasn't been paid, you can go back and clear the cart and create a new one. If you've already paid, contact us immediately at support@loscalo.it with the order number and explain the situation. We'll do our best to help."
            },
            {
              id: "email-not-received",
              question: "I didn't receive the confirmation email, what should I do?",
              answer: "Always check your email provider's spam or promotions folder. If you can't find anything, write to us at support@loscalo.it indicating the email used for the order and, if you wrote it down, the order number. Otherwise provide us with the phone number, day and time of purchase. We'll resend the confirmation."
            },
            {
              id: "payment-error",
              question: "Payment failed, but order shows as created",
              answer: "If payment doesn't go through, the order remains in 'Pending Payment' status for 30 minutes. You can retry payment, or the order will be automatically cancelled and products released."
            }
          ]
        }
      ]
    }
  }

  const content = faqData[lang]

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
            {content.title}
          </h1>
          <p className="text-body-md text-brand-gray">
            {content.subtitle}
          </p>
        </div>

        {/* FAQ Sections */}
        {content.sections.map((section) => (
          <FAQSection
            key={section.title}
            title={section.title}
            items={section.items}
          />
        ))}

        {/* Contact CTA */}
        <div className="bg-brand-primary/10 rounded-2xl p-6 text-center mt-8">
          <p className="text-body-md text-brand-dark mb-4">
            {lang === 'it' 
              ? "Non hai trovato la risposta che cercavi?" 
              : "Didn't find the answer you were looking for?"}
          </p>
          <a
            href="mailto:support@loscalo.it"
            className="btn-primary inline-block"
          >
            {lang === 'it' ? "Contattaci" : "Contact Us"}
          </a>
        </div>
      </div>
    </main>
  )
}
