"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function OfflineSupport() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  if (!offline) return null

  return <div role="alert" className="fixed inset-x-3 bottom-20 z-[100] mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-white/15 bg-[#10131b]/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:bottom-5"><WifiOff className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-semibold">Contenu indisponible hors ligne</p><p className="mt-1 text-sm text-white/65">La connexion à votre serveur Jellyfin est nécessaire pour charger les films et la TV. Rétablissez votre connexion puis réessayez.</p></div></div>
}
