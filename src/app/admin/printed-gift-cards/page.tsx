"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Toast, useToast } from "@/components/Toast";
import { QRScanner } from "@/components/QRScanner";
import {
  ArrowLeft,
  Printer,
  Download,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  QrCode,
  Info,
} from "lucide-react";

interface PrintedCard {
  id: string;
  code: string;
  value: number;
  used: boolean;
  usedAt: string | null;
  usedBy: string | null;
  createdAt: string;
}

interface ValueBreakdown {
  value: number;
  count: number;
}

interface Stats {
  totalUnused: number;
  valueBreakdown: ValueBreakdown[];
}

interface Batch {
  batchId: string;
  value: number;
  count: number;
  createdAt: string;
  codes: string[];
}

const QUANTITIES = [10, 25, 50, 100, 200, 500, 1000];
const VALUES = [10, 25, 50, 75, 100, 150, 200, 250, 500];

// Validazione email (stessa del carrello)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validazione telefono (stessa del carrello)
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+[\d\s\-\(\)\.]{6,20}$/
  return phoneRegex.test(phone)
}

export default function PrintedGiftCardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  
  const [cards, setCards] = useState<PrintedCard[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUnused: 0, valueBreakdown: [] });
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  
  // Form generazione
  const [quantity, setQuantity] = useState(25);
  const [value, setValue] = useState(50);
  
  // Form attivazione
  const [activateCode, setActivateCode] = useState("");
  const [activateEmail, setActivateEmail] = useState("");
  const [activatePhone, setActivatePhone] = useState("");
  const [activatePaymentMethod, setActivatePaymentMethod] = useState<"CASH" | "POS">("POS");
  const [activateExpiresAt, setActivateExpiresAt] = useState("");
  const [foundCard, setFoundCard] = useState<PrintedCard | null>(null);
  
  // Sezione espandibile
  const [showGuide, setShowGuide] = useState(false);

  // QR Scanner
  const [showScanner, setShowScanner] = useState(false);

  // Check feature flag
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  
  // Configurazione scadenza
  const [expiryConfig, setExpiryConfig] = useState<{ expiryType: string; expiryTime: string } | null>(null);
  
  useEffect(() => {
    // Verifica feature flag
    fetch("/api/feature-flags")
      .then(res => res.json())
      .then(data => {
        const flag = data.flags?.find((f: { key: string; enabled: boolean }) => f.key === "PRINTED_GIFT_CARDS");
        setFeatureEnabled(flag?.enabled ?? false);
      })
      .catch(() => setFeatureEnabled(false));
    
    // Recupera configurazione scadenza
    fetch("/api/admin/gift-card-settings")
      .then(res => res.json())
      .then(data => {
        if (data.expiryConfig) {
          setExpiryConfig(data.expiryConfig);
          // Pre-popola con la data di scadenza predefinita
          if (data.defaultExpiryDate) {
            setActivateExpiresAt(data.defaultExpiryDate.split("T")[0]);
          }
        }
      })
      .catch(err => console.error("Error fetching expiry config:", err));
  }, []);

  // Redirect se non autenticato
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Ref per showToast per evitare loop di dipendenze
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const fetchCards = useCallback(async () => {
    try {
      const [cardsRes, batchesRes] = await Promise.all([
        fetch("/api/admin/printed-gift-cards?used=false"),
        fetch("/api/admin/printed-gift-cards?groupByBatch=true"),
      ]);
      
      if (!cardsRes.ok) throw new Error("Failed to fetch cards");
      if (!batchesRes.ok) throw new Error("Failed to fetch batches");
      
      const cardsData = await cardsRes.json();
      const batchesData = await batchesRes.json();
      
      setCards(cardsData.cards);
      setStats(cardsData.stats);
      setBatches(batchesData.batches || []);
    } catch (error) {
      console.error("Error fetching cards:", error);
      showToastRef.current("Errore nel caricamento", "error");
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies - usa ref per toast

  useEffect(() => {
    if (status === "authenticated" && featureEnabled === true) {
      fetchCards();
    }
  }, [status, featureEnabled, fetchCards]);

  // Genera codici
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/admin/printed-gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate");
      }

      showToast(`${quantity} codici generati con successo`, "success");
      await fetchCards();
      
      // Download automatico CSV
      window.open("/api/admin/printed-gift-cards/csv", "_blank");
    } catch (error) {
      console.error("Error generating:", error);
      showToast(error instanceof Error ? error.message : "Errore", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download CSV per valore specifico con check su codici usati
  const handleDownloadByValue = async (valueEuro: number) => {
    try {
      // Fetch tutte le card di questo valore (incluse usate)
      const response = await fetch(`/api/admin/printed-gift-cards?value=${valueEuro}`);
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      const allCards: PrintedCard[] = data.cards || [];
      
      // Controlla se ci sono card usate
      const usedCards = allCards.filter((c: PrintedCard) => c.used);
      
      if (usedCards.length > 0) {
        showToast(
          `Attenzione: ${usedCards.length} codice/i da €${valueEuro} risulta/nano già utilizzato/i. Il CSV includerà tutti i codici con indicazione dello stato.`,
          "warning"
        );
      }
      
      // Scarica CSV con tutte le card (incluse usate)
      window.open(`/api/admin/printed-gift-cards/csv?value=${valueEuro}&includeUsed=true`, "_blank");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      showToast("Errore nel download del CSV", "error");
    }
  };

  // Cerca codice da attivare
  const searchCode = async (codeToSearch?: string) => {
    const searchValue = codeToSearch || activateCode;
    if (!searchValue.trim()) return;
    
    try {
      const response = await fetch(`/api/admin/printed-gift-cards?used=false`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      
      const card = data.cards.find((c: PrintedCard) => 
        c.code.toLowerCase() === searchValue.toLowerCase()
      );
      
      if (card) {
        setFoundCard(card);
      } else {
        showToast("Codice non trovato o già utilizzato", "error");
        setFoundCard(null);
      }
    } catch (error) {
      console.error("Error searching:", error);
      showToast("Errore nella ricerca", "error");
    }
  };

  const [errors, setErrors] = useState<{
    email?: string
    phone?: string
  }>({})

  // Attiva codice
  const handleActivate = async () => {
    if (!foundCard) return
    
    const newErrors: { email?: string; phone?: string } = {}
    
    // Validazione email
    if (!activateEmail?.trim()) {
      newErrors.email = "L'email è obbligatoria"
    } else if (!isValidEmail(activateEmail)) {
      newErrors.email = "L'email non è valida"
    }
    
    // Validazione telefono (obbligatorio)
    if (!activatePhone?.trim()) {
      newErrors.phone = "Il numero di telefono è obbligatorio"
    } else if (!isValidPhone(activatePhone)) {
      newErrors.phone = "Il numero di telefono non è valido (deve iniziare con +)"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors({})
    
    setIsActivating(true);
    try {
      const response = await fetch("/api/admin/printed-gift-cards/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: foundCard.code,
          email: activateEmail,
          phone: activatePhone,
          paymentMethod: activatePaymentMethod,
          expiresAt: activateExpiresAt || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to activate");
      }

      const data = await response.json();
      showToast(
        `Gift Card attivata! Codice: ${data.data.giftCardCode}`,
        "success"
      );
      
      // Reset form
      setActivateCode("");
      setActivateEmail("");
      setActivatePhone("");
      setActivateExpiresAt("");
      setFoundCard(null);
      
      await fetchCards();
    } catch (error) {
      console.error("Error activating:", error);
      showToast(error instanceof Error ? error.message : "Errore", "error");
    } finally {
      setIsActivating(false);
    }
  };

  if (status === "loading" || isLoading || featureEnabled === null) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    );
  }

  if (featureEnabled === false) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <h1 className="text-display-md font-bold text-brand-dark mb-2">404</h1>
        <p className="text-body-lg text-brand-gray mb-6">Pagina non trovata</p>
        <Link
          href="/admin"
          className="px-6 py-3 rounded-full bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors"
        >
          Torna alla Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={hideToast} />

      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Gestione Gift Card Cartacee
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        
        {/* Statistiche - Disponibili per Taglia */}
        <section className="bg-white rounded-2xl p-6 shadow-card">
          <h2 className="text-headline-sm font-bold text-brand-dark mb-4">
            Riepilogo per Taglia
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {stats.valueBreakdown.map((item) => (
              <div
                key={item.value}
                className="bg-brand-cream rounded-xl p-3 text-center"
              >
                <p className="text-headline-sm font-bold text-brand-dark">
                  {item.count}
                </p>
                <p className="text-label-sm text-brand-gray">
                  €{(item.value / 100).toFixed(0)}
                </p>
              </div>
            ))}
            {stats.valueBreakdown.length === 0 && (
              <p className="text-body-sm text-brand-gray col-span-full text-center py-4">
                Nessun codice disponibile
              </p>
            )}
          </div>
          <p className="text-label-sm text-brand-gray text-center border-t border-brand-light-gray pt-3">
            Totale: <strong>{stats.totalUnused}</strong> codici disponibili
          </p>
        </section>

        {/* Batch di Produzione - Lista Scrollabile */}
        <section className="bg-white rounded-2xl p-6 shadow-card">
          <h2 className="text-headline-sm font-bold text-brand-dark mb-4">
            Batch di Produzione
          </h2>
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
            {batches.length === 0 ? (
              <p className="text-body-sm text-brand-gray text-center py-8">
                Nessun batch disponibile
              </p>
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.batchId}
                  className="bg-brand-cream rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-headline-sm font-bold text-brand-dark">
                        €{(batch.value / 100).toFixed(0)}
                      </span>
                      <span className="text-label-sm text-brand-gray">
                        {batch.count} codici
                      </span>
                    </div>
                    <p className="text-label-xs text-brand-gray">
                      {new Date(batch.createdAt).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(`/api/admin/printed-gift-cards/csv?batchId=${batch.batchId}`, "_blank")}
                    className="ml-3 px-4 py-2 rounded-lg bg-white border border-brand-light-gray text-brand-primary hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 flex-shrink-0"
                    title="Scarica CSV batch"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-label-sm hidden sm:inline">CSV</span>
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-label-xs text-brand-gray mt-3 text-center">
            {batches.length} batch disponibili
          </p>
        </section>

        {/* Generazione */}
        <section className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Printer className="w-5 h-5 text-brand-primary" />
            <h2 className="text-headline-sm font-bold text-brand-dark">Genera Nuovi Codici</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-label-sm text-brand-gray mb-2">Valore</label>
              <select
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-dark"
                title="Seleziona il valore delle Gift Card"
              >
                {VALUES.map((v) => (
                  <option key={v} value={v}>€{v}.00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-label-sm text-brand-gray mb-2">Quantità</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-dark"
                title="Seleziona la quantità di codici da generare"
              >
                {QUANTITIES.map((q) => (
                  <option key={q} value={q}>{q} codici</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 px-6 rounded-full font-medium bg-brand-primary text-white hover:bg-brand-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? "Generazione..." : `Genera e Scarica CSV`}
          </button>
        </section>

        {/* Attivazione */}
        <section className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-brand-primary" />
            <h2 className="text-headline-sm font-bold text-brand-dark">Attiva Codice</h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={activateCode}
                onChange={(e) => setActivateCode(e.target.value.toUpperCase())}
                placeholder="Inserisci codice PG..."
                className="flex-1 px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-dark uppercase"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-primary hover:bg-brand-primary/5 transition-all flex items-center justify-center gap-2"
                  title="Scansiona QR Code"
                >
                  <QrCode className="w-5 h-5" />
                  <span className="sm:hidden">Scanner</span>
                </button>
                <button
                  onClick={() => searchCode()}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-primary hover:bg-brand-primary/5 transition-all flex items-center justify-center gap-2"
                >
                  Cerca
                </button>
              </div>
            </div>

            {foundCard && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-700">Codice trovato!</span>
                </div>
                <p className="text-body-sm text-brand-dark mb-1">
                  Valore: <strong>€{(foundCard.value / 100).toFixed(2)}</strong>
                </p>
                
                <div className="space-y-3 mt-4">
                  <div>
                    <input
                      type="email"
                      value={activateEmail}
                      onChange={(e) => {
                        setActivateEmail(e.target.value)
                        if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                      }}
                      placeholder="Email cliente *"
                      className={`w-full px-4 py-3 rounded-xl border bg-white text-brand-dark focus:outline-none transition-colors ${
                        errors.email 
                          ? "border-red-500 focus:border-red-500" 
                          : "border-brand-light-gray focus:border-brand-primary"
                      }`}
                    />
                    {errors.email && (
                      <p className="text-label-sm text-red-500 mt-1">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={activatePhone}
                      onChange={(e) => {
                        setActivatePhone(e.target.value)
                        if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }))
                      }}
                      placeholder="Telefono cliente *"
                      className={`w-full px-4 py-3 rounded-xl border bg-white text-brand-dark focus:outline-none transition-colors ${
                        errors.phone 
                          ? "border-red-500 focus:border-red-500" 
                          : "border-brand-light-gray focus:border-brand-primary"
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-label-sm text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>
                  
                  {/* Metodo di pagamento */}
                  <div>
                    <label className="block text-label-sm text-brand-gray mb-2">
                      Metodo di pagamento *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setActivatePaymentMethod("POS")}
                        className={`px-4 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                          activatePaymentMethod === "POS"
                            ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                            : "border-brand-light-gray bg-white text-brand-dark hover:bg-brand-primary/5"
                        }`}
                      >
                        <span className="font-medium">POS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivatePaymentMethod("CASH")}
                        className={`px-4 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                          activatePaymentMethod === "CASH"
                            ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                            : "border-brand-light-gray bg-white text-brand-dark hover:bg-brand-primary/5"
                        }`}
                      >
                        <span className="font-medium">Contanti</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-label-sm text-brand-gray mb-2">
                      Data scadenza (opzionale)
                      {expiryConfig && (
                        <span className="text-brand-primary ml-2">
                          (Default: {expiryConfig.expiryTime === "SIX_MONTHS" ? "6 mesi" : expiryConfig.expiryTime === "ONE_YEAR" ? "1 anno" : "2 anni"}
                          {expiryConfig.expiryType === "END_OF_MONTH" ? " - fine mese" : ""})
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={activateExpiresAt}
                      onChange={(e) => setActivateExpiresAt(e.target.value)}
                      title="Data di scadenza della Gift Card"
                      className="w-full px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-dark"
                    />
                  </div>
                  
                  <button
                    onClick={handleActivate}
                    disabled={isActivating || !activateEmail || !activatePhone}
                    className="w-full py-3 px-6 rounded-full font-medium bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-50"
                  >
                    {isActivating ? "Attivazione..." : "Attiva Gift Card"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Guida per Studio di Stampa */}
        <section className="bg-white rounded-2xl shadow-card overflow-hidden">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full p-6 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-brand-primary" />
              <h2 className="text-headline-sm font-bold text-brand-dark">
                Istruzioni per lo Studio di Stampa
              </h2>
            </div>
            {showGuide ? (
              <ChevronUp className="w-5 h-5 text-brand-gray" />
            ) : (
              <ChevronDown className="w-5 h-5 text-brand-gray" />
            )}
          </button>

          {showGuide && (
            <div className="px-6 pb-6 border-t border-brand-light-gray">
              <div className="pt-4 space-y-4">
                
                {/* Dati CSV */}
                <div>
                  <h3 className="font-semibold text-brand-dark mb-2">📄 Dati Forniti (CSV)</h3>
                  <ul className="text-body-sm text-brand-gray space-y-1">
                    <li>• <strong>Code:</strong> Codice PG (es: PGA39BWM7PH2K)</li>
                    <li>• <strong>QR_Code:</strong> URL API esterna per QR</li>
                    <li>• <strong>Value:</strong> Valore espresso (€50.00)</li>
                  </ul>
                </div>

                {/* Specifiche QR */}
                <div>
                  <h3 className="font-semibold text-brand-dark mb-2">
                    <QrCode className="w-4 h-4 inline mr-1" />
                    Specifiche Tecniche QR Code
                  </h3>
                  <div className="bg-brand-cream rounded-xl p-3 text-body-sm space-y-1">
                    <p><strong>Contenuto:</strong> Codice PG (14 caratteri)</p>
                    <p><strong>Tipo:</strong> QR Code standard (ISO/IEC 18004)</p>
                    <p><strong>Correzione errori:</strong> Level M (15%) minimo</p>
                    <p><strong>Modulo minimo:</strong> 0.5mm (consigliato 0.8mm)</p>
                    <p><strong>Dimensione minima:</strong> 15x15mm finito</p>
                    <p><strong>Quiet Zone:</strong> 4 moduli bianchi attorno</p>
                  </div>
                </div>

                {/* Formati */}
                <div>
                  <h3 className="font-semibold text-brand-dark mb-2">📐 Formati Consigliati</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-brand-cream rounded-xl p-3">
                      <p className="font-medium text-brand-dark text-sm">Digitale / Piccoli tiraggi</p>
                      <p className="text-label-sm text-brand-gray">Card 85x55mm, QR 20x20mm</p>
                      <p className="text-label-sm text-brand-gray">Carta 350gr opaca</p>
                    </div>
                    <div className="bg-brand-cream rounded-xl p-3">
                      <p className="font-medium text-brand-dark text-sm">Offset / Grandi tiraggi</p>
                      <p className="text-label-sm text-brand-gray">Card 85x55mm, QR 25x25mm</p>
                      <p className="text-label-sm text-brand-gray">Plastificazione opaca + UV</p>
                    </div>
                  </div>
                </div>

                {/* Errori da evitare */}
                <div>
                  <h3 className="font-semibold text-brand-dark mb-2">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Errori da Evitare
                  </h3>
                  <div className="space-y-2">
                    <p className="text-body-sm text-red-600">❌ NON invertire i colori (QR bianco su scuro)</p>
                    <p className="text-body-sm text-red-600">❌ NON comprimere troppo il QR (&lt; 15x15mm)</p>
                    <p className="text-body-sm text-red-600">❌ NON mettere grafica sopra il QR</p>
                    <p className="text-body-sm text-red-600">❌ NON usare carta lucida senza opacizzazione</p>
                  </div>
                </div>

                {/* Esempio layout */}
                <div>
                  <h3 className="font-semibold text-brand-dark mb-2">🎨 Esempio Layout</h3>
                  <div className="border-2 border-dashed border-brand-light-gray rounded-xl p-4 bg-white">
                    <div className="text-center space-y-2">
                      <p className="font-bold text-brand-primary">LOGO LO SCALO</p>
                      <div className="w-16 h-16 bg-brand-light-gray mx-auto rounded-lg flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-brand-gray" />
                      </div>
                      <p className="text-label-sm font-mono">PG: XXXXXXXX</p>
                      <p className="text-headline-sm font-bold">€50,00</p>
                      <p className="text-label-xs text-brand-gray">Termini e condizioni</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </section>

        {/* Download PDF */}
        <a
          href="/api/admin/printed-gift-cards/guide-pdf"
          target="_blank"
          className="block bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-brand-dark">Scarica PDF Guida Tecnica</h3>
              <p className="text-body-sm text-brand-gray">
                Specifiche complete per lo studio di stampa
              </p>
            </div>
            <Download className="w-5 h-5 text-brand-gray" />
          </div>
        </a>

      </div>

      {/* QR Scanner */}
      {showScanner && (
        <QRScanner
          onScan={(code) => {
            setActivateCode(code);
            setShowScanner(false);
            // Trigger automatic search after scan
            searchCode(code);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
