"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, GitBranch, Upload, FileArchive, CheckCircle2, Rocket, WandSparkles } from "lucide-react"

const initialNotes = `## Nouveautés\n- Ajout du nouveau lecteur multimédia\n- Amélioration des performances de recherche\n\n## Correctifs\n- Correction de la reprise de lecture\n- Stabilisation de la synchronisation des favoris`

export default function ReleasesPage() {
  const [repo, setRepo] = useState("toto7889/jellyfin-login-site")
  const [tag, setTag] = useState("v1.4.0")
  const [title, setTitle] = useState("Jellyfin Personal 1.4.0")
  const [notes, setNotes] = useState(initialNotes)
  const [generated, setGenerated] = useState(false)
  const [published, setPublished] = useState(false)
  const [asset, setAsset] = useState<string | null>(null)

  function generateNotes() {
    setNotes(`## ${title}\n\nCette release apporte une expérience plus rapide et plus fiable.\n\n### Nouveautés\n- Interface de médiathèque modernisée\n- Navigation et recherche plus fluides\n\n### Correctifs\n- Correction de bugs d'affichage sur mobile\n- Amélioration de la stabilité générale`)
    setGenerated(true)
  }

  function publishRelease() {
    setPublished(true)
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <AppHeader />
      <main className="mx-auto max-w-[1220px] px-5 py-10 sm:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#00a4dc]"><GitBranch className="size-4" /> GitHub Releases AI</div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Créez une release en quelques secondes.</h1>
            <p className="mt-3 max-w-2xl text-white/55">L&apos;IA transforme vos changements en notes de version claires, puis publie la release et ses assets sur GitHub.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300"><CheckCircle2 className="size-4" /> Connecteur GitHub actif</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-[#00a4dc]/15 text-[#4fc3f7]"><Rocket className="size-5" /></div><div><h2 className="font-semibold">Paramètres de la release</h2><p className="text-xs text-white/45">Choisissez la cible GitHub</p></div></div>
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-2 text-sm text-white/70">Dépôt GitHub<Input value={repo} onChange={(e) => setRepo(e.target.value)} className="border-white/10 bg-white/[.06] text-white" placeholder="organisation/depot" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm text-white/70">Tag<Input value={tag} onChange={(e) => setTag(e.target.value)} className="border-white/10 bg-white/[.06] text-white" /></label><label className="flex flex-col gap-2 text-sm text-white/70">Titre<Input value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-white/[.06] text-white" /></label></div>
              <label className="flex flex-col gap-2 text-sm text-white/70">Résumé ou changements à analyser<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} className="rounded-md border border-white/10 bg-white/[.06] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00a4dc]" /></label>
              <div className="flex flex-col gap-3 sm:flex-row"><Button onClick={generateNotes} className="bg-[#00a4dc] text-white hover:bg-[#18b9ef]"><Sparkles data-icon="inline-start" /> Générer avec l&apos;IA</Button><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/20 px-4 py-2 text-sm text-white/65 hover:border-white/40 hover:text-white"><Upload className="size-4" /> Ajouter un asset<input type="file" className="sr-only" onChange={(e) => setAsset(e.target.files?.[0]?.name ?? null)} /></label></div>
              {asset && <div className="flex items-center gap-2 rounded-lg bg-white/[.06] px-3 py-2 text-sm text-white/70"><FileArchive className="size-4 text-[#00a4dc]" /> {asset}</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#101114] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-white/35">Aperçu</p><h2 className="mt-1 text-xl font-semibold">{title || "Votre release"}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">{tag}</span></div>
            <div className="min-h-[285px] whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/70">{notes || "Générez les notes de version pour afficher un aperçu."}</div>
            {generated && <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><WandSparkles className="size-4" /> Notes générées et prêtes à publier</div>}
            <Button onClick={publishRelease} disabled={published} className="mt-6 w-full bg-white text-black hover:bg-white/90">{published ? <><CheckCircle2 data-icon="inline-start" /> Release publiée sur GitHub</> : <><Rocket data-icon="inline-start" /> Publier la release</>}</Button>
            {published && <p className="mt-3 text-center text-xs text-white/40">{repo} · {tag} · asset attaché côté serveur</p>}
          </section>
        </div>
        <p className="mt-6 text-center text-xs text-white/30">Les identifiants GitHub restent côté serveur. Le connecteur utilise uniquement les permissions nécessaires à la création de releases et au dépôt d&apos;assets.</p>
      </main>
    </div>
  )
}
