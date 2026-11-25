"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowRight, Clock3, Film, Loader2, Tv } from "lucide-react"
import { MediaRow } from "@/components/media-row"
import { useJellyfin } from "@/components/jellyfin-provider"
import { Button } from "@/components/ui/button"
import { getResumeItems, type JellyfinSession } from "@/lib/jellyfin"

export function ResumeView() {
  const { session } = useJellyfin()
  if (!session) return null

  return <ResumeContent session={session} />
}

function ResumeContent({ session }: { session: JellyfinSession }) {
  const { data, error, isLoading, mutate } = useSWR(
    ["resume", session.userId],
    () => getResumeItems(session),
    { revalidateOnMount: true, revalidateOnFocus: true, dedupingInterval: 5_000 },
  )

  return (
    <main className="min-h-[calc(100dvh-68px)] bg-[#090a0d] pb-24 text-white">
      <section className="relative overflow-hidden border-b border-white/[.08]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,167,106,.16),transparent_55%),linear-gradient(110deg,#121318,#090a0d_65%)]" />
        <div className="relative mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-12 sm:px-7 sm:py-16 lg:px-10">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.22em] text-[#d9a76a]"><Clock3 className="size-4" />Votre espace de lecture</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Reprendre la lecture</h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">Retrouvez vos films et épisodes exactement là où vous les avez laissés.</p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 py-8">
        {isLoading ? (
          <div role="status" className="flex items-center justify-center gap-3 px-4 py-20 text-sm text-white/60"><Loader2 className="size-5 animate-spin" />Chargement de vos lectures en cours<span className="sr-only">…</span></div>
        ) : error ? (
          <div role="alert" className="mx-4 rounded-2xl border border-white/10 bg-white/[.04] p-6 text-sm text-white/70 sm:mx-7 lg:mx-10">
            <p>Impossible de récupérer vos lectures en cours depuis Jellyfin.</p>
            <Button variant="outline" className="mt-4 border-white/15 text-white hover:bg-white/10" onClick={() => void mutate()}>Réessayer</Button>
          </div>
        ) : data?.length ? (
          <MediaRow title={`${data.length} titre${data.length > 1 ? "s" : ""} à continuer`} items={data} session={session} variant="wide" />
        ) : (
          <div className="mx-4 flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-white/[.025] px-6 py-14 text-center sm:mx-7 lg:mx-10">
            <Clock3 className="size-10 text-white/35" />
            <h2 className="mt-5 text-xl font-semibold">Rien à reprendre pour le moment</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">Démarrez un film ou un épisode : votre progression sera enregistrée pour le retrouver ici.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/films" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-110"><Film className="size-4" />Explorer les films<ArrowRight className="size-4" /></Link>
              <Link href="/series" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-white transition hover:bg-white/10"><Tv className="size-4" />Explorer les séries</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
