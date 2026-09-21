"use client"

import Hls from "hls.js"
import useSWR from "swr"
import { ChevronLeft, FastForward, Maximize, Pause, Play, Rewind, Settings2, Volume2, VolumeX, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { directStreamUrl, getItem, reportProgress, streamUrl, type JellyfinSession, type MediaStream } from "@/lib/jellyfin"
import { useJellyfin } from "@/components/jellyfin-provider"

type Props = { session: JellyfinSession; itemId: string; title: string; subtitle?: string; backdropUrl?: string | null; startPositionTicks?: number; onClose: () => void }

export function VideoPlayer({ session, itemId, title, subtitle, backdropUrl, startPositionTicks, onClose }: Props) {
  const { preferences } = useJellyfin()
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
  const [showSettings, setShowSettings] = useState(false)
  const [audioIndex, setAudioIndex] = useState<number | undefined>()
  const [subtitleIndex, setSubtitleIndex] = useState<number | undefined>()
  const [quality, setQuality] = useState("auto")
  const [retryNonce, setRetryNonce] = useState(0)
  const { data: item } = useSWR(["playback-item", session.userId, itemId], () => getItem(session, itemId))
  const streams = useMemo(() => item?.MediaSources?.[0]?.MediaStreams ?? item?.MediaStreams ?? [], [item])
  const audioTracks = streams.filter((stream) => stream.Type === "Audio")
  const subtitleTracks = streams.filter((stream) => stream.Type === "Subtitle")
  const videoTracks = streams.filter((stream) => stream.Type === "Video")

  function revealControls() { setControls(true); if (hideTimer.current) window.clearTimeout(hideTimer.current); hideTimer.current = window.setTimeout(() => { if (playing) setControls(false) }, 3000) }
  function togglePlay() { const video = videoRef.current; if (!video) return; if (video.paused) void video.play(); else video.pause(); revealControls() }
  function seekBy(seconds: number) { const video = videoRef.current; if (!video) return; video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds)); revealControls() }
  function seek(value: number) { if (videoRef.current) videoRef.current.currentTime = value; revealControls() }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setReady(false); setError(null)
    video.crossOrigin = "anonymous"
    let hls: Hls | null = null
    const sourceId = item?.MediaSources?.[0]?.Id
    const src = streamUrl(session, itemId, { mediaSourceId: sourceId, audioStreamIndex: audioIndex, subtitleStreamIndex: subtitleIndex, maxVideoBitrate: quality === "auto" ? undefined : Number(quality) })
    const startSeconds = startPositionTicks ? startPositionTicks / 10_000_000 : 0
    const begin = () => { if (startSeconds > 0 && Number.isFinite(video.duration)) video.currentTime = startSeconds; if (preferences.autoplay) void video.play().catch(() => {}) }
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, backBufferLength: 90, maxBufferLength: 30 })
      hls.attachMedia(video)
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls?.loadSource(src))
      hls.on(Hls.Events.MANIFEST_PARSED, begin)
      hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) { hls?.destroy(); hls = null; setError("Impossible de démarrer le flux Jellyfin.") } })
    } else {
      video.src = video.canPlayType("application/vnd.apple.mpegurl") ? src : directStreamUrl(session, itemId)
      video.addEventListener("loadedmetadata", begin, { once: true })
    }
    const onReady = () => setReady(true)
    const onPlay = () => { setPlaying(true); revealControls() }
    const onPause = () => { setPlaying(false); setControls(true) }
    const onTime = () => { setProgress(video.currentTime); setDuration(video.duration || 0) }
    const onError = () => setError("Ce format n'est pas lisible par le navigateur ou le serveur.")
    video.addEventListener("canplay", onReady); video.addEventListener("playing", onPlay); video.addEventListener("pause", onPause); video.addEventListener("timeupdate", onTime); video.addEventListener("durationchange", onTime); video.addEventListener("error", onError)
    const interval = window.setInterval(() => { if (!video.paused && video.currentTime > 0) void reportProgress(session, itemId, video.currentTime * 10_000_000) }, 10000)
    return () => { window.clearInterval(interval); if (hideTimer.current) window.clearTimeout(hideTimer.current); ["canplay", "playing", "pause", "timeupdate", "durationchange", "error"].forEach((event) => video.removeEventListener(event, event === "canplay" ? onReady : event === "playing" ? onPlay : event === "pause" ? onPause : event === "timeupdate" || event === "durationchange" ? onTime : onError)); hls?.destroy() }
  }, [session, itemId, item, startPositionTicks, preferences.autoplay, audioIndex, subtitleIndex, quality, retryNonce])

  return <div ref={shellRef} onMouseMove={revealControls} onTouchStart={revealControls} className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-label={`Lecteur : ${title}`}>
    <div className={`absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/90 to-transparent px-4 pb-16 pt-4 sm:px-8 sm:pt-6 transition-opacity duration-300 ${controls ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <button type="button" onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-white/85 hover:text-white"><ChevronLeft className="size-6" /> <span className="hidden sm:inline">Retour</span></button>
      <div className="max-w-[60%] text-center"><h2 className="truncate font-semibold">{title}</h2>{subtitle ? <p className="truncate text-xs text-white/55">{subtitle}</p> : null}</div>
      <button type="button" onClick={() => setShowSettings((value) => !value)} className="text-white/70 hover:text-white" aria-label="Pistes et qualité"><Settings2 className="size-5" /></button>
    </div>
    <div className="relative flex min-h-0 flex-1 items-center justify-center" onDoubleClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void shellRef.current?.requestFullscreen() }}>
      <video ref={videoRef} playsInline className={`h-full w-full object-contain transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} onClick={togglePlay} />
      {!ready ? <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">{backdropUrl ? <img src={backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm" /> : null}<div className="absolute inset-0 bg-black/60" /><div className="relative px-6 text-center">{error ? <><p className="max-w-sm text-sm text-red-100">{error}</p><button type="button" onClick={() => setRetryNonce((value) => value + 1)} className="mt-5 rounded-md bg-[#e50914] px-5 py-2 text-sm font-semibold hover:bg-[#f6121d]">Réessayer</button></> : <><div className="mx-auto size-12 animate-spin rounded-full border-4 border-white/20 border-t-[#e50914]" /><p className="mt-5 font-medium">Préparation de la lecture</p></>}</div></div> : null}
      {ready && !playing && !error ? <button type="button" onClick={togglePlay} className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-2xl transition hover:scale-105" aria-label="Lire"><Play className="ml-1 size-7 fill-current" /></button> : null}
      {showSettings ? <SettingsPanel streams={streams} audioTracks={audioTracks} subtitleTracks={subtitleTracks} videoTracks={videoTracks} audioIndex={audioIndex} subtitleIndex={subtitleIndex} quality={quality} setAudioIndex={setAudioIndex} setSubtitleIndex={setSubtitleIndex} setQuality={setQuality} onClose={() => setShowSettings(false)} /> : null}
    </div>
    <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-4 pb-5 pt-20 sm:px-8 transition-opacity duration-300 ${controls && ready ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <input aria-label="Position dans la vidéo" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(progress, duration || 0)} onChange={(e) => seek(Number(e.target.value))} className="player-range w-full" style={{ "--range-progress": `${duration ? (progress / duration) * 100 : 0}%` } as React.CSSProperties} />
      <div className="mt-3 flex items-center gap-4"><button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Lire"}>{playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}</button><button type="button" onClick={() => seekBy(-10)} aria-label="Reculer de 10 secondes"><Rewind className="size-5" /></button><button type="button" onClick={() => seekBy(10)} aria-label="Avancer de 10 secondes"><FastForward className="size-5" /></button><button type="button" onClick={() => { const video = videoRef.current; if (video) { video.muted = !video.muted; setMuted(video.muted) } }} aria-label={muted ? "Activer le son" : "Couper le son"}>{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button><span className="text-xs text-white/60">{formatTime(progress)} / {formatTime(duration)}</span><span className="ml-auto" /><button type="button" onClick={() => setShowSettings(true)} className="hidden text-xs text-white/70 hover:text-white sm:block">{audioTracks.length + subtitleTracks.length ? "Pistes" : "Qualité"}</button><button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void shellRef.current?.requestFullscreen() }} aria-label="Plein écran"><Maximize className="size-5" /></button></div>
    </div>
  </div>
}

function SettingsPanel({ streams, audioTracks, subtitleTracks, videoTracks, audioIndex, subtitleIndex, quality, setAudioIndex, setSubtitleIndex, setQuality, onClose }: { streams: MediaStream[]; audioTracks: MediaStream[]; subtitleTracks: MediaStream[]; videoTracks: MediaStream[]; audioIndex?: number; subtitleIndex?: number; quality: string; setAudioIndex: (value: number | undefined) => void; setSubtitleIndex: (value: number | undefined) => void; setQuality: (value: string) => void; onClose: () => void }) {
  const qualities = Array.from(new Set(["auto", ...videoTracks.map((track) => track.Height).filter(Boolean).sort((a, b) => Number(b) - Number(a)).map((height) => String(Math.round(Number(height) * 1.5 * 1000)))]))
  return <aside className="absolute right-3 top-16 z-30 w-[min(90vw,340px)] rounded-2xl border border-white/10 bg-[#171717]/95 p-4 shadow-2xl backdrop-blur-xl sm:right-8 sm:top-20" aria-label="Paramètres de lecture"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Lecture</p><p className="text-xs text-white/45">Flux Jellyfin en temps réel</p></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="size-4" /></button></div><div className="mt-5 flex flex-col gap-4"><TrackSelect label="Audio" value={audioIndex} tracks={audioTracks} onChange={setAudioIndex} /><TrackSelect label="Sous-titres" value={subtitleIndex} tracks={subtitleTracks} allowOff onChange={setSubtitleIndex} /><label className="flex flex-col gap-2 text-xs text-white/60">Qualité<select value={quality} onChange={(event) => setQuality(event.target.value)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none"><option value="auto">Auto · recommandé</option>{qualities.filter((value) => value !== "auto").map((value) => <option key={value} value={value}>{Math.round(Number(value) / 1000)} Mbps</option>)}</select></label></div><p className="mt-4 text-[11px] leading-relaxed text-white/40">{streams.length} piste{streams.length > 1 ? "s" : ""} détectée{streams.length > 1 ? "s" : ""} par Jellyfin. Changer une piste relance le flux à la position actuelle.</p></aside>
}

function TrackSelect({ label, value, tracks, allowOff, onChange }: { label: string; value?: number; tracks: MediaStream[]; allowOff?: boolean; onChange: (value: number | undefined) => void }) { return <label className="flex flex-col gap-2 text-xs text-white/60">{label}<select value={value ?? (allowOff ? "off" : "")} onChange={(event) => onChange(event.target.value === "off" || event.target.value === "" ? undefined : Number(event.target.value))} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none">{allowOff ? <option value="off">Désactivés</option> : null}{!allowOff && !tracks.length ? <option value="">Par défaut</option> : null}{tracks.map((track) => <option key={track.Index} value={track.Index}>{track.DisplayTitle ?? track.Title ?? track.Language ?? `${label} ${track.Index + 1}`}{track.IsDefault ? " · défaut" : ""}{track.IsForced ? " · forcé" : ""}</option>)}</select></label> }

function formatTime(seconds: number) { if (!Number.isFinite(seconds)) return "00:00"; const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = Math.floor(seconds % 60); return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` }
