"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, Play, VolumeX } from "lucide-react"
import { VideoPlayer } from "@/components/video-player"
import {
  backdropImage,
  directStreamUrl,
  getEpisodes,
  getItem,
  type BaseItem,
  primaryImage,
  type JellyfinSession,
} from "@/lib/jellyfin"

type MediaCardProps = {
  item: BaseItem
  session: JellyfinSession
  variant?: "poster" | "wide"
  onPreviewChange?: (active: boolean) => void
}

export function MediaCard({ item, session, variant = "poster", onPreviewChange }: MediaCardProps) {
  const isWide = variant === "wide"
  const img = primaryImage(session.serverUrl, item, isWide ? 500 : 320)
  const [currentItem, setCurrentItem] = useState(item)
  const progress = currentItem.UserData?.PlayedPercentage ?? 0
  const resumeTicks = currentItem.UserData?.PlaybackPositionTicks ?? 0
  const hasStarted = resumeTicks > 0 || progress > 0
  const canPreview = item.Type === "Movie" || item.Type === "Episode" || item.Type === "Series"
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewReady, setPreviewReady] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [previewStartSeconds, setPreviewStartSeconds] = useState(0)
  const [playerOpen, setPlayerOpen] = useState(false)
  const hoverTimer = useRef<number | null>(null)
  const requestId = useRef(0)
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
    if (!canPreview || previewing) return
    setPreviewing(true)
    onPreviewChange?.(true)
    const currentRequest = ++requestId.current
    hoverTimer.current = window.setTimeout(async () => {
      try {
        const resolvedTarget = item.Type === "Series"
          ? await getEpisodes(session, item.Id).then((episodes) => episodes.find((episode) => (episode.UserData?.PlaybackPositionTicks ?? 0) > 0) ?? episodes[0])
          : await getItem(session, item.Id)
        if (currentRequest !== requestId.current) return
        if (!resolvedTarget || resolvedTarget.Type === "Series") return
        setCurrentItem(resolvedTarget)
        const latestTicks = resolvedTarget.UserData?.PlaybackPositionTicks ?? 0
        setPreviewReady(false)
        setPreviewStartSeconds(latestTicks / 10_000_000)
        const url = new URL(directStreamUrl(session, resolvedTarget.Id, { startTimeTicks: latestTicks }))
        url.searchParams.set("static", "true")
        setPreviewUrl(url.toString())
      } catch {
        if (currentRequest === requestId.current) setCurrentItem(item)
      }
    }, 350)
  }

  async function openPlayback() {
    try {
      const target = currentItem.Type === "Series"
        ? await getEpisodes(session, currentItem.Id).then((episodes) => episodes.find((episode) => (episode.UserData?.PlaybackPositionTicks ?? 0) > 0) ?? episodes[0])
        : currentItem
      if (!target) return
      const previewPositionSeconds = previewVideo.current?.currentTime ?? 0
      const previewPositionTicks = previewPositionSeconds > 0 ? previewPositionSeconds * 10_000_000 : 0
      stopPreview()
      setPlayerOpen(true)
      setPreviewReady(false)
      setCurrentItem({ ...target, UserData: { ...target.UserData, PlaybackPositionTicks: previewPositionTicks || target.UserData?.PlaybackPositionTicks } })
    } catch {
      if (currentItem.Type !== "Series") {
        stopPreview()
        setPlayerOpen(true)
      }
    }
  }

  function stopPreview() {
    requestId.current += 1
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = null
    setPreviewReady(false)
    setPreviewing(false)
    setPreviewUrl(null)
    onPreviewChange?.(false)
  }

  return (
    <div onMouseEnter={startPreview} onMouseLeave={stopPreview} onFocusCapture={startPreview} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) stopPreview() }} className="group netflix-hover flex flex-col gap-2 outline-none">
      <div className={`media-preview-frame relative overflow-hidden rounded-lg border border-border bg-secondary group-hover:border-primary/60 group-focus-within:ring-2 group-focus-within:ring-ring ${isWide ? "media-preview-frame--wide" : previewing ? "media-preview-frame--active" : ""}`}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={item.Name} crossOrigin="anonymous" loading="lazy" className={`absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-105 ${previewReady ? "opacity-0" : "opacity-100"}`} />
        ) : <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-sm text-muted-foreground">{item.Name}</div>}
        {previewUrl ? <video ref={previewVideo} src={previewUrl} muted playsInline preload="metadata" aria-label={`Aperçu vidéo de ${item.Name}`} onLoadedMetadata={(event) => { const video = event.currentTarget; if (previewStartSeconds > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(previewStartSeconds, Math.max(0, video.duration - 1)); void video.play().then(() => setPreviewReady(true)).catch(() => undefined) }} onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= previewStartSeconds + 12) event.currentTarget.pause() }} className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${previewReady ? "opacity-100" : "opacity-0"}`} /> : null}
        {previewReady ? <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" /> : null}
        <div className="media-card-actions absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 text-center opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <p className="text-xs font-semibold text-white drop-shadow">{canPreview ? hasStarted ? `Vous avez déjà commencé ${item.Type === "Series" ? "cette série" : item.Type === "Episode" ? "cet épisode" : "ce film"}` : `Aperçu ${item.Type === "Series" ? "de la série" : item.Type === "Episode" ? "de l’épisode" : "du film"}` : "Découvrez les saisons et les épisodes"}</p>
          <div className="flex w-full items-center justify-center gap-2">
            {canPreview ? <button type="button" onClick={() => void openPlayback()} aria-label={`${hasStarted ? "Continuer" : "Lire"} ${item.Name}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-lg shadow-black/30 transition duration-200 hover:scale-[1.04] hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Play className="size-3.5 fill-current" />{hasStarted ? "Continuer" : "Lire"}
            </button> : null}
            <Link href={`/item/${item.Id}`} aria-label={`Voir les détails de ${item.Name}`} className="inline-flex size-10 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white shadow-lg backdrop-blur-md transition duration-200 hover:scale-105 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          {previewUrl ? <span className="flex items-center gap-1 text-[10px] text-white/75"><VolumeX className="size-3" />Aperçu sans son</span> : null}
        </div>
        {progress > 0 && progress < 100 ? <div className="absolute inset-x-0 bottom-0 h-1.5 bg-background/60"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div> : null}
      </div>
      <div className="min-w-0">
        <Link href={`/item/${item.Id}`} className="block truncate text-sm font-medium text-foreground hover:text-primary">{item.Name}</Link>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {playerOpen ? <VideoPlayer session={session} itemId={currentItem.Id} title={item.Name} subtitle={currentItem.Type === "Episode" ? currentItem.Name : undefined} backdropUrl={backdropImage(session.serverUrl, item, 1600)} startPositionTicks={currentItem.UserData?.PlaybackPositionTicks ?? 0} language={item.OriginalLanguage ?? item.Language} onClose={() => setPlayerOpen(false)} /> : null}
    </div>
  )
}
