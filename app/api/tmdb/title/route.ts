import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const TMDB_API = "https://api.themoviedb.org/3"
const IMAGE_BASE = "https://image.tmdb.org/t/p"
const ALLOWED_TYPES = new Set(["movie", "tv"])

async function tmdbFetch<T>(path: string, apiKey: string): Promise<T> {
  const separator = path.includes("?") ? "&" : "?"
  const response = await fetch(`${TMDB_API}${path}${separator}api_key=${encodeURIComponent(apiKey)}&language=fr-FR`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  })
  if (!response.ok) throw new Error(`TMDB returned ${response.status}`)
  return response.json() as Promise<T>
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return NextResponse.json({ error: "TMDB_API_KEY_NOT_CONFIGURED" }, { status: 503 })

  const params = request.nextUrl.searchParams
  const mediaType = params.get("type") ?? "movie"
  const requestedId = params.get("id")?.trim()
  const name = params.get("name")?.trim().slice(0, 120)
  const year = params.get("year")?.trim()
  const region = (params.get("region") ?? "FR").toUpperCase()
  if (!ALLOWED_TYPES.has(mediaType)) return NextResponse.json({ error: "Type de contenu invalide." }, { status: 400 })
  if (!/^[A-Z]{2}$/.test(region)) return NextResponse.json({ error: "Région invalide." }, { status: 400 })
  if (requestedId && !/^\d{1,12}$/.test(requestedId)) return NextResponse.json({ error: "Identifiant TMDB invalide." }, { status: 400 })
  if (!requestedId && !name) return NextResponse.json({ error: "Un identifiant ou un titre est requis." }, { status: 400 })

  try {
    let id = requestedId ?? ""
    if (!id && name) {
      const query = new URLSearchParams({ query: name, include_adult: "false" })
      if (year && /^\d{4}$/.test(year)) query.set(mediaType === "movie" ? "year" : "first_air_date_year", year)
      const search = await tmdbFetch<{ results?: Array<{ id: number }> }>(`/search/${mediaType}?${query.toString()}`, apiKey)
      id = String(search.results?.[0]?.id ?? "")
    }
    if (!id) return NextResponse.json({ error: "Aucun titre correspondant n’a été trouvé sur TMDB." }, { status: 404 })

    const [details, providerResponse] = await Promise.all([
      tmdbFetch<Record<string, unknown>>(`/${mediaType}/${id}`, apiKey),
      tmdbFetch<{ results?: Record<string, { link?: string; flatrate?: Provider[]; free?: Provider[]; ads?: Provider[]; rent?: Provider[]; buy?: Provider[] }> }>(`/${mediaType}/${id}/watch/providers`, apiKey),
    ])
    const providerData = providerResponse.results?.[region]
    const title = String(details.title ?? details.name ?? name ?? "Titre sans nom")
    const releaseDate = String(details.release_date ?? details.first_air_date ?? "")
    const providers = ["flatrate", "free", "ads", "rent", "buy"].flatMap((category) => {
      const categoryProviders = providerData?.[category as keyof typeof providerData]
      if (!Array.isArray(categoryProviders)) return []
      return categoryProviders.map((provider) => ({
        id: provider.provider_id,
        name: provider.provider_name,
        logo: provider.logo_path ? `${IMAGE_BASE}/w92${provider.logo_path}` : null,
        category,
      }))
    })

    return NextResponse.json({
      id: Number(id),
      mediaType,
      title,
      originalTitle: details.original_title ?? details.original_name ?? null,
      overview: details.overview ?? "",
      releaseDate,
      year: releaseDate.slice(0, 4),
      runtime: details.runtime ?? (Array.isArray(details.episode_run_time) ? details.episode_run_time[0] : null),
      rating: typeof details.vote_average === "number" ? details.vote_average : null,
      genres: Array.isArray(details.genres) ? details.genres.map((genre) => (genre as { name: string }).name) : [],
      poster: details.poster_path ? `${IMAGE_BASE}/w500${details.poster_path}` : null,
      backdrop: details.backdrop_path ? `${IMAGE_BASE}/w1280${details.backdrop_path}` : null,
      region,
      providers,
      providerLink: providerData?.link ?? `https://www.themoviedb.org/${mediaType}/${id}/watch?locale=${region}`,
      tmdbLink: `https://www.themoviedb.org/${mediaType}/${id}?language=fr-FR`,
    }, { headers: { "Cache-Control": "private, max-age=1800" } })
  } catch {
    return NextResponse.json({ error: "Les informations TMDB sont temporairement indisponibles." }, { status: 502 })
  }
}

type Provider = { provider_id: number; provider_name: string; logo_path?: string | null }
