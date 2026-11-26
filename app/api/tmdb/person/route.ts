import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const TMDB_API = "https://api.themoviedb.org/3"
const TMDB_IMAGES = "https://image.tmdb.org/t/p/w500"

type TmdbSearchResult = { id: number; name: string; profile_path?: string | null }
type TmdbCredit = {
  id: number
  media_type: "movie" | "tv"
  title?: string
  name?: string
  character?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  overview?: string
}

async function tmdbFetch<T>(path: string, apiKey: string): Promise<T> {
  const separator = path.includes("?") ? "&" : "?"
  const response = await fetch(`${TMDB_API}${path}${separator}api_key=${encodeURIComponent(apiKey)}&language=fr-FR`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86_400 },
  })
  if (!response.ok) throw new Error(`TMDB returned ${response.status}`)
  return response.json() as Promise<T>
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim().slice(0, 120)
  const requestedTmdbId = request.nextUrl.searchParams.get("tmdbId")
  if (!name) return NextResponse.json({ error: "Un nom d’acteur est requis." }, { status: 400 })

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return NextResponse.json({ error: "TMDB_API_KEY_NOT_CONFIGURED" }, { status: 503 })

  try {
    let personId = requestedTmdbId && /^\d{1,12}$/.test(requestedTmdbId) ? Number(requestedTmdbId) : 0
    if (!personId) {
      const query = new URLSearchParams({ query: name, include_adult: "false" })
      const search = await tmdbFetch<{ results: TmdbSearchResult[] }>(`/search/person?${query.toString()}`, apiKey)
      personId = search.results?.[0]?.id ?? 0
    }
    if (!personId) return NextResponse.json({ name, credits: [] })

    const result = await tmdbFetch<{ cast?: TmdbCredit[] }>(`/person/${personId}/combined_credits`, apiKey)
    const credits = (result.cast ?? [])
      .filter((credit) => (credit.media_type === "movie" || credit.media_type === "tv") && (credit.title || credit.name))
      .map((credit) => ({
        id: credit.id,
        mediaType: credit.media_type,
        title: credit.title ?? credit.name ?? "Titre sans nom",
        character: credit.character ?? "",
        year: (credit.release_date ?? credit.first_air_date ?? "").slice(0, 4),
        poster: credit.poster_path ? `${TMDB_IMAGES}${credit.poster_path}` : null,
        overview: credit.overview ?? "",
      }))
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))

    return NextResponse.json({ name, credits }, { headers: { "Cache-Control": "private, max-age=3600" } })
  } catch {
    return NextResponse.json({ error: "Les crédits TMDB sont temporairement indisponibles." }, { status: 502 })
  }
}
