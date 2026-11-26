"use client"

import Link from "next/link"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { CalendarDays, Check, ChevronDown, Clock3, Heart, Home, LogOut, Search, Settings, Tv, X, ShieldCheck, GitBranch, Cast, Clapperboard, Film, Layers3, Music2, MonitorPlay } from "lucide-react"
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
  const [closingLogout, setClosingLogout] = useState(false)
  const cinemaMode = preferences.cinemaMode

  const closeLogout = useCallback(() => {
    if (loggingOut) return
    setClosingLogout(true)
    window.setTimeout(() => {
      setConfirmLogout(false)
      setClosingLogout(false)
    }, 260)
  }, [loggingOut])

  useEffect(() => setQuery(searchParams.get("q") ?? ""), [searchParams])
  useEffect(() => {
    if (!confirmLogout) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeLogout() }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [confirmLogout, closeLogout])
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
      <header className={cinemaMode && pathname === "/" ? "absolute inset-x-0 top-0 z-40 border-b border-transparent bg-gradient-to-b from-black/85 to-transparent shadow-none" : "sticky top-0 z-40 border-b border-white/[.08] bg-[#090909]/90 shadow-2xl backdrop-blur-2xl"}>
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center gap-5 px-4 sm:px-7">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="text-[26px] font-black tracking-[-.08em] text-[#e50914] transition-transform group-hover:scale-110">JFLX</span>
            <span className="hidden text-[10px] font-semibold tracking-[.28em] text-white/45 sm:block">JELLYFIN</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            <Link href="/" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Home className="mr-1.5 inline size-4" />Accueil</Link>
            <Link href="/tv" className={`rounded-md px-3 py-2 text-sm transition ${pathname === "/tv" ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Tv className="mr-1.5 inline size-4" />Hub TV</Link>
            <Link href="/films" aria-current={pathname.startsWith("/films") ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/films") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Film className="mr-1.5 inline size-4" />Hub Films</Link>
            <Link href="/series" aria-current={pathname.startsWith("/series") ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/series") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Clapperboard className="mr-1.5 inline size-4" />Hub Séries</Link>
            <Link href="/guide-tv" aria-current={pathname.startsWith("/guide-tv") ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/guide-tv") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><CalendarDays className="mr-1.5 inline size-4" />Guide TV</Link>
            <Link href="/collections" aria-current={pathname.startsWith("/collections") ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/collections") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Layers3 className="mr-1.5 inline size-4" />Collections</Link>
            <Link href="/music" aria-current={pathname.startsWith("/music") ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/music") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Music2 className="mr-1.5 inline size-4" />Musique</Link>
            <Link href="/cast" aria-current={pathname.startsWith("/cast") ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition ${pathname.startsWith("/cast") ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}><Cast className="mr-1.5 inline size-4" />Caster</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={onSearch} className={`${searchOpen ? "w-[min(45vw,330px)]" : "w-0 md:w-[min(24vw,230px)]"} relative overflow-hidden transition-all duration-300`}>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titres, personnes, genres" aria-label="Rechercher" className="h-9 border-white/15 bg-white/[.08] pl-9 text-sm text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0" />
            </form>
            <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 hover:text-white md:hidden" onClick={() => setSearchOpen((v) => !v)} aria-label="Ouvrir la recherche"><Search className="size-5" /></Button>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-md p-1.5 text-white/80 hover:bg-white/10" aria-label="Ouvrir le menu du compte" aria-expanded={menuOpen} aria-haspopup="menu">
                <span className="flex size-8 items-center justify-center rounded bg-[#e50914] text-xs font-bold">{session?.userName?.slice(0, 1).toUpperCase()}</span><ChevronDown className="size-3.5" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 top-12 max-h-[calc(100dvh-5rem)] w-64 overflow-y-auto rounded-xl border border-white/10 bg-[#191919] p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <p className="px-3 py-2 text-sm font-semibold text-white">{session?.userName}</p>
                  <div className="my-1 border-t border-white/10" />
                  <Link role="menuitem" href="/resume" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Clock3 className="size-4" /> Reprendre la lecture</Link>
                  <Link role="menuitem" href="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Heart className="size-4" /> Mes favoris</Link>
                  <Link role="menuitem" href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Settings className="size-4" /> Paramètres du lecteur</Link>
                  <Link role="menuitem" href="/music" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Music2 className="size-4" /> Hub musique</Link>
                  <Link role="menuitem" href="/music-videos" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Film className="size-4" /> Clips musicaux</Link>
                  <Link role="menuitem" href="/guide-tv" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><CalendarDays className="size-4" /> Guide TV</Link>
                  <Link role="menuitem" href="/collections" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Layers3 className="size-4" /> Collections</Link>
                  <Link role="menuitem" href="/genres" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Clapperboard className="size-4" /> Explorer les genres</Link>
                  <Link role="menuitem" href="/cast" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><Cast className="size-4" /> Distribution</Link>
                  <Link role="menuitem" href="/securite" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><ShieldCheck className="size-4" /> Sécurité</Link>
                  <Link role="menuitem" href="/releases" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><GitBranch className="size-4" /> Nouveautés</Link>
                  <Link role="menuitem" href="/a-propos" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><MonitorPlay className="size-4" /> À propos de JFLX</Link>
                  <div className="px-3 py-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45"><Settings className="size-3" /> Interface</p>
                    <button type="button" aria-pressed={cinemaMode} onClick={() => { updatePreferences({ cinemaMode: !cinemaMode }); setMenuOpen(false); router.push("/") }} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-white/75 hover:bg-white/10"><span className="flex items-center gap-2"><MonitorPlay className="size-4" /> Interface cinéma</span>{cinemaMode ? <Check className="size-4 text-[#e50914]" /> : null}</button>
                    <button type="button" onClick={() => updatePreferences({ tvMode: !preferences.tvMode })} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-white/75 hover:bg-white/10"><span className="flex items-center gap-2"><MonitorPlay className="size-4" /> Mode TV</span>{preferences.tvMode ? <Check className="size-4 text-[#e50914]" /> : null}</button>
                    <button type="button" onClick={() => updatePreferences({ compact: !preferences.compact })} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-white/75 hover:bg-white/10">Mode compact {preferences.compact ? <Check className="size-4 text-[#e50914]" /> : null}</button>
                    <button type="button" onClick={() => updatePreferences({ accent: preferences.accent === "red" ? "blue" : "red" })} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-white/75 hover:bg-white/10">Accent {preferences.accent === "red" ? "Rouge" : "Bleu"}<span className={`size-3 rounded-full ${preferences.accent === "red" ? "bg-[#e50914]" : "bg-[#00a4dc]"}`} /></button>
                  </div>
                  <button type="button" onClick={() => { setMenuOpen(false); setConfirmLogout(true) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><LogOut className="size-4" /> Se déconnecter</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090909]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-6">
          <MobileNavLink href="/" active={pathname === "/"} label="Accueil" icon={<Home />} />
          <MobileNavLink href="/tv" active={pathname === "/tv"} label="Hub TV" icon={<Tv />} />
          <MobileNavLink href="/films" active={pathname.startsWith("/films")} label="Films" icon={<Film />} />
          <MobileNavLink href="/series" active={pathname.startsWith("/series")} label="Séries" icon={<Clapperboard />} />
          <MobileNavLink href="/resume" active={pathname.startsWith("/resume")} label="Reprise" icon={<Clock3 />} />
          <MobileNavLink href="/music" active={pathname.startsWith("/music")} label="Musique" icon={<Music2 />} />
        </div>
      </nav>
      {confirmLogout ? createPortal(<div className={`logout-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md ${closingLogout ? "is-closing" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeLogout() }}><div role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description" className={`logout-dialog w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#141414] shadow-[0_24px_100px_rgba(0,0,0,.65)] ${closingLogout ? "is-closing" : ""} ${loggingOut ? "is-logging-out" : ""}`}><div className="logout-dialog__accent" /><div className="p-6 sm:p-8"><div className="flex items-start gap-4"><div className="logout-dialog__icon flex size-12 shrink-0 items-center justify-center rounded-2xl"><LogOut className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[.18em] text-white/40">Session JFLX</p><h2 id="logout-title" className="mt-1 text-xl font-semibold text-white">Prendre une pause ?</h2><p id="logout-description" className="mt-2 text-sm leading-relaxed text-white/55">Vous êtes connecté en tant que <strong className="font-medium text-white/85">{session?.userName ?? "utilisateur"}</strong>. En gardant votre session, vous pourrez reprendre votre lecture immédiatement.</p></div><button type="button" onClick={closeLogout} className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white" aria-label="Fermer la confirmation" disabled={loggingOut}><X className="size-5" /></button></div><div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button autoFocus variant="ghost" onClick={closeLogout} disabled={loggingOut} className="logout-keep-button text-white/70 hover:bg-white/10 hover:text-white">Garder ma session</Button><Button onClick={doLogout} disabled={loggingOut} className="logout-confirm-button min-w-36 bg-[#e50914] text-white shadow-[0_0_20px_rgba(229,9,20,.2)] transition hover:bg-[#f6121d]">{loggingOut ? <span className="flex items-center gap-2"><span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />Déconnexion…</span> : "Se déconnecter"}</Button></div>{loggingOut ? <div className="logout-progress mt-5" role="progressbar" aria-label="Déconnexion de Jellyfin en cours"><span className="logout-progress__bar" /></div> : null}</div></div></div>, document.body) : null}
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
