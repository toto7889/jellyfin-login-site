"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, CircleHelp, ShieldAlert } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"

export function UnauthorizedErrorView() {
  const { logout } = useJellyfin()
  const router = useRouter()

  function reconnect() {
    logout()
    router.replace("/login")
  }

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-5 pb-24 pt-12 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[42%] size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00a4dc]/[.07] blur-3xl" />
        <div className="absolute left-1/2 top-[42%] size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#55c8f1]/10 motion-safe:animate-pulse" />
        <div className="absolute left-1/2 top-[42%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#aa5cc3]/15" />
      </div>

      <section aria-labelledby="unauthorized-title" className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mx-auto flex size-16 items-center justify-center rounded-[1.35rem] border border-[#55c8f1]/20 bg-[#00a4dc]/10 text-[#8de0ff] shadow-[0_0_55px_rgba(0,164,220,.14)]">
          <ShieldAlert aria-hidden="true" className="size-8" />
        </div>
        <p className="mt-8 text-center font-mono text-[clamp(5rem,18vw,10rem)] font-black leading-none tracking-[-.1em] text-white/[.08]" aria-label="Erreur 401">401</p>

        <div className="relative -mt-5 rounded-[2rem] border border-white/10 bg-[#0b1018]/90 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-xl sm:-mt-8 sm:p-10">
          <p className="text-[10px] font-semibold uppercase tracking-[.28em] text-[#55c8f1]">JFLX <span className="mx-2 text-white/20">/</span> CONNEXION JELLYFIN</p>
          <h1 id="unauthorized-title" className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-4xl">Votre session a besoin d&apos;être renouvelée</h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-sm leading-7 text-white/60 sm:text-base">
            Jellyfin n&apos;a pas pu valider votre accès. Votre session a peut-être expiré ou vos droits ont changé. Reconnectez-vous pour retrouver vos films, séries et épisodes.
          </p>

          <div role="status" className="mx-auto mt-6 flex max-w-lg items-start gap-3 rounded-2xl border border-[#55c8f1]/15 bg-[#00a4dc]/[.06] p-4 text-left text-xs leading-6 text-white/60 sm:text-sm">
            <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#8de0ff]" />
            <span>Ce code signale un problème d&apos;authentification, pas une panne du serveur. Vos réglages de lecteur ne sont pas affectés.</span>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={reconnect} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#00a4dc] px-6 text-sm font-semibold text-[#061019] shadow-[0_10px_30px_rgba(0,164,220,.18)] transition hover:-translate-y-0.5 hover:bg-[#38bce8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8de0ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1018]">
              Se reconnecter <ArrowRight aria-hidden="true" className="size-4" />
            </button>
            <Link href="/help" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[.04] px-6 text-sm font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1018]">
              Ouvrir le centre d&apos;aide
            </Link>
          </div>
          <p className="mt-7 text-[10px] font-medium uppercase tracking-[.2em] text-white/25">Authentification sécurisée · Jellyfin</p>
        </div>
      </section>
    </main>
  )
}
