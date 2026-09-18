"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Check, Eye, EyeOff, Fingerprint, Loader2, Play, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SERVER_URL } from "@/lib/jellyfin"

export function LoginForm() {
  const { login, serverHealth } = useJellyfin()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAccount, setLastAccount] = useState<string | null>(null)
  const [captcha, setCaptcha] = useState({ a: 3, b: 4 })
  const [captchaAnswer, setCaptchaAnswer] = useState("")
  const [captchaPassed, setCaptchaPassed] = useState(false)
  const [clientIp, setClientIp] = useState<string | null>(null)
  const [ipStatus, setIpStatus] = useState<"checking" | "verified" | "unavailable">("checking")
  const [ipChanged, setIpChanged] = useState(false)
  const [usingLastAccount, setUsingLastAccount] = useState(false)
  const [browserCheck, setBrowserCheck] = useState<{
    status: "checking" | "ready" | "limited"
    secure: boolean
    cookies: boolean
    memory?: number
    cores?: number
  }>({ status: "checking", secure: false, cookies: false })

  useEffect(() => {
    const memory = "deviceMemory" in navigator
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined
    const secure = window.isSecureContext
    const cookies = navigator.cookieEnabled
    const cores = navigator.hardwareConcurrency
    const timer = window.setTimeout(() => {
      setBrowserCheck({
        status: secure && cookies && (!memory || memory >= 2) ? "ready" : "limited",
        secure,
        cookies,
        memory,
        cores,
      })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    setLastAccount(window.localStorage.getItem("jf_last_account"))
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    fetch("https://api64.ipify.org?format=json", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ ip?: string }> : Promise.reject())
      .then((data) => {
        if (data.ip) {
          const previousIp = window.localStorage.getItem("jf_last_client_ip")
          setClientIp(data.ip)
          setIpStatus("verified")
          setIpChanged(Boolean(previousIp && previousIp !== data.ip))
          window.localStorage.setItem("jf_last_client_ip", data.ip)
        } else setIpStatus("unavailable")
      })
      .catch(() => setIpStatus("unavailable"))
      .finally(() => window.clearTimeout(timeout))
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  function useLastAccount() {
    if (!lastAccount) return
    setUsername(lastAccount)
    setUsingLastAccount(true)
    window.setTimeout(() => setUsingLastAccount(false), 900)
  }

  function refreshCaptcha() {
    setCaptcha({ a: Math.floor(Math.random() * 7) + 2, b: Math.floor(Math.random() * 7) + 1 })
    setCaptchaAnswer("")
    setCaptchaPassed(false)
  }

  function verifyCaptcha(value: string) {
    setCaptchaAnswer(value)
    setCaptchaPassed(value.trim() === String(captcha.a + captcha.b))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!captchaPassed) {
      setError("Vérifiez le défi de sécurité avant de continuer.")
      return
    }
    if (serverHealth && !serverHealth.online) {
      setError("Le serveur Jellyfin est actuellement inaccessible. La connexion est bloquée par sécurité.")
      return
    }
    setLoading(true)
    try {
      await login(username.trim(), password)
      window.localStorage.setItem("jf_last_account", username.trim())
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-stage relative min-h-dvh overflow-hidden bg-[#080808] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(229,9,20,.24),transparent_42%),radial-gradient(ellipse_at_bottom_left,rgba(0,164,220,.12),transparent_40%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl items-center justify-center px-5 py-12 lg:justify-between lg:px-14">
        <div className="hidden max-w-xl lg:block netflix-fade-up">
          <div className="mb-8 flex items-center gap-3 text-3xl font-black tracking-tight">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#e50914] shadow-[0_0_32px_rgba(229,9,20,.35)]"><Play className="size-6 fill-white" /></span>
            <span>JELLYFIN</span>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[.35em] text-[#e50914]">Votre univers cinéma</p>
          <h1 className="mt-5 max-w-lg text-5xl font-black leading-[1.02] tracking-tight xl:text-6xl">Films, séries et télévision. À volonté.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/60">Retrouvez votre médiathèque personnelle et reprenez vos contenus là où vous les avez laissés.</p>
        </div>

        <section className="w-full max-w-[430px] netflix-scale-in">
          <div className="mb-7 flex items-center gap-2 lg:hidden"><span className="flex size-9 items-center justify-center rounded-lg bg-[#e50914]"><Play className="size-5 fill-white" /></span><span className="text-xl font-black tracking-tight">JELLYFIN</span></div>
          <form onSubmit={onSubmit} className="rounded-md bg-black/75 px-7 py-9 shadow-2xl backdrop-blur-md sm:px-12 sm:py-12">
            <h2 className="text-3xl font-bold tracking-tight">S&apos;identifier</h2>
            <p className="mt-2 text-sm text-white/55">Connectez-vous à votre compte Jellyfin.</p>
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2.5 text-xs" aria-live="polite">
              {serverHealth?.online ? <Wifi className="size-4 text-emerald-400" /> : <WifiOff className="size-4 text-amber-300" />}
              <span className="min-w-0 flex-1 text-white/60">
                {serverHealth?.online ? `Serveur sécurisé connecté · ${serverHealth.latencyMs ?? "—"} ms` : serverHealth ? "Serveur non disponible — vérifiez la connexion" : "Vérification sécurisée du serveur…"}
              </span>
              <span className={`size-2 rounded-full ${serverHealth?.online ? "bg-emerald-400" : "bg-amber-300 animate-pulse"}`} />
            </div>
            {ipChanged ? <div role="alert" className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/[.08] px-3 py-2.5 text-xs text-amber-100">Adresse IP différente détectée depuis votre dernière connexion. Vérifiez votre réseau avant de continuer.</div> : null}
            <div className={`ip-security-card mt-3 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs ${ipChanged ? "border-amber-400/30 bg-amber-400/[.08]" : ipStatus === "verified" ? "border-emerald-400/20 bg-emerald-400/[.06]" : "border-white/10 bg-white/[.03]"}`} aria-live="polite">
              <Fingerprint className={`size-4 shrink-0 ${ipStatus === "verified" ? "text-emerald-400" : "text-white/45"}`} />
              <span className="min-w-0 flex-1 text-white/55">
                {ipStatus === "checking" ? "Vérification de votre adresse IP…" : ipStatus === "verified" ? `Connexion protégée · IP ${clientIp}` : "IP non disponible · vérification locale active"}
              </span>
              <span className={`size-2 shrink-0 rounded-full ${ipStatus === "verified" ? "bg-emerald-400" : ipStatus === "checking" ? "bg-amber-300 animate-pulse" : "bg-white/30"}`} />
            </div>
            <div className={`mt-3 rounded-lg border px-3 py-2.5 text-xs ${browserCheck.status === "ready" ? "border-emerald-400/20 bg-emerald-400/[.06]" : browserCheck.status === "limited" ? "border-amber-400/25 bg-amber-400/[.06]" : "border-white/10 bg-white/[.03]"}`} aria-live="polite">
              <div className="flex items-center gap-2">
                {browserCheck.status === "checking" ? <Loader2 className="size-4 animate-spin text-white/55" /> : browserCheck.status === "ready" ? <ShieldCheck className="size-4 text-emerald-400" /> : <ShieldCheck className="size-4 text-amber-300" />}
                <span className="font-semibold text-white/75">Contrôle de compatibilité</span>
                <span className="ml-auto text-white/45">{browserCheck.status === "checking" ? "Analyse…" : browserCheck.status === "ready" ? "Prêt" : "Limité"}</span>
              </div>
              {browserCheck.status !== "checking" ? <p className="mt-1.5 text-white/45">{browserCheck.secure ? "Connexion HTTPS active" : "Connexion non chiffrée détectée"} · {browserCheck.cookies ? "Stockage disponible" : "Stockage limité"}{browserCheck.memory ? ` · ${browserCheck.memory} Go min. détectés` : ""}{browserCheck.cores ? ` · ${browserCheck.cores} cœurs` : ""}</p> : null}
              <p className="mt-1 text-[11px] text-white/30">Ce test vérifie la compatibilité du navigateur, pas votre identité et ne collecte pas d’empreinte matérielle.</p>
            </div>
            {lastAccount ? (
              <button type="button" onClick={useLastAccount} className={`last-account-card mt-6 flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[.06] p-3 text-left transition hover:border-white/25 hover:bg-white/[.1] ${usingLastAccount ? "last-account-selected" : ""}`} aria-label={`Continuer avec le compte ${lastAccount}`}>
                <span className="flex size-10 items-center justify-center rounded-full bg-[#e50914] text-sm font-bold">{lastAccount.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block text-xs text-white/45">Dernier compte connecté</span><span className="block truncate text-sm font-semibold text-white">{lastAccount}</span></span>
                <Check className="size-4 text-white/40" />
              </button>
            ) : null}
            <div className="mt-8 flex flex-col gap-5">
              <div className="flex flex-col gap-2"><Label htmlFor="username" className="text-white/75">Nom d&apos;utilisateur</Label><Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Votre identifiant" required autoFocus className="h-12 border-white/10 bg-[#333] text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0" /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="password" className="text-white/75">Mot de passe</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" className="h-12 border-white/10 bg-[#333] pr-11 text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0" /><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
              <div className="rounded-lg border border-white/10 bg-white/[.04] p-3">
                <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-white/70"><ShieldCheck className="size-4 text-[#e50914]" /> Vérification de sécurité</span><button type="button" onClick={refreshCaptcha} aria-label="Nouveau défi" className="text-white/45 transition hover:rotate-90 hover:text-white"><RefreshCw className="size-4" /></button></div>
                <div className="flex items-center gap-2"><span className="flex h-10 flex-1 items-center justify-center rounded-md bg-[repeating-linear-gradient(135deg,rgba(229,9,20,.2)_0,rgba(229,9,20,.2)_2px,transparent_2px,transparent_8px)] text-lg font-black tracking-[.35em] text-white">{captcha.a} + {captcha.b} = ?</span><Input aria-label="Réponse au défi" inputMode="numeric" value={captchaAnswer} onChange={(e) => verifyCaptcha(e.target.value)} placeholder="?" className="h-10 w-20 border-white/10 bg-[#333] text-center text-white" required /></div>
                {captchaPassed ? <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400"><Check className="size-3" /> Vérification réussie</p> : <p className="mt-2 text-xs text-white/40">Prouvez que vous êtes humain pour continuer.</p>}
              </div>
              {error ? <p role="alert" className="rounded bg-[#e50914]/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}
              <Button type="submit" disabled={loading} className="h-12 w-full bg-[#e50914] font-bold text-white hover:bg-[#f6121d]">{loading ? <><Loader2 className="size-4 animate-spin" /> Connexion…</> : "S'identifier"}</Button>
              <p className="text-center text-sm text-white/45">Nouveau sur Jellyfin ? <button type="button" onClick={() => setError("La création de compte est gérée par l'administrateur Jellyfin.")} className="font-medium text-white hover:underline">S&apos;inscrire</button></p>
            </div>
          </form>
          <p className="mt-5 text-center text-xs text-white/35">Serveur : {SERVER_URL.replace(/^https?:\/\//, "")}</p>
        </section>
      </div>
    </main>
  )
}

export default LoginForm
