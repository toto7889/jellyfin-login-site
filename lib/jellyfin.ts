// Jellyfin API client — direct browser calls to the Jellyfin server.
// All requests are authenticated with the MediaBrowser Authorization header.

export const SERVER_URL = "https://film-jellyfin.ddns.net:8920"

const CLIENT_NAME = "Jellyfin Web (v0)"
const CLIENT_VERSION = "1.0.0"
const DEFAULT_DEVICE_NAME = "Navigateur"

function configuredDeviceName(): string {
  if (typeof window === "undefined") return DEFAULT_DEVICE_NAME
  try {
    const preferences = JSON.parse(window.localStorage.getItem("jf_preferences") ?? "{}") as { playerDeviceName?: unknown }
    if (typeof preferences.playerDeviceName !== "string") return DEFAULT_DEVICE_NAME
    const name = preferences.playerDeviceName.replace(/["\\\r\n]/g, "").trim().slice(0, 48)
    return name || DEFAULT_DEVICE_NAME
  } catch {
    return DEFAULT_DEVICE_NAME
  }
}

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
  Album?: string
  AlbumArtist?: string
  Artists?: string[]
  People?: Person[]
  ProviderIds?: Record<string, string>
  Studios?: { Name: string; Id?: string }[]
  Taglines?: string[]
  Trickplay?: Record<string, Record<string, JellyfinTrickplayInfo>>
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

export type JellyfinTrickplayInfo = {
  Width: number
  Height: number
  TileWidth: number
  TileHeight: number
  ThumbnailCount: number
  Interval: number
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
    `Device="${configuredDeviceName()}"`,
    `DeviceId="${deviceId}"`,
    `Version="${CLIENT_VERSION}"`,
  ]
  if (token) parts.push(`Token="${token}"`)
  return parts.join(", ")
}

export function revokeJellyfinSession(session: JellyfinSession): void {
  void fetch(`${session.serverUrl}/Sessions/Logout`, {
    method: "POST",
    headers: { Authorization: buildAuthHeader(session.deviceId, session.accessToken) },
    cache: "no-store",
    keepalive: true,
  }).catch(() => undefined)
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
  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("jellyfin:unauthorized"))
  }
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
    Fields: "ProductionYear,Overview,Genres,CommunityRating,OfficialRating,Album,AlbumArtist,Artists,RunTimeTicks,PrimaryImageAspectRatio,DateCreated",
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

export async function getTrickplayManifest(session: JellyfinSession, itemId: string): Promise<JellyfinTrickplayInfo | null> {
  const params = new URLSearchParams({ Fields: "Trickplay" })
  const item = await apiFetch<Pick<BaseItem, "Trickplay">>(
    session,
    `/Items/${encodeURIComponent(itemId)}?${params.toString()}`,
  )
  const manifests = Object.values(item.Trickplay ?? {}).flatMap((source) => Object.values(source))
  return manifests.sort((a, b) => a.Width - b.Width).find((manifest) => manifest.Width >= 320)
    ?? manifests.sort((a, b) => b.Width - a.Width)[0]
    ?? null
}

export async function getTrickplayTile(
  session: JellyfinSession,
  itemId: string,
  width: number,
  tileIndex: number,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(
    `${session.serverUrl}/Videos/${encodeURIComponent(itemId)}/Trickplay/${width}/${tileIndex}.jpg`,
    { headers: { Authorization: buildAuthHeader(session.deviceId, session.accessToken) }, signal },
  )
  if (!response.ok) throw new Error(`Impossible de charger la vignette Trickplay (${response.status}).`)
  return response.blob()
}

export function subtitleStreamUrl(session: JellyfinSession, itemId: string, mediaSourceId: string, streamIndex: number): string {
  const params = new URLSearchParams({ api_key: session.accessToken, userId: session.userId, DeviceId: session.deviceId })
  return `${session.serverUrl}/Videos/${encodeURIComponent(itemId)}/${encodeURIComponent(mediaSourceId)}/Subtitles/${streamIndex}/Stream.vtt?${params.toString()}`
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
  seasonId?: string,
): Promise<BaseItem[]> {
  const params = new URLSearchParams({
    userId: session.userId,
    Fields: "Overview,ProductionYear,UserData,RunTimeTicks,IndexNumber,ParentIndexNumber,SeriesName",
  })
  if (seasonId) params.set("seasonId", seasonId)
  const data = await apiFetch<ItemsResponse>(
    session,
    `/Shows/${seriesId}/Episodes?${params.toString()}`,
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

export async function getPerson(session: JellyfinSession, name: string): Promise<BaseItem> {
  const params = new URLSearchParams({
    userId: session.userId,
    Fields: "Overview,ProductionYear,PremiereDate,EndDate,ProviderIds",
  })
  return apiFetch<BaseItem>(session, `/Persons/${encodeURIComponent(name)}?${params.toString()}`)
}

export async function getItemsByPerson(session: JellyfinSession, personId: string): Promise<BaseItem[]> {
  const params = new URLSearchParams({
    Recursive: "true",
    PersonIds: personId,
    IncludeItemTypes: "Movie,Series,Episode,MusicVideo",
    Fields: "ProductionYear,Overview,Genres,CommunityRating,OfficialRating,UserData,RunTimeTicks,PrimaryImageAspectRatio,People",
    SortBy: "ProductionYear,SortName",
    SortOrder: "Descending,Ascending",
    Limit: "60",
  })
  const data = await apiFetch<ItemsResponse>(session, `/Users/${encodeURIComponent(session.userId)}/Items?${params.toString()}`)
  return data.Items ?? []
}

export async function getCollections(session: JellyfinSession): Promise<BaseItem[]> {
  return getItems(session, { includeItemTypes: "BoxSet", recursive: true, sortBy: "SortName", limit: 200 })
}

// ---- Live TV ----

export async function getLiveTvChannels(
  session: JellyfinSession,
): Promise<BaseItem[]> {
  const pageSize = 200
  const fetchPage = async (startIndex: number) => {
    const params = new URLSearchParams({
      userId: session.userId,
      EnableImages: "true",
      Fields: "CurrentProgram",
      SortBy: "SortName",
      StartIndex: String(startIndex),
      Limit: String(pageSize),
    })
    return apiFetch<ItemsResponse>(session, `/LiveTv/Channels?${params.toString()}`)
  }

  const firstPage = await fetchPage(0)
  const firstChannels = firstPage.Items ?? []
  const total = firstPage.TotalRecordCount || firstChannels.length
  const remainingPages = Math.ceil(Math.max(0, total - firstChannels.length) / pageSize)
  if (!remainingPages) return firstChannels

  const pages = await Promise.all(
    Array.from({ length: remainingPages }, (_, index) => fetchPage((index + 1) * pageSize)),
  )
  return [...firstChannels, ...pages.flatMap((page) => page.Items ?? [])]
}

export async function getLiveTvStreamUrl(
  session: JellyfinSession,
  channelId: string,
): Promise<string> {
  const playback = await apiFetch<{ MediaSources?: Array<{ LiveStreamId?: string; Container?: string; TranscodingUrl?: string }> }>(
    session,
    `/Items/${encodeURIComponent(channelId)}/PlaybackInfo?userId=${encodeURIComponent(session.userId)}&autoOpenLiveStream=true`,
    {
      method: "POST",
      body: JSON.stringify({
        UserId: session.userId,
        AutoOpenLiveStream: true,
        DeviceProfile: {
          MaxStreamingBitrate: 20_000_000,
          DirectPlayProfiles: [{ Container: "mp4,m4v", Type: "Video", VideoCodec: "h264", AudioCodec: "aac,mp3" }],
          TranscodingProfiles: [{ Container: "ts", Type: "Video", Context: "Streaming", Protocol: "hls", VideoCodec: "h264", AudioCodec: "aac", MaxAudioChannels: "2", MinSegments: 2, BreakOnNonKeyFrames: true }],
        },
      }),
    },
  )
  const source = playback.MediaSources?.find((media) => media.LiveStreamId)
  if (!source?.LiveStreamId) throw new Error("Le serveur Jellyfin n’a pas ouvert de flux pour cette chaîne.")
  if (source.TranscodingUrl) {
    const transcodingUrl = new URL(source.TranscodingUrl, `${session.serverUrl}/`)
    if (transcodingUrl.origin === new URL(session.serverUrl).origin) {
      transcodingUrl.searchParams.set("api_key", session.accessToken)
      transcodingUrl.searchParams.set("DeviceId", session.deviceId)
      if (!transcodingUrl.searchParams.has("LiveStreamId")) transcodingUrl.searchParams.set("LiveStreamId", source.LiveStreamId)
      return transcodingUrl.toString()
    }
  }
  const params = new URLSearchParams({ api_key: session.accessToken, DeviceId: session.deviceId })
  return `${session.serverUrl}/LiveTv/LiveStreamFiles/${encodeURIComponent(source.LiveStreamId)}/stream.${encodeURIComponent(source.Container || "ts")}?${params.toString()}`
}

export async function closeLiveTvStream(
  session: JellyfinSession,
  streamUrl: string,
): Promise<void> {
  const url = new URL(streamUrl)
  const streamFileId = url.pathname.match(/LiveStreamFiles\/([^/]+)\/stream\./)?.[1]
  const liveStreamId = streamFileId ? decodeURIComponent(streamFileId) : url.searchParams.get("LiveStreamId")
  if (!liveStreamId) return
  const params = new URLSearchParams({ liveStreamId })
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

export function audioStreamUrl(session: JellyfinSession, itemId: string): string {
  const params = new URLSearchParams({ api_key: session.accessToken, userId: session.userId, DeviceId: session.deviceId, static: "true" })
  return `${session.serverUrl}/Audio/${encodeURIComponent(itemId)}/stream?${params.toString()}`
}

// HLS is a compatibility path when the browser cannot play the source directly.
export function streamUrl(session: JellyfinSession, itemId: string, options: PlaybackStreamOptions = {}): string {
  const fallbackUrl = `${session.serverUrl}/Videos/${encodeURIComponent(itemId)}/master.m3u8`
  const requestedUrl = options.transcodingUrl ? new URL(options.transcodingUrl, `${session.serverUrl}/`) : null
  const serverOrigin = new URL(session.serverUrl).origin
  const streamEndpoint = requestedUrl?.origin === serverOrigin ? requestedUrl : new URL(fallbackUrl)
  const params = new URLSearchParams({
    api_key: session.accessToken,
    userId: session.userId,
    DeviceId: session.deviceId,
    VideoCodec: "h264",
    AudioCodec: "aac",
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
    VideoBitrate: String(options.maxStreamingBitrate ?? 8_000_000),
    MaxWidth: String(options.maxWidth ?? 1920),
    MaxHeight: String(options.maxHeight ?? 1080),
  })
  if (options.mediaSourceId) params.set("MediaSourceId", options.mediaSourceId)
  if (options.playSessionId) params.set("PlaySessionId", options.playSessionId)
  if (options.audioStreamIndex != null) params.set("AudioStreamIndex", String(options.audioStreamIndex))
  if (options.subtitleStreamIndex != null) params.set("SubtitleStreamIndex", String(options.subtitleStreamIndex))
  streamEndpoint.searchParams.set("api_key", session.accessToken)
  streamEndpoint.searchParams.set("userId", session.userId)
  streamEndpoint.searchParams.set("DeviceId", session.deviceId)
  params.forEach((value, key) => streamEndpoint.searchParams.set(key, value))
  return streamEndpoint.toString()
}

export type JellyfinMediaStream = {
  Index: number
  Type: "Video" | "Audio" | "Subtitle"
  Language?: string
  DisplayTitle?: string
  Codec?: string
  IsDefault?: boolean
  IsForced?: boolean
  IsExternal?: boolean
}

export type JellyfinPlaybackSource = {
  Id?: string
  TranscodingUrl?: string
  MediaStreams?: JellyfinMediaStream[]
  SupportsDirectPlay?: boolean
  SupportsDirectStream?: boolean
  SupportsTranscoding?: boolean
}

export type JellyfinPlaybackInfo = {
  PlaySessionId?: string
  MediaSources?: JellyfinPlaybackSource[]
}

export async function getPlaybackInfo(
  session: JellyfinSession,
  itemId: string,
  maxStreamingBitrate = 20_000_000,
): Promise<JellyfinPlaybackInfo> {
  return apiFetch<JellyfinPlaybackInfo>(
    session,
    `/Items/${encodeURIComponent(itemId)}/PlaybackInfo?userId=${encodeURIComponent(session.userId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        UserId: session.userId,
        DeviceProfile: {
          MaxStreamingBitrate: maxStreamingBitrate,
          MaxStaticBitrate: maxStreamingBitrate,
          DirectPlayProfiles: [
            { Container: "mp4,m4v", Type: "Video", VideoCodec: "h264", AudioCodec: "aac,mp3" },
          ],
          TranscodingProfiles: [
            { Container: "ts", Type: "Video", Context: "Streaming", Protocol: "hls", VideoCodec: "h264", AudioCodec: "aac", MaxAudioChannels: "2", MinSegments: 2, BreakOnNonKeyFrames: true },
          ],
        },
      }),
    },
  )
}

export type PlaybackStreamOptions = {
  audioStreamIndex?: number
  subtitleStreamIndex?: number | null
  maxStreamingBitrate?: number
  maxWidth?: number
  maxHeight?: number
  mediaSourceId?: string
  playSessionId?: string
  transcodingUrl?: string
  startTimeTicks?: number
}

export function directStreamUrl(session: JellyfinSession, itemId: string, options: PlaybackStreamOptions = {}): string {
  const params = new URLSearchParams({ api_key: session.accessToken, userId: session.userId, DeviceId: session.deviceId, static: "true" })
  if (options.mediaSourceId) params.set("MediaSourceId", options.mediaSourceId)
  if (options.playSessionId) params.set("PlaySessionId", options.playSessionId)
  if (options.audioStreamIndex != null) params.set("AudioStreamIndex", String(options.audioStreamIndex))
  if (options.subtitleStreamIndex != null) params.set("SubtitleStreamIndex", String(options.subtitleStreamIndex))
  if (options.maxStreamingBitrate) params.set("MaxStreamingBitrate", String(options.maxStreamingBitrate))
  if (options.maxWidth) params.set("MaxWidth", String(options.maxWidth))
  if (options.maxHeight) params.set("MaxHeight", String(options.maxHeight))
  if (options.startTimeTicks != null && options.startTimeTicks > 0) params.set("StartTimeTicks", String(options.startTimeTicks))
  return `${session.serverUrl}/Videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`
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
  isPaused = false,
): Promise<void> {
  try {
    await apiFetch(session, `/Sessions/Playing/Progress`, {
      method: "POST",
      body: JSON.stringify({
        ItemId: itemId,
        PositionTicks: Math.round(positionTicks),
        IsPaused: isPaused,
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
