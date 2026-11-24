"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { authenticate, authenticateWithQuickConnect, checkServerHealth, type JellyfinSession, type ServerHealth } from "@/lib/jellyfin"

const STORAGE_KEY = "jf_session"
const PREFS_KEY = "jf_preferences"
const BLOCKED_IPS_KEY = "jf_blocked_ips"

const FALLBACK_IP = "IP non disponible"

type Preferences = { compact: boolean; accent: "red" | "blue"; favorites: string[]; autoplay: boolean; reduceMotion: boolean; tvMode: boolean }
type JellyfinContextValue = {
  session: JellyfinSession | null
  ready: boolean
  serverHealth: ServerHealth | null
  preferences: Preferences
  login: (username: string, password: string) => Promise<void>
  loginWithQuickConnect: (secret: string) => Promise<void>
  logout: () => void
  toggleFavorite: (itemId: string) => void
  updatePreferences: (changes: Partial<Preferences>) => void
  currentIp: string
  publicIpVerified: boolean
  blockedIps: string[]
  blockIp: (ip: string) => void
  unblockIp: (ip: string) => void
}

const defaults: Preferences = { compact: false, accent: "red", favorites: [], autoplay: true, reduceMotion: false, tvMode: false }
const JellyfinContext = createContext<JellyfinContextValue | null>(null)

export function JellyfinProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<JellyfinSession | null>(null)
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(defaults)
  const [blockedIps, setBlockedIps] = useState<string[]>([])
  const [currentIp, setCurrentIp] = useState(FALLBACK_IP)
  const [publicIpVerified, setPublicIpVerified] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const rawSession = window.localStorage.getItem(STORAGE_KEY)
      const rawPrefs = window.localStorage.getItem(PREFS_KEY)
      const rawBlockedIps = window.localStorage.getItem(BLOCKED_IPS_KEY)
      if (rawSession) setSession(JSON.parse(rawSession) as JellyfinSession)
      if (rawPrefs) setPreferences({ ...defaults, ...JSON.parse(rawPrefs) })
      if (rawBlockedIps) setBlockedIps(JSON.parse(rawBlockedIps) as string[])
    } catch {}
    fetch("/api/security/ip", { cache: "no-store" }).then((response) => response.json()).then((data: { ip?: string | null }) => { if (data.ip) { setCurrentIp(data.ip); setPublicIpVerified(true) } }).catch(() => undefined)
    setReady(true)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.density = preferences.compact ? "compact" : "comfortable"
    document.documentElement.dataset.accent = preferences.accent
    document.documentElement.dataset.reduceMotion = preferences.reduceMotion ? "true" : "false"
    document.documentElement.dataset.tvMode = preferences.tvMode ? "true" : "false"
  }, [preferences.compact, preferences.accent, preferences.reduceMotion, preferences.tvMode])

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    const lowPower = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    const lowCoreCount = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
    const limitedNetwork = connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g"
    const reducedBySystem = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document.documentElement.dataset.performance = lowPower && lowPower <= 2 || lowCoreCount || limitedNetwork || reducedBySystem ? "low" : "full"
  }, [])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    let timer: number | undefined

    const check = async () => {
      const health = await checkServerHealth(session?.serverUrl)
      if (!cancelled) setServerHealth(health)
    }

    void check()
    timer = window.setInterval(() => void check(), 30_000)
    const onOnline = () => void check()
    window.addEventListener("online", onOnline)
    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      window.removeEventListener("online", onOnline)
    }
  }, [ready, session?.serverUrl])

  const login = useCallback(async (username: string, password: string) => {
    const next = await authenticate(username, password)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSession(next)
  }, [])

  const loginWithQuickConnect = useCallback(async (secret: string) => {
    const next = await authenticateWithQuickConnect(secret)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSession(next)
  }, [])

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  const updatePreferences = useCallback((changes: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...changes }
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const blockIp = useCallback((ip: string) => {
    setBlockedIps((current) => {
      const next = current.includes(ip) ? current : [...current, ip]
      window.localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const unblockIp = useCallback((ip: string) => {
    setBlockedIps((current) => {
      const next = current.filter((item) => item !== ip)
      window.localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const toggleFavorite = useCallback((itemId: string) => {
    setPreferences((current) => {
      const favorites = current.favorites.includes(itemId)
        ? current.favorites.filter((id) => id !== itemId)
        : [...current.favorites, itemId]
      const next = { ...current, favorites }
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(() => ({ session, ready, serverHealth, preferences, login, loginWithQuickConnect, logout, toggleFavorite, updatePreferences, currentIp, publicIpVerified, blockedIps, blockIp, unblockIp }), [session, ready, serverHealth, preferences, login, loginWithQuickConnect, logout, toggleFavorite, updatePreferences, currentIp, publicIpVerified, blockedIps, blockIp, unblockIp])
  return <JellyfinContext.Provider value={value}>{children}</JellyfinContext.Provider>
}

export function useJellyfin(): JellyfinContextValue {
  const ctx = useContext(JellyfinContext)
  if (!ctx) throw new Error("useJellyfin doit être utilisé dans un JellyfinProvider")
  return ctx
}
