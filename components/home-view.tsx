"use client"

import Link from "next/link"
import useSWR from "swr"
import { Loader2, Play, Library, Film, Tv, Clapperboard } from "lucide-react"
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
    { dedupingInterval: 60_000, revalidateOnFocus: false, keepPreviousData: true },
  )

  if (isLoading) return <HomeSkeleton />

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
    <div className="min-h-screen bg-[#090a0d] pb-24 text-white netflix-fade-up">
      {hero ? <Hero item={hero} session={session} /> : <div className="mx-auto flex min-h-[48dvh] max-w-5xl flex-col items-center justify-center px-6 text-center"><Library className="size-12 text-white/35" /><h1 className="mt-5 text-3xl font-semibold">Bienvenue dans votre cinéma</h1><p className="mt-2 max-w-lg text-sm text-white/55">Ajoutez des bibliothèques Jellyfin pour retrouver ici vos films et séries.</p></div>}
      <main className="mx-auto flex max-w-[1600px] flex-col gap-10 pt-8">
      <section className="flex flex-wrap items-end justify-between gap-4 px-4 sm:px-7 lg:px-10"><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#d9a76a]"><Clapperboard className="size-4" />Votre univers Jellyfin</p><h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">À la une</h2><p className="mt-2 text-sm text-white/50">Films et séries, réunis au même endroit.</p></div><div className="flex flex-wrap gap-2"><Link href="/films" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-4 text-sm text-white/75 transition hover:bg-white/10"><Film className="size-4" />Films</Link><Link href="/series" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-4 text-sm text-white/75 transition hover:bg-white/10"><Tv className="size-4" />Séries</Link></div></section>
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
      </main>
    </div>
  )
}

function HomeSkeleton() {
  return <main role="status" aria-label="Chargement de votre médiathèque" className="min-h-screen animate-in fade-in bg-[#090a0d] px-4 pb-24 text-white sm:px-7 lg:px-10"><div className="mx-auto max-w-[1600px]"><div className="mb-8 h-[50dvh] min-h-72 animate-pulse rounded-3xl bg-[linear-gradient(110deg,#121318_8%,#20212a_18%,#121318_33%)] bg-[length:200%_100%]" /><div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/10" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-xl bg-white/[.06]" />)}</div><span className="sr-only"><Loader2 className="size-4 animate-spin" />Chargement de la médiathèque</span></div></main>
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
          loading="eager"
          fetchPriority="high"
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
          <Link href={`/item/${item.Id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            <Play className="size-4 fill-current" />
            {item.UserData?.PlaybackPositionTicks ? "Reprendre" : "Lire"}
          </Link>
          <Link href={`/item/${item.Id}`} className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-6 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80">Détails</Link>
        </div>
      </div>
    </section>
  )
}
