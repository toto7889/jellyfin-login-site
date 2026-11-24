"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AudioLines, Loader2 } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, ready } = useJellyfin()
  const router = useRouter()

  useEffect(() => {
    if (ready && !session) router.replace("/login")
  }, [ready, session, router])

  if (!ready || !session) {
    return (
      <main role="status" aria-label="Préparation de votre espace Jellyfin" className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#08090d] px-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,164,220,.15),transparent_55%)]" />
        <div className="relative flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/[.035] px-8 py-10 text-center shadow-2xl backdrop-blur-xl">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-[#e50914] shadow-[0_0_38px_rgba(229,9,20,.3)]"><AudioLines className="size-8" /></span>
          <div><p className="text-2xl font-black tracking-[-.06em]">JFLX</p><p className="mt-2 text-sm text-white/55">Préparation de votre espace cinéma</p></div>
          <div className="h-1 w-44 overflow-hidden rounded-full bg-white/10"><span className="login-progress-bar block h-full w-2/5 rounded-full bg-[#e50914]" /></div>
          <Loader2 className="sr-only size-5 animate-spin" />
        </div>
      </main>
    )
  }

  return <>{children}</>
}
