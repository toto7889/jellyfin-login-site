import type { Metadata } from "next"
import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { TvChannelDetailView } from "@/components/tv-channel-detail-view"

export const metadata: Metadata = {
  title: "Fiche de chaîne — JFLX",
  description: "Consultez le direct et le guide des programmes d’une chaîne TV Jellyfin.",
}

export default async function TvChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AuthGuard><AppHeader /><TvChannelDetailView channelId={id} /></AuthGuard>
}
