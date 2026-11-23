"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Play, VolumeX } from "lucide-react"
import { VideoPlayer } from "@/components/video-player"
import {
  backdropImage,
  directStreamUrl,
  type BaseItem,
  primaryImage,
  type JellyfinSession,
} from "@/lib/jellyfin"

type MediaCardProps = {
  item: BaseItem
  session: JellyfinSession
  variant?: "poster" | "wide"
}

export function MediaCard({ item, session, variant = "poster" }: MediaCardProps) {
  const isWide = variant === "wide"
  const img = primaryImage(session.serverUrl, item, isWide ? 500 : 320)
  const progress = item.UserData?.PlayedPercentage ?? 0
  const resumeTicks = item.UserData?.PlaybackPositionTicks ?? 0
  const hasStarted = resumeTicks > 0 || progress > 0
  const canPreview = item.Type === "Movie" || item.Type === "Episode"
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const hoverTimer = useRef<number | null>(null)
  const previewVideo = useRef<HTMLVideoElement>(null)

  useEffect(() => () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    previewVideo.current?.pause()
  }, [])

  const subtitle =
    item.Type === "Episode"
      ? `${item.SeriesName ?? ""}${item.ParentIndexNumber != null && item.IndexNumber != null ? ` · S${item.ParentIndexNumber}:E${item.IndexNumber}` : ""}`
      : item.ProductionYear
        ? String(item.ProductionYear)
        : item.Type === "Series"
          ? "Série"
          : ""

  function startPreview() {
    if (!canPreview || previewUrl) return
    hoverTimer.current = window.setTimeout(() => {
      const url = new URL(directStreamUrl(session, item.Id, { startTimeTicks: resumeTicks }))
      url.searchParams.set("static", "true")
      setPreviewUrl(url.toString())
    }, 450)
  }

  function stopPreview() {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = null
    setPreviewUrl(null)
  }

  return (
    <div onMouseEnter={startPreview} onMouseLeave={stopPreview} className="group netflix-hover flex flex-col gap-2 outline-none">
      <div className={`relative overflow-hidden rounded-lg border border-border bg-secondary transition-all group-hover:border-primary/60 group-focus-within:ring-2 group-focus-within:ring-ring ${isWide ? "aspect-video" : "aspect-[2/3]"}`}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={item.Name} crossOrigin="anonymous" loading="lazy" className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${previewUrl ? "opacity-0" : "opacity-100"}`} />
        ) : <div className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-muted-foreground">{item.Name}</div>}
        {previewUrl ? <video ref={previewVideo} src={previewUrl} muted autoPlay playsInline preload="metadata" aria-label={`Aperçu vidéo de ${item.Name}`} onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= 12) event.currentTarget.pause() }} className="absolute inset-0 size-full object-cover" /> : null}
        {previewUrl ? <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" /> : null}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 text-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <p className="text-xs font-medium text-white drop-shadow">{hasStarted ? "Vous avez déjà commencé ce titre" : "Aperçu du film"}</p>
          <button type="button" onClick={() => setPlayerOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <Play className="size-3.5 fill-current" />{hasStarted ? "Continuer" : "Commencer"}
          </button>
          {previewUrl ? <span className="flex items-center gap-1 text-[10px] text-white/70"><VolumeX className="size-3" />Aperçu sans son</span> : null}
        </div>
        {progress > 0 && progress < 100 ? <div className="absolute inset-x-0 bottom-0 h-1.5 bg-background/60"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div> : null}
      </div>
      <div className="min-w-0">
        <Link href={`/item/${item.Id}`} className="block truncate text-sm font-medium text-foreground hover:text-primary">{item.Name}</Link>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {playerOpen ? <VideoPlayer session={session} itemId={item.Id} title={item.Name} backdropUrl={backdropImage(session.serverUrl, item, 1600)} startPositionTicks={resumeTicks} language={item.OriginalLanguage ?? item.Language} onClose={() => setPlayerOpen(false)} /> : null}
    </div>
  )
}
