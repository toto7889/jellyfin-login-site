"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, GitBranch, Upload, FileArchive, CheckCircle2, Rocket, WandSparkles, Newspaper, Download, Settings2, ExternalLink, RefreshCw } from "lucide-react"

const initialNotes = `## Nouveautés\n- Ajout du nouveau lecteur multimédia\n- Amélioration des performances de recherche\n\n## Correctifs\n- Correction de la reprise de lecture\n- Stabilisation de la synchronisation des favoris`

type GitHubRelease = { id: number; tag_name: string; name: string; body: string | null; html_url: string; published_at: string | null; prerelease: boolean }

export default function ReleasesPage() {
  const [repo, setRepo] = useState("toto7889/jellyfin-login-site")
  const [tag, setTag] = useState("v1.4.0")
  const [title, setTitle] = useState("Jellyfin Personal 1.4.0")
  const [notes, setNotes] = useState(initialNotes)
  const [generated, setGenerated] = useState(false)
  const [published, setPublished] = useState(false)
  const [asset, setAsset] = useState<string | null>(null)
  const [releases, setReleases] = useState<GitHubRelease[]>([])
  const [loadingReleases, setLoadingReleases] = useState(false)
  const [installVersion, setInstallVersion] = useState("latest")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null)

  async function loadReleases() {
    setLoadingReleases(true)
    try {
      const response = await fetch(`/api/releases?action=list&repo=${encodeURIComponent(repo)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Impossible de charger les nouveautés.")
      setReleases(data.releases)
    } catch (value) { setError(value instanceof Error ? value.message : "Impossible de charger les nouveautés.") }
    finally { setLoadingReleases(false) }
  }
  useEffect(() => { void loadReleases() }, [])

  async function generateNotes() {
    setBusy(true); setError(null)
    try {
      const form = new FormData(); form.set("action", "generate"); form.set("notes", notes); form.set("title", title)
      const response = await fetch("/api/releases", { method: "POST", body: form }); const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "La génération a échoué.")
      setNotes(data.notes); setGenerated(true)
    } catch (value) { setError(value instanceof Error ? value.message : "La génération a échoué.") }
    finally { setBusy(false) }
  }

  async function publishRelease() {
    setBusy(true); setError(null)
    try {
      const form = new FormData(); form.set("repo", repo); form.set("tag", tag); form.set("title", title); form.set("notes", notes)
      const input = document.querySelector<HTMLInputElement>('input[type="file"]'); if (input?.files?.[0]) form.set("asset", input.files[0])
      const response = await fetch("/api/releases", { method: "POST", body: form }); const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "La publication a échoué.")
      setReleaseUrl(data.url); setPublished(true); void loadReleases()
    } catch (value) { setError(value instanceof Error ? value.message : "La publication a échoué.") }
    finally { setBusy(false) }
  }

  return <div className="min-h-screen bg-[#090909] text-white"><AppHeader /><main className="mx-auto max-w-[1220px] px-5 py-10 sm:px-8">
    <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#00a4dc]"><GitBranch className="size-4" /> GitHub Releases AI</div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pilotez JFLX depuis GitHub.</h1><p className="mt-3 max-w-2xl text-white/55">Créez des releases avec l&apos;IA, consultez les nouveautés du dépôt et installez la dernière version de JFLX.</p></div><div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300"><CheckCircle2 className="size-4" /> Connecteur GitHub actif</div></div>

    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[.035] p-6 shadow-2xl"><div className="mb-6 flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-[#00a4dc]/15 text-[#4fc3f7]"><Rocket className="size-5" /></div><div><h2 className="font-semibold">Paramètres de la release</h2><p className="text-xs text-white/45">Publication verrouillée sur le dépôt JFLX</p></div></div><div className="flex flex-col gap-5"><label className="flex flex-col gap-2 text-sm text-white/70">Dépôt GitHub<Input value={repo} onChange={(e) => setRepo(e.target.value)} className="border-white/10 bg-white/[.06] text-white" placeholder="organisation/depot" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm text-white/70">Tag<Input value={tag} onChange={(e) => setTag(e.target.value)} className="border-white/10 bg-white/[.06] text-white" /></label><label className="flex flex-col gap-2 text-sm text-white/70">Titre<Input value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-white/[.06] text-white" /></label></div><label className="flex flex-col gap-2 text-sm text-white/70">Résumé ou changements à analyser<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} className="rounded-md border border-white/10 bg-white/[.06] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00a4dc]" /></label><div className="flex flex-col gap-3 sm:flex-row"><Button onClick={generateNotes} disabled={busy} className="bg-[#00a4dc] text-white hover:bg-[#18b9ef]"><Sparkles data-icon="inline-start" /> {busy ? "Traitement…" : "Générer avec l&apos;IA"}</Button><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/20 px-4 py-2 text-sm text-white/65 hover:border-white/40 hover:text-white"><Upload className="size-4" /> Ajouter un asset<input type="file" className="sr-only" onChange={(e) => setAsset(e.target.files?.[0]?.name ?? null)} /></label></div>{error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>}{asset && <div className="flex items-center gap-2 rounded-lg bg-white/[.06] px-3 py-2 text-sm text-white/70"><FileArchive className="size-4 text-[#00a4dc]" /> {asset}</div>}</div></section>
      <section className="rounded-2xl border border-white/10 bg-[#101114] p-6 shadow-2xl"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-white/35">Aperçu</p><h2 className="mt-1 text-xl font-semibold">{title || "Votre release"}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">{tag}</span></div><div className="min-h-[285px] whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/70">{notes || "Générez les notes de version pour afficher un aperçu."}</div>{generated && <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><WandSparkles className="size-4" /> Notes générées et prêtes à publier</div>}<Button onClick={publishRelease} disabled={published || busy} className="mt-6 w-full bg-white text-black hover:bg-white/90">{published ? <><CheckCircle2 data-icon="inline-start" /> Release publiée sur GitHub</> : <><Rocket data-icon="inline-start" /> {busy ? "Publication en cours…" : "Publier la release"}</>}</Button>{published && <p className="mt-3 text-center text-xs text-white/40">{repo} · {tag} · {releaseUrl && <a className="ml-1 text-[#4fc3f7] underline" href={releaseUrl} target="_blank" rel="noreferrer">Voir sur GitHub</a>}</p>}</section>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="flex items-center gap-2 font-semibold"><Newspaper className="size-4 text-[#4fc3f7]" /> Nouveautés GitHub</h2><p className="mt-1 text-xs text-white/45">Les dernières releases de {repo}</p></div><Button variant="ghost" size="icon" onClick={() => void loadReleases()} disabled={loadingReleases} aria-label="Actualiser les releases" className="text-white/60 hover:text-white"><RefreshCw className={loadingReleases ? "size-4 animate-spin" : "size-4"} /></Button></div><div className="flex flex-col gap-3">{releases.length ? releases.slice(0, 4).map((release) => <article key={release.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{release.name || release.tag_name}</h3><p className="mt-1 text-xs text-white/45">{release.tag_name} · {release.published_at ? new Date(release.published_at).toLocaleDateString("fr-FR") : "brouillon"}</p></div><a href={release.html_url} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${release.name}`} className="text-[#4fc3f7]"><ExternalLink className="size-4" /></a></div><p className="mt-3 line-clamp-2 text-sm text-white/55">{release.body || "Aucune note publiée."}</p></article>) : <p className="text-sm text-white/45">Aucune release trouvée pour le moment.</p>}</div></section><section className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><div className="mb-5 flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-[#e50914]/15 text-[#ff5b63]"><Download className="size-5" /></div><div><h2 className="font-semibold">Installer JFLX</h2><p className="text-xs text-white/45">Téléchargez une release officielle depuis GitHub</p></div></div><div className="flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm text-white/70">Version à installer<select value={installVersion} onChange={(e) => setInstallVersion(e.target.value)} className="h-10 rounded-md border border-white/10 bg-white/[.06] px-3 text-sm text-white outline-none"><option value="latest" className="bg-[#191919]">Dernière version</option>{releases.map((release) => <option key={release.id} value={release.tag_name} className="bg-[#191919]">{release.name || release.tag_name}</option>)}</select></label><a href={`https://github.com/${repo}/releases/${installVersion === "latest" ? "latest" : "tag/" + encodeURIComponent(installVersion)}`} target="_blank" rel="noreferrer" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#e50914] px-4 text-sm font-medium text-white transition hover:bg-[#f6121d]"><Download className="size-4" /> Ouvrir le téléchargement GitHub</a><p className="text-xs leading-5 text-white/40">Choisissez l&apos;asset adapté à votre système dans la release GitHub. L&apos;installation reste contrôlée par GitHub et ne télécharge aucun fichier inconnu.</p></div></section></div>
    <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/30"><Settings2 className="size-3" /> Les identifiants GitHub restent côté serveur et le connecteur limite l&apos;accès au dépôt configuré.</p>
  </main></div>
}
