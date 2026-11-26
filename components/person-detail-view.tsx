"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Clapperboard, Film, Loader2, UserRound } from "lucide-react"
import { MediaCard } from "@/components/media-card"
import { useJellyfin } from "@/components/jellyfin-provider"
import { getItemsByPerson, getPerson, personImage, primaryImage } from "@/lib/jellyfin"

export function PersonDetailView({ personId, personName }: { personId: string; personName: string }) {
  const { session } = useJellyfin()
  const { data, error, isLoading } = useSWR(
    session ? ["person-profile", session.userId, personId, personName] : null,
    async () => {
      const [person, credits] = await Promise.all([
        getPerson(session!, personName),
        getItemsByPerson(session!, personId),
      ])
      return { person, credits }
    },
    { revalidateOnFocus: false, keepPreviousData: true },
  )
  const { data: tmdbData, error: tmdbError, isLoading: tmdbLoading } = useSWR(
    data ? ["tmdb-person-filmography", data.person.Name || personName, data.person.ProviderIds?.Tmdb] : null,
    async ([, name, tmdbId]) => {
      const params = new URLSearchParams({ name: String(name) })
      if (tmdbId) params.set("tmdbId", String(tmdbId))
      const response = await fetch(`/api/tmdb/person?${params.toString()}`)
      const result = await response.json() as { error?: string; credits?: Array<{ id: number; mediaType: "movie" | "tv"; title: string; character: string; year: string; poster: string | null; overview: string }> }
      if (!response.ok) throw new Error(result.error ?? "TMDB indisponible")
      return result
    },
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  )

  if (!session) return null
  if (isLoading) return <main className="min-h-[70dvh] bg-[#08090c] px-5 py-12 text-white"><div role="status" aria-label="Chargement de la fiche de l’acteur" className="mx-auto max-w-6xl"><Loader2 className="size-6 animate-spin text-white/50" /><div className="mt-6 h-64 animate-pulse rounded-3xl bg-white/[.06]" /><div className="mt-6 h-8 w-1/3 animate-pulse rounded bg-white/[.06]" /></div></main>
  if (error || !data) return <main className="mx-auto min-h-[70dvh] max-w-5xl px-5 py-20 text-center text-white"><h1 className="text-2xl font-semibold">Fiche indisponible</h1><p className="mt-3 text-sm text-white/55">Les informations de cette personne ne sont pas accessibles dans votre bibliothèque Jellyfin.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm hover:bg-white/10"><ArrowLeft className="size-4" />Retour au catalogue</Link></main>

  const libraryTitles = new Set(data.credits.flatMap((item) => [item.Name, item.SeriesName].filter(Boolean).map((title) => title!.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim())))
  const tmdbCredits = (tmdbData?.credits ?? []).filter((credit) => !libraryTitles.has(credit.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim()))
  const portrait = primaryImage(session.serverUrl, data.person, 720)
    ?? personImage(session.serverUrl, { Id: personId, Name: personName, PrimaryImageTag: data.person.ImageTags?.Primary }, 720)
  return <main className="min-h-screen bg-[#08090c] pb-24 text-white">
    <section className="relative isolate overflow-hidden border-b border-white/10">
      {portrait ? <img src={portrait} alt={`Portrait de ${data.person.Name}`} crossOrigin="anonymous" fetchPriority="high" className="absolute inset-0 size-full object-cover object-[center_25%] opacity-25 blur-sm" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[#08090c] via-[#08090c]/90 to-[#08090c]/60" />
      <div className="relative mx-auto flex min-h-[340px] max-w-7xl items-end gap-6 px-5 pb-10 pt-16 sm:min-h-[430px] sm:gap-10 sm:px-8 sm:pb-14">
        {portrait ? <img src={portrait} alt={`Portrait de ${data.person.Name}`} crossOrigin="anonymous" className="hidden aspect-[2/3] w-40 shrink-0 rounded-2xl border border-white/15 object-cover shadow-2xl sm:block lg:w-52" /> : <div className="hidden size-40 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[.06] sm:flex"><UserRound className="size-14 text-white/35" /></div>}
        <div className="max-w-3xl">
          <Link href="/cast" className="mb-7 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 text-xs text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"><ArrowLeft className="size-4" />Distribution</Link>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.22em] text-[#f2bb55]"><Clapperboard className="size-4" />Profil de la distribution</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{data.person.Name || personName}</h1>
          {data.person.ProductionYear ? <p className="mt-3 text-sm text-white/55">Présent dans la bibliothèque depuis {data.person.ProductionYear}</p> : null}
          {data.person.Overview ? <p className="mt-5 max-w-2xl text-pretty text-sm leading-7 text-white/65 sm:text-base">{data.person.Overview}</p> : <p className="mt-5 max-w-xl text-sm leading-6 text-white/55">Découvrez les films et séries de {data.person.Name || personName} présents dans votre bibliothèque.</p>}
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="mb-1 text-xs uppercase tracking-[.2em] text-white/40">Jellyfin</p><h2 className="text-2xl font-semibold">Dans votre bibliothèque</h2></div><span className="text-xs text-white/45">{data.credits.length} contenu{data.credits.length === 1 ? "" : "s"}</span></div>
      <p className="mb-5 max-w-3xl text-sm leading-6 text-white/50">Les titres affichés sont ceux que votre serveur Jellyfin possède. Le rôle indiqué correspond au personnage interprété dans ce titre, lorsque ces informations sont renseignées dans les métadonnées.</p>
      {data.credits.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5">{data.credits.map((item) => {
        const role = item.People?.find((person) => person.Id === personId)?.Role
        return <div key={item.Id} className="min-w-0"><MediaCard item={item} session={session} />{role ? <p className="mt-1 truncate text-xs text-white/45" title={`Personnage : ${role}`}>Personnage : {role}</p> : null}</div>
      })}</div> : <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center"><p className="text-sm text-white/55">Aucun film ou épisode correspondant n’a été trouvé.</p></div>}
    </section>
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8" aria-labelledby="tmdb-filmography-heading">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[.2em] text-white/40"><Film className="size-3.5" />The Movie Database</p><h2 id="tmdb-filmography-heading" className="text-2xl font-semibold">À découvrir hors bibliothèque</h2></div><span className="text-xs text-white/45">{tmdbCredits.length} titre{tmdbCredits.length === 1 ? "" : "s"}</span></div>
      <p className="mb-5 max-w-3xl text-sm leading-6 text-white/50">Filmographie issue de TMDB, dédupliquée avec les films et séries déjà présents sur votre serveur Jellyfin.</p>
      {tmdbLoading ? <div role="status" aria-label="Chargement de la filmographie TMDB" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-white/[.06]" />)}</div> : tmdbError ? <div role="status" className="rounded-2xl border border-amber-200/15 bg-amber-200/[.04] px-5 py-4 text-sm text-white/65">{tmdbError.message === "TMDB_API_KEY_NOT_CONFIGURED" ? "La filmographie externe est prête ; ajoutez TMDB_API_KEY dans les variables du projet pour activer TMDB." : "TMDB ne répond pas pour le moment. Réessayez plus tard."}</div> : tmdbCredits.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">{tmdbCredits.map((credit, index) => <article key={`${credit.mediaType}-${credit.id}`} className="group min-w-0 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}><div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:border-white/25 group-hover:shadow-2xl">{credit.poster ? <img src={credit.poster} alt={`Affiche de ${credit.title}`} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : <div className="flex size-full items-center justify-center"><Film className="size-8 text-white/25" /></div>}<span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/65 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/75">{credit.mediaType === "movie" ? "Film" : "Série"}</span></div><h3 className="mt-3 line-clamp-2 text-sm font-semibold">{credit.title}</h3><p className="mt-1 truncate text-xs text-white/45">{credit.year || "Année inconnue"}{credit.character ? ` · ${credit.character}` : ""}</p>{credit.overview ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/45">{credit.overview}</p> : null}</article>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center"><p className="text-sm text-white/55">Aucun autre film ou série trouvé sur TMDB pour cette personne.</p></div>}
    </section>
  </main>
}
