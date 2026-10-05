"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronRight, CircleAlert, Loader2, ShieldCheck } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { useJellyfin } from "@/components/jellyfin-provider"

const CHECKS = ["Connexion chiffrée", "Cookies du navigateur", "Intégrité de la session"]

export default function LoginPage() {
  const { session, ready } = useJellyfin()
  const router = useRouter()
  const [stage, setStage] = useState<"checking" | "passed">("checking")
  const [activeCheck, setActiveCheck] = useState(0)
  const [seconds, setSeconds] = useState(3)

  useEffect(() => {
    if (ready && session) {
      router.replace("/")
      return
    }
    if (!ready) return

    router.replace("/login?status=encours", { scroll: false })
    const interval = window.setInterval(() => {
      setActiveCheck((current) => Math.min(current + 1, CHECKS.length))
      setSeconds((current) => Math.max(current - 1, 0))
    }, 700)
    const done = window.setTimeout(() => {
      setStage("passed")
      router.replace("/login?status=verifie", { scroll: false })
    }, 2550)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(done)
    }
  }, [ready, session, router])

  if (stage === "passed") return <LoginForm />

  return (
    <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-[#f5f7fa] px-5 py-10 text-[#1d2733]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,.12),transparent_34%),radial-gradient(circle_at_90%_90%,rgba(14,165,233,.1),transparent_34%)]" />
      <section className="relative w-full max-w-[520px] rounded-2xl border border-white/80 bg-white/75 p-7 shadow-[0_24px_70px_rgba(23,39,64,.14)] backdrop-blur-2xl sm:p-10" aria-live="polite">
        <div className="flex items-center gap-3 border-b border-[#dfe5ec] pb-6">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-lg shadow-blue-500/20"><ShieldCheck className="size-6" /></div>
          <div><p className="text-lg font-bold tracking-tight">Contrôle de sécurité</p><p className="text-xs text-[#667384]">Accès protégé à Jellyfin</p></div>
          <span className="ml-auto rounded-full bg-[#eaf7ee] px-2.5 py-1 text-[11px] font-semibold text-[#198754]">Sécurisé</span>
        </div>
        <div className="py-8 text-center">
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 text-[#2563eb]">
            {activeCheck >= CHECKS.length ? <Check className="size-9" /> : <Loader2 className="size-9 animate-spin" />}
          </div>
          <h1 className="text-2xl font-bold">Vérification en cours</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#667384]">Nous vérifions votre navigateur avant d&apos;afficher la page de connexion.</p>
        </div>
        <div className="flex flex-col gap-3">
          {CHECKS.map((label, index) => {
            const complete = index < activeCheck
            return <div key={label} className="flex items-center gap-3 rounded-xl border border-[#e6ebf1] bg-white/70 px-4 py-3 text-sm"><span className={`flex size-7 items-center justify-center rounded-full ${complete ? "bg-[#eaf7ee] text-[#198754]" : "bg-[#f0f3f7] text-[#8592a3]"}`}>{complete ? <Check className="size-4" /> : <span>{index + 1}</span>}</span><span className="flex-1">{label}</span>{complete ? <span className="text-xs font-medium text-[#198754]">Validé</span> : <Loader2 className="size-4 animate-spin text-[#9aa7b7]" />}</div>
          })}
        </div>
        <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#f2f6fc] p-3 text-xs leading-relaxed text-[#607086]"><CircleAlert className="mt-0.5 size-4 shrink-0 text-[#2563eb]" /><span>Cette vérification ne collecte pas d&apos;empreinte matérielle et ne remplace pas votre authentification Jellyfin.</span></div>
        <div className="mt-6 flex items-center justify-between text-xs text-[#8a96a5]"><span>Redirection vers /login</span><span className="flex items-center gap-1 font-semibold text-[#2563eb]">{seconds}s <ChevronRight className="size-3" /></span></div>
      </section>
    </main>
  )
}

