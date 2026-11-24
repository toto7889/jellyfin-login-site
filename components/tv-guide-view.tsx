"use client"

import Link from "next/link"
import useSWR from "swr"
import { useMemo, useState } from "react"
import { CalendarDays, ChevronRight, Clock3, Play, Radio, Search, Tv } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { useJellyfin } from "@/components/jellyfin-provider"
import { VideoPlayer } from "@/components/video-player"
import { Input } from "@/components/ui/input"
import { backdropImage, formatClock, getLiveTvChannels, getLiveTvPrograms, primaryImage, type BaseItem, type JellyfinSession } from "@/lib/jellyfin"

type PlayingChannel = { id: string; name: string; program?: string }
const HOURS = 12
const PIXELS_PER_MINUTE = 3

export function TvGuideView() {
  const { session } = useJellyfin()
  if (!session) return null
  return <TvGuideContent session={session} />
}

function TvGuideContent({ session }: { session: JellyfinSession }) {
  const [query, setQuery] = useState("")
  const [playing, setPlaying] = useState<PlayingChannel | null>(null)
  const [rangeStart] = useState(() => {
    const date = new Date()
    date.setMinutes(0, 0, 0)
    return date
  })
  const rangeEnd = useMemo(() => new Date(rangeStart.getTime() + HOURS * 60 * 60 * 1000), [rangeStart])
  const { data, error, isLoading, mutate } = useSWR(
    ["live-guide", session.userId, HOURS],
    async () => {
      const channels = await getLiveTvChannels(session)
      try {
        const programs = await getLiveTvPrograms(session, channels.map((channel) => channel.Id), HOURS)
        return { channels, programs, scheduleUnavailable: false }
      } catch {
        const currentPrograms = channels.flatMap((channel) => channel.CurrentProgram ? [{ ...channel.CurrentProgram, ChannelId: channel.Id, ChannelName: channel.Name }] : [])
        return { channels, programs: currentPrograms, scheduleUnavailable: true }
      }
    },
    { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 120_000, keepPreviousData: true },
  )

  const filteredChannels = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr")
    if (!value) return data?.channels ?? []
    return (data?.channels ?? []).filter((channel) => `${channel.Name} ${channel.ChannelNumber ?? ""}`.toLocaleLowerCase("fr").includes(value))
  }, [data?.channels, query])

  const programsByChannel = useMemo(() => {
    const byChannel = new Map<string, BaseItem[]>()
    for (const program of data?.programs ?? []) {
      const programs = byChannel.get(program.ChannelId ?? "") ?? []
      programs.push(program)
      byChannel.set(program.ChannelId ?? "", programs)
    }
    return byChannel
  }, [data?.programs])

  const nowOffset = Math.max(0, Math.min(HOURS * 60, (Date.now() - rangeStart.getTime()) / 60_000))
  const hours = Array.from({ length: HOURS }, (_, index) => new Date(rangeStart.getTime() + index * 60 * 60 * 1000))

  return <div className="min-h-screen bg-[#090a0d] pb-28 text-white sm:pb-16">
    <AppHeader />
    <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-7 sm:px-7 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#d9a76a]"><CalendarDays className="size-4" />Programme TV</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Le guide des programmes</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55 sm:text-base">Toutes vos chaînes et leurs programmes, réunis dans une grille claire sur les 12 prochaines heures.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/tv" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-4 text-sm text-white/75 transition hover:border-white/30 hover:bg-white/10"><Tv className="size-4" />Hub TV</Link>
          <button type="button" onClick={() => void mutate()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black transition hover:scale-[1.02]"><Radio className="size-4" />Actualiser</button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:p-4">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e50914]/15 text-[#ff696f]"><Clock3 className="size-5" /></span><div><p className="text-sm font-medium">{rangeStart.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p><p className="text-xs text-white/45">{formatClock(rangeStart.toISOString())} – {formatClock(rangeEnd.toISOString())} · heure locale</p></div></div>
        <label className="relative block w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une chaîne" aria-label="Rechercher une chaîne" className="h-10 rounded-full border-white/10 bg-black/30 pl-9 text-white placeholder:text-white/35" /></label>
      </div>

      {isLoading ? <GuideLoading /> : error ? <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-500/[.06] p-8 text-center"><Radio className="mx-auto size-8 text-red-300" /><h2 className="mt-3 font-semibold">Le guide n&apos;est pas disponible</h2><p className="mt-1 text-sm text-white/50">Vérifiez la connexion Jellyfin et réessayez.</p><button type="button" onClick={() => void mutate()} className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Réessayer</button></div> : !data?.channels.length ? <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center"><Tv className="mx-auto size-8 text-white/40" /><h2 className="mt-3 font-semibold">Aucune chaîne disponible</h2><p className="mt-1 text-sm text-white/50">Les chaînes TV en direct ne sont pas configurées sur ce serveur.</p></div> : <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101115] shadow-2xl animate-in fade-in duration-500">
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="min-w-max">
            <div className="sticky top-0 z-20 flex border-b border-white/10 bg-[#111216]/95 backdrop-blur-xl">
              <div className="sticky left-0 z-30 flex w-52 shrink-0 items-center border-r border-white/10 bg-[#111216] px-4 text-xs font-semibold uppercase tracking-wider text-white/45">Chaînes</div>
              <div className="relative flex h-12" style={{ width: `${HOURS * 60 * PIXELS_PER_MINUTE}px` }}>{hours.map((hour) => <div key={hour.toISOString()} className="flex h-full items-center border-r border-white/[.08] pl-3 text-xs font-medium text-white/55" style={{ width: `${60 * PIXELS_PER_MINUTE}px` }}>{hour.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>)}</div>
            </div>
            {filteredChannels.map((channel, index) => {
              const logo = primaryImage(session.serverUrl, channel, 120)
              const programs = (programsByChannel.get(channel.Id) ?? []).filter((program) => program.StartDate && program.EndDate).sort((a, b) => Date.parse(a.StartDate!) - Date.parse(b.StartDate!))
              return <div key={channel.Id} className="group flex border-b border-white/[.07] last:border-b-0 animate-in fade-in slide-in-from-bottom-1 duration-500" style={{ animationDelay: `${Math.min(index * 35, 350)}ms` }}>
                <div className="sticky left-0 z-10 flex w-52 shrink-0 items-center gap-3 border-r border-white/10 bg-[#101115]/95 px-3 py-3 backdrop-blur-sm transition-colors group-hover:bg-[#17181d]">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[.04]">{logo ? <img src={logo} alt="" loading="lazy" className="size-full object-contain p-1" /> : <Tv className="size-5 text-white/35" />}</div>
                  <div className="min-w-0"><p className="text-[10px] font-semibold tracking-wide text-white/40">{channel.ChannelNumber || "TV"}</p><p className="truncate text-sm font-medium">{channel.Name}</p></div>
                </div>
                <div className="relative h-[126px] shrink-0 bg-[linear-gradient(to_right,rgba(255,255,255,.045)_1px,transparent_1px)]" style={{ width: `${HOURS * 60 * PIXELS_PER_MINUTE}px`, backgroundSize: `${60 * PIXELS_PER_MINUTE}px 100%` }}>
                  {programs.map((program) => {
                    const start = Date.parse(program.StartDate!)
                    const end = Date.parse(program.EndDate!)
                    const visibleStart = Math.max(start, rangeStart.getTime())
                    const visibleEnd = Math.min(end, rangeEnd.getTime())
                    if (visibleEnd <= visibleStart) return null
                    const left = ((visibleStart - rangeStart.getTime()) / 60_000) * PIXELS_PER_MINUTE
                    const width = ((visibleEnd - visibleStart) / 60_000) * PIXELS_PER_MINUTE
                    const current = start <= Date.now() && end > Date.now()
                    const poster = primaryImage(session.serverUrl, program, 300) ?? backdropImage(session.serverUrl, program, 500)
                    const content = <><span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/10" />{poster ? <img src={poster} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-70 transition duration-500 group-hover:scale-105" /> : null}<span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" /><span className="absolute inset-x-3 bottom-2.5 z-10"><span className="flex items-center gap-1 text-[10px] font-semibold text-white/65"><span>{formatClock(program.StartDate)}</span><span>–</span><span>{formatClock(program.EndDate)}</span></span><span className="mt-1 block truncate text-xs font-semibold text-white">{program.Name}</span>{program.EpisodeTitle ? <span className="block truncate text-[10px] text-white/65">{program.EpisodeTitle}</span> : null}</span>{current ? <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-[#e50914] px-2 py-1 text-[9px] font-bold uppercase tracking-wider"><span className="size-1.5 animate-pulse rounded-full bg-white" />En direct</span> : null}</>
                    const infoUrl = `/guide-tv/program/${encodeURIComponent(program.Id)}?channel=${encodeURIComponent(channel.Name)}&number=${encodeURIComponent(channel.ChannelNumber ?? "")}&channelId=${encodeURIComponent(channel.Id)}&start=${encodeURIComponent(program.StartDate ?? "")}&end=${encodeURIComponent(program.EndDate ?? "")}`
                    return <div key={program.Id} className={`absolute top-2 h-[110px] overflow-hidden rounded-xl border bg-[#202127] transition duration-300 ${current ? "border-white/15 shadow-lg hover:border-white/40" : "border-white/[.09] hover:border-white/20"}`} style={{ left, width: Math.max(width - 6, 108) }}>
                      {content}
                      <Link href={infoUrl} aria-label={`Voir les informations de ${program.Name}`} className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white" />
                      {current && program.ChannelId ? <button type="button" onClick={() => setPlaying({ id: program.ChannelId!, name: channel.Name, program: program.Name })} aria-label={`Regarder ${program.Name} sur ${channel.Name}`} className="absolute left-1/2 top-1/2 z-20 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-xl transition hover:scale-105 hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Play className="ml-0.5 size-4 fill-current" /></button> : null}
                    </div>
                  })}
                  {nowOffset < HOURS * 60 ? <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-[5] w-px bg-[#ff4650] shadow-[0_0_8px_#ff4650]" style={{ left: `${nowOffset * PIXELS_PER_MINUTE}px` }}><span className="absolute -top-1 -left-1 size-2 rounded-full bg-[#ff4650]" /></div> : null}
                  {!programs.length ? <p className="absolute left-4 top-12 text-xs text-white/35">Aucun programme communiqué</p> : null}
                </div>
              </div>
            })}
            {filteredChannels.length === 0 ? <div className="p-10 text-center text-sm text-white/50">Aucune chaîne ne correspond à votre recherche.</div> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[.08] px-4 py-3 text-[11px] text-white/45"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#ff4650]" />Heure actuelle</span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e50914]" />Programme en direct · sélectionnez-le pour regarder</span><span className="ml-auto">{filteredChannels.length} chaîne{filteredChannels.length > 1 ? "s" : ""}</span></div>
      </div>}
      <div className="mt-6 flex justify-end"><Link href="/tv" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white">Explorer le hub TV<ChevronRight className="size-4" /></Link></div>
      {data?.scheduleUnavailable ? <p role="status" className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.06] px-4 py-3 text-sm text-amber-100/80">Le serveur n’a pas répondu pour le guide des horaires. Les chaînes et les programmes en cours restent accessibles. <button type="button" onClick={() => void mutate()} className="ml-1 font-semibold underline underline-offset-2">Réessayer</button></p> : null}
      {playing ? <VideoPlayer session={session} itemId={playing.id} title={playing.name} subtitle={playing.program} isLive onClose={() => setPlaying(null)} /> : null}
    </main>
  </div>
}

function GuideLoading() {
  return <div role="status" aria-label="Chargement du guide TV" className="overflow-hidden rounded-2xl border border-white/10 bg-[#101115]"><div className="flex border-b border-white/10"><div className="w-52 shrink-0 p-4"><div className="h-3 w-16 animate-pulse rounded bg-white/10" /></div><div className="flex gap-4 p-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-3 w-16 animate-pulse rounded bg-white/10" />)}</div></div>{Array.from({ length: 7 }, (_, row) => <div key={row} className="flex border-b border-white/[.06] p-2"><div className="flex w-48 shrink-0 items-center gap-3 px-2"><div className="size-11 animate-pulse rounded-xl bg-white/[.07]" /><div className="space-y-2"><div className="h-2.5 w-24 animate-pulse rounded bg-white/[.07]" /><div className="h-2.5 w-16 animate-pulse rounded bg-white/[.05]" /></div></div><div className="flex gap-2"><div className="h-[110px] w-52 animate-pulse rounded-xl bg-white/[.07]" /><div className="h-[110px] w-64 animate-pulse rounded-xl bg-white/[.05]" /><div className="h-[110px] w-40 animate-pulse rounded-xl bg-white/[.06]" /></div></div>)}</div>
}
