"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/Logo"
import {
  ShoppingBag,
  Wine,
  Store,
  Wallet,
  LogOut,
  User,
  CreditCard,
  ExternalLink,
  Calculator,
  FileText,
  Menu,
  X,
  Settings,
  Gift,
  Printer,
} from "lucide-react"

// Feature flag keys
const FEATURE_FLAGS = {
  SHOP_ENABLED: "SHOP_ENABLED",
  GIFT_CARDS_ENABLED: "GIFT_CARDS_ENABLED",
  GIFT_CARDS_POS_ENABLED: "GIFT_CARDS_POS_ENABLED",
  MENU_ENABLED: "MENU_ENABLED",
  PRINTED_GIFT_CARDS: "PRINTED_GIFT_CARDS",
}

interface FeatureFlags {
  [key: string]: boolean;
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [canManageAdmins, setCanManageAdmins] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({})

  useEffect(() => {
    // Verifica se l'admin può gestire altri admin
    fetch("/api/admin/admins")
      .then(res => res.ok ? setCanManageAdmins(true) : setCanManageAdmins(false))
      .catch(() => setCanManageAdmins(false))
    
    // Carica feature flags
    fetch("/api/feature-flags")
      .then(res => res.json())
      .then(data => {
        if (data.flags) {
          const flagsMap = data.flags.reduce((acc: FeatureFlags, flag: { key: string; enabled: boolean }) => {
            acc[flag.key] = flag.enabled;
            return acc;
          }, {});
          setFeatureFlags(flagsMap);
        }
      })
      .catch(err => console.error("Error fetching feature flags:", err));
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  // Reset scroll when navigating to a new page
  useEffect(() => {
    window.scrollTo(0, 0)
    // Close mobile menu on navigation
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Menu items dinamici basati sui feature flags
  // Mostra "Gestione Gift Card" solo se almeno uno dei tre flag è abilitato
  const showGiftCardManagement = featureFlags[FEATURE_FLAGS.GIFT_CARDS_ENABLED] !== false || 
                                  featureFlags[FEATURE_FLAGS.GIFT_CARDS_POS_ENABLED] !== false ||
                                  featureFlags[FEATURE_FLAGS.PRINTED_GIFT_CARDS] === true;

  const menuItems = [
    { href: "/admin/orders", label: "Ordini", icon: ShoppingBag },
    ...(showGiftCardManagement ? [{ href: "/admin/gift-cards", label: "Gestione Gift Card", icon: Wallet }] : []),
    ...(featureFlags[FEATURE_FLAGS.GIFT_CARDS_POS_ENABLED] !== false ? [{ href: "/admin/pos/gift-cards", label: "Creazione Gift Card", icon: CreditCard }] : []),
    ...(featureFlags[FEATURE_FLAGS.PRINTED_GIFT_CARDS] === true ? [{ href: "/admin/printed-gift-cards", label: "Gift Card Cartacee", icon: Printer }] : []),
    { href: "/admin/accounting", label: "Contabilità", icon: Calculator },
  ];

  const menuItems2 = [
    ...(featureFlags[FEATURE_FLAGS.MENU_ENABLED] !== false ? [{ href: "/admin/menu", label: "Menu", icon: Wine }] : []),
    ...(featureFlags[FEATURE_FLAGS.SHOP_ENABLED] !== false ? [{ href: "/admin/shop", label: "Negozio", icon: Store }] : []),
    ...(showGiftCardManagement ? [{ href: "/admin/gift-cards/config", label: "Tagli Gift Card", icon: Gift }] : []),
  ];

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Hamburger (mobile) + Logo + Navigation */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Hamburger Menu Button (mobile, tablet, and small desktop) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="xl:hidden p-2 -ml-2 rounded-lg hover:bg-brand-light-gray/50 transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6 text-brand-dark" />
            </button>
            
            <Link href="/admin" className="flex items-center gap-2">
              <Logo variant="vertical" className="h-6 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-brand-primary/10 text-brand-primary"
                      : "text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {menuItems2.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-brand-primary/10 text-brand-primary"
                      : "text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {canManageAdmins && (
                <>
                  <Link
                    href="/admin/reports"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                      pathname === "/admin/reports" || pathname.startsWith("/admin/reports/")
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Report
                  </Link>
                  <Link
                    href="/admin/settings"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                      pathname === "/admin/settings" || pathname.startsWith("/admin/settings/")
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Impostazioni
                  </Link>
                </>
              )}
              {canManageAdmins && (
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium text-brand-gray hover:text-[#635BFF] hover:bg-[#635BFF]/10 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Stripe
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </nav>
          </div>

          {/* Right: User Info + Logout */}
          <div className="flex items-center gap-4">
            {status === "loading" ? (
              <div className="w-8 h-8 bg-brand-light-gray rounded-full animate-pulse" />
            ) : session?.user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-body-sm text-brand-gray">
                  <div className="w-8 h-8 bg-brand-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-brand-primary" />
                  </div>
                  <span className="max-w-[150px] truncate">
                    {session.user.name || session.user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-body-sm text-brand-gray hover:text-red-500 transition-colors"
                  title="Esci"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Esci</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-50 xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 xl:hidden shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-brand-light-gray">
              <span className="font-bold text-brand-dark">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-brand-light-gray/50 transition-colors"
                aria-label="Chiudi"
              >
                <X className="w-5 h-5 text-brand-gray" />
              </button>
            </div>
            
            {/* Drawer Content */}
            <nav className="flex-1 overflow-y-auto py-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-brand-primary/10 text-brand-primary border-r-2 border-brand-primary"
                      : "text-brand-dark hover:bg-brand-light-gray/30"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              <div className="my-2 border-t border-brand-light-gray" />

              {menuItems2.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-brand-primary/10 text-brand-primary border-r-2 border-brand-primary"
                      : "text-brand-dark hover:bg-brand-light-gray/30"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              <div className="my-2 border-t border-brand-light-gray" />
              
              {canManageAdmins && (
                <>
                  <Link
                    href="/admin/reports"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      pathname === "/admin/reports" || pathname.startsWith("/admin/reports/")
                        ? "bg-brand-primary/10 text-brand-primary border-r-2 border-brand-primary"
                        : "text-brand-dark hover:bg-brand-light-gray/30"
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Report</span>
                  </Link>

                  <Link
                    href="/admin/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      pathname === "/admin/settings" || pathname.startsWith("/admin/settings/")
                        ? "bg-brand-primary/10 text-brand-primary border-r-2 border-brand-primary"
                        : "text-brand-dark hover:bg-brand-light-gray/30"
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Impostazioni</span>
                  </Link>
                </>
              )}

              {canManageAdmins && (
                <>
                  <a
                    href="https://dashboard.stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-brand-dark hover:bg-brand-light-gray/30 transition-colors"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">Stripe</span>
                    <ExternalLink className="w-3 h-3 ml-auto text-brand-gray" />
                  </a>
                  <div className="my-2 border-t border-brand-light-gray" />
                </>
              )}
              

              
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  handleSignOut()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Esci</span>
              </button>
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}
