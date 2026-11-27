"use client"

import { useState } from "react"
import { Music2, Play } from "lucide-react"
import { directStreamUrl, primaryImage, type BaseItem, type JellyfinSession } from "@/lib/jellyfin"

const PREVIEW_SECONDS = 8

type Props = {
  item: BaseItem
  session: JellyfinSession
  isPreviewing: boolean
  onPreviewStart: () => void
  onPreviewStop: () => void
  onPlay: () => void
}

export function MusicVideoCard({ item, session, isPreviewing, onPreviewStart, onPreviewStop, onPlay }: Props) {
  const [previewFailed, setPreviewFailed] = useState(false)
  const image = primaryImage(session.serverUrl, item, 640)
  const previewUrl = isPreviewing && !previewFailed ? directStreamUrl(session, item.Id, { maxWidth: 640, maxHeight: 360, maxStreamingBitrate: 3_000_000 }) : undefined

  return (
    <article className="group min-w-0">
      <button
        type="button"
        onClick={onPlay}
        onMouseEnter={() => { setPreviewFailed(false); onPreviewStart() }}
        onMouseLeave={onPreviewStop}
        onFocus={() => { setPreviewFailed(false); onPreviewStart() }}
        onBlur={onPreviewStop}
        aria-label={`Lire le clip ${item.Name}`}
        className="relative block aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#252030] to-[#101116] text-left shadow-lg transition duration-300 hover:-translate-y-1 hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transform-none"
      >
        {image ? <img src={image} alt={`Vignette du clip ${item.Name}`} crossOrigin="anonymous" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center"><Music2 className="size-10 text-white/35" /></span>}
        {previewUrl ? <video
          key={item.Id}
          src={previewUrl}
          aria-hidden="true"
          tabIndex={-1}
          muted
          playsInline
          autoPlay
          preload="none"
          crossOrigin="anonymous"
          onPlaying={() => setPreviewFailed(false)}
          onError={() => setPreviewFailed(true)}
          onTimeUpdate={(event) => {
            if (event.currentTarget.currentTime >= PREVIEW_SECONDS) {
              event.currentTarget.pause()
              onPreviewStop()
            }
          }}
          className="absolute inset-0 size-full object-cover"
        /> : null}
        <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-within:opacity-100">Aperçu muet</span>
        <span className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-white text-black shadow-xl transition group-hover:scale-110"><Play className="size-4 fill-current" /></span>
        {item.RunTimeTicks ? <span className="absolute bottom-3 left-3 rounded bg-black/65 px-2 py-1 text-[11px] text-white/90">{Math.floor(item.RunTimeTicks / 600_000_000)}:{String(Math.floor(item.RunTimeTicks / 10_000_000) % 60).padStart(2, "0")}</span> : null}
      </button>
      <h2 className="mt-3 truncate text-sm font-semibold" title={item.Name}>{item.Name}</h2>
      <p className="mt-1 truncate text-xs text-white/45">{item.Artists?.join(", ") || item.AlbumArtist || "Clip Jellyfin"}{item.ProductionYear ? ` · ${item.ProductionYear}` : ""}</p>
    </article>
  )
}
