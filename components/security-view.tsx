"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckCircle2, Clock3, ShieldAlert, ShieldCheck, ArrowRight, LockKeyhole } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { QuickConnectApproval } from "@/components/quick-connect-approval"

const steps = [
  { label: "Session Jellyfin", detail: "Votre session est gérée par le serveur Jellyfin", state: "done" },
  { label: "Défi de connexion", detail: "Calcul local au navigateur, sans validation serveur", state: "waiting" },
  { label: "Protection réseau", detail: "À configurer côté serveur ou proxy inverse", state: "waiting" },
]

export function VerificationView() {
  const { session } = useJellyfin()
  return <SecurityShell eyebrow="Accès sécurisé" title="État de sécurité" description="Consultez les contrôles affichés et ce qu’ils vérifient réellement.">
    <div className="glass-panel p-6 sm:p-8">
      <div className="flex items-center gap-4"><span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200"><ShieldCheck className="size-6" /></span><div><p className="font-semibold">État de votre session</p><p className="text-sm text-white/50">{session?.userName ?? "Votre compte"} · Session sécurisée</p></div><span className="ml-auto flex size-3 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_18px_#67e8f9]" /></div>
      <div className="mt-8 flex flex-col gap-5">{steps.map((step, index) => <div key={step.label} className="flex gap-4"><div className="flex flex-col items-center">{step.state === "done" ? <CheckCircle2 className="size-5 text-emerald-300" /> : step.state === "active" ? <Clock3 className="size-5 animate-pulse text-cyan-200" /> : <LockKeyhole className="size-5 text-white/35" />}{index < steps.length - 1 ? <span className="mt-2 h-8 w-px bg-white/10" /> : null}</div><div className="-mt-1"><p className={step.state === "waiting" ? "text-white/45" : "font-medium"}>{step.label}</p><p className="mt-1 text-sm text-white/45">{step.detail}</p></div></div>)}</div>
      <div className="mt-8 rounded-2xl border border-cyan-200/15 bg-cyan-200/[.06] p-4 text-sm text-cyan-50/75">Cette page est informative et ne surveille pas une validation en arrière-plan. Le CAPTCHA local et la liste IP de ce navigateur ne remplacent pas un contrôle appliqué par le serveur.</div>
    </div>
  </SecurityShell>
}

export function IpView() {
  const { session, currentIp, publicIpVerified, blockedIps } = useJellyfin()
  const isBlocked = blockedIps.includes(currentIp)
  return <SecurityShell eyebrow="Réseau & sécurité" title="Votre adresse IP" description="Consultez le statut de votre connexion actuelle.">
    <div className="grid gap-4 sm:grid-cols-2"><div className="glass-panel p-6"><p className="text-xs uppercase tracking-[.2em] text-white/40">IP détectée</p><p className="mt-3 font-mono text-3xl tracking-tight">{currentIp}</p><p className="mt-2 text-xs text-white/45">{publicIpVerified ? "IP publique vérifiée côté serveur" : "Vérification publique indisponible"}</p><div className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${isBlocked ? "bg-rose-400/15 text-rose-200" : "bg-emerald-400/15 text-emerald-200"}`}><span className="size-1.5 rounded-full bg-current" />{isBlocked ? "Présente dans la liste locale" : "Absente de la liste locale"}</div></div><div className="glass-panel p-6"><p className="text-xs uppercase tracking-[.2em] text-white/40">Appareil</p><p className="mt-3 truncate font-medium">{session?.deviceId?.slice(0, 20) ?? "Appareil actuel"}</p><p className="mt-2 text-sm text-white/45">Identifiant d’appareil affiché partiellement.</p></div></div>
    <div className="glass-panel mt-4 p-6"><div className="flex items-start gap-4"><ShieldAlert className="mt-1 size-5 text-amber-200" /><div><h2 className="font-semibold">Besoin d&apos;aide ?</h2><p className="mt-1 text-sm text-white/50">Si cette adresse est incorrecte ou bloquée par erreur, contactez l&apos;administrateur Jellyfin-perso.</p></div></div></div>
  </SecurityShell>
}

export function SecurityCenterView() {
  const { session, currentIp, publicIpVerified, blockedIps } = useJellyfin()
  return <SecurityShell eyebrow="Confidentialité & accès" title="Centre de sécurité" description="Consultez les contrôles visibles dans cette application et leur portée réelle.">
    <div className="grid gap-4 sm:grid-cols-2">
      <article className="glass-panel p-5"><ShieldCheck className="size-5 text-cyan-200" /><h2 className="mt-4 font-semibold">Connexion Jellyfin</h2><p className="mt-2 text-sm text-white/55">{session ? `Session ouverte pour ${session.userName}.` : "Aucune session ouverte."} L’authentification est vérifiée par votre serveur Jellyfin.</p></article>
      <article className="glass-panel p-5"><LockKeyhole className="size-5 text-amber-200" /><h2 className="mt-4 font-semibold">Défi de connexion</h2><p className="mt-2 text-sm text-white/55">Un calcul est affiché avant l’envoi du formulaire. Il est validé côté navigateur et ne constitue pas un CAPTCHA serveur.</p><Link href="/login" className="mt-4 inline-flex text-sm font-medium text-cyan-200 hover:text-white">Voir la connexion <ArrowRight className="ml-2 size-4" /></Link></article>
      <article className="glass-panel p-5"><ShieldAlert className="size-5 text-rose-200" /><h2 className="mt-4 font-semibold">Adresse IP</h2><p className="mt-2 text-sm text-white/55">{publicIpVerified ? `Adresse détectée : ${currentIp}.` : "Adresse publique non vérifiée."} La liste locale ne filtre pas le trafic réseau.</p><Link href="/ip" className="mt-4 inline-flex text-sm font-medium text-cyan-200 hover:text-white">Détails réseau <ArrowRight className="ml-2 size-4" /></Link></article>
      <article className="glass-panel p-5"><LockKeyhole className="size-5 text-cyan-200" /><h2 className="mt-4 font-semibold">Liste IP locale</h2><p className="mt-2 text-sm text-white/55">{blockedIps.length} entrée{blockedIps.length > 1 ? "s" : ""} enregistrée{blockedIps.length > 1 ? "s" : ""} sur cet appareil. Les protections de production doivent être configurées sur le serveur ou le proxy.</p><Link href="/ip-ban-ip" className="mt-4 inline-flex text-sm font-medium text-cyan-200 hover:text-white">Gérer la liste <ArrowRight className="ml-2 size-4" /></Link></article>
    </div>
    {session ? <QuickConnectApproval /> : <p className="mt-5 rounded-xl border border-amber-200/15 bg-amber-200/[.05] p-4 text-sm text-amber-100/75">Connectez-vous à Jellyfin sur cet ordinateur pour autoriser un appareil mobile.</p>}
  </SecurityShell>
}

function SecurityShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) { const pathname = usePathname(); return <main className="min-h-dvh px-4 py-10 pb-28 sm:px-8"><div className="mx-auto max-w-4xl"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.28em] text-cyan-200/70">{eyebrow}</p><h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-white/50">{description}</p></div><Link href={pathname === "/ip" ? "/verification" : "/ip"} className="glass-button inline-flex items-center gap-2 px-4 py-2.5 text-sm">{pathname === "/ip" ? "Voir la vérification" : "Voir mon IP"}<ArrowRight className="size-4" /></Link></div>{children}</div></main> }
