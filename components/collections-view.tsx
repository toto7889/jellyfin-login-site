"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Layers3, Loader2 } from "lucide-react"
import { MediaCard } from "@/components/media-card"
import { useJellyfin } from "@/components/jellyfin-provider"
import { getCollections, getItem, getItems, primaryImage } from "@/lib/jellyfin"

export function CollectionsView({ collectionId }: { collectionId?: string }) {
  const { session } = useJellyfin()
  const { data, error, isLoading } = useSWR(
    session ? ["collections", session.userId, collectionId] : null,
    async () => {
      if (!session) return null
      if (!collectionId) return { collections: await getCollections(session), items: [], collection: null }
      const [collection, items] = await Promise.all([
        getItem(session, collectionId),
        getItems(session, { parentId: collectionId, includeItemTypes: "Movie,Series,BoxSet", recursive: false, limit: 200 }),
      ])
      return { collections: [], items, collection }
    },
    { revalidateOnFocus: false, keepPreviousData: true },
  )

  if (!session) return null
  if (isLoading) return <main className="flex min-h-[65dvh] items-center justify-center bg-[#08090c] text-white"><div role="status" aria-label="Chargement des collections"><Loader2 className="size-7 animate-spin text-white/50" /></div></main>
  if (error || !data) return <main className="mx-auto min-h-[65dvh] max-w-5xl px-5 py-20 text-center text-white"><h1 className="text-2xl font-semibold">Collections indisponibles</h1><p className="mt-3 text-sm text-white/55">Impossible de charger les collections de votre serveur Jellyfin.</p></main>

  if (!collectionId) return <main className="min-h-screen bg-[#08090c] px-5 pb-24 pt-10 text-white sm:px-8">
    <div className="mx-auto max-w-7xl"><p className="mb-2 text-xs font-semibold uppercase tracking-[.24em] text-[#f2bb55]">Votre catalogue Jellyfin</p><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Collections</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Vos sagas, regroupements et sélections, réunis au même endroit.</p>
      {data.collections.length ? <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">{data.collections.map((collection) => {
        const image = primaryImage(session.serverUrl, collection, 480)
        return <Link key={collection.Id} href={`/collections/${encodeURIComponent(collection.Id)}`} className="group block min-w-0 rounded-xl outline-none transition duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#f2bb55]">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/[.04] shadow-lg transition group-hover:border-white/30 group-hover:shadow-2xl">{image ? <img src={image} alt={`Affiche de la collection ${collection.Name}`} crossOrigin="anonymous" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex size-full items-center justify-center"><Layers3 className="size-10 text-white/30" /></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-70 transition group-hover:opacity-100" /><span className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">{collection.Name}</span></div>
        </Link>
      })}</div> : <div className="mt-10 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center"><Layers3 className="mx-auto size-8 text-white/35" /><p className="mt-3 text-sm text-white/55">Aucune collection Jellyfin n’est disponible pour ce compte.</p></div>}
    </div>
  </main>

  const collection = data.collection
  const backdrop = collection ? primaryImage(session.serverUrl, collection, 1600) : null

  return <main className="min-h-screen overflow-hidden bg-[#08090c] px-5 pb-24 pt-7 text-white sm:px-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/collections" className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-4 text-xs font-medium text-white/65 transition duration-300 hover:border-white/25 hover:bg-white/[.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2bb55]">
        <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />Toutes les collections
      </Link>

      <section aria-labelledby="collection-title" className="relative isolate mt-6 min-h-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-[#121318] shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:min-h-[470px] animate-in fade-in duration-700">
        {backdrop ? <img src={backdrop} alt="" crossOrigin="anonymous" fetchPriority="high" className="absolute inset-0 -z-20 size-full scale-105 object-cover opacity-35 blur-[2px] animate-in fade-in zoom-in-105 duration-1000" /> : null}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,9,12,.98)_0%,rgba(8,9,12,.88)_42%,rgba(8,9,12,.35)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#08090c] via-transparent to-black/15" />
        <div className="grid min-h-[420px] items-end gap-8 p-6 sm:min-h-[470px] sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center sm:gap-12 sm:p-12 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-14">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f2bb55]/25 bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#f2bb55] backdrop-blur-md">
              <Layers3 className="size-3.5" />Collection Jellyfin
            </div>
            <h1 id="collection-title" className="text-4xl font-black leading-[1.02] tracking-[-.045em] text-white [text-wrap:balance] sm:text-6xl lg:text-7xl">{collection?.Name ?? "Collection"}</h1>
            {collection?.Overview ? <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">{collection.Overview}</p> : <p className="mt-5 max-w-xl text-sm leading-6 text-white/55">Retrouvez ici tous les films et séries réunis dans cette sélection.</p>}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md"><Layers3 className="size-4 text-[#f2bb55]" />{data.items.length} titre{data.items.length === 1 ? "" : "s"}</span>
              {collection?.CollectionType ? <span className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs font-medium capitalize text-white/65 backdrop-blur-md">{collection.CollectionType}</span> : null}
            </div>
          </div>
          {backdrop ? <div className="hidden justify-self-end sm:block animate-in fade-in zoom-in-95 duration-700" style={{ animationDelay: "120ms" }}>
            <div className="group relative aspect-[2/3] w-[190px] overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-[0_24px_70px_rgba(0,0,0,.5)] transition duration-500 hover:-translate-y-2 hover:rotate-[1deg] hover:shadow-[0_32px_90px_rgba(0,0,0,.65)] lg:w-[225px]">
              <img src={backdrop} alt={`Visuel de ${collection?.Name ?? "la collection"}`} crossOrigin="anonymous" className="size-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/10" />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#f2bb55] via-[#ffe0a1] to-transparent" />
            </div>
          </div> : null}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#f2bb55]/50 to-transparent" />
      </section>

      <section aria-labelledby="collection-items-heading" className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#f2bb55]">À découvrir</p><h2 id="collection-items-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Les titres de la collection</h2></div>
          <span className="text-xs font-medium text-white/45">{data.items.length} titre{data.items.length === 1 ? "" : "s"}</span>
        </div>
        {data.items.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5">{data.items.map((item, index) => <div key={item.Id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${Math.min(index * 55, 440)}ms`, animationFillMode: "both" }}><MediaCard item={item} session={session} /></div>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.02] px-6 py-14 text-center animate-in fade-in duration-500"><Layers3 className="mx-auto size-8 text-white/30" /><p className="mt-3 text-sm text-white/55">Cette collection ne contient aucun titre accessible.</p></div>}
      </section>
    </div>
  </main>
}
