import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const apiKey = process.env.API_CINEMA_API_KEY
  if (!apiKey) return NextResponse.json({ error: "CINEMA_API_KEY_NOT_CONFIGURED" }, { status: 503 })

  const params = request.nextUrl.searchParams
  const tmdbId = params.get("tmdbId") ?? ""
  const lat = Number(params.get("lat"))
  const lng = Number(params.get("lng"))
  if (!/^\d{1,12}$/.test(tmdbId)) return NextResponse.json({ error: "Identifiant de film invalide." }, { status: 400 })
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Position géographique invalide." }, { status: 400 })
  }

  const query = new URLSearchParams({ tmdb_id: tmdbId, near: `${lat},${lng}`, radius_km: "10", limit: "50", include: "movie,cinema" })
  const cursor = params.get("cursor")
  if (cursor) {
    if (cursor.length > 500) return NextResponse.json({ error: "Curseur de pagination invalide." }, { status: 400 })
    query.set("cursor", cursor)
  }
  try {
    const response = await fetch(`https://api.api-cinema.com/v1/showtimes?${query.toString()}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    })
    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 ? 502 : response.status
      return NextResponse.json({ error: "Les horaires des cinémas sont momentanément indisponibles." }, { status })
    }
    const result = await response.json() as { data?: unknown[]; meta?: { nextCursor?: string | null } }
    return NextResponse.json({ data: result.data ?? [], nextCursor: result.meta?.nextCursor ?? null }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return NextResponse.json({ error: "Impossible de joindre le service des cinémas." }, { status: 502 })
  }
}
