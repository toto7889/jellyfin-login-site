import type { Metadata } from "next"
import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { MusicHubView } from "@/components/music-hub-view"

export const metadata: Metadata = {
  title: "Hub musique",
  description: "Écoutez et explorez votre bibliothèque musicale Jellyfin.",
}

export default function MusicPage() {
  return <AuthGuard><AppHeader /><MusicHubView /></AuthGuard>
}
