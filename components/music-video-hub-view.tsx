"use client"

import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"
import { ArrowLeft, Loader2, Music2, Video } from "lucide-react"
import { MusicVideoCard } from "@/components/music-video-card"
import { VideoPlayer } from "@/components/video-player"
import { useJellyfin } from "@/components/jellyfin-provider"
import { backdropImage, getItems, type BaseItem } from "@/lib/jellyfin"

export function MusicVideoHubView() {
  const { session } = useJellyfin()
  const [current, setCurrent] = useState<BaseItem | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const { data, error, isLoading } = useSWR(
    session ? ["music-video-hub", session.userId] : null,
    () => getItems(session!, { includeItemTypes: "MusicVideo", limit: 80, sortBy: "DateCreated", sortOrder: "Descending" }),
    { dedupingInterval: 60_000, revalidateOnFocus: false, keepPreviousData: true },
  )

  if (!session) return null
  return <main className="min-h-[calc(100dvh-68px)] bg-[#08090c] pb-24 text-white">
    <section className="relative isolate overflow-hidden border-b border-white/[.08]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_18%,rgba(155,99,208,.22),transparent_48%),radial-gradient(ellipse_at_12%_85%,rgba(0,164,220,.13),transparent_42%)]" />
      <div className="relative mx-auto flex min-h-[310px] max-w-[1500px] flex-col justify-end px-5 pb-9 pt-10 sm:min-h-[380px] sm:px-8 sm:pb-12 lg:px-12">
        <Link href="/music" className="mb-7 inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 text-xs text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"><ArrowLeft className="size-4" />Hub musique</Link>
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#c09de6]"><Video className="size-4" />Votre collection vidéo musicale</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Clips musicaux</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">Retrouvez vos performances et clips vidéo Jellyfin, avec lecture adaptée à votre écran.</p>
        <span className="mt-5 w-fit rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-xs text-white/55">{data?.length ?? 0} clips chargés</span>
      </div>
    </section>
    <section className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 lg:px-12">
      {error ? <div role="alert" className="rounded-2xl border border-red-300/15 bg-red-400/[.06] p-5 text-sm text-white/75">Impossible de charger les clips. Vérifiez les droits de votre compte Jellyfin sur les vidéos musicales.</div> : null}
      {isLoading && !error ? <div role="status" aria-label="Chargement des clips musicaux" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-video animate-pulse rounded-2xl bg-white/[.06]" />)}<Loader2 className="sr-only size-6 animate-spin" /></div> : null}
      {!isLoading && !error && data?.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 text-center"><Music2 className="size-10 text-white/30" /><h2 className="mt-4 text-xl font-semibold">Aucun clip dans cette bibliothèque</h2><p className="mt-2 max-w-md text-sm text-white/50">Les vidéos musicales apparaîtront ici lorsque votre compte Jellyfin y aura accès.</p><Link href="/music" className="mt-5 text-sm text-white/70 underline underline-offset-4 hover:text-white">Explorer la musique</Link></div> : null}
      {data?.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 xl:grid-cols-5">{data.map((item) => <MusicVideoCard
        key={item.Id}
        item={item}
        session={session}
        isPreviewing={previewingId === item.Id}
        onPreviewStart={() => setPreviewingId(item.Id)}
        onPreviewStop={() => setPreviewingId((activeId) => activeId === item.Id ? null : activeId)}
        onPlay={() => { setPreviewingId(null); setCurrent(item) }}
      />)}</div> : null}
    </section>
    {current ? <VideoPlayer session={session} itemId={current.Id} title={current.Name} subtitle={current.Artists?.join(", ") || current.AlbumArtist} backdropUrl={backdropImage(session.serverUrl, current, 1600)} startPositionTicks={current.UserData?.PlaybackPositionTicks ?? 0} durationTicks={current.RunTimeTicks} language={current.OriginalLanguage ?? current.Language} returnHref="/music-videos" onClose={() => setCurrent(null)} /> : null}
  </main>
}
