"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Check, ChevronDown, Heart, Home, LogOut, Search, Settings, Tv, X, ShieldCheck, Fingerprint, Ban, GitBranch } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function AppHeaderContent() {
  const { session, logout, preferences, updatePreferences } = useJellyfin()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => setQuery(searchParams.get("q") ?? ""), [searchParams])
  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }
  function doLogout() {
    setLoggingOut(true)
    window.setTimeout(() => { logout(); router.push("/login") }, 700)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[.08] bg-[#090909]/90 shadow-2xl backdrop-blur-2xl">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center gap-5 px-4 sm:px-7">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="text-[26px] font-black tracking-[-.08em] text-[#e50914] transition-transform group-hover:scale-110">JFLX</span>
            <span className="hidden text-[10px] font-semibold tracking-[.28em] text-white/45 sm:block">JELLYFIN</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            <Link href="/" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Home className="mr-1.5 inline size-4" />Accueil</Link>
            <Link href="/tv" className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/tv") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Tv className="mr-1.5 inline size-4" />TV en direct</Link>
            <Link href="/favorites" className="rounded-md px-3 py-2 text-sm text-white/60 transition hover:text-white"><Heart className="mr-1.5 inline size-4" />Favoris</Link>
            <Link href="/verification" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/verification" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Fingerprint className="mr-1.5 inline size-4" />Vérification</Link><Link href="/ip" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/ip" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Ban className="mr-1.5 inline size-4" />Mon IP</Link><Link href="/admin/ip" className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/admin") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><ShieldCheck className="mr-1.5 inline size-4" />Admin</Link><Link href="/releases" className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/releases") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><GitBranch className="mr-1.5 inline size-4" />Releases AI</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={onSearch} className={`${searchOpen ? "w-[min(45vw,330px)]" : "w-0 md:w-[min(24vw,230px)]"} relative overflow-hidden transition-all duration-300`}>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titres, personnes, genres" aria-label="Rechercher" className="h-9 border-white/15 bg-white/[.08] pl-9 text-sm text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0" />
            </form>
            <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 hover:text-white md:hidden" onClick={() => setSearchOpen((v) => !v)} aria-label="Ouvrir la recherche"><Search className="size-5" /></Button>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-md p-1.5 text-white/80 hover:bg-white/10" aria-expanded={menuOpen}>
                <span className="flex size-8 items-center justify-center rounded bg-[#e50914] text-xs font-bold">{session?.userName?.slice(0, 1).toUpperCase()}</span><ChevronDown className="size-3.5" />
              </button>
              {menuOpen ? <div className="absolute right-0 top-12 w-64 rounded-xl border border-white/10 bg-[#191919] p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
                <p className="px-3 py-2 text-sm font-semibold text-white">{session?.userName}</p>
                <div className="my-1 border-t border-white/10" />
                <Link href="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Heart className="size-4" /> Mes favoris</Link>
                <div className="px-3 py-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45"><Settings className="size-3" /> Interface</p><button type="button" onClick={() => updatePreferences({ compact: !preferences.compact })} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-white/75 hover:bg-white/10">Mode compact {preferences.compact ? <Check className="size-4 text-[#e50914]" /> : null}</button><button type="button" onClick={() => updatePreferences({ accent: preferences.accent === "red" ? "blue" : "red" })} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-white/75 hover:bg-white/10">Accent {preferences.accent === "red" ? "Rouge" : "Bleu"}<span className={`size-3 rounded-full ${preferences.accent === "red" ? "bg-[#e50914]" : "bg-[#00a4dc]"}`} /></button></div>
                <button type="button" onClick={() => { setMenuOpen(false); setConfirmLogout(true) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><LogOut className="size-4" /> Se déconnecter</button>
              </div> : null}
            </div>
          </div>
        </div>
      </header>
      {confirmLogout ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-300"><div role="dialog" aria-modal="true" className={`w-full max-w-sm rounded-2xl border border-white/10 bg-[#191919] p-6 shadow-[0_0_80px_rgba(229,9,20,.18)] animate-in zoom-in-95 duration-300 ${loggingOut ? "scale-95 opacity-0 transition-all duration-700" : ""}`}><div className="flex items-start justify-between"><div><div className="mb-4 h-1 w-12 rounded-full bg-[#e50914] shadow-[0_0_18px_#e50914]" /><h2 className="text-lg font-semibold text-white">Se déconnecter ?</h2><p className="mt-2 text-sm text-white/55">Votre session sera supprimée de cet appareil.</p></div><button type="button" onClick={() => setConfirmLogout(false)} className="text-white/50 transition hover:rotate-90 hover:text-white" aria-label="Fermer" disabled={loggingOut}><X className="size-5" /></button></div><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmLogout(false)} disabled={loggingOut}>Annuler</Button><Button onClick={doLogout} disabled={loggingOut} className="min-w-32 bg-[#e50914] text-white shadow-[0_0_20px_rgba(229,9,20,.25)] transition hover:scale-[1.02] hover:bg-[#f6121d]">{loggingOut ? "À bientôt…" : "Déconnexion"}</Button></div></div></div> : null}
    </>
  )
}

export function AppHeader() {
  return (
    <Suspense fallback={null}>
      <AppHeaderContent />
    </Suspense>
  )
}
