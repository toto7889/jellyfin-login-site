"use client"

import useSWR from "swr"
import { useMemo, useState } from "react"
import { Loader2, Play, Radio, Tv } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { VideoPlayer } from "@/components/video-player"
import {
  formatClock,
  getLiveTvChannels,
  getLiveTvPrograms,
  primaryImage,
  programProgress,
  type BaseItem,
  type JellyfinSession,
} from "@/lib/jellyfin"

export function TvView() {
  const { session } = useJellyfin()
  if (!session) return null
  return <TvContent session={session} />
}

type PlayTarget = { id: string; title: string; subtitle?: string }

function TvContent({ session }: { session: JellyfinSession }) {
  const [playing, setPlaying] = useState<PlayTarget | null>(null)

  const { data, error, isLoading } = useSWR(
    ["livetv", session.userId],
    async () => {
      const channels = await getLiveTvChannels(session)
      const programs = await getLiveTvPrograms(
        session,
        channels.map((c) => c.Id),
      )
      return { channels, programs }
    },
  )

  const programsByChannel = useMemo(() => {
    const map = new Map<string, BaseItem[]>()
    for (const p of data?.programs ?? []) {
      const key = p.ChannelId ?? ""
      const list = map.get(key) ?? []
      list.push(p)
      map.set(key, list)
    }
    return map
  }, [data])

  if (isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data || data.channels.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <Tv className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Aucune chaîne TV</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La TV en direct n&apos;est pas configurée sur ce serveur Jellyfin, ou
          aucune chaîne n&apos;est disponible pour votre compte.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="jf-gradient flex size-9 items-center justify-center rounded-lg">
          <Radio className="size-5 text-white" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guide TV</h1>
          <p className="text-sm text-muted-foreground">
            {data.channels.length} chaînes en direct
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {data.channels.map((channel) => {
          const logo = primaryImage(session.serverUrl, channel, 160)
          const progs = programsByChannel.get(channel.Id) ?? []
          const current = progs[0] ?? channel.CurrentProgram
          const upcoming = progs.slice(1, 4)
          const progress = current
            ? programProgress(current.StartDate, current.EndDate)
            : 0

          return (
            <li
              key={channel.Id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
                <button
                  type="button"
                  onClick={() =>
                    setPlaying({
                      id: channel.Id,
                      title: channel.Name,
                      subtitle: current?.Name,
                    })
                  }
                  className="group flex shrink-0 items-center gap-3 sm:w-48"
                >
                  <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo || "/placeholder.svg"}
                        alt=""
                        crossOrigin="anonymous"
                        loading="lazy"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Tv className="size-6 text-muted-foreground" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="size-6 fill-white text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 text-left">
                    {channel.ChannelNumber ? (
                      <p className="text-xs text-muted-foreground">
                        {channel.ChannelNumber}
                      </p>
                    ) : null}
                    <p className="truncate font-medium">{channel.Name}</p>
                  </div>
                </button>

                <div className="min-w-0 flex-1 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  {current ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          En direct
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatClock(current.StartDate)} –{" "}
                          {formatClock(current.EndDate)}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-medium">
                        {current.Name}
                      </p>
                      {current.EpisodeTitle ? (
                        <p className="truncate text-sm text-muted-foreground">
                          {current.EpisodeTitle}
                        </p>
                      ) : null}
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Programme indisponible
                    </p>
                  )}

                  {upcoming.length ? (
                    <ul className="mt-3 flex flex-col gap-1 text-sm">
                      {upcoming.map((p) => (
                        <li key={p.Id} className="flex gap-3">
                          <span className="shrink-0 text-muted-foreground">
                            {formatClock(p.StartDate)}
                          </span>
                          <span className="truncate text-foreground/80">
                            {p.Name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {playing ? (
        <VideoPlayer
          session={session}
          itemId={playing.id}
          title={playing.title}
          subtitle={playing.subtitle}
          onClose={() => setPlaying(null)}
        />
      ) : null}
    </div>
  )
}
