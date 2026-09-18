"use client"

import Link from "next/link"
import useSWR from "swr"
import { Loader2, Play, Library } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { MediaRow } from "@/components/media-row"
import { Button } from "@/components/ui/button"
import {
  backdropImage,
  getLatest,
  getResumeItems,
  getViews,
  type BaseItem,
  type JellyfinSession,
} from "@/lib/jellyfin"

export function HomeView() {
  const { session } = useJellyfin()
  if (!session) return null
  return <HomeContent session={session} />
}

function HomeContent({ session }: { session: JellyfinSession }) {
  const { data, error, isLoading } = useSWR(
    ["home", session.userId],
    async () => {
      const [resume, views] = await Promise.all([
        getResumeItems(session),
        getViews(session),
      ])

      const mediaViews = views.filter(
        (v) =>
          v.CollectionType === "movies" ||
          v.CollectionType === "tvshows" ||
          v.CollectionType === "boxsets",
      )

      const latestByView = await Promise.all(
        mediaViews.map(async (v) => ({
          view: v,
          items: await getLatest(session, v.Id, 16),
        })),
      )

      return { resume, views: mediaViews, latestByView }
    },
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-foreground">
          Impossible de charger la médiathèque.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      </div>
    )
  }

  if (!data) return null

  const hero =
    data.resume[0] ?? data.latestByView.flatMap((l) => l.items)[0] ?? null

  return (
    <div className="flex flex-col gap-10 pb-20 netflix-fade-up">
      {hero ? <Hero item={hero} session={session} /> : <div className="h-4" />}

      <MediaRow
        title="Reprendre la lecture"
        items={data.resume}
        session={session}
        variant="wide"
      />

      {data.views.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="px-4 text-lg font-semibold sm:px-6">Bibliothèques</h2>
          <div className="flex flex-wrap gap-3 px-4 sm:px-6">
            {data.views.map((v) => (
              <Link
                key={v.Id}
                href={`/library/${v.Id}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary/60 hover:bg-secondary"
              >
                <Library className="size-4 text-primary" />
                {v.Name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {data.latestByView.map(({ view, items }) => (
        <MediaRow
          key={view.Id}
          title={`Récemment ajouté · ${view.Name}`}
          items={items}
          session={session}
          variant="poster"
        />
      ))}
    </div>
  )
}

function Hero({ item, session }: { item: BaseItem; session: JellyfinSession }) {
  const backdrop = backdropImage(session.serverUrl, item, 1600)

  return (
    <section className="relative h-[58dvh] min-h-96 w-full overflow-hidden netflix-scale-in">
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
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end gap-4 px-4 pb-8 sm:px-6">
        <h1 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">
          {item.SeriesName ?? item.Name}
        </h1>
        {item.Overview ? (
          <p className="line-clamp-2 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            {item.Overview}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Button asChild size="lg">
            <Link href={`/item/${item.Id}`}>
              <Play className="size-4 fill-current" />
              {item.UserData?.PlaybackPositionTicks
                ? "Reprendre"
                : "Lire"}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={`/item/${item.Id}`}>Détails</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
