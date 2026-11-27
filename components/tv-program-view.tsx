"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, CalendarDays, Clock3, Loader2, Play, Tv } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { VideoPlayer } from "@/components/video-player"
import { useJellyfin } from "@/components/jellyfin-provider"
import { backdropImage, formatClock, getItem, primaryImage } from "@/lib/jellyfin"
import { useState } from "react"

export function TvProgramView({ programId }: { programId: string }) {
  const { session } = useJellyfin()
  const searchParams = useSearchParams()
  const [playing, setPlaying] = useState(false)
  const channelName = searchParams.get("channel") || "Chaîne TV"
  const channelNumber = searchParams.get("number")
  const channelId = searchParams.get("channelId")
  const startDate = searchParams.get("start")
  const endDate = searchParams.get("end")

  const { data: program, error, isLoading } = useSWR(
    session ? ["live-tv-program", session.userId, programId] : null,
    () => getItem(session!, programId),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )

  const artwork = session && program ? backdropImage(session.serverUrl, program, 1200) ?? primaryImage(session.serverUrl, program, 900) : null
  const isCurrent = Boolean(startDate && endDate && Date.parse(startDate) <= Date.now() && Date.parse(endDate) > Date.now())

  if (!session) return null

  return <div className="min-h-screen bg-[#090a0d] pb-20 text-white">
    <AppHeader />
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-7 sm:py-10">
      <Link href="/guide-tv" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 text-sm text-white/75 transition hover:bg-white/10"><ArrowLeft className="size-4" />Retour au guide TV</Link>
      {isLoading ? <div role="status" className="mt-8 flex min-h-72 items-center justify-center gap-3 text-sm text-white/60"><Loader2 className="size-5 animate-spin" />Chargement des informations du programme…</div> : error || !program ? <div role="alert" className="mt-8 rounded-2xl border border-red-300/15 bg-red-300/[.05] p-6"><h1 className="text-xl font-semibold">Informations indisponibles</h1><p className="mt-2 text-sm text-white/60">Le serveur Jellyfin n’a pas pu charger ce programme. Revenez au guide et réessayez.</p></div> : <article className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#141519] shadow-2xl">
        <div className="relative min-h-64 overflow-hidden bg-[#202127] sm:min-h-[430px]">{artwork ? <img src={artwork} alt={`Visuel du programme ${program.Name}`} className="absolute inset-0 size-full object-cover" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-[#141519] via-black/25 to-black/10" /><div className="absolute inset-x-0 bottom-0 p-5 sm:p-9">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-[#e3b47c]"><Tv className="size-4" />{channelNumber ? `Chaîne ${channelNumber} · ` : ""}{channelName}</p>
          <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl">{program.Name}</h1>
          {program.EpisodeTitle ? <p className="mt-2 text-base text-white/70">{program.EpisodeTitle}</p> : null}
        </div></div>
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 text-xs text-white/70">{startDate && endDate ? <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-2"><Clock3 className="size-3.5" />{formatClock(startDate)} – {formatClock(endDate)}</span> : null}{program.ProductionYear ? <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">{program.ProductionYear}</span> : null}{program.OfficialRating ? <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">{program.OfficialRating}</span> : null}{program.CommunityRating ? <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">★ {program.CommunityRating.toFixed(1)}</span> : null}{isCurrent ? <span className="rounded-full bg-[#e50914] px-3 py-2 font-semibold text-white">En direct</span> : null}</div>
            {program.Genres?.length ? <p className="text-sm text-white/50">{program.Genres.join(" · ")}</p> : null}
            <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-white/70">{program.Overview || "Aucune description n’est disponible pour ce programme."}</p>
          </div>
          {isCurrent && channelId ? <button type="button" onClick={() => setPlaying(true)} className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:scale-[1.02]"><Play className="size-4 fill-current" />Regarder en direct</button> : null}
          {!startDate ? <p className="inline-flex items-center gap-2 self-start text-sm text-white/50"><CalendarDays className="size-4" />Horaires non fournis par le serveur</p> : null}
        </div>
      </article>}
    </main>
    {playing && channelId ? <VideoPlayer session={session} itemId={channelId} title={channelName} subtitle={program?.Name} isLive returnHref={`/guide-tv/program/${encodeURIComponent(programId)}`} onClose={() => setPlaying(false)} /> : null}
  </div>
}
