"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Activity, Check, Clock3, Loader2, RefreshCw, Server, ShieldCheck, Wifi, WifiOff, X } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { checkServerHealth } from "@/lib/jellyfin"

export function ServiceStatusView() {
  const { session } = useJellyfin()
  const [browserOnline, setBrowserOnline] = useState(true)
  const [offlineSupport, setOfflineSupport] = useState<"checking" | "ready" | "unavailable">("checking")
  const { data: server, error, isLoading, isValidating, mutate } = useSWR(
    session ? ["service-status", session.serverUrl] : null,
    () => checkServerHealth(session!.serverUrl),
    { refreshInterval: 30_000, revalidateOnFocus: true, dedupingInterval: 5_000 },
  )

  useEffect(() => {
    const updateConnection = () => setBrowserOnline(navigator.onLine)
    updateConnection()
    window.addEventListener("online", updateConnection)
    window.addEventListener("offline", updateConnection)

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistration("/").then(async (registration) => {
        if (!registration) {
          setOfflineSupport("unavailable")
          return
        }
        await navigator.serviceWorker.ready
        const cachedPage = await caches.match("/offline.html")
        setOfflineSupport(cachedPage ? "ready" : "unavailable")
      }).catch(() => setOfflineSupport("unavailable"))
    } else {
      setOfflineSupport("unavailable")
    }

    return () => {
      window.removeEventListener("online", updateConnection)
      window.removeEventListener("offline", updateConnection)
    }
  }, [])

  const serverOnline = Boolean(server?.online && !error)
  const checkedAt = server?.checkedAt ? new Date(server.checkedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null

  return (
    <main className="min-h-[calc(100dvh-68px)] bg-[#08090c] px-5 pb-28 pt-10 text-white sm:px-8 lg:px-12">
      <section className="mx-auto max-w-5xl">
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/[.08] bg-[#101116] p-6 sm:p-9">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_0%,rgba(0,164,220,.18),transparent_44%),radial-gradient(ellipse_at_5%_100%,rgba(229,9,20,.10),transparent_42%)]" />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#84d7f5]"><Activity className="size-4" /> Diagnostic JFLX</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">État des services</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">Vérifiez la connexion entre votre navigateur, JFLX et votre serveur Jellyfin.</p>
            </div>
            <button type="button" onClick={() => void mutate()} disabled={isValidating} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#84d7f5]">
              {isValidating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Actualiser
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatusCard
            icon={browserOnline ? Wifi : WifiOff}
            title="Connexion Internet"
            status={browserOnline ? "Disponible" : "Hors ligne"}
            description={browserOnline ? "Le navigateur détecte une connexion réseau." : "Vérifiez votre connexion réseau."}
            healthy={browserOnline}
          />
          <StatusCard
            icon={serverOnline ? Server : Server}
            title="Serveur Jellyfin"
            status={isLoading ? "Vérification…" : serverOnline ? "En ligne" : "Injoignable"}
            description={serverOnline && server ? `${server.hostname} · ${server.latencyMs ?? "—"} ms` : server?.error ?? "Impossible de joindre le serveur Jellyfin."}
            healthy={serverOnline}
            loading={isLoading}
          />
          <StatusCard
            icon={offlineSupport === "ready" ? ShieldCheck : offlineSupport === "checking" ? Clock3 : X}
            title="Page hors ligne"
            status={offlineSupport === "ready" ? "Prête" : offlineSupport === "checking" ? "Vérification…" : "Non disponible"}
            description={offlineSupport === "ready" ? "La page de secours est préparée par le Service Worker." : offlineSupport === "checking" ? "Vérification du mode hors ligne…" : "Le navigateur ne confirme pas la disponibilité du Service Worker."}
            healthy={offlineSupport === "ready"}
            loading={offlineSupport === "checking"}
          />
        </div>

        <section className="mt-6 rounded-2xl border border-white/[.08] bg-white/[.025] p-5 sm:p-6" aria-labelledby="diagnostics-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="diagnostics-title" className="text-lg font-semibold">Détails du diagnostic</h2>
              <p className="mt-1 text-sm text-white/45">Les contrôles sont actualisés automatiquement toutes les 30 secondes.</p>
            </div>
            {checkedAt ? <p className="text-xs text-white/45">Dernière vérification : {checkedAt}</p> : null}
          </div>
          <div className="mt-5 divide-y divide-white/[.07]">
            <DetailRow label="Adresse du serveur" value={server?.hostname ?? "En attente"} />
            <DetailRow label="Connexion sécurisée" value={server ? server.secure ? "HTTPS activé" : "HTTP non chiffré" : "En attente"} />
            <DetailRow label="Temps de réponse" value={server?.online && server.latencyMs != null ? `${server.latencyMs} ms` : "—"} />
            {error ? <DetailRow label="Diagnostic" value="Échec du contrôle. Réessayez dans quelques instants." /> : null}
          </div>
        </section>
      </section>
    </main>
  )
}

function StatusCard({ icon: Icon, title, status, description, healthy, loading = false }: { icon: typeof Wifi; title: string; status: string; description: string; healthy: boolean; loading?: boolean }) {
  return (
    <article className="rounded-2xl border border-white/[.08] bg-[#101116] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/[.16] motion-reduce:transform-none">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-white/75"><Icon className="size-5" aria-hidden="true" /></span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${healthy ? "bg-emerald-400/10 text-emerald-300" : loading ? "bg-sky-400/10 text-sky-200" : "bg-rose-400/10 text-rose-300"}`}>
          {loading ? <Loader2 className="size-3 animate-spin" /> : healthy ? <Check className="size-3" /> : <X className="size-3" />}{status}
        </span>
      </div>
      <h2 className="mt-5 text-base font-semibold">{title}</h2>
      <p className="mt-1 min-h-10 break-words text-sm leading-5 text-white/50">{description}</p>
    </article>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-5"><dt className="text-white/45">{label}</dt><dd className="break-all font-medium text-white/80">{value}</dd></div>
}
