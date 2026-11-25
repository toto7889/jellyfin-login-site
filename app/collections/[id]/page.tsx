import type { Metadata } from "next"
import { AppHeader } from "@/components/app-header"
import { AuthGuard } from "@/components/auth-guard"
import { CollectionsView } from "@/components/collections-view"

export const metadata: Metadata = {
  title: "Collection — JFLX",
  description: "Découvrez les titres présents dans cette collection Jellyfin.",
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AuthGuard><AppHeader /><CollectionsView collectionId={id} /></AuthGuard>
}
