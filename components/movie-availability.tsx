"use client"

import { useState } from "react"
import useSWR from "swr"
import useSWRInfinite from "swr/infinite"
import { CalendarDays, Clapperboard, ExternalLink, MapPin, Play, Radio } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type MovieData = {
  id: number
  mediaType: "movie" | "tv"
  title: string
  originalTitle: string | null
  overview: string
  releaseDate: string
  year: string
  runtime: number | null
  rating: number | null
  genres: string[]
  poster: string | null
  backdrop: string | null
  region: string
  providers: Array<{ id: number; name: string; logo: string | null; category: string }>
  providerLink: string
  tmdbLink: string
}

type Showtime = {
  id?: string
  startsAt?: string
  format?: string
  version?: string
  bookingLink?: string | null
  bookingUrl?: string | null
  cinema?: { name?: string; city?: string; address?: string; distanceKm?: number; timezone?: string }
}

const REGION_OPTIONS = [
  ["FR", "France"], ["US", "États-Unis"], ["GB", "Royaume-Uni"], ["CA", "Canada"],
  ["AU", "Australie"], ["DE", "Allemagne"], ["ES", "Espagne"], ["IT", "Italie"],
] as const
const CATEGORY_LABEL: Record<string, string> = { flatrate: "Streaming", free: "Gratuit", ads: "Avec publicité", rent: "Location", buy: "Achat" }

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? "Une erreur est survenue.")
  return result
}

function localTime(value: string | undefined) {
  if (!value) return "Horaire à confirmer"
  const date = value.slice(0, 10).split("-").reverse().join("/")
  return `${date} · ${value.slice(11, 16)}`
}

export function MovieAvailability({
  mediaType = "movie",
  tmdbId,
  title,
  year,
  showShowtimes = true,
  cinemaConfigured = false,
}: {
  mediaType?: "movie" | "tv"
  tmdbId?: string
  title: string
  year?: number | string
  showShowtimes?: boolean
  cinemaConfigured?: boolean
}) {
  const [region, setRegion] = useState("FR")
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState("")
  const query = new URLSearchParams({ type: mediaType, region })
  if (tmdbId) query.set("id", tmdbId)
  else {
    query.set("name", title)
    if (year) query.set("year", String(year))
  }
  const { data, error, isLoading } = useSWR<MovieData>(`/api/tmdb/title?${query.toString()}`, readJson, { revalidateOnFocus: false, dedupingInterval: 3_600_000 })
  const showtimeUrl = data && position && cinemaConfigured
    ? `/api/cinema/showtimes?tmdbId=${data.id}&lat=${position.lat}&lng=${position.lng}`
    : null
  const { data: showtimePages, error: showtimeError, isLoading: showtimesLoading, setSize: loadMoreShowtimes, size: showtimePageCount } = useSWRInfinite<{ data: Showtime[]; nextCursor: string | null }>(
    (pageIndex, previousPageData) => {
      if (!showtimeUrl || (pageIndex > 0 && !previousPageData?.nextCursor)) return null
      return pageIndex === 0 ? showtimeUrl : `${showtimeUrl}&cursor=${encodeURIComponent(previousPageData?.nextCursor ?? "")}`
    },
    readJson,
    { revalidateOnFocus: false },
  )
  const showtimes = showtimePages?.flatMap((page) => page.data) ?? []
  const hasMoreShowtimes = Boolean(showtimePages?.[showtimePages.length - 1]?.nextCursor)

  function findNearbyShowtimes() {
    setLocationError("")
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n’est pas disponible dans ce navigateur.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPosition({ lat: coords.latitude, lng: coords.longitude }),
      () => setLocationError("Position non partagée. Autorisez la géolocalisation pour trouver les séances à proximité."),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return <section className="mt-10 grid gap-5 lg:grid-cols-2" aria-label="Disponibilité du titre">
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.06] to-white/[.02] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#f2bb55]"><Play className="size-3.5" />Où regarder</p><h2 className="text-xl font-bold">Plateformes disponibles</h2></div>
        <label className="flex items-center gap-2 text-xs text-white/60">Pays
          <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="Pays pour la disponibilité des plateformes" className="min-h-10 rounded-lg border border-white/15 bg-[#111216] px-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#f2bb55]">
            {REGION_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
      </div>
      {isLoading ? <div className="mt-5 grid grid-cols-3 gap-3" role="status" aria-label="Chargement des plateformes">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20 rounded-xl bg-white/10" />)}</div> : error ? <Alert className="mt-5 border-amber-200/20 bg-amber-100/[.04] text-white"><AlertTitle>Disponibilité indisponible</AlertTitle><AlertDescription className="text-white/60">{error.message === "TMDB_API_KEY_NOT_CONFIGURED" ? "La clé TMDB du serveur doit être configurée." : error.message}</AlertDescription></Alert> : data?.providers.length ? <div className="mt-5 flex flex-col gap-5">{["flatrate", "free", "ads", "rent", "buy"].map((category) => {
        const providers = data.providers.filter((provider) => provider.category === category)
        if (!providers.length) return null
        return <div key={category}><p className="mb-2 text-xs font-medium text-white/50">{CATEGORY_LABEL[category]}</p><div className="flex flex-wrap gap-2">{providers.map((provider) => <div key={`${category}-${provider.id}`} title={provider.name} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2">{provider.logo ? <img src={provider.logo} alt="" loading="lazy" className="size-8 rounded-md" /> : <Play aria-hidden="true" className="size-4 text-white/50" />}<span className="max-w-36 text-xs text-white/80">{provider.name}</span></div>)}</div></div>
      })}<a href={data.providerLink} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 text-xs text-white/55 underline decoration-white/25 underline-offset-4 hover:text-white">Voir les liens de visionnage sur TMDB <ExternalLink className="size-3.5" /></a><p className="text-[11px] text-white/35">Disponibilités fournies par JustWatch via TMDB. Elles peuvent varier selon le pays.</p></div> : <p className="mt-5 rounded-xl border border-white/10 bg-black/15 px-4 py-5 text-sm text-white/55">Aucune plateforme de streaming, location ou achat n’est répertoriée pour ce titre dans cette région.</p>}
    </div>

    {showShowtimes ? <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.06] to-white/[.02] p-5 sm:p-7">
      <div className="mb-5"><p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#f2bb55]"><Clapperboard className="size-3.5" />Sur grand écran</p><h2 className="text-xl font-bold">Séances près de vous</h2><p className="mt-2 text-sm leading-6 text-white/50">Horaires publiés par les cinémas, dans un rayon de 10 km. Votre position n’est demandée qu’après votre action.</p></div>
      {!cinemaConfigured ? <Alert className="border-white/10 bg-black/15 text-white"><AlertTitle>Horaires cinéma indisponibles</AlertTitle><AlertDescription className="text-white/55">Aucune séance n’est simulée. Configurez une source de données de cinémas pour activer les horaires réels et la recherche par position.</AlertDescription></Alert> : !position ? <div className="rounded-2xl border border-dashed border-white/15 px-4 py-5"><div className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-[#f2bb55]" /><div><p className="text-sm font-medium">Partagez votre position pour chercher les cinémas proches.</p><p className="mt-1 text-xs leading-5 text-white/45">Les coordonnées servent uniquement à cette recherche et ne sont pas enregistrées.</p></div></div><Button type="button" onClick={findNearbyShowtimes} className="mt-4 rounded-full bg-white text-black hover:bg-white/90"><MapPin data-icon="inline-start" />Trouver les séances</Button>{locationError ? <p role="alert" className="mt-3 text-xs text-amber-100/80">{locationError}</p> : null}</div> : showtimesLoading ? <div role="status" aria-label="Recherche de séances" className="flex items-center gap-2 text-sm text-white/55"><Radio className="size-4 animate-pulse" />Recherche des horaires près de vous…</div> : showtimeError ? <Alert className="border-amber-200/20 bg-amber-100/[.04] text-white"><AlertTitle>Les séances ne sont pas configurées</AlertTitle><AlertDescription className="text-white/60">{showtimeError.message === "CINEMA_API_KEY_NOT_CONFIGURED" ? "Les horaires réels nécessitent une clé API Cinéma côté serveur. Les séances ne sont pas simulées." : showtimeError.message}</AlertDescription></Alert> : showtimes.length ? <div><ul className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1">{showtimes.map((showtime, index) => <li key={showtime.id ?? `${showtime.cinema?.name}-${showtime.startsAt}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{showtime.cinema?.name ?? "Cinéma"}</p><p className="mt-1 text-xs text-white/45">{[showtime.cinema?.city, showtime.cinema?.distanceKm != null ? `${showtime.cinema.distanceKm.toFixed(1)} km` : null].filter(Boolean).join(" · ")}</p></div><Badge variant="outline" className="border-white/20 text-white/70"><CalendarDays data-icon="inline-start" />{localTime(showtime.startsAt)}</Badge></div><p className="mt-3 text-xs text-white/50">{[showtime.format, showtime.version].filter(Boolean).join(" · ") || "Séance"}{showtime.cinema?.timezone ? ` · Heure locale (${showtime.cinema.timezone})` : ""}</p>{showtime.bookingLink || showtime.bookingUrl ? <a href={showtime.bookingLink ?? showtime.bookingUrl ?? "#"} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-medium text-[#f2bb55] hover:text-white">Réserver <ExternalLink className="size-3.5" /></a> : null}</li>)}</ul>{hasMoreShowtimes ? <Button type="button" variant="outline" disabled={showtimesLoading} onClick={() => loadMoreShowtimes(showtimePageCount + 1)} className="mt-3 w-full rounded-full border-white/15 text-white hover:bg-white/10">Afficher les séances suivantes</Button> : null}</div> : <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-5 text-sm text-white/55">Aucune séance à proximité n’est actuellement répertoriée.</p>}
    </div> : null}
  </section>
}
