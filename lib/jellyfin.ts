// Jellyfin API client — direct browser calls to the Jellyfin server.
// All requests are authenticated with the MediaBrowser Authorization header.

export const SERVER_URL = "https://film-jellyfin.ddns.net:8920"

const CLIENT_NAME = "Jellyfin Web (v0)"
const CLIENT_VERSION = "1.0.0"
const DEVICE_NAME = "Browser"

export type JellyfinSession = {
  serverUrl: string
  accessToken: string
  userId: string
  userName: string
  deviceId: string
}

export type BaseItem = {
  Id: string
  Name: string
  Type: string
  Overview?: string
  ProductionYear?: number
  CommunityRating?: number
  OfficialRating?: string
  RunTimeTicks?: number
  ImageTags?: Record<string, string>
  BackdropImageTags?: string[]
  ParentBackdropImageTags?: string[]
  ParentBackdropItemId?: string
  SeriesId?: string
  SeriesName?: string
  SeasonName?: string
  IndexNumber?: number
  ParentIndexNumber?: number
  Genres?: string[]
  OriginalLanguage?: string
  Language?: string
  ProductionLocations?: string[]
  UserData?: {
    PlaybackPositionTicks?: number
    PlayedPercentage?: number
    Played?: boolean
  }
  CollectionType?: string
  MediaType?: string
  People?: Person[]
  Studios?: { Name: string; Id?: string }[]
  Taglines?: string[]
  // Live TV / programmes
  ChannelId?: string
  ChannelName?: string
  ChannelNumber?: string
  StartDate?: string
  EndDate?: string
  EpisodeTitle?: string
  IsLive?: boolean
  CurrentProgram?: BaseItem
}

export type Person = {
  Id: string
  Name: string
  Role?: string
  Type?: string
  PrimaryImageTag?: string
}

type ItemsResponse = {
  Items: BaseItem[]
  TotalRecordCount: number
}

function buildAuthHeader(deviceId: string, token?: string): string {
  const parts = [
    `MediaBrowser Client="${CLIENT_NAME}"`,
    `Device="${DEVICE_NAME}"`,
    `DeviceId="${deviceId}"`,
    `Version="${CLIENT_VERSION}"`,
  ]
  if (token) parts.push(`Token="${token}"`)
  return parts.join(", ")
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server"
  const KEY = "jf_device_id"
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(KEY, id)
  }
  return id
}

async function apiFetch<T>(
  session: Pick<JellyfinSession, "serverUrl" | "accessToken" | "deviceId">,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${session.serverUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(session.deviceId, session.accessToken),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new Error(`Erreur ${res.status}: ${res.statusText}`)
  }
  // Some endpoints (reporting progress) return empty bodies
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export type ServerHealth = {
  online: boolean
  latencyMs: number | null
  hostname: string
  secure: boolean
  checkedAt: string
  error?: string
}

export async function checkServerHealth(
  serverUrl = SERVER_URL,
  signal?: AbortSignal,
): Promise<ServerHealth> {
  const startedAt = performance.now()
  const parsed = new URL(serverUrl)
  try {
    const response = await fetch(`${serverUrl}/System/Info/Public`, {
      method: "GET",
      cache: "no-store",
      signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return {
      online: true,
      latencyMs: Math.round(performance.now() - startedAt),
      hostname: parsed.hostname,
      secure: parsed.protocol === "https:",
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return {
      online: false,
      latencyMs: null,
      hostname: parsed.hostname,
      secure: parsed.protocol === "https:",
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Serveur inaccessible",
    }
  }
}

export async function authenticate(
  username: string,
  password: string,
): Promise<JellyfinSession> {
  const deviceId = getDeviceId()
  const res = await fetch(`${SERVER_URL}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(deviceId),
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  })
  if (res.status === 401) {
    throw new Error("Identifiant ou mot de passe incorrect.")
  }
  if (!res.ok) {
    throw new Error(`Connexion impossible (${res.status}). Vérifiez le serveur.`)
  }
  const data = (await res.json()) as {
    AccessToken: string
    User: { Id: string; Name: string }
  }
  return {
    serverUrl: SERVER_URL,
    accessToken: data.AccessToken,
    userId: data.User.Id,
    userName: data.User.Name,
    deviceId,
  }
}

export async function getViews(session: JellyfinSession): Promise<BaseItem[]> {
  const data = await apiFetch<ItemsResponse>(
    session,
    `/Users/${session.userId}/Views`,
  )
  return data.Items ?? []
}

export async function getResumeItems(
  session: JellyfinSession,
): Promise<BaseItem[]> {
  const data = await apiFetch<ItemsResponse>(
    session,
    `/Users/${session.userId}/Items/Resume?Limit=20&MediaTypes=Video&Fields=PrimaryImageAspectRatio,ProductionYear`,
  )
  return data.Items ?? []
}

export async function getLatest(
  session: JellyfinSession,
  parentId?: string,
  limit = 20,
): Promise<BaseItem[]> {
  const params = new URLSearchParams({
    Limit: String(limit),
    Fields: "ProductionYear,Overview",
  })
  if (parentId) params.set("ParentId", parentId)
  return apiFetch<BaseItem[]>(
    session,
    `/Users/${session.userId}/Items/Latest?${params.toString()}`,
  )
}

export async function getItems(
  session: JellyfinSession,
  options: {
    parentId?: string
    includeItemTypes?: string
    searchTerm?: string
    sortBy?: string
    sortOrder?: string
    limit?: number
    recursive?: boolean
  } = {},
): Promise<BaseItem[]> {
  const params = new URLSearchParams({
    Recursive: String(options.recursive ?? true),
    Fields: "ProductionYear,Overview,Genres",
    SortBy: options.sortBy ?? "SortName",
    SortOrder: options.sortOrder ?? "Ascending",
    Limit: String(options.limit ?? 60),
  })
  if (options.parentId) params.set("ParentId", options.parentId)
  if (options.includeItemTypes)
    params.set("IncludeItemTypes", options.includeItemTypes)
  if (options.searchTerm) params.set("SearchTerm", options.searchTerm)
  const data = await apiFetch<ItemsResponse>(
    session,
    `/Users/${session.userId}/Items?${params.toString()}`,
  )
  return data.Items ?? []
}

export async function searchItems(
  session: JellyfinSession,
  term: string,
): Promise<BaseItem[]> {
  return getItems(session, {
    searchTerm: term,
    includeItemTypes: "Movie,Series,Episode",
    recursive: true,
    limit: 50,
  })
}

export async function getItem(
  session: JellyfinSession,
  itemId: string,
): Promise<BaseItem> {
  const params = new URLSearchParams({
    Fields: "People,Genres,Overview,Studios,Taglines",
  })
  return apiFetch<BaseItem>(
    session,
    `/Users/${session.userId}/Items/${itemId}?${params.toString()}`,
  )
}

export async function getSeasons(
  session: JellyfinSession,
  seriesId: string,
): Promise<BaseItem[]> {
  const data = await apiFetch<ItemsResponse>(
    session,
    `/Shows/${seriesId}/Seasons?userId=${session.userId}&Fields=ProductionYear`,
  )
  return data.Items ?? []
}

export async function getEpisodes(
  session: JellyfinSession,
  seriesId: string,
  seasonId: string,
): Promise<BaseItem[]> {
  const data = await apiFetch<ItemsResponse>(
    session,
    `/Shows/${seriesId}/Episodes?userId=${session.userId}&seasonId=${seasonId}&Fields=Overview,ProductionYear`,
  )
  return data.Items ?? []
}

// ---- Image helpers ----

export function imageUrl(
  serverUrl: string,
  itemId: string,
  type: "Primary" | "Backdrop" | "Thumb" = "Primary",
  opts: { tag?: string; maxWidth?: number; quality?: number } = {},
): string {
  const params = new URLSearchParams({ quality: String(opts.quality ?? 90) })
  if (opts.tag) params.set("tag", opts.tag)
  if (opts.maxWidth) params.set("maxWidth", String(opts.maxWidth))
  return `${serverUrl}/Items/${itemId}/Images/${type}?${params.toString()}`
}

export function primaryImage(
  serverUrl: string,
  item: BaseItem,
  maxWidth = 400,
): string | null {
  const tag = item.ImageTags?.Primary
  if (tag) return imageUrl(serverUrl, item.Id, "Primary", { tag, maxWidth })
  return null
}

export function backdropImage(
  serverUrl: string,
  item: BaseItem,
  maxWidth = 1280,
): string | null {
  if (item.BackdropImageTags?.length) {
    return imageUrl(serverUrl, item.Id, "Backdrop", {
      tag: item.BackdropImageTags[0],
      maxWidth,
    })
  }
  if (item.ParentBackdropItemId && item.ParentBackdropImageTags?.length) {
    return imageUrl(serverUrl, item.ParentBackdropItemId, "Backdrop", {
      tag: item.ParentBackdropImageTags[0],
      maxWidth,
    })
  }
  return null
}

export function personImage(
  serverUrl: string,
  person: Person,
  maxWidth = 200,
): string | null {
  if (!person.PrimaryImageTag) return null
  return imageUrl(serverUrl, person.Id, "Primary", {
    tag: person.PrimaryImageTag,
    maxWidth,
  })
}

// ---- Live TV ----

export async function getLiveTvChannels(
  session: JellyfinSession,
): Promise<BaseItem[]> {
  const params = new URLSearchParams({
    userId: session.userId,
    EnableImages: "true",
    Fields: "CurrentProgram",
    SortBy: "SortName",
    Limit: "200",
  })
  const data = await apiFetch<ItemsResponse>(
    session,
    `/LiveTv/Channels?${params.toString()}`,
  )
  return data.Items ?? []
}

export async function getLiveTvPrograms(
  session: JellyfinSession,
  channelIds: string[],
): Promise<BaseItem[]> {
  if (!channelIds.length) return []
  const now = new Date()
  const end = new Date(now.getTime() + 6 * 60 * 60 * 1000) // 6h ahead
  const data = await apiFetch<ItemsResponse>(session, `/LiveTv/Programs`, {
    method: "POST",
    body: JSON.stringify({
      UserId: session.userId,
      ChannelIds: channelIds,
      MaxStartDate: end.toISOString(),
      MinEndDate: now.toISOString(),
      SortBy: ["StartDate"],
      EnableImages: false,
    }),
  })
  return data.Items ?? []
}

// ---- Playback ----

// Returns an HLS master playlist URL that hls.js can play in any browser.
export function streamUrl(session: JellyfinSession, itemId: string): string {
  const params = new URLSearchParams({
    api_key: session.accessToken,
    DeviceId: session.deviceId,
    VideoCodec: "h264",
    AudioCodec: "aac",
    AudioStreamIndex: "0",
    TranscodingMaxAudioChannels: "2",
    TranscodingProtocol: "hls",
    TranscodingContainer: "ts",
    SegmentContainer: "ts",
    MinSegments: "2",
    BreakOnNonKeyFrames: "false",
    EnableAutoStreamCopy: "true",
    AllowVideoStreamCopy: "true",
    EnableTranscoding: "true",
    RequireNonEmptyMetadata: "false",
    VideoBitrate: "8000000",
    MaxWidth: "1920",
    MaxHeight: "1080",
  })
  return `${session.serverUrl}/Videos/${itemId}/master.m3u8?${params.toString()}`
}

// Direct (static) stream — used as a fallback for natively supported files.
export function directStreamUrl(
  session: JellyfinSession,
  itemId: string,
): string {
  const params = new URLSearchParams({
    api_key: session.accessToken,
    DeviceId: session.deviceId,
    static: "true",
  })
  return `${session.serverUrl}/Videos/${itemId}/stream?${params.toString()}`
}

export async function reportProgress(
  session: JellyfinSession,
  itemId: string,
  positionTicks: number,
): Promise<void> {
  try {
    await apiFetch(session, `/Sessions/Playing/Progress`, {
      method: "POST",
      body: JSON.stringify({
        ItemId: itemId,
        PositionTicks: Math.round(positionTicks),
        IsPaused: false,
      }),
    })
  } catch {
    // progress reporting is best-effort
  }
}

// ---- Formatting helpers ----

export function ticksToTime(ticks?: number): string {
  if (!ticks) return ""
  const totalSeconds = Math.floor(ticks / 10_000_000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export function formatClock(dateString?: string): string {
  if (!dateString) return ""
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

// Progress (0-100) of a program currently airing, based on its start/end.
export function programProgress(start?: string, end?: string): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = Date.now()
  if (now <= s) return 0
  if (now >= e) return 100
  return Math.round(((now - s) / (e - s)) * 100)
}
