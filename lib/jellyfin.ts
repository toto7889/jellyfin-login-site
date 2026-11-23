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

export type JellyfinPlaybackSession = {
  Id: string
  DeviceId: string
  DeviceName: string
  Client: string
  UserId?: string
  UserName?: string
  NowPlayingItem?: BaseItem
  PlayState?: {
    IsPaused?: boolean
    IsMuted?: boolean
    VolumeLevel?: number
    PositionTicks?: number
    CanSeek?: boolean
  }
  SupportsRemoteControl?: boolean
  SupportsMediaControl?: boolean
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

export type QuickConnectRequest = { Secret: string; Code: string; Authenticated: boolean }

type AuthenticationResponse = { AccessToken: string; User: { Id: string; Name: string } }

export async function isQuickConnectEnabled(): Promise<boolean> {
  const response = await fetch(`${SERVER_URL}/QuickConnect/Enabled`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Quick Connect indisponible (${response.status}).`)
  return response.json() as Promise<boolean>
}

export async function initiateQuickConnect(): Promise<QuickConnectRequest> {
  const response = await fetch(`${SERVER_URL}/QuickConnect/Initiate`, {
    method: "POST",
    headers: { Authorization: buildAuthHeader(getDeviceId()) },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Impossible de créer le code d’activation (${response.status}).`)
  return response.json() as Promise<QuickConnectRequest>
}

export async function checkQuickConnect(secret: string): Promise<boolean> {
  const response = await fetch(`${SERVER_URL}/QuickConnect/Connect?secret=${encodeURIComponent(secret)}`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Vérification du code impossible (${response.status}).`)
  const request = await response.json() as QuickConnectRequest
  return request.Authenticated
}

export async function authenticateWithQuickConnect(secret: string): Promise<JellyfinSession> {
  const deviceId = getDeviceId()
  const response = await fetch(`${SERVER_URL}/Users/AuthenticateWithQuickConnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: buildAuthHeader(deviceId) },
    body: JSON.stringify({ Secret: secret }),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Activation refusée (${response.status}).`)
  const data = await response.json() as AuthenticationResponse
  return { serverUrl: SERVER_URL, accessToken: data.AccessToken, userId: data.User.Id, userName: data.User.Name, deviceId }
}

export async function authorizeQuickConnect(session: JellyfinSession, code: string): Promise<void> {
  const authorized = await apiFetch<boolean>(session, `/QuickConnect/Authorize?code=${encodeURIComponent(code)}`, { method: "POST" })
  if (!authorized) throw new Error("Code invalide ou expiré.")
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
    cache: "no-store",
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

export async function getLocalTrailers(session: JellyfinSession, itemId: string): Promise<BaseItem[]> {
  const trailers = await apiFetch<BaseItem[]>(
    session,
    `/Items/${encodeURIComponent(itemId)}/LocalTrailers?userId=${encodeURIComponent(session.userId)}`,
  )
  return trailers ?? []
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
    Fields: "ProductionYear,Overview,Genres,CommunityRating,OfficialRating",
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
    Fields: "People,Genres,Overview,Studios,Taglines,UserData,ProductionYear,RunTimeTicks,OriginalTitle",
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
    `/Shows/${seriesId}/Seasons?userId=${session.userId}&Fields=ProductionYear,UserData,IndexNumber,Overview`,
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
    `/Shows/${seriesId}/Episodes?userId=${session.userId}&seasonId=${seasonId}&Fields=Overview,ProductionYear,UserData,RunTimeTicks,IndexNumber,ParentIndexNumber,SeriesName`,
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
  const pageSize = 200
  const channels: BaseItem[] = []
  let startIndex = 0

  while (true) {
    const params = new URLSearchParams({
      userId: session.userId,
      EnableImages: "true",
      Fields: "CurrentProgram",
      SortBy: "SortName",
      StartIndex: String(startIndex),
      Limit: String(pageSize),
    })
    const data = await apiFetch<ItemsResponse>(
      session,
      `/LiveTv/Channels?${params.toString()}`,
    )
    const page = data.Items ?? []
    channels.push(...page)
    startIndex += page.length
    if (!page.length || page.length < pageSize || (data.TotalRecordCount && startIndex >= data.TotalRecordCount)) break
  }

  return channels
}

export async function getLiveTvStreamUrl(
  session: JellyfinSession,
  channelId: string,
): Promise<string> {
  const playback = await apiFetch<{ MediaSources?: Array<{ LiveStreamId?: string; Container?: string }> }>(
    session,
    `/Items/${encodeURIComponent(channelId)}/PlaybackInfo?userId=${encodeURIComponent(session.userId)}&autoOpenLiveStream=true`,
    { method: "POST", body: JSON.stringify({ UserId: session.userId, AutoOpenLiveStream: true }) },
  )
  const source = playback.MediaSources?.find((media) => media.LiveStreamId)
  if (!source?.LiveStreamId) throw new Error("Le serveur Jellyfin n’a pas ouvert de flux pour cette chaîne.")
  const params = new URLSearchParams({ api_key: session.accessToken, DeviceId: session.deviceId })
  return `${session.serverUrl}/LiveTv/LiveStreamFiles/${encodeURIComponent(source.LiveStreamId)}/stream.${encodeURIComponent(source.Container || "ts")}?${params.toString()}`
}

export async function closeLiveTvStream(
  session: JellyfinSession,
  streamUrl: string,
): Promise<void> {
  const liveStreamId = new URL(streamUrl).pathname.match(/LiveStreamFiles\/([^/]+)\/stream\./)?.[1]
  if (!liveStreamId) return
  const params = new URLSearchParams({ liveStreamId: decodeURIComponent(liveStreamId) })
  await apiFetch<void>(session, `/LiveStreams/Close?${params.toString()}`, { method: "POST" })
}

export async function getLiveTvPrograms(
  session: JellyfinSession,
  channelIds: string[],
  horizonHours = 6,
): Promise<BaseItem[]> {
  if (!channelIds.length) return []
  const now = new Date()
  const end = new Date(now.getTime() + horizonHours * 60 * 60 * 1000)
  const data = await apiFetch<ItemsResponse>(session, `/LiveTv/Programs`, {
    method: "POST",
    body: JSON.stringify({
      UserId: session.userId,
      ChannelIds: channelIds,
      MaxStartDate: end.toISOString(),
      MinEndDate: now.toISOString(),
      SortBy: ["StartDate"],
      EnableImages: true,
      EnableImageTypes: ["Primary", "Thumb", "Backdrop"],
      Fields: ["Overview", "Genres", "OfficialRating", "CommunityRating", "ProductionYear", "RunTimeTicks"],
    }),
  })
  return data.Items ?? []
}

// ---- Playback ----

// Returns an HLS master playlist URL that hls.js can play in any browser.
export function streamUrl(session: JellyfinSession, itemId: string): string {
  const params = new URLSearchParams({
    api_key: session.accessToken,
    userId: session.userId,
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

export type JellyfinMediaStream = {
  Index: number
  Type: "Video" | "Audio" | "Subtitle"
  Language?: string
  DisplayTitle?: string
  Codec?: string
  IsDefault?: boolean
  IsExternal?: boolean
}

export async function getPlaybackStreams(session: JellyfinSession, itemId: string): Promise<JellyfinMediaStream[]> {
  const info = await apiFetch<{ MediaSources?: Array<{ MediaStreams?: JellyfinMediaStream[] }> }>(
    session,
    `/Items/${encodeURIComponent(itemId)}/PlaybackInfo?userId=${encodeURIComponent(session.userId)}`,
    { method: "POST", body: JSON.stringify({ UserId: session.userId, DeviceProfile: { MaxStreamingBitrate: 20000000 } }) },
  )
  return info.MediaSources?.[0]?.MediaStreams ?? []
}

export type PlaybackStreamOptions = {
  audioStreamIndex?: number
  subtitleStreamIndex?: number | null
  maxStreamingBitrate?: number
  maxWidth?: number
  maxHeight?: number
  startTimeTicks?: number
}

export function directStreamUrl(session: JellyfinSession, itemId: string, options: PlaybackStreamOptions = {}): string {
  const params = new URLSearchParams({ api_key: session.accessToken, DeviceId: session.deviceId })
  if (options.audioStreamIndex != null) params.set("AudioStreamIndex", String(options.audioStreamIndex))
  if (options.subtitleStreamIndex != null) params.set("SubtitleStreamIndex", String(options.subtitleStreamIndex))
  if (options.maxStreamingBitrate) params.set("MaxStreamingBitrate", String(options.maxStreamingBitrate))
  if (options.maxWidth) params.set("MaxWidth", String(options.maxWidth))
  if (options.maxHeight) params.set("MaxHeight", String(options.maxHeight))
  if (options.startTimeTicks != null && options.startTimeTicks > 0) params.set("StartTimeTicks", String(options.startTimeTicks))
  return `${session.serverUrl}/Videos/${itemId}/stream?${params.toString()}`
}

export async function getPlaybackSessions(
  session: JellyfinSession,
): Promise<JellyfinPlaybackSession[]> {
  return apiFetch<JellyfinPlaybackSession[]>(
    session,
    `/Sessions?ControllableByUserId=${encodeURIComponent(session.userId)}`,
  )
}

export async function startPlaybackOnSession(
  session: JellyfinSession,
  sessionId: string,
  itemId: string,
  command: "PlayNow" | "PlayNext" = "PlayNow",
): Promise<void> {
  const params = new URLSearchParams({ playCommand: command, itemIds: itemId })
  await apiFetch<void>(
    session,
    `/Sessions/${encodeURIComponent(sessionId)}/Playing?${params.toString()}`,
    { method: "POST" },
  )
}

export async function sendPlaybackCommand(
  session: JellyfinSession,
  sessionId: string,
  command: "PlayPause" | "Play" | "Pause" | "Stop" | "Unpause",
): Promise<void> {
  await apiFetch<void>(
    session,
    `/Sessions/${encodeURIComponent(sessionId)}/Playing/${command}`,
    { method: "POST" },
  )
}

export async function seekPlaybackSession(
  session: JellyfinSession,
  sessionId: string,
  positionTicks: number,
): Promise<void> {
  await apiFetch<void>(
    session,
    `/Sessions/${encodeURIComponent(sessionId)}/Playing/Seek`,
    {
      method: "POST",
      body: JSON.stringify({ SeekPositionTicks: Math.max(0, Math.round(positionTicks)) }),
    },
  )
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
