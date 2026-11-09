"use client"

import { useEffect, useState } from "react"
import { Play } from "lucide-react"

export function VisitSplash() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 1250)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null
  return (
    <div className="visit-splash" role="status" aria-label="Connexion directe au serveur Jellyfin">
      <div className="visit-splash__glow" />
      <div className="visit-splash__mark"><Play className="size-7 fill-current" /></div>
      <p className="visit-splash__brand">JFLX</p>
      <p className="visit-splash__message">Connexion directe depuis votre navigateur</p>
      <span className="visit-splash__loader" />
    </div>
  )
}
