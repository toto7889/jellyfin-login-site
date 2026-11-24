"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BatteryWarning, Captions, ChevronLeft, Heart, Home, Languages, Maximize, Pause, Play, Search, Settings2, Tv, Volume2, VolumeX, WifiOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Hls from "hls.js"
import { closeLiveTvStream, directStreamUrl, getLiveTvStreamUrl, getPlaybackStreams, getTrickplayManifest, reportProgress, streamUrl, type JellyfinMediaStream, type JellyfinSession, type JellyfinTrickplayInfo } from "@/lib/jellyfin"
import { useJellyfin } from "@/components/jellyfin-provider"

type Props = { session: JellyfinSession; itemId: string; title: string; subtitle?: string; language?: string; backdropUrl?: string | null; startPositionTicks?: number; isLive?: boolean; previewMode?: boolean; previewDurationSeconds?: number; onClose: () => void }

export function VideoPlayer({ session, itemId, title, subtitle, language, backdropUrl, startPositionTicks, isLive = false, previewMode = false, previewDurationSeconds, onClose }: Props) {
  const { preferences, currentIp, blockIp, serverHealth } = useJellyfin()
  const router = useRouter()
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
  const [previewActive, setPreviewActive] = useState(previewMode)
  const [previewLimitReached, setPreviewLimitReached] = useState(false)
  const previewActiveRef = useRef(previewMode)
  const previewLimitReachedRef = useRef(false)
  const onCloseRef = useRef(onClose)
  previewActiveRef.current = previewActive
  onCloseRef.current = onClose
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [showPages, setShowPages] = useState(false)
  const [tvMode, setTvMode] = useState(false)
  const [mediaStreams, setMediaStreams] = useState<JellyfinMediaStream[]>([])
  const [audioIndex, setAudioIndex] = useState<number | undefined>()
  const [subtitleIndex, setSubtitleIndex] = useState<number | null>(null)
  const [quality, setQuality] = useState("auto")
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null)
  const [batteryCharging, setBatteryCharging] = useState<boolean | null>(null)
  const [showBatteryWarning, setShowBatteryWarning] = useState(false)
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)
  const [exitDestination, setExitDestination] = useState("/")
  const [trickplayInfo, setTrickplayInfo] = useState<JellyfinTrickplayInfo | null>(null)
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null)
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const [networkDecision, setNetworkDecision] = useState<"checking" | "warning" | "ready" | "continue">("checking")
  const [networkProfile, setNetworkProfile] = useState(() => {
    if (typeof navigator === "undefined") return { online: true, effectiveType: "", downlink: null as number | null, saveData: false }
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; saveData?: boolean } }).connection
    return { online: navigator.onLine, effectiveType: connection?.effectiveType ?? "", downlink: connection?.downlink ?? null, saveData: connection?.saveData ?? false }
  })
  const restartPosition = useRef<number | null>(null)
  const restartWasPlaying = useRef(false)
  const batteryGate = useRef({ blocked: false, charging: false, percent: 100 })
  const resumeAfterBattery = useRef(false)
  const batteryRequires25 = useRef(false)
  const seekFeedbackTimer = useRef<number | null>(null)
  const log = (message: string) => setLogs((items) => [...items.slice(-7), `${new Date().toLocaleTimeString()} · ${message}`])

  useEffect(() => setPortalReady(true), [])

  useEffect(() => {
    type NetworkInformation = EventTarget & { effectiveType?: string; downlink?: number; saveData?: boolean }
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
    const updateNetworkProfile = () => setNetworkProfile({
      online: navigator.onLine,
      effectiveType: connection?.effectiveType ?? "",
      downlink: connection?.downlink ?? null,
      saveData: connection?.saveData ?? false,
    })
    updateNetworkProfile()
    connection?.addEventListener("change", updateNetworkProfile)
    window.addEventListener("online", updateNetworkProfile)
    window.addEventListener("offline", updateNetworkProfile)
    return () => {
      connection?.removeEventListener("change", updateNetworkProfile)
      window.removeEventListener("online", updateNetworkProfile)
      window.removeEventListener("offline", updateNetworkProfile)
    }
  }, [])

  useEffect(() => {
    if (networkDecision !== "checking") return
    if (previewMode) {
      setNetworkDecision("ready")
      return
    }
    if (!serverHealth) return
    const slowConnection = !networkProfile.online
      || ["slow-2g", "2g"].includes(networkProfile.effectiveType)
      || (networkProfile.downlink != null && networkProfile.downlink < 2.5)
      || networkProfile.saveData
    const slowServer = !serverHealth.online || (serverHealth.latencyMs ?? 0) > 700
    setNetworkDecision(slowConnection || slowServer ? "warning" : "ready")
  }, [networkDecision, networkProfile, previewMode, serverHealth])

  function revealControls() { setControls(true); if (hideTimer.current) window.clearTimeout(hideTimer.current); hideTimer.current = window.setTimeout(() => { if (playing) setControls(false) }, 2800) }
  function requestExit(destination = "/") { setExitDestination(destination); setShowExitConfirmation(true); revealControls() }
  function confirmExit() { setShowExitConfirmation(false); router.push(exitDestination); onClose() }
  function togglePlay() { const video = videoRef.current; if (!video) return; if (video.paused) { if (batteryGate.current.blocked) { setShowBatteryWarning(true); return } void video.play() } else video.pause(); revealControls() }
  function seek(value: number) { const video = videoRef.current; if (!video) return; const next = Math.max(0, Math.min(value, video.duration || value)); if (Math.abs(next - video.currentTime) >= 5) { setSeekFeedback(next > video.currentTime ? "+10 s" : "−10 s"); if (seekFeedbackTimer.current) window.clearTimeout(seekFeedbackTimer.current); seekFeedbackTimer.current = window.setTimeout(() => setSeekFeedback(null), 650) } video.currentTime = next; setProgress(next); revealControls() }
  function continueAfterPreview() {
    const video = videoRef.current
    previewActiveRef.current = false
    previewLimitReachedRef.current = false
    setPreviewActive(false)
    setPreviewLimitReached(false)
    if (video) void video.play().catch(() => log("Lecture automatique bloquée par le navigateur"))
  }

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (videoRef.current && !videoRef.current.paused) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  useEffect(() => {
    const channel = typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel("jflx-player-control") : null
    if (!channel) return
    channel.onmessage = (event) => {
      const video = videoRef.current
      if (!video) return
      if (event.data?.type === "play") { if (batteryGate.current.blocked) setShowBatteryWarning(true); else void video.play() }
      if (event.data?.type === "pause") video.pause()
      if (event.data?.type === "stop") { setExitDestination("/"); setShowExitConfirmation(true) }
      if (event.data?.type === "seek") video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + event.data.seconds))
    }
    return () => channel.close()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current
      if (!video || event.defaultPrevented || event.target instanceof HTMLInputElement) return
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(event.key)) event.preventDefault()
      if (event.key === "ArrowLeft") seek(video.currentTime - 10)
      if (event.key === "ArrowRight") seek(video.currentTime + 10)
      if (event.key === "ArrowUp") { video.volume = Math.min(1, video.volume + 0.1); setMuted(false) }
      if (event.key === "ArrowDown") { video.volume = Math.max(0, video.volume - 0.1); setMuted(video.volume === 0) }
      if (event.key === " " || event.key === "Enter") togglePlay()
      if (event.key === "Escape") { setExitDestination("/"); setShowExitConfirmation(true) }
      revealControls()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!tvMode) return
    let frame = 0
    let previous = 0
    let previousButtons: boolean[] = []
    const poll = () => {
      const pad = navigator.getGamepads?.().find(Boolean)
      if (pad) {
        const now = performance.now()
        const pressed = pad.buttons.map((button) => button.pressed)
        const justPressed = (index: number) => pressed[index] && !previousButtons[index]
        if (now - previous > 250) {
          if (justPressed(0)) togglePlay()
          else if (justPressed(1)) { setExitDestination("/"); setShowExitConfirmation(true) }
          else if (justPressed(4) || (pad.axes[0] ?? 0) < -0.6) seek((videoRef.current?.currentTime ?? 0) - 10)
          else if (justPressed(5) || (pad.axes[0] ?? 0) > 0.6) seek((videoRef.current?.currentTime ?? 0) + 10)
          if (pressed.some(Boolean) || Math.abs(pad.axes[0] ?? 0) > 0.6) previous = now
        }
        previousButtons = pressed
      }
      frame = requestAnimationFrame(poll)
    }
    frame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(frame)
  }, [tvMode, onClose])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const idleTimer = window.setInterval(() => {
      if (video.paused && !batteryGate.current.blocked && !document.hidden) setIdleSeconds((value) => {
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
    const batteryApi = navigator as Navigator & { getBattery?: () => Promise<BatteryStatus> }
    if (!batteryApi.getBattery) return
    let battery: BatteryStatus | null = null
    const update = () => {
      if (!battery) return
      const percent = Math.round(battery.level * 100)
      if (percent <= 10) batteryRequires25.current = true
      if (percent >= 25) batteryRequires25.current = false
      const locked = percent <= 10 || (battery.charging && percent < 25) || (batteryRequires25.current && percent < 25)
      const wasLocked = batteryGate.current.blocked
      setBatteryPercent(percent)
      setBatteryCharging(battery.charging)
      batteryGate.current = { blocked: locked, charging: battery.charging, percent }
      setShowBatteryWarning(locked)
      if (locked !== wasLocked) setIdleSeconds(0)
      if (locked && !wasLocked) {
        resumeAfterBattery.current = Boolean(videoRef.current && !videoRef.current.paused)
        videoRef.current?.pause()
      } else if (!locked && wasLocked && resumeAfterBattery.current) {
        resumeAfterBattery.current = false
        void videoRef.current?.play()
      }
    }
    void batteryApi.getBattery().then((result) => {
      battery = result
      update()
      result.addEventListener("levelchange", update)
      result.addEventListener("chargingchange", update)
    }).catch(() => undefined)
    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", update)
        battery.removeEventListener("chargingchange", update)
      }
    }
  }, [])

  useEffect(() => {
    if (previewMode) return
    let cancelled = false
    void getTrickplayManifest(session, itemId).then((manifest) => {
      if (!cancelled) setTrickplayInfo(manifest)
    }).catch(() => setTrickplayInfo(null))
    return () => { cancelled = true }
  }, [session, itemId, previewMode])

  useEffect(() => {
    if (!("mediaSession" in navigator)) return
    const mediaSession = navigator.mediaSession
    if ("MediaMetadata" in window) {
      mediaSession.metadata = new MediaMetadata({ title, artist: subtitle || "Jellyfin", album: "JFLX" })
    }
    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { mediaSession.setActionHandler(action, handler) } catch { /* Browser does not support this action. */ }
    }
    setHandler("play", () => { if (batteryGate.current.blocked) setShowBatteryWarning(true); else void videoRef.current?.play() })
    setHandler("pause", () => videoRef.current?.pause())
    setHandler("seekbackward", (details) => { const video = videoRef.current; if (video) seek(video.currentTime - (details.seekOffset ?? 10)) })
    setHandler("seekforward", (details) => { const video = videoRef.current; if (video) seek(video.currentTime + (details.seekOffset ?? 10)) })
    setHandler("seekto", (details) => { if (details.seekTime != null) seek(details.seekTime) })
    const updatePosition = () => {
      const video = videoRef.current
      if (!video || !Number.isFinite(video.duration) || !Number.isFinite(video.currentTime) || !mediaSession.setPositionState) return
      try { mediaSession.setPositionState({ duration: video.duration, playbackRate: video.playbackRate, position: video.currentTime }) } catch { /* Position state is not available in every browser. */ }
    }
    const video = videoRef.current
    video?.addEventListener("timeupdate", updatePosition)
    video?.addEventListener("durationchange", updatePosition)
    return () => {
      video?.removeEventListener("timeupdate", updatePosition)
      video?.removeEventListener("durationchange", updatePosition)
      for (const action of ["play", "pause", "seekbackward", "seekforward", "seekto"] as MediaSessionAction[]) setHandler(action, null)
      mediaSession.metadata = null
    }
  }, [title, subtitle])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !portalReady || networkDecision === "checking" || networkDecision === "warning") return
    setReady(false); setError(null); setRetrying(false); setLogs([])
    video.crossOrigin = "anonymous"
    const startSeconds = startPositionTicks ? startPositionTicks / 10_000_000 : 0
    log(isLive ? "Ouverture de la session TV Jellyfin" : "Initialisation du flux direct Jellyfin")
    log("Chargement des pistes audio et sous-titres")
    const begin = () => { const resumeAt = restartPosition.current ?? startSeconds; if (resumeAt > 0 && Number.isFinite(video.duration)) video.currentTime = resumeAt; restartPosition.current = null; log("Métadonnées reçues, lecteur prêt"); if (batteryGate.current.blocked) setShowBatteryWarning(true); else if (previewActiveRef.current || preferences.autoplay || restartWasPlaying.current) void video.play().catch(() => log("Lecture automatique bloquée par le navigateur")); restartWasPlaying.current = false }
    video.addEventListener("loadedmetadata", begin, { once: true })
    let cancelled = false
    let liveStreamUrl: string | null = null
    let hlsInstance: Hls | null = null
    let compatibilityFallbackStarted = false
    const startCompatibilityFallback = async () => {
      if (isLive || compatibilityFallbackStarted || cancelled) return
      compatibilityFallbackStarted = true
      setError(null)
      log("Format non pris en charge en direct, conversion Jellyfin en cours")
      video.pause()
      video.removeAttribute("src")
      video.load()
      const transcodedUrl = streamUrl(session, itemId)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = transcodedUrl
        video.load()
        return
      }
      if (!Hls.isSupported()) {
        setError("Le navigateur ne lit pas ce format et ne prend pas HLS en charge.")
        return
      }
      hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 20, backBufferLength: 30 })
      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError("Jellyfin n’a pas pu convertir ce fichier AVI/MKV/MP4 en flux compatible.")
      })
      hlsInstance.loadSource(transcodedUrl)
      hlsInstance.attachMedia(video)
    }
    const fallbackTimer = window.setTimeout(() => {
      if (!video.readyState && !ready && !isLive) {
        log("Démarrage lent, activation du flux compatible")
        void startCompatibilityFallback()
      } else if (!video.readyState && !ready) {
        setError("Le flux direct Jellyfin ne répond pas. Vérifiez la connexion et les permissions du serveur.")
      }
    }, 7000)
    const onReady = () => { log("Flux prêt à être lu"); setReady(true) }
    const onPlay = () => { if (batteryGate.current.blocked) { video.pause(); setShowBatteryWarning(true); return } setPlaying(true); setIdleSeconds(0); setSecurityNotice(false); if (!previewActiveRef.current) { const params = new URLSearchParams({ status: "encours", lang: language || "auto", percentage: duration ? String(Math.round((video.currentTime / duration) * 100)) : "0" }); window.history.replaceState(null, "", `/lecteur/item/${itemId}/play?${params.toString()}`) } revealControls() }
    const onPause = () => { setPlaying(false); setControls(true); if (!previewActiveRef.current && !batteryGate.current.blocked) setSecurityNotice(true) }
    const onTime = () => {
      setProgress(video.currentTime)
      setDuration(video.duration || 0)
      if (previewActiveRef.current && previewDurationSeconds != null && video.currentTime >= previewDurationSeconds && !previewLimitReachedRef.current) {
        previewLimitReachedRef.current = true
        video.pause()
        setPreviewLimitReached(true)
        return
      }
      if (!previewActiveRef.current && video.duration && !video.paused) {
        const params = new URLSearchParams({ status: "encours", lang: language || "auto", percentage: String(Math.round((video.currentTime / video.duration) * 100)) })
        window.history.replaceState(null, "", `/lecteur/item/${itemId}/play?${params.toString()}`)
      }
    }
    const onError = () => {
      if (!isLive && !compatibilityFallbackStarted) void startCompatibilityFallback()
      else setError("Le format n’est pas lisible par le navigateur ou le serveur Jellyfin.")
    }
    video.addEventListener("canplay", onReady); video.addEventListener("playing", onPlay); video.addEventListener("pause", onPause); video.addEventListener("timeupdate", onTime); video.addEventListener("durationchange", onTime); video.addEventListener("error", onError)
    void (async () => {
      try {
        if (!isLive) {
          setMediaStreams([])
          const selectedQuality = quality === "480p" ? { maxStreamingBitrate: 1800000, maxWidth: 854, maxHeight: 480 } : quality === "720p" ? { maxStreamingBitrate: 5000000, maxWidth: 1280, maxHeight: 720 } : quality === "1080p" ? { maxStreamingBitrate: 10000000, maxWidth: 1920, maxHeight: 1080 } : {}
          video.preload = "auto"
          video.src = directStreamUrl(session, itemId, { ...selectedQuality, audioStreamIndex: audioIndex, subtitleStreamIndex: subtitleIndex })
          video.load()
          void getPlaybackStreams(session, itemId).then((tracks) => {
            if (!cancelled) setMediaStreams(tracks)
          }).catch(() => undefined)
          return
        }
        const streamUrl = await getLiveTvStreamUrl(session, itemId)
        if (cancelled) {
          if (isLive) await closeLiveTvStream(session, streamUrl).catch(() => undefined)
          return
        }
        liveStreamUrl = streamUrl
        video.preload = "auto"
        if (/\.m3u8(?:$|[?#])/i.test(streamUrl)) {
          log("Playlist HLS détectée pour la télévision en direct")
          if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = streamUrl
            video.load()
          } else if (Hls.isSupported()) {
            hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 12, backBufferLength: 20 })
            hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                setReady(false)
                setError("La playlist HLS n’a pas pu être lue. Vérifiez le flux et les codecs côté Jellyfin.")
              }
            })
            hlsInstance.loadSource(streamUrl)
            hlsInstance.attachMedia(video)
          } else {
            setError("Ce navigateur ne prend pas en charge la lecture HLS.")
          }
        } else {
          video.src = streamUrl
          video.load()
        }
      } catch (streamError) {
        setError(streamError instanceof Error ? streamError.message : "Impossible d’ouvrir ce flux Jellyfin.")
      }
    })()
    const interval = window.setInterval(() => { if (!previewActiveRef.current && !video.paused && video.currentTime > 0) void reportProgress(session, itemId, video.currentTime * 10_000_000) }, 10000)
    return () => { cancelled = true; hlsInstance?.destroy(); if (isLive && liveStreamUrl) void closeLiveTvStream(session, liveStreamUrl).catch(() => undefined); window.clearInterval(interval); window.clearTimeout(fallbackTimer); if (hideTimer.current) window.clearTimeout(hideTimer.current); if (seekFeedbackTimer.current) window.clearTimeout(seekFeedbackTimer.current); ["canplay", "playing", "pause", "timeupdate", "durationchange", "error"].forEach((event) => video.removeEventListener(event, event === "canplay" ? onReady : event === "playing" ? onPlay : event === "pause" ? onPause : event === "timeupdate" || event === "durationchange" ? onTime : onError)); video.removeAttribute("src"); video.load() }
  }, [session, itemId, startPositionTicks, preferences.autoplay, retryNonce, isLive, audioIndex, subtitleIndex, quality, portalReady, networkDecision])

  const hoverThumbnailIndex = trickplayInfo && hoverSeekTime != null
    ? Math.min(trickplayInfo.ThumbnailCount - 1, Math.floor((hoverSeekTime * 1000) / trickplayInfo.Interval))
    : null
  const trickplayCapacity = trickplayInfo ? trickplayInfo.TileWidth * trickplayInfo.TileHeight : 0
  const trickplayTileIndex = hoverThumbnailIndex != null && trickplayCapacity ? Math.floor(hoverThumbnailIndex / trickplayCapacity) : 0
  const trickplayLocalIndex = hoverThumbnailIndex != null && trickplayCapacity ? hoverThumbnailIndex % trickplayCapacity : 0
  const trickplayScale = trickplayInfo ? 224 / trickplayInfo.Width : 1
  const trickplayUrl = trickplayInfo
    ? `${session.serverUrl}/Videos/${encodeURIComponent(itemId)}/Trickplay/${trickplayInfo.Width}/${trickplayTileIndex}.jpg?api_key=${encodeURIComponent(session.accessToken)}`
    : ""
  const batteryNotice = batteryPercent != null && batteryPercent < 25 && (batteryCharging || batteryRequires25.current)
    ? "Veuillez attendre que la batterie atteigne 25 % avant de relancer la lecture. Le lecteur reprendra automatiquement si le film était déjà en cours."
    : "La lecture est bloquée à 10 % ou moins. Branchez votre appareil et attendez 25 % pour reprendre."

  if (!portalReady) return null
  return createPortal(
    <div ref={shellRef} onMouseMove={revealControls} onTouchStart={revealControls} className={`fixed inset-0 z-50 flex flex-col bg-black text-white ${tvMode ? "cursor-none" : ""} animate-in fade-in zoom-in-95 duration-500`} role="dialog" aria-label={`Lecteur : ${title}`}>
    <div className={`absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/85 to-transparent px-5 pb-14 pt-5 transition-opacity duration-300 ${controls ? "opacity-100" : "pointer-events-none opacity-0"}`}><button type="button" onClick={() => requestExit("/")} className="flex items-center gap-2 text-sm font-medium text-white/85 hover:text-white"><ChevronLeft className="size-6" /> Retour au catalogue</button><div className="text-center"><h2 className="font-semibold">{title}</h2>{subtitle ? <p className="text-xs text-white/55">{subtitle}</p> : null}{language ? <p className="text-xs text-cyan-200/80">Langue : {language}</p> : null}</div><div className="flex items-center gap-3"><button type="button" onClick={() => { setTvMode((value) => !value); if (!tvMode) void shellRef.current?.requestFullscreen() }} aria-pressed={tvMode} className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10">{tvMode ? "Mode TV activé" : "Mode TV"}</button><button type="button" onClick={() => setShowPages((value) => !value)} aria-expanded={showPages} aria-label="Ouvrir la navigation des pages" className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10">Pages</button><button type="button" onClick={() => setShowLogs((value) => !value)} className="flex items-center gap-2 text-xs text-white/70 hover:text-white" aria-label="Afficher les logs"><Settings2 className="size-5" /> Logs</button></div></div>
    {showPages ? <nav aria-label="Navigation principale" className="absolute right-5 top-20 z-40 grid w-56 gap-1 rounded-2xl border border-white/15 bg-[#111]/95 p-2 shadow-2xl backdrop-blur-xl">{[{ href: "/", label: "Accueil", icon: <Home className="size-4" /> }, { href: "/tv", label: "Hub TV", icon: <Tv className="size-4" /> }, { href: "/guide-tv", label: "Guide TV", icon: <Tv className="size-4" /> }, { href: "/search", label: "Recherche", icon: <Search className="size-4" /> }, { href: "/favorites", label: "Favoris", icon: <Heart className="size-4" /> }, { href: "/settings", label: "Paramètres", icon: <Settings2 className="size-4" /> }, { href: "/genres", label: "Genres", icon: <Play className="size-4" /> }, { href: "/cast", label: "Distribution", icon: <Play className="size-4" /> }, { href: "/verification", label: "Vérification", icon: <Settings2 className="size-4" /> }, { href: "/securite", label: "Sécurité", icon: <Settings2 className="size-4" /> }, { href: "/releases", label: "Nouveautés", icon: <Play className="size-4" /> }, { href: "/ip", label: "Mon IP", icon: <Settings2 className="size-4" /> }, { href: "/admin/ip", label: "Administration", icon: <Settings2 className="size-4" /> }].map((page) => <Link key={page.href} href={page.href} onClick={(event) => { event.preventDefault(); requestExit(page.href) }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">{page.icon}{page.label}</Link>)}</nav> : null}
    <div className="relative flex min-h-0 flex-1 items-center justify-center" onDoubleClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void shellRef.current?.requestFullscreen() }}>
      <video ref={videoRef} playsInline className={`h-full w-full object-contain transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} onClick={togglePlay} />
      {previewLimitReached ? <div role="status" className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-2xl border border-white/15 bg-black/75 p-5 text-center shadow-2xl backdrop-blur-xl"><p className="text-sm text-white/75">L’aperçu est terminé. Le flux est toujours chargé.</p><button type="button" onClick={continueAfterPreview} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:scale-[1.02]"><Play className="size-4 fill-current" />Continuer sans recharger</button></div> : null}
      {showLogs ? <aside className="absolute right-5 top-20 z-40 w-[min(420px,calc(100%-2.5rem))] rounded-2xl border border-white/15 bg-black/80 p-4 font-mono text-[11px] text-white/75 shadow-2xl backdrop-blur-xl"><div className="mb-3 flex items-center justify-between font-sans text-sm text-white"><span>Diagnostic de lecture</span><button type="button" onClick={() => setShowLogs(false)} aria-label="Fermer les logs">Fermer</button></div><div className="max-h-44 overflow-auto">{logs.length ? logs.map((entry, index) => <p key={`${entry}-${index}`} className="border-b border-white/5 py-1">{entry}</p>) : <p>Aucun événement.</p>}</div></aside> : null}
      {securityNotice && !playing ? <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-amber-200/20 bg-black/70 px-5 py-3 text-center text-sm text-amber-100 backdrop-blur-xl">Lecture en pause. Redirection dans <strong>{Math.max(0, idleLimit - idleSeconds)} s</strong> si aucun film n&apos;est lancé.</div> : null}
      {!ready ? <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">{backdropUrl ? <img src={backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm" /> : null}<div className="absolute inset-0 bg-black/50" /> <div className="relative text-center">{error ? <><p className="max-w-sm text-sm text-red-100">{error}</p><button type="button" onClick={() => { setRetrying(true); setRetryNonce((value) => value + 1) }} className="mt-5 rounded-md bg-[#e50914] px-5 py-2 text-sm font-semibold transition hover:bg-[#f6121d] disabled:opacity-60" disabled={retrying}>{retrying ? "Nouvel essai…" : "Réessayer"}</button><p className="mt-3 max-w-sm text-xs text-white/45">Jellyfin transcode automatiquement les formats AVI, MKV et MP4 compatibles serveur.</p></> : <><div className="mx-auto size-12 animate-spin rounded-full border-4 border-white/20 border-t-[#e50914]" /><p className="mt-5 font-medium">Préparation de la lecture</p><p className="mt-1 text-xs uppercase tracking-[.25em] text-white/45">{title}</p></>}</div></div> : null}
      {ready && !playing && !error ? <button type="button" onClick={togglePlay} className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-2xl transition hover:scale-105" aria-label="Lire"><Play className="ml-1 size-7 fill-current" /></button> : null}
    </div>
    <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-5 pb-5 pt-16 transition-opacity duration-300 ${controls && ready ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="relative">
        <input aria-label="Position dans la vidéo" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(progress, duration || 0)} onChange={(e) => seek(Number(e.target.value))} onPointerMove={(event) => { if (!trickplayInfo || !duration) return; const rect = event.currentTarget.getBoundingClientRect(); const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); setHoverSeekTime(fraction * duration) }} onPointerLeave={() => setHoverSeekTime(null)} className="player-range w-full" />
        {hoverSeekTime != null && hoverThumbnailIndex != null && trickplayInfo ? <div aria-hidden="true" className="pointer-events-none absolute bottom-8 -translate-x-1/2 overflow-hidden rounded-lg border border-white/20 bg-black shadow-xl" style={{ left: `${Math.max(8, Math.min(92, (hoverSeekTime / duration) * 100))}%`, width: 224 }}><div className="w-full bg-cover bg-no-repeat" style={{ aspectRatio: `${trickplayInfo.Width} / ${trickplayInfo.Height}`, backgroundImage: `url("${trickplayUrl}")`, backgroundSize: `${trickplayInfo.Width * trickplayInfo.TileWidth * trickplayScale}px ${trickplayInfo.Height * trickplayInfo.TileHeight * trickplayScale}px`, backgroundPosition: `-${(trickplayLocalIndex % trickplayInfo.TileWidth) * trickplayInfo.Width * trickplayScale}px -${Math.floor(trickplayLocalIndex / trickplayInfo.TileWidth) * trickplayInfo.Height * trickplayScale}px` }} /><p className="px-2 py-1 text-center text-[11px] text-white">{formatTime(hoverSeekTime)}</p></div> : null}
      </div>
      {seekFeedback ? <div aria-live="polite" className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-90 rounded-full bg-black/65 px-5 py-3 text-lg font-semibold text-white">{seekFeedback}</div> : null}
      {!isLive ? <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-xs text-white/65"><Languages className="size-4" /><span className="sr-only">Langue audio</span><select aria-label="Langue audio" value={audioIndex ?? ""} onChange={(event) => { restartPosition.current = videoRef.current?.currentTime ?? progress; restartWasPlaying.current = !videoRef.current?.paused; setAudioIndex(Number(event.target.value)) }} className="max-w-36 bg-transparent text-white outline-none [&>option]:bg-[#171717]"><option value="">Par défaut</option>{mediaStreams.filter((track) => track.Type === "Audio").map((track) => <option key={track.Index} value={track.Index}>{track.DisplayTitle || track.Language || `Piste ${track.Index + 1}`}</option>)}</select></label>
        <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-xs text-white/65"><Captions className="size-4" /><span className="sr-only">Sous-titres</span><select aria-label="Sous-titres" value={subtitleIndex ?? "off"} onChange={(event) => { restartPosition.current = videoRef.current?.currentTime ?? progress; restartWasPlaying.current = !videoRef.current?.paused; setSubtitleIndex(event.target.value === "off" ? null : Number(event.target.value)) }} className="max-w-36 bg-transparent text-white outline-none [&>option]:bg-[#171717]"><option value="off">Sous-titres désactivés</option>{mediaStreams.filter((track) => track.Type === "Subtitle").map((track) => <option key={track.Index} value={track.Index}>{track.DisplayTitle || track.Language || `Piste ${track.Index + 1}`}</option>)}</select></label>
        <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-xs text-white/65"><span>Qualité</span><select aria-label="Qualité vidéo" value={quality} onChange={(event) => { restartPosition.current = videoRef.current?.currentTime ?? progress; restartWasPlaying.current = !videoRef.current?.paused; setQuality(event.target.value) }} className="bg-transparent text-white outline-none [&>option]:bg-[#171717]"><option value="auto">Automatique</option><option value="1080p">1080p</option><option value="720p">720p</option><option value="480p">480p</option></select></label>
        {batteryPercent != null ? <span className={`ml-auto flex items-center gap-1 text-xs ${batteryPercent <= 20 ? "text-amber-300" : "text-white/45"}`}><BatteryWarning className="size-4" />{batteryPercent}%</span> : null}
      </div> : null}
      <div className="mt-3 flex items-center gap-4"><button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Lire"} className="hover:text-[#e50914]">{playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}</button><button type="button" onClick={() => seek(progress - 10)} aria-label="Reculer de 10 secondes" className="rounded px-1 text-xs font-medium text-white/80 hover:text-white">−10 s</button><button type="button" onClick={() => seek(progress + 10)} aria-label="Avancer de 10 secondes" className="rounded px-1 text-xs font-medium text-white/80 hover:text-white">+10 s</button><button type="button" onClick={() => { const video = videoRef.current; if (video) { video.muted = !video.muted; setMuted(video.muted) } }} aria-label={muted ? "Activer le son" : "Couper le son"}>{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button><span className="text-xs text-white/60">{formatTime(progress)} / {formatTime(duration)}</span><span className="ml-auto" /><button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void shellRef.current?.requestFullscreen() }} aria-label="Plein écran"><Maximize className="size-5" /></button></div>
    </div>
    {networkDecision === "warning" ? <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="network-warning-title" aria-describedby="network-warning-description" className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#141414] p-6 shadow-2xl sm:p-8"><div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200"><WifiOff className="size-6" /></div><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-200">Qualité réseau insuffisante</p><h2 id="network-warning-title" className="mt-2 text-xl font-semibold text-white sm:text-2xl">Votre connexion n&apos;est pas assez bonne</h2><p id="network-warning-description" className="mt-3 text-sm leading-relaxed text-white/65">Votre connexion ne semble pas suffisante pour regarder un film ou la TV en streaming avec une bonne qualité. Vous pouvez tout de même continuer, quitter ou réduire la qualité vidéo.</p><div className="mt-5 flex flex-wrap gap-2 text-xs text-white/55"><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5">Ping serveur : {serverHealth?.online ? `${serverHealth.latencyMs ?? "—"} ms` : "injoignable"}</span>{networkProfile.effectiveType ? <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5">Réseau : {networkProfile.effectiveType.toUpperCase()}</span> : null}{networkProfile.downlink != null ? <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5">Débit estimé : {networkProfile.downlink} Mb/s</span> : null}</div><div className="mt-7 grid gap-3"><button type="button" onClick={() => setNetworkDecision("continue")} className="rounded-xl bg-[#e50914] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f6121d]">Continuer quand même</button><button type="button" onClick={() => requestExit("/")} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Quitter</button><button type="button" onClick={() => { setQuality("480p"); setNetworkDecision("continue") }} className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Lire avec une qualité inférieure · 480p</button></div></section></div> : null}
    {showBatteryWarning && networkDecision !== "warning" ? <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="battery-warning-title" aria-describedby="battery-warning-description" className="w-full max-w-md rounded-3xl border border-amber-200/20 bg-[#151515] p-6 shadow-2xl sm:p-8"><div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300"><BatteryWarning className="size-6" /></div><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-300">MODE DANGER · {batteryPercent}%</p><h2 id="battery-warning-title" className="mt-2 text-xl font-semibold">Lecture suspendue pour préserver la batterie</h2><p id="battery-warning-description" className="mt-2 text-sm leading-relaxed text-white/60">{batteryNotice}</p><div className="mt-6"><button type="button" onClick={() => requestExit("/")} className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Arrêter la lecture et retourner au catalogue</button></div></section></div> : null}
    {showExitConfirmation ? <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="exit-confirmation-title" aria-describedby="exit-confirmation-description" className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-6 shadow-2xl sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-white/45">Confirmer la sortie</p><h2 id="exit-confirmation-title" className="mt-2 text-xl font-semibold text-white">Arrêter la lecture ?</h2><p id="exit-confirmation-description" className="mt-3 text-sm leading-relaxed text-white/65">Souhaitez-vous quitter le lecteur et revenir au catalogue ? Votre progression est enregistrée.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" autoFocus onClick={() => setShowExitConfirmation(false)} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Continuer le film</button><button type="button" onClick={confirmExit} className="rounded-xl bg-[#e50914] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f6121d]">Arrêter et quitter</button></div></section></div> : null}
  </div>,
    document.body,
  )
}
type BatteryStatus = EventTarget & { level: number; charging: boolean }

function formatTime(seconds: number) { if (!Number.isFinite(seconds)) return "00:00"; const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = Math.floor(seconds % 60); return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` }
