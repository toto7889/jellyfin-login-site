"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight, Check, Clapperboard, Eye, EyeOff, Film, Loader2, LockKeyhole, Play, ShieldCheck, Sparkles, Wifi, WifiOff } from "lucide-react"
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
  const [navigating, setNavigating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAccount, setLastAccount] = useState<string | null>(null)
  const [usingLastAccount, setUsingLastAccount] = useState(false)

  useEffect(() => {
    setLastAccount(window.localStorage.getItem("jf_last_account"))
  }, [])

  function useLastAccount() {
    if (!lastAccount) return
    setUsername(lastAccount)
    setUsingLastAccount(true)
    window.setTimeout(() => setUsingLastAccount(false), 900)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (serverHealth && !serverHealth.online) {
      setError("Le serveur Jellyfin est momentanément indisponible. Réessayez dans quelques instants.")
      return
    }
    setLoading(true)
    try {
      await login(username.trim(), password)
      window.localStorage.setItem("jf_last_account", username.trim())
      setNavigating(true)
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible. Vérifiez vos identifiants puis réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <main className="login-stage relative min-h-dvh overflow-hidden text-white">
        <div className="login-stage__ambient" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-dvh w-full max-w-[1380px] items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_440px] lg:gap-20 lg:px-14">
          <section className="login-editorial hidden min-w-0 lg:block" aria-labelledby="login-editorial-title">
            <a href="/" className="login-brand mb-16 inline-flex items-center gap-3" aria-label="JFLX, accueil">
              <span className="login-brand__mark"><Play className="size-5 fill-current" /></span>
              <span className="text-[23px] font-black tracking-[-.07em]">JFLX<span className="ml-2 text-[10px] font-semibold tracking-[.28em] text-white/40">JELLYFIN</span></span>
            </a>
            <div className="login-editorial__content">
              <p className="login-eyebrow"><Sparkles className="size-3.5" /> Votre cinéma, à la maison</p>
              <h1 id="login-editorial-title" className="mt-5 max-w-[650px] text-6xl font-black leading-[.98] tracking-[-.065em] xl:text-7xl">La suite de votre histoire commence ici.</h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-white/55">Retrouvez vos films, vos séries et vos chaînes préférées dans un seul espace, pensé autour de votre bibliothèque.</p>
              <div className="login-cinema-strip mt-12" aria-label="Votre bibliothèque de divertissement">
                <div className="login-cinema-strip__poster login-cinema-strip__poster--one"><span className="login-poster-label">COLLECTION</span><Film className="size-7" /><strong>CINÉMA</strong><span>À redécouvrir</span></div>
                <div className="login-cinema-strip__poster login-cinema-strip__poster--two"><span className="login-poster-label">À LA UNE</span><Clapperboard className="size-7" /><strong>SÉRIES</strong><span>À votre rythme</span></div>
                <div className="login-cinema-strip__poster login-cinema-strip__poster--three"><span className="login-poster-label">EN DIRECT</span><Play className="size-7 fill-current" /><strong>VOTRE TV</strong><span>À portée de main</span></div>
                <div className="login-cinema-strip__caption"><span className="size-1.5 rounded-full bg-[#00a4dc]" /> Une bibliothèque. Toutes vos envies.</div>
              </div>
            </div>
          </section>

          <section className="login-form-column w-full max-w-[440px] justify-self-center" aria-labelledby="login-heading">
            <a href="/" className="login-brand mb-7 inline-flex items-center gap-2.5 lg:hidden" aria-label="JFLX, accueil">
              <span className="login-brand__mark size-9"><Play className="size-4 fill-current" /></span>
              <span className="text-xl font-black tracking-[-.07em]">JFLX<span className="ml-2 text-[9px] font-semibold tracking-[.25em] text-white/40">JELLYFIN</span></span>
            </a>
            <form onSubmit={onSubmit} className="login-panel">
              <div className="login-panel__header">
                <div className="login-panel__icon"><LockKeyhole className="size-5" /></div>
                <p className="login-eyebrow mt-5">Votre espace personnel</p>
                <h2 id="login-heading" className="mt-2 text-[32px] font-bold tracking-[-.05em]">Bon retour.</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">Connectez-vous pour retrouver votre bibliothèque.</p>
              </div>

              <div className="login-server-status mt-6" aria-live="polite">
                <span className={`login-server-status__icon ${serverHealth?.online ? "is-online" : ""}`}>
                  {serverHealth?.online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-white/80">{serverHealth?.online ? "Bibliothèque disponible" : serverHealth ? "Serveur momentanément indisponible" : "Connexion à la bibliothèque…"}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/40">{serverHealth?.online ? `Jellyfin · ${serverHealth.latencyMs ?? "—"} ms` : SERVER_URL.replace(/^https?:\/\//, "")}</span>
                </span>
                <span className={`login-server-status__dot ${serverHealth?.online ? "is-online" : ""}`} />
              </div>

              {lastAccount ? (
                <button type="button" onClick={useLastAccount} className={`login-account ${usingLastAccount ? "is-selected" : ""}`} aria-label={`Continuer avec le compte ${lastAccount}`}>
                  <span className="login-account__avatar">{lastAccount.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 text-left"><span className="block text-[11px] text-white/40">Continuer avec</span><span className="block truncate text-sm font-semibold">{lastAccount}</span></span>
                  <Check className="size-4 text-white/40" />
                </button>
              ) : null}

              <div className="mt-7 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="username" className="text-xs font-semibold text-white/75">Nom d&apos;utilisateur</Label>
                  <Input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Saisissez votre identifiant" required autoFocus className="login-field h-[50px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password" className="text-xs font-semibold text-white/75">Mot de passe</Label>
                  <div className="login-password-field">
                    <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Saisissez votre mot de passe" required className="login-field h-[50px] pr-12" />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} className="login-password-toggle">{showPassword ? <EyeOff className="size-[17px]" /> : <Eye className="size-[17px]" />}</button>
                  </div>
                </div>

                {error ? <p role="alert" className="login-error"><ShieldCheck className="mt-0.5 size-4 shrink-0" />{error}</p> : null}

                <Button type="submit" disabled={loading} className="login-submit mt-1 h-[52px] w-full font-semibold">
                  {loading ? <><Loader2 className="size-4 animate-spin" /> Connexion en cours…</> : <>Accéder à ma bibliothèque <ArrowRight className="size-4" /></>}
                </Button>
              </div>

              <div className="login-panel__footer">
                <p>La création de compte est gérée par votre administrateur Jellyfin.</p>
                <span><LockKeyhole className="size-3" /> Vos identifiants restent privés</span>
              </div>
            </form>
            <p className="mt-5 text-center text-[11px] text-white/30">JFLX <span className="mx-1.5">·</span> Propulsé par Jellyfin</p>
          </section>
        </div>
      </main>
      {navigating ? <div role="status" aria-live="polite" aria-label="Connexion réussie, ouverture de votre médiathèque" className="login-transition"><div className="login-transition__card"><span className="login-transition__mark"><Play className="size-7 fill-current" /></span><p className="text-3xl font-black tracking-[-.08em]">JFLX</p><h2 className="text-lg font-semibold">Bienvenue, {username.trim()}</h2><p className="text-sm text-white/55">Préparation de votre espace multimédia…</p><div className="login-transition__track"><span /></div><div className="flex items-center gap-2 text-xs text-white/40"><Loader2 className="size-3.5 animate-spin" />Connexion sécurisée à votre bibliothèque</div></div></div> : null}
    </>
  )
}

export default LoginForm
