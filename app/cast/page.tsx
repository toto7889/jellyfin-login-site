import type { Metadata } from "next"
import { AppHeader } from "@/components/app-header"
import { AuthGuard } from "@/components/auth-guard"
import { CastDashboard } from "@/components/cast-dashboard"

export const metadata: Metadata = {
  title: "Caster sur Jellyfin — Télécommande",
  description: "Choisissez un lecteur Jellyfin, lancez un film et pilotez la lecture sur grand écran.",
}

export default function CastPage() {
  return <AuthGuard><AppHeader /><CastDashboard /></AuthGuard>
}
