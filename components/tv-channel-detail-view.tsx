"use client"

import Link from "next/link"
import useSWR from "swr"
import { useState } from "react"
import { ArrowLeft, CalendarDays, ChevronRight, Clock3, Loader2, Play, Radio, Tv } from "lucide-react"
import { VideoPlayer } from "@/components/video-player"
import { useJellyfin } from "@/components/jellyfin-provider"
import { backdropImage, formatClock, getLiveTvChannels, getLiveTvPrograms, primaryImage, programProgress, type BaseItem } from "@/lib/jellyfin"

export function TvChannelDetailView({ channelId }: { channelId: string }) {
  const { session } = useJellyfin()
  const [watching, setWatching] = useState(false)
  const { data, error, isLoading } = useSWR(session ? ["tv-channel-detail", session.userId, channelId] : null, async () => {
    const channels = await getLiveTvChannels(session!)
    const channel = channels.find((item) => item.Id === channelId)
    if (!channel) throw new Error("Cette chaîne n’est pas disponible.")
    const programs = await getLiveTvPrograms(session!, [channel.Id], 8).catch(() => [])
    return { channel, programs }
  }, { revalidateOnFocus: false, keepPreviousData: true })

  if (!session) return null
  if (isLoading) return <main className="min-h-[70dvh] px-5 py-12 text-white"><div role="status" aria-label="Chargement de la chaîne" className="mx-auto max-w-6xl"><Loader2 className="size-6 animate-spin text-white/50" /><div className="mt-6 h-72 animate-pulse rounded-3xl bg-white/[.06]" /></div></main>
  if (error || !data) return <main className="mx-auto min-h-[70dvh] max-w-4xl px-5 py-20 text-center text-white"><Tv className="mx-auto size-10 text-white/30" /><h1 className="mt-5 text-2xl font-semibold">Chaîne indisponible</h1><p className="mt-2 text-sm text-white/55">Cette chaîne n’est pas accessible avec votre compte Jellyfin.</p><Link href="/tv" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm hover:bg-white/10"><ArrowLeft className="size-4" />Retour au hub TV</Link></main>

  const { channel, programs } = data
  const now = Date.now()
  const current = programs.find((program) => program.StartDate && program.EndDate && new Date(program.StartDate).getTime() <= now && new Date(program.EndDate).getTime() > now) ?? channel.CurrentProgram ?? programs[0]
  const upcoming = programs.filter((program) => !current || program.Id !== current.Id).slice(0, 8)
  const logo = primaryImage(session.serverUrl, channel, 360)
  const heroImage = current ? backdropImage(session.serverUrl, current, 1600) ?? primaryImage(session.serverUrl, current, 1200) : primaryImage(session.serverUrl, channel, 1200)
  const progress = current ? programProgress(current.StartDate, current.EndDate) : 0

  return <main className="min-h-screen bg-[#08090c] pb-24 text-white">
    <section className="relative isolate min-h-[420px] overflow-hidden border-b border-white/10 sm:min-h-[500px]">
      {heroImage ? <img src={heroImage} alt="" crossOrigin="anonymous" fetchPriority="high" className="absolute inset-0 size-full object-cover opacity-35" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[#08090c] via-[#08090c]/85 to-[#08090c]/35" /><div className="absolute inset-0 bg-gradient-to-t from-[#08090c] via-transparent to-black/20" />
      <div className="relative mx-auto flex min-h-[420px] max-w-7xl flex-col justify-end px-5 pb-10 pt-16 sm:min-h-[500px] sm:px-8 sm:pb-14">
        <Link href="/tv" className="mb-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 text-xs text-white/75 backdrop-blur transition hover:bg-white/10"><ArrowLeft className="size-4" />Toutes les chaînes</Link>
        <div className="flex items-end gap-5 sm:gap-7">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/45 p-3 shadow-2xl backdrop-blur sm:size-28">{logo ? <img src={logo} alt={`Logo de ${channel.Name}`} className="max-h-full max-w-full object-contain" /> : <Tv className="size-9 text-white/40" />}</div>
          <div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-[#e50914] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em]"><span className="size-1.5 animate-pulse rounded-full bg-white" />En direct</span>{channel.ChannelNumber ? <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs text-white/75">Chaîne {channel.ChannelNumber}</span> : null}</div><h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{channel.Name}</h1><p className="mt-2 text-sm text-white/55">{current?.Name ? `À l’antenne : ${current.Name}` : "Programme en direct"}</p></div>
        </div>
        {current ? <div className="mt-6 max-w-2xl rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md sm:p-5"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#ff737a]">Maintenant</p><h2 className="mt-1 truncate text-lg font-semibold">{current.Name}</h2>{current.EpisodeTitle ? <p className="mt-1 truncate text-sm text-white/55">{current.EpisodeTitle}</p> : null}</div>{current.StartDate && current.EndDate ? <span className="shrink-0 text-xs text-white/55">{formatClock(current.StartDate)} – {formatClock(current.EndDate)}</span> : null}</div>{current.StartDate && current.EndDate ? <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#e50914] transition-[width] duration-700" style={{ width: `${progress}%` }} /></div> : null}</div> : null}
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setWatching(true)} className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-xl transition duration-300 hover:scale-[1.03] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Play className="size-4 fill-current transition-transform group-hover:scale-110" />Regarder la chaîne</button><Link href="/guide-tv" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-5 text-sm font-medium transition hover:bg-white/10"><CalendarDays className="size-4" />Guide TV complet</Link></div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8" aria-labelledby="epg-heading">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-white/40"><Radio className="size-3.5" />Programme TV</p><h2 id="epg-heading" className="text-2xl font-semibold">Guide de {channel.Name}</h2></div><span className="text-xs text-white/40">Prochains programmes</span></div>
      {upcoming.length ? <ol className="grid gap-3">{upcoming.map((program: BaseItem, index) => <li key={program.Id} className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-white/[.09] bg-white/[.025] p-4 transition hover:border-white/20 hover:bg-white/[.045] sm:p-5" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-start gap-4"><span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-white/55"><Clock3 className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-xs font-medium text-[#f2bb55]">{program.StartDate ? formatClock(program.StartDate) : "Horaire indisponible"}{program.EndDate ? ` – ${formatClock(program.EndDate)}` : ""}</span>{program.StartDate && program.EndDate ? <span className="text-[10px] text-white/35">{Math.max(1, Math.round((new Date(program.EndDate).getTime() - new Date(program.StartDate).getTime()) / 60_000))} min</span> : null}</div><h3 className="mt-1 truncate font-semibold">{program.Name}</h3>{program.EpisodeTitle ? <p className="mt-1 truncate text-sm text-white/55">{program.EpisodeTitle}</p> : null}{program.Overview ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">{program.Overview}</p> : null}</div><ChevronRight className="mt-2 size-4 shrink-0 text-white/25" /></div></li>)}</ol> : <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center"><CalendarDays className="mx-auto size-6 text-white/35" /><p className="mt-3 text-sm text-white/55">Aucun programme à venir n’est fourni par le guide de cette chaîne.</p><Link href="/guide-tv" className="mt-4 inline-flex items-center gap-1 text-sm text-white/75 hover:text-white">Ouvrir le guide complet<ChevronRight className="size-4" /></Link></div>}
    </section>
    {watching ? <VideoPlayer session={session} itemId={channel.Id} title={channel.Name} subtitle={current?.Name} isLive onClose={() => setWatching(false)} /> : null}
  </main>
}
