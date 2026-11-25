"use client"

import { useState } from "react"
import useSWR from "swr"
import { Disc3, Headphones, Loader2, Music2, Pause, Play, Radio, SkipBack, SkipForward, Sparkles, Video } from "lucide-react"
import Link from "next/link"
import { useJellyfin } from "@/components/jellyfin-provider"
import { audioStreamUrl, getItems, primaryImage, type BaseItem, type JellyfinSession } from "@/lib/jellyfin"

export function MusicHubView() {
  const { session } = useJellyfin()
  if (!session) return null
  return <MusicHubContent session={session} />
}

function MusicHubContent({ session }: { session: JellyfinSession }) {
  const { data, error, isLoading } = useSWR(["music-library", session.userId], async () => {
    const [tracks, albums] = await Promise.all([
      getItems(session, { includeItemTypes: "Audio", limit: 100, sortBy: "DateCreated", sortOrder: "Descending" }),
      getItems(session, { includeItemTypes: "MusicAlbum", limit: 16, sortBy: "DateCreated", sortOrder: "Descending" }),
    ])
    return { tracks, albums }
  }, { dedupingInterval: 60_000, revalidateOnFocus: false, keepPreviousData: true })
  const [current, setCurrent] = useState<BaseItem | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  function playTrack(track: BaseItem) {
    if (current?.Id === track.Id && audio) {
      if (audio.paused) void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      else { audio.pause(); setPlaying(false) }
      return
    }
    setCurrent(track)
    if (audio) {
      audio.src = audioStreamUrl(session, track.Id)
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  const currentIndex = data?.tracks.findIndex((track) => track.Id === current?.Id) ?? -1
  function playNext(direction: -1 | 1) {
    if (!data?.tracks.length) return
    const next = (currentIndex + direction + data.tracks.length) % data.tracks.length
    playTrack(data.tracks[next])
  }

  return <main className="music-stage min-h-[calc(100dvh-68px)] bg-[#08090d] pb-36 text-white">
    <audio ref={setAudio} preload="none" onEnded={() => playNext(1)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <section className="relative overflow-hidden border-b border-white/[.08]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(155,99,208,.24),transparent_48%),radial-gradient(ellipse_at_15%_80%,rgba(0,164,220,.14),transparent_42%)]" />
      <div className="music-spectrum absolute inset-x-0 bottom-0 h-20 opacity-25" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[330px] max-w-[1500px] flex-col justify-end px-5 pb-10 pt-12 sm:px-8 lg:px-12">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.25em] text-[#c09de6]"><Headphones className="size-4" />Votre espace sonore</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Hub musique</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">Toute votre bibliothèque audio Jellyfin, organisée pour écouter sans quitter votre univers.</p>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-white/55"><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5">{data?.tracks.length ?? 0} titres chargés</span><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5">Lecture directe Jellyfin</span><Link href="/music-videos" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90"><Video className="size-4" />Voir les clips musicaux</Link></div>
      </div>
    </section>
    <div className="mx-auto flex max-w-[1500px] flex-col gap-12 px-5 py-9 sm:px-8 lg:px-12">
      {error ? <div role="alert" className="rounded-2xl border border-red-300/15 bg-red-400/[.06] p-5 text-sm text-white/75">Impossible de charger la bibliothèque audio. Vérifiez l’accès de votre compte Jellyfin aux contenus musicaux.</div> : null}
      {isLoading && !error ? <div role="status" aria-label="Chargement de la musique" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-2xl bg-white/[.06]" />)}<Loader2 className="sr-only animate-spin" /></div> : null}
      {!isLoading && !error && data?.tracks.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 text-center"><Music2 className="size-10 text-white/30" /><h2 className="mt-4 text-xl font-semibold">Aucun titre trouvé</h2><p className="mt-2 max-w-md text-sm text-white/50">Les titres apparaîtront ici dès que votre compte aura accès à une bibliothèque musicale Jellyfin.</p></div> : null}
      {data?.albums.length ? <section><div className="mb-5 flex items-end justify-between"><div><p className="mb-1 text-xs uppercase tracking-[.2em] text-white/40">À explorer</p><h2 className="text-2xl font-semibold">Albums récents</h2></div><Disc3 className="size-5 text-white/35" /></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{data.albums.map((album) => {
        const cover = primaryImage(session.serverUrl, album, 500)
        return <button type="button" key={album.Id} onClick={() => { const albumTrack = data.tracks.find((track) => track.Album === album.Name); if (albumTrack) playTrack(albumTrack) }} className="group rounded-2xl text-left transition duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <span className="relative block aspect-square overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#272037] to-[#12141d] shadow-lg">{cover ? <img src={cover} alt={`Pochette de ${album.Name}`} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center"><Disc3 className="size-12 text-white/30" /></span>}<span className="absolute bottom-3 right-3 flex size-11 translate-y-2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100"><Play className="size-4 fill-current" /></span></span>
          <span className="mt-3 block truncate text-sm font-semibold">{album.Name}</span><span className="mt-1 block truncate text-xs text-white/45">{album.AlbumArtist || "Album Jellyfin"}</span>
        </button>
      })}</div></section> : null}
      {data?.tracks.length ? <section><div className="mb-5 flex items-end justify-between"><div><p className="mb-1 text-xs uppercase tracking-[.2em] text-white/40">Votre collection</p><h2 className="text-2xl font-semibold">Titres</h2></div><span className="text-xs text-white/40">{data.tracks.length} morceaux</span></div><ul className="flex flex-col">{data.tracks.map((track, index) => {
        const cover = primaryImage(session.serverUrl, track, 160)
        const selected = current?.Id === track.Id
        return <li key={track.Id}><button type="button" onClick={() => playTrack(track)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected ? "bg-white/[.06]" : ""}`}><span className="w-6 text-center text-xs text-white/35">{selected ? playing ? <Sparkles className="mx-auto size-4 text-primary" /> : <Pause className="mx-auto size-4 text-primary" /> : index + 1}</span><span className="size-11 shrink-0 overflow-hidden rounded-lg bg-white/[.06]">{cover ? <img src={cover} alt="" loading="lazy" className="size-full object-cover" /> : <Music2 className="m-3 size-5 text-white/35" />}</span><span className="min-w-0 flex-1"><span className={`block truncate text-sm font-medium ${selected ? "text-primary" : "text-white/85"}`}>{track.Name}</span><span className="mt-1 block truncate text-xs text-white/45">{track.Artists?.join(", ") || track.AlbumArtist || "Artiste inconnu"}{track.Album ? ` · ${track.Album}` : ""}</span></span><span className="hidden text-xs text-white/40 sm:block">{track.RunTimeTicks ? `${Math.floor(track.RunTimeTicks / 600_000_000)}:${String(Math.floor(track.RunTimeTicks / 10_000_000) % 60).padStart(2, "0")}` : ""}</span><span className="flex size-9 items-center justify-center text-white/45 group-hover:text-white">{selected && playing ? <Pause className="size-4" /> : <Play className="size-4" />}</span></button></li>
      })}</ul></section> : null}
    </div>
    {current ? <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-white/10 bg-[#111216]/95 px-4 py-3 shadow-[0_-18px_50px_rgba(0,0,0,.32)] backdrop-blur-2xl xl:bottom-0"><div className="mx-auto flex max-w-[1500px] items-center gap-3 sm:gap-5"><span className="hidden size-11 overflow-hidden rounded-lg bg-white/[.06] sm:block">{primaryImage(session.serverUrl, current, 120) ? <img src={primaryImage(session.serverUrl, current, 120)!} alt="" className="size-full object-cover" /> : <Music2 className="m-3 size-5" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{current.Name}</p><p className="truncate text-xs text-white/45">{current.Artists?.join(", ") || current.AlbumArtist || "Lecture Jellyfin"}</p></div><button type="button" onClick={() => playNext(-1)} aria-label="Titre précédent" className="rounded-full p-2 text-white/65 hover:bg-white/10 hover:text-white"><SkipBack className="size-4" /></button><button type="button" onClick={() => playTrack(current)} aria-label={playing ? "Mettre en pause" : "Reprendre la lecture"} className="flex size-10 items-center justify-center rounded-full bg-white text-black hover:scale-105">{playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}</button><button type="button" onClick={() => playNext(1)} aria-label="Titre suivant" className="rounded-full p-2 text-white/65 hover:bg-white/10 hover:text-white"><SkipForward className="size-4" /></button><Radio className="hidden size-4 text-white/30 sm:block" /></div></div> : null}
  </main>
}
