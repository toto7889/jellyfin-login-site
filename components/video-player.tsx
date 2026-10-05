"use client"

import Hls from "hls.js"
import { ChevronLeft, Maximize, Pause, Play, Settings2, Volume2, VolumeX } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { directStreamUrl, reportProgress, streamUrl, type JellyfinSession } from "@/lib/jellyfin"
import { useJellyfin } from "@/components/jellyfin-provider"

type Props = { session: JellyfinSession; itemId: string; title: string; subtitle?: string; language?: string; backdropUrl?: string | null; startPositionTicks?: number; onClose: () => void }

export function VideoPlayer({ session, itemId, title, subtitle, language, backdropUrl, startPositionTicks, onClose }: Props) {
  const { preferences, currentIp, blockIp } = useJellyfin()
  const idleLimit = 120
  const [idleSeconds, setIdleSeconds] = useState(0)
  const [securityNotice, setSecurityNotice] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [controls, setControls] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)

  function revealControls() { setControls(true); if (hideTimer.current) window.clearTimeout(hideTimer.current); hideTimer.current = window.setTimeout(() => { if (playing) setControls(false) }, 2800) }
  function togglePlay() { const video = videoRef.current; if (!video) return; if (video.paused) void video.play(); else video.pause(); revealControls() }
  function seek(value: number) { const video = videoRef.current; if (!video) return; video.currentTime = value; setProgress(value); revealControls() }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const idleTimer = window.setInterval(() => {
      if (video.paused && !document.hidden) setIdleSeconds((value) => {
        const next = value + 1
        if (next >= idleLimit) {
          blockIp(currentIp)
          window.location.assign(`/?status=encours&reason=${encodeURIComponent("Aucune lecture active pendant 120 secondes")}`)
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(idleTimer)
  }, [blockIp, currentIp])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setReady(false); setError(null); setRetrying(false)
    video.crossOrigin = "anonymous"
    let hls: Hls | null = null
    const src = streamUrl(session, itemId)
    const startSeconds = startPositionTicks ? startPositionTicks / 10_000_000 : 0
    const begin = () => { if (startSeconds > 0 && Number.isFinite(video.duration)) video.currentTime = startSeconds; if (preferences.autoplay) void video.play().catch(() => {}) }
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, backBufferLength: 90, maxBufferLength: 30 })
      hls.attachMedia(video)
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls?.loadSource(src))
      hls.on(Hls.Events.MANIFEST_PARSED, begin)
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        hls?.destroy()
        hls = null
        setError("Impossible de démarrer le flux Jellyfin.")
      })
    } else {
      video.src = video.canPlayType("application/vnd.apple.mpegurl") ? src : directStreamUrl(session, itemId)
      video.addEventListener("loadedmetadata", begin, { once: true })
    }
    const onReady = () => setReady(true)
    const onPlay = () => { setPlaying(true); setIdleSeconds(0); setSecurityNotice(false); window.history.replaceState(null, "", `/item/${itemId}?status=encours`); revealControls() }
    const onPause = () => { setPlaying(false); setControls(true); setSecurityNotice(true) }
    const onTime = () => { setProgress(video.currentTime); setDuration(video.duration || 0) }
    const onError = () => setError("Ce format n'est pas lisible par le navigateur ou le serveur.")
    video.addEventListener("canplay", onReady); video.addEventListener("playing", onPlay); video.addEventListener("pause", onPause); video.addEventListener("timeupdate", onTime); video.addEventListener("durationchange", onTime); video.addEventListener("error", onError)
    const interval = window.setInterval(() => { if (!video.paused && video.currentTime > 0) void reportProgress(session, itemId, video.currentTime * 10_000_000) }, 10000)
    return () => { window.clearInterval(interval); if (hideTimer.current) window.clearTimeout(hideTimer.current); ["canplay", "playing", "pause", "timeupdate", "durationchange", "error"].forEach((event) => video.removeEventListener(event, event === "canplay" ? onReady : event === "playing" ? onPlay : event === "pause" ? onPause : event === "timeupdate" || event === "durationchange" ? onTime : onError)); hls?.destroy() }
  }, [session, itemId, startPositionTicks, preferences.autoplay, retryNonce])

  return <div ref={shellRef} onMouseMove={revealControls} onTouchStart={revealControls} className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-label={`Lecteur : ${title}`}>
    <div className={`absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/85 to-transparent px-5 pb-14 pt-5 transition-opacity duration-300 ${controls ? "opacity-100" : "pointer-events-none opacity-0"}`}><button type="button" onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-white/85 hover:text-white"><ChevronLeft className="size-6" /> Retour</button><div className="text-center"><h2 className="font-semibold">{title}</h2>{subtitle ? <p className="text-xs text-white/55">{subtitle}</p> : null}{language ? <p className="text-xs text-cyan-200/80">Langue : {language}</p> : null}</div><button type="button" className="text-white/70 hover:text-white" aria-label="Paramètres"><Settings2 className="size-5" /></button></div>
    <div className="relative flex min-h-0 flex-1 items-center justify-center" onDoubleClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void shellRef.current?.requestFullscreen() }}>
      <video ref={videoRef} playsInline className={`h-full w-full object-contain transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} onClick={togglePlay} />
      {securityNotice && !playing ? <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-amber-200/20 bg-black/70 px-5 py-3 text-center text-sm text-amber-100 backdrop-blur-xl">Lecture en pause. Redirection dans <strong>{Math.max(0, idleLimit - idleSeconds)} s</strong> si aucun film n&apos;est lancé.</div> : null}
      {!ready ? <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">{backdropUrl ? <img src={backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm" /> : null}<div className="absolute inset-0 bg-black/50" /> <div className="relative text-center">{error ? <><p className="max-w-sm text-sm text-red-100">{error}</p><button type="button" onClick={() => { setRetrying(true); setRetryNonce((value) => value + 1) }} className="mt-5 rounded-md bg-[#e50914] px-5 py-2 text-sm font-semibold transition hover:bg-[#f6121d] disabled:opacity-60" disabled={retrying}>{retrying ? "Nouvel essai…" : "Réessayer"}</button><p className="mt-3 max-w-sm text-xs text-white/45">Jellyfin transcode automatiquement les formats AVI, MKV et MP4 compatibles serveur.</p></> : <><div className="mx-auto size-12 animate-spin rounded-full border-4 border-white/20 border-t-[#e50914]" /><p className="mt-5 font-medium">Préparation de la lecture</p><p className="mt-1 text-xs uppercase tracking-[.25em] text-white/45">{title}</p></>}</div></div> : null}
      {ready && !playing && !error ? <button type="button" onClick={togglePlay} className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-2xl transition hover:scale-105" aria-label="Lire"><Play className="ml-1 size-7 fill-current" /></button> : null}
    </div>
    <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-5 pb-5 pt-16 transition-opacity duration-300 ${controls && ready ? "opacity-100" : "pointer-events-none opacity-0"}`}><input aria-label="Position dans la vidéo" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(progress, duration || 0)} onChange={(e) => seek(Number(e.target.value))} className="player-range w-full" /><div className="mt-3 flex items-center gap-4"><button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Lire"} className="hover:text-[#e50914]">{playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}</button><button type="button" onClick={() => { const video = videoRef.current; if (video) { video.muted = !video.muted; setMuted(video.muted) } }} aria-label={muted ? "Activer le son" : "Couper le son"}>{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button><span className="text-xs text-white/60">{formatTime(progress)} / {formatTime(duration)}</span><span className="ml-auto" /><button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void shellRef.current?.requestFullscreen() }} aria-label="Plein écran"><Maximize className="size-5" /></button></div></div>
  </div>
}
function formatTime(seconds: number) { if (!Number.isFinite(seconds)) return "00:00"; const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = Math.floor(seconds % 60); return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` }
