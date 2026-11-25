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
  const backdrop = collection ? primaryImage(session.serverUrl, collection, 1200) : null
  return <main className="min-h-screen bg-[#08090c] px-5 pb-24 pt-8 text-white sm:px-8"><div className="mx-auto max-w-7xl">
    <Link href="/collections" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"><ArrowLeft className="size-4" />Toutes les collections</Link>
    <section className="relative mt-6 flex min-h-60 items-end overflow-hidden rounded-3xl border border-white/10 bg-[#15161a] p-7 sm:min-h-80 sm:p-10">{backdrop ? <img src={backdrop} alt="" crossOrigin="anonymous" className="absolute inset-0 size-full object-cover opacity-40 blur-sm" /> : null}<div className="absolute inset-0 bg-gradient-to-r from-[#08090c]/95 via-[#08090c]/70 to-transparent" /><div className="relative"><p className="mb-2 text-xs font-semibold uppercase tracking-[.24em] text-[#f2bb55]">Collection Jellyfin</p><h1 className="text-4xl font-black tracking-tight sm:text-6xl">{collection?.Name}</h1>{collection?.Overview ? <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">{collection.Overview}</p> : null}</div></section>
    <div className="mb-6 mt-9 flex items-end justify-between"><h2 className="text-xl font-semibold">Titres de la collection</h2><span className="text-xs text-white/45">{data.items.length} titre{data.items.length === 1 ? "" : "s"}</span></div>
    {data.items.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5">{data.items.map((item) => <MediaCard key={item.Id} item={item} session={session} />)}</div> : <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center"><p className="text-sm text-white/55">Cette collection ne contient aucun titre accessible.</p></div>}
  </div></main>
}
