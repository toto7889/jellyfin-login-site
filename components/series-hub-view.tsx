"use client"

import Link from "next/link"
import useSWR from "swr"
import { useMemo, useState } from "react"
import { ArrowRight, Clapperboard, Play, Search, Star, Tv } from "lucide-react"
import { Input } from "@/components/ui/input"
import { MediaRow } from "@/components/media-row"
import { useJellyfin } from "@/components/jellyfin-provider"
import { backdropImage, getItems, getLatest, getResumeItems, getViews, type BaseItem, type JellyfinSession } from "@/lib/jellyfin"

export function SeriesHubView() {
  const { session } = useJellyfin()
  if (!session) return null
  return <SeriesHubContent session={session} />
}

function SeriesHubContent({ session }: { session: JellyfinSession }) {
  const [query, setQuery] = useState("")
  const { data, error, isLoading } = useSWR(["series-hub", session.userId], async () => {
    const [views, resume] = await Promise.all([getViews(session), getResumeItems(session)])
    const seriesViews = views.filter((view) => view.CollectionType === "tvshows")
    const seriesByView = await Promise.all(seriesViews.map(async (view) => ({ view, items: await getLatest(session, view.Id, 24) })))
    const catalog = await getItems(session, { parentId: seriesViews[0]?.Id, includeItemTypes: "Series", sortBy: "DateCreated", sortOrder: "Descending", limit: 80 })
    return { seriesByView, catalog, resume: resume.filter((item) => item.Type === "Episode") }
  }, { dedupingInterval: 60_000, revalidateOnFocus: false, keepPreviousData: true })

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fr")
    if (!term) return data?.catalog ?? []
    return (data?.catalog ?? []).filter((item) => `${item.Name} ${item.ProductionYear ?? ""} ${(item.Genres ?? []).join(" ")}`.toLocaleLowerCase("fr").includes(term))
  }, [data?.catalog, query])
  if (isLoading) return <main role="status" aria-label="Chargement du hub séries" className="min-h-screen animate-in fade-in bg-[#090a0d] px-4 pb-24 pt-10 text-white sm:px-7"><div className="mx-auto max-w-[1600px]"><div className="mb-8 h-[50dvh] min-h-72 animate-pulse rounded-3xl bg-[linear-gradient(110deg,#121318_8%,#20212a_18%,#121318_33%)] bg-[length:200%_100%]" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-xl bg-white/[.06]" />)}</div></div></main>
  if (error || !data) return <div role="alert" className="mx-auto max-w-xl px-6 py-24 text-center"><Tv className="mx-auto size-9 text-primary" /><h1 className="mt-4 text-xl font-semibold">Le hub séries n’est pas disponible</h1><p className="mt-2 text-sm text-muted-foreground">Vérifiez la connexion au serveur Jellyfin puis réessayez.</p></div>

  const hero = data.resume[0] ?? data.catalog[0] ?? data.seriesByView.flatMap(({ items }) => items).find((item) => item.Type === "Series")
  const genres = Array.from(new Set(data.catalog.flatMap((item) => item.Genres ?? []))).slice(0, 5)
  return <div className="min-h-screen bg-[#090a0d] pb-24 text-white">
    {hero ? <SeriesHero item={hero} session={session} /> : <div className="mx-auto flex min-h-[50dvh] max-w-5xl flex-col items-center justify-center px-6 text-center"><Tv className="size-12 text-white/35" /><h1 className="mt-5 text-3xl font-semibold">Votre espace séries</h1><p className="mt-2 max-w-lg text-sm text-white/55">Ajoutez une bibliothèque de séries à Jellyfin pour retrouver ici les nouveautés et les épisodes à reprendre.</p></div>}
    <main className="mx-auto flex max-w-[1600px] flex-col gap-10 px-4 pt-8 sm:px-7 lg:px-10">
      <section className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#d9a76a]"><Tv className="size-4" />Séries Jellyfin</p><h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">Hub Séries</h1><p className="mt-2 text-sm text-white/50">{data.catalog.length} séries · saisons et épisodes au même endroit.</p></div><label className="relative block w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une série ou un genre" aria-label="Rechercher dans les séries" className="h-11 rounded-full border-white/10 bg-white/[.04] pl-9 text-white placeholder:text-white/35" /></label></section>
      {query.trim() ? <MediaRow title={`Résultats · ${filtered.length}`} items={filtered} session={session} /> : <>
        <MediaRow title="Reprendre un épisode" items={data.resume} session={session} variant="wide" />
        {data.seriesByView.map(({ view, items }) => <MediaRow key={view.Id} title={`Nouveautés · ${view.Name}`} items={items.filter((item) => item.Type === "Series")} session={session} />)}
        {genres.map((genre) => <MediaRow key={genre} title={genre} items={data.catalog.filter((item) => item.Genres?.includes(genre)).slice(0, 16)} session={session} />)}
        <MediaRow title="Tout le catalogue chargé" items={data.catalog} session={session} />
      </>}
      {!filtered.length && query.trim() ? <p className="rounded-2xl border border-dashed border-white/15 py-12 text-center text-sm text-white/50">Aucune série ne correspond à cette recherche.</p> : null}
    </main>
  </div>
}

function SeriesHero({ item, session }: { item: BaseItem; session: JellyfinSession }) {
  const backdrop = backdropImage(session.serverUrl, item, 1600)
  const isEpisode = item.Type === "Episode"
  return <section className="relative min-h-[50dvh] overflow-hidden border-b border-white/[.08] bg-[#111216] sm:min-h-[62dvh]">
    {backdrop ? <img src={backdrop} alt="" crossOrigin="anonymous" fetchPriority="high" className="absolute inset-0 size-full object-cover opacity-55" /> : null}
    <div className="absolute inset-0 bg-gradient-to-r from-[#090a0d] via-[#090a0d]/75 to-transparent" /><div className="absolute inset-0 bg-gradient-to-t from-[#090a0d] via-transparent to-black/10" />
    <div className="relative mx-auto flex min-h-[50dvh] max-w-[1600px] flex-col justify-end gap-4 px-4 pb-8 pt-16 sm:min-h-[62dvh] sm:px-7 sm:pb-12 lg:px-10">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.22em] text-[#d9a76a]"><Star className="size-4" />{isEpisode ? "À reprendre" : "À découvrir"}{item.ProductionYear ? ` · ${item.ProductionYear}` : ""}</p>
      <h2 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">{item.SeriesName ?? item.Name}</h2>
      {item.Overview ? <p className="line-clamp-3 max-w-2xl text-pretty text-sm leading-relaxed text-white/65 sm:text-base">{item.Overview}</p> : null}
      {item.Genres?.length ? <p className="text-xs text-white/45">{item.Genres.join(" · ")}</p> : null}
      <div className="mt-2 flex flex-wrap gap-3"><Link href={`/item/${isEpisode ? item.SeriesId ?? item.Id : item.Id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:scale-[1.02]"><Play className="size-4 fill-current" />{isEpisode ? "Reprendre" : "Découvrir"}</Link><Link href="/series" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[.06] px-5 text-sm font-medium text-white transition hover:bg-white/10">Explorer les séries<ArrowRight className="size-4" /></Link></div>
      <span className="sr-only"><Clapperboard /></span>
    </div>
  </section>
}
