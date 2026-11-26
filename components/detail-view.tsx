"use client"

import Link from "next/link"
import useSWR from "swr"
import { useEffect, useState } from "react"
import { ArrowDown, Check, ChevronRight, Clock3, Film, Heart, Loader2, Play, Share2, Sparkles, Star, User } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { VideoPlayer } from "@/components/video-player"
import { MovieAvailability } from "@/components/movie-availability"
import { Button } from "@/components/ui/button"
import {
  backdropImage,
  getEpisodes,
  getItem,
  getLocalTrailers,
  getSeasons,
  personImage,
  primaryImage,
  ticksToTime,
  type BaseItem,
  type JellyfinSession,
} from "@/lib/jellyfin"

export function DetailView({ itemId, cinemaConfigured }: { itemId: string; cinemaConfigured: boolean }) {
  const { session } = useJellyfin()
  if (!session) return null
  return <DetailContent session={session} itemId={itemId} cinemaConfigured={cinemaConfigured} />
}

type PlayTarget = {
  id: string
  title: string
  subtitle?: string
  backdrop?: string | null
  positionTicks?: number
  language?: string
  previewMode?: boolean
  previewDurationSeconds?: number
  durationTicks?: number
}

function DetailContent({
  session,
  itemId,
  cinemaConfigured,
}: {
  session: JellyfinSession
  itemId: string
  cinemaConfigured: boolean
}) {
  const { preferences, toggleFavorite } = useJellyfin()
  const [playing, setPlaying] = useState<PlayTarget | null>(null)
  const [cachedPlayback, setCachedPlayback] = useState<PlayTarget | null>(null)
  const [launching, setLaunching] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    if (playing) setCachedPlayback(playing)
  }, [playing])

  function launchPlayback(target: PlayTarget) {
    setLaunching(true)
    window.setTimeout(() => {
      setCachedPlayback(target)
      setPlaying(target)
      setLaunching(false)
    }, 260)
  }

  const { data, error, isLoading } = useSWR(
    ["item", session.userId, itemId],
    async () => {
      const item = await getItem(session, itemId)
      if (item.Type === "Series") {
        const seasons = await getSeasons(session, item.Id)
        return { item, seasons }
      }
      return { item, seasons: [] as BaseItem[] }
    },
  )
  const { data: localTrailers, isLoading: trailersLoading } = useSWR(
    data?.item && (data.item.Type === "Movie" || data.item.Type === "Series")
      ? ["local-trailers", session.userId, itemId]
      : null,
    () => getLocalTrailers(session, itemId),
    { shouldRetryOnError: false },
  )
  const { data: previewEpisodes, isLoading: previewEpisodesLoading } = useSWR(
    data?.item.Type === "Series" ? ["preview-episodes", session.userId, itemId] : null,
    () => getEpisodes(session, itemId),
    { shouldRetryOnError: false },
  )

  if (isLoading) {
    return <div role="status" aria-label="Chargement de la fiche" className="min-h-[60dvh] animate-in fade-in bg-[#090a0d] px-4 pt-10"><div className="mx-auto max-w-[1600px]"><div className="mb-8 h-[38dvh] min-h-56 animate-pulse rounded-[28px] bg-[linear-gradient(110deg,#121318_8%,#20212a_18%,#121318_33%)] bg-[length:200%_100%]" /><div className="flex gap-5"><div className="h-56 w-40 animate-pulse rounded-xl bg-white/[.06]" /><div className="flex flex-1 flex-col gap-4 pt-8"><div className="h-8 w-2/3 animate-pulse rounded bg-white/10" /><div className="h-4 w-1/3 animate-pulse rounded bg-white/[.06]" /><div className="h-12 w-40 animate-pulse rounded-full bg-white/[.08]" /></div></div></div><Loader2 className="sr-only size-6 animate-spin" /></div>
  }

  if (error || !data) {
    return (
      <div className="px-6 py-20 text-center text-muted-foreground">
        Impossible de charger ce contenu.
      </div>
    )
  }

  const { item, seasons } = data
  const backdrop = backdropImage(session.serverUrl, item, 1600)
  const poster = primaryImage(session.serverUrl, item, 400)
  const isSeries = item.Type === "Series"
  const resumedEpisode = previewEpisodes?.find((episode) => (episode.UserData?.PlaybackPositionTicks ?? 0) > 0)
  const previewItem = isSeries
    ? resumedEpisode ?? localTrailers?.[0] ?? previewEpisodes?.[0]
    : localTrailers?.[0] ?? item
  const isLocalTrailer = Boolean(localTrailers?.[0] && !resumedEpisode)
  const resumeTicks = isSeries
    ? resumedEpisode?.UserData?.PlaybackPositionTicks ?? 0
    : item.UserData?.PlaybackPositionTicks ?? 0
  const primaryEpisode = isSeries
    ? resumedEpisode ?? previewEpisodes?.find((episode) => !episode.UserData?.Played) ?? previewEpisodes?.[0]
    : undefined
  const resumeDurationTicks = isSeries ? primaryEpisode?.RunTimeTicks : item.RunTimeTicks

  function openPreview() {
    if (!previewItem) return
    setPlaying({
      id: previewItem.Id,
      title: item.Name,
      subtitle: isLocalTrailer ? "Bande-annonce" : `Aperçu · ${previewItem.Name}`,
      backdrop: backdropImage(session.serverUrl, previewItem, 1600) ?? backdrop,
      positionTicks: resumedEpisode?.Id === previewItem.Id ? resumedEpisode.UserData?.PlaybackPositionTicks : 0,
      durationTicks: previewItem.RunTimeTicks,
      language: item.OriginalLanguage ?? item.Language,
      previewMode: true,
      previewDurationSeconds: isLocalTrailer ? undefined : 30,
    })
  }
  const cast = (item.People ?? []).filter(
    (p) => p.Type === "Actor" || p.Type === "GuestStar",
  )
  const directors = (item.People ?? []).filter((p) => p.Type === "Director")
  const writers = (item.People ?? []).filter((p) => p.Type === "Writer")

  const resumePercent = resumeDurationTicks && resumeTicks > 0
    ? Math.min(100, Math.round((resumeTicks / resumeDurationTicks) * 100))
    : 0
  const logo = item.ImageTags?.Logo
    ? `${session.serverUrl}/Items/${encodeURIComponent(item.Id)}/Images/Logo?tag=${encodeURIComponent(item.ImageTags.Logo)}&maxWidth=720`
    : null

  return (
    <div className="min-h-screen overflow-hidden bg-[#08090c] pb-20 text-white netflix-fade-up">
      <section className="relative isolate min-h-[690px] overflow-hidden sm:min-h-[760px]">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" crossOrigin="anonymous" fetchPriority="high" className={`absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ${launching ? "scale-110" : "scale-100"}`} />
        ) : <div className="jf-gradient absolute inset-0 opacity-40" />}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,12,.96)_0%,rgba(8,9,12,.74)_40%,rgba(8,9,12,.2)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#08090c_1%,rgba(8,9,12,.82)_21%,transparent_67%)]" />

        <header className="relative z-10 mx-auto flex max-w-[1500px] items-center justify-between px-5 py-5 sm:px-10">
          <a href="/" className="text-xs font-bold uppercase tracking-[.28em] text-white/75 transition hover:text-white">JFLX <span className="ml-2 text-white/35">/ HUB</span></a>
          <nav aria-label="Navigation média" className="hidden items-center gap-6 text-sm text-white/65 sm:flex">
            <a href="#fiche" className="transition hover:text-white">Aperçu</a>
            {isSeries ? <a href="#episodes" className="transition hover:text-white">Épisodes</a> : null}
            <a href="#distribution" className="transition hover:text-white">Distribution</a>
          </nav>
          <a href="/" aria-label="Retour à l’accueil" className="rounded-full border border-white/20 bg-black/20 px-4 py-2 text-sm text-white/80 backdrop-blur transition hover:bg-white/10">Catalogue</a>
        </header>

        <div id="fiche" className="relative z-10 mx-auto flex min-h-[590px] max-w-[1500px] items-end px-5 pb-12 pt-16 sm:min-h-[650px] sm:px-10 sm:pb-16">
          <div className="grid w-full items-end gap-8 sm:grid-cols-[minmax(0,1fr)_220px] lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="max-w-3xl">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.3em] text-[#f2bb55]">{isSeries ? "Série originale" : "Film sélectionné"} <span className="mx-2 text-white/30">•</span> Votre bibliothèque Jellyfin</p>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={item.Name} crossOrigin="anonymous" className="mb-5 max-h-24 max-w-[min(90vw,520px)] object-contain object-left drop-shadow-2xl sm:max-h-32" />
              ) : <h1 className="mb-4 text-balance text-4xl font-black leading-[.98] tracking-[-.04em] sm:text-6xl lg:text-7xl">{item.Name}</h1>}
              {item.Taglines?.[0] ? <p className="mb-4 max-w-xl text-lg font-medium italic text-white/80 sm:text-xl">{item.Taglines[0]}</p> : null}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/75 sm:gap-3 sm:text-sm">
                {item.ProductionYear ? <span>{item.ProductionYear}</span> : null}
                {item.RunTimeTicks ? <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{ticksToTime(item.RunTimeTicks)}</span> : null}
                {item.OfficialRating ? <span className="rounded border border-white/35 px-1.5 py-0.5 text-[11px]">{item.OfficialRating}</span> : null}
                {item.CommunityRating ? <span className="flex items-center gap-1 text-[#f2bb55]"><Star className="size-3.5 fill-current" />{item.CommunityRating.toFixed(1)}</span> : null}
                {item.Genres?.slice(0, 3).map((genre) => <span key={genre} className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] text-white/75">{genre}</span>)}
              </div>
              {item.Overview ? <p className="mt-5 line-clamp-4 max-w-2xl text-pretty text-sm leading-7 text-white/70 sm:text-base">{item.Overview}</p> : null}
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => {
                  const target = primaryEpisode ?? item
                  launchPlayback({
                    id: target.Id,
                    title: item.Name,
                    subtitle: isSeries && primaryEpisode ? `S${primaryEpisode.ParentIndexNumber ?? 1} E${primaryEpisode.IndexNumber ?? "—"} · ${primaryEpisode.Name}` : undefined,
                    backdrop: isSeries ? backdropImage(session.serverUrl, target, 1600) ?? backdrop : backdrop,
                    positionTicks: isSeries ? primaryEpisode?.UserData?.PlaybackPositionTicks : resumeTicks,
                    language: item.OriginalLanguage ?? item.Language,
                    durationTicks: isSeries ? primaryEpisode?.RunTimeTicks : item.RunTimeTicks,
                  })
                }} disabled={launching || (isSeries && !primaryEpisode)} className="min-w-40 rounded-full bg-white px-7 font-bold text-black shadow-xl shadow-black/20 transition hover:scale-[1.03] hover:bg-white/90 active:scale-95">
                  <Play className="size-4 fill-current" />{launching ? "Ouverture…" : resumeTicks > 0 ? (isSeries ? "Reprendre l’épisode" : "Reprendre") : isSeries ? "Lancer la série" : "Lecture"}
                </Button>
                {previewItem && (isLocalTrailer || isSeries) ? <Button size="lg" variant="outline" onClick={openPreview} className="rounded-full border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20"><Play className="size-4" />{isLocalTrailer ? "Bande-annonce" : resumedEpisode ? "Aperçu de l’épisode" : "Aperçu"}</Button> : null}
                <Button size="icon" variant="outline" aria-label="Partager" onClick={async () => {
                  const shareData = { title: item.Name, text: `Regarder ${item.Name} sur JFLX`, url: window.location.href }
                  if (navigator.share) await navigator.share(shareData).catch(() => undefined)
                  else await navigator.clipboard.writeText(window.location.href)
                  setShared(true)
                  window.setTimeout(() => setShared(false), 1800)
                }} className="size-11 rounded-full border-white/25 bg-black/20 text-white hover:bg-white/15"><Share2 className="size-4" /></Button>
                <Button size="lg" variant="outline" onClick={() => toggleFavorite(item.Id)} aria-pressed={preferences.favorites.includes(item.Id)} className="rounded-full border-white/25 bg-black/20 text-white hover:bg-white/15">
                  <Heart className={`size-4 ${preferences.favorites.includes(item.Id) ? "fill-[#e50914] text-[#e50914]" : ""}`} />{preferences.favorites.includes(item.Id) ? "Dans ma liste" : "Ma liste"}
                </Button>
                {shared ? <span role="status" className="self-center text-xs text-white/70">Lien copié</span> : null}
              </div>
              {resumePercent > 0 && resumePercent < 100 ? <div className="mt-5 max-w-md"><div className="mb-1.5 flex justify-between text-[11px] text-white/55"><span>Reprise de lecture</span><span>{resumePercent}%</span></div><div className="h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#f2bb55]" style={{ width: `${resumePercent}%` }} /></div></div> : null}
              <a href={isSeries ? "#episodes" : "#distribution"} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/50 transition hover:text-white/80"><ArrowDown className="size-3.5" />Explorer le contenu</a>
            </div>
            {poster ? <div className={`hidden justify-self-end transition duration-500 sm:block ${launching ? "scale-110 opacity-70" : "scale-100 opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster} alt={`Affiche de ${item.Name}`} crossOrigin="anonymous" className="aspect-[2/3] w-52 rounded-xl border border-white/15 object-cover shadow-[0_28px_90px_rgba(0,0,0,.65)] lg:w-60" />
            </div> : null}
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 sm:px-10">
        {item.Type === "Movie" ? <MovieAvailability mediaType="movie" tmdbId={item.ProviderIds?.Tmdb} title={item.Name} year={item.ProductionYear} cinemaConfigured={cinemaConfigured} /> : null}

        <div className="grid gap-10 border-b border-white/10 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section aria-labelledby="synopsis-title">
            <div className="mb-4 flex items-center gap-3"><span className="h-6 w-1 rounded-full bg-[#f2bb55]" /><h2 id="synopsis-title" className="text-xl font-bold tracking-tight">À propos</h2></div>
            {item.Overview ? <p className="max-w-4xl text-pretty text-sm leading-7 text-white/65 sm:text-base">{item.Overview}</p> : <p className="text-sm text-white/50">Aucun synopsis n’est disponible pour ce titre.</p>}
          </section>
          <dl className="grid content-start grid-cols-2 gap-x-5 gap-y-4 text-sm">
            {directors.length ? <div><dt className="text-xs text-white/40">Réalisation</dt><dd className="mt-1 text-white/80">{directors.map((director) => director.Name).join(", ")}</dd></div> : null}
            {writers.length ? <div><dt className="text-xs text-white/40">Scénario</dt><dd className="mt-1 text-white/80">{writers.map((writer) => writer.Name).join(", ")}</dd></div> : null}
            {item.Studios?.length ? <div><dt className="text-xs text-white/40">Studio</dt><dd className="mt-1 text-white/80">{item.Studios.map((studio) => studio.Name).join(", ")}</dd></div> : null}
            {item.OriginalLanguage || item.Language ? <div><dt className="text-xs text-white/40">Langue originale</dt><dd className="mt-1 text-white/80">{item.OriginalLanguage ?? item.Language}</dd></div> : null}
          </dl>
        </div>

        {cast.length ? <CastSection session={session} cast={cast} /> : null}
        {isSeries ? (
          <div id="episodes" className="scroll-mt-8 pt-10">
            <SeasonsSection session={session} seriesId={item.Id} seasons={seasons} onPlay={launchPlayback} />
          </div>
        ) : null}
      </main>

      {cachedPlayback ? (
        <VideoPlayer
          session={session}
          itemId={cachedPlayback.id}
          title={cachedPlayback.title}
          subtitle={cachedPlayback.subtitle}
          backdropUrl={cachedPlayback.backdrop ?? backdrop}
          startPositionTicks={cachedPlayback.positionTicks}
          durationTicks={cachedPlayback.durationTicks}
          language={cachedPlayback.language}
          previewMode={cachedPlayback.previewMode}
          previewDurationSeconds={cachedPlayback.previewDurationSeconds}
          isSeriesEpisode={isSeries && !cachedPlayback.previewMode}
          isOpen={Boolean(playing)}
          onClose={() => setPlaying(null)}
        />
      ) : null}
    </div>
  )
}

function CastSection({
  session,
  cast,
}: {
  session: JellyfinSession
  cast: BaseItem["People"]
}) {
  if (!cast?.length) return null
  return (
    <section id="distribution" aria-labelledby="distribution-title" className="mt-10 scroll-mt-8">
      <h2 id="distribution-title" className="mb-4 text-lg font-semibold">Distribution</h2>
      <ul className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {cast.slice(0, 30).map((person) => {
          const img = personImage(session.serverUrl, person, 200)
          return (
            <li key={`${person.Id}-${person.Role ?? ""}`} className="w-28 shrink-0">
              <Link href={`/people/${encodeURIComponent(person.Id)}?name=${encodeURIComponent(person.Name)}`} className="group/person block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border border-border bg-secondary transition group-hover/person:border-primary/60">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={`Portrait de ${person.Name}`}
                      crossOrigin="anonymous"
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover/person:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <User className="size-8" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium group-hover/person:text-primary" title={person.Name}>
                  {person.Name}
                </p>
                {person.Role ? (
                  <p className="truncate text-xs text-muted-foreground" title={person.Role}>
                    {person.Role}
                  </p>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SeasonsSection({
  session,
  seriesId,
  seasons,
  onPlay,
}: {
  session: JellyfinSession
  seriesId: string
  seasons: BaseItem[]
  onPlay: (t: PlayTarget) => void
}) {
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.Id ?? null)
  const { data: episodes, isLoading } = useSWR(
    activeSeason ? ["episodes", seriesId, activeSeason] : null,
    () => getEpisodes(session, seriesId, activeSeason as string),
    { keepPreviousData: true },
  )

  if (!seasons.length) return null
  const currentSeason = seasons.find((season) => season.Id === activeSeason)
  const inProgressCount = (episodes ?? []).filter((episode) => {
    const progress = episode.UserData?.PlayedPercentage ?? 0
    return progress > 0 && progress < 100
  }).length

  return (
    <section aria-labelledby="episodes-title" className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.045] via-[#101116] to-[#111216] p-4 shadow-[0_24px_80px_rgba(0,0,0,.22)] sm:p-7 lg:p-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.24em] text-[#f2bb55]"><Film className="size-3.5" />Explorer la série</p>
          <h2 id="episodes-title" className="text-2xl font-bold tracking-tight sm:text-3xl">Saisons et épisodes</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">Choisissez un épisode pour le lancer ou retrouver votre progression.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65">
          <Sparkles className="size-3.5 text-[#f2bb55]" />
          <span>{seasons.length} saison{seasons.length === 1 ? "" : "s"}</span>
          {episodes ? <><span aria-hidden="true" className="text-white/25">·</span><span>{episodes.length} épisode{episodes.length === 1 ? "" : "s"}</span></> : null}
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Choisir une saison">
        {seasons.map((season, index) => {
          const active = activeSeason === season.Id
          const finished = season.UserData?.PlayedPercentage === 100
          return (
            <button
              key={season.Id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveSeason(season.Id)}
              className={`group inline-flex min-h-12 shrink-0 items-center gap-3 rounded-2xl border px-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2bb55] ${active ? "border-[#f2bb55]/60 bg-[#f2bb55]/10 text-white shadow-[0_8px_30px_rgba(242,187,85,.09)]" : "border-white/10 bg-white/[.025] text-white/55 hover:border-white/25 hover:bg-white/[.06] hover:text-white"}`}
            >
              <span className={`flex size-8 items-center justify-center rounded-xl text-xs font-bold transition-colors ${active ? "bg-[#f2bb55] text-[#17130b]" : "bg-white/10 text-white/60 group-hover:bg-white/15"}`}>{index + 1}</span>
              <span className="text-sm font-semibold">{season.Name || `Saison ${index + 1}`}</span>
              {finished ? <Check className="size-4 text-emerald-300" aria-label="Saison terminée" /> : null}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="font-semibold text-white">{currentSeason?.Name ?? "Épisodes"}</h3>
          <p className="mt-1 text-xs text-white/45">{inProgressCount ? `${inProgressCount} épisode${inProgressCount === 1 ? "" : "s"} à reprendre` : "Votre prochaine séance commence ici"}</p>
        </div>
        {episodes?.length ? <span className="text-xs tabular-nums text-white/45">{episodes.length} épisodes</span> : null}
      </div>

      {isLoading && !episodes ? (
        <div role="status" className="grid gap-3 pt-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => <div key={index} className="flex gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-3"><div className="aspect-video w-32 shrink-0 animate-pulse rounded-xl bg-white/10" /><div className="flex flex-1 flex-col justify-center gap-3"><div className="h-3 w-2/3 animate-pulse rounded bg-white/10" /><div className="h-3 w-1/3 animate-pulse rounded bg-white/[.06]" /></div></div>)}
        </div>
      ) : (episodes ?? []).length ? (
        <ul key={activeSeason} className="grid gap-3 pt-4 sm:grid-cols-2">
          {(episodes ?? []).map((episode, index) => {
            const thumb = primaryImage(session.serverUrl, episode, 480)
            const progress = episode.UserData?.PlayedPercentage ?? 0
            const inProgress = progress > 0 && progress < 100
            const finished = episode.UserData?.Played || progress >= 100
            const episodeLabel = `S${String(episode.ParentIndexNumber ?? seasons.indexOf(currentSeason ?? seasons[0]) + 1).padStart(2, "0")} · E${String(episode.IndexNumber ?? index + 1).padStart(2, "0")}`
            return (
              <li key={episode.Id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
                <button
                  type="button"
                  onClick={() => onPlay({
                    id: episode.Id,
                    title: episode.SeriesName ?? episode.Name,
                    subtitle: `${episodeLabel} · ${episode.Name}`,
                    backdrop: backdropImage(session.serverUrl, episode, 1600),
                    positionTicks: episode.UserData?.PlaybackPositionTicks,
                    durationTicks: episode.RunTimeTicks,
                  })}
                  aria-label={`${inProgress ? "Reprendre" : "Lancer"} ${episodeLabel}, ${episode.Name}`}
                  className="group flex h-full w-full gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.055] hover:shadow-[0_16px_38px_rgba(0,0,0,.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2bb55] sm:gap-4"
                >
                  <span className="relative aspect-video w-[38%] max-w-44 shrink-0 self-start overflow-hidden rounded-xl bg-[#1d1e24]">
                    {thumb ? <img src={thumb} alt="" crossOrigin="anonymous" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center"><Film className="size-6 text-white/25" /></span>}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur">{episodeLabel}</span>
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"><span className="flex size-10 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform duration-200 group-hover:scale-110">{inProgress ? <Play className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}</span></span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col justify-center py-1">
                    <span className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-white/40">{episodeLabel}{episode.RunTimeTicks ? <><span aria-hidden="true">·</span><span>{ticksToTime(episode.RunTimeTicks)}</span></> : null}</span>
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-white transition-colors group-hover:text-[#f2bb55]">{episode.Name}</span>
                    {episode.Overview ? <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">{episode.Overview}</span> : null}
                    <span className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-white/55">{inProgress ? <><span className="size-1.5 rounded-full bg-[#f2bb55]" />Reprendre · {Math.round(progress)} %</> : finished ? <><Check className="size-3.5 text-emerald-300" />Déjà regardé</> : <>Lancer l&apos;épisode<ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></>}</span>
                    {inProgress ? <span className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-[#d59a3a] to-[#f2bb55] transition-[width] duration-700" style={{ width: `${Math.min(progress, 100)}%` }} /></span> : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="py-12 text-center text-sm text-white/45">Aucun épisode disponible dans cette saison.</p>
      )}
    </section>
  )
}
