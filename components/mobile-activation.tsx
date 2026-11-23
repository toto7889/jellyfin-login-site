"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Loader2, Monitor, Play, RefreshCw, ShieldCheck } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { checkQuickConnect, initiateQuickConnect, isQuickConnectEnabled } from "@/lib/jellyfin"

export function MobileActivation() {
  const { loginWithQuickConnect } = useJellyfin()
  const router = useRouter()
  const [code, setCode] = useState("")
  const [secret, setSecret] = useState("")
  const [status, setStatus] = useState<"loading" | "waiting" | "disabled" | "error">("loading")
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    async function start() {
      setStatus("loading")
      setError("")
      try {
        if (!await isQuickConnectEnabled()) {
          if (!cancelled) setStatus("disabled")
          return
        }
        const request = await initiateQuickConnect()
        if (cancelled) return
        setCode(request.Code)
        setSecret(request.Secret)
        setStatus("waiting")
      } catch (reason) {
        if (!cancelled) {
          setStatus("error")
          setError(reason instanceof Error ? reason.message : "Activation impossible.")
        }
      }
    }

    void start()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [retry])

  useEffect(() => {
    if (!secret || status !== "waiting") return
    let cancelled = false
    let timer: number | undefined
    const deadline = Date.now() + 5 * 60 * 1000

    const poll = async () => {
      try {
        const approved = await checkQuickConnect(secret)
        if (cancelled) return
        if (approved) {
          await loginWithQuickConnect(secret)
          if (!cancelled) router.replace("/")
          return
        }
        if (Date.now() >= deadline) {
          setStatus("error")
          setError("Le code a expiré. Créez un nouveau code et réessayez.")
          return
        }
        timer = window.setTimeout(() => void poll(), 2500)
      } catch (reason) {
        if (!cancelled) {
          setStatus("error")
          setError(reason instanceof Error ? reason.message : "Vérification du code impossible.")
        }
      }
    }

    timer = window.setTimeout(() => void poll(), 2000)
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [secret, status, loginWithQuickConnect, router])

  return <main className="grid min-h-dvh place-items-center bg-[#080808] px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-black/75 p-7 shadow-2xl sm:p-9"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e50914]"><Play className="size-5 fill-white" /></span><span className="text-xl font-black tracking-tight">JELLYFIN</span></div><div className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Monitor className="size-6" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[.25em] text-cyan-200">Activation mobile</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Connectez cet appareil</h1><p className="mt-3 text-sm leading-relaxed text-white/55">Veuillez vous rapprocher d’un ordinateur connecté à votre serveur Jellyfin et saisir le code affiché ci-dessous dans <strong className="text-white/80">Sécurité → Activer un appareil</strong>.</p>
    {status === "loading" ? <div className="mt-7 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4 text-sm text-white/65"><Loader2 className="size-5 animate-spin text-cyan-200" />Préparation de l’activation sécurisée…</div> : null}
    {status === "waiting" ? <div className="mt-7 rounded-2xl border border-cyan-200/20 bg-cyan-200/[.06] p-5 text-center"><div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-100/75"><KeyRound className="size-4" />Code temporaire</div><p aria-label={`Code d’activation ${code}`} className="mt-3 font-mono text-4xl font-bold tracking-[.22em] text-white">{code}</p><p className="mt-3 text-xs text-white/45">Ce code expire après cinq minutes. Gardez cet écran ouvert pendant l’activation.</p><p role="status" className="mt-4 flex items-center justify-center gap-2 text-xs text-cyan-100"><ShieldCheck className="size-4" />En attente de l’approbation sur l’ordinateur…</p></div> : null}
    {status === "disabled" ? <p role="alert" className="mt-6 rounded-xl border border-amber-200/20 bg-amber-200/[.06] p-4 text-sm text-amber-100">Quick Connect n’est pas activé sur ce serveur Jellyfin. Demandez à son administrateur de l’activer dans les paramètres du serveur.</p> : null}
    {status === "error" ? <div role="alert" className="mt-6 rounded-xl border border-rose-200/20 bg-rose-200/[.06] p-4 text-sm text-rose-100"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 inline-flex items-center gap-2 font-semibold text-white"><RefreshCw className="size-4" />Créer un nouveau code</button></div> : null}
    <p className="mt-7 text-center text-xs text-white/35">L’autorisation est vérifiée directement par le serveur Jellyfin. Votre mot de passe n’est jamais demandé sur cet écran.</p>
  </section></main>
}
