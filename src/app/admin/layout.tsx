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
  Shield,
  CreditCard,
  ExternalLink,
  Calculator,
  FileText,
} from "lucide-react"

const menuItems = [
  { href: "/admin/orders", label: "Ordini", icon: ShoppingBag },
  { href: "/admin/gift-cards", label: "Gestione Gift Card", icon: Wallet },
  { href: "/admin/accounting", label: "Contabilità", icon: Calculator },
  { href: "/admin/menu", label: "Menu", icon: Wine },
  { href: "/admin/shop", label: "Negozio", icon: Store },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [canManageAdmins, setCanManageAdmins] = useState(false)

  useEffect(() => {
    // Verifica se l'admin può gestire altri admin
    fetch("/api/admin/admins")
      .then(res => res.ok ? setCanManageAdmins(true) : setCanManageAdmins(false))
      .catch(() => setCanManageAdmins(false))
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  // Reset scroll when navigating to a new page
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo variant="vertical" className="h-6 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
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
              {canManageAdmins && (
                <>
                  <Link
                    href="/admin/admins"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                      pathname === "/admin/admins"
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Gestione Admin
                  </Link>
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
                </>
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

        {/* Mobile Navigation */}
        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 pb-3 -mt-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium whitespace-nowrap transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin/reports"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium whitespace-nowrap transition-colors ${
              pathname === "/admin/reports" || pathname.startsWith("/admin/reports/")
                ? "bg-brand-primary/10 text-brand-primary"
                : "text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50"
            }`}
          >
            <FileText className="w-4 h-4" />
            Report
          </Link>
          {canManageAdmins && (
            <>
              <Link
                href="/admin/admins"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === "/admin/admins"
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50"
                }`}
              >
                <Shield className="w-4 h-4" />
                Gestione Admin
              </Link>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium whitespace-nowrap text-brand-gray hover:text-[#635BFF] hover:bg-[#635BFF]/10 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Stripe
                <ExternalLink className="w-3 h-3" />
              </a>
            </>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}
