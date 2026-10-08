import { NextResponse } from "next/server"

const SERVER_URL = "https://film-jellyfin.ddns.net:8920"
const CLIENT_NAME = "Jellyfin Web (v0)"
const CLIENT_VERSION = "1.0.0"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: unknown; password?: unknown; deviceId?: unknown } | null
  const username = typeof body?.username === "string" ? body.username.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : ""

  if (!username || !password || !deviceId) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
  }

  const apiKey = process.env.JELLYFIN_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "La configuration Jellyfin est incomplète." }, { status: 500 })
  }

  const response = await fetch(`${SERVER_URL}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `MediaBrowser Client="${CLIENT_NAME}", Device="Browser", DeviceId="${deviceId}", Version="${CLIENT_VERSION}", Token="${apiKey}"`,
    },
    body: JSON.stringify({ Username: username, Pw: password }),
    cache: "no-store",
  })

  if (response.status === 401) {
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 })
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Connexion impossible. Vérifiez le serveur Jellyfin." }, { status: 502 })
  }

  return NextResponse.json(await response.json())
}
