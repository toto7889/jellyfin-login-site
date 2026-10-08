"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { authenticate, checkServerHealth, type JellyfinSession, type ServerHealth } from "@/lib/jellyfin"

const STORAGE_KEY = "jf_session"
const PREFS_KEY = "jf_preferences"
const BLOCKED_IPS_KEY = "jf_blocked_ips"
const ACTIVATION_KEY = "jf_activation_state"

const FALLBACK_IP = "IP non disponible"

type Preferences = { compact: boolean; accent: "red" | "blue"; favorites: string[]; autoplay: boolean; reduceMotion: boolean }
type JellyfinContextValue = {
  session: JellyfinSession | null
  ready: boolean
  serverHealth: ServerHealth | null
  preferences: Preferences
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  toggleFavorite: (itemId: string) => void
  updatePreferences: (changes: Partial<Preferences>) => void
  currentIp: string
  publicIpVerified: boolean
  blockedIps: string[]
  activation: { activated: number; limit: number; codes: string[] }
  blockIp: (ip: string) => void
  unblockIp: (ip: string) => void
  generateActivationCode: () => string
}

const defaults: Preferences = { compact: false, accent: "red", favorites: [], autoplay: true, reduceMotion: false }
const JellyfinContext = createContext<JellyfinContextValue | null>(null)

export function JellyfinProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<JellyfinSession | null>(null)
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(defaults)
  const [blockedIps, setBlockedIps] = useState<string[]>([])
  const [activation, setActivation] = useState({ activated: 1, limit: 5, codes: [] as string[] })
  const [currentIp, setCurrentIp] = useState(FALLBACK_IP)
  const [publicIpVerified, setPublicIpVerified] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const rawSession = window.localStorage.getItem(STORAGE_KEY)
      const rawPrefs = window.localStorage.getItem(PREFS_KEY)
      const rawBlockedIps = window.localStorage.getItem(BLOCKED_IPS_KEY)
      const rawActivation = window.localStorage.getItem(ACTIVATION_KEY)
      if (rawSession) setSession(JSON.parse(rawSession) as JellyfinSession)
      if (rawPrefs) setPreferences({ ...defaults, ...JSON.parse(rawPrefs) })
      if (rawBlockedIps) setBlockedIps(JSON.parse(rawBlockedIps) as string[])
      if (rawActivation) setActivation({ activated: 1, limit: 5, codes: [], ...JSON.parse(rawActivation) })
    } catch {}
    fetch("/api/security/ip", { cache: "no-store" }).then((response) => response.json()).then((data: { ip?: string | null }) => { if (data.ip) { setCurrentIp(data.ip); setPublicIpVerified(true) } }).catch(() => undefined)
    setReady(true)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.density = preferences.compact ? "compact" : "comfortable"
    document.documentElement.dataset.accent = preferences.accent
    document.documentElement.dataset.reduceMotion = preferences.reduceMotion ? "true" : "false"
  }, [preferences.compact, preferences.accent, preferences.reduceMotion])

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

  const generateActivationCode = useCallback(() => {
    const code = `JF-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`
    setActivation((current) => {
      const next = { ...current, codes: [code, ...current.codes].slice(0, 8) }
      window.localStorage.setItem(ACTIVATION_KEY, JSON.stringify(next))
      return next
    })
    return code
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

  const value = useMemo(() => ({ session, ready, serverHealth, preferences, login, logout, toggleFavorite, updatePreferences, currentIp, publicIpVerified, blockedIps, activation, blockIp, unblockIp, generateActivationCode }), [session, ready, serverHealth, preferences, login, logout, toggleFavorite, updatePreferences, currentIp, publicIpVerified, blockedIps, activation, blockIp, unblockIp, generateActivationCode])
  return <JellyfinContext.Provider value={value}>{children}</JellyfinContext.Provider>
}

export function useJellyfin(): JellyfinContextValue {
  const ctx = useContext(JellyfinContext)
  if (!ctx) throw new Error("useJellyfin doit être utilisé dans un JellyfinProvider")
  return ctx
}
