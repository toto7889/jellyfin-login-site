"use client"

import Link from "next/link"
import useSWR from "swr"
import { useMemo, useState } from "react"
import { CalendarDays, ChevronRight, Clock3, Loader2, Play, Radio, Search, Tv } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { VideoPlayer } from "@/components/video-player"
import { Input } from "@/components/ui/input"
import { backdropImage, closeLiveTvStream, formatClock, getLiveTvChannels, getLiveTvPrograms, getLiveTvStreamUrl, primaryImage, programProgress, type BaseItem, type JellyfinSession } from "@/lib/jellyfin"

type PlayTarget = { id: string; title: string; subtitle?: string }

export function TvView() {
  const { session } = useJellyfin()
  if (!session) return null
  return <TvContent session={session} />
}

function TvContent({ session }: { session: JellyfinSession }) {
  const [playing, setPlaying] = useState<PlayTarget | null>(null)
  const [previewChannel, setPreviewChannel] = useState<string | null>(null)
  const [channelQuery, setChannelQuery] = useState("")

  const { data, error, isLoading } = useSWR(
    ["livetv", session.userId],
    async () => {
      const channels = await getLiveTvChannels(session)
      const programs = await getLiveTvPrograms(session, channels.map((channel) => channel.Id))
      return { channels, programs }
    },
    { refreshInterval: 60_000, revalidateOnFocus: true },
  )

  const { data: livePreviewUrl } = useSWR(
    previewChannel ? ["live-preview", session.userId, previewChannel] : null,
    () => getLiveTvStreamUrl(session, previewChannel!),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const programsByChannel = useMemo(() => {
    const byChannel = new Map<string, BaseItem[]>()
    for (const program of data?.programs ?? []) {
      const list = byChannel.get(program.ChannelId ?? "") ?? []
      list.push(program)
      byChannel.set(program.ChannelId ?? "", list)
    }
    return byChannel
  }, [data?.programs])

  const visibleChannels = useMemo(() => {
    const query = channelQuery.trim().toLocaleLowerCase("fr")
    if (!query) return data?.channels ?? []
    return (data?.channels ?? []).filter((channel) => `${channel.Name} ${channel.ChannelNumber ?? ""}`.toLocaleLowerCase("fr").includes(query))
  }, [channelQuery, data?.channels])

  function stopPreview(channelId: string) {
    if (previewChannel === channelId && livePreviewUrl) void closeLiveTvStream(session, livePreviewUrl).catch(() => undefined)
    setPreviewChannel((active) => active === channelId ? null : active)
  }

  function startWatching(channel: BaseItem, current?: BaseItem) {
    stopPreview(channel.Id)
    setPlaying({ id: channel.Id, title: channel.Name, subtitle: current?.Name })
  }

  if (isLoading) return <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-8 sm:px-7 lg:px-10"><TvHubSkeleton /></div>
  if (error || !data || data.channels.length === 0) return <div className="mx-auto max-w-3xl px-4 pb-24 pt-20 text-center sm:px-7"><div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04]"><Tv className="size-7 text-white/45" /></div><h1 className="mt-5 text-2xl font-semibold">Aucune chaîne TV disponible</h1><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/50">La TV en direct n&apos;est pas configurée sur ce serveur Jellyfin, ou aucune chaîne n&apos;est accessible avec ce compte.</p><Link href="/guide-tv" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">Ouvrir le guide TV<ChevronRight className="size-4" /></Link></div>

  const heroChannel = data.channels.find((channel) => channel.CurrentProgram) ?? data.channels[0]
  const heroProgram = programsByChannel.get(heroChannel.Id)?.[0] ?? heroChannel.CurrentProgram
  const heroBackdrop = heroProgram ? backdropImage(session.serverUrl, heroProgram, 1600) ?? primaryImage(session.serverUrl, heroProgram, 1200) : primaryImage(session.serverUrl, heroChannel, 1200)
  const heroProgress = heroProgram ? programProgress(heroProgram.StartDate, heroProgram.EndDate) : 0

  return <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-7 text-white sm:px-7 lg:px-10">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#d9a76a]"><Radio className="size-4" />Télévision en direct</p><h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Votre hub TV</h1><p className="mt-2 text-sm text-white/50">{data.channels.length} chaînes · le direct et les programmes à venir</p></div>
      <Link href="/guide-tv" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-5 text-sm font-medium transition hover:border-white/30 hover:bg-white/10"><CalendarDays className="size-4" />Guide TV complet<ChevronRight className="size-4" /></Link>
    </div>

    <section className="relative mb-10 min-h-[370px] overflow-hidden rounded-[28px] border border-white/10 bg-[#17181d] shadow-2xl sm:min-h-[430px] animate-in fade-in zoom-in-[.99] duration-700" aria-label="À l’antenne maintenant">
      {heroBackdrop ? <img src={heroBackdrop} alt="" crossOrigin="anonymous" className="absolute inset-0 size-full object-cover opacity-45" /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#090a0d_0%,rgba(9,10,13,.86)_38%,rgba(9,10,13,.3)_100%)]" /><div className="absolute inset-0 bg-gradient-to-t from-[#090a0d]/90 via-transparent to-black/10" />
      <div className="relative flex min-h-[370px] max-w-2xl flex-col justify-end p-6 sm:min-h-[430px] sm:p-10">
        <div className="mb-4 flex items-center gap-2"><span className="flex items-center gap-1.5 rounded-full bg-[#e50914] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em]"><span className="size-1.5 animate-pulse rounded-full bg-white" />En direct</span><span className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs text-white/75">{heroChannel.ChannelNumber ? `Chaîne ${heroChannel.ChannelNumber}` : "TV en direct"}</span></div>
        <p className="text-sm font-medium text-white/55">{heroChannel.Name}</p><h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-5xl">{heroProgram?.Name ?? "À l’antenne"}</h2>{heroProgram?.EpisodeTitle ? <p className="mt-2 text-sm text-white/65">{heroProgram.EpisodeTitle}</p> : null}
        {heroProgram?.StartDate && heroProgram.EndDate ? <div className="mt-5 max-w-sm"><div className="flex items-center justify-between text-xs text-white/60"><span>{formatClock(heroProgram.StartDate)} – {formatClock(heroProgram.EndDate)}</span><span>{heroProgress}%</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#e50914] transition-[width] duration-700" style={{ width: `${heroProgress}%` }} /></div></div> : null}
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => startWatching(heroChannel, heroProgram)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition duration-300 hover:scale-[1.03] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Play className="size-4 fill-current" />Regarder maintenant</button><Link href="/guide-tv" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-5 text-sm font-medium transition hover:bg-white/10"><CalendarDays className="size-4" />Voir le programme</Link></div>
      </div>
    </section>

    <section aria-labelledby="channels-heading" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-white/35">Votre sélection</p><h2 id="channels-heading" className="mt-1 text-xl font-semibold">Toutes les chaînes</h2></div><label className="relative block w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" /><Input value={channelQuery} onChange={(event) => setChannelQuery(event.target.value)} placeholder="Filtrer les chaînes" aria-label="Filtrer les chaînes TV" className="h-10 rounded-full border-white/10 bg-white/[.04] pl-9 text-white placeholder:text-white/35" /></label></div>
      {visibleChannels.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleChannels.map((channel, index) => {
        const programs = programsByChannel.get(channel.Id) ?? []
        const current = programs[0] ?? channel.CurrentProgram
        const upcoming = programs.slice(1, 2)[0]
        const poster = current ? backdropImage(session.serverUrl, current, 900) ?? primaryImage(session.serverUrl, current, 600) : primaryImage(session.serverUrl, channel, 600)
        const logo = primaryImage(session.serverUrl, channel, 120)
        const progress = current ? programProgress(current.StartDate, current.EndDate) : 0
        const isPreviewing = previewChannel === channel.Id
        return <article key={channel.Id} className="group overflow-hidden rounded-2xl border border-white/[.09] bg-[#111216] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_16px_40px_rgba(0,0,0,.28)] animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${Math.min(index * 45, 350)}ms` }} onMouseEnter={() => setPreviewChannel(channel.Id)} onMouseLeave={() => stopPreview(channel.Id)} onFocus={() => setPreviewChannel(channel.Id)} onBlur={() => stopPreview(channel.Id)}>
          <div className="relative aspect-video overflow-hidden bg-[#1b1c22]">{poster ? <img src={poster} alt="" crossOrigin="anonymous" loading="lazy" className={`absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105 ${isPreviewing && livePreviewUrl ? "opacity-0" : "opacity-70"}`} /> : null}{isPreviewing && livePreviewUrl ? <video key={channel.Id} src={livePreviewUrl} autoPlay muted playsInline aria-label={`Aperçu en direct de ${channel.Name}`} className="absolute inset-0 size-full object-cover" onError={() => setPreviewChannel((active) => active === channel.Id ? null : active)} /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/20" /><div className="absolute inset-x-0 top-0 flex items-start justify-between p-3"><div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-2.5 py-1.5 backdrop-blur"><span className="size-1.5 animate-pulse rounded-full bg-[#ff4952]" /><span className="text-[10px] font-bold uppercase tracking-wider">Direct</span></div><span className="rounded-full bg-black/45 px-2.5 py-1.5 text-[10px] text-white/75 backdrop-blur">{channel.ChannelNumber ? `CH ${channel.ChannelNumber}` : "LIVE TV"}</span></div><button type="button" onClick={() => startWatching(channel, current)} aria-label={`Regarder ${channel.Name}${current?.Name ? ` : ${current.Name}` : ""}`} className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"><span className="flex size-14 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform hover:scale-110"><Play className="ml-0.5 size-5 fill-current" /></span></button><div className="absolute inset-x-4 bottom-3 flex items-center gap-2"><div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-black/40">{logo ? <img src={logo} alt="" loading="lazy" className="size-full object-contain p-1" /> : <Tv className="size-4" />}</div><p className="truncate text-sm font-semibold">{channel.Name}</p></div></div>
          <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#ff6c73]">En cours</p><h3 className="mt-1 truncate text-base font-semibold">{current?.Name ?? "Programme indisponible"}</h3>{current?.EpisodeTitle ? <p className="mt-1 truncate text-xs text-white/50">{current.EpisodeTitle}</p> : null}</div>{current?.StartDate && current.EndDate ? <span className="shrink-0 pt-1 text-[10px] text-white/45">{formatClock(current.StartDate)}</span> : null}</div>{current?.StartDate && current.EndDate ? <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#e50914] transition-[width] duration-700" style={{ width: `${progress}%` }} /></div> : null}{upcoming ? <div className="mt-3 flex items-center gap-2 border-t border-white/[.07] pt-3"><Clock3 className="size-3.5 shrink-0 text-white/35" /><p className="truncate text-xs text-white/55">Ensuite · <span className="text-white/75">{upcoming.Name}</span></p><span className="ml-auto shrink-0 text-[10px] text-white/40">{formatClock(upcoming.StartDate)}</span></div> : null}</div>
        </article>
      })}</div> : <p className="rounded-2xl border border-dashed border-white/15 py-12 text-center text-sm text-white/50">Aucune chaîne ne correspond à cette recherche.</p>}
    </section>
    <div className="mt-8 flex justify-center"><Link href="/guide-tv" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-sm text-white/75 transition hover:bg-white/[.06] hover:text-white">Afficher la grille complète des programmes<ChevronRight className="size-4" /></Link></div>
    {playing ? <VideoPlayer session={session} itemId={playing.id} title={playing.title} subtitle={playing.subtitle} isLive onClose={() => setPlaying(null)} /> : null}
  </div>
}

function TvHubSkeleton() {
  return <div role="status" aria-label="Chargement des chaînes TV" className="animate-in fade-in duration-300"><div className="mb-8 space-y-3"><div className="h-3 w-36 animate-pulse rounded bg-white/10" /><div className="h-10 w-72 animate-pulse rounded-xl bg-white/[.08]" /><div className="h-4 w-96 max-w-[80vw] animate-pulse rounded bg-white/[.05]" /></div><div className="mb-8 h-[370px] animate-pulse rounded-[28px] bg-[linear-gradient(110deg,#121318_8%,#20212a_18%,#121318_33%)] bg-[length:200%_100%]" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.025]"><div className="aspect-video animate-pulse bg-white/[.05]" /><div className="space-y-3 p-4"><div className="h-3 w-24 animate-pulse rounded bg-white/[.07]" /><div className="h-4 w-3/4 animate-pulse rounded bg-white/[.09]" /></div></div>)}</div><span className="sr-only"><Loader2 className="size-4 animate-spin" />Chargement des chaînes TV</span></div>
}
