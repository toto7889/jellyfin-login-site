import type { Metadata } from "next"
import { AppHeader } from "@/components/app-header"
import { AuthGuard } from "@/components/auth-guard"
import { ServiceStatusView } from "@/components/service-status-view"

export const metadata: Metadata = {
  title: "État des services — JFLX",
  description: "Consultez l’état de connexion de JFLX, de votre réseau et de votre serveur Jellyfin.",
}

export default function ServiceStatusPage() {
  return <AuthGuard><AppHeader /><ServiceStatusView /></AuthGuard>
}
