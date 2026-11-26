"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Clock3, Film, Star } from "lucide-react"
import { MovieAvailability } from "@/components/movie-availability"

type TitleData = {
  id: number
  mediaType: "movie" | "tv"
  title: string
  overview: string
  year: string
  runtime: number | null
  rating: number | null
  genres: string[]
  poster: string | null
  backdrop: string | null
  tmdbLink: string
}

async function fetchTitle(url: string): Promise<TitleData> {
  const response = await fetch(url)
  const result = await response.json() as TitleData & { error?: string }
  if (!response.ok) throw new Error(result.error ?? "Impossible de charger ce titre.")
  return result
}

export function TmdbTitleView({ mediaType, id, cinemaConfigured }: { mediaType: "movie" | "tv"; id: string; cinemaConfigured: boolean }) {
  const { data, error, isLoading } = useSWR<TitleData>(`/api/tmdb/title?type=${mediaType}&id=${encodeURIComponent(id)}&region=FR`, fetchTitle, { revalidateOnFocus: false })
  if (isLoading) return <main className="min-h-[70vh] bg-[#08090c] px-5 py-12 text-white"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-[50vh] rounded-3xl bg-white/[.06]" /><div className="mt-8 h-8 w-1/3 rounded bg-white/[.06]" /></div></main>
  if (error || !data) return <main className="min-h-[70vh] bg-[#08090c] px-5 py-24 text-center text-white"><h1 className="text-2xl font-bold">Titre indisponible</h1><p className="mt-3 text-sm text-white/55">{error?.message ?? "Ce titre n’a pas été trouvé sur TMDB."}</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm hover:bg-white/10">Retour au catalogue</Link></main>

  return <main className="min-h-screen bg-[#08090c] pb-20 text-white">
    <section className="relative isolate flex min-h-[68vh] items-end overflow-hidden border-b border-white/10 px-5 pb-10 pt-20 sm:px-10 sm:pb-14">
      {data.backdrop ? <img src={data.backdrop} alt="" crossOrigin="anonymous" fetchPriority="high" className="absolute inset-0 size-full object-cover opacity-35" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[#08090c] via-[#08090c]/85 to-[#08090c]/35" /><div className="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/15 to-[#08090c]/20" />
      <div className="relative mx-auto w-full max-w-7xl">
        <Link href="/cast" className="mb-8 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 text-xs text-white/75 backdrop-blur hover:bg-white/10"><ArrowLeft className="size-4" />Retour à la distribution</Link>
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#f2bb55]"><Film className="size-4" />Découverte TMDB · Hors bibliothèque</p>
        <h1 className="max-w-4xl text-balance text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">{data.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/65">{data.year ? <span>{data.year}</span> : null}{data.runtime ? <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{data.runtime} min</span> : null}{data.rating ? <span className="inline-flex items-center gap-1.5 text-[#f2bb55]"><Star className="size-4 fill-current" />{data.rating.toFixed(1)}</span> : null}{data.genres.map((genre) => <span key={genre} className="rounded-full border border-white/15 px-3 py-1 text-xs">{genre}</span>)}</div>
        {data.overview ? <p className="mt-6 max-w-2xl text-pretty text-sm leading-7 text-white/70 sm:text-base">{data.overview}</p> : null}
      </div>
    </section>
    <div className="mx-auto max-w-7xl px-5 sm:px-10">
      <MovieAvailability mediaType={mediaType} tmdbId={String(data.id)} title={data.title} year={data.year} showShowtimes={mediaType === "movie"} cinemaConfigured={cinemaConfigured} />
      <p className="mt-7 text-center text-xs text-white/40">Données du film et disponibilités fournies par <a href={data.tmdbLink} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white">TMDB</a>. Les disponibilités sont issues de JustWatch.</p>
    </div>
  </main>
}
