import type { Metadata } from "next"
import { AppHeader } from "@/components/app-header"
import { AuthGuard } from "@/components/auth-guard"
import { CollectionsView } from "@/components/collections-view"

export const metadata: Metadata = {
  title: "Collections — JFLX",
  description: "Explorez les collections et sagas de votre bibliothèque Jellyfin.",
}

export default function CollectionsPage() {
  return <AuthGuard><AppHeader /><CollectionsView /></AuthGuard>
}
