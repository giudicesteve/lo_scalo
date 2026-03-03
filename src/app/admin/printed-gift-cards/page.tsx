"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Toast, useToast } from "@/components/Toast";
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

interface Stats {
  totalUnused: number;
  totalUnusedValue: number;
}

const QUANTITIES = [10, 25, 50, 100, 200, 500, 1000];
const VALUES = [10, 20, 25, 50, 100, 150, 200];

export default function PrintedGiftCardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  
  const [cards, setCards] = useState<PrintedCard[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUnused: 0, totalUnusedValue: 0 });
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
  const [activateExpiresAt, setActivateExpiresAt] = useState("");
  const [foundCard, setFoundCard] = useState<PrintedCard | null>(null);
  
  // Sezione espandibile
  const [showGuide, setShowGuide] = useState(false);

  // Check feature flag
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Verifica feature flag
    fetch("/api/feature-flags")
      .then(res => res.json())
      .then(data => {
        const flag = data.flags?.find((f: { key: string; enabled: boolean }) => f.key === "PRINTED_GIFT_CARDS");
        setFeatureEnabled(flag?.enabled ?? false);
      })
      .catch(() => setFeatureEnabled(false));
  }, []);

  // Redirect se non autenticato o feature disabilitata
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (featureEnabled === false) {
      router.push("/admin");
    }
  }, [status, featureEnabled, router]);

  const fetchCards = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/printed-gift-cards?used=false");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCards(data.cards);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching cards:", error);
      showToast("Errore nel caricamento", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

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

  // Cerca codice da attivare
  const searchCode = async () => {
    if (!activateCode.trim()) return;
    
    try {
      const response = await fetch(`/api/admin/printed-gift-cards?used=false`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      
      const card = data.cards.find((c: PrintedCard) => 
        c.code.toLowerCase() === activateCode.toLowerCase()
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

  // Attiva codice
  const handleActivate = async () => {
    if (!foundCard || !activateEmail) return;
    
    setIsActivating(true);
    try {
      const response = await fetch("/api/admin/printed-gift-cards/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: foundCard.code,
          email: activateEmail,
          phone: activatePhone,
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
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-gray">Feature non abilitata</p>
          <p className="text-label-sm text-brand-gray mt-2">Redirect in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={hideToast} />

      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin/gift-cards" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Gift Card Cartacee
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        
        {/* Statistiche */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <p className="text-label-sm text-brand-gray">Codici Disponibili</p>
            <p className="text-display-sm font-bold text-brand-dark">{stats.totalUnused}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <p className="text-label-sm text-brand-gray">Valore Totale</p>
            <p className="text-display-sm font-bold text-brand-primary">
              €{(stats.totalUnusedValue / 100).toFixed(2)}
            </p>
          </div>
        </div>

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
            <div className="flex gap-2">
              <input
                type="text"
                value={activateCode}
                onChange={(e) => setActivateCode(e.target.value.toUpperCase())}
                placeholder="Inserisci codice PG..."
                className="flex-1 px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-dark uppercase"
              />
              <button
                onClick={searchCode}
                className="px-6 py-3 rounded-full font-medium bg-brand-dark text-white hover:bg-brand-gray transition-all"
              >
                Cerca
              </button>
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
                  <input
                    type="email"
                    value={activateEmail}
                    onChange={(e) => setActivateEmail(e.target.value)}
                    placeholder="Email cliente *"
                    className="w-full px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-dark"
                  />
                  <input
                    type="tel"
                    value={activatePhone}
                    onChange={(e) => setActivatePhone(e.target.value)}
                    placeholder="Telefono cliente"
                    className="w-full px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-dark"
                  />
                  <input
                    type="date"
                    value={activateExpiresAt}
                    onChange={(e) => setActivateExpiresAt(e.target.value)}
                    placeholder="Data scadenza (opzionale)"
                    className="w-full px-4 py-3 rounded-xl border border-brand-light-gray bg-white text-brand-dark"
                  />
                  
                  <button
                    onClick={handleActivate}
                    disabled={isActivating || !activateEmail}
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
    </div>
  );
}
