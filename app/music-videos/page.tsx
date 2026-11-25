import type { Metadata } from "next"
import { AppHeader } from "@/components/app-header"
import { AuthGuard } from "@/components/auth-guard"
import { MusicVideoHubView } from "@/components/music-video-hub-view"

export const metadata: Metadata = {
  title: "Clips musicaux — JFLX",
  description: "Parcourez et regardez les clips musicaux de votre bibliothèque Jellyfin.",
}

export default function MusicVideosPage() {
  return <AuthGuard><AppHeader /><MusicVideoHubView /></AuthGuard>
}
