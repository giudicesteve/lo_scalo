import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/types'

interface LanguageStore {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  it: {
    // Landing
    'landing.title': 'Craft Drinks by the Lake',
    'landing.italian': 'Italiano',
    'landing.english': 'English',
    
    // Navigation
    'nav.menu': 'Sfoglia il menu',
    'nav.shop': 'Negozio',
    'nav.giftcard': 'Gift Card',
    'nav.story': 'La nostra storia',
    'nav.directions': 'Come arrivare',
    'nav.cart': 'Carrello',
    
    // Menu
    'menu.title': 'Sfoglia il menu',
    'menu.ingredients': 'Ingredienti',
    'menu.alcohol': 'Alcol',
    'menu.closed': 'Il bar è temporaneamente chiuso',
    'menu.closed-title': 'Ci vediamo presto!',
    'menu.closed-subtitle': 'Il locale è chiuso per la stagione. Seguici sui social per scoprire quando riapriremo!',
    'menu.view-previous': 'Menu stagione scorsa',
    'menu.back-to-menu': 'Indietro',
    
    // Shop
    'shop.title': 'Negozio',
    'shop.subtitle': 'Offriamo una piccola selezione di oggetti per ricordarti di noi e portarci sempre con te.',
    'shop.warning': 'ATTENZIONE',
    'shop.no-shipping': 'Non effettuiamo spedizioni! Una volta completata la procedura d\'acquisto, dovrai passare a ritirare i tuoi oggetti presso la nostra sede.',
    'shop.select-size': 'Seleziona taglia',
    'shop.add-to-cart': 'Aggiungi al carrello',
    'shop.continue': 'Continua',
    'shop.explore': 'Esplora il negozio',
    'shop.select-size-first': 'Seleziona una taglia e aggiungila al carrello',
    'shop.close': 'Chiudi',
    'shop.size-xs': 'XS',
    'shop.size-s': 'S',
    'shop.size-m': 'M',
    'shop.size-l': 'L',
    'shop.size-xl': 'XL',
    'shop.size-xxl': 'XXL',
    'shop.sizes-available': 'Taglie disponibili',
    'shop.sizes-count': '{count} taglie disponibili',
    'shop.sold-out': 'Esaurito',
    'shop.select-size-btn': 'Seleziona taglia',
    'shop.add-to-cart-btn': 'Aggiungi al carrello',
    'shop.max-stock-reached': 'Hai raggiunto la quantità massima disponibile',
    'shop.closed-title': 'Shop chiuso',
    'shop.closed-subtitle': 'Lo shop è temporaneamente chiuso per la stagione. Seguici sui social per scoprire quando riapriremo!',
    'shop.max-in-cart': 'Max raggiunto',
    'shop.available': 'Disponibili',
    'shop.select-size-title': 'Seleziona taglia',
    'shop.added-to-cart': 'aggiunto al carrello!',
    
    // Gift Card
    'giftcard.title': 'Gift Card',
    'giftcard.subtitle': 'Sorprendi chi ami con il gusto de Lo Scalo. Scegli una Gift Card e regala un momento indimenticabile nel nostro locale.',
    'giftcard.select-value': 'Seleziona il valore',
    'giftcard.add-to-cart': 'Aggiungi al carrello',
    'giftcard.attention': 'ATTENZIONE',
    'giftcard.email-delivery': 'Riceverai la Gift Card via email con un QR code pronto all\'uso. Senza scadenza e valida per qualsiasi consumo presso il locale. Prima di venire a trovarci, verifica sempre i nostri orari di apertura.',
    
    // Cart
    'cart.title': 'Riepilogo ordine',
    'cart.empty': 'Il carrello è vuoto',
    'cart.product': 'Prodotto',
    'cart.quantity': '#',
    'cart.total': 'Totale',
    'cart.checkout': 'Procedi al pagamento',
    'cart.clear': 'Svuota il carrello',
    'cart.email-placeholder': 'Inserisci la tua email',
    'cart.email-help': 'Ci servirà per mandarti la conferma dell\'ordine.',
    'cart.confirm': 'Paga ora',
    'cart.success': 'Ordine completato!',
    'cart.success-message': 'Grazie per il tuo ordine. Riceverai una email di conferma con i dettagli.',
    'cart.success-summary': 'Riepilogo ordine',
    'cart.success-qty': 'Qtà',
    'cart.success-sent-to': 'Conferma inviata a:',
    'cart.success-giftcard-title': 'Le tue Gift Card sono pronte!',
    'cart.success-giftcard-message': "Riceverai un'email con i QR code scansionabili. Le gift card sono già attive e utilizzabili da subito presso il nostro locale.",
    'cart.success-pickup-title': 'Ritiro in sede',
    'cart.success-pickup-message': 'potrai ritirare i prodotti fra 24/48 ore. Controlla gli orari di apertura del locale per sapere quando passare da noi!',
    'cart.success-no-email': 'Non hai ricevuto l\'email?',
    'cart.success-check-spam': 'Controlla nella cartella spam o promozioni.',
    'cart.success-contact': 'Per problemi scrivi a',
    'cart.success-contact-subject': 'indicando il numero d\'ordine nell\'oggetto.',
    'cart.back-to-menu': 'Torna al menu',
    'cart.close': 'Chiudi',
    'cart.canceled-title': 'Pagamento annullato',
    'cart.canceled-message': 'Il carrello è stato ripristinato, puoi riprovare quando vuoi.',
    'cart.canceled-error': 'Errore durante il ripristino del carrello',
    'cart.back-to-cart': 'Torna al carrello',
    'cart.order-number-missing': 'Numero ordine mancante',
    'cart.order-not-found': 'Ordine non trovato',
    'cart.support-subject': 'Richiesta supporto ordine',
    'cart.verified-by-system': 'Verificato dal sistema',
    'cart.back': 'Torna indietro',
    'cart.order-number': 'Ordine',
    
    // Cart - Errori e validazione
    'cart.error.email-required': "L'email è obbligatoria",
    'cart.error.email-invalid': "Inserisci un'email valida",
    'cart.error.phone-required': "Il numero di telefono è obbligatorio",
    'cart.error.phone-invalid': "Inserisci un numero di telefono valido",
    'cart.error.general': "Errore durante la creazione dell'ordine. Riprova.",
    'cart.error.connection': "Errore di connessione. Riprova.",
    'cart.error.payment-canceled': "Pagamento annullato. Il carrello è stato ripristinato, puoi riprovare quando vuoi.",
    'cart.error.product-unavailable': "L'articolo \"{product}\" non è più disponibile, torna indietro e cancella l'articolo dal carrello",
    'cart.error.products-unavailable': 'Alcuni articoli non sono più disponibili nelle quantità richieste',
    'cart.error.sold-out': 'Esaurito',
    'cart.error.available-now': 'Disponibili',
    'cart.error.go-back-update': 'Le quantità sono state aggiornate. Torna indietro per rivedere il carrello.',
    'cart.stock-updated': 'Le disponibilità sono state aggiornate',
    'cart.max-stock': 'Max disponibile',
    'cart.label.email': "Email",
    'cart.label.confirm-email': "Conferma email",
    'cart.label.phone': "Telefono",
    'cart.label.required': "obbligatorio",
    'cart.email-confirm-help': "Inserisci di nuovo l'email per evitare errori.",
    'cart.phone-help': "Ci servirà per contattarti in caso di problemi.",
    'cart.error.email-mismatch': "Le email non coincidono",
    
    // Admin
    'admin.login': 'Accesso Admin',
    'admin.dashboard': 'Dashboard',
    'admin.orders': 'Ordini Prodotti',
    'admin.giftcard-orders': 'Ordini Gift Card',
    'admin.menu': 'Menu',
    'admin.shop': 'Negozio',
    'admin.giftcards': 'Gift Card',
    'admin.archive': 'Archivio',
    'admin.logout': 'Esci',
    
    // Common
    'common.loading': 'Caricamento...',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.delete': 'Elimina',
    'common.edit': 'Modifica',
    'common.create': 'Crea',
    'common.search': 'Cerca',
    'common.filter': 'Filtra',
    'common.all': 'Tutti',
    'common.active': 'Attivi',
    'common.inactive': 'Inattivi',
    'common.back': 'Indietro',
    'common.available': 'disponibili',
    
    // Home - Storia
    'home.story.title': 'La nostra storia',
    'home.story.content': 'Lo Scalo è un cocktail bar sul Lago di Como, nato dalla passione per i drink artigianali e la natura che ci circonda. Ogni cocktail è una creazione unica, preparata con ingredienti freschi e locali. Vieni a scoprire un angolo di paradiso dove il lago incontra il gusto.',
    
    // Home - Indicazioni
    'home.directions.title': 'Come arrivare',
    'home.directions.content': 'Ci troviamo a Cremia, sulle sponde del Lago di Como. Segui le indicazioni per la strada statale del Lago di Como (SS340) e troverai il nostro locale con vista panoramica sul lago.',
    'home.directions.button': 'Apri Google Maps',
    
    // Footer
    'footer.contact': 'Contatti',
    'footer.follow-us': 'Seguici',
    'footer.legal': 'Legale',
    'footer.support': 'Info e Assistenza',
    'footer.faq': 'Domande frequenti',
    'footer.hours': 'Aperti tutti i giorni: 18:00 - 02:00',
    'footer.terms': 'Termini e condizioni',
    'footer.privacy': 'Privacy Policy',
    'footer.cookies': 'Cookie Policy',
    'footer.tagline': 'Crafted with passion by the Lake',
  },
  en: {
    // Landing
    'landing.title': 'Craft Drinks by the Lake',
    'landing.italian': 'Italian',
    'landing.english': 'English',
    
    // Navigation
    'nav.menu': 'Browse menu',
    'nav.shop': 'Shop',
    'nav.giftcard': 'Gift Card',
    'nav.story': 'Our story',
    'nav.directions': 'Directions',
    'nav.cart': 'Cart',
    
    // Menu
    'menu.title': 'Browse our menu',
    'menu.ingredients': 'Ingredients',
    'menu.alcohol': 'Alcohol',
    'menu.closed': 'The bar is temporarily closed',
    'menu.closed-title': 'See you soon!',
    'menu.closed-subtitle': 'We are closed for the season. Follow us on social media to find out when we will reopen!',
    'menu.view-previous': 'Previous season menu',
    'menu.back-to-menu': 'Back',
    
    // Shop
    'shop.title': 'Shop',
    'shop.subtitle': 'We offer a small selection of items to remember us and always carry us with you.',
    'shop.warning': 'ATTENTION',
    'shop.no-shipping': 'We do not ship! Once the purchase is completed, you will need to come to our location to pick up your items.',
    'shop.select-size': 'Select size',
    'shop.add-to-cart': 'Add to cart',
    'shop.continue': 'Continue',
    'shop.explore': 'Explore shop',
    'shop.select-size-first': 'Select a size and add to cart',
    'shop.close': 'Close',
    'shop.size-xs': 'XS',
    'shop.size-s': 'S',
    'shop.size-m': 'M',
    'shop.size-l': 'L',
    'shop.size-xl': 'XL',
    'shop.size-xxl': 'XXL',
    'shop.sizes-available': 'Sizes available',
    'shop.sizes-count': '{count} sizes available',
    'shop.sold-out': 'Sold out',
    'shop.select-size-btn': 'Select size',
    'shop.add-to-cart-btn': 'Add to cart',
    'shop.max-stock-reached': 'You have reached the maximum available quantity',
    'shop.closed-title': 'Shop closed',
    'shop.closed-subtitle': 'The shop is temporarily closed for the season. Follow us on social media to find out when we will reopen!',
    'shop.max-in-cart': 'Max reached',
    'shop.available': 'Available',
    'shop.select-size-title': 'Select size',
    'shop.added-to-cart': 'added to cart!',
    
    // Gift Card
    'giftcard.title': 'Gift Card',
    'giftcard.subtitle': 'Surprise your loved ones with the taste of Lo Scalo. Choose a Gift Card and give an unforgettable moment at our venue.',
    'giftcard.select-value': 'Select value',
    'giftcard.add-to-cart': 'Add to cart',
    'giftcard.attention': 'ATTENTION',
    'giftcard.email-delivery': 'You will receive the Gift Card via email with a ready-to-use QR code. No expiration and valid for any purchase at our venue. Before visiting us, always check our opening hours.',
    
    // Cart
    'cart.title': 'Order summary',
    'cart.empty': 'Your cart is empty',
    'cart.product': 'Product',
    'cart.quantity': '#',
    'cart.total': 'Total',
    'cart.checkout': 'Proceed to payment',
    'cart.clear': 'Clear cart',
    'cart.email-placeholder': 'Enter your email',
    'cart.email-help': 'We need it to send you the order confirmation.',
    'cart.confirm': 'Pay now',
    'cart.success': 'Order completed!',
    'cart.success-message': 'Thank you for your order. You will receive a confirmation email with details.',
    'cart.success-summary': 'Order summary',
    'cart.success-qty': 'Qty',
    'cart.success-sent-to': 'Confirmation sent to:',
    'cart.success-giftcard-title': 'Your Gift Cards are ready!',
    'cart.success-giftcard-message': 'You will receive an email with scannable QR codes. Gift cards are already active and ready to use at our location.',
    'cart.success-pickup-title': 'In-store pickup',
    'cart.success-pickup-message': 'you can pick up products within 24/48 hours. Check our opening hours to know when to visit us!',
    'cart.success-no-email': "Didn't receive the email?",
    'cart.success-check-spam': 'Check your spam or promotions folder.',
    'cart.success-contact': 'For issues, write to',
    'cart.success-contact-subject': 'indicating the order number in the subject.',
    'cart.back-to-menu': 'Back to menu',
    'cart.close': 'Close',
    'cart.canceled-title': 'Payment canceled',
    'cart.canceled-message': 'Your cart has been restored, you can try again whenever you want.',
    'cart.canceled-error': 'Error restoring your cart',
    'cart.back-to-cart': 'Back to cart',
    'cart.order-number-missing': 'Order number missing',
    'cart.order-not-found': 'Order not found',
    'cart.support-subject': 'Support request order',
    'cart.verified-by-system': 'Verified by system',
    'cart.back': 'Go back',
    'cart.order-number': 'Order',
    
    // Cart - Errori e validazione
    'cart.error.email-required': "Email is required",
    'cart.error.email-invalid': "Please enter a valid email",
    'cart.error.phone-required': "Phone number is required",
    'cart.error.phone-invalid': "Please enter a valid phone number",
    'cart.error.general': "Error creating order. Please try again.",
    'cart.error.connection': "Connection error. Please try again.",
    'cart.error.payment-canceled': "Payment canceled. Your cart has been restored, you can try again whenever you want.",
    'cart.error.product-unavailable': "The item \"{product}\" is no longer available, go back and remove the item from your cart",
    'cart.error.products-unavailable': 'Some items are no longer available in the requested quantities',
    'cart.error.sold-out': 'Sold out',
    'cart.error.available-now': 'Available',
    'cart.error.go-back-update': 'Quantities have been updated. Go back to review your cart.',
    'cart.stock-updated': 'Availability has been updated',
    'cart.max-stock': 'Max available',
    'cart.label.email': "Email",
    'cart.label.confirm-email': "Confirm email",
    'cart.label.phone': "Phone",
    'cart.label.required': "required",
    'cart.email-confirm-help': "Enter your email again to avoid mistakes.",
    'cart.phone-help': "We need it to contact you in case of issues.",
    'cart.error.email-mismatch': "Emails do not match",
    
    // Admin
    'admin.login': 'Admin Login',
    'admin.dashboard': 'Dashboard',
    'admin.orders': 'Product Orders',
    'admin.giftcard-orders': 'Gift Card Orders',
    'admin.menu': 'Menu',
    'admin.shop': 'Shop',
    'admin.giftcards': 'Gift Cards',
    'admin.archive': 'Archive',
    'admin.logout': 'Logout',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.back': 'Back',
    'common.available': 'available',
    
    // Home - Story
    'home.story.title': 'Our Story',
    'home.story.content': 'Lo Scalo is a cocktail bar on Lake Como, born from a passion for craft drinks and the nature that surrounds us. Each cocktail is a unique creation, prepared with fresh, local ingredients. Come discover a corner of paradise where the lake meets taste.',
    
    // Home - Directions
    'home.directions.title': 'How to get here',
    'home.directions.content': 'We are located in Cremia, on the shores of Lake Como. Follow the signs for the Lake Como State Road (SS340) and you will find our venue with panoramic lake views.',
    'home.directions.button': 'Open Google Maps',
    
    // Footer
    'footer.contact': 'Contact',
    'footer.follow-us': 'Follow Us',
    'footer.legal': 'Legal',
    'footer.support': 'Support',
    'footer.faq': 'FAQ',
    'footer.hours': 'Open every day: 6:00 PM - 2:00 AM',
    'footer.terms': 'Terms & Conditions',
    'footer.privacy': 'Privacy Policy',
    'footer.cookies': 'Cookie Policy',
    'footer.tagline': 'Crafted with passion by the Lake',
  },
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      lang: 'it',
      
      setLang: (lang: Language) => set({ lang }),
      
      t: (key: string) => {
        const { lang } = get()
        return translations[lang][key] || key
      },
    }),
    {
      name: 'lo-scalo-language',
    }
  )
)
