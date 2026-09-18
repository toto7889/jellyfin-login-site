"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, Check, ChevronLeft, Fingerprint, LayoutGrid, LogOut, MonitorPlay, Palette, RotateCcw, Server, Settings2, ShieldCheck, SlidersHorizontal, Smartphone, Tv2 } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { Button } from "@/components/ui/button"

export function AdminView() {
  const { session, preferences, updatePreferences, logout } = useJellyfin()
  const router = useRouter()
  if (!session) return null

  const set = (key: keyof typeof preferences, value: boolean | string) => updatePreferences({ [key]: value } as Partial<typeof preferences>)
  const reset = () => updatePreferences({ compact: false, accent: "red", autoplay: true, reduceMotion: false })

  return (
    <main className="min-h-dvh bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-10">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4"><Link href="/" className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[.04] transition hover:bg-white/10" aria-label="Retour"><ChevronLeft className="size-5" /></Link><div><p className="text-xs font-bold uppercase tracking-[.28em] text-[#e50914]">JFLX control center</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Administration</h1></div></div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200"><ShieldCheck className="size-4" /> Session sécurisée</div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[{ label: "Utilisateur actif", value: session.userName, icon: Server }, { label: "Serveur Jellyfin", value: "Connecté", icon: ShieldCheck }, { label: "Préférences", value: `${preferences.favorites.length} favoris`, icon: LayoutGrid }, { label: "Expérience", value: preferences.compact ? "Compacte" : "Confortable", icon: MonitorPlay }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.045] p-5 transition hover:-translate-y-0.5 hover:bg-white/[.07]"><Icon className="size-5 text-[#e50914]" /><p className="mt-5 text-xs text-white/45">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7"><div className="flex items-center gap-3"><SlidersHorizontal className="size-5 text-[#e50914]" /><div><h2 className="text-xl font-bold">Expérience de lecture</h2><p className="text-sm text-white/45">Ces réglages modifient réellement l'interface sur cet appareil.</p></div></div><div className="mt-7 divide-y divide-white/10">
            <Toggle icon={MonitorPlay} title="Lecture automatique" description="Lancer la vidéo dès que le média est prêt" checked={preferences.autoplay} onChange={(v) => set("autoplay", v)} />
            <Toggle icon={Smartphone} title="Mode compact" description="Réduire les espacements pour afficher plus de contenus" checked={preferences.compact} onChange={(v) => set("compact", v)} />
            <Toggle icon={Settings2} title="Réduire les animations" description="Préférer des transitions discrètes" checked={preferences.reduceMotion} onChange={(v) => set("reduceMotion", v)} />
          </div></section>
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7"><div className="flex items-center gap-3"><Palette className="size-5 text-[#e50914]" /><div><h2 className="text-xl font-bold">Apparence</h2><p className="text-sm text-white/45">Personnalisez votre espace.</p></div></div><div className="mt-7 grid grid-cols-2 gap-3"><ColorButton active={preferences.accent === "red"} label="Rouge Netflix" color="bg-[#e50914]" onClick={() => set("accent", "red")} /><ColorButton active={preferences.accent === "blue"} label="Bleu Jellyfin" color="bg-[#00a4dc]" onClick={() => set("accent", "blue")} /></div><Button variant="outline" onClick={reset} className="mt-6 w-full border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"><RotateCcw className="mr-2 size-4" /> Réinitialiser l'interface</Button></section>
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7"><div className="flex items-center gap-3"><Activity className="size-5 text-emerald-400" /><div><h2 className="text-xl font-bold">Présence et sécurité</h2><p className="text-sm text-white/45">État de cette session uniquement, sans contrôle distant ni géolocalisation précise.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-white/45">Statut</p><p className="mt-1 flex items-center gap-2 font-semibold text-emerald-300"><span className="size-2 rounded-full bg-emerald-400" /> En ligne</p></div><div className="rounded-xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-white/45">Utilisateur</p><p className="mt-1 truncate font-semibold">{session.userName}</p></div><div className="rounded-xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-white/45">Appareil pseudonymisé</p><p className="mt-1 flex items-center gap-2 truncate font-mono text-xs"><Fingerprint className="size-4 shrink-0 text-white/45" />{session.deviceId.slice(0, 16)}…</p></div></div></section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#191919] to-[#101010] p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Tv2 className="size-5 text-[#e50914]" /><div><h2 className="text-xl font-bold">Raccourcis</h2><p className="text-sm text-white/45">Accédez rapidement aux espaces principaux.</p></div></div><div className="flex flex-wrap gap-2"><Link href="/" className="rounded-lg bg-white/10 px-4 py-2 text-sm transition hover:bg-white/15">Accueil</Link><Link href="/favorites" className="rounded-lg bg-white/10 px-4 py-2 text-sm transition hover:bg-white/15">Favoris</Link><Link href="/tv" className="rounded-lg bg-white/10 px-4 py-2 text-sm transition hover:bg-white/15">TV en direct</Link><button type="button" onClick={() => { logout(); router.push("/login") }} className="rounded-lg bg-[#e50914]/15 px-4 py-2 text-sm text-red-200 transition hover:bg-[#e50914]/25"><LogOut className="mr-2 inline size-4" /> Déconnexion</button></div></div></section>
      </div>
    </main>
  )
}

function Toggle({ icon: Icon, title, description, checked, onChange }: { icon: typeof MonitorPlay; title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between gap-4 py-5"><span className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-white/[.06] text-white/70"><Icon className="size-5" /></span><span><span className="block font-medium">{title}</span><span className="mt-1 block text-xs text-white/45">{description}</span></span></span><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#e50914]" : "bg-white/15"}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />{checked ? <Check className="absolute left-1.5 top-1.5 size-3 text-white" /> : null}</button></label> }
function ColorButton({ active, label, color, onClick }: { active: boolean; label: string; color: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-xl border p-3 text-left transition ${active ? "border-white/60 bg-white/10" : "border-white/10 bg-white/[.03] hover:bg-white/[.08]"}`}><span className={`mb-3 block size-7 rounded-full ${color}`} /><span className="text-xs text-white/75">{label}</span>{active ? <Check className="mt-2 size-4 text-[#e50914]" /> : null}</button> }

export default AdminView
