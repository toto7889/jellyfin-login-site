"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Check, ChevronDown, Heart, Home, LogOut, Search, Settings, Tv, X, ShieldCheck, Fingerprint, Ban, GitBranch, Cast, Clapperboard } from "lucide-react"
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
  useEffect(() => {
    if (!confirmLogout) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !loggingOut) setConfirmLogout(false) }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [confirmLogout, loggingOut])
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
          <nav className="hidden items-center gap-1 xl:flex" aria-label="Navigation principale">
            <Link href="/" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Home className="mr-1.5 inline size-4" />Accueil</Link>
            <Link href="/tv" className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/tv") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Tv className="mr-1.5 inline size-4" />TV en direct</Link>
            <Link href="/genres" className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/genres") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Clapperboard className="mr-1.5 inline size-4" />Genres</Link>
            <Link href="/cast" aria-current={pathname.startsWith("/cast") ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/cast") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Cast className="mr-1.5 inline size-4" />Caster</Link>
            <Link href="/favorites" className="rounded-md px-3 py-2 text-sm text-white/60 transition hover:text-white"><Heart className="mr-1.5 inline size-4" />Favoris</Link>
            <Link href="/verification" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/verification" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Fingerprint className="mr-1.5 inline size-4" />Vérification</Link><Link href="/ip" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/ip" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Ban className="mr-1.5 inline size-4" />Mon IP</Link><Link href="/admin/ip" className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/admin") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><ShieldCheck className="mr-1.5 inline size-4" />Admin</Link><Link href="/securite" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/securite" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><ShieldCheck className="mr-1.5 inline size-4" />Sécurité</Link><Link href="/releases" className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/releases") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><GitBranch className="mr-1.5 inline size-4" />Releases AI</Link>
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
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Settings className="size-4" /> Paramètres du lecteur</Link>
                <div className="px-3 py-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45"><Settings className="size-3" /> Interface</p><button type="button" onClick={() => updatePreferences({ compact: !preferences.compact })} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-white/75 hover:bg-white/10">Mode compact {preferences.compact ? <Check className="size-4 text-[#e50914]" /> : null}</button><button type="button" onClick={() => updatePreferences({ accent: preferences.accent === "red" ? "blue" : "red" })} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-white/75 hover:bg-white/10">Accent {preferences.accent === "red" ? "Rouge" : "Bleu"}<span className={`size-3 rounded-full ${preferences.accent === "red" ? "bg-[#e50914]" : "bg-[#00a4dc]"}`} /></button></div>
                <button type="button" onClick={() => { setMenuOpen(false); setConfirmLogout(true) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><LogOut className="size-4" /> Se déconnecter</button>
              </div> : null}
            </div>
          </div>
        </div>
      </header>
      <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090909]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl xl:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-7">
          <MobileNavLink href="/" active={pathname === "/"} label="Accueil" icon={<Home />} />
          <MobileNavLink href="/tv" active={pathname.startsWith("/tv")} label="Direct" icon={<Tv />} />
          <MobileNavLink href="/cast" active={pathname.startsWith("/cast")} label="Caster" icon={<Cast />} />
          <MobileNavLink href="/favorites" active={pathname.startsWith("/favorites")} label="Favoris" icon={<Heart />} />
          <MobileNavLink href="/search" active={pathname.startsWith("/search")} label="Recherche" icon={<Search />} />
          <MobileNavLink href="/securite" active={pathname.startsWith("/securite")} label="Sécurité" icon={<ShieldCheck />} />
          <MobileNavLink href="/settings" active={pathname.startsWith("/settings")} label="Réglages" icon={<Settings />} />
        </div>
      </nav>
      {confirmLogout ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200" onMouseDown={(event) => { if (event.target === event.currentTarget && !loggingOut) setConfirmLogout(false) }}><div role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description" className={`w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#141414] shadow-[0_24px_100px_rgba(0,0,0,.65)] animate-in zoom-in-95 duration-300 ${loggingOut ? "scale-95 opacity-0 transition-all duration-700" : ""}`}><div className="h-1 bg-gradient-to-r from-[#e50914] via-[#f04b50] to-transparent" /><div className="p-6 sm:p-8"><div className="flex items-start gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e50914]/10 text-[#ff6b70]"><LogOut className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[.18em] text-white/40">Session JFLX</p><h2 id="logout-title" className="mt-1 text-xl font-semibold text-white">Quitter votre compte ?</h2><p id="logout-description" className="mt-2 text-sm leading-relaxed text-white/55">Vous êtes connecté en tant que <strong className="font-medium text-white/85">{session?.userName ?? "utilisateur"}</strong>. La session sera supprimée de cet appareil.</p></div><button type="button" onClick={() => setConfirmLogout(false)} className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white" aria-label="Fermer la confirmation" disabled={loggingOut}><X className="size-5" /></button></div><div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setConfirmLogout(false)} disabled={loggingOut} className="text-white/70 hover:bg-white/10 hover:text-white">Garder ma session</Button><Button onClick={doLogout} disabled={loggingOut} className="min-w-36 bg-[#e50914] text-white shadow-[0_0_20px_rgba(229,9,20,.2)] transition hover:bg-[#f6121d]">{loggingOut ? <span className="flex items-center gap-2"><span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />Déconnexion…</span> : "Se déconnecter"}</Button></div>{loggingOut ? <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-full origin-left animate-pulse bg-[#e50914]" /></div> : null}</div></div></div> : null}
    </>
  )
}

function MobileNavLink({ href, active, label, icon }: { href: string; active: boolean; label: string; icon: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-white/55 hover:text-white"}`}>
    <span aria-hidden="true" className="[&>svg]:size-5">{icon}</span>{label}
  </Link>
}

export function AppHeader() {
  return (
    <Suspense fallback={null}>
      <AppHeaderContent />
    </Suspense>
  )
}
