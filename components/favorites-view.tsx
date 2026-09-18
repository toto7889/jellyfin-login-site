"use client"

import useSWR from "swr"
import { Heart, Loader2 } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { MediaCard } from "@/components/media-card"
import { getItem, type BaseItem } from "@/lib/jellyfin"

export function FavoritesView() {
  const { session, preferences } = useJellyfin()
  const ids = preferences.favorites
  const { data, isLoading } = useSWR(session && ids.length ? ["favorites", session.userId, ids.join(",")] : null, async () => Promise.all(ids.map((id) => getItem(session!, id).catch(() => null))))
  if (!session) return null
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><div className="mb-8 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.25em] text-[#e50914]">Ma sélection</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Mes favoris</h1></div><Heart className="size-8 fill-[#e50914] text-[#e50914]" /></div>{isLoading ? <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : !ids.length ? <div className="rounded-2xl border border-white/10 bg-white/[.04] py-20 text-center"><Heart className="mx-auto size-10 text-white/30" /><p className="mt-4 text-white/60">Votre sélection est vide.</p><p className="mt-1 text-sm text-white/35">Ajoutez des films et séries depuis leur page d&apos;informations.</p></div> : <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">{(data ?? []).filter((item): item is BaseItem => Boolean(item)).map((item) => <MediaCard key={item.Id} item={item} session={session} />)}</div>}</main>
}
