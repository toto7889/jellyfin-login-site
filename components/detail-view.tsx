"use client"

import useSWR from "swr"
import { useState } from "react"
import { Heart, Loader2, Play, Star, User } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { VideoPlayer } from "@/components/video-player"
import { Button } from "@/components/ui/button"
import {
  backdropImage,
  getEpisodes,
  getItem,
  getSeasons,
  personImage,
  primaryImage,
  ticksToTime,
  type BaseItem,
  type JellyfinSession,
} from "@/lib/jellyfin"

export function DetailView({ itemId }: { itemId: string }) {
  const { session } = useJellyfin()
  if (!session) return null
  return <DetailContent session={session} itemId={itemId} />
}

type PlayTarget = {
  id: string
  title: string
  subtitle?: string
  backdrop?: string | null
  positionTicks?: number
}

function DetailContent({
  session,
  itemId,
}: {
  session: JellyfinSession
  itemId: string
}) {
  const { preferences, toggleFavorite } = useJellyfin()
  const [playing, setPlaying] = useState<PlayTarget | null>(null)

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

  if (isLoading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
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
  const resumeTicks = item.UserData?.PlaybackPositionTicks ?? 0
  const cast = (item.People ?? []).filter(
    (p) => p.Type === "Actor" || p.Type === "GuestStar",
  )
  const directors = (item.People ?? []).filter((p) => p.Type === "Director")
  const writers = (item.People ?? []).filter((p) => p.Type === "Writer")

  return (
    <div className="pb-16 netflix-fade-up">
      <div className="relative h-[40dvh] min-h-64 w-full overflow-hidden">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop || "/placeholder.svg"}
            alt=""
            crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="jf-gradient absolute inset-0 opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="mx-auto -mt-32 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster || "/placeholder.svg"}
              alt={item.Name}
              crossOrigin="anonymous"
              className="hidden aspect-[2/3] w-44 shrink-0 rounded-xl border border-white/10 object-cover shadow-2xl sm:block md:w-52"
            />
          ) : null}

          <div className="flex flex-col gap-3">
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {item.Name}
            </h1>
            {item.Taglines?.length ? (
              <p className="text-pretty text-sm italic text-muted-foreground">
                {item.Taglines[0]}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {item.ProductionYear ? <span>{item.ProductionYear}</span> : null}
              {item.RunTimeTicks ? (
                <span>{ticksToTime(item.RunTimeTicks)}</span>
              ) : null}
              {item.OfficialRating ? (
                <span className="rounded border border-border px-1.5 py-0.5 text-xs">
                  {item.OfficialRating}
                </span>
              ) : null}
              {item.CommunityRating ? (
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-primary text-primary" />
                  {item.CommunityRating.toFixed(1)}
                </span>
              ) : null}
            </div>

            {item.Genres?.length ? (
              <p className="text-sm text-muted-foreground">
                {item.Genres.join(" · ")}
              </p>
            ) : null}

            {!isSeries ? (
              <div className="mt-1 flex flex-wrap gap-2">
                <Button
                  size="lg"
                  onClick={() =>
                    setPlaying({
                      id: item.Id,
                      title: item.Name,
                      backdrop,
                      positionTicks: resumeTicks,
                    })
                  }
                >
                  <Play className="size-4 fill-current" />
                  {resumeTicks > 0 ? "Reprendre" : "Lire"}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => toggleFavorite(item.Id)}
                  aria-pressed={preferences.favorites.includes(item.Id)}
                >
                  <Heart className={`size-4 ${preferences.favorites.includes(item.Id) ? "fill-[#e50914] text-[#e50914]" : ""}`} />
                  {preferences.favorites.includes(item.Id) ? "Dans mes favoris" : "Ajouter aux favoris"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {item.Overview ? (
          <div className="mt-6 max-w-3xl">
            <h2 className="mb-2 text-lg font-semibold">Synopsis</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">
              {item.Overview}
            </p>
          </div>
        ) : null}

        {directors.length || writers.length || item.Studios?.length ? (
          <dl className="mt-6 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {directors.length ? (
              <div className="flex gap-2">
                <dt className="shrink-0 text-muted-foreground">Réalisation</dt>
                <dd>{directors.map((d) => d.Name).join(", ")}</dd>
              </div>
            ) : null}
            {writers.length ? (
              <div className="flex gap-2">
                <dt className="shrink-0 text-muted-foreground">Scénario</dt>
                <dd>{writers.map((w) => w.Name).join(", ")}</dd>
              </div>
            ) : null}
            {item.Studios?.length ? (
              <div className="flex gap-2">
                <dt className="shrink-0 text-muted-foreground">Studio</dt>
                <dd>{item.Studios.map((s) => s.Name).join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {cast.length ? (
          <CastSection session={session} cast={cast} />
        ) : null}

        {isSeries ? (
          <SeasonsSection
            session={session}
            seriesId={item.Id}
            seasons={seasons}
            onPlay={setPlaying}
          />
        ) : null}
      </div>

      {playing ? (
        <VideoPlayer
          session={session}
          itemId={playing.id}
          title={playing.title}
          subtitle={playing.subtitle}
          backdropUrl={playing.backdrop ?? backdrop}
          startPositionTicks={playing.positionTicks}
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
    <div className="mt-10">
      <h2 className="mb-4 text-lg font-semibold">Distribution</h2>
      <ul className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {cast.slice(0, 30).map((person) => {
          const img = personImage(session.serverUrl, person, 200)
          return (
            <li key={`${person.Id}-${person.Role ?? ""}`} className="w-28 shrink-0">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border border-border bg-secondary">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img || "/placeholder.svg"}
                    alt={person.Name}
                    crossOrigin="anonymous"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User className="size-8" />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-medium" title={person.Name}>
                {person.Name}
              </p>
              {person.Role ? (
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={person.Role}
                >
                  {person.Role}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
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
  )

  if (!seasons.length) return null

  return (
    <div className="mt-10 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Épisodes</h2>
      <div className="flex flex-wrap gap-2">
        {seasons.map((s) => (
          <button
            key={s.Id}
            type="button"
            onClick={() => setActiveSeason(s.Id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeSeason === s.Id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            }`}
          >
            {s.Name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {(episodes ?? []).map((ep) => {
            const thumb = primaryImage(session.serverUrl, ep, 320)
            return (
              <li key={ep.Id}>
                <button
                  type="button"
                  onClick={() =>
                    onPlay({
                      id: ep.Id,
                      title: ep.SeriesName ?? ep.Name,
                      subtitle:
                        ep.IndexNumber != null
                          ? `S${ep.ParentIndexNumber ?? 1} E${ep.IndexNumber} · ${ep.Name}`
                          : ep.Name,
                      backdrop: backdropImage(session.serverUrl, ep, 1600),
                      positionTicks: ep.UserData?.PlaybackPositionTicks,
                    })
                  }
                  className="flex w-full items-center gap-4 bg-card p-3 text-left transition-colors hover:bg-secondary"
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb || "/placeholder.svg"}
                        alt=""
                        crossOrigin="anonymous"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <span className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 transition-opacity hover:opacity-100">
                      <Play className="size-6 fill-white text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {ep.IndexNumber != null ? `${ep.IndexNumber}. ` : ""}
                      {ep.Name}
                    </p>
                    {ep.RunTimeTicks ? (
                      <p className="text-xs text-muted-foreground">
                        {ticksToTime(ep.RunTimeTicks)}
                      </p>
                    ) : null}
                    {ep.Overview ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {ep.Overview}
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
