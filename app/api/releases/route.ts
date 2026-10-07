import { generateText } from "ai"
import { getToken } from "@vercel/connect"
import { NextResponse } from "next/server"

const CONNECTOR_UID = "scl_a6CWYUM38Akk5YgcASubfA"
const GITHUB_API = "https://api.github.com"

async function githubRequest(path: string, init: RequestInit = {}) {
  const token = await getToken(CONNECTOR_UID, {
    subject: { type: "app" },
    scopes: ["repo"],
  })
  return fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  })
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const action = String(form.get("action") ?? "publish")
    const repo = String(form.get("repo") ?? "").trim()
    const tag = String(form.get("tag") ?? "").trim()
    const title = String(form.get("title") ?? "").trim()
    const notes = String(form.get("notes") ?? "").trim()

    if (action === "generate") {
      const result = await generateText({
        model: "openai/gpt-4-mini",
        prompt: `Rédige des notes de release GitHub en français, en Markdown, à partir de ces changements. Structure avec Nouveautés, Correctifs et éventuellement Technique. Ne fabrique pas de détails absents.\n\n${notes}`,
      })
      return NextResponse.json({ notes: result.text })
    }

    if (!/^[-a-zA-Z0-9_.]+\/[a-zA-Z0-9_.-]+$/.test(repo) || !tag || !title) {
      return NextResponse.json({ error: "Dépôt, tag et titre requis." }, { status: 400 })
    }

    const releaseResponse = await githubRequest(`/repos/${repo}/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_name: tag, name: title, body: notes, draft: false, prerelease: false }),
    })
    const release = await releaseResponse.json()
    if (!releaseResponse.ok) {
      return NextResponse.json({ error: release.message ?? "GitHub a refusé la release." }, { status: releaseResponse.status })
    }

    const asset = form.get("asset")
    if (asset instanceof File && asset.size > 0) {
      const uploadUrl = new URL(release.upload_url.replace("{?name,label}", ""))
      uploadUrl.searchParams.set("name", asset.name)
      const uploadResponse = await githubRequest(`${uploadUrl.pathname}${uploadUrl.search}`, {
        method: "POST",
        headers: { "Content-Type": asset.type || "application/octet-stream" },
        body: await asset.arrayBuffer(),
      })
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json()
        return NextResponse.json({ error: uploadError.message ?? "La release est créée, mais l'asset n'a pas été envoyé." }, { status: 502 })
      }
    }

    return NextResponse.json({ url: release.html_url, id: release.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connexion GitHub indisponible."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET() {
  return NextResponse.json({ repository: "toto7889/jellyfin-login-site", connected: true })
}

export const dynamic = "force-dynamic"
