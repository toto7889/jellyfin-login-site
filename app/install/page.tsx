"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Check, Copy, Download, ExternalLink, GitBranch, Terminal, ShieldCheck } from "lucide-react"

const scriptUrl = "https://raw.githubusercontent.com/toto7889/jellyfin-login-site/main/install.sh"
const command = `curl -fsSL ${scriptUrl} | bash`

export default function InstallPage() {
  const [copied, setCopied] = useState(false)

  async function copyCommand() {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="min-h-dvh bg-[#090909] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"><ArrowLeft className="size-4" />Retour à l&apos;accueil</Link>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[.28em] text-cyan-200/70">Installation & auto-hébergement</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Votre instance, vos règles.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">Installez Jellyfin Login Site sur votre propre serveur avec le script officiel GitHub. L&apos;installation configure l&apos;environnement de base sans envoyer vos données à un service tiers.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`https://github.com/toto7889/jellyfin-login-site/blob/main/install.sh`} target="_blank" rel="noreferrer" className="glass-button inline-flex items-center gap-2 px-4 py-3 text-sm"><GitBranch className="size-4" />Voir le script GitHub<ExternalLink className="size-3.5" /></a>
              <a href={scriptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white"><Download className="size-4" />Télécharger install.sh</a>
            </div>
          </section>
          <section className="glass-panel p-6 sm:p-7">
            <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200"><Terminal className="size-5" /></span><div><h2 className="font-semibold">Installation rapide</h2><p className="text-sm text-white/45">Linux, macOS ou serveur distant</p></div></div>
            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4"><code className="block break-all font-mono text-xs leading-6 text-cyan-100">{command}</code><button type="button" onClick={copyCommand} className="mt-4 inline-flex items-center gap-2 text-xs text-white/55 transition hover:text-white" aria-label="Copier la commande">{copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}{copied ? "Commande copiée" : "Copier la commande"}</button></div>
            <p className="mt-4 text-xs leading-5 text-white/40">Vérifiez toujours le contenu d&apos;un script avant de l&apos;exécuter et utilisez un compte administrateur uniquement si votre serveur le demande.</p>
          </section>
        </div>
        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[{ icon: ShieldCheck, title: "Contrôle local", text: "Vos règles d'accès restent sur votre infrastructure." }, { icon: GitBranch, title: "Script versionné", text: "Le script officiel est consultable et suivi sur GitHub." }, { icon: Terminal, title: "Configuration guidée", text: "Préparez Jellyfin, l'URL publique et votre clé API." }].map(({ icon: Icon, title, text }) => <div key={title} className="glass-panel p-5"><Icon className="size-5 text-cyan-200" /><h2 className="mt-4 font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-white/45">{text}</p></div>)}
        </section>
      </div>
    </main>
  )
}
